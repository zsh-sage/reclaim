"""
Compliance Workflow (Workflow 3) — Basket Evaluation
5-node LangGraph pipeline:
  load_context -> analyze_receipts -> aggregate_totals -> final_judgment -> save_reimbursement

Per-receipt ReAct agents run in parallel; final_judgment agent produces the overall verdict.
"""
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, List, Optional
from uuid import UUID
from decimal import Decimal

from langchain_core.messages import HumanMessage
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import create_react_agent
from sqlmodel import Session, select
from typing_extensions import TypedDict

from core.config import settings
from core.models import (
    Reimbursement, SupportingDocument, TravelSettlement, User, Policy,
    LineItem, ReimbursementSubCategory, SettlementCategory, SettlementReceipt,
    PolicySection,
)
from core.enums import JudgmentResult, ReimbursementStatus
from engine.llm import get_agent_llm
from engine.prompts.compliance_prompts import RECEIPT_ANALYSIS_PROMPT, FINAL_JUDGMENT_PROMPT
from engine.tools.compliance_tools import get_disparance_date, make_search_policy_rag_tool

logger = logging.getLogger(__name__)


# -- Graph State ---------------------------------------------------------------

class ComplianceWorkflowState(TypedDict):
    # Inputs
    settlement_id: str
    policy_id: Optional[str]
    main_category: str
    user_id: str
    all_category: List[str]
    document_ids: Optional[List[str]]
    is_auto_reimburse_enabled: bool

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


# -- Helpers -------------------------------------------------------------------

def _extract_text_content(content: Any) -> str:
    """Extract string content from an AIMessage, handling both str and list types."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and item.get("type") == "text":
                parts.append(str(item.get("text", "")))
            elif isinstance(item, dict):
                parts.append(str(item))
        return "\n".join(parts)
    return str(content) if content else ""


def _extract_json(content: str) -> dict | None:
    """Try to extract a JSON object from text with brace-balanced parsing."""
    if not content:
        return None
    try:
        result = json.loads(content)
        if isinstance(result, dict):
            return result
    except Exception:
        pass
    depth = 0
    start = -1
    candidates: list[str] = []
    for i, ch in enumerate(content):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start >= 0:
                candidates.append(content[start : i + 1])
                start = -1
    for candidate in reversed(candidates):
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue
    return None


def _format_human_edit_block(human_edit) -> str:
    """Format _human_edit dict into a readable prompt block. Returns empty string if no changes."""
    if not isinstance(human_edit, dict):
        logger.warning("[HUMAN_EDIT] Expected dict but got %s: %r", type(human_edit).__name__, human_edit)
        return ""
    if not human_edit.get("has_changes"):
        return ""

    lines = [
        "--- Human Edit Information ---",
        f"Overall Risk: {human_edit.get('overall_risk', 'NONE')}",
        "Changed Fields:",
    ]
    for field, info in (human_edit.get("changes_by_field") or {}).items():
        if isinstance(info, dict):
            orig = info.get("original", "N/A")
            edited = info.get("edited", "N/A")
            severity = info.get("severity", "UNKNOWN")
        else:
            # editable_fields stores flat values, not nested change records
            orig = "N/A"
            edited = str(info) if info is not None else "N/A"
            severity = "UNKNOWN"
        lines.append(f"  - {field}: {orig!r} -> {edited!r}  [Severity: {severity}]")
    return "\n".join(lines)


def _parse_line_item(content: str, receipt: dict) -> dict:
    """Parse JSON from LLM response for a single receipt. Returns a fallback dict on failure."""
    parsed = _extract_json(content)

    if isinstance(parsed, dict):
        requested = float(parsed.get("requested_amount", 0) or 0)
        approved = float(parsed.get("approved_amount", 0) or 0)
        deducted = round(requested - approved, 2)
        parsed["deduction_amount"] = deducted
        return parsed

    # Fallback — LLM response could not be parsed
    requested = float(receipt.get("total_amount", 0) or 0)
    return {
        "document_id": receipt.get("document_id", "unknown"),
        "date": receipt.get("date", ""),
        "category": receipt.get("category", ""),
        "description": receipt.get("merchant_name", ""),
        "status": "MANUAL_REVIEW",
        "requested_amount": requested,
        "approved_amount": 0.0,
        "deduction_amount": requested,
        "audit_notes": [{"tag": "[PARSE_ERROR]", "message": "Could not parse compliance analysis."}],
        "human_edit_risk": "NONE",
    }


# -- Graph Nodes ---------------------------------------------------------------

def load_context(state: ComplianceWorkflowState, session: Session) -> dict:
    """Load user, policy, and TravelSettlement basket from the database."""
    logger.info("[LOAD_CONTEXT] Loading context for settlement=%s policy=%s user=%s", state.get("settlement_id"), state.get("policy_id"), state.get("user_id"))
    user = session.get(User, UUID(state["user_id"]))
    policy = session.get(Policy, UUID(state["policy_id"])) if state.get("policy_id") else None

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
                logger.info("[LOAD_CONTEXT] Found settlement, fetching categories and receipts")
                if not all_category:
                    # Fetch from normalized table
                    cats = session.exec(
                        select(SettlementCategory).where(
                            SettlementCategory.settlement_id == settlement.settlement_id
                        )
                    ).all()
                    all_category = [c.category for c in cats]

                # Fetch receipts from normalized table, filtered to this policy group
                receipt_query = select(SettlementReceipt).where(
                    SettlementReceipt.settlement_id == settlement.settlement_id
                )
                doc_id_filter = state.get("document_ids") or []
                if doc_id_filter:
                    receipt_query = receipt_query.where(
                        SettlementReceipt.document_id.in_([UUID(d) for d in doc_id_filter])
                    )
                s_receipts = session.exec(receipt_query).all()
                logger.info("[LOAD_CONTEXT] Found %d SettlementReceipts (filtered by %d doc_ids)", len(s_receipts), len(doc_id_filter))

                # Bulk-fetch all SupportingDocuments for this settlement in one query
                doc_ids = [sr.document_id for sr in s_receipts if sr.document_id]
                if doc_ids:
                    bulk_docs = session.exec(
                        select(SupportingDocument).where(
                            SupportingDocument.document_id.in_(doc_ids)
                        )
                    ).all()
                    doc_by_id = {d.document_id: d for d in bulk_docs}
                else:
                    doc_by_id = {}

                # Build receipt dicts from normalized rows
                receipts = []
                for sr in s_receipts:
                    receipt_dict = {
                        "document_id": str(sr.document_id) if sr.document_id else "",
                        "date": sr.receipt_date.isoformat() if sr.receipt_date else "",
                        "category": sr.category or "",
                        "merchant_name": sr.merchant_name or "",
                        "total_amount": float(sr.claimed_amount) if sr.claimed_amount else 0,
                        "currency": sr.currency or settlement.currency or "MYR",
                    }
                    if sr.document_id:
                        doc = doc_by_id.get(sr.document_id)
                        if doc:
                            receipt_dict["extracted_data"] = doc.extracted_data or {}
                    receipts.append(receipt_dict)
                    logger.info("[LOAD_CONTEXT] Receipt %s: category=%s amount=%s", receipt_dict.get("document_id"), receipt_dict.get("category"), receipt_dict.get("total_amount"))

                currency = settlement.currency or ""
        except Exception:
            logger.exception("[LOAD_CONTEXT] Error loading settlement data")
            raise

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
                    # Apply editable_fields on top of receipt dict (defensive)
                    fields = doc.editable_fields
                    if isinstance(fields, dict):
                        # Never let editable_fields overwrite our internal _human_edit key
                        safe_fields = {k: v for k, v in fields.items() if k != "_human_edit"}
                        receipt.update(safe_fields)
                    elif fields:
                        logger.warning("[LOAD_CONTEXT] doc.editable_fields is not a dict for doc=%s (type=%s)", doc_id, type(fields).__name__)
                    # Human edit info is now in document_change_logs table.
                    # For the agent prompt, we just flag that edits exist.
                    receipt["_human_edit"] = {
                        "has_changes": True,
                        "overall_risk": "MEDIUM",
                        "changes_by_field": fields if isinstance(fields, dict) else {},
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

    logger.info("[LOAD_CONTEXT] Returning %d receipts, %d categories, %d conditions", len(receipts), len(all_category), len(combined_conditions))

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


def analyze_receipts(state: ComplianceWorkflowState, tools: list, progress_callback=None) -> dict:
    """Run per-receipt ReAct agents in parallel using ThreadPoolExecutor."""
    receipts = state["receipts"]
    user = state["user"]
    logger.info("[ANALYZE_RECEIPTS] Starting analysis of %d receipts", len(receipts))

    def analyze_one(receipt: dict) -> dict:
        doc_id = receipt.get("document_id", "unknown")
        logger.info("[ANALYZE_ONE] Starting analysis for receipt %s", doc_id)
        human_edit_block = _format_human_edit_block(receipt.get("_human_edit", {}))
        conditions = state["combined_conditions"]

        prompt = RECEIPT_ANALYSIS_PROMPT.format(
            employee_name=user.name if user else "Unknown",
            department="Unknown",  # department is now normalized, fetch if needed
            rank=str(user.rank if user else 1),
            currency=state.get("currency", "MYR"),
            receipt_json=json.dumps(receipt, indent=2, default=str),
            human_edit_block=human_edit_block,
            conditions=json.dumps(conditions, indent=2),
        )

        agent = create_react_agent(get_agent_llm(), tools)
        result = agent.invoke(
            {"messages": [HumanMessage(content=prompt)]},
            config={"recursion_limit": 25},
        )

        last_msg = result["messages"][-1]
        content = _extract_text_content(last_msg.content)
        parsed = _parse_line_item(content, receipt)
        logger.info(
            "[ANALYZE_ONE] Receipt %s result: status=%s requested=%s approved=%s",
            doc_id, parsed.get("status"), parsed.get("requested_amount"), parsed.get("approved_amount"),
        )
        return parsed

    line_items = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_to_receipt = {executor.submit(analyze_one, r): r for r in receipts}
        for future in as_completed(future_to_receipt):
            receipt = future_to_receipt[future]
            try:
                li = future.result()
                line_items.append(li)
                logger.info("[ANALYZE_RECEIPTS] Completed %d/%d receipts", len(line_items), len(receipts))
                if progress_callback:
                    progress_callback("analyze_receipts", {
                        "current": len(line_items),
                        "total": len(receipts),
                    })
            except Exception:
                logger.exception("[ANALYZE_RECEIPTS] Error for receipt %s", receipt.get("document_id"))
                line_items.append(_parse_line_item("", receipt))

    logger.info("[ANALYZE_RECEIPTS] Finished with %d line_items", len(line_items))
    return {"line_items": line_items}


def aggregate_totals(state: ComplianceWorkflowState) -> dict:
    """Compute aggregate totals from all line items (pure Python, no LLM)."""
    line_items = state.get("line_items", [])
    logger.info("[AGGREGATE_TOTALS] Aggregating %d line items", len(line_items))
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

    totals_result = {
        "totals": {
            "total_requested": round(total_requested, 2),
            "total_deduction": round(total_deduction, 2),
            "net_approved": round(net_approved, 2),
            "by_category": by_category,
        }
    }
    logger.info("[AGGREGATE_TOTALS] Totals: requested=%s approved=%s deduction=%s", totals_result["totals"]["total_requested"], totals_result["totals"]["net_approved"], totals_result["totals"]["total_deduction"])
    return totals_result


def final_judgment(state: ComplianceWorkflowState, tools: list) -> dict:
    """Run a ReAct agent to produce the overall settlement verdict."""
    policy = state.get("policy")
    logger.info("[FINAL_JUDGMENT] Running final judgment on %d line_items", len(state.get("line_items", [])))

    prompt = FINAL_JUDGMENT_PROMPT.format(
        line_items_json=json.dumps(state.get("line_items", []), indent=2, default=str),
        totals_json=json.dumps(state.get("totals", {}), indent=2),
        policy_overview=policy.overview_summary if policy else "",
    )

    agent = create_react_agent(get_agent_llm(), tools)
    result = agent.invoke(
        {"messages": [HumanMessage(content=prompt)]},
        config={"recursion_limit": 15},
    )

    last_msg = result["messages"][-1]
    content = _extract_text_content(last_msg.content)

    parsed = _extract_json(content)
    if not parsed:
        logger.warning("[FINAL_JUDGMENT] Parse failed. Content: %s", content[:200])
        parsed = {}

    try:
        confidence = float(parsed.get("confidence", 0.0))
    except (ValueError, TypeError):
        confidence = 0.0

    judgment = parsed.get("overall_judgment", "MANUAL REVIEW")
    logger.info("[FINAL_JUDGMENT] Result: judgment=%s confidence=%s", judgment, confidence)

    return {
        "judgment": judgment,
        "confidence": confidence,
        "summary": parsed.get("summary", ""),
    }


def _map_agent_status_to_enum(status_str: str) -> JudgmentResult:
    status_upper = status_str.upper().replace(" ", "_")
    mapping = {
        "APPROVED": JudgmentResult.APPROVED,
        "APPROVE": JudgmentResult.APPROVED,
        "REJECTED": JudgmentResult.REJECTED,
        "REJECT": JudgmentResult.REJECTED,
        "PARTIAL": JudgmentResult.PARTIAL,
        "PARTIAL_APPROVE": JudgmentResult.PARTIAL,
        "NEEDS_INFO": JudgmentResult.NEEDS_INFO,
        "MANUAL_REVIEW": JudgmentResult.NEEDS_INFO,
    }
    return mapping.get(status_upper, JudgmentResult.NEEDS_INFO)


def save_reimbursement(state: ComplianceWorkflowState, session: Session) -> dict:
    """Persist the evaluated basket as a Reimbursement record."""
    from datetime import datetime, timezone

    user = state["user"]
    settlement_uuid = UUID(state["settlement_id"]) if state.get("settlement_id") else None

    totals = state.get("totals", {})
    total_claimed = Decimal(str(totals.get("total_requested", 0) or 0))
    total_approved = Decimal(str(totals.get("net_approved", 0) or 0))
    total_deduction = Decimal(str(totals.get("total_deduction", 0) or 0))

    # Map judgment string to enum
    judgment_str = state.get("judgment", "MANUAL REVIEW")
    judgment_enum = _map_agent_status_to_enum(judgment_str)

    # Determine final status based on autonomous policy:
    #   APPROVED + confidence>0.7 + no human edits + within budget → auto-approve (payout triggered by API layer)
    #   APPROVED + confidence>0.7 + no human edits + over budget  → REVIEW (tagged "over budget")
    #   REJECTED (any confidence)                                → auto-reject (no payout, employee notified)
    #   anything else                                            → REVIEW (HR Required Attention)
    has_human_edits = any(
        r.get("_human_edit", {}).get("has_changes")
        for r in state.get("receipts", [])
    )
    confidence = state.get("confidence") or 0.0
    final_status = ReimbursementStatus.REVIEW
    reviewed_at = None
    budget_violations = []

    if settings.AUTO_REIMBURSE_ENABLED:
        if judgment_enum == JudgmentResult.APPROVED and confidence > 0.7 and not has_human_edits:
            # Check category budgets
            budget_violations = _check_category_budgets(
                state.get("policy_id"),
                state.get("totals", {}).get("by_category", {}),
                session
            )

            if budget_violations:
                # Over budget - route to REVIEW
                final_status = ReimbursementStatus.REVIEW
                reviewed_at = None  # Not auto-processed
            else:
                # Within budget - auto-approve
                final_status = ReimbursementStatus.APPROVED
                reviewed_at = datetime.now(timezone.utc)
        elif judgment_enum == JudgmentResult.REJECTED:
            final_status = ReimbursementStatus.REJECTED
            reviewed_at = datetime.now(timezone.utc)

    # Include budget violations in summary and audit notes if present
    final_summary = state.get("summary", "")
    if budget_violations:
        base_summary = state.get("summary", "")

        # Add to summary for reimbursement record
        budget_summary = " | ".join([f"{v['category']}: claimed {v['claimed']}, budget {v['budget']}" for v in budget_violations])
        final_summary = f"{base_summary} [OVER BUDGET: {budget_summary}]" if base_summary else f"Claim exceeds category budgets: {budget_summary}"

        # Add audit notes to line items for transparency (HR and employee can see)
        # Find line items in over-budget categories and append budget info
        line_items = state.get("line_items", [])
        for item in line_items:
            item_category = item.get("category", "")
            matching_violation = next((v for v in budget_violations if v["category"] == item_category), None)
            if matching_violation:
                budget_note = f"Claim is over the budget for {item_category} category which is RM {matching_violation['budget']:.2f}"
                existing_notes = item.get("audit_notes", [])
                if isinstance(existing_notes, list):
                    item["audit_notes"] = existing_notes + [{"tag": "OVER_BUDGET", "message": budget_note}]

    reimbursement = Reimbursement(
        user_id=UUID(state["user_id"]),
        policy_id=UUID(state["policy_id"]),
        settlement_id=settlement_uuid,
        main_category=state["main_category"],
        currency=state.get("currency", ""),
        total_claimed_amount=float(total_claimed),
        total_approved_amount=float(total_approved) if total_approved > 0 else None,
        total_rejected_amount=float(total_deduction) if total_deduction > 0 else None,
        judgment=judgment_enum,
        confidence=state.get("confidence"),
        ai_reasoning={
            "model": settings.CHAT_MODEL,
            "policy_refs": [],
            "reasoning": f"Agent judgment: {judgment_str}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        status=final_status,
        reviewed_at=reviewed_at,
        summary=final_summary,
    )

    try:
        session.add(reimbursement)
        session.flush()
        logger.info("[SAVE_REIMBURSEMENT] Created reimbursement reim_id=%s", reimbursement.reim_id)

        # Bulk insert ReimbursementSubCategory rows
        for cat in state.get("all_category", []):
            rsc = ReimbursementSubCategory(
                reim_id=reimbursement.reim_id,
                sub_category=cat,
            )
            session.add(rsc)

        # Bulk insert LineItem rows
        line_item_count = 0
        for li in state.get("line_items", []):
            # Map agent status to enum
            li_judgment = _map_agent_status_to_enum(li.get("status", "APPROVED"))

            # Build audit notes into rejection_reason
            audit_notes = li.get("audit_notes", [])
            rejection_reason = None
            if li_judgment in (JudgmentResult.REJECTED, JudgmentResult.NEEDS_INFO):
                rejection_reason = "; ".join(
                    f"{n.get('tag', '')}: {n.get('message', '')}" for n in audit_notes
                ) if audit_notes else None

            # Parse document_id
            doc_id_str = li.get("document_id", "")
            doc_uuid = None
            if doc_id_str and doc_id_str != "unknown":
                try:
                    doc_uuid = UUID(doc_id_str)
                except ValueError:
                    doc_uuid = None

            line_item = LineItem(
                reim_id=reimbursement.reim_id,
                document_id=doc_uuid,
                description=li.get("description", ""),
                category=li.get("category", ""),
                claimed_amount=float(li.get("requested_amount", 0) or 0),
                approved_amount=float(li.get("approved_amount", 0) or 0) if li.get("approved_amount") else None,
                currency=state.get("currency", "MYR"),
                judgment=li_judgment,
                rejection_reason=rejection_reason,
            )
            session.add(line_item)
            line_item_count += 1

        session.commit()
        session.refresh(reimbursement)
        logger.info("[SAVE_REIMBURSEMENT] Committed %d line_items for reim_id=%s", line_item_count, reimbursement.reim_id)
    except Exception:
        logger.exception("[SAVE_REIMBURSEMENT] Failed to save reimbursement")
        session.rollback()
        raise

    return {"reimbursement_id": str(reimbursement.reim_id)}


def _check_category_budgets(policy_id: str, category_totals: dict, session: Session) -> list:
    """
    Check if claimed amounts exceed auto-approval budgets per category.

    Returns list of violations: [{"category": "Meals", "claimed": 150.0, "budget": 100.0}, ...]
    """
    from core.models import PolicyReimbursableCategory
    from sqlalchemy import select

    violations = []

    # Fetch all category budgets for this policy
    stmt = select(PolicyReimbursableCategory).where(
        PolicyReimbursableCategory.policy_id == UUID(policy_id)
    )
    result = session.execute(stmt)
    policy_categories = {pc.category: pc.auto_approval_budget for pc in result.scalars()}

    # Check each category in the claim
    for category_name, claimed_amount in category_totals.items():
        budget = policy_categories.get(category_name)

        # Null budget = unlimited, skip check
        if budget is None:
            continue

        if float(claimed_amount) > float(budget):
            violations.append({
                "category": category_name,
                "claimed": float(claimed_amount),
                "budget": float(budget)
            })

    return violations


# -- Graph Assembly --------------------------------------------------------------

def run_compliance_workflow(
    settlement_id: str,
    policy_id: str,
    main_category: str,
    user_id: str,
    all_category: Optional[List[str]],
    session: Session,
    document_ids: Optional[List[str]] = None,
    is_auto_reimburse_enabled: bool = False,
    progress_callback=None,
) -> dict:
    """
    Compile and run the 5-node compliance graph.
    Returns a dict with reimbursement_id, judgment, totals, line_items,
    confidence, and summary.
    """
    tools = [get_disparance_date]
    if policy_id:
        tools.append(make_search_policy_rag_tool(policy_id, session))
    _progress = {"cb": progress_callback}

    def _load_context(state):
        if _progress["cb"]:
            _progress["cb"]("load_context", {"message": "Loading policy and receipts..."})
        return load_context(state, session)

    def _analyze_receipts(state):
        if _progress["cb"]:
            _progress["cb"]("analyze_receipts", {"message": "Analyzing receipts with AI..."})
        return analyze_receipts(state, tools, progress_callback=_progress["cb"])

    def _aggregate_totals(state):
        if _progress["cb"]:
            _progress["cb"]("aggregate_totals", {"message": "Computing totals..."})
        return aggregate_totals(state)

    def _final_judgment(state):
        if _progress["cb"]:
            _progress["cb"]("final_judgment", {"message": "Making judgment..."})
        return final_judgment(state, tools)

    def _save_reimbursement(state):
        if _progress["cb"]:
            _progress["cb"]("save_reimbursement", {"message": "Saving reimbursement result..."})
        return save_reimbursement(state, session)

    graph = StateGraph(ComplianceWorkflowState)
    graph.add_node("load_context", _load_context)
    graph.add_node("analyze_receipts", _analyze_receipts)
    graph.add_node("aggregate_totals", _aggregate_totals)
    graph.add_node("final_judgment", _final_judgment)
    graph.add_node("save_reimbursement", _save_reimbursement)

    graph.add_edge(START, "load_context")
    graph.add_edge("load_context", "analyze_receipts")
    graph.add_edge("analyze_receipts", "aggregate_totals")
    graph.add_edge("aggregate_totals", "final_judgment")
    graph.add_edge("final_judgment", "save_reimbursement")
    graph.add_edge("save_reimbursement", END)

    app = graph.compile()

    logger.info("[RUN_COMPLIANCE] Invoking graph for settlement=%s policy=%s", settlement_id, policy_id)
    result = app.invoke({
        "settlement_id": settlement_id,
        "policy_id": policy_id or "",
        "main_category": main_category,
        "user_id": user_id,
        "all_category": all_category or [],
        "document_ids": document_ids or [],
        "is_auto_reimburse_enabled": is_auto_reimburse_enabled,
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

    logger.info("[RUN_COMPLIANCE] Graph complete. reimbursement_id=%s judgment=%s", result.get("reimbursement_id"), result.get("judgment"))
    return {
        "reimbursement_id": result.get("reimbursement_id", ""),
        "judgment": result.get("judgment", ""),
        "summary": result.get("summary", ""),
        "line_items": result.get("line_items", []),
        "totals": result.get("totals", {}),
        "confidence": result.get("confidence", 0.0),
    }
