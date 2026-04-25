from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from api import deps
from api.schemas import DepartmentCreate, DepartmentResponse
from core.models import Department
from core.enums import UserRole

router = APIRouter()


@router.post("/", response_model=DepartmentResponse)
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_hr_user),
) -> Department:
    """Create a new department. HR only."""
    existing = db.exec(select(Department).where(Department.name == data.name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department '{data.name}' already exists",
        )

    dept = Department(name=data.name, cost_center_code=data.cost_center_code)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.get("/", response_model=List[DepartmentResponse])
def list_departments(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
) -> List[Department]:
    return db.exec(select(Department)).all()


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: str,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
) -> Department:
    try:
        dept_uuid = UUID(department_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department_id")

    dept = db.get(Department, dept_uuid)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return dept
