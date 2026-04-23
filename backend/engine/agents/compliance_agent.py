"""
Compliance Workflow (Workflow 3) — Basket Evaluation
Evaluates an entire TravelSettlement receipts basket against a policy using
a ReAct-style LangGraph with two tools:
  - get_current_date   : returns today's date (for 90-day late-submission checks)
  - search_policy_rag  : keyword search over PolicySection rows
"""
import json
import logging
import re
from datetime import date
from typing import Annotated, Any, List, Optional
from uuid import UUID

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from sqlmodel import Session, select
from typing_extensions import TypedDict

from core.models import Reimbursement, SupportingDocument, TravelSettlement, User, Policy
from engine.llm import get_agent_llm
from engine.prompts.compliance_prompts import AGENT_EVALUATION_PROMPT
from engine.tools.rag_tool import search_policy_sections
from engine.tools.compliance_tools import get_current_date, make_search_policy_rag_tool

logger = logging.getLogger(__name__)


# ── Graph State ────────────────────────────────────────────────────────────────

class ComplianceWorkflowState(TypedDict):
    # Inputs
    settlement_id: str
    policy_id: str
    main_category: str
    user_id: str
    all_category: List[str]

    # Context loaded from DB
    user: Optional[Any]
    policy: Optional[Any]
    receipts: List[dict]           # Full basket from TravelSettlement.receipts
    combined_conditions: List[str]
    policy_sections_text: str
    currency: str

    # ReAct message thread (managed by add_messages reducer)
    messages: Annotated[list, add_messages]

    # Parsed LLM output
    line_items: List[dict]
    totals: dict
    judgment: str
    confidence: float
    summary: str

    # Saved record
    reimbursement_id: str


# ── Graph Nodes ────────────────────────────────────────────────────────────────

def load_context(state: ComplianceWorkflowState, session: Session) -> dict:
    """Load user, policy, and TravelSettlement basket from the database."""
    user = session.get(User, UUID(state["user_id"]))
    policy = session.get(Policy, UUID(state["policy_id"]))

    # Parse mandatory conditions dict
    try:
        conditions_dict = (
            json.loads(policy.mandatory_conditions)
            if policy and policy.mandatory_conditions
            else {}
        )
    except (json.JSONDecodeError, TypeError):
        conditions_dict = {}

    # Resolve all_category from settlement if not already set
    all_category = state.get("all_category") or []
    receipts: List[dict] = []
    currency = ""

    if state.get("settlement_id"):
        try:
            settlement = session.get(TravelSettlement, UUID(state["settlement_id"]))
            if settlement:
                if not all_category:
                    all_category = settlement.all_category or []
                receipts = settlement.receipts or []
                currency = settlement.currency or ""
        except Exception:
            pass

    # Enrich receipts with human edit context if any documents were edited
    if receipts and state.get("settlement_id"):
        docs = session.exec(
            select(SupportingDocument).where(
                SupportingDocument.settlement_id == UUID(state["settlement_id"])
            )
        ).all()
        doc_map = {str(d.document_id): d for d in docs}
        for receipt in receipts:
            doc_id = receipt.get("document_id")
            if doc_id and doc_id in doc_map:
                doc = doc_map[doc_id]
                if doc.human_edited:
                    receipt["human_edits"] = {
                        "editable_fields": doc.editable_fields,
                        "change_summary": doc.change_summary,
                    }

    # Fallback: derive currency from first receipt's extracted_data if missing
    if not currency and receipts:
        currency = receipts[0].get("currency", "") or ""
    if currency == "Not found in Receipt":
        currency = ""

    # Build combined conditions (deduped, across all relevant categories)
    combined_conditions: List[str] = []
    seen: set = set()
    for cat in all_category:
        cat_data = conditions_dict.get(cat) or {}
        if not cat_data:
            matched_key = next(
                (k for k in conditions_dict if k.lower() == cat.lower()), None
            )
            cat_data = conditions_dict[matched_key] if matched_key else {}
        for cond in cat_data.get("condition", []):
            if cond not in seen:
                seen.add(cond)
                combined_conditions.append(cond)

    # Keyword search for relevant policy sections
    policy_sections_text = search_policy_sections(
        policy_id=state["policy_id"],
        session=session,
        keywords=all_category + [state.get("main_category", ""), "amount", "limit", "rate", "maximum", "cap"],
    )

    return {
        "user": user,
        "policy": policy,
        "receipts": receipts,
        "all_category": all_category,
        "combined_conditions": combined_conditions,
        "policy_sections_text": policy_sections_text,
        "currency": currency,
        "messages": [],
        "line_items": [],
        "totals": {},
        "judgment": "",
        "confidence": 0.0,
        "summary": "",
    }


def call_agent(state: ComplianceWorkflowState, llm_with_tools) -> dict:
    """Send the current messages to the LLM (with tools bound). Append the response."""
    if not state["messages"]:
        # First call — build the human prompt from context
        user = state["user"]
        policy = state["policy"]
        receipts = state["receipts"]

        prompt_text = AGENT_EVALUATION_PROMPT.format(
            employee_name=user.name if user else "Unknown",
            department=user.department if user else "Unknown",
            rank=str(user.rank) if user else "1",
            currency=state.get("currency", "MYR"),
            all_category=json.dumps(state.get("all_category", [])),
            main_category=state.get("main_category", ""),
            policy_overview=policy.overview_summary if policy else "",
            effective_date=(
                policy.effective_date.strftime("%Y-%m-%d")
                if policy and policy.effective_date
                else "Unknown"
            ),
            conditions=json.dumps(state.get("combined_conditions", []), indent=2),
            policy_sections=state.get("policy_sections_text") or "(no policy sections available)",
            receipts_json=json.dumps(receipts, indent=2, default=str),
        ).replace("{today}", date.today().isoformat())

        messages = [HumanMessage(content=prompt_text)]
    else:
        messages = state["messages"]

    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}


def should_continue(state: ComplianceWorkflowState) -> str:
    """Route: if the last message has tool calls, go to tools; otherwise end."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "parse_output"


def parse_output(state: ComplianceWorkflowState) -> dict:
    """Extract structured JSON from the final LLM message."""
    last_message = state["messages"][-1]
    final_content = (
        last_message.content
        if isinstance(last_message.content, str)
        else ""
    )

    parsed: dict = {}
    parse_error = None
    
    try:
        # Try direct JSON parse
        parsed = json.loads(final_content)
    except Exception as e:
        parse_error = str(e)
        try:
            # Try extracting JSON block from markdown or mixed content
            match = re.search(r"\{.*\}", final_content, re.DOTALL)
            if match:
                parsed = json.loads(match.group())
                parse_error = None
        except Exception as extract_error:
            parse_error = f"JSON extraction failed: {str(extract_error)}"

    if not parsed:
        # Fallback: mark everything as requiring manual review
        logger.warning(
            f"parse_output: Could not parse LLM response. "
            f"Error: {parse_error}. Content preview: {final_content[:200]}"
        )
        receipts = state.get("receipts", [])
        line_items = [
            {
                "document_id": r.get("document_id", "unknown"),
                "date": r.get("date", ""),
                "category": r.get("category", ""),
                "description": r.get("description", ""),
                "status": "REJECTED",
                "requested_amount": float(r.get("amount", 0)),
                "approved_amount": 0.0,
                "deduction_amount": float(r.get("amount", 0)),
                "audit_notes": [
                    {
                        "tag": "[PARSE_ERROR]",
                        "message": f"Could not parse LLM response: {parse_error}",
                    }
                ],
            }
            for r in receipts
        ]
        total_requested = sum(li["requested_amount"] for li in line_items)
        return {
            "line_items": line_items,
            "totals": {
                "total_requested": total_requested,
                "total_deduction": total_requested,
                "net_approved": 0.0,
            },
            "judgment": "MANUAL REVIEW",
            "confidence": 0.0,
            "summary": "Evaluation parsing failed; manual review required.",
        }

    return {
        "line_items": parsed.get("line_items", []),
        "totals": parsed.get("totals", {}),
        "judgment": parsed.get("overall_judgment", "MANUAL REVIEW"),
        "confidence": float(parsed.get("confidence", 0.0)),
        "summary": parsed.get("summary", ""),
    }


def save_reimbursement(state: ComplianceWorkflowState, session: Session) -> dict:
    """Persist the evaluated basket as a Reimbursement record."""
    user = state["user"]
    settlement_uuid = UUID(state["settlement_id"]) if state.get("settlement_id") else None

    reimbursement = Reimbursement(
        user_id=UUID(state["user_id"]),
        policy_id=UUID(state["policy_id"]),
        settlement_id=settlement_uuid,
        main_category=state["main_category"],
        sub_category=state["all_category"],
        employee_department=user.department if user else None,
        employee_rank=user.rank if user else 1,
        currency=state.get("currency", ""),
        totals=state.get("totals", {}),
        line_items=state.get("line_items", []),
        confidence=state.get("confidence"),
        judgment=state.get("judgment", "MANUAL REVIEW"),
        status="REVIEW",
        summary=state.get("summary", ""),
    )

    try:
        session.add(reimbursement)
        session.flush()

        # Back-link the settlement to this reimbursement
        if settlement_uuid:
            settlement = session.get(TravelSettlement, settlement_uuid)
            if settlement:
                settlement.reimbursement_id = reimbursement.reim_id
                session.add(settlement)

        session.commit()
        session.refresh(reimbursement)
    except Exception:
        session.rollback()
        raise

    return {"reimbursement_id": str(reimbursement.reim_id)}


# ── Graph Assembly ─────────────────────────────────────────────────────────────

def run_compliance_workflow(
    settlement_id: str,
    policy_id: str,
    main_category: str,
    user_id: str,
    all_category: Optional[List[str]],
    session: Session,
    # document_ids kept for API compatibility but no longer primary data source
    document_ids: Optional[List[str]] = None,
) -> dict:
    """
    Compile and run the ReAct compliance graph.
    Returns a dict with reimbursement_id, judgment, totals, line_items,
    confidence, and summary.
    """
    tools = [get_current_date, make_search_policy_rag_tool(policy_id, session)]
    llm_with_tools = get_agent_llm().bind_tools(tools)
    tool_node = ToolNode(tools)

    # Partial-bind the session into stateful nodes
    def _load_context(state):
        return load_context(state, session)

    def _call_agent(state):
        return call_agent(state, llm_with_tools)

    def _save_reimbursement(state):
        return save_reimbursement(state, session)

    # Build graph
    graph = StateGraph(ComplianceWorkflowState)

    graph.add_node("load_context", _load_context)
    graph.add_node("agent", _call_agent)
    graph.add_node("tools", tool_node)
    graph.add_node("parse_output", parse_output)
    graph.add_node("save_reimbursement", _save_reimbursement)

    graph.add_edge(START, "load_context")
    graph.add_edge("load_context", "agent")
    graph.add_conditional_edges("agent", should_continue, {"tools": "tools", "parse_output": "parse_output"})
    graph.add_edge("tools", "agent")   # loop back after tool execution
    graph.add_edge("parse_output", "save_reimbursement")
    graph.add_edge("save_reimbursement", END)

    app = graph.compile()

    result = app.invoke({
        "settlement_id": settlement_id,
        "policy_id": policy_id,
        "main_category": main_category,
        "user_id": user_id,
        "all_category": all_category or [],
        # context fields (populated by load_context)
        "user": None,
        "policy": None,
        "receipts": [],
        "combined_conditions": [],
        "policy_sections_text": "",
        "currency": "",
        "messages": [],
        # output fields
        "line_items": [],
        "totals": {},
        "judgment": "",
        "confidence": 0.0,
        "summary": "",
        "reimbursement_id": "",
    })

    return {
        "reimbursement_id": result.get("reimbursement_id", ""),
        "judgment": result.get("judgment", ""),
        "summary": result.get("summary", ""),
        "line_items": result.get("line_items", []),
        "totals": result.get("totals", {}),
        "confidence": result.get("confidence", 0.0),
    }
