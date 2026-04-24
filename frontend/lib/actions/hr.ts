"use server";

// ─── HR Server Actions ────────────────────────────────────────────────────────
// Fetches reimbursement data for the HR dashboard and detail view.
// HR role receives ALL reimbursements (no user filter on the backend).
// Maps backend ReimbursementRaw → Claim (list row) and ClaimBundle (detail).
// ──────────────────────────────────────────────────────────────────────────────

import { cookies } from "next/headers";
import { apiGet, API_PREFIX } from "@/lib/api/client";
import type { ReimbursementRaw } from "@/lib/api/types";
import type { Claim, ClaimBundle, AiStatus, LineItem } from "@/app/hr/hr_components/mockData";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function judgmentToAiStatus(judgment: string, confidence: number | null): AiStatus {
  if (judgment === "MANUAL REVIEW") return "Awaiting Review";
  if (judgment === "REJECT") return "Policy Flagged";
  if (judgment === "PARTIAL_APPROVE") {
    if (confidence !== null && confidence < 0.6) return "Low Confidence";
    return "Policy Flagged";
  }
  // APPROVE
  if (confidence !== null && confidence < 0.6) return "Low Confidence";
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
  const net = r.totals?.net_approved ?? 0;
  const aiStatus = judgmentToAiStatus(r.judgment, r.confidence ?? null);
  const employeeName = r.employee_department ?? "Unknown";   // best proxy — will improve when backend returns name

  return {
    id: r.reim_id,
    employee: {
      name: employeeName,
      initials: getInitials(employeeName),
    },
    date: formatDate(r.created_at),
    amount: formatCurrency(net, r.currency),
    category: r.main_category ?? "General",
    status: aiStatus,
    note: r.summary ? r.summary.split(".")[0] : undefined,
  };
}

/** Map a raw reimbursement to the ClaimBundle detail shape. */
function mapToBundle(r: ReimbursementRaw): ClaimBundle {
  const employeeName = r.employee_department ?? "Unknown";

  const lineItems: LineItem[] = (r.line_items ?? []).map((li, idx) => ({
    document_id: `${r.reim_id}-li-${idx}`,
    date: r.created_at?.split("T")[0] ?? "",
    category: (li.receipt_name ?? "others").toLowerCase().includes("meal")
      ? "meals"
      : (li.receipt_name ?? "others").toLowerCase().includes("transport")
        ? "transportation"
        : (li.receipt_name ?? "others").toLowerCase().includes("accom")
          ? "accommodation"
          : "others",
    description: li.receipt_name ?? `Receipt ${idx + 1}`,
    status: (li.status as "APPROVED" | "REJECTED" | "PARTIAL_APPROVE" | "PENDING") ?? "PENDING",
    requested_amount: li.requested_amount ?? 0,
    approved_amount: li.approved_amount ?? 0,
    deduction_amount: li.deduction_amount ?? 0,
    audit_notes: li.audit_notes
      ? [{ tag: "", message: li.audit_notes as string }]
      : [],
    human_edited: false,
  }));

  return {
    id: r.reim_id,
    employee: {
      name: employeeName,
      initials: getInitials(employeeName),
      employee_no: r.user_id ?? "",
      position: "",
      department: r.employee_department ?? "",
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
    totals: r.totals ?? { total_requested: 0, total_deduction: 0, net_approved: 0 },
    overall_judgment: (r.judgment as "APPROVED" | "REJECTED" | "PARTIAL_APPROVE" | "PENDING") ?? "PENDING",
    confidence: r.confidence ?? 0,
    summary: r.summary ?? "",
    overall_status: judgmentToAiStatus(r.judgment, r.confidence ?? null),
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

/** Fetch all reimbursements (HR sees everyone's). Returns Claim[] for dashboard list rows. */
export async function getHRClaims(): Promise<{
  attention: Claim[];
  approved: Claim[];
}> {
  const result = await apiGet<ReimbursementRaw[]>(`${API_PREFIX}/reimbursements/`);

  if (!result.data || result.data.length === 0) {
    return { attention: [], approved: [] };
  }

  const attention: Claim[] = [];
  const approved: Claim[] = [];

  for (const r of result.data) {
    const claim = mapToClaim(r);
    if (claim.status === "Passed AI Review") {
      approved.push(claim);
    } else {
      attention.push(claim);
    }
  }

  return { attention, approved };
}

/** Fetch a single reimbursement by reim_id and map to ClaimBundle for detail view. */
export async function getHRClaimBundle(reimId: string): Promise<ClaimBundle | null> {
  // No single-item endpoint yet → fetch all and filter
  const result = await apiGet<ReimbursementRaw[]>(`${API_PREFIX}/reimbursements/`);
  if (!result.data) return null;
  const found = result.data.find((r) => r.reim_id === reimId);
  if (!found) return null;
  return mapToBundle(found);
}

/** HR updates the status of a reimbursement (approve / reject). */
export async function updateReimbursementStatus(
  reimId: string,
  status: "APPROVED" | "REJECTED"
): Promise<{ ok: boolean; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const API_URL =
    process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const res = await fetch(`${API_URL}${API_PREFIX}/reimbursements/${reimId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.detail ?? `Failed (${res.status})` };
  }
  return { ok: true };
}

/** Upload a policy PDF to the backend. */
export async function uploadPolicy(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const API_URL =
    process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const res = await fetch(`${API_URL}${API_PREFIX}/policies/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Note: do NOT set Content-Type — let the browser set multipart boundary
    },
    body: formData,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.detail ?? `Upload failed (${res.status})` };
  }
  return { ok: true };
}
