// ─── Shared API Types ─────────────────────────────────────────────────────────
// Central TypeScript type definitions matching the FastAPI backend responses.
// These types are used by both server actions and UI components.
// ──────────────────────────────────────────────────────────────────────────────

// ─── Generic API Result ──────────────────────────────────────────────────────

/** Standardised wrapper for all API client responses. */
export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/** Matches GET /api/v1/auth/me → UserResponse */
export interface User {
  id: string;           // UUID mapped from user_id in auth.ts
  user_code: string | null;
  email: string;
  name: string;
  role: "HR" | "Employee";
  department?: string;
  rank: number;
  privilege_level?: string;
}

// ─── Dashboard & Statistics ──────────────────────────────────────────────────

export interface DashboardStats {
  awaitingReview: {
    amount: string;
    count: number;
  };
  reimbursedThisMonth: {
    amount: string;
    count: number;
  };
  alreadyPaid: {
    amount: string;
    count: number;
  };
}

// ─── Claims ──────────────────────────────────────────────────────────────────

export type ClaimStatus = "Pending" | "Approved" | "Paid" | "Rejected";

export interface ClaimSummary {
  id: string;
  date: string;
  category: string;
  subCategory: string;
  merchant: string;
  amount: string;
  amountNumeric: number;
  status: ClaimStatus;
}

/** One line item inside a reimbursement (from compliance agent judgment). */
export interface ReimbursementLineItem {
  receipt_name: string;
  status: string;
  requested_amount: number;
  approved_amount: number;
  deduction_amount: number;
  audit_notes: string;
}

/** Raw shape returned by the FastAPI `GET /reimbursements/` endpoint. */
export interface ReimbursementRaw {
  reim_id: string;
  user_id: string;
  policy_id: string | null;
  settlement_id: string | null;
  main_category: string;
  sub_category: string[];
  employee_department?: string | null;
  employee_rank?: number | null;
  currency: string;
  totals: {
    total_requested: number;
    total_deduction: number;
    net_approved: number;
  };
  line_items: ReimbursementLineItem[];
  judgment: "APPROVE" | "REJECT" | "PARTIAL_APPROVE" | "MANUAL REVIEW";
  confidence: number | null;
  status: string;
  summary: string;
  created_at: string | null;
}

/** Map a backend ReimbursementRaw into the frontend ClaimSummary shape. */
export function mapReimbursementToClaim(r: ReimbursementRaw): ClaimSummary {
  // Format currency + amount → "$850.00"
  const currencySymbol: Record<string, string> = { USD: "$", MYR: "RM", EUR: "€", GBP: "£" };
  const symbol = currencySymbol[r.currency] ?? `${r.currency} `;
  const netApproved = r.totals?.net_approved ?? 0;
  const formattedAmount = `${symbol}${netApproved.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Format ISO date → "Oct 24, 2023"
  let displayDate = "";
  if (r.created_at) {
    const d = new Date(r.created_at);
    displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // Normalise status to ClaimStatus union
  const statusMap: Record<string, ClaimStatus> = {
    Approved: "Approved",
    APPROVED: "Approved",
    Pending: "Pending",
    REVIEW: "Pending",
    Paid: "Paid",
    PAID: "Paid",
    Rejected: "Rejected",
    REJECTED: "Rejected",
  };

  return {
    id: r.reim_id,
    date: displayDate,
    category: r.main_category,
    subCategory: Array.isArray(r.sub_category) ? r.sub_category.join(", ") : r.sub_category,
    merchant: r.summary?.split(".")[0] ?? "",   // first sentence of summary
    amount: formattedAmount,
    amountNumeric: netApproved,
    status: statusMap[r.status] ?? "Pending",
  };
}

export interface TimelineEvent {
  type: "Submitted" | "AI_Validation" | "HR_Review" | "Paid";
  status: "Completed" | "Pending" | "Failed";
  timestamp: string;
  description: string;
}

export interface DetailedClaim extends ClaimSummary {
  timeline: TimelineEvent[];
  receipts: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  clientName: string;
  purpose: string;
}

export interface HistorySummary {
  totalReimbursed: string;
  pendingAmount: string;
}

// ─── Reimbursement & Policy ──────────────────────────────────────────────────

export interface SubCategoryConfig {
  required_documents: string[];
  condition: string[];
}

/** Matches GET /api/v1/policies/ list items. */
export interface Policy {
  policy_id: string;
  alias: string;
  title: string;
  reimbursable_category: string[];
  overview_summary: string;
  status: string;
  effective_date: string | null;
  source_file_url: string;
}

export interface ExtractedData {
  merchant: string;
  amount: string;
  date: string;
}

export interface ClaimSubmissionPayload {
  mainCategory: string;
  subCategory: string;
  clientName: string;
  purpose: string;
  extractedData: ExtractedData;
  files: string[];
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

// ─── Settings & Banking ──────────────────────────────────────────────────────

export interface BankingDetails {
  id: string;
  institutionName: string;
  accountLastFour: string;
  routingType: string;
  updatedAt: string;
}

export interface UserProfileUpdate {
  name: string;
  email: string;
}

// ─── Document Upload ─────────────────────────────────────────────────────────

/** Employee object embedded in DocumentUploadResponse. */
export interface DocumentUploadEmployee {
  name: string;
  id: string;
  user_code: string;
  department: string;
  rank: number | null;
  destination: string | null;
  departure_date: string | null;
  arrival_date: string | null;
  location: string | null;
  overseas: boolean | null;
  purpose: string | null;
}

/** One OCR-processed receipt inside DocumentUploadResponse. */
export interface OcrReceiptResult {
  document_id: string;
  date: string;
  description: string;
  category: string;
  currency: string;
  amount: number;
  transportation: number;
  accommodation: number;
  meals: number;
  others: number;
  warnings: string[];
  extracted_data: Record<string, unknown>;
}

/** Category-level totals inside DocumentUploadResponse. */
export interface DocumentUploadTotals {
  transportation: number;
  accommodation: number;
  meals: number;
  others: number;
  grand_total: number;
  currency: string;
}

/** Matches POST /api/v1/documents/upload response. */
export interface DocumentUploadResponse {
  settlement_id: string;
  document_ids: string[];
  employee: DocumentUploadEmployee;
  receipts: OcrReceiptResult[];
  skipped_receipts: OcrReceiptResult[];
  totals: DocumentUploadTotals;
  all_warnings: string[];
  all_category: string[];
  main_category: string | null;
}

// ─── Document Edits ───────────────────────────────────────────────────────────

/** Request body for POST /api/v1/documents/{document_id}/edits. */
export interface EditDocumentRequest {
  merchant_name?: string;
  date?: string;
  time?: string;
  currency?: string;
  total_amount?: number;
  destination?: string;
  departure_date?: string;
  arrival_date?: string;
  location?: string;
  overseas?: boolean;
}

/** Response for POST /api/v1/documents/{document_id}/edits. */
export interface EditDocumentResponse {
  document_id: string;
  human_edited: boolean;
  change_summary: {
    has_changes: boolean;
    change_count: number;
    high_risk_count: number;
    changes_by_field: Record<string, unknown>;
    overall_risk: string;
  };
}

// ─── Compliance Analysis ──────────────────────────────────────────────────────

/** Request body for POST /api/v1/reimbursements/analyze. */
export interface AnalyzeRequest {
  settlement_id: string;
  policy_id: string;
  all_category: string[];
  document_ids: string[];
}

/** Response for POST /api/v1/reimbursements/analyze. */
export interface AnalyzeResponse {
  reim_id: string;
  settlement_id: string | null;
  judgment: "APPROVE" | "REJECT" | "PARTIAL_APPROVE" | "MANUAL REVIEW";
  status: string;
  summary: string;
  line_items: ReimbursementLineItem[];
  totals: {
    total_requested: number;
    total_deduction: number;
    net_approved: number;
  };
  confidence: number | null;
  currency: string;
  main_category: string;
  sub_category: string[];
  created_at: string | null;
  cached: boolean;
  message: string;
}
