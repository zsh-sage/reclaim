"use server";

// ─── Claims Server Actions ───────────────────────────────────────────────────
// Handles fetching claims list, claim details, OCR processing, and submission.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost, apiPostMultipart, API_PREFIX } from "@/lib/api/client";
import type {
  ClaimSummary,
  DetailedClaim,
  ReimbursementRaw,
  DocumentUploadResponse,
  EditDocumentRequest,
  EditDocumentResponse,
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/lib/api/types";
import { mapReimbursementToClaim } from "@/lib/api/types";

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Fetch all claims, optionally filtered by status. */
export async function getClaims(status?: string): Promise<ClaimSummary[]> {
  const query = status && status !== "All" ? `?status=${status}` : "";
  const result = await apiGet<ReimbursementRaw[]>(`${API_PREFIX}/reimbursements/${query}`);
  if (result.data) return result.data.map(mapReimbursementToClaim);
  return [];
}

/** Fetch all reimbursements as raw data (no mapping) — used by history page. */
export async function getRawReimbursements(): Promise<ReimbursementRaw[]> {
  const result = await apiGet<ReimbursementRaw[]>(`${API_PREFIX}/reimbursements/`);
  return result.data ?? [];
}

/** Fetch a single reimbursement as raw data (includes line_items) — used by history page. */
export async function getRawReimbursement(id: string): Promise<ReimbursementRaw | null> {
  const result = await apiGet<ReimbursementRaw>(`${API_PREFIX}/reimbursements/${id}`);
  return result.data ?? null;
}

/** Fetch full details of a specific claim. */
export async function getClaimById(
  id: string
): Promise<DetailedClaim | null> {
  const raw = await getRawReimbursement(id);
  if (!raw) return null;
  const summary = mapReimbursementToClaim(raw);
  return {
    ...summary,
    timeline: [],
    receipts: [],
    clientName: "",
    purpose: "",
  };
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
