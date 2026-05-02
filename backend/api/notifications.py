from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from api import deps
from api.schemas import NotificationResponse
from core.models import User, Notification

router = APIRouter()


@router.get("/", response_model=list[NotificationResponse])
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
    return db.exec(stmt).all()


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

    notif = db.get(Notification, nid)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    notif.is_read = True
    db.add(notif)
    db.commit()
    return {"ok": True}
