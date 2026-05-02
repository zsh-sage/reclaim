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
    LineItem, ReimbursementSubCategory,
    Department, Payout, Notification, SettlementReceipt, PolicyReimbursableCategory,
)
from core.enums import UserRole, ReimbursementStatus, JudgmentResult, PolicyStatus
from core.database import engine as db_engine
from engine.agents.compliance_agent import run_compliance_workflow
from engine.progress import ProgressTracker
from engine.services.payout_service import initiate_payout_sync

router = APIRouter()
logger = logging.getLogger(__name__)

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

_STATUS_TO_JUDGMENT = {
    ReimbursementStatus.APPROVED: JudgmentResult.APPROVED,
    ReimbursementStatus.REJECTED: JudgmentResult.REJECTED,
    ReimbursementStatus.REVIEW:   JudgmentResult.NEEDS_INFO,
    ReimbursementStatus.DISBURSING: JudgmentResult.APPROVED,
    ReimbursementStatus.PAID: JudgmentResult.APPROVED,
    ReimbursementStatus.DISBURSEMENT_FAILED: JudgmentResult.APPROVED,
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

    # Include payout info if one exists
    payout = db.exec(
        select(Payout).where(Payout.reim_id == r.reim_id)
    ).first()
    if payout:
        result["payout"] = {
            "payout_id": str(payout.payout_id),
            "amount": float(payout.amount),
            "currency": payout.currency,
            "status": _enum_val(payout.status),
            "xendit_id": payout.xendit_id,
            "channel_code": payout.channel_code,
            "failure_code": payout.failure_code,
            "created_at": payout.created_at.isoformat() if payout.created_at else None,
            "updated_at": payout.updated_at.isoformat() if payout.updated_at else None,
        }

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

    # Create notification for the employee
    reim_short = str(r.reim_id)[:8]
    if body.status == ReimbursementStatus.APPROVED:
        notif = Notification(
            user_id=r.user_id,
            type="success",
            title=f"Claim RC-{reim_short} approved",
            message=f"Your claim for MYR {float(r.total_approved_amount or 0):,.2f} has been approved and is ready for payout.",
            link=f"/employee/history?id={r.reim_id}",
            is_read=False,
        )
        db.add(notif)
    elif body.status == ReimbursementStatus.REJECTED:
        hr_note_text = body.hr_note or "No reason provided"
        notif = Notification(
            user_id=r.user_id,
            type="error",
            title=f"Claim RC-{reim_short} rejected",
            message=f"Your claim was rejected. Reason: {hr_note_text[:200]}",
            link=f"/employee/history?id={r.reim_id}",
            is_read=False,
        )
        db.add(notif)

    db.commit()
    db.refresh(r)

    result = _build_reimbursement_response(r, db, include_line_items=True)
    result["ready_for_payout"] = body.status == ReimbursementStatus.APPROVED
    return result


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
    """Run basket compliance analysis, auto-routing each receipt to its matched policy."""
    logger.info("[API_ANALYZE] Called with settlement=%s docs=%s user=%s", body.settlement_id, body.document_ids, current_user.user_id)

    # === Validation ===
    try:
        settlement_uuid = UUID(body.settlement_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid settlement_id",
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

    # Cache check: return cached results if no human edits
    has_edits = bool(
        db.exec(
            select(SupportingDocument).where(
                SupportingDocument.settlement_id == settlement_uuid,
                SupportingDocument.human_edited == True,
            )
        ).first()
    )

    cached_reims = db.exec(
        select(Reimbursement).where(Reimbursement.settlement_id == settlement_uuid)
    ).all()

    if not has_edits and cached_reims:
        logger.info("[API_ANALYZE] Returning %d cached reimbursements", len(cached_reims))
        results = [_build_reimbursement_response(r, db, include_line_items=True) for r in cached_reims]
        return {"reimbursements": results}

    user_id_str = str(current_user.user_id)
    settlement_currency = settlement.currency or "MYR"

    # === Create task and launch background processing ===
    tracker = ProgressTracker()
    task_id = tracker.create_task()
    logger.info("[API_ANALYZE] Created task_id=%s for background compliance", task_id)

    loop = asyncio.get_running_loop()

    def _process_background():
        from decimal import Decimal
        from collections import Counter
        logger.info("[API_ANALYZE_BG] Starting background compliance for task=%s", task_id)

        with Session(db_engine) as bg_db:
            try:
                # 1. Load settlement receipts (optionally filtered to submitted document_ids)
                receipts_q = select(SettlementReceipt).where(
                    SettlementReceipt.settlement_id == settlement_uuid
                )
                if body.document_ids:
                    receipts_q = receipts_q.where(
                        SettlementReceipt.document_id.in_([UUID(d) for d in body.document_ids])
                    )
                all_receipts = bg_db.exec(receipts_q).all()
                logger.info("[API_ANALYZE_BG] Loaded %d settlement receipts", len(all_receipts))

                if not all_receipts:
                    tracker.publish(task_id, "error", {"message": "No receipts found for this settlement"})
                    return

                # 2. Map each unique category → best active policy (latest effective_date)
                unique_categories = list({r.category for r in all_receipts if r.category})
                cat_to_policy_id: dict[str, Optional[str]] = {}
                for cat in unique_categories:
                    rows = bg_db.exec(
                        select(PolicyReimbursableCategory, Policy)
                        .join(Policy, PolicyReimbursableCategory.policy_id == Policy.policy_id)
                        .where(
                            PolicyReimbursableCategory.category == cat,
                            Policy.status == PolicyStatus.ACTIVE,
                        )
                        .order_by(Policy.effective_date.desc(), Policy.created_at.desc())
                    ).all()
                    cat_to_policy_id[cat] = str(rows[0][1].policy_id) if rows else None
                logger.info("[API_ANALYZE_BG] Category→policy map: %s", cat_to_policy_id)

                # 3. Group document_ids by resolved policy_id (None = unmatched)
                groups: dict[Optional[str], list[str]] = {}
                for receipt in all_receipts:
                    if not receipt.document_id:
                        continue
                    pid = cat_to_policy_id.get(receipt.category)
                    groups.setdefault(pid, []).append(str(receipt.document_id))

                matched_groups = [(pid, dids) for pid, dids in groups.items() if pid is not None]
                unmatched_doc_ids = groups.get(None, [])
                all_results: list[dict] = []

                def progress_callback(stage: str, data: dict):
                    logger.info("[API_ANALYZE_BG] task=%s stage=%s", task_id, stage)
                    tracker.publish(task_id, stage, data)

                # 4. Unmatched receipts → direct MANUAL_REVIEW (no agent)
                if unmatched_doc_ids:
                    logger.info("[API_ANALYZE_BG] Creating MANUAL_REVIEW for %d unmatched receipts", len(unmatched_doc_ids))
                    unmatched_reim = Reimbursement(
                        user_id=UUID(user_id_str),
                        policy_id=None,
                        settlement_id=settlement_uuid,
                        main_category="Uncategorized",
                        currency=settlement_currency,
                        total_claimed_amount=Decimal("0"),
                        judgment=JudgmentResult.NEEDS_INFO,
                        status=ReimbursementStatus.REVIEW,
                        summary="No matching active policy found for these receipts. Manual review required.",
                        ai_reasoning={"unmatched_documents": unmatched_doc_ids, "pipeline_failure": False},
                    )
                    bg_db.add(unmatched_reim)
                    bg_db.commit()
                    bg_db.refresh(unmatched_reim)
                    all_results.append(_build_reimbursement_response(unmatched_reim, bg_db, include_line_items=False))

                # 5. Run compliance agent once per matched policy group
                for i, (policy_id_str, doc_ids) in enumerate(matched_groups):
                    policy_obj = bg_db.get(Policy, UUID(policy_id_str))
                    policy_alias = policy_obj.title if policy_obj else policy_id_str

                    tracker.publish(task_id, "compliance_analysis", {
                        "message": f"Evaluating policy {i + 1} of {len(matched_groups)}: {policy_alias}...",
                        "policy_index": i + 1,
                        "policy_total": len(matched_groups),
                        "policy_alias": policy_alias,
                    })

                    group_receipts = [r for r in all_receipts if r.document_id and str(r.document_id) in doc_ids]
                    group_categories = list({r.category for r in group_receipts if r.category})
                    cat_counts = Counter(r.category for r in group_receipts if r.category)
                    group_main_category = cat_counts.most_common(1)[0][0] if cat_counts else "General"

                    logger.info("[API_ANALYZE_BG] Group %d/%d policy=%s docs=%d cats=%s", i + 1, len(matched_groups), policy_alias, len(doc_ids), group_categories)

                    try:
                        result = run_compliance_workflow(
                            settlement_id=body.settlement_id,
                            policy_id=policy_id_str,
                            main_category=group_main_category,
                            user_id=user_id_str,
                            all_category=group_categories,
                            session=bg_db,
                            document_ids=doc_ids,
                            is_auto_reimburse_enabled=body.is_auto_reimburse_enabled,
                            progress_callback=progress_callback,
                        )
                        reim_id = result.get("reimbursement_id")
                        if not reim_id:
                            raise ValueError("Compliance workflow returned no reimbursement_id")
                        reim = bg_db.get(Reimbursement, UUID(reim_id))
                        if not reim:
                            raise ValueError(f"Reimbursement {reim_id} not found in DB after creation")
                        all_results.append(_build_reimbursement_response(reim, bg_db, include_line_items=True))
                        logger.info("[API_ANALYZE_BG] Group %d complete: reim_id=%s judgment=%s status=%s", i + 1, reim_id, result.get("judgment"), reim.status)

                        # Auto-payout for high-confidence approvals (reviewed_by IS NULL = auto-processed)
                        if reim.status == ReimbursementStatus.APPROVED and reim.reviewed_by is None:
                            try:
                                initiate_payout_sync(reim.reim_id, bg_db, loop=loop)
                            except Exception:
                                logger.exception("[API_ANALYZE_BG] Auto-payout failed for reim=%s — claim stays APPROVED", reim_id)

                        # Notify employee of auto-reject
                        elif reim.status == ReimbursementStatus.REJECTED and reim.reviewed_by is None:
                            try:
                                notif = Notification(
                                    user_id=reim.user_id,
                                    type="error",
                                    title=f"Claim RC-{reim_id[:8]} automatically rejected",
                                    message=f"Your claim was automatically rejected by Reclaim AI. Reason: {(reim.summary or 'See claim details for more information.')[:200]}",
                                    link=f"/employee/history?id={reim_id}",
                                    is_read=False,
                                )
                                bg_db.add(notif)
                                bg_db.commit()
                            except Exception:
                                logger.exception("[API_ANALYZE_BG] Failed to send auto-reject notification for reim=%s", reim_id)
                    except Exception as group_err:
                        logger.exception("[API_ANALYZE_BG] Compliance failed for policy=%s", policy_alias)
                        try:
                            # Calculate total claimed from group receipts so fallback has meaningful amount
                            total_claimed = sum((float(r.claimed_amount) or 0) for r in group_receipts)

                            fail_reim = Reimbursement(
                                user_id=UUID(user_id_str),
                                policy_id=UUID(policy_id_str),
                                settlement_id=settlement_uuid,
                                main_category=group_main_category,
                                currency=settlement_currency,
                                total_claimed_amount=Decimal(str(total_claimed)),
                                judgment=JudgmentResult.NEEDS_INFO,
                                status=ReimbursementStatus.REVIEW,
                                summary=f"Compliance pipeline failed for '{policy_alias}' — manual review required. Error: {str(group_err)[:500]}",
                                ai_reasoning={"error": str(group_err), "pipeline_failure": True, "policy_id": policy_id_str},
                            )
                            bg_db.add(fail_reim)
                            bg_db.commit()
                            bg_db.refresh(fail_reim)
                            all_results.append(_build_reimbursement_response(fail_reim, bg_db, include_line_items=False))
                        except Exception as fallback_err:
                            logger.exception("[API_ANALYZE_BG] Fallback MANUAL_REVIEW failed: %s", fallback_err)

                logger.info("[API_ANALYZE_BG] Publishing complete with %d reimbursements", len(all_results))
                tracker.publish(task_id, "complete", {"reimbursements": all_results})

            except Exception as e:
                logger.exception("[API_ANALYZE_BG] Fatal error in background processing")
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
