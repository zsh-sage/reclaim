"use server";

// ─── Policies Server Actions ─────────────────────────────────────────────────
// Provides reimbursement policy categories and rules.
// Falls back to hardcoded mock data if the backend is unavailable.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, API_PREFIX } from "@/lib/api/client";
import type { Policy } from "@/lib/api/types";

// ─── Mock Fallback ────────────────────────────────────────────────────────────

const MOCK_POLICIES: Policy[] = [
  {
    policy_id: "mock-policy-1",
    alias: "BTP-2024",
    title: "Business Travel Policy 2024",
    reimbursable_category: ["Transportation", "Accommodation", "Meals", "Others"],
    overview_summary: "Covers business travel expenses including transportation, accommodation, meals, and other incidentals.",
    status: "ACTIVE",
    effective_date: null,
    source_file_url: "",
  },
];

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Fetch all reimbursable policies from the backend. */
export async function getPolicies(): Promise<Policy[]> {
  const result = await apiGet<unknown[]>(`${API_PREFIX}/policies`);
  if (!result.data) return MOCK_POLICIES;

  return result.data.map((item: unknown) => {
    const p = item as Record<string, unknown>;
    return {
      policy_id: p.policy_id as string,
      alias: p.alias as string,
      title: p.title as string,
      reimbursable_category: p.reimbursable_category as string[],
      overview_summary: p.overview_summary as string,
      status: p.status as string,
      effective_date: (p.effective_date as string | null) ?? null,
      source_file_url: (p.source_file_url as string) ?? "",
    };
  });
}
