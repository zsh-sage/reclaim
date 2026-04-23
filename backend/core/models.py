from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timezone
from decimal import Decimal
import enum

from sqlmodel import Field, SQLModel, Column, String, Text, Integer, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Numeric

class UserRole(str, enum.Enum):
    HR = "HR"
    Employee = "Employee"

# --- 1. employees (merged with User for auth) ---
class User(SQLModel, table=True):
    __tablename__ = "employees"

    user_id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(sa_column=Column(String, unique=True, index=True, nullable=False))
    hashed_password: str = Field(sa_column=Column(String, nullable=False))
    name: str = Field(sa_column=Column(String, nullable=False))
    role: UserRole = Field(default=UserRole.Employee, sa_column=Column(String, nullable=False))
    department: Optional[str] = Field(default=None, sa_column=Column(String))
    rank: Optional[int] = Field(default=1, sa_column=Column(Integer))
    privilege_level: Optional[str] = Field(default="Standard", sa_column=Column(String))


# --- 2. policies ---
class Policy(SQLModel, table=True):
    __tablename__ = "policies"

    policy_id: UUID = Field(default_factory=uuid4, primary_key=True)
    alias: str = Field(sa_column=Column(String))
    title: str = Field(sa_column=Column(String))
    reimbursable_category: List[str] = Field(default=[], sa_column=Column(JSONB))
    effective_date: datetime = Field(sa_column=Column(DateTime(timezone=True)))
    overview_summary: str = Field(sa_column=Column(Text))
    mandatory_conditions: str = Field(sa_column=Column(Text))
    source_file_url: str = Field(sa_column=Column(String))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    status: str = Field(sa_column=Column(String))


# --- 3. policy_sections (embeddings removed; RAG pipeline retired) ---
class PolicySection(SQLModel, table=True):
    __tablename__ = "policy_sections"

    section_id: UUID = Field(default_factory=uuid4, primary_key=True)
    policy_id: UUID = Field(foreign_key="policies.policy_id")
    content: str = Field(sa_column=Column(Text))
    metadata_data: dict = Field(default={}, sa_column=Column("metadata", JSONB))


# --- 4. reimbursements ---
class Reimbursement(SQLModel, table=True):
    __tablename__ = "reimbursements"

    reim_id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="employees.user_id")
    policy_id: Optional[UUID] = Field(default=None, foreign_key="policies.policy_id")
    main_category: str = Field(sa_column=Column(String))
    sub_category: str = Field(sa_column=Column(String))
    employee_department: Optional[str] = Field(default=None, sa_column=Column(String))
    employee_rank: int = Field(default=1, sa_column=Column(Integer))
    currency: str = Field(sa_column=Column(String))
    amount: Decimal = Field(sa_column=Column(Numeric(10, 2)))
    judgment: str = Field(sa_column=Column(String))
    status: str = Field(default="REVIEW", sa_column=Column(String))
    chain_of_thought: dict = Field(default={}, sa_column=Column(JSONB))
    summary: str = Field(sa_column=Column(Text))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )


# --- 5. supporting_documents ---
class SupportingDocument(SQLModel, table=True):
    __tablename__ = "supporting_documents"

    document_id: UUID = Field(default_factory=uuid4, primary_key=True)
    reim_id: Optional[UUID] = Field(default=None, foreign_key="reimbursements.reim_id")
    user_id: UUID = Field(foreign_key="employees.user_id")
    name: str = Field(sa_column=Column(Text))
    path: str = Field(sa_column=Column(String))
    type: str = Field(sa_column=Column(String))
    is_main: bool = Field(default=True, sa_column=Column(Boolean))
    document_class: str = Field(default="RECEIPT", sa_column=Column(String))
    extracted_data: dict = Field(default={}, sa_column=Column(JSONB))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
