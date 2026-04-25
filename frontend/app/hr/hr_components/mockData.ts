import { FileText, Shield, Archive } from "lucide-react";
import { LucideIcon } from "lucide-react";

// ─── Policy Types ─────────────────────────────────────────────────────────────

export type PolicyStatus = "Active" | "Impending" | "Expired";

export interface Policy {
  id: string;
  name: string;
  version: string;
  department: string;
  lastModified: string;
  status: PolicyStatus;
  icon: LucideIcon;
  overview_summary?: string;
  mainFile?: File | null;
  appendixFiles?: File[];
  existingAppendix?: { name: string, size: string }[];
  aiConditions?: Record<string, SubCategoryCondition>;
  history?: { user: string, action: string, date: string, details?: string }[];
}

export interface SubCategoryCondition {
  condition: string[];
}

export interface PolicyDetail {
  policy_id: string;
  main_category: string;
  reimbursable_category: string[];
  effective_date: string;
  overview_summary: string;
  mandatory_conditions: Record<string, SubCategoryCondition>;
  source_file_url: string;
  created_at: string;
  status: string;
}


// ─── Claim Status Types ───────────────────────────────────────────────────────

/** Drives which dashboard tab a bundle appears in. */
export type AiStatus =
  | "Policy Flagged"
  | "Awaiting Review"
  | "Passed AI Review"
  | "Low Confidence";

/** Per-receipt AI judgment — mirrors backend LineItemStatus. */
export type LineItemStatus = "APPROVED" | "REJECTED" | "PARTIAL_APPROVE" | "PENDING";

// ─── Audit Types ──────────────────────────────────────────────────────────────

export interface AuditNote {
  tag: string;    // e.g. "[OVER_LIMIT]", "[LATE_SUBMISSION]", "[HUMAN_EDITED]"
  message: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
}

// ─── Line Item (per receipt/document) ────────────────────────────────────────
// Mirrors backend schema — do not rename fields.

export interface LineItem {
  document_id: string;
  line_item_id?: string;
  date: string;
  category: "meals" | "transportation" | "accommodation" | "others";
  description: string;
  status: LineItemStatus;
  requested_amount: number;
  approved_amount: number;
  deduction_amount: number;
  audit_notes: AuditNote[];
  /** True if the employee manually edited the AI-extracted amount — Fraud Trap. */
  human_edited?: boolean;
  /** Original OCR-extracted amount before employee edit. */
  ocr_amount?: number;
  /** URL to the uploaded receipt image. */
  receipt_url?: string;
}

// ─── Claim Bundle (top-level — contains all receipts for one claim) ───────────
// Mirrors backend JSON schema exactly.

export interface ClaimBundle {
  id: string;
  // Employee Identity (read-only)
  employee: {
    name: string;
    initials: string;
    employee_no: string;
    position: string;
    department: string;
    location: string;
    entity: string;
    email: string;
  };
  submitted_at: string;
  // Claim Context (filled by employee during submission)
  travel_destination: string;
  travel_purpose: string;
  departure_date: string;
  arrival_date: string;
  is_overseas: boolean;
  // AI Result — mirrors backend response
  line_items: LineItem[];
  totals: {
    total_requested: number;
    total_deduction: number;
    net_approved: number;
  };
  overall_judgment: LineItemStatus;
  /** 0–1 AI confidence score */
  confidence: number;
  summary: string;
  // System fields
  overall_status: AiStatus;
  audit_log: AuditLogEntry[];
}

// ─── Dashboard List Row ───────────────────────────────────────────────────────

export interface Claim {
  id: string;
  employee: { name: string; initials: string };
  date: string;
  amount: string;
  category: string;
  status: AiStatus;
  note?: string;
}

// ─── Dashboard Data (removed — now fetched from backend) ──────────────────────

export const ATTENTION_CLAIMS: Claim[] = [];
export const APPROVED_CLAIMS: Claim[] = [];
export const MOCK_BUNDLES: Record<string, ClaimBundle> = {};

// ─── Policy Data (removed — now fetched from backend) ─────────────────────────

export const MOCK_POLICIES: Policy[] = [];

export const POLICY_STATUS_STYLE: Record<PolicyStatus, string> = {
  "Active": "bg-[#e6f4ea] text-[#137333]",
  "Impending": "bg-[#fef7e0] text-[#b06000]",
  "Expired": "bg-surface-container-high text-on-surface-variant",
};

export const MOCK_POLICY_DETAILS: PolicyDetail[] = [];

