"""
Compliance Workflow (Workflow 3) — Basket Evaluation
5-node LangGraph pipeline:
  load_context → analyze_receipts → aggregate_totals → final_judgment → save_reimbursement

Per-receipt ReAct agents run in parallel; final_judgment agent produces the overall verdict.
"""
import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, List, Optional
from uuid import UUID

from langchain_core.messages import HumanMessage
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import create_react_agent
from sqlmodel import Session, select
from typing_extensions import TypedDict

from core.models import Reimbursement, SupportingDocument, TravelSettlement, User, Policy
from engine.llm import get_agent_llm
from engine.prompts.compliance_prompts import RECEIPT_ANALYSIS_PROMPT, FINAL_JUDGMENT_PROMPT
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
    receipts: List[dict]
    combined_conditions: List[str]
    currency: str

    # Results
    line_items: List[dict]
    totals: dict
    judgment: str
    confidence: float
    summary: str
    reimbursement_id: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _format_human_edit_block(human_edit: dict) -> str:
    """Format _human_edit dict into a readable prompt block. Returns empty string if no changes."""
    if not human_edit or not human_edit.get("has_changes"):
        return ""

    lines = [
        "--- Human Edit Information ---",
        f"Overall Risk: {human_edit.get('overall_risk', 'NONE')}",
        "Changed Fields:",
    ]
    for field, info in (human_edit.get("changes_by_field") or {}).items():
        orig = info.get("original", "N/A")
        edited = info.get("edited", "N/A")
        severity = info.get("severity", "UNKNOWN")
        lines.append(f"  - {field}: {orig!r} → {edited!r}  [Severity: {severity}]")
    return "\n".join(lines)


def _parse_line_item(content: str, receipt: dict) -> dict:
    """Parse JSON from LLM response for a single receipt. Returns a fallback dict on failure."""
    parsed = None
    try:
        parsed = json.loads(content)
    except Exception:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group())
            except Exception:
                pass

    if parsed:
        return parsed

    # Fallback
    return {
        "document_id": receipt.get("document_id", "unknown"),
        "date": receipt.get("date", ""),
        "category": receipt.get("category", ""),
        "description": receipt.get("merchant_name", ""),
        "status": "REJECTED",
        "requested_amount": float(receipt.get("total_amount", 0) or 0),
        "approved_amount": 0.0,
        "deduction_amount": float(receipt.get("total_amount", 0) or 0),
        "audit_notes": [{"tag": "[PARSE_ERROR]", "message": "Could not parse compliance analysis."}],
        "human_edit_risk": "NONE",
    }


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
                receipts = [dict(r) for r in (settlement.receipts or [])]
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
                    # Apply editable_fields on top of receipt dict
                    if doc.editable_fields:
                        receipt.update(doc.editable_fields)
                    receipt["_human_edit"] = {
                        "has_changes": True,
                        "overall_risk": (doc.change_summary or {}).get("overall_risk", "NONE"),
                        "changes_by_field": (doc.change_summary or {}).get("changes_by_field", {}),
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

    return {
        "user": user,
        "policy": policy,
        "receipts": receipts,
        "all_category": all_category,
        "combined_conditions": combined_conditions,
        "currency": currency,
        "line_items": [],
        "totals": {},
        "judgment": "",
        "confidence": 0.0,
        "summary": "",
    }


def analyze_receipts(state: ComplianceWorkflowState, tools: list) -> dict:
    """Run per-receipt ReAct agents in parallel using ThreadPoolExecutor."""
    receipts = state["receipts"]
    user = state["user"]

    def analyze_one(receipt: dict) -> dict:
        human_edit_block = _format_human_edit_block(receipt.get("_human_edit", {}))
        conditions = state["combined_conditions"]

        prompt = RECEIPT_ANALYSIS_PROMPT.format(
            employee_name=user.name if user else "Unknown",
            department=user.department if user else "Unknown",
            rank=str(user.rank if user else 1),
            currency=state.get("currency", "MYR"),
            receipt_json=json.dumps(receipt, indent=2, default=str),
            human_edit_block=human_edit_block,
            conditions=json.dumps(conditions, indent=2),
        )

        agent = create_react_agent(get_agent_llm(), tools)
        result = agent.invoke(
            {"messages": [HumanMessage(content=prompt)]},
            config={"recursion_limit": 15},
        )

        last_msg = result["messages"][-1]
        content = last_msg.content if isinstance(last_msg.content, str) else ""
        return _parse_line_item(content, receipt)

    line_items = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_to_receipt = {executor.submit(analyze_one, r): r for r in receipts}
        for future in as_completed(future_to_receipt):
            receipt = future_to_receipt[future]
            try:
                line_items.append(future.result())
            except Exception as e:
                logger.error(f"analyze_receipts error for {receipt.get('document_id')}: {e}")
                line_items.append(_parse_line_item("", receipt))

    return {"line_items": line_items}


def aggregate_totals(state: ComplianceWorkflowState) -> dict:
    """Compute aggregate totals from all line items (pure Python, no LLM)."""
    line_items = state.get("line_items", [])
    total_requested = sum(float(li.get("requested_amount", 0) or 0) for li in line_items)
    total_deduction = sum(float(li.get("deduction_amount", 0) or 0) for li in line_items)
    net_approved = sum(float(li.get("approved_amount", 0) or 0) for li in line_items)

    by_category: dict = {}
    for li in line_items:
        cat = li.get("category", "Other")
        if cat not in by_category:
            by_category[cat] = {"claimed": 0.0, "approved": 0.0}
        by_category[cat]["claimed"] += float(li.get("requested_amount", 0) or 0)
        by_category[cat]["approved"] += float(li.get("approved_amount", 0) or 0)

    return {
        "totals": {
            "total_requested": round(total_requested, 2),
            "total_deduction": round(total_deduction, 2),
            "net_approved": round(net_approved, 2),
            "by_category": by_category,
        }
    }


def final_judgment(state: ComplianceWorkflowState, tools: list) -> dict:
    """Run a ReAct agent to produce the overall settlement verdict."""
    policy = state.get("policy")

    prompt = FINAL_JUDGMENT_PROMPT.format(
        line_items_json=json.dumps(state.get("line_items", []), indent=2, default=str),
        totals_json=json.dumps(state.get("totals", {}), indent=2),
        policy_overview=policy.overview_summary if policy else "",
    )

    agent = create_react_agent(get_agent_llm(), tools)
    result = agent.invoke(
        {"messages": [HumanMessage(content=prompt)]},
        config={"recursion_limit": 9},
    )

    last_msg = result["messages"][-1]
    content = last_msg.content if isinstance(last_msg.content, str) else ""

    parsed = None
    try:
        parsed = json.loads(content)
    except Exception:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group())
            except Exception:
                pass

    if not parsed:
        logger.warning(f"final_judgment parse failed. Content: {content[:200]}")
        parsed = {}

    try:
        confidence = float(parsed.get("confidence", 0.0))
    except (ValueError, TypeError):
        confidence = 0.0

    return {
        "judgment": parsed.get("overall_judgment", "MANUAL REVIEW"),
        "confidence": confidence,
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
    document_ids: Optional[List[str]] = None,
) -> dict:
    """
    Compile and run the 5-node compliance graph.
    Returns a dict with reimbursement_id, judgment, totals, line_items,
    confidence, and summary.
    """
    tools = [get_current_date, make_search_policy_rag_tool(policy_id, session)]

    def _load_context(state):
        return load_context(state, session)

    def _analyze_receipts(state):
        return analyze_receipts(state, tools)

    def _final_judgment(state):
        return final_judgment(state, tools)

    def _save_reimbursement(state):
        return save_reimbursement(state, session)

    graph = StateGraph(ComplianceWorkflowState)
    graph.add_node("load_context", _load_context)
    graph.add_node("analyze_receipts", _analyze_receipts)
    graph.add_node("aggregate_totals", aggregate_totals)
    graph.add_node("final_judgment", _final_judgment)
    graph.add_node("save_reimbursement", _save_reimbursement)

    graph.add_edge(START, "load_context")
    graph.add_edge("load_context", "analyze_receipts")
    graph.add_edge("analyze_receipts", "aggregate_totals")
    graph.add_edge("aggregate_totals", "final_judgment")
    graph.add_edge("final_judgment", "save_reimbursement")
    graph.add_edge("save_reimbursement", END)

    app = graph.compile()

    result = app.invoke({
        "settlement_id": settlement_id,
        "policy_id": policy_id,
        "main_category": main_category,
        "user_id": user_id,
        "all_category": all_category or [],
        "user": None,
        "policy": None,
        "receipts": [],
        "combined_conditions": [],
        "currency": "",
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
