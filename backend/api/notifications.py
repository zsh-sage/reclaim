from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from api import deps
from api.schemas import NotificationResponse
from core.models import User, Notification
from core.notification_store import get_glm_fallback_notification, get_embedding_failure_notification

router = APIRouter()

# Stable sentinel UUID for the in-memory GLM fallback notification (not persisted)
_FALLBACK_UUID = UUID("00000000-0000-0000-0000-000000000fa1")


def _fallback_as_response(fallback: dict, user_id: UUID) -> dict:
    """Translate the in-memory GLM fallback dict into the NotificationResponse shape."""
    return {
        "notification_id": _FALLBACK_UUID,
        "user_id": user_id,
        "type": fallback.get("type", "warning"),
        "title": fallback.get("title", ""),
        "message": fallback.get("message", ""),
        "link": None,
        "is_read": bool(fallback.get("isRead", False)),
        "created_at": (
            datetime.fromisoformat(fallback["timestamp"])
            if fallback.get("timestamp")
            else datetime.utcnow()
        ),
    }


@router.get("/")
def get_notifications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    db_notifications: list = list(db.exec(stmt).all())

    ephemeral = []
    for getter in (get_glm_fallback_notification, get_embedding_failure_notification):
        n = getter()
        if n:
            ephemeral.append(_fallback_as_response(n, current_user.user_id))
    return [*ephemeral, *db_notifications]


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    stmt = select(func.count()).where(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False,
    )
    count = db.exec(stmt).one()
    for getter in (get_glm_fallback_notification, get_embedding_failure_notification):
        if getter():
            count += 1
    return {"count": count}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    stmt = select(Notification).where(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False,
    )
    notifications = db.exec(stmt).all()
    for n in notifications:
        n.is_read = True
    db.add_all(notifications)
    db.commit()
    return {"ok": True}


@router.post("/{notification_id}/read")
def mark_one_read(
    notification_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    try:
        nid = UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification_id")

    if nid == _FALLBACK_UUID:
        # Fallback is ephemeral and resolves automatically after the TTL — no-op.
        return {"ok": True}

    notif = db.get(Notification, nid)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    notif.is_read = True
    db.add(notif)
    db.commit()
    return {"ok": True}
