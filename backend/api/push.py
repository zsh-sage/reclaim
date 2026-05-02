import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from api import deps
from core.models import User, PushSubscription
from core.push_service import init_vapid_keys, get_vapid_public_key, fire_and_forget_push

router = APIRouter()
logger = logging.getLogger(__name__)


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    expirationTime: float | None = None
    keys: dict = {}


@router.get("/vapid-public-key")
async def vapid_public_key_endpoint():
    """Return the VAPID public key for frontend push subscription setup."""
    init_vapid_keys()
    return {"public_key": get_vapid_public_key()}


@router.post("/subscribe")
async def subscribe_push(
    body: PushSubscriptionRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Upsert push subscription for the authenticated user."""
    p256dh = body.keys.get("p256dh", "")
    auth = body.keys.get("auth", "")

    if not body.endpoint or not p256dh or not auth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required push subscription fields: endpoint, keys.p256dh, keys.auth",
        )

    # Upsert: update if same endpoint exists, otherwise insert
    existing = db.exec(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.user_id,
            PushSubscription.endpoint == body.endpoint,
        )
    ).first()

    if existing:
        existing.p256dh = p256dh
        existing.auth = auth
        db.add(existing)
        db.commit()
        logger.info("[PUSH] Updated subscription for user=%s", current_user.user_id)
    else:
        sub = PushSubscription(
            user_id=current_user.user_id,
            endpoint=body.endpoint,
            p256dh=p256dh,
            auth=auth,
        )
        db.add(sub)
        db.commit()
        logger.info("[PUSH] Created subscription for user=%s", current_user.user_id)

    # Send welcome push so user gets immediate feedback
    fire_and_forget_push(
        current_user.user_id,
        "You're all set!",
        "You'll now receive push notifications for claim updates.",
        link="/employee/dashboard",
    )

    return {"status": "ok"}


@router.delete("/unsubscribe")
async def unsubscribe_push(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Remove ALL push subscriptions for the current user."""
    subs = db.exec(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.user_id
        )
    ).all()

    for sub in subs:
        db.delete(sub)
    db.commit()

    logger.info("[PUSH] Removed %d subscriptions for user=%s", len(subs), current_user.user_id)
    return {"status": "ok", "removed": len(subs)}
