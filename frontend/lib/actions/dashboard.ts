"use server";

// ─── Dashboard Server Actions ─────────────────────────────────────────────────
// Provides dashboard KPI stats and recent claims.
// Falls back to mock data until the backend endpoints are built.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, API_PREFIX } from "@/lib/api/client";
import type { DashboardStats, ClaimSummary, ReimbursementRaw } from "@/lib/api/types";
import { mapReimbursementToClaim } from "@/lib/api/types";

// ─── Mock Fallbacks ──────────────────────────────────────────────────────────

const MOCK_STATS: DashboardStats = {
  awaitingReview: { amount: "$1,240.50", count: 4 },
  reimbursedThisMonth: { amount: "$3,850.00", count: 12 },
  alreadyPaid: { amount: "$450.00", count: 2 },
};

const MOCK_RECENT_CLAIMS: ClaimSummary[] = [
  {
    id: "#RC-8892",
    date: "Oct 24, 2023",
    category: "Travel",
    subCategory: "Flight",
    merchant: "Delta Airlines",
    amount: "$850.00",
    amountNumeric: 850.0,
    status: "Pending",
  },
  {
    id: "#RC-8891",
    date: "Oct 22, 2023",
    category: "Meals",
    subCategory: "Lunch",
    merchant: "Sweetgreen",
    amount: "$124.50",
    amountNumeric: 124.5,
    status: "Approved",
  },
  {
    id: "#RC-8885",
    date: "Oct 15, 2023",
    category: "Equipment",
    subCategory: "Laptop",
    merchant: "Apple Store",
    amount: "$450.00",
    amountNumeric: 450.0,
    status: "Paid",
  },
];

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Fetch all reimbursements and compute KPI stats server-side. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await apiGet<ReimbursementRaw[]>(`${API_PREFIX}/reimbursements/`);
  if (!result.data || result.data.length === 0) return MOCK_STATS;

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const bucket = (statuses: string[]) => {
    const items = result.data!.filter((r) => statuses.includes(r.status));
    return { amount: fmt(items.reduce((s, r) => s + (r.totals?.net_approved ?? 0), 0)), count: items.length };
  };

  return {
    awaitingReview: bucket(["REVIEW", "Pending"]),
    reimbursedThisMonth: bucket(["Approved", "APPROVED"]),
    alreadyPaid: bucket(["Paid", "PAID"]),
  };
}

/** Fetch the N most recent claims for the dashboard table. */
export async function getRecentClaims(limit = 5): Promise<ClaimSummary[]> {
  const result = await apiGet<ReimbursementRaw[]>(
    `${API_PREFIX}/reimbursements/?limit=${limit}`
  );
  if (result.data) return result.data.map(mapReimbursementToClaim);
  return MOCK_RECENT_CLAIMS;
}
