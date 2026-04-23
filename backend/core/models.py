from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timezone
import enum

from sqlmodel import Field, SQLModel, Column, String, Text, Integer, Boolean, DateTime, JSON, Float
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy import ForeignKey
from pgvector.sqlalchemy import Vector


class UserRole(str, enum.Enum):
    HR = "HR"
    Employee = "Employee"

# --- 1. employees (merged with User for auth) ---
class User(SQLModel, table=True):
    __tablename__ = "employees"

    user_id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_code: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
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


# --- 3. policy_sections ---
class PolicySection(SQLModel, table=True):
    __tablename__ = "policy_sections"

    section_id: UUID = Field(default_factory=uuid4, primary_key=True)
    policy_id: UUID = Field(foreign_key="policies.policy_id")
    content: str = Field(sa_column=Column(Text))
    metadata_data: dict = Field(default={}, sa_column=Column("metadata", JSONB))
    embedding: List[float] = Field(sa_column=Column(Vector(1536)))


# --- 4. travel_settlement ---
class TravelSettlement(SQLModel, table=True):
    __tablename__ = "travel_settlements"

    settlement_id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_path: Optional[str] = Field(default=None, sa_column=Column(String))
    all_category: List[str] = Field(default=[], sa_column=Column(JSONB))
    main_category: Optional[str] = Field(default=None, sa_column=Column(String))
    # Deferred FK to break circular reference: TravelSettlement ↔ Reimbursement
    reimbursement_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("reimbursements.reim_id", use_alter=True, name="fk_settlement_reim_id"),
            nullable=True,
        ),
    )

    # Employee context
    employee_name: Optional[str] = Field(default=None, sa_column=Column(String))
    employee_id: Optional[str] = Field(default=None, sa_column=Column(String))
    employee_code: Optional[str] = Field(default=None, sa_column=Column(String))
    employee_department: Optional[str] = Field(default=None, sa_column=Column(String))
    employee_rank: Optional[int] = Field(default=None, sa_column=Column(Integer))
    destination: Optional[str] = Field(default=None, sa_column=Column(String))
    departure_date: Optional[str] = Field(default=None, sa_column=Column(String))
    arrival_date: Optional[str] = Field(default=None, sa_column=Column(String))
    location: Optional[str] = Field(default=None, sa_column=Column(String))
    overseas: Optional[bool] = Field(default=None, sa_column=Column(Boolean))
    purpose: Optional[str] = Field(default=None, sa_column=Column(String))
    currency: Optional[str] = Field(default=None, sa_column=Column(String))

    # Aggregated receipt data (full template input)
    receipts: List[dict] = Field(default=[], sa_column=Column(JSONB))
    totals: dict = Field(default={}, sa_column=Column(JSONB))

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )


# --- 5. reimbursements ---
class Reimbursement(SQLModel, table=True):
    __tablename__ = "reimbursements"

    reim_id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="employees.user_id")
    policy_id: Optional[UUID] = Field(default=None, foreign_key="policies.policy_id")
    settlement_id: Optional[UUID] = Field(default=None, foreign_key="travel_settlements.settlement_id")
    main_category: str = Field(sa_column=Column(String))
    sub_category: List[str] = Field(default=[], sa_column=Column(JSONB))
    employee_department: Optional[str] = Field(default=None, sa_column=Column(String))
    employee_rank: int = Field(default=1, sa_column=Column(Integer))
    currency: str = Field(sa_column=Column(String))
    totals: dict = Field(default={}, sa_column=Column(JSONB))
    line_items: List[dict] = Field(default=[], sa_column=Column(JSONB))
    judgment: str = Field(sa_column=Column(String))
    confidence: Optional[float] = Field(default=None, sa_column=Column(Float))
    status: str = Field(default="REVIEW", sa_column=Column(String))
    summary: str = Field(sa_column=Column(Text))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )


# --- 6. supporting_documents ---
class SupportingDocument(SQLModel, table=True):
    __tablename__ = "supporting_documents"

    document_id: UUID = Field(default_factory=uuid4, primary_key=True)
    reim_id: Optional[UUID] = Field(default=None, foreign_key="reimbursements.reim_id")
    settlement_id: Optional[UUID] = Field(default=None, foreign_key="travel_settlements.settlement_id")
    user_id: UUID = Field(foreign_key="employees.user_id")
    name: str = Field(sa_column=Column(Text))
    path: str = Field(sa_column=Column(String))
    type: str = Field(sa_column=Column(String))
    is_main: bool = Field(default=True, sa_column=Column(Boolean))
    document_class: str = Field(default="RECEIPT", sa_column=Column(String))
    extracted_data: dict = Field(default={}, sa_column=Column(JSONB))
    editable_fields: dict = Field(default={}, sa_column=Column(JSONB))
    human_edited: bool = Field(default=False, sa_column=Column(Boolean))
    change_summary: dict = Field(default={}, sa_column=Column(JSONB))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
