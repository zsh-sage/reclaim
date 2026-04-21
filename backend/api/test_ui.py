# DISPOSABLE — Remove before production
from pathlib import Path
from typing import Any, List

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select

from api import deps
from core.models import User, Policy, SupportingDocument, Reimbursement, PolicySection

router = APIRouter()

TEST_HTML_PATH = Path(__file__).parent.parent / "test" / "database_looking.html"


@router.get("/", response_class=HTMLResponse)
def serve_ui():
    """Serve the DB viewer HTML page."""
    if TEST_HTML_PATH.exists():
        return TEST_HTML_PATH.read_text(encoding="utf-8")
    return "<h1>Test UI not found. Create backend/test/index.html</h1>"


@router.get("/db/employees")
def get_employees(db: Session = Depends(deps.get_db)) -> List[dict]:
    users = db.exec(select(User)).all()
    return [
        {
            "user_id": str(u.user_id),
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "department": u.department,
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
            "main_category": r.main_category,
            "sub_category": r.sub_category,
            "judgment": r.judgment,
            "status": r.status,
            "amount": float(r.amount),
            "currency": r.currency,
            "summary": r.summary,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reims
    ]


@router.get("/db/policy_sections")
def get_policy_sections(db: Session = Depends(deps.get_db)) -> List[dict]:
    # Limit to 50 rows, omit embedding (too large)
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
