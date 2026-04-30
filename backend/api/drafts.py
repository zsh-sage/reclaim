import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func

from api import deps
from api.schemas import (
    ClaimDraftCreate,
    ClaimDraftUpdate,
    ClaimDraftSummary,
    ClaimDraftFull,
)
from core.models import User, ClaimDraft

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/count")
def get_draft_count(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """Return the number of drafts for the current user (used by sidebar badge)."""
    count = db.exec(
        select(func.count(ClaimDraft.draft_id)).where(
            ClaimDraft.user_id == current_user.user_id
        )
    ).one()
    return {"count": count}


@router.get("/", response_model=List[ClaimDraftSummary])
def list_drafts(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[ClaimDraftSummary]:
    """List all drafts for the current user (lightweight — no draft_data)."""
    drafts = db.exec(
        select(ClaimDraft)
        .where(ClaimDraft.user_id == current_user.user_id)
        .order_by(ClaimDraft.updated_at.desc())
    ).all()
    return [
        ClaimDraftSummary(
            draft_id=d.draft_id,
            user_id=d.user_id,
            title=d.title,
            main_category=d.main_category,
            receipt_count=d.receipt_count,
            failed_receipt_count=d.failed_receipt_count,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in drafts
    ]


@router.get("/{draft_id}", response_model=ClaimDraftFull)
def get_draft(
    draft_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> ClaimDraftFull:
    """Load a specific draft with full data (for resuming a claim)."""
    try:
        draft_uuid = UUID(draft_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid draft_id: {draft_id}",
        )

    draft = db.get(ClaimDraft, draft_uuid)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found"
        )

    if draft.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    return ClaimDraftFull(
        draft_id=draft.draft_id,
        user_id=draft.user_id,
        title=draft.title,
        main_category=draft.main_category,
        settlement_id=draft.settlement_id,
        draft_data=draft.draft_data,
        receipt_count=draft.receipt_count,
        failed_receipt_count=draft.failed_receipt_count,
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )


@router.post("/", response_model=ClaimDraftFull, status_code=status.HTTP_201_CREATED)
def create_draft(
    body: ClaimDraftCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> ClaimDraftFull:
    """Save a new claim draft."""
    settlement_uuid = None
    if body.settlement_id:
        try:
            settlement_uuid = UUID(body.settlement_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid settlement_id: {body.settlement_id}",
            )

    draft = ClaimDraft(
        user_id=current_user.user_id,
        title=body.title,
        main_category=body.main_category,
        settlement_id=settlement_uuid,
        draft_data=body.draft_data,
        receipt_count=body.receipt_count,
        failed_receipt_count=body.failed_receipt_count,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    logger.info(
        "[DRAFTS] Created draft_id=%s for user=%s (%d receipts, %d failed)",
        draft.draft_id,
        current_user.user_id,
        draft.receipt_count,
        draft.failed_receipt_count,
    )

    return ClaimDraftFull(
        draft_id=draft.draft_id,
        user_id=draft.user_id,
        title=draft.title,
        main_category=draft.main_category,
        settlement_id=draft.settlement_id,
        draft_data=draft.draft_data,
        receipt_count=draft.receipt_count,
        failed_receipt_count=draft.failed_receipt_count,
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )


@router.put("/{draft_id}", response_model=ClaimDraftFull)
def update_draft(
    draft_id: str,
    body: ClaimDraftUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> ClaimDraftFull:
    """Update an existing draft."""
    try:
        draft_uuid = UUID(draft_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid draft_id: {draft_id}",
        )

    draft = db.get(ClaimDraft, draft_uuid)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found"
        )

    if draft.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    if body.title is not None:
        draft.title = body.title
    if body.main_category is not None:
        draft.main_category = body.main_category
    if body.settlement_id is not None:
        try:
            draft.settlement_id = UUID(body.settlement_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid settlement_id: {body.settlement_id}",
            )
    if body.draft_data is not None:
        draft.draft_data = body.draft_data
    if body.receipt_count is not None:
        draft.receipt_count = body.receipt_count
    if body.failed_receipt_count is not None:
        draft.failed_receipt_count = body.failed_receipt_count

    draft.updated_at = datetime.now(timezone.utc)
    db.add(draft)
    db.commit()
    db.refresh(draft)

    logger.info("[DRAFTS] Updated draft_id=%s", draft.draft_id)

    return ClaimDraftFull(
        draft_id=draft.draft_id,
        user_id=draft.user_id,
        title=draft.title,
        main_category=draft.main_category,
        settlement_id=draft.settlement_id,
        draft_data=draft.draft_data,
        receipt_count=draft.receipt_count,
        failed_receipt_count=draft.failed_receipt_count,
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )


@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_draft(
    draft_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> None:
    """Delete a draft."""
    try:
        draft_uuid = UUID(draft_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid draft_id: {draft_id}",
        )

    draft = db.get(ClaimDraft, draft_uuid)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found"
        )

    if draft.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    db.delete(draft)
    db.commit()

    logger.info("[DRAFTS] Deleted draft_id=%s", draft_uuid)
