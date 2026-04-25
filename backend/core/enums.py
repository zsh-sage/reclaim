import enum


class UserRole(str, enum.Enum):
    HR = "HR"
    Employee = "Employee"


class PrivilegeLevel(str, enum.Enum):
    Standard = "Standard"
    Manager = "Manager"
    Executive = "Executive"


class ReimbursementStatus(str, enum.Enum):
    PENDING = "PENDING"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    APPEALED = "APPEALED"


class JudgmentResult(str, enum.Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PARTIAL = "PARTIAL"
    NEEDS_INFO = "NEEDS_INFO"


class DocumentClass(str, enum.Enum):
    RECEIPT = "RECEIPT"
    INVOICE = "INVOICE"
    SETTLEMENT_FORM = "SETTLEMENT_FORM"
    SUPPORTING = "SUPPORTING"


class PolicyStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    DEPRECATED = "DEPRECATED"
