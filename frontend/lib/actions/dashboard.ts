"use server";

// ─── Dashboard Server Actions ─────────────────────────────────────────────────
// Provides dashboard KPI stats and recent claims.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, API_PREFIX } from "@/lib/api/client";
import type { DashboardStats, ClaimSummary, ReimbursementRaw } from "@/lib/api/types";
import { mapReimbursementToClaim } from "@/lib/api/types";

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Fetch all reimbursements and compute KPI stats server-side. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await apiGet<ReimbursementRaw[]>(`${API_PREFIX}/reimbursements/`);
  if (!result.data || result.data.length === 0) {
    return {
      awaitingReview: { amount: "MYR 0.00", count: 0 },
      reimbursedThisMonth: { amount: "MYR 0.00", count: 0 },
      alreadyPaid: { amount: "MYR 0.00", count: 0 },
    };
  }

  const fmt = (n: number) =>
    `MYR ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const bucket = (statuses: string[]) => {
    const items = result.data!.filter((r) => statuses.includes(r.status));
    return { amount: fmt(items.reduce((s, r) => s + (r.total_claimed_amount ?? 0), 0)), count: items.length };
  };

  return {
    awaitingReview: bucket(["REVIEW", "PENDING", "APPEALED"]),
    reimbursedThisMonth: bucket(["APPROVED"]),
    alreadyPaid: bucket(["PAID"]),
  };
}

/** Fetch the N most recent claims for the dashboard table. */
export async function getRecentClaims(limit = 5): Promise<ClaimSummary[]> {
  const result = await apiGet<ReimbursementRaw[]>(
    `${API_PREFIX}/reimbursements/?limit=${limit}`
  );
  if (result.data) return result.data.map(mapReimbursementToClaim);
  return [];
}
