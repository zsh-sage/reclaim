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
  /** Backend settlement ID — used for PDF/template download. */
  settlementId?: string | null;
  /** Settlement template endpoint URL. */
  settlementTemplateUrl?: string;
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

// ─── Mock Claims (removed — now fetched from backend) ────────────────────────

export const HISTORY_CLAIMS: HistoryClaim[] = [];
