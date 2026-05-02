from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field

from core.enums import (
    UserRole,
    PrivilegeLevel,
    ReimbursementStatus,
    JudgmentResult,
    DocumentClass,
    PolicyStatus,
    PayoutStatus,
)


# =============================================================================
# User Schemas
# =============================================================================

class UserBase(BaseModel):
    user_code: Optional[str] = None
    email: EmailStr
    name: str
    role: UserRole = UserRole.Employee
    department_id: Optional[UUID] = None
    privilege_level: PrivilegeLevel = PrivilegeLevel.Standard
    rank: Optional[int] = Field(default=1, ge=1)
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(UserBase):
    password: Optional[str] = None


class UserInDBBase(UserBase):
    user_id: UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserResponse(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    hashed_password: str


# =============================================================================
# Auth Schemas
# =============================================================================

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    name: str
    email: str
    department_id: Optional[UUID] = None


# =============================================================================
# Department Schemas
# =============================================================================

class DepartmentCreate(BaseModel):
    name: str
    cost_center_code: Optional[str] = None


class DepartmentResponse(DepartmentCreate):
    department_id: UUID

    class Config:
        from_attributes = True


# =============================================================================
# Policy Schemas
# =============================================================================

class PolicyCreate(BaseModel):
    alias: str
    title: str
    effective_date: datetime
    expiry_date: Optional[datetime] = None
    overview_summary: str
    mandatory_conditions: str
    source_file_url: str
    reimbursable_categories: List[str]
    created_by: UUID


class PolicyResponse(BaseModel):
    policy_id: UUID
    alias: str
    title: str
    effective_date: datetime
    expiry_date: Optional[datetime]
    overview_summary: str
    mandatory_conditions: str
    source_file_url: str
    reimbursable_categories: List[str]
    reimbursable_categories_with_budgets: List[PolicyCategoryWithBudget] = []
    status: PolicyStatus
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class PolicyCategoryWithBudget(BaseModel):
    """Policy reimbursable category with auto-approval budget."""
    category: str
    auto_approval_budget: Optional[float] = None


class PolicyCategoriesUpdateRequest(BaseModel):
    """Request to update category budgets."""
    categories: List[PolicyCategoryWithBudget]


# =============================================================================
# Settlement Receipt Schemas
# =============================================================================

class SettlementReceiptCreate(BaseModel):
    document_id: Optional[UUID] = None
    merchant_name: Optional[str] = None
    receipt_date: Optional[date] = None
    category: Optional[str] = None
    claimed_amount: Optional[Decimal] = None
    currency: Optional[str] = None


class SettlementReceiptResponse(SettlementReceiptCreate):
    receipt_id: UUID
    settlement_id: UUID

    class Config:
        from_attributes = True


# =============================================================================
# Travel Settlement Schemas
# =============================================================================

class TravelSettlementCreate(BaseModel):
    user_id: UUID
    destination: Optional[str] = None
    departure_date: Optional[date] = None
    arrival_date: Optional[date] = None
    location: Optional[str] = None
    overseas: Optional[bool] = None
    purpose: Optional[str] = None
    currency: Optional[str] = None
    main_category: Optional[str] = None
    total_claimed_amount: Optional[Decimal] = None
    categories: List[str] = []
    receipts: List[SettlementReceiptCreate] = []


class TravelSettlementResponse(BaseModel):
    settlement_id: UUID
    user_id: UUID
    document_path: Optional[str] = None
    main_category: Optional[str] = None
    destination: Optional[str] = None
    departure_date: Optional[date] = None
    arrival_date: Optional[date] = None
    location: Optional[str] = None
    overseas: Optional[bool] = None
    purpose: Optional[str] = None
    currency: Optional[str] = None
    total_claimed_amount: Optional[Decimal] = None
    total_approved_amount: Optional[Decimal] = None
    total_rejected_amount: Optional[Decimal] = None
    categories: List[str] = []
    receipts: List[SettlementReceiptResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Line Item Schemas
# =============================================================================

class LineItemCreate(BaseModel):
    document_id: Optional[UUID] = None
    description: str
    category: str
    quantity: Optional[float] = 1.0
    unit_price: Optional[Decimal] = None
    claimed_amount: Decimal
    approved_amount: Optional[Decimal] = None
    currency: str
    expense_date: Optional[date] = None
    judgment: Optional[JudgmentResult] = None
    rejection_reason: Optional[str] = None
    policy_section_ref: Optional[UUID] = None


class LineItemResponse(LineItemCreate):
    line_item_id: UUID
    reim_id: UUID

    class Config:
        from_attributes = True


# =============================================================================
# Reimbursement Schemas
# =============================================================================

class ReimbursementCreate(BaseModel):
    policy_id: Optional[UUID] = None
    settlement_id: Optional[UUID] = None
    main_category: str
    currency: str
    total_claimed_amount: Decimal
    line_items: List[LineItemCreate] = []
    sub_categories: List[str] = []


class ReimbursementResponse(BaseModel):
    reim_id: UUID
    user_id: UUID
    policy_id: Optional[UUID] = None
    settlement_id: Optional[UUID] = None
    main_category: str
    currency: str
    total_claimed_amount: Decimal
    total_approved_amount: Optional[Decimal] = None
    total_rejected_amount: Optional[Decimal] = None
    judgment: JudgmentResult
    confidence: Optional[float] = None
    ai_reasoning: dict = {}
    summary: str
    status: ReimbursementStatus
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    line_items: List[LineItemResponse] = []
    sub_categories: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LineItemAdjustment(BaseModel):
    line_item_id: UUID
    approved_amount: float


class StatusUpdateRequest(BaseModel):
    status: ReimbursementStatus
    line_items: Optional[List[LineItemAdjustment]] = None
    hr_note: Optional[str] = None


class AnalyzeReimbursementRequest(BaseModel):
    settlement_id: str
    document_ids: Optional[List[str]] = None
    is_auto_reimburse_enabled: bool = False


# =============================================================================
# Document Schemas
# =============================================================================

class DocumentChangeLogResponse(BaseModel):
    log_id: UUID
    document_id: UUID
    changed_by: UUID
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True


class DocumentFieldEditRequest(BaseModel):
    edits: dict


# =============================================================================
# Supporting Document List Response (lightweight)
# =============================================================================

class SupportingDocumentListItem(BaseModel):
    document_id: UUID
    reim_id: Optional[UUID] = None
    name: str
    path: str
    type: str
    extracted_data: dict = {}
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =============================================================================
# Claim Draft Schemas
# =============================================================================

class ClaimDraftCreate(BaseModel):
    title: Optional[str] = None
    main_category: Optional[str] = None
    settlement_id: Optional[str] = None
    draft_data: dict = {}
    receipt_count: int = 0
    failed_receipt_count: int = 0


class ClaimDraftUpdate(BaseModel):
    title: Optional[str] = None
    main_category: Optional[str] = None
    settlement_id: Optional[str] = None
    draft_data: Optional[dict] = None
    receipt_count: Optional[int] = None
    failed_receipt_count: Optional[int] = None


class ClaimDraftSummary(BaseModel):
    draft_id: UUID
    user_id: UUID
    title: Optional[str] = None
    main_category: Optional[str] = None
    receipt_count: int = 0
    failed_receipt_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClaimDraftFull(ClaimDraftSummary):
    settlement_id: Optional[UUID] = None
    draft_data: dict = {}

    class Config:
        from_attributes = True


# =============================================================================
# Payout Schemas
# =============================================================================

class BankingDetailsRequest(BaseModel):
    bank_code: str
    bank_account_number: str
    bank_account_holder_name: str


class BankingDetailsResponse(BaseModel):
    bank_code: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_holder_name: Optional[str] = None
    bank_name: Optional[str] = None

    class Config:
        from_attributes = True


class CreatePayoutRequest(BaseModel):
    reim_id: UUID


class PayoutChannelResponse(BaseModel):
    channel_code: str
    channel_category: str
    currency: str
    channel_name: str
    amount_limits: dict


class PayoutResponse(BaseModel):
    payout_id: UUID
    reim_id: UUID
    user_id: UUID
    amount: float
    currency: str
    status: PayoutStatus
    xendit_id: Optional[str] = None
    reference_id: str
    channel_code: str
    failure_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Notification Schemas
# =============================================================================

class NotificationResponse(BaseModel):
    notification_id: UUID
    user_id: UUID
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
