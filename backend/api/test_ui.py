# DISPOSABLE — Remove before production
from pathlib import Path
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select

from api import deps
from core.models import User, Policy, SupportingDocument, Reimbursement, PolicySection, TravelSettlement

router = APIRouter()

TEST_HTML_PATH = Path(__file__).parent.parent / "test" / "database_looking.html"
DEMO_HTML_PATH = Path(__file__).parent.parent / "test" / "demo.html"


@router.get("/", response_class=HTMLResponse)
def serve_ui():
    """Serve the DB viewer HTML page."""
    if TEST_HTML_PATH.exists():
        return TEST_HTML_PATH.read_text(encoding="utf-8")
    raise HTTPException(status_code=404, detail="Test UI not found. Create backend/test/database_looking.html")


@router.get("/demo", response_class=HTMLResponse)
def serve_demo():
    """Serve the interactive agent workflow demo page."""
    if DEMO_HTML_PATH.exists():
        return DEMO_HTML_PATH.read_text(encoding="utf-8")
    raise HTTPException(status_code=404, detail="Demo not found. Create backend/test/demo.html")


@router.get("/db/employees")
def get_employees(db: Session = Depends(deps.get_db)) -> List[dict]:
    users = db.exec(select(User)).all()
    return [
        {
            "user_id": str(u.user_id),
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "department": str(u.department_id) if u.department_id else None,
            "rank": u.rank,
            "privilege_level": u.privilege_level,
        }
        for u in users
    ]


@router.get("/db/policies")
def get_policies(db: Session = Depends(deps.get_db)) -> List[dict]:
    policies = db.exec(select(Policy)).all()
    return [
        {
            "policy_id": str(p.policy_id),
            "alias": p.alias,
            "title": p.title,
            "reimbursable_category": p.reimbursable_category,
            "overview_summary": p.overview_summary,
            "status": p.status,
            "effective_date": p.effective_date.isoformat() if p.effective_date else None,
            "source_file_url": p.source_file_url,
            "mandatory_conditions": p.mandatory_conditions,
        }
        for p in policies
    ]


@router.get("/db/documents")
def get_documents(db: Session = Depends(deps.get_db)) -> List[dict]:
    docs = db.exec(select(SupportingDocument)).all()
    return [
        {
            "document_id": str(d.document_id),
            "reim_id": str(d.reim_id) if d.reim_id else None,
            "user_id": str(d.user_id),
            "name": d.name,
            "path": d.path,
            "type": d.type,
            "is_main": d.is_main,
            "document_class": d.document_class,
            "extracted_data": d.extracted_data,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@router.get("/db/reimbursements")
def get_reimbursements(db: Session = Depends(deps.get_db)) -> List[dict]:
    reims = db.exec(select(Reimbursement)).all()
    return [
        {
            "reim_id": str(r.reim_id),
            "user_id": str(r.user_id),
            "policy_id": str(r.policy_id) if r.policy_id else None,
            "settlement_id": str(r.settlement_id) if r.settlement_id else None,
            "main_category": r.main_category,
            "sub_category": r.sub_category,
            "judgment": r.judgment,
            "status": r.status,
            "totals": r.totals,
            "line_items_count": len(r.line_items) if r.line_items else 0,
            "currency": r.currency,
            "confidence": r.confidence,
            "summary": r.summary,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reims
    ]


@router.get("/db/settlements")
def get_settlements(db: Session = Depends(deps.get_db)) -> List[dict]:
    settlements = db.exec(select(TravelSettlement)).all()
    return [
        {
            "settlement_id": str(s.settlement_id),
            "reimbursement_id": str(s.reimbursement_id) if s.reimbursement_id else None,
            "main_category": s.main_category,
            "all_category": s.all_category,
            "employee_name": s.employee_name,
            "employee_department": s.employee_department,
            "currency": s.currency,
            "grand_total": s.totals.get("grand_total") if s.totals else None,
            "receipt_count": len(s.receipts) if s.receipts else 0,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in settlements
    ]


@router.get("/db/policy_sections")
def get_policy_sections(db: Session = Depends(deps.get_db)) -> List[dict]:
    sections = db.exec(select(PolicySection).limit(50)).all()
    return [
        {
            "section_id": str(s.section_id),
            "policy_id": str(s.policy_id),
            "content": s.content[:500] + "..." if len(s.content) > 500 else s.content,
            "metadata_data": s.metadata_data,
        }
        for s in sections
    ]
