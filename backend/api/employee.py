from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from api import deps, schemas
from core.models import User, Department

router = APIRouter()


@router.get("/")
def list_employees(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_hr_user),
) -> List[dict]:
    """Return all employees with department names. HR only."""
    users = db.exec(select(User)).all()

    dept_ids = {u.department_id for u in users if u.department_id}
    depts = db.exec(select(Department).where(Department.department_id.in_(dept_ids))).all() if dept_ids else []
    dept_map = {d.department_id: d.name for d in depts}

    return [
        {
            "user_id": str(u.user_id),
            "user_code": u.user_code,
            "name": u.name,
            "email": u.email,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "department_id": str(u.department_id) if u.department_id else None,
            "department_name": dept_map.get(u.department_id) if u.department_id else None,
            "rank": u.rank,
            "privilege_level": u.privilege_level.value if hasattr(u.privilege_level, "value") else u.privilege_level,
            "is_active": u.is_active,
            "bank_code": u.bank_code,
            "bank_account_number": u.bank_account_number,
            "bank_account_holder_name": u.bank_account_holder_name,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


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
