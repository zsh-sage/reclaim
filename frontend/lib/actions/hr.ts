"use server";

// ─── HR Server Actions ────────────────────────────────────────────────────────
// Fetches reimbursement data for the HR dashboard and detail view.
// HR role receives ALL reimbursements (no user filter on the backend).
// Maps backend ReimbursementRaw → Claim (list row) and ClaimBundle (detail).
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPatch, apiPost, apiPostMultipart, API_PREFIX } from "@/lib/api/client";
import type { ReimbursementRaw, Claim, ClaimBundle, PayoutInfo, AiStatus } from "@/lib/api/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function judgmentToAiStatus(judgment: string): AiStatus {
  const j = judgment.toUpperCase();
  if (j === "NEEDS_INFO") return "Awaiting Review";
  if (j === "REJECTED") return "Policy Flagged";
  if (j === "PARTIAL") return "Policy Flagged";
  // APPROVED
  return "Passed AI Review";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-MY", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number, currency = "MYR"): string {
  const symbols: Record<string, string> = { MYR: "MYR ", USD: "$", EUR: "€", GBP: "£" };
  const sym = symbols[currency] ?? `${currency} `;
  return `${sym}${amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
}

/** Map a raw reimbursement to the HR dashboard list row shape. */
function mapToClaim(r: ReimbursementRaw): Claim {
  const aiStatus = judgmentToAiStatus(r.judgment);
  const employeeName = r.employee_name ?? "Unknown";

  return {
    id: r.reim_id,
    employee: {
      name: employeeName,
      initials: getInitials(employeeName),
    },
    date: formatDate(r.created_at),
    amount: formatCurrency(r.total_claimed_amount ?? 0, r.currency),
    category: r.main_category ?? "General",
    status: aiStatus,
    note: r.summary ? r.summary.split(".")[0] : undefined,
  };
}

/** Map a raw reimbursement to the ClaimBundle detail shape. */
function mapToBundle(r: ReimbursementRaw): ClaimBundle {
  const employeeName = r.employee_name ?? "Unknown";
  const deptName = r.department_name ?? "Unknown";

  const lineItems = (r.line_items ?? []).map((li) => ({
    document_id: li.document_id ?? `${r.reim_id}-li-unknown`,
    line_item_id: li.line_item_id ?? undefined,
    date: li.expense_date ?? r.created_at?.split("T")[0] ?? "",
    category: (li.category ?? "others").toLowerCase().includes("meal")
      ? "meals" as const
      : (li.category ?? "others").toLowerCase().includes("transport")
        ? "transportation" as const
        : (li.category ?? "others").toLowerCase().includes("accom")
          ? "accommodation" as const
          : "others" as const,
    description: li.description ?? "Receipt",
    status: (li.judgment ?? "PENDING") as "APPROVED" | "REJECTED" | "PARTIAL_APPROVE" | "PENDING",
    requested_amount: li.claimed_amount ?? 0,
    approved_amount: li.approved_amount ?? 0,
    deduction_amount: (li.claimed_amount ?? 0) - (li.approved_amount ?? 0),
    audit_notes: li.rejection_reason
      ? [{ tag: "", message: li.rejection_reason }]
      : [],
    human_edited: li.human_edited ?? false,
  }));

  return {
    id: r.reim_id,
    employee: {
      name: employeeName,
      initials: getInitials(employeeName),
      employee_no: r.user_id ?? "",
      position: "",
      department: deptName,
      location: "",
      entity: "Reclaim Sdn. Bhd.",
      email: "",
    },
    submitted_at: r.created_at ?? new Date().toISOString(),
    travel_destination: "",
    travel_purpose: r.summary?.split(".")[0] ?? "",
    departure_date: "",
    arrival_date: "",
    is_overseas: false,
    line_items: lineItems,
    totals: {
      total_requested: r.total_claimed_amount ?? 0,
      total_deduction: r.total_rejected_amount ?? 0,
      net_approved: r.total_approved_amount ?? 0,
    },
    overall_judgment: (r.judgment ?? "PENDING") as "APPROVED" | "REJECTED" | "PARTIAL_APPROVE" | "PENDING",
    confidence: r.confidence ?? 0,
    summary: r.summary ?? "",
    overall_status: judgmentToAiStatus(r.judgment),
    audit_log: [
      {
        id: "al-auto",
        timestamp: formatDate(r.created_at),
        actor: "Reclaim AI",
        action: `Judgment: ${r.judgment} (confidence ${Math.round((r.confidence ?? 0) * 100)}%)`,
      },
    ],
  };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Fetch all reimbursements and bucket them for the HR dashboard.
 *
 * - attention : status=REVIEW (all ages) — HR must act
 * - passed    : auto-approved (reviewed_by=null) within 24 h — informational
 * - flagged   : auto-rejected (reviewed_by=null) within 24 h — informational
 *
 * All buckets sorted most-recent first.
 */
export async function getHRClaims(): Promise<{
  attention: Claim[];
  passed: Claim[];
  flagged: Claim[];
  allReims: ReimbursementRaw[];
}> {
  const result = await apiGet<ReimbursementRaw[]>(`${API_PREFIX}/reimbursements/`);

  if (!result.data || result.data.length === 0) {
    return { attention: [], passed: [], flagged: [], allReims: [] };
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const byRecent = (a: ReimbursementRaw, b: ReimbursementRaw) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();

  const attention: Claim[] = [];
  const passed: Claim[] = [];
  const flagged: Claim[] = [];

  const sorted = [...result.data].sort(byRecent);

  for (const r of sorted) {
    const isAutoProcessed = r.reviewed_by == null;
    const createdAt = r.created_at ? new Date(r.created_at) : null;
    const isRecent = createdAt != null && createdAt >= cutoff;

    if (r.status === "REVIEW") {
      attention.push(mapToClaim(r));
    } else if (
      isAutoProcessed &&
      isRecent &&
      ["APPROVED", "DISBURSING", "PAID"].includes(r.status)
    ) {
      passed.push(mapToClaim(r));
    } else if (isAutoProcessed && isRecent && r.status === "REJECTED") {
      flagged.push(mapToClaim(r));
    }
  }

  return { attention, passed, flagged, allReims: result.data };
}

export interface HistoryClaim {
  id: string;        // display: RC-XXXXXXXX
  reim_id: string;   // full UUID for navigation
  employeeName: string;
  employeeInitial: string;
  department: string;
  policyName: string;
  amount: number;
  currency: string;
  dateSubmitted: string;
  dateResolved: string;
  status: "Approved" | "Rejected" | "Paid";
}

/**
 * Fetch all resolved reimbursements for the history tab.
 * Includes:
 *   - All HR-reviewed claims (reviewed_by != null), any age
 *   - Auto-processed claims older than 24 h (reviewed_by == null, created_at < cutoff)
 * Excludes REVIEW status (lives in Required Attention) and
 * auto-processed claims within 24 h (lives in dashboard tabs).
 */
export async function getHRHistory(): Promise<HistoryClaim[]> {
  const result = await apiGet<ReimbursementRaw[]>(`${API_PREFIX}/reimbursements/`);
  if (!result.data) return [];

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const statusMap: Record<string, "Approved" | "Rejected" | "Paid" | null> = {
    APPROVED: "Approved",
    DISBURSING: "Approved",
    PAID: "Paid",
    REJECTED: "Rejected",
    DISBURSEMENT_FAILED: "Rejected",
  };

  return result.data
    .filter((r) => {
      if (r.status === "REVIEW" || r.status === "PENDING" || r.status === "APPEALED") return false;
      const isAutoProcessed = r.reviewed_by == null;
      const createdAt = r.created_at ? new Date(r.created_at) : null;
      const isRecent = createdAt != null && createdAt >= cutoff;
      const isResolved = ["APPROVED", "DISBURSING", "PAID", "REJECTED"].includes(r.status);
      if (isAutoProcessed && isRecent && !isResolved) return false; // exclude only unresolved
      return statusMap[r.status] != null;
    })
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    )
    .map((r) => {
      const name = r.employee_name ?? "Unknown";
      const resolvedDate = r.reviewed_at ?? r.updated_at ?? r.created_at;
      return {
        id: `RC-${r.reim_id.slice(0, 8).toUpperCase()}`,
        reim_id: r.reim_id,
        employeeName: name,
        employeeInitial: name.charAt(0).toUpperCase(),
        department: r.department_name ?? "—",
        policyName: r.policy_name ?? r.main_category ?? "General",
        amount: r.total_claimed_amount ?? 0,
        currency: r.currency ?? "MYR",
        dateSubmitted: formatDate(r.created_at),
        dateResolved: formatDate(resolvedDate ?? null),
        status: statusMap[r.status] as "Approved" | "Rejected" | "Paid",
      };
    });
}

/** Fetch a single reimbursement by reim_id and map to ClaimBundle for detail view. */
export async function getHRClaimBundle(reimId: string): Promise<ClaimBundle | null> {
  const result = await apiGet<ReimbursementRaw>(`${API_PREFIX}/reimbursements/${reimId}`);
  if (!result.data) return null;
  return mapToBundle(result.data);
}

/** HR updates the status of a reimbursement (approve / reject). */
export async function updateReimbursementStatus(
  reimId: string,
  status: "APPROVED" | "REJECTED" | "REVIEW",
  reviewedBy: string,
  options?: {
    lineItems?: Array<{ line_item_id: string; approved_amount: number }>;
    hrNote?: string;
  },
): Promise<{ ok: boolean; data?: ReimbursementRaw; error?: string }> {
  const body: Record<string, unknown> = { status, reviewed_by: reviewedBy };
  if (options?.lineItems?.length) {
    body.line_items = options.lineItems;
  }
  if (options?.hrNote) {
    body.hr_note = options.hrNote;
  }
  const result = await apiPatch<ReimbursementRaw>(`${API_PREFIX}/reimbursements/${reimId}/status`, body);
  if (result.error) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: result.data ?? undefined };
}

/** Upload a policy PDF to the backend. */
export async function uploadPolicy(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const result = await apiPostMultipart<void>(`${API_PREFIX}/policies/upload`, formData);
  if (result.error) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function triggerPayout(reimId: string): Promise<{ payout: PayoutInfo | null; error: string | null }> {
  const result = await apiPost<PayoutInfo>(`${API_PREFIX}/payouts/`, { reim_id: reimId });
  if (result.error) return { payout: null, error: result.error };
  return { payout: result.data, error: null };
}
