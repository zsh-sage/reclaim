import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

import asyncio
import json
import concurrent.futures

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from starlette.requests import Request
from sqlalchemy.orm import joinedload
from sqlmodel import Session, select

from api import deps
from api.rate_limit import limiter
from api.schemas import (
    ReimbursementResponse,
    StatusUpdateRequest,
    AnalyzeReimbursementRequest,
    LineItemResponse,
)
from core.models import (
    User, Reimbursement, SupportingDocument, TravelSettlement, Policy,
    LineItem, ReimbursementSubCategory, SettlementCategory,
    Department,
)
from core.enums import UserRole, ReimbursementStatus, JudgmentResult, PolicyStatus
from core.database import engine as db_engine
from engine.agents.compliance_agent import run_compliance_workflow
from engine.progress import ProgressTracker

router = APIRouter()
logger = logging.getLogger(__name__)

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

_STATUS_TO_JUDGMENT = {
    ReimbursementStatus.APPROVED: JudgmentResult.APPROVED,
    ReimbursementStatus.REJECTED: JudgmentResult.REJECTED,
    ReimbursementStatus.REVIEW:   JudgmentResult.NEEDS_INFO,
}


def _enum_val(field) -> str:
    """Safely extract enum string value from either an enum instance or a raw string."""
    return field.value if field and hasattr(field, "value") else str(field) if field is not None else None


def _build_reimbursement_response(
    r: Reimbursement,
    db: Session,
    include_line_items: bool = True,
    employee_name: Optional[str] = None,
    department_name: Optional[str] = None,
) -> dict:
    """Build a response dict for a Reimbursement row, including joined data."""
    if include_line_items:
        line_items = db.exec(
            select(LineItem).where(LineItem.reim_id == r.reim_id)
        ).all()
        sub_cats = db.exec(
            select(ReimbursementSubCategory).where(
                ReimbursementSubCategory.reim_id == r.reim_id
            )
        ).all()
    else:
        line_items = []
        sub_cats = []

    # Use pre-fetched names if provided, otherwise look up
    if employee_name is None or department_name is None:
        user = db.get(User, r.user_id)
        if user:
            employee_name = user.name
            if user.department_id:
                dept = db.get(Department, user.department_id)
                if dept:
                    department_name = dept.name
        employee_name = employee_name or "Unknown"
        department_name = department_name or "Unknown"

    # Fetch policy name if policy_id is set
    policy_name = None
    if r.policy_id:
        policy = db.get(Policy, r.policy_id)
        if policy:
            policy_name = policy.title

    result = {
        "reim_id": str(r.reim_id),
        "user_id": str(r.user_id),
        "employee_name": employee_name,
        "department_name": department_name,
        "policy_id": str(r.policy_id) if r.policy_id else None,
        "policy_name": policy_name,
        "settlement_id": str(r.settlement_id) if r.settlement_id else None,
        "main_category": r.main_category,
        "currency": r.currency,
        "total_claimed_amount": float(r.total_claimed_amount) if r.total_claimed_amount else None,
        "total_approved_amount": float(r.total_approved_amount) if r.total_approved_amount else None,
        "total_rejected_amount": float(r.total_rejected_amount) if r.total_rejected_amount else None,
        "confidence": r.confidence,
        "judgment": _enum_val(r.judgment),
        "status": _enum_val(r.status),
        "summary": r.summary,
        "ai_reasoning": r.ai_reasoning,
        "reviewed_by": str(r.reviewed_by) if r.reviewed_by else None,
        "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "sub_categories": [sc.sub_category for sc in sub_cats],
        "receipt_count": len(line_items),
    }

    if include_line_items:
        result["line_items"] = [
            {
                "line_item_id": str(li.line_item_id),
                "reim_id": str(li.reim_id),
                "document_id": str(li.document_id) if li.document_id else None,
                "description": li.description,
                "category": li.category,
                "quantity": li.quantity,
                "unit_price": float(li.unit_price) if li.unit_price else None,
                "claimed_amount": float(li.claimed_amount) if li.claimed_amount else None,
                "approved_amount": float(li.approved_amount) if li.approved_amount else None,
                "currency": li.currency,
                "expense_date": li.expense_date.isoformat() if li.expense_date else None,
                "judgment": _enum_val(li.judgment),
                "rejection_reason": li.rejection_reason,
                "policy_section_ref": str(li.policy_section_ref) if li.policy_section_ref else None,
            }
            for li in line_items
        ]

    return result


@router.get("/health")
def health():
    return {"status": "ok", "workflow": "compliance_analysis"}


@router.get("/")
def list_reimbursements(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[dict]:
    if current_user.role == UserRole.HR:
        stmt = select(Reimbursement)
    else:
        stmt = select(Reimbursement).where(Reimbursement.user_id == current_user.user_id)

    if status:
        stmt = stmt.where(Reimbursement.status == status)

    stmt = stmt.offset(offset).limit(limit)
    reimbursements = db.exec(stmt).all()

    # Bulk fetch employee and department names to avoid N+1
    user_ids = {r.user_id for r in reimbursements}
    users = db.exec(select(User).where(User.user_id.in_(user_ids))).all() if user_ids else []
    user_map = {u.user_id: u for u in users}

    dept_ids = {u.department_id for u in users if u.department_id}
    depts = db.exec(select(Department).where(Department.department_id.in_(dept_ids))).all() if dept_ids else []
    dept_map = {d.department_id: d for d in depts}

    name_map: dict[UUID, tuple[Optional[str], Optional[str]]] = {}
    for uid in user_ids:
        u = user_map.get(uid)
        if u:
            d = dept_map.get(u.department_id) if u.department_id else None
            name_map[uid] = (u.name, d.name if d else None)
        else:
            name_map[uid] = (None, None)

    return [
        _build_reimbursement_response(
            r,
            db,
            include_line_items=False,
            employee_name=name_map.get(r.user_id, (None, None))[0],
            department_name=name_map.get(r.user_id, (None, None))[1],
        )
        for r in reimbursements
    ]


@router.get("/{reim_id}")
def get_reimbursement(
    reim_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    try:
        reim_uuid = UUID(reim_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reim_id")

    r = db.get(Reimbursement, reim_uuid)
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reimbursement not found")

    if current_user.role != UserRole.HR and r.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return _build_reimbursement_response(r, db, include_line_items=True)


@router.patch("/{reim_id}/status")
def update_reimbursement_status(
    reim_id: str,
    body: StatusUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_hr_user),
) -> dict:
    try:
        reim_uuid = UUID(reim_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reim_id")

    r = db.get(Reimbursement, reim_uuid)
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reimbursement not found")

    # Fetch line items
    line_items = db.exec(
        select(LineItem).where(LineItem.reim_id == r.reim_id)
    ).all()

    # Apply HR line-item amount overrides (if provided)
    if body.line_items:
        override_map = {li.line_item_id: li.approved_amount for li in body.line_items}
        for li in line_items:
            if li.line_item_id in override_map:
                li.approved_amount = override_map[li.line_item_id]
                li.judgment = JudgmentResult.APPROVED if override_map[li.line_item_id] > 0 else JudgmentResult.REJECTED
        db.add_all(line_items)
        db.flush()

    # When HR approves the whole claim, auto-override any rejected line items
    if body.status == ReimbursementStatus.APPROVED:
        for li in line_items:
            if li.judgment == JudgmentResult.REJECTED:
                li.judgment = JudgmentResult.APPROVED
                li.approved_amount = li.claimed_amount
        db.add_all(line_items)
        db.flush()

    # Constraint 2: total_approved_amount must equal SUM(line_items.approved_amount)
    approved_sum = sum(
        float(li.approved_amount or 0) for li in line_items
    )
    if body.status in (ReimbursementStatus.APPROVED, ReimbursementStatus.REJECTED):
        r.total_approved_amount = approved_sum
        r.total_rejected_amount = float(r.total_claimed_amount or 0) - approved_sum

    r.status = body.status
    r.reviewed_by = current_user.user_id
    r.reviewed_at = datetime.now(timezone.utc)
    r.judgment = _STATUS_TO_JUDGMENT.get(body.status, JudgmentResult.NEEDS_INFO)
    # Store HR note if provided
    if body.hr_note:
        reasoning = dict(r.ai_reasoning or {})
        reasoning["hr_note"] = body.hr_note
        r.ai_reasoning = reasoning
    r.updated_at = datetime.now(timezone.utc)
    db.add(r)
    db.commit()
    db.refresh(r)

    return _build_reimbursement_response(r, db, include_line_items=True)


@router.get("/{reim_id}/line-items")
def get_reimbursement_line_items(
    reim_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[dict]:
    try:
        reim_uuid = UUID(reim_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reim_id")

    r = db.get(Reimbursement, reim_uuid)
    if not r:
        raise HTTPException(status_code=404, detail="Reimbursement not found")

    if current_user.role != UserRole.HR and r.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    line_items = db.exec(
        select(LineItem).where(LineItem.reim_id == r.reim_id)
    ).all()

    return [
        {
            "line_item_id": str(li.line_item_id),
            "reim_id": str(li.reim_id),
            "document_id": str(li.document_id) if li.document_id else None,
            "description": li.description,
            "category": li.category,
            "quantity": li.quantity,
            "unit_price": float(li.unit_price) if li.unit_price else None,
            "claimed_amount": float(li.claimed_amount) if li.claimed_amount else None,
            "approved_amount": float(li.approved_amount) if li.approved_amount else None,
            "currency": li.currency,
            "expense_date": li.expense_date.isoformat() if li.expense_date else None,
            "judgment": _enum_val(li.judgment),
            "rejection_reason": li.rejection_reason,
            "policy_section_ref": str(li.policy_section_ref) if li.policy_section_ref else None,
        }
        for li in line_items
    ]


@router.post("/analyze")
@limiter.limit("5/minute")
async def analyze_reimbursement(
    request: Request,
    body: AnalyzeReimbursementRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """Run basket compliance analysis on a TravelSettlement against a policy."""
    logger.info("[API_ANALYZE] Called with settlement=%s policy=%s docs=%s user=%s", body.settlement_id, body.policy_id, body.document_ids, current_user.user_id)

    # === Validation ===
    try:
        settlement_uuid = UUID(body.settlement_id)
        policy_uuid = UUID(body.policy_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid settlement_id or policy_id",
        )

    settlement = db.get(TravelSettlement, settlement_uuid)
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Settlement {body.settlement_id} not found",
        )

    if settlement.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Settlement does not belong to current user",
        )

    policy = db.get(Policy, policy_uuid)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy {body.policy_id} not found",
        )

    if policy.status != PolicyStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Policy is not active",
        )

    from core.models import PolicyReimbursableCategory
    policy_cats = db.exec(
        select(PolicyReimbursableCategory).where(
            PolicyReimbursableCategory.policy_id == policy_uuid
        )
    ).all()
    reimbursable_categories = [c.category for c in policy_cats]

    main_category = reimbursable_categories[0] if reimbursable_categories else ""

    if not main_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Policy has no reimbursable categories",
        )

    # Cache check: return cached result if no human edits and settlement was already evaluated
    has_edits = bool(
        db.exec(
            select(SupportingDocument).where(
                SupportingDocument.settlement_id == settlement_uuid,
                SupportingDocument.human_edited == True,
            )
        ).first()
    )

    cached_reim = db.exec(
        select(Reimbursement).where(Reimbursement.settlement_id == settlement_uuid)
    ).first()

    if not has_edits and cached_reim:
        logger.info("[API_ANALYZE] Returning cached reimbursement %s", cached_reim.reim_id)
        return _build_reimbursement_response(cached_reim, db, include_line_items=True)

    # Fetch settlement categories
    settlement_cats = db.exec(
        select(SettlementCategory).where(
            SettlementCategory.settlement_id == settlement_uuid
        )
    ).all()
    all_category = [c.category for c in settlement_cats]

    if not all_category:
        all_category = reimbursable_categories or [main_category]

    logger.info("[API_ANALYZE] Categories for analysis: %s", all_category)

    # === Extract params for background processing ===
    user_id_str = str(current_user.user_id)

    # === Create task and launch background processing ===
    tracker = ProgressTracker()
    task_id = tracker.create_task()
    logger.info("[API_ANALYZE] Created task_id=%s for background compliance", task_id)

    loop = asyncio.get_running_loop()

    def _process_background():
        logger.info("[API_ANALYZE_BG] Starting background compliance for task=%s", task_id)
        with Session(db_engine) as bg_db:
            def progress_callback(stage: str, data: dict):
                logger.info("[API_ANALYZE_BG] task=%s stage=%s", task_id, stage)
                tracker.publish(task_id, stage, data)

            try:
                result = run_compliance_workflow(
                    settlement_id=body.settlement_id,
                    policy_id=body.policy_id,
                    main_category=main_category,
                    user_id=user_id_str,
                    all_category=all_category,
                    session=bg_db,
                    document_ids=request.document_ids,
                    is_auto_reimburse_enabled=request.is_auto_reimburse_enabled,
                    progress_callback=progress_callback,
                )
                logger.info("[API_ANALYZE_BG] Workflow returned reimbursement_id=%s", result.get("reimbursement_id"))
                reim_id = result.get("reimbursement_id")
                if not reim_id:
                    logger.error("[API_ANALYZE_BG] No reimbursement_id returned")
                    tracker.publish(task_id, "error", {"message": "Compliance workflow returned no reimbursement ID"})
                    return
                reim = bg_db.get(Reimbursement, UUID(reim_id))
                if not reim:
                    logger.error("[API_ANALYZE_BG] Reimbursement %s not found in DB", reim_id)
                    tracker.publish(task_id, "error", {"message": f"Reimbursement {reim_id} not found in database"})
                    return
                try:
                    formatted = _build_reimbursement_response(reim, bg_db, include_line_items=True)
                    logger.info("[API_ANALYZE_BG] Publishing complete event for task=%s", task_id)
                    tracker.publish(task_id, "complete", formatted)
                except Exception as build_err:
                    logger.exception("[API_ANALYZE_BG] Failed to build response")
                    tracker.publish(task_id, "error", {"message": f"Failed to format response: {build_err}"})
            except Exception as e:
                logger.exception("[API_ANALYZE_BG] Compliance workflow failed")
                try:
                    from decimal import Decimal
                    fail_reim = Reimbursement(
                        user_id=UUID(user_id_str),
                        policy_id=policy_uuid,
                        settlement_id=settlement_uuid,
                        main_category=main_category,
                        currency="MYR",
                        total_claimed_amount=Decimal("0"),
                        judgment=JudgmentResult.NEEDS_INFO,
                        status=ReimbursementStatus.REVIEW,
                        summary=f"Compliance pipeline failed — manual review required. Error: {str(e)[:500]}",
                        ai_reasoning={"error": str(e), "pipeline_failure": True},
                    )
                    bg_db.add(fail_reim)
                    bg_db.commit()
                    bg_db.refresh(fail_reim)
                    formatted = _build_reimbursement_response(fail_reim, bg_db, include_line_items=False)
                    tracker.publish(task_id, "complete", formatted)
                except Exception as fallback_err:
                    logger.exception("[API_ANALYZE_BG] Failed to write MANUAL_REVIEW record: %s", fallback_err)
                    tracker.publish(task_id, "error", {"message": str(e)})

    loop.run_in_executor(_executor, _process_background)

    logger.info("[API_ANALYZE] Returning task_id=%s", task_id)
    return {"task_id": task_id}


@router.get("/analyze/progress/{task_id}")
async def analyze_progress(task_id: str):
    """SSE endpoint: stream progress events for a compliance analysis task."""
    logger.info("[API_SSE] Client connected to reimbursements/analyze/progress/%s", task_id)
    tracker = ProgressTracker()

    async def event_generator():
        try:
            async for event_str in tracker.subscribe(task_id):
                logger.info("[API_SSE] Streaming event for task=%s: %s", task_id, event_str.strip().replace("\n", " "))
                yield event_str
        except asyncio.CancelledError:
            logger.info("[API_SSE] Client disconnected from task=%s", task_id)
        finally:
            asyncio.create_task(tracker.cleanup(task_id))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
