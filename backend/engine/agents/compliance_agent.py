import re
import json
import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import TypedDict, List, Dict, Any, Optional
from uuid import UUID

from langchain_core.messages import HumanMessage, ToolMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from sqlmodel import Session, select

from core.models import User, Policy, Reimbursement, SupportingDocument
from engine.llm import get_chat_llm, get_embeddings, get_agent_llm
from engine.tools.rag_tool import policy_rag_search, document_rag_search
from engine.prompts.compliance_prompts import AGENT_EVALUATION_PROMPT, JUDGMENT_SYNTHESIS_PROMPT

logger = logging.getLogger(__name__)


class ComplianceWorkflowState(TypedDict):
    document_ids: List[str]
    policy_id: str
    main_category: str
    sub_category: str
    user_id: str
    # Populated from receipt OCR in load_context:
    currency: str
    amount: float
    # Populated during execution:
    user: Optional[Any]
    receipt_extracted_data: dict
    policy: Optional[Any]
    mandatory_conditions: dict       # full conditions dict from policy
    category_data: dict              # only the sub_category entry {required_documents, condition}
    supporting_doc_ids: List[str]    # document_ids where is_main=False (for RAG only)
    chain_of_thought: dict
    judgment: str
    summary: str
    reimbursement_id: str


def load_context(state: ComplianceWorkflowState, session: Session) -> dict:
    user = session.get(User, UUID(state["user_id"]))
    policy = session.get(Policy, UUID(state["policy_id"]))

    try:
        conditions_dict = json.loads(policy.mandatory_conditions) if policy and policy.mandatory_conditions else {}
    except (json.JSONDecodeError, TypeError):
        conditions_dict = {}

    # Extract the single sub_category entry (exact match, then case-insensitive fallback)
    sub_category = state.get("sub_category", "")
    if sub_category in conditions_dict:
        category_data = conditions_dict[sub_category]
    else:
        matched = next((k for k in conditions_dict if k.lower() == sub_category.lower()), None)
        category_data = conditions_dict[matched] if matched else {}

    # Find main receipt OCR data
    doc_uuids = [UUID(d) for d in state["document_ids"]]
    main_doc = session.exec(
        select(SupportingDocument).where(
            SupportingDocument.document_id.in_(doc_uuids),
            SupportingDocument.is_main == True,
        )
    ).first()
    receipt_extracted_data = (main_doc.extracted_data or {}) if main_doc else {}
    currency = receipt_extracted_data.get("currency") or ""
    amount = float(receipt_extracted_data.get("total_amount") or 0)

    # Collect supporting document IDs (is_main=False) — only these have embeddings for RAG
    supporting_docs = session.exec(
        select(SupportingDocument).where(
            SupportingDocument.document_id.in_(doc_uuids),
            SupportingDocument.is_main == False,
        )
    ).all()
    supporting_doc_ids = [str(d.document_id) for d in supporting_docs]

    return {
        "user": user,
        "policy": policy,
        "mandatory_conditions": conditions_dict,
        "category_data": category_data,
        "receipt_extracted_data": receipt_extracted_data,
        "currency": currency,
        "amount": amount,
        "supporting_doc_ids": supporting_doc_ids,
        "chain_of_thought": {},
    }


def check_conditions(state: ComplianceWorkflowState, session: Session) -> dict:
    user = state["user"]
    policy = state["policy"]
    sub_category = state.get("sub_category", "")
    category_data = state.get("category_data", {})
    policy_uuid = UUID(state["policy_id"])
    supporting_doc_uuids = [UUID(d) for d in state.get("supporting_doc_ids", [])]

    required_docs = category_data.get("required_documents", [])
    conditions_list = category_data.get("condition", [])

    # ── RAG Tools (closures over session/IDs) ──────────────────────
    @tool
    def search_policy_sections(query: str) -> str:
        """Search the company HR policy document for specific rules, limits, or procedures. Use only when you need exact policy wording not covered in the overview."""
        try:
            embedding = get_embeddings().embed_query(query)
            chunks = policy_rag_search(embedding, policy_uuid, session, k=3)
            result = "\n---\n".join(c.get("content", "") for c in chunks)
            return result or "No relevant policy sections found."
        except Exception as e:
            return f"Policy search error: {e}"

    @tool
    def search_supporting_documents(query: str) -> str:
        """Search the employee's submitted supporting PDF documents for specific evidence. Use only when you need to verify content from supporting docs beyond the main receipt."""
        if not supporting_doc_uuids:
            return "No supporting documents were submitted for this claim."
        try:
            embedding = get_embeddings().embed_query(query)
            chunks = document_rag_search(embedding, supporting_doc_uuids, session, k=3)
            result = "\n---\n".join(c.get("content", "") for c in chunks)
            return result or "No relevant content found in supporting documents."
        except Exception as e:
            return f"Document search error: {e}"

    tools = [search_policy_sections, search_supporting_documents]
    tools_map = {t.name: t for t in tools}

    # ── Build agent prompt ─────────────────────────────────────────
    eval_prompt = AGENT_EVALUATION_PROMPT.format(
        sub_category=sub_category,
        employee_name=user.name if user else "Unknown",
        department=user.department if user else "Unknown",
        rank=str(user.rank) if user else "1",
        currency=state.get("currency", ""),
        amount=str(state.get("amount", 0)),
        required_documents=json.dumps(required_docs, indent=2),
        conditions=json.dumps(conditions_list, indent=2),
        receipt_data=json.dumps(state.get("receipt_extracted_data", {}), indent=2),
        policy_overview=policy.overview_summary if policy else "",
    )

    # ── Manual tool-calling loop ───────────────────────────────────
    llm_with_tools = get_agent_llm().bind_tools(tools)
    messages = [HumanMessage(content=eval_prompt)]
    response = None
    hit_iteration_limit = True

    for _ in range(6):
        response = llm_with_tools.invoke(messages)
        messages.append(response)

        tool_calls = getattr(response, "tool_calls", None)
        if not tool_calls:
            hit_iteration_limit = False
            break

        for tc in tool_calls:
            tool_fn = tools_map.get(tc["name"])
            if tool_fn:
                try:
                    result = tool_fn.invoke(tc["args"])
                except Exception as e:
                    result = f"Tool error: {e}"
                messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))

    if hit_iteration_limit:
        logger.warning(
            "Compliance agent hit max iteration limit for sub_category=%s; "
            "proceeding to parse with potentially incomplete reasoning.",
            sub_category,
        )

    # ── Parse JSON from final response ────────────────────────────
    final_content = (response.content if response and isinstance(response.content, str) else "") if response else ""
    chain_of_thought = {}

    try:
        parser = JsonOutputParser()
        chain_of_thought = parser.parse(final_content)
    except Exception:
        try:
            match = re.search(r'\{.*\}', final_content, re.DOTALL)
            if match:
                chain_of_thought = json.loads(match.group())
        except Exception:
            chain_of_thought = {
                sub_category: {
                    "flag": "MANUAL_REVIEW",
                    "reason": "Could not parse agent evaluation response.",
                    "note": final_content[:500] if final_content else "No response from agent.",
                }
            }

    return {"chain_of_thought": chain_of_thought}


def build_judgment(state: ComplianceWorkflowState) -> dict:
    user = state["user"]
    chain_of_thought = state.get("chain_of_thought", {})

    prompt = PromptTemplate.from_template(JUDGMENT_SYNTHESIS_PROMPT)
    chain = prompt | get_chat_llm() | JsonOutputParser()

    try:
        result = chain.invoke({
            "employee_name": user.name if user else "Unknown",
            "currency": state.get("currency", ""),
            "amount": str(state.get("amount", 0)),
            "main_category": state.get("main_category", ""),
            "sub_category": state.get("sub_category", ""),
            "chain_of_thought": json.dumps(chain_of_thought, indent=2),
        })
        return {
            "judgment": result.get("judgment", "MANUAL REVIEW"),
            "summary": result.get("summary", ""),
        }
    except Exception as e:
        print(f"Error in build_judgment: {e}")
        return {"judgment": "MANUAL REVIEW", "summary": f"Judgment failed: {e}"}


def save_reimbursement(state: ComplianceWorkflowState, session: Session) -> dict:
    user = state["user"]

    reimbursement = Reimbursement(
        user_id=UUID(state["user_id"]),
        policy_id=UUID(state["policy_id"]),
        main_category=state["main_category"],
        sub_category=state["sub_category"],
        employee_department=user.department if user else None,
        employee_rank=user.rank if user else 1,
        currency=state["currency"],
        amount=Decimal(str(state["amount"])),
        judgment=state.get("judgment", "MANUAL REVIEW"),
        status="REVIEW",
        chain_of_thought=state.get("chain_of_thought", {}),
        summary=state.get("summary", ""),
    )

    try:
        session.add(reimbursement)
        session.flush()

        doc_uuids = [UUID(d) for d in state["document_ids"]]
        docs = session.exec(
            select(SupportingDocument).where(SupportingDocument.document_id.in_(doc_uuids))
        ).all()
        for doc in docs:
            doc.reim_id = reimbursement.reim_id
            session.add(doc)

        session.commit()
        session.refresh(reimbursement)
    except Exception:
        session.rollback()
        raise

    return {"reimbursement_id": str(reimbursement.reim_id)}


def run_compliance_workflow(
    document_ids: List[str],
    policy_id: str,
    main_category: str,
    sub_category: str,
    user_id: str,
    session: Session,
) -> dict:
    # Wrap session-dependent nodes in closures to keep Session out of LangGraph state
    def _load_context(state): return load_context(state, session)
    def _check_conditions(state): return check_conditions(state, session)
    def _save_reimbursement(state): return save_reimbursement(state, session)

    graph = StateGraph(ComplianceWorkflowState)

    graph.add_node("load_context", _load_context)
    graph.add_node("check_conditions", _check_conditions)
    graph.add_node("build_judgment", build_judgment)
    graph.add_node("save_reimbursement", _save_reimbursement)

    graph.add_edge(START, "load_context")
    graph.add_edge("load_context", "check_conditions")
    graph.add_edge("check_conditions", "build_judgment")
    graph.add_edge("build_judgment", "save_reimbursement")
    graph.add_edge("save_reimbursement", END)

    app = graph.compile()
    result = app.invoke({
        "document_ids": document_ids,
        "policy_id": policy_id,
        "main_category": main_category,
        "sub_category": sub_category,
        "user_id": user_id,
        "currency": "",
        "amount": 0.0,
        "user": None,
        "receipt_extracted_data": {},
        "policy": None,
        "mandatory_conditions": {},
        "category_data": {},
        "supporting_doc_ids": [],
        "chain_of_thought": {},
        "judgment": "",
        "summary": "",
        "reimbursement_id": "",
    })

    return {
        "reimbursement_id": result.get("reimbursement_id", ""),
        "judgment": result.get("judgment", ""),
        "summary": result.get("summary", ""),
        "chain_of_thought": result.get("chain_of_thought", {}),
    }
