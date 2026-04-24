"use server";

// ─── Claims Server Actions ───────────────────────────────────────────────────
// Handles fetching claims list, claim details, OCR processing, and submission.
// Falls back to mock data until the backend endpoints are built.
// ──────────────────────────────────────────────────────────────────────────────

import { cookies } from "next/headers";
import { apiGet, apiPost, apiPostMultipart, API_PREFIX } from "@/lib/api/client";
import type {
  ClaimSummary,
  DetailedClaim,
  ExtractedData,
  ClaimSubmissionPayload,
  ReimbursementRaw,
} from "@/lib/api/types";
import { mapReimbursementToClaim } from "@/lib/api/types";

// ─── Mock Fallback ───────────────────────────────────────────────────────────

const MOCK_CLAIMS: ClaimSummary[] = [
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
    amount: "$24.50",
    amountNumeric: 24.5,
    status: "Approved",
  },
  {
    id: "#RC-8885",
    date: "Oct 15, 2023",
    category: "Equipment",
    subCategory: "Laptop",
    merchant: "Apple Store",
    amount: "$2,450.00",
    amountNumeric: 2450.0,
    status: "Paid",
  },
  {
    id: "#RC-8880",
    date: "Oct 10, 2023",
    category: "Travel",
    subCategory: "Hotel",
    merchant: "Marriott",
    amount: "$450.00",
    amountNumeric: 450.0,
    status: "Approved",
  },
  {
    id: "#RC-8878",
    date: "Oct 05, 2023",
    category: "Meals",
    subCategory: "Dinner",
    merchant: "Steakhouse Inc",
    amount: "$150.00",
    amountNumeric: 150.0,
    status: "Rejected",
  },
  {
    id: "#RC-8875",
    date: "Sep 28, 2023",
    category: "Travel",
    subCategory: "Taxi",
    merchant: "Uber",
    amount: "$45.20",
    amountNumeric: 45.2,
    status: "Approved",
  },
  {
    id: "#RC-8871",
    date: "Sep 25, 2023",
    category: "Office",
    subCategory: "Supplies",
    merchant: "Staples",
    amount: "$89.99",
    amountNumeric: 89.99,
    status: "Approved",
  },
  {
    id: "#RC-8869",
    date: "Sep 20, 2023",
    category: "Travel",
    subCategory: "Bus",
    merchant: "Greyhound",
    amount: "$35.00",
    amountNumeric: 35.0,
    status: "Paid",
  },
  {
    id: "#RC-8860",
    date: "Sep 15, 2023",
    category: "Equipment",
    subCategory: "Peripherals",
    merchant: "Logitech",
    amount: "$120.00",
    amountNumeric: 120.0,
    status: "Approved",
  },
  {
    id: "#RC-8855",
    date: "Sep 10, 2023",
    category: "Meals",
    subCategory: "Lunch",
    merchant: "Panera Bread",
    amount: "$18.50",
    amountNumeric: 18.5,
    status: "Approved",
  },
  {
    id: "#RC-8850",
    date: "Sep 05, 2023",
    category: "Travel",
    subCategory: "Flight",
    merchant: "United Airlines",
    amount: "$420.00",
    amountNumeric: 420.0,
    status: "Approved",
  },
  {
    id: "#RC-8848",
    date: "Aug 29, 2023",
    category: "Travel",
    subCategory: "Hotel",
    merchant: "Hilton",
    amount: "$310.00",
    amountNumeric: 310.0,
    status: "Approved",
  },
  {
    id: "#RC-8840",
    date: "Aug 22, 2023",
    category: "Office",
    subCategory: "Software",
    merchant: "Adobe Systems",
    amount: "$52.99",
    amountNumeric: 52.99,
    status: "Pending",
  },
  {
    id: "#RC-8835",
    date: "Aug 15, 2023",
    category: "Meals",
    subCategory: "Breakfast",
    merchant: "Starbucks",
    amount: "$12.40",
    amountNumeric: 12.4,
    status: "Approved",
  },
  {
    id: "#RC-8830",
    date: "Aug 10, 2023",
    category: "Travel",
    subCategory: "Taxi",
    merchant: "Lyft",
    amount: "$28.00",
    amountNumeric: 28.0,
    status: "Rejected",
  },
];

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Fetch all claims, optionally filtered by status. */
export async function getClaims(status?: string): Promise<ClaimSummary[]> {
  const query = status && status !== "All" ? `?status=${status}` : "";
  const result = await apiGet<ReimbursementRaw[]>(`${API_PREFIX}/reimbursements/${query}`);
  if (result.data) return result.data.map(mapReimbursementToClaim);

  // Fallback to mock data with client-side filtering
  if (status && status !== "All") {
    return MOCK_CLAIMS.filter((c) => c.status === status);
  }
  return MOCK_CLAIMS;
}

/** Fetch full details of a specific claim. */
export async function getClaimById(
  id: string
): Promise<DetailedClaim | null> {
  const result = await apiGet<DetailedClaim>(`${API_PREFIX}/employee/claims/${id}`);
  return result.data ?? null;
}

/** Trigger OCR/AI extraction on an uploaded receipt. */
export async function processReceipt(
  fileKeys: string[]
): Promise<{ data: ExtractedData | null; error: string | null }> {
  const result = await apiPost<ExtractedData>(`${API_PREFIX}/reimbursements/process`, {
    files: fileKeys,
  });
  return result;
}

/** Final submission of a verified claim. */
export async function submitClaim(
  payload: ClaimSubmissionPayload
): Promise<{ data: DetailedClaim | null; error: string | null }> {
  const result = await apiPost<DetailedClaim>(
    `${API_PREFIX}/reimbursements/submit`,
    payload
  );
  return result;
}

/** Upload receipt files to backend for OCR processing. */
export async function uploadDocuments(files: File[]): Promise<DocumentUploadResponse | { error: string }> {
  try {
    const form = new FormData();
    files.forEach(f => form.append("files", f));
    const result = await apiPostMultipart<DocumentUploadResponse>(`${API_PREFIX}/documents/upload`, form);
    if (result.error) return { error: result.error };
    return result.data!;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}

/** Send human OCR corrections to a specific document. */
export async function editDocument(
  documentId: string,
  edits: EditDocumentRequest
): Promise<EditDocumentResponse | { error: string }> {
  try {
    const result = await apiPost<EditDocumentResponse>(`${API_PREFIX}/documents/${documentId}/edits`, edits);
    if (result.error) return { error: result.error };
    return result.data!;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Edit failed" };
  }
}

/** Run compliance analysis on an uploaded settlement against a policy. */
export async function analyzeCompliance(
  req: AnalyzeRequest
): Promise<AnalyzeResponse | { error: string }> {
  try {
    const result = await apiPost<AnalyzeResponse>(`${API_PREFIX}/reimbursements/analyze`, req);
    if (result.error) return { error: result.error };
    return result.data!;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Analysis failed" };
  }
}
