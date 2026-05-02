import { FileText, Shield, Archive } from "lucide-react";
import { LucideIcon } from "lucide-react";
import type { ClaimBundle } from "@/lib/api/types";

// ─── Policy Types ─────────────────────────────────────────────────────────────

export type PolicyStatus = "Active" | "Impending" | "Expired";

export interface Policy {
  policy_id: string;
  alias: string;
  title: string;
  version: string;
  department: string;
  lastModified: string;
  status: PolicyStatus;
  icon: LucideIcon;
  overview_summary?: string;
  mainFile?: File | null;
  appendixFiles?: File[];
  existingAppendix?: { name: string, size: string }[];
  mandatory_conditions?: Record<string, SubCategoryCondition>;
  history?: { user: string, action: string, date: string, details?: string }[];
  reimbursable_categories_with_budgets?: { category: string; auto_approval_budget?: number | null }[];
  source_file_url?: string;
  effective_date?: string | null;
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

// ─── Mock Data (removed — now fetched from backend) ───────────────────────────

export const MOCK_BUNDLES: Record<string, ClaimBundle> = {};
export const MOCK_POLICIES: Policy[] = [];

export const POLICY_STATUS_STYLE: Record<PolicyStatus, string> = {
  "Active": "bg-[#e6f4ea] text-[#137333]",
  "Impending": "bg-[#fef7e0] text-[#b06000]",
  "Expired": "bg-surface-container-high text-on-surface-variant",
};

export const MOCK_POLICY_DETAILS: PolicyDetail[] = [];
