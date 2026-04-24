from datetime import timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlmodel import Session, select

from core import security
from core.config import settings
from core.models import User
from api import schemas, deps

router = APIRouter()


class UpdateProfileRequest(BaseModel):
    name: str
    email: str
    department: Optional[str] = None

@router.post("/login", response_model=schemas.Token)
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    statement = select(User).where(User.email == form_data.username)
    user = db.exec(statement).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
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
def register_user(
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
    
    user_obj = User(
        email=user_in.email,
        user_code=user_in.user_code or None,
        hashed_password=security.get_password_hash(user_in.password),
        name=user_in.name,
        role=user_in.role,
        department=user_in.department,
        privilege_level=user_in.privilege_level,
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    return user_obj

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get current user.
    """
    return current_user


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
    if body.department is not None:
        current_user.department = body.department

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    u = current_user
    return {
        "user_id": str(u.user_id),
        "user_code": u.user_code,
        "email": u.email,
        "name": u.name,
        "role": u.role,
        "department": u.department,
        "rank": u.rank,
        "privilege_level": u.privilege_level,
    }