import os
import aiofiles
from pathlib import Path
from typing import List, Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from starlette.requests import Request
from sqlmodel import Session, select

from api import deps
from api.rate_limit import limiter
from api.schemas import PolicyResponse, PolicyCategoryWithBudget, PolicyCategoriesUpdateRequest
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
) -> List[PolicyResponse]:
    policies = db.exec(select(Policy)).all()

    # Use helper to get policies with budgets
    policies_with_budgets = []
    for policy in policies:
        policy_response = _get_policy_with_categories(policy.policy_id, db)
        policies_with_budgets.append(policy_response)

    return policies_with_budgets


@router.post("/upload")
@limiter.limit("3/minute")
async def upload_policy(
    request: Request,
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
        safe_name = Path(file.filename).name
        dest = STORAGE_POLICIES_DIR / safe_name
        if not str(dest.resolve()).startswith(str(STORAGE_POLICIES_DIR.resolve())):
            raise HTTPException(status_code=400, detail=f"Invalid filename: {file.filename}")
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
) -> PolicyResponse:
    try:
        p_uuid = UUID(policy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid policy_id")

    return _get_policy_with_categories(p_uuid, db)


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


@router.patch("/{policy_id}/categories")
def update_policy_categories(
    policy_id: str,
    request: PolicyCategoriesUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_hr_user),
) -> PolicyResponse:
    """
    Update auto-approval budgets for policy categories.
    Only HR users can update category budgets.
    """
    try:
        p_uuid = UUID(policy_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid policy_id")

    # Fetch policy
    policy = db.get(Policy, p_uuid)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Delete existing categories
    from sqlalchemy import delete
    db.exec(
        delete(PolicyReimbursableCategory).where(
            PolicyReimbursableCategory.policy_id == policy.policy_id
        )
    )

    # Insert updated categories with budgets
    for cat_data in request.categories:
        new_cat = PolicyReimbursableCategory(
            policy_id=policy.policy_id,
            category=cat_data.category,
            auto_approval_budget=cat_data.auto_approval_budget,
        )
        db.add(new_cat)

    db.commit()

    # Fetch and return updated policy
    return _get_policy_with_categories(policy.policy_id, db)


def _get_policy_with_categories(policy_id: UUID, db: Session) -> PolicyResponse:
    """Helper to fetch policy with category budgets."""
    policy = db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Fetch categories with budgets
    cats = db.exec(
        select(PolicyReimbursableCategory).where(
            PolicyReimbursableCategory.policy_id == policy_id
        )
    ).all()

    categories_with_budgets = [
        PolicyCategoryWithBudget(
            category=c.category,
            auto_approval_budget=float(c.auto_approval_budget) if c.auto_approval_budget else None
        )
        for c in cats
    ]

    return PolicyResponse(
        policy_id=policy.policy_id,
        alias=policy.alias,
        title=policy.title,
        effective_date=policy.effective_date,
        expiry_date=policy.expiry_date,
        overview_summary=policy.overview_summary,
        mandatory_conditions=policy.mandatory_conditions,
        source_file_url=policy.source_file_url,
        reimbursable_categories=[c.category for c in categories_with_budgets],
        reimbursable_categories_with_budgets=categories_with_budgets,
        status=policy.status,
        created_by=policy.created_by,
        created_at=policy.created_at,
    )
