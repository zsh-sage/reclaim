import os
import aiofiles
from pathlib import Path
from typing import List, Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session, select

from api import deps
from api.schemas import PolicyResponse
from core.models import User, Policy, PolicyReimbursableCategory, PolicySection
from core.enums import PolicyStatus, UserRole
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
    result = []
    for p in policies:
        # Fetch reimbursable categories from normalized table
        cats = db.exec(
            select(PolicyReimbursableCategory).where(
                PolicyReimbursableCategory.policy_id == p.policy_id
            )
        ).all()
        result.append({
            "policy_id": str(p.policy_id),
            "alias": p.alias,
            "title": p.title,
            "reimbursable_categories": [c.category for c in cats],
            "overview_summary": p.overview_summary,
            "mandatory_conditions": p.mandatory_conditions,
            "status": ((p.status.value if p.status and hasattr(p.status, "value") else p.status) if p.status and hasattr(p.status, "value") else p.status),
            "effective_date": p.effective_date.isoformat() if p.effective_date else None,
            "expiry_date": p.expiry_date.isoformat() if p.expiry_date else None,
            "source_file_url": p.source_file_url,
        })
    return result


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
        policy_id = run_policy_workflow(
            saved_paths, alias, db, user_id=str(current_user.user_id)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Policy workflow failed: {e}")

    policy = db.get(Policy, UUID(policy_id))
    if not policy:
        raise HTTPException(status_code=500, detail="Policy saved but could not be retrieved")

    # Fetch categories for response
    cats = db.exec(
        select(PolicyReimbursableCategory).where(
            PolicyReimbursableCategory.policy_id == policy.policy_id
        )
    ).all()

    return {
        "policy_id": str(policy.policy_id),
        "alias": policy.alias,
        "title": policy.title,
        "reimbursable_categories": [c.category for c in cats],
        "overview_summary": policy.overview_summary,
        "status": ((policy.status.value if policy.status and hasattr(policy.status, "value") else policy.status) if policy.status and hasattr(policy.status, "value") else policy.status),
    }


@router.get("/{policy_id}")
def get_policy(
    policy_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    try:
        p_uuid = UUID(policy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid policy_id")

    policy = db.get(Policy, p_uuid)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    cats = db.exec(
        select(PolicyReimbursableCategory).where(
            PolicyReimbursableCategory.policy_id == policy.policy_id
        )
    ).all()

    return {
        "policy_id": str(policy.policy_id),
        "alias": policy.alias,
        "title": policy.title,
        "reimbursable_categories": [c.category for c in cats],
        "overview_summary": policy.overview_summary,
        "mandatory_conditions": policy.mandatory_conditions,
        "status": ((policy.status.value if policy.status and hasattr(policy.status, "value") else policy.status) if policy.status and hasattr(policy.status, "value") else policy.status),
        "effective_date": policy.effective_date.isoformat() if policy.effective_date else None,
        "expiry_date": policy.expiry_date.isoformat() if policy.expiry_date else None,
        "source_file_url": policy.source_file_url,
        "created_by": str(policy.created_by) if policy.created_by else None,
        "created_at": policy.created_at.isoformat() if policy.created_at else None,
    }


@router.patch("/{policy_id}/deprecate")
def deprecate_policy(
    policy_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_hr_user),
) -> dict:
    """Set policy status to DEPRECATED and set expiry_date to now."""
    try:
        p_uuid = UUID(policy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid policy_id")

    policy = db.get(Policy, p_uuid)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    from datetime import datetime, timezone
    policy.status = PolicyStatus.DEPRECATED
    policy.expiry_date = datetime.now(timezone.utc)
    db.add(policy)
    db.commit()
    db.refresh(policy)

    return {
        "policy_id": str(policy.policy_id),
        "status": (policy.status.value if policy.status and hasattr(policy.status, "value") else policy.status),
        "expiry_date": policy.expiry_date.isoformat() if policy.expiry_date else None,
    }


@router.delete("/{policy_id}")
def delete_policy(
    policy_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_hr_user),
) -> dict:
    """Delete a policy and its associated data. HR only."""
    try:
        p_uuid = UUID(policy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid policy_id")

    policy = db.get(Policy, p_uuid)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Delete associated reimbursable categories (no cascade configured)
    cats = db.exec(
        select(PolicyReimbursableCategory).where(
            PolicyReimbursableCategory.policy_id == policy.policy_id
        )
    ).all()
    for cat in cats:
        db.delete(cat)

    # Delete associated policy sections (no cascade configured)
    sections = db.exec(
        select(PolicySection).where(PolicySection.policy_id == policy.policy_id)
    ).all()
    for section in sections:
        db.delete(section)

    # Null out policy_id on any reimbursements referencing this policy
    # (FK constraint prevents delete while references exist)
    from core.models import Reimbursement
    reims = db.exec(
        select(Reimbursement).where(Reimbursement.policy_id == policy.policy_id)
    ).all()
    for reim in reims:
        reim.policy_id = None
        db.add(reim)
    db.flush()

    # Delete associated file from disk if it exists inside the policies storage dir
    if policy.source_file_url:
        try:
            file_path = Path(policy.source_file_url).resolve()
            policies_dir = STORAGE_POLICIES_DIR.resolve()
            if file_path.exists() and str(file_path).startswith(str(policies_dir)):
                file_path.unlink()
        except Exception:
            pass  # Best-effort deletion; don't fail the request if file removal fails

    db.delete(policy)
    db.commit()

    return {"policy_id": str(policy.policy_id), "deleted": True}
