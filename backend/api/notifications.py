from fastapi import APIRouter, Depends
from api import deps
from core.models import User
from core.notification_store import get_glm_fallback_notification

router = APIRouter()


@router.get("/")
def get_notifications(_current_user: User = Depends(deps.get_current_user)):
    notifications = []
    fallback = get_glm_fallback_notification()
    if fallback:
        notifications.append(fallback)
    return notifications


@router.post("/read-all")
def mark_all_read(_current_user: User = Depends(deps.get_current_user)):
    return {"ok": True}
