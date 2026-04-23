from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from api import deps
from core.models import User, Reimbursement, SupportingDocument, UserRole, TravelSettlement
from engine.agents.compliance_agent import run_compliance_workflow

router = APIRouter()


class AnalyzeReimbursementRequest(BaseModel):
    settlement_id: str              # required — from Workflow 2 upload response
    policy_id: str
    main_category: str
    sub_category: str
    all_category: Optional[List[str]] = None
    # document_ids is accepted but optional; the basket is sourced from the settlement
    document_ids: Optional[List[str]] = None


@router.get("/health")
def health():
    return {"status": "ok", "workflow": "compliance_analysis"}


@router.get("/")
def list_reimbursements(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[dict]:
    if current_user.role == UserRole.HR:
        stmt = select(Reimbursement)
    else:
        stmt = select(Reimbursement).where(Reimbursement.user_id == current_user.user_id)

    reimbursements = db.exec(stmt).all()
    return [
        {
            "reim_id": str(r.reim_id),
            "user_id": str(r.user_id),
            "policy_id": str(r.policy_id) if r.policy_id else None,
            "settlement_id": str(r.settlement_id) if r.settlement_id else None,
            "main_category": r.main_category,
            "sub_category": r.sub_category,
            "currency": r.currency,
            "totals": r.totals,
            "line_items": r.line_items,
            "confidence": r.confidence,
            "judgment": r.judgment,
            "status": r.status,
            "summary": r.summary,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reimbursements
    ]


@router.post("/analyze")
def analyze_reimbursement(
    request: AnalyzeReimbursementRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """Run basket compliance analysis on a TravelSettlement against a policy."""
    try:
        settlement_uuid = UUID(request.settlement_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid settlement_id: {request.settlement_id}",
        )

    settlement = db.get(TravelSettlement, settlement_uuid)
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Settlement {request.settlement_id} not found",
        )

    # Cache check: return cached result if no human edits and settlement was already evaluated
    has_edits = bool(
        db.exec(
            select(SupportingDocument).where(
                SupportingDocument.settlement_id == settlement_uuid,
                SupportingDocument.human_edited == True,  # noqa: E712
            )
        ).first()
    )

    if not has_edits and settlement.reimbursement_id:
        cached = db.get(Reimbursement, settlement.reimbursement_id)
        if cached:
            return {
                "reim_id": str(cached.reim_id),
                "settlement_id": str(cached.settlement_id) if cached.settlement_id else None,
                "judgment": cached.judgment,
                "status": cached.status,
                "summary": cached.summary,
                "line_items": cached.line_items,
                "totals": cached.totals,
                "confidence": cached.confidence,
                "currency": cached.currency,
                "main_category": cached.main_category,
                "sub_category": cached.sub_category,
                "created_at": cached.created_at.isoformat() if cached.created_at else None,
                "cached": True,
                "message": "Using cached result (no human edits detected)",
            }

    all_category = request.all_category
    if not all_category:
        all_category = settlement.all_category or []
    if not all_category:
        all_category = [request.main_category] if request.main_category else []

    try:
        result = run_compliance_workflow(
            settlement_id=request.settlement_id,
            policy_id=request.policy_id,
            main_category=request.main_category,
            sub_category=request.sub_category,
            user_id=str(current_user.user_id),
            all_category=all_category,
            session=db,
            document_ids=request.document_ids,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compliance workflow failed: {e}")

    if result.get("reimbursement_id"):
        reim = db.get(Reimbursement, UUID(result["reimbursement_id"]))
        if reim:
            return {
                "reim_id": str(reim.reim_id),
                "settlement_id": str(reim.settlement_id) if reim.settlement_id else None,
                "judgment": reim.judgment,
                "status": reim.status,
                "summary": reim.summary,
                "line_items": reim.line_items,
                "totals": reim.totals,
                "confidence": reim.confidence,
                "currency": reim.currency,
                "main_category": reim.main_category,
                "sub_category": reim.sub_category,
                "created_at": reim.created_at.isoformat() if reim.created_at else None,
                "cached": False,
                "message": "Re-evaluated due to human edits" if has_edits else "First-time evaluation",
            }

    return {**result, "cached": False, "message": "First-time evaluation"}
