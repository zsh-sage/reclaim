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
  user_id: string;
  user_code?: string | null;
  email: string;
  name: string;
  role: "HR" | "Employee";
  department_id?: string | null;
  department_name?: string | null;
  rank?: number;
  privilege_level?: string;
  is_active?: boolean;
  created_at?: string | null;
}

// ─── Departments ─────────────────────────────────────────────────────────────

export interface Department {
  department_id: string;
  name: string;
  cost_center_code?: string | null;
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

/** One line item inside a reimbursement (from the normalized line_items table). */
export interface LineItem {
  line_item_id: string;
  reim_id: string;
  document_id?: string | null;
  description: string;
  category: string;
  quantity?: number;
  unit_price?: number;
  claimed_amount: number;
  approved_amount?: number | null;
  currency: string;
  expense_date?: string | null;
  judgment?: "APPROVED" | "REJECTED" | "PARTIAL" | "NEEDS_INFO" | null;
  rejection_reason?: string | null;
  policy_section_ref?: string | null;
  human_edited?: boolean | null;
}

/** Raw shape returned by the FastAPI GET /reimbursements/ and /reimbursements/{id} endpoints. */
export interface ReimbursementRaw {
  reim_id: string;
  user_id: string;
  employee_name?: string;
  department_name?: string;
  policy_id: string | null;
  policy_name?: string | null;
  settlement_id: string | null;
  main_category: string;
  currency: string;
  total_claimed_amount: number;
  total_approved_amount: number | null;
  total_rejected_amount: number | null;
  line_items?: LineItem[];
  judgment: "APPROVED" | "REJECTED" | "PARTIAL" | "NEEDS_INFO";
  confidence: number | null;
  ai_reasoning: Record<string, unknown>;
  status: "PENDING" | "REVIEW" | "APPROVED" | "REJECTED" | "APPEALED";
  summary: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  sub_categories: string[];
  receipt_count?: number;
}

/** Map a backend ReimbursementRaw into the frontend ClaimSummary shape. */
export function mapReimbursementToClaim(r: ReimbursementRaw): ClaimSummary {
  const currencySymbol: Record<string, string> = { USD: "$", MYR: "RM", EUR: "€", GBP: "£" };
  const symbol = currencySymbol[r.currency] ?? `${r.currency} `;
  const amountValue = r.total_claimed_amount ?? 0;
  const formattedAmount = `${symbol}${amountValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let displayDate = "";
  if (r.created_at) {
    const d = new Date(r.created_at);
    displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const statusMap: Record<string, ClaimStatus> = {
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PENDING: "Pending",
    REVIEW: "Pending",
    APPEALED: "Pending",
    Paid: "Paid",
    PAID: "Paid",
  };

  return {
    id: r.reim_id,
    date: displayDate,
    category: r.policy_name ?? r.main_category ?? "General",
    subCategory: `${r.receipt_count ?? 0} receipts`,
    merchant: r.summary?.split(".")[0] ?? "",
    amount: formattedAmount,
    amountNumeric: amountValue,
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
  reimbursable_categories: string[];
  overview_summary: string;
  mandatory_conditions: string;
  status: "DRAFT" | "ACTIVE" | "DEPRECATED";
  effective_date: string | null;
  expiry_date?: string | null;
  source_file_url: string;
  created_by?: string;
  created_at?: string | null;
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
  department: string | null;
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
  task_id?: string;
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
  change_count: number;
  high_risk_count: number;
}

// ─── Document Change Logs ────────────────────────────────────────────────────

export interface DocumentChangeLogEntry {
  log_id: string;
  document_id: string;
  changed_by: string;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
  changed_at: string;
}

// ─── Compliance Analysis ──────────────────────────────────────────────────────

/** Request body for POST /api/v1/reimbursements/analyze. */
export interface AnalyzeRequest {
  settlement_id: string;
  policy_id: string;
  document_ids?: string[];
}

/** Response for POST /api/v1/reimbursements/analyze. */
export interface AnalyzeResponse {
  reim_id: string;
  settlement_id: string | null;
  judgment: "APPROVED" | "REJECTED" | "PARTIAL" | "NEEDS_INFO";
  status: string;
  summary: string;
  line_items: LineItem[];
  total_claimed_amount: number;
  total_approved_amount: number | null;
  total_rejected_amount: number | null;
  confidence: number | null;
  currency: string;
  main_category: string;
  sub_categories: string[];
  created_at: string | null;
  message: string;
  task_id?: string;
}

// ─── Claim Drafts ─────────────────────────────────────────────────────────────

/** Lightweight draft summary (for list views / sidebar). */
export interface DraftSummary {
  draft_id: string;
  user_id: string;
  title: string | null;
  main_category: string | null;
  receipt_count: number;
  failed_receipt_count: number;
  created_at: string | null;
  updated_at: string | null;
}

/** Full draft data (for loading/resuming a claim). */
export interface DraftFull extends DraftSummary {
  settlement_id: string | null;
  draft_data: Record<string, unknown>;
}

/** Request body for POST /api/v1/drafts/ */
export interface DraftSaveRequest {
  title?: string | null;
  main_category?: string | null;
  settlement_id?: string | null;
  draft_data: Record<string, unknown>;
  receipt_count: number;
  failed_receipt_count: number;
}

/** Response for GET /api/v1/drafts/count */
export interface DraftCountResponse {
  count: number;
}
