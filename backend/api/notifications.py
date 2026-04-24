from fastapi import APIRouter, Depends
from api import deps
from core.models import User

router = APIRouter()


@router.get("/")
def get_notifications(current_user: User = Depends(deps.get_current_user)):
    return []


@router.post("/read-all")
def mark_all_read(current_user: User = Depends(deps.get_current_user)):
    return {"ok": True}
