import json
from decimal import Decimal
from datetime import datetime, timezone
from typing import TypedDict, List, Dict, Any, Optional
from uuid import UUID

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langgraph.graph import StateGraph, START, END
from sqlmodel import Session, select

from core.models import User, Policy, Reimbursement, SupportingDocument
from engine.llm import get_chat_llm, get_embeddings
from engine.tools.rag_tool import policy_rag_search, document_rag_search
from engine.prompts.compliance_prompts import CONDITION_CHECK_PROMPT, JUDGMENT_SYNTHESIS_PROMPT


class ComplianceWorkflowState(TypedDict):
    document_ids: List[str]
    policy_id: str
    main_category: str
    sub_category: str
    currency: str
    amount: float
    user_id: str
    db_session: Any
    # Populated during execution:
    user: Optional[Any]
    receipt_extracted_data: dict
    policy: Optional[Any]
    mandatory_conditions: dict
    chain_of_thought: dict
    judgment: str
    summary: str
    reimbursement_id: str


def load_context(state: ComplianceWorkflowState) -> dict:
    session: Session = state["db_session"]

    # Fetch user
    user = session.get(User, UUID(state["user_id"]))

    # Fetch policy
    policy = session.get(Policy, UUID(state["policy_id"]))

    # Parse mandatory conditions from JSON string
    try:
        conditions_dict = json.loads(policy.mandatory_conditions) if policy and policy.mandatory_conditions else {}
    except (json.JSONDecodeError, TypeError):
        conditions_dict = {}

    # Filter to sub_category if it exists as a key
    sub_category = state.get("sub_category", "")
    if sub_category and sub_category in conditions_dict:
        relevant_conditions = {sub_category: conditions_dict[sub_category]}
    else:
        relevant_conditions = conditions_dict

    # Find main receipt (is_main=True) among document_ids
    receipt_extracted_data = {}
    doc_uuids = [UUID(d) for d in state["document_ids"]]
    stmt = select(SupportingDocument).where(
        SupportingDocument.document_id.in_(doc_uuids),
        SupportingDocument.is_main == True,
    )
    main_doc = session.exec(stmt).first()
    if main_doc:
        receipt_extracted_data = main_doc.extracted_data or {}

    return {
        "user": user,
        "policy": policy,
        "mandatory_conditions": relevant_conditions,
        "receipt_extracted_data": receipt_extracted_data,
        "chain_of_thought": {},
    }


def check_conditions(state: ComplianceWorkflowState) -> dict:
    session: Session = state["db_session"]
    user = state["user"]
    policy = state["policy"]
    mandatory_conditions = state.get("mandatory_conditions", {})
    doc_uuids = [UUID(d) for d in state["document_ids"]]
    policy_uuid = UUID(state["policy_id"])

    chain_of_thought = {}

    # Handle case where mandatory_conditions has nested "procedures" key
    if "procedures" in mandatory_conditions:
        conditions_to_check = mandatory_conditions["procedures"]
    else:
        conditions_to_check = mandatory_conditions

    for condition_key, condition_data in conditions_to_check.items():
        if isinstance(condition_data, dict):
            condition_text = json.dumps(condition_data)
        else:
            condition_text = str(condition_data)

        # Build RAG query
        rag_query = f"{condition_key}: {condition_text}"

        try:
            query_embedding = get_embeddings().embed_query(rag_query)
        except Exception as e:
            print(f"Failed to embed condition query: {e}")
            query_embedding = []

        # RAG search
        policy_chunks = []
        doc_chunks = []
        if query_embedding:
            policy_chunks = policy_rag_search(query_embedding, policy_uuid, session, k=3)
            doc_chunks = document_rag_search(query_embedding, doc_uuids, session, k=3)

        # Format RAG context
        rag_parts = []
        for chunk in policy_chunks:
            rag_parts.append(f"[POLICY] {chunk.get('content', '')}")
        for chunk in doc_chunks:
            rag_parts.append(f"[DOCUMENT] {chunk.get('content', '')}")
        rag_context = "\n\n".join(rag_parts) if rag_parts else "No relevant context found."

        # Build prompt and invoke LLM
        prompt = PromptTemplate.from_template(CONDITION_CHECK_PROMPT)
        chain = prompt | get_chat_llm() | JsonOutputParser()

        try:
            result = chain.invoke({
                "employee_name": user.name if user else "Unknown",
                "department": user.department if user else "Unknown",
                "rank": str(user.rank) if user else "Unknown",
                "overview_summary": policy.overview_summary if policy else "",
                "extracted_data": json.dumps(state.get("receipt_extracted_data", {})),
                "condition_key": condition_key,
                "condition_text": condition_text,
                "rag_context": rag_context,
            })
            chain_of_thought[condition_key] = result
        except Exception as e:
            print(f"Error checking condition '{condition_key}': {e}")
            chain_of_thought[condition_key] = {
                "flag": "MANUAL REVIEW",
                "condition": condition_key,
                "reason": f"Error during evaluation: {e}",
                "note": "Requires manual review due to evaluation error",
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
        return {"judgment": "MANUAL REVIEW", "summary": f"Judgment failed due to error: {e}"}


def save_reimbursement(state: ComplianceWorkflowState) -> dict:
    session: Session = state["db_session"]
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
    session.add(reimbursement)
    session.flush()  # Get reimbursement.reim_id

    # Update reim_id on all supporting documents
    doc_uuids = [UUID(d) for d in state["document_ids"]]
    stmt = select(SupportingDocument).where(
        SupportingDocument.document_id.in_(doc_uuids)
    )
    docs = session.exec(stmt).all()
    for doc in docs:
        doc.reim_id = reimbursement.reim_id
        session.add(doc)

    session.commit()

    return {"reimbursement_id": str(reimbursement.reim_id)}


def run_compliance_workflow(
    document_ids: List[str],
    policy_id: str,
    main_category: str,
    sub_category: str,
    currency: str,
    amount: float,
    user_id: str,
    session: Session,
) -> dict:
    """
    Run the compliance analysis pipeline.
    Returns the full reimbursement record as a dict.
    """
    graph = StateGraph(ComplianceWorkflowState)

    graph.add_node("load_context", load_context)
    graph.add_node("check_conditions", check_conditions)
    graph.add_node("build_judgment", build_judgment)
    graph.add_node("save_reimbursement", save_reimbursement)

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
        "currency": currency,
        "amount": amount,
        "user_id": user_id,
        "db_session": session,
        "user": None,
        "receipt_extracted_data": {},
        "policy": None,
        "mandatory_conditions": {},
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
