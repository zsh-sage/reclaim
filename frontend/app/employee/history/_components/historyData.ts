"use client";
// ─── historyData.ts ─────────────────────────────────────────────────────────
// Single source of truth for all claim history types, mock data, and helpers.
// Lives entirely within frontend/app/employee/history/ — no external deps.
// ────────────────────────────────────────────────────────────────────────────

import {
  Plane,
  UtensilsCrossed,
  Monitor,
  FileText,
  Bus,
  Car,
  Hotel,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ClaimStatus =
  | "Pending"
  | "Approved"
  | "Partially Approved"
  | "Paid"
  | "Rejected";

/** A single deduction reason attached to a line item. */
export interface Adjustment {
  code: string;         // e.g. "EXCEEDS_CAP"
  description: string;  // human-readable text shown in the drawer
}

/** One receipt / expense row within a claim. */
export interface LineItem {
  receiptRef: string;                             // e.g. "REC-01"
  category: string;
  requested: number;
  approved: number;
  lineStatus: "Approved" | "Adjusted" | "Rejected" | "Pending";
  adjustments: Adjustment[];                      // empty when lineStatus === "Approved" or "Pending"
}

export interface HistoryClaim {
  id: string;
  date: string;
  category: string;
  subCategory: string;
  categoryIcon: LucideIcon;
  merchant: string;
  amount: string;           // pre-formatted, e.g. "RM 1,200.00"
  amountNumeric: number;
  approvedAmount: number;
  status: ClaimStatus;
  hrNote?: string;
  lineItems: LineItem[];
  receiptCount: number;
  /** Backend URL used by the Download PDF button. */
  pdfDownloadUrl: string;
  employee: {
    name: string;
    id: string;
    department: string;
    position: string;
  };
  claimContext: {
    destination?: string;
    purpose: string;
    departurDate?: string;
    arrivalDate?: string;
    overseas: boolean;
  };
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export const STATUS_BADGE: Record<ClaimStatus, string> = {
  Pending:              "bg-secondary-container/50 text-on-secondary-container",
  Approved:             "bg-primary/10 text-primary",
  "Partially Approved": "bg-amber-500/10 text-amber-600",
  Paid:                 "bg-tertiary/10 text-tertiary",
  Rejected:             "bg-error/10 text-error",
};

export const STATUS_DOT: Record<ClaimStatus, string> = {
  Pending:              "bg-secondary",
  Approved:             "bg-primary",
  "Partially Approved": "bg-amber-500",
  Paid:                 "bg-tertiary",
  Rejected:             "bg-error",
};

// ─── Shared employee ──────────────────────────────────────────────────────────

const ME = {
  name:       "Alex Tan Wei Ming",
  id:         "EMP-00421",
  department: "Product & Engineering",
  position:   "Senior Software Engineer",
};

// ─── Mock Claims ─────────────────────────────────────────────────────────────

export const HISTORY_CLAIMS: HistoryClaim[] = [

  // ── COMPLEX CASE: 10 RECEIPTS, PARTIALLY APPROVED ──────────────────────────
  {
    id:             "#RC-9001",
    date:           "Nov 01, 2023",
    category:       "Travel",
    subCategory:    "Business Trip",
    categoryIcon:   Plane,
    merchant:       "Multi-Vendor Business Trip",
    amount:         "RM 4,850.00",
    amountNumeric:  4850,
    approvedAmount: 2680,
    status:         "Partially Approved",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-9001/pdf",
    hrNote:
      "Claim partially approved. Flight, hotel (3 nights), and airport limousine reimbursed in full. Per-diem meals capped at RM 80/day per overseas policy. Business class upgrade and personal entertainment were disallowed.",
    receiptCount: 10,
    employee: ME,
    claimContext: {
      destination:  "Kuala Lumpur → Tokyo, Japan",
      purpose:      "Annual Asia-Pacific Enterprise Summit 2023",
      departurDate: "Oct 28, 2023",
      arrivalDate:  "Nov 01, 2023",
      overseas:     true,
    },
    lineItems: [
      // Receipts 1–5: Fully Approved
      {
        receiptRef: "REC-01",
        category:   "Economy Class Flight (KL → Tokyo)",
        requested:  1200,
        approved:   1200,
        lineStatus: "Approved",
        adjustments: [],
      },
      {
        receiptRef: "REC-02",
        category:   "Hotel — Night 1 (Shinjuku Grand)",
        requested:  420,
        approved:   420,
        lineStatus: "Approved",
        adjustments: [],
      },
      {
        receiptRef: "REC-03",
        category:   "Hotel — Night 2 (Shinjuku Grand)",
        requested:  420,
        approved:   420,
        lineStatus: "Approved",
        adjustments: [],
      },
      {
        receiptRef: "REC-04",
        category:   "Hotel — Night 3 (Shinjuku Grand)",
        requested:  420,
        approved:   420,
        lineStatus: "Approved",
        adjustments: [],
      },
      {
        receiptRef: "REC-05",
        category:   "Airport Limousine (KLIA → KL Sentral)",
        requested:  80,
        approved:   80,
        lineStatus: "Approved",
        adjustments: [],
      },
      // Receipts 6–8: Adjusted
      {
        receiptRef: "REC-06",
        category:   "Meals — Day 1 (Client Dinner, Fugu Restaurant)",
        requested:  380,
        approved:   80,
        lineStatus: "Adjusted",
        adjustments: [
          { code: "MEALS_CAP_EXCEEDED",  description: "Meal allowance capped at RM 80/day for overseas travel." },
          { code: "ALCOHOL_DEDUCTED",    description: "Alcoholic beverages (RM 120) deducted — non-reimbursable per policy." },
          { code: "NON_ITEMISED",        description: "RM 180 portion lacked itemised receipt. Approved minimum only." },
        ],
      },
      {
        receiptRef: "REC-07",
        category:   "Meals — Day 2 (Team Lunch, Sushi Saito)",
        requested:  280,
        approved:   80,
        lineStatus: "Adjusted",
        adjustments: [
          { code: "MEALS_CAP_EXCEEDED",    description: "Meal allowance capped at RM 80/day for overseas travel." },
          { code: "NON_REIMBURSABLE_ITEMS",description: "Personal purchases (souvenirs) bundled into bill — RM 200 disallowed." },
        ],
      },
      {
        receiptRef: "REC-08",
        category:   "Ground Transport — City Taxi (3 days)",
        requested:  350,
        approved:   160,
        lineStatus: "Adjusted",
        adjustments: [
          { code: "TRANSPORT_CAP",  description: "Ground transport capped at RM 160 for a 4-day trip per policy." },
          { code: "PERSONAL_TRIPS", description: "2 taxi rides identified as non-business destinations (est. RM 190) — disallowed." },
        ],
      },
      // Receipts 9–10: Rejected
      {
        receiptRef: "REC-09",
        category:   "Business Class Seat Upgrade (Return Flight)",
        requested:  950,
        approved:   0,
        lineStatus: "Rejected",
        adjustments: [
          { code: "NO_PREAPPROVAL",      description: "Business class upgrades require VP-level pre-approval. None obtained." },
          { code: "EXCEEDS_FLIGHT_POLICY",description: "Policy allows Economy only for routes under 8 hours (this route: 7h 20m)." },
        ],
      },
      {
        receiptRef: "REC-10",
        category:   "Personal Entertainment (Tokyo Skytree + Teamlab)",
        requested:  350,
        approved:   0,
        lineStatus: "Rejected",
        adjustments: [
          { code: "NON_BUSINESS",    description: "Tourism activities are not covered under the business travel policy." },
          { code: "MISSING_PURPOSE", description: "No business justification submitted with this receipt." },
        ],
      },
    ],
  },

  // ── PENDING ────────────────────────────────────────────────────────────────
  {
    id:             "#RC-8892",
    date:           "Oct 24, 2023",
    category:       "Travel",
    subCategory:    "Flight",
    categoryIcon:   Plane,
    merchant:       "Delta Airlines",
    amount:         "RM 1,200.00",
    amountNumeric:  1200,
    approvedAmount: 0,
    status:         "Pending",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8892/pdf",
    receiptCount:   3,
    employee:       ME,
    claimContext: {
      destination:  "Kuala Lumpur → Singapore",
      purpose:      "Q4 Product Review & Client Meetings",
      departurDate: "Oct 24, 2023",
      arrivalDate:  "Oct 27, 2023",
      overseas:     true,
    },
    lineItems: [
      { receiptRef: "REC-01", category: "Flight",           requested: 1000, approved: 0, lineStatus: "Pending", adjustments: [] },
      { receiptRef: "REC-02", category: "In-flight Meals",  requested: 150,  approved: 0, lineStatus: "Pending", adjustments: [] },
      { receiptRef: "REC-03", category: "Airport Transfer", requested: 50,   approved: 0, lineStatus: "Pending", adjustments: [] },
    ],
  },

  // ── APPROVED ───────────────────────────────────────────────────────────────
  {
    id:             "#RC-8891",
    date:           "Oct 22, 2023",
    category:       "Meals",
    subCategory:    "Lunch",
    categoryIcon:   UtensilsCrossed,
    merchant:       "Sweetgreen",
    amount:         "RM 24.50",
    amountNumeric:  24.5,
    approvedAmount: 24.5,
    status:         "Approved",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8891/pdf",
    hrNote:         "Approved within daily meal allowance. No issues found.",
    receiptCount:   1,
    employee:       ME,
    claimContext:   { purpose: "Team working lunch", overseas: false },
    lineItems: [
      { receiptRef: "REC-01", category: "Lunch", requested: 24.5, approved: 24.5, lineStatus: "Approved", adjustments: [] },
    ],
  },

  // ── PARTIALLY APPROVED ─────────────────────────────────────────────────────
  {
    id:             "#RC-8885",
    date:           "Oct 15, 2023",
    category:       "Equipment",
    subCategory:    "Laptop",
    categoryIcon:   Monitor,
    merchant:       "Apple Store",
    amount:         "RM 2,450.00",
    amountNumeric:  2450,
    approvedAmount: 1500,
    status:         "Partially Approved",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8885/pdf",
    hrNote:         "Laptop approved up to the RM 1,500 equipment cap. Accessories and AppleCare require additional pre-approval.",
    receiptCount:   2,
    employee:       ME,
    claimContext:   { purpose: "Replacement laptop for development work", overseas: false },
    lineItems: [
      {
        receiptRef: "REC-01", category: "Laptop (MacBook Pro)",
        requested: 2000, approved: 1500, lineStatus: "Adjusted",
        adjustments: [{ code: "EXCEEDS_CAP", description: "Exceeds RM 1,500 equipment cap per policy." }],
      },
      {
        receiptRef: "REC-02", category: "Accessories (Mouse, Hub)",
        requested: 350, approved: 0, lineStatus: "Rejected",
        adjustments: [
          { code: "MISSING_APPROVAL", description: "Accessories require a separate pre-approval form." },
          { code: "MISSING_RECEIPT",  description: "Missing itemised vendor receipt." },
        ],
      },
      {
        receiptRef: "REC-02", category: "AppleCare+",
        requested: 100, approved: 0, lineStatus: "Rejected",
        adjustments: [{ code: "NON_REIMBURSABLE", description: "Extended warranties are non-reimbursable." }],
      },
    ],
  },

  // ── APPROVED ───────────────────────────────────────────────────────────────
  {
    id:             "#RC-8880",
    date:           "Oct 10, 2023",
    category:       "Travel",
    subCategory:    "Hotel",
    categoryIcon:   Hotel,
    merchant:       "Marriott",
    amount:         "RM 450.00",
    amountNumeric:  450,
    approvedAmount: 450,
    status:         "Approved",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8880/pdf",
    receiptCount:   1,
    employee:       ME,
    claimContext: {
      destination:  "Kuala Lumpur",
      purpose:      "Annual Sales Conference",
      departurDate: "Oct 10, 2023",
      arrivalDate:  "Oct 12, 2023",
      overseas:     false,
    },
    lineItems: [
      { receiptRef: "REC-01", category: "Hotel (3 nights)", requested: 400, approved: 400, lineStatus: "Approved", adjustments: [] },
      { receiptRef: "REC-01", category: "Parking",          requested: 50,  approved: 50,  lineStatus: "Approved", adjustments: [] },
    ],
  },

  // ── REJECTED ───────────────────────────────────────────────────────────────
  {
    id:             "#RC-8878",
    date:           "Oct 05, 2023",
    category:       "Meals",
    subCategory:    "Dinner",
    categoryIcon:   UtensilsCrossed,
    merchant:       "Steakhouse Inc",
    amount:         "RM 150.00",
    amountNumeric:  150,
    approvedAmount: 0,
    status:         "Rejected",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8878/pdf",
    hrNote:         "Claim rejected. This dinner was not associated with a verifiable client meeting.",
    receiptCount:   1,
    employee:       ME,
    claimContext:   { purpose: "Client Entertainment Dinner", overseas: false },
    lineItems: [
      {
        receiptRef: "REC-01", category: "Client Dinner",
        requested: 120, approved: 0, lineStatus: "Rejected",
        adjustments: [
          { code: "NO_CLIENT_MEETING",  description: "No client meeting found in system for this date." },
          { code: "MISSING_BUDGET_CODE",description: "Requires a pre-approved entertainment budget code." },
        ],
      },
      {
        receiptRef: "REC-01", category: "Alcoholic Beverages",
        requested: 30, approved: 0, lineStatus: "Rejected",
        adjustments: [{ code: "NON_REIMBURSABLE", description: "Alcohol is non-reimbursable per company policy." }],
      },
    ],
  },

  // ── APPROVED ───────────────────────────────────────────────────────────────
  {
    id:             "#RC-8875",
    date:           "Sep 28, 2023",
    category:       "Travel",
    subCategory:    "Taxi",
    categoryIcon:   Car,
    merchant:       "Grab",
    amount:         "RM 45.20",
    amountNumeric:  45.2,
    approvedAmount: 45.2,
    status:         "Approved",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8875/pdf",
    receiptCount:   1,
    employee:       ME,
    claimContext:   { purpose: "Airport Transfer", overseas: false },
    lineItems: [
      { receiptRef: "REC-01", category: "Airport Transfer", requested: 45.2, approved: 45.2, lineStatus: "Approved", adjustments: [] },
    ],
  },

  // ── PARTIALLY APPROVED ─────────────────────────────────────────────────────
  {
    id:             "#RC-8871",
    date:           "Sep 25, 2023",
    category:       "Office",
    subCategory:    "Supplies",
    categoryIcon:   FileText,
    merchant:       "Staples",
    amount:         "RM 89.99",
    amountNumeric:  89.99,
    approvedAmount: 64.99,
    status:         "Partially Approved",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8871/pdf",
    hrNote:         "Most items approved. Personal items have been deducted.",
    receiptCount:   1,
    employee:       ME,
    claimContext:   { purpose: "Office supplies replenishment", overseas: false },
    lineItems: [
      { receiptRef: "REC-01", category: "Printer Paper & Pens", requested: 40, approved: 40, lineStatus: "Approved", adjustments: [] },
      { receiptRef: "REC-01", category: "Desk Organizer",       requested: 24.99, approved: 24.99, lineStatus: "Approved", adjustments: [] },
      {
        receiptRef: "REC-01", category: "Personal Notebook",
        requested: 25, approved: 0, lineStatus: "Rejected",
        adjustments: [{ code: "PERSONAL_USE", description: "Personal use items are non-reimbursable." }],
      },
    ],
  },

  // ── PAID ───────────────────────────────────────────────────────────────────
  {
    id:             "#RC-8869",
    date:           "Sep 20, 2023",
    category:       "Travel",
    subCategory:    "Bus",
    categoryIcon:   Bus,
    merchant:       "Greyhound",
    amount:         "RM 35.00",
    amountNumeric:  35,
    approvedAmount: 35,
    status:         "Paid",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8869/pdf",
    receiptCount:   1,
    employee:       ME,
    claimContext:   { purpose: "Inter-city travel to branch office", overseas: false },
    lineItems: [
      { receiptRef: "REC-01", category: "Bus Ticket (Round Trip)", requested: 35, approved: 35, lineStatus: "Approved", adjustments: [] },
    ],
  },

  // ── PARTIALLY APPROVED ─────────────────────────────────────────────────────
  {
    id:             "#RC-8850",
    date:           "Sep 05, 2023",
    category:       "Travel",
    subCategory:    "Flight",
    categoryIcon:   Plane,
    merchant:       "Malaysia Airlines",
    amount:         "RM 620.00",
    amountNumeric:  620,
    approvedAmount: 500,
    status:         "Partially Approved",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8850/pdf",
    hrNote:         "Economy fare reimbursed. Business class upgrade is not covered by policy.",
    receiptCount:   2,
    employee:       ME,
    claimContext: {
      destination:  "KL → Jakarta",
      purpose:      "Partnership Summit",
      departurDate: "Sep 05, 2023",
      arrivalDate:  "Sep 07, 2023",
      overseas:     true,
    },
    lineItems: [
      { receiptRef: "REC-01", category: "Economy Base Fare", requested: 500, approved: 500, lineStatus: "Approved", adjustments: [] },
      {
        receiptRef: "REC-02", category: "Business Class Upgrade",
        requested: 120, approved: 0, lineStatus: "Rejected",
        adjustments: [
          { code: "REQUIRES_VP_APPROVAL", description: "Business class upgrades require VP sign-off." },
          { code: "EXCEEDS_CAP",          description: "Exceeds RM 500 flight cap per trip." },
        ],
      },
    ],
  },

  // ── PENDING ────────────────────────────────────────────────────────────────
  {
    id:             "#RC-8840",
    date:           "Aug 22, 2023",
    category:       "Office",
    subCategory:    "Software",
    categoryIcon:   FileText,
    merchant:       "Adobe Systems",
    amount:         "RM 52.99",
    amountNumeric:  52.99,
    approvedAmount: 0,
    status:         "Pending",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8840/pdf",
    receiptCount:   1,
    employee:       ME,
    claimContext:   { purpose: "Monthly SaaS subscription — design tooling", overseas: false },
    lineItems: [
      { receiptRef: "REC-01", category: "Adobe Creative Cloud (Monthly)", requested: 52.99, approved: 0, lineStatus: "Pending", adjustments: [] },
    ],
  },

  // ── REJECTED ───────────────────────────────────────────────────────────────
  {
    id:             "#RC-8830",
    date:           "Aug 10, 2023",
    category:       "Travel",
    subCategory:    "Taxi",
    categoryIcon:   Car,
    merchant:       "Grab",
    amount:         "RM 28.00",
    amountNumeric:  28,
    approvedAmount: 0,
    status:         "Rejected",
    pdfDownloadUrl: "/api/v1/reimbursements/RC-8830/pdf",
    hrNote:         "No associated business trip found for this date. Personal travel is not covered.",
    receiptCount:   1,
    employee:       ME,
    claimContext:   { purpose: "Ride share", overseas: false },
    lineItems: [
      {
        receiptRef: "REC-01", category: "Ride Share",
        requested: 28, approved: 0, lineStatus: "Rejected",
        adjustments: [
          { code: "NO_BUSINESS_EVENT", description: "No associated business event on this date." },
          { code: "PERSONAL_TRAVEL",   description: "Personal travel is non-reimbursable." },
        ],
      },
    ],
  },
];
