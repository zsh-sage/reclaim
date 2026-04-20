import enum
from sqlalchemy import Column, Integer, String, Enum
from core.database import Base

class UserRole(str, enum.Enum):
    HR = "HR"
    Employee = "Employee"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(UserRole), default=UserRole.Employee, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, nullable=True)
    privilege_level = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
