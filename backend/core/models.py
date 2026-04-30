from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timezone, date

from sqlmodel import Field, SQLModel, Column, String, Text, Integer, Boolean, DateTime, Float, Date, Numeric
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, UniqueConstraint

from core.enums import (
    UserRole,
    PrivilegeLevel,
    ReimbursementStatus,
    JudgmentResult,
    DocumentClass,
    PolicyStatus,
)


# ---------------------------------------------------------------------------
# 1. employees
# ---------------------------------------------------------------------------

class User(SQLModel, table=True):
    __tablename__ = "employees"

    user_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    user_code: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True, unique=True, index=True)
    )
    email: str = Field(
        sa_column=Column(String, unique=True, index=True, nullable=False)
    )
    hashed_password: str = Field(
        sa_column=Column(String, nullable=False)
    )
    name: str = Field(
        sa_column=Column(String, nullable=False)
    )
    role: UserRole = Field(
        default=UserRole.Employee,
        sa_column=Column(String, nullable=False)
    )
    department_id: Optional[UUID] = Field(
        default=None,
        foreign_key="departments.department_id"
    )
    rank: Optional[int] = Field(
        default=1,
        sa_column=Column(Integer)
    )
    privilege_level: PrivilegeLevel = Field(
        default=PrivilegeLevel.Standard,
        sa_column=Column(String, nullable=False)
    )
    is_active: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False)
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )


# ---------------------------------------------------------------------------
# 2. departments
# ---------------------------------------------------------------------------

class Department(SQLModel, table=True):
    __tablename__ = "departments"

    department_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    name: str = Field(
        sa_column=Column(String, unique=True, nullable=False)
    )
    cost_center_code: Optional[str] = Field(
        default=None,
        sa_column=Column(String)
    )


# ---------------------------------------------------------------------------
# 3. policies
# ---------------------------------------------------------------------------

class Policy(SQLModel, table=True):
    __tablename__ = "policies"

    policy_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    alias: str = Field(
        sa_column=Column(String, unique=True, index=True, nullable=False)
    )
    title: str = Field(
        sa_column=Column(String, nullable=False)
    )
    effective_date: datetime = Field(
        sa_column=Column(DateTime(timezone=True))
    )
    expiry_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )
    overview_summary: str = Field(
        sa_column=Column(Text)
    )
    mandatory_conditions: str = Field(
        sa_column=Column(Text)
    )
    source_file_url: str = Field(
        sa_column=Column(String)
    )
    status: PolicyStatus = Field(
        default=PolicyStatus.DRAFT,
        sa_column=Column(String, nullable=False)
    )
    created_by: UUID = Field(
        foreign_key="employees.user_id"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )


# ---------------------------------------------------------------------------
# 4. policy_reimbursable_categories
# ---------------------------------------------------------------------------

class PolicyReimbursableCategory(SQLModel, table=True):
    __tablename__ = "policy_reimbursable_categories"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    policy_id: UUID = Field(foreign_key="policies.policy_id", index=True)
    category: str = Field(sa_column=Column(String, nullable=False))

    __table_args__ = (
        UniqueConstraint("policy_id", "category", name="uq_policy_category"),
    )


# ---------------------------------------------------------------------------
# 5. policy_sections
# ---------------------------------------------------------------------------

class PolicySection(SQLModel, table=True):
    __tablename__ = "policy_sections"

    section_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    policy_id: UUID = Field(
        foreign_key="policies.policy_id",
        index=True
    )
    section_title: Optional[str] = Field(
        default=None,
        sa_column=Column(String)
    )
    section_order: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer)
    )
    content: str = Field(
        sa_column=Column(Text)
    )
    metadata_data: dict = Field(
        default={},
        sa_column=Column("metadata", JSONB)
    )
    embedding: List[float] = Field(
        sa_column=Column(Vector(1536))
    )


# ---------------------------------------------------------------------------
# 6. travel_settlements
# ---------------------------------------------------------------------------

class TravelSettlement(SQLModel, table=True):
    __tablename__ = "travel_settlements"

    settlement_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    user_id: UUID = Field(
        foreign_key="employees.user_id",
        index=True
    )
    document_path: Optional[str] = Field(
        default=None,
        sa_column=Column(String)
    )
    main_category: Optional[str] = Field(
        default=None,
        sa_column=Column(String)
    )
    destination: Optional[str] = Field(
        default=None,
        sa_column=Column(String)
    )
    departure_date: Optional[date] = Field(
        default=None,
        sa_column=Column(Date)
    )
    arrival_date: Optional[date] = Field(
        default=None,
        sa_column=Column(Date)
    )
    location: Optional[str] = Field(
        default=None,
        sa_column=Column(String)
    )
    overseas: Optional[bool] = Field(
        default=None,
        sa_column=Column(Boolean)
    )
    purpose: Optional[str] = Field(
        default=None,
        sa_column=Column(Text)
    )
    currency: Optional[str] = Field(
        default=None,
        sa_column=Column(String(3))
    )
    total_claimed_amount: Optional[float] = Field(
        default=None,
        sa_column=Column(Numeric(12, 2))
    )
    total_approved_amount: Optional[float] = Field(
        default=None,
        sa_column=Column(Numeric(12, 2))
    )
    total_rejected_amount: Optional[float] = Field(
        default=None,
        sa_column=Column(Numeric(12, 2))
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )


# ---------------------------------------------------------------------------
# 7. settlement_categories
# ---------------------------------------------------------------------------

class SettlementCategory(SQLModel, table=True):
    __tablename__ = "settlement_categories"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    settlement_id: UUID = Field(
        foreign_key="travel_settlements.settlement_id",
        index=True
    )
    category: str = Field(sa_column=Column(String, nullable=False))

    __table_args__ = (
        UniqueConstraint("settlement_id", "category", name="uq_settlement_category"),
    )


# ---------------------------------------------------------------------------
# 8. reimbursements
# ---------------------------------------------------------------------------

class Reimbursement(SQLModel, table=True):
    __tablename__ = "reimbursements"

    reim_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    user_id: UUID = Field(
        foreign_key="employees.user_id",
        index=True
    )
    policy_id: Optional[UUID] = Field(
        default=None,
        foreign_key="policies.policy_id"
    )
    settlement_id: Optional[UUID] = Field(
        default=None,
        foreign_key="travel_settlements.settlement_id"
    )
    main_category: str = Field(
        sa_column=Column(String, nullable=False, index=True)
    )
    currency: str = Field(
        sa_column=Column(String(3), nullable=False)
    )
    total_claimed_amount: float = Field(
        sa_column=Column(Numeric(12, 2), nullable=False)
    )
    total_approved_amount: Optional[float] = Field(
        default=None,
        sa_column=Column(Numeric(12, 2))
    )
    total_rejected_amount: Optional[float] = Field(
        default=None,
        sa_column=Column(Numeric(12, 2))
    )
    judgment: JudgmentResult = Field(
        sa_column=Column(String, nullable=False)
    )
    confidence: Optional[float] = Field(
        default=None,
        sa_column=Column(Float)
    )
    ai_reasoning: dict = Field(
        default={},
        sa_column=Column(JSONB)
    )
    summary: str = Field(
        sa_column=Column(Text)
    )
    status: ReimbursementStatus = Field(
        default=ReimbursementStatus.PENDING,
        sa_column=Column(String, nullable=False, index=True)
    )
    reviewed_by: Optional[UUID] = Field(
        default=None,
        foreign_key="employees.user_id"
    )
    reviewed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )


# ---------------------------------------------------------------------------
# 9. reimbursement_sub_categories
# ---------------------------------------------------------------------------

class ReimbursementSubCategory(SQLModel, table=True):
    __tablename__ = "reimbursement_sub_categories"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    reim_id: UUID = Field(
        foreign_key="reimbursements.reim_id",
        index=True
    )
    sub_category: str = Field(
        sa_column=Column(String, nullable=False)
    )

    __table_args__ = (
        UniqueConstraint("reim_id", "sub_category", name="uq_reim_sub_category"),
    )


# ---------------------------------------------------------------------------
# 10. line_items
# ---------------------------------------------------------------------------

class LineItem(SQLModel, table=True):
    __tablename__ = "line_items"

    line_item_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    reim_id: UUID = Field(
        foreign_key="reimbursements.reim_id",
        index=True
    )
    document_id: Optional[UUID] = Field(
        default=None,
        foreign_key="supporting_documents.document_id"
    )
    description: str = Field(
        sa_column=Column(Text, nullable=False)
    )
    category: str = Field(
        sa_column=Column(String, nullable=False)
    )
    quantity: Optional[float] = Field(
        default=1.0,
        sa_column=Column(Float)
    )
    unit_price: Optional[float] = Field(
        default=None,
        sa_column=Column(Numeric(12, 2))
    )
    claimed_amount: float = Field(
        sa_column=Column(Numeric(12, 2), nullable=False)
    )
    approved_amount: Optional[float] = Field(
        default=None,
        sa_column=Column(Numeric(12, 2))
    )
    currency: str = Field(
        sa_column=Column(String(3), nullable=False)
    )
    expense_date: Optional[date] = Field(
        default=None,
        sa_column=Column(Date)
    )
    judgment: Optional[JudgmentResult] = Field(
        default=None,
        sa_column=Column(String)
    )
    rejection_reason: Optional[str] = Field(
        default=None,
        sa_column=Column(Text)
    )
    policy_section_ref: Optional[UUID] = Field(
        default=None,
        foreign_key="policy_sections.section_id"
    )


# ---------------------------------------------------------------------------
# 11. settlement_receipts
# ---------------------------------------------------------------------------

class SettlementReceipt(SQLModel, table=True):
    __tablename__ = "settlement_receipts"

    receipt_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    settlement_id: UUID = Field(
        foreign_key="travel_settlements.settlement_id",
        index=True
    )
    document_id: Optional[UUID] = Field(
        default=None,
        foreign_key="supporting_documents.document_id"
    )
    merchant_name: Optional[str] = Field(
        default=None,
        sa_column=Column(String)
    )
    receipt_date: Optional[date] = Field(
        default=None,
        sa_column=Column(Date)
    )
    category: Optional[str] = Field(
        default=None,
        sa_column=Column(String)
    )
    claimed_amount: Optional[float] = Field(
        default=None,
        sa_column=Column(Numeric(12, 2))
    )
    currency: Optional[str] = Field(
        default=None,
        sa_column=Column(String(3))
    )


# ---------------------------------------------------------------------------
# 12. supporting_documents
# ---------------------------------------------------------------------------

class SupportingDocument(SQLModel, table=True):
    __tablename__ = "supporting_documents"

    document_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    reim_id: Optional[UUID] = Field(
        default=None,
        foreign_key="reimbursements.reim_id",
        index=True
    )
    settlement_id: Optional[UUID] = Field(
        default=None,
        foreign_key="travel_settlements.settlement_id",
        index=True
    )
    user_id: UUID = Field(
        foreign_key="employees.user_id",
        index=True
    )
    name: str = Field(sa_column=Column(Text))
    path: str = Field(sa_column=Column(String, nullable=False))
    type: str = Field(sa_column=Column(String, nullable=False))
    is_main: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False)
    )
    document_class: DocumentClass = Field(
        default=DocumentClass.RECEIPT,
        sa_column=Column(String, nullable=False)
    )
    human_edited: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False)
    )
    extracted_data: dict = Field(
        default={},
        sa_column=Column(JSONB)
    )
    editable_fields: dict = Field(
        default={},
        sa_column=Column(JSONB)
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )


# ---------------------------------------------------------------------------
# 13. document_change_log
# ---------------------------------------------------------------------------

class DocumentChangeLog(SQLModel, table=True):
    __tablename__ = "document_change_logs"

    log_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    document_id: UUID = Field(
        foreign_key="supporting_documents.document_id",
        index=True
    )
    changed_by: UUID = Field(
        foreign_key="employees.user_id"
    )
    field_name: str = Field(
        sa_column=Column(String, nullable=False)
    )
    old_value: Optional[str] = Field(
        default=None,
        sa_column=Column(Text)
    )
    new_value: Optional[str] = Field(
        default=None,
        sa_column=Column(Text)
    )
    changed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )


# ---------------------------------------------------------------------------
# 14. claim_drafts
# ---------------------------------------------------------------------------

class ClaimDraft(SQLModel, table=True):
    __tablename__ = "claim_drafts"

    draft_id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )
    user_id: UUID = Field(
        foreign_key="employees.user_id",
        index=True
    )
    title: Optional[str] = Field(
        default=None,
        sa_column=Column(String)
    )
    main_category: Optional[str] = Field(
        default=None,
        sa_column=Column(String)
    )
    settlement_id: Optional[UUID] = Field(
        default=None,
        foreign_key="travel_settlements.settlement_id"
    )
    draft_data: dict = Field(
        default={},
        sa_column=Column(JSONB)
    )
    receipt_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False)
    )
    failed_receipt_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False)
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
