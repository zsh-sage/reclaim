"use server";

// ─── Policies Server Actions ─────────────────────────────────────────────────
// Provides reimbursement policy categories and rules.
// Falls back to the hardcoded policy data that was previously in the claims page
// until the backend /api/policies endpoint is built.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, API_PREFIX } from "@/lib/api/client";
import type { Policy } from "@/lib/api/types";

// ─── Mock Fallback (moved from app/employee/claims/page.tsx) ─────────────────

const MOCK_POLICIES: Policy[] = [
  {
    main_category: "Business Travel Policy",
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
    mandatory_conditions: {
      "Air Transportation": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt or e-receipt (for online transportation)",
        ],
        condition: [
          "Economy class for all employees (non-executives)",
          "Economy class refers to budget airline, except ticket issued 2 weeks prior departure may choose preferred airline",
          "Changing issued ticket to and from destination city will be subject to President Director approval",
        ],
      },
      Train: {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt or e-receipt (for online transportation)",
        ],
        condition: ["Economy class for all employees (non-executives)"],
      },
      Ferry: {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt or e-receipt (for online transportation)",
        ],
        condition: ["Economy class for all employees (non-executives)"],
      },
      "Shuttle Bus": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt or e-receipt (for online transportation)",
        ],
        condition: ["Economy class for all employees (non-executives)"],
      },
      "Other Transportation": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt or e-receipt (for online transportation)",
        ],
        condition: ["Economy class for all employees (non-executives)"],
      },
      "Car Rental": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Approval from President Director required",
          "Conditions: less expensive than other transportation modes, for entertaining company customers, more than 3 employees traveling together, or using taxi is not a more practical option",
        ],
      },
      "Personal Vehicle Usage": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Approval from BOD/Chief Department required",
          "Conditions: prior approved in writing by Line Manager, less expensive than hiring a car or taking a taxi, or more timely than taking public transportation",
        ],
      },
      "Daily Trip Allowance (Diem Allowance)": {
        required_documents: ["Business Travel Settlement Form (Appendix 2b)"],
        condition: [
          "Calculated based on duration of trip according to employee entitlement based on job grade",
          "Departure time before 12.00 p.m. and/or arrival time after 12.00 p.m. shall be calculated as 1 full day trip",
          "Departure time after 12.00 p.m. and/or arrival time before 12.00 p.m. shall be calculated as a half day",
        ],
      },
      Accommodations: {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Employees may accept a room upgrade if the upgrade is at no additional cost to Company",
          "Only Employee with grade 9 and above entitle to reserve a single occupancy during a group Business Travel",
        ],
      },
      "Seaport/Airport Tax": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Reimbursement for Business Travel transportation costs covering seaport/airport tax",
        ],
      },
      "Travel Insurance": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Reimbursement for Business Travel transportation costs covering travel insurance if applicable",
        ],
      },
      "Internet Expenses": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Full reimbursement for Employee with grade 8 and above",
        ],
      },
      "Telephone (Business & Private Calls)": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Full reimbursement for Employee with grade 8 and above",
        ],
      },
      Laundry: {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Full reimbursement for Employee with grade 8 and above, minimum 3 days trip and maximum 2 sets",
        ],
      },
      "Minibar (Non-Alcohol)": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Full reimbursement for Employee with grade 8 and above, non-alcohol only",
        ],
      },
      Parking: {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Full reimbursement for Employee with grade 8 and above",
        ],
      },
      "Toll Expenses": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Full reimbursement for Employee with grade 8 and above",
        ],
      },
      "Client's Entertainment": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Refer to compliance regulation (Gifts and Entertainment Policy)",
        ],
      },
      "Inner City Transportation": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Full reimbursement for Employee with grade 8 and above",
        ],
      },
      "Intercity Transportation": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Full reimbursement for Employee with grade 8 and above, maximum MYR 90.00 per day for other intercity transportation mode in remote area",
        ],
      },
      "Remote Area Transportation": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Full reimbursement for Employee with grade 8 and above, maximum MYR 90.00 per day for other intercity transportation mode in remote area",
        ],
      },
      "Residence/Office to Airport Transportation": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: [
          "Company will provide payment based on reimbursement of actual transportation costs",
        ],
      },
    },
  },
];

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Fetch all reimbursable categories and their policy rules. */
export async function getPolicies(): Promise<Policy[]> {
  const result = await apiGet<unknown[]>(`${API_PREFIX}/policies/`);
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
