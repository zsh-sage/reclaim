from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from api import deps
from core.models import User, Reimbursement, SupportingDocument, UserRole
from engine.agents.compliance_agent import run_compliance_workflow

router = APIRouter()


class AnalyzeReimbursementRequest(BaseModel):
    document_ids: List[str]
    policy_id: str
    main_category: str
    sub_category: str


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
            "main_category": r.main_category,
            "sub_category": r.sub_category,
            "currency": r.currency,
            "amount": float(r.amount),
            "judgment": r.judgment,
            "status": r.status,
            "summary": r.summary,
            "chain_of_thought": r.chain_of_thought,
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
    """Run compliance analysis on uploaded documents against a policy."""
    # Validate all document_ids belong to current user
    for doc_id_str in request.document_ids:
        try:
            doc_uuid = UUID(doc_id_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid document_id: {doc_id_str}",
            )
        doc = db.get(SupportingDocument, doc_uuid)
        if not doc or doc.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Document {doc_id_str} not found or does not belong to you",
            )

    try:
        result = run_compliance_workflow(
            document_ids=request.document_ids,
            policy_id=request.policy_id,
            main_category=request.main_category,
            sub_category=request.sub_category,
            user_id=str(current_user.user_id),
            session=db,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compliance workflow failed: {e}")

    # Fetch and return the full reimbursement row
    if result.get("reimbursement_id"):
        reim = db.get(Reimbursement, UUID(result["reimbursement_id"]))
        if reim:
            return {
                "reim_id": str(reim.reim_id),
                "judgment": reim.judgment,
                "status": reim.status,
                "summary": reim.summary,
                "chain_of_thought": reim.chain_of_thought,
                "amount": float(reim.amount),
                "currency": reim.currency,
                "main_category": reim.main_category,
                "sub_category": reim.sub_category,
                "created_at": reim.created_at.isoformat() if reim.created_at else None,
            }

    return result
