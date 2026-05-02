from fastapi import APIRouter, Depends
from sqlmodel import Session

from api import deps, schemas
from core.models import User

router = APIRouter()


@router.get("/banking")
def get_banking(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    return {
        "bank_code": current_user.bank_code,
        "bank_account_number": current_user.bank_account_number,
        "bank_account_holder_name": current_user.bank_account_holder_name,
        "bank_name": None,
    }


@router.put("/banking")
def update_banking(
    body: schemas.BankingDetailsRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    current_user.bank_code = body.bank_code
    current_user.bank_account_number = body.bank_account_number
    current_user.bank_account_holder_name = body.bank_account_holder_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "bank_code": current_user.bank_code,
        "bank_account_number": current_user.bank_account_number,
        "bank_account_holder_name": current_user.bank_account_holder_name,
        "bank_name": None,
    }
