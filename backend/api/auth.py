import logging
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from starlette.requests import Request
from sqlmodel import Session, select

from core import security
from core.config import settings
from core.models import User
from core.enums import UserRole, PrivilegeLevel
from api import schemas, deps
from api.schemas import UpdateProfileRequest
from api.rate_limit import limiter

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login_access_token(
    request: Request,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    statement = select(User).where(User.email == form_data.username)
    user = db.exec(statement).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        logging.warning(f"Login failed: Invalid credentials for email {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.email, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.post("/register", response_model=schemas.UserResponse)
@limiter.limit("10/minute")
def register_user(
    request: Request,
    user_in: schemas.UserCreate,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Register a new user.
    """
    statement = select(User).where(User.email == user_in.email)
    user = db.exec(statement).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )
    
    # Handle department_id string -> UUID conversion
    department_id = None
    if user_in.department_id:
        from uuid import UUID
        department_id = UUID(str(user_in.department_id)) if user_in.department_id else None

    user_obj = User(
        email=user_in.email,
        user_code=user_in.user_code or None,
        hashed_password=security.get_password_hash(user_in.password),
        name=user_in.name,
        role=user_in.role,
        # role=UserRole.Employee,  # Production code
        department_id=department_id,
        rank=user_in.rank,
        privilege_level=user_in.privilege_level,
        is_active=True,
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)

    return {
        "user_id": str(user_obj.user_id),
        "user_code": user_obj.user_code,
        "email": user_obj.email,
        "name": user_obj.name,
        "role": user_obj.role.value if user_obj.role and hasattr(user_obj.role, "value") else user_obj.role,
        "department_id": str(user_obj.department_id) if user_obj.department_id else None,
        "privilege_level": user_obj.privilege_level.value if user_obj.privilege_level and hasattr(user_obj.privilege_level, "value") else user_obj.privilege_level,
        "rank": user_obj.rank,
        "is_active": user_obj.is_active,
        "created_at": user_obj.created_at.isoformat() if user_obj.created_at else None,
    }

@router.get("/me")
def read_users_me(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get current user, including department name.
    """
    dept_name = None
    if current_user.department_id:
        from core.models import Department
        dept = db.get(Department, current_user.department_id)
        if dept:
            dept_name = dept.name

    return {
        "user_id": str(current_user.user_id),
        "user_code": current_user.user_code,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role.value if current_user.role and hasattr(current_user.role, "value") else current_user.role,
        "department_id": str(current_user.department_id) if current_user.department_id else None,
        "department_name": dept_name,
        "rank": current_user.rank,
        "privilege_level": current_user.privilege_level.value if current_user.privilege_level and hasattr(current_user.privilege_level, "value") else current_user.privilege_level,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


@router.put("/me")
def update_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """Update current user's profile."""
    # Check email uniqueness if it changed
    if body.email != current_user.email:
        existing = db.exec(select(User).where(User.email == body.email)).first()
        if existing and existing.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already in use by another account.",
            )

    current_user.name = body.name
    current_user.email = body.email
    if body.department_id is not None:
        from uuid import UUID
        current_user.department_id = UUID(str(body.department_id)) if body.department_id else None

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    u = current_user
    return {
        "user_id": str(u.user_id),
        "user_code": u.user_code,
        "email": u.email,
        "name": u.name,
        "role": u.role.value if u.role and hasattr(u.role, "value") else u.role,
        "department_id": str(u.department_id) if u.department_id else None,
        "rank": u.rank,
        "privilege_level": u.privilege_level.value if u.privilege_level and hasattr(u.privilege_level, "value") else u.privilege_level,
        "is_active": u.is_active,
    }
