from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from core.models import UserRole

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.Employee
    department: Optional[str] = None
    privilege_level: Optional[str] = None
    rank: Optional[int] = Field(default=1, ge=1)

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    user_id: UUID

    class Config:
        from_attributes = True

# Additional properties to return via API
class UserResponse(UserInDBBase):
    pass

# Additional properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
