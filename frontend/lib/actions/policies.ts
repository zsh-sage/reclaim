"use server";

// ─── Policies Server Actions ─────────────────────────────────────────────────
// Provides reimbursement policy categories and rules.
// Falls back to hardcoded mock data if the backend is unavailable.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, apiDelete, apiPatch, API_PREFIX } from "@/lib/api/client";
import type { Policy, PolicyCategoryBudget } from "@/lib/api/types";

// ─── Mock Fallback ────────────────────────────────────────────────────────────

const MOCK_POLICIES: Policy[] = [
  {
    policy_id: "mock-policy-1",
    alias: "BTP-2024",
    title: "Business Travel Policy",
    reimbursable_categories: [
      "Air Transportation",
      "Train",
      "Ferry",
      "Shuttle Bus",
      "Other Transportation",
      "Car Rental",
      "Personal Vehicle Usage",
      "Daily Trip Allowance (Diem Allowance)",
      "Accommodations",
      "Seaport/Airport Tax",
      "Travel Insurance",
      "Internet Expenses",
      "Telephone (Business & Private Calls)",
      "Laundry",
      "Minibar (Non-Alcohol)",
      "Parking",
      "Toll Expenses",
      "Client's Entertainment",
      "Inner City Transportation",
      "Intercity Transportation",
      "Remote Area Transportation",
      "Residence/Office to Airport Transportation",
    ],
    effective_date: null,
    overview_summary: "Covers business travel expenses including transportation, accommodation, meals, and other incidentals.",
    source_file_url: "",
    status: "ACTIVE",
    mandatory_conditions: JSON.stringify({
      "Air Transportation": {
        condition: [
          "Economy class for all employees (non-executives)",
          "Economy class refers to budget airline, except ticket issued 2 weeks prior departure may choose preferred airline",
          "Changing issued ticket to and from destination city will be subject to President Director approval",
        ],
      },
      Train: {
        condition: ["Economy class for all employees (non-executives)"],
      },
      Ferry: {
        condition: ["Economy class for all employees (non-executives)"],
      },
      "Shuttle Bus": {
        condition: ["Economy class for all employees (non-executives)"],
      },
      "Other Transportation": {
        condition: ["Economy class for all employees (non-executives)"],
      },
      "Car Rental": {
        condition: [
          "Approval from President Director required",
          "Conditions: less expensive than other transportation modes, for entertaining company customers, more than 3 employees traveling together, or using taxi is not a more practical option",
        ],
      },
      "Personal Vehicle Usage": {
        condition: [
          "Approval from BOD/Chief Department required",
          "Conditions: prior approved in writing by Line Manager, less expensive than hiring a car or taking a taxi, or more timely than taking public transportation",
        ],
      },
      "Daily Trip Allowance (Diem Allowance)": {
        condition: [
          "Calculated based on duration of trip according to employee entitlement based on job grade",
          "Departure time before 12.00 p.m. and/or arrival time after 12.00 p.m. shall be calculated as 1 full day trip",
          "Departure time after 12.00 p.m. and/or arrival time before 12.00 p.m. shall be calculated as a half day",
        ],
      },
      Accommodations: {
        condition: [
          "Employees may accept a room upgrade if the upgrade is at no additional cost to Company",
          "Only Employee with grade 9 and above entitle to reserve a single occupancy during a group Business Travel",
        ],
      },
      "Seaport/Airport Tax": {
        condition: [
          "Reimbursement for Business Travel transportation costs covering seaport/airport tax",
        ],
      },
      "Travel Insurance": {
        condition: [
          "Reimbursement for Business Travel transportation costs covering travel insurance if applicable",
        ],
      },
      "Internet Expenses": {
        condition: [
          "Full reimbursement for Employee with grade 8 and above",
        ],
      },
      "Telephone (Business & Private Calls)": {
        condition: [
          "Full reimbursement for Employee with grade 8 and above",
        ],
      },
      Laundry: {
        condition: [
          "Full reimbursement for Employee with grade 8 and above, minimum 3 days trip and maximum 2 sets",
        ],
      },
      "Minibar (Non-Alcohol)": {
        condition: [
          "Full reimbursement for Employee with grade 8 and above, non-alcohol only",
        ],
      },
      Parking: {
        condition: [
          "Full reimbursement for Employee with grade 8 and above",
        ],
      },
      "Toll Expenses": {
        condition: [
          "Full reimbursement for Employee with grade 8 and above",
        ],
      },
      "Client's Entertainment": {
        condition: [
          "Refer to compliance regulation (Gifts and Entertainment Policy)",
        ],
      },
      "Inner City Transportation": {
        condition: [
          "Full reimbursement for Employee with grade 8 and above",
        ],
      },
      "Intercity Transportation": {
        condition: [
          "Full reimbursement for Employee with grade 8 and above, maximum MYR 90.00 per day for other intercity transportation mode in remote area",
        ],
      },
      "Remote Area Transportation": {
        condition: [
          "Full reimbursement for Employee with grade 8 and above, maximum MYR 90.00 per day for other intercity transportation mode in remote area",
        ],
      },
      "Residence/Office to Airport Transportation": {
        condition: [
          "Company will provide payment based on reimbursement of actual transportation costs",
        ],
      },
    }),
  },
];

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Fetch all reimbursable policies from the backend. */
export async function getPolicies(): Promise<Policy[]> {
  const result = await apiGet<unknown[]>(`${API_PREFIX}/policies/`);
  if (!result.data) return MOCK_POLICIES;

  return result.data.map((item: unknown) => {
    const p = item as Record<string, unknown>;
    return {
      policy_id: p.policy_id as string,
      alias: p.alias as string,
      title: p.title as string,
      reimbursable_categories: (p.reimbursable_categories ?? p.reimbursable_category ?? []) as string[],
      reimbursable_categories_with_budgets: (p.reimbursable_categories_with_budgets ?? []) as PolicyCategoryBudget[],
      overview_summary: p.overview_summary as string,
      status: p.status as "DRAFT" | "ACTIVE" | "DEPRECATED",
      effective_date: (p.effective_date as string | null) ?? null,
      expiry_date: (p.expiry_date as string | null) ?? null,
      mandatory_conditions: (p.mandatory_conditions as string) ?? "",
      source_file_url: (p.source_file_url as string) ?? "",
      created_by: (p.created_by as string) ?? undefined,
    };
  });
}

/** Delete a policy by its ID. Returns { ok: true } on success or { ok: false, error } on failure. */
export async function deletePolicy(policyId: string): Promise<{ ok: boolean; error?: string }> {
  const result = await apiDelete<null>(`${API_PREFIX}/policies/${policyId}`);
  if (result.error) return { ok: false, error: result.error };
  return { ok: true };
}

/** Update auto-approval budgets for policy categories. */
export async function updatePolicyCategories(
  policyId: string,
  categories: { category: string; auto_approval_budget: number | null }[]
): Promise<{ ok: boolean; error?: string }> {
  const result = await apiPatch<void>(`${API_PREFIX}/policies/${policyId}/categories`, {
    categories,
  });
  if (result.error) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}
