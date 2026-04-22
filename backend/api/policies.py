import os
import aiofiles
from pathlib import Path
from typing import List, Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session, select

from api import deps
from core.models import User, Policy
from engine.agents.policy_agent import run_policy_workflow

router = APIRouter()

STORAGE_POLICIES_DIR = Path(__file__).parent.parent / "storage" / "policies"


@router.get("/health")
def health():
    return {"status": "ok", "workflow": "policy_upload"}


@router.get("/")
def list_policies(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[dict]:
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
        }
        for p in policies
    ]


@router.post("/upload")
async def upload_policy(
    alias: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_hr_user),
) -> dict:
    """Upload one or more policy PDFs. HR only."""
    STORAGE_POLICIES_DIR.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only PDF files are accepted. Got: {file.filename}",
            )
        dest = STORAGE_POLICIES_DIR / file.filename
        async with aiofiles.open(dest, "wb") as out:
            content = await file.read()
            await out.write(content)
        saved_paths.append(str(dest))

    try:
        policy_id = run_policy_workflow(saved_paths, alias, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Policy workflow failed: {e}")

    policy = db.get(Policy, UUID(policy_id))
    if not policy:
        raise HTTPException(status_code=500, detail="Policy saved but could not be retrieved")

    return {
        "policy_id": str(policy.policy_id),
        "alias": policy.alias,
        "title": policy.title,
        "reimbursable_category": policy.reimbursable_category,
        "overview_summary": policy.overview_summary,
        "status": policy.status,
    }
