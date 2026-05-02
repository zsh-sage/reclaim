"use server";

// ─── Claims Server Actions ───────────────────────────────────────────────────
// Handles fetching claims list, claim details, OCR processing, and submission.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost, apiPut, apiDelete, apiPostMultipart, API_PREFIX } from "@/lib/api/client";
import type {
  ClaimSummary,
  DetailedClaim,
  ReimbursementRaw,
  PayoutInfo,
  DocumentUploadResponse,
  EditDocumentRequest,
  EditDocumentResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeResponseMulti,
  DraftSummary,
  DraftFull,
  DraftSaveRequest,
  DraftCountResponse,
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

/** Run autonomous compliance analysis — routes each receipt to its matched policy. */
export async function analyzeCompliance(
  req: AnalyzeRequest
): Promise<AnalyzeResponseMulti | { error: string }> {
  try {
    const result = await apiPost<AnalyzeResponseMulti>(`${API_PREFIX}/reimbursements/analyze`, req);
    if (result.error) return { error: result.error };
    return result.data!;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Analysis failed" };
  }
}

// ─── Draft Actions ───────────────────────────────────────────────────────────

/** Get the number of drafts for the current user (sidebar badge). */
export async function getDraftCount(): Promise<number> {
  try {
    const result = await apiGet<DraftCountResponse>(`${API_PREFIX}/drafts/count`);
    return result.data?.count ?? 0;
  } catch {
    return 0;
  }
}

/** List all drafts for the current user (summary only, no full data). */
export async function listDrafts(): Promise<DraftSummary[]> {
  try {
    const result = await apiGet<DraftSummary[]>(`${API_PREFIX}/drafts/`);
    return result.data ?? [];
  } catch {
    return [];
  }
}

/** Load a specific draft with full data (for resuming a claim). */
export async function loadDraft(draftId: string): Promise<DraftFull | { error: string }> {
  try {
    const result = await apiGet<DraftFull>(`${API_PREFIX}/drafts/${draftId}`);
    if (result.error) return { error: result.error };
    return result.data!;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to load draft" };
  }
}

/** Save a new draft. */
export async function saveDraft(data: DraftSaveRequest): Promise<DraftFull | { error: string }> {
  try {
    const result = await apiPost<DraftFull>(`${API_PREFIX}/drafts/`, data);
    if (result.error) return { error: result.error };
    return result.data!;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save draft" };
  }
}

/** Update an existing draft. */
export async function updateDraft(draftId: string, data: Partial<DraftSaveRequest>): Promise<DraftFull | { error: string }> {
  try {
    const result = await apiPut<DraftFull>(`${API_PREFIX}/drafts/${draftId}`, data);
    if (result.error) return { error: result.error };
    return result.data!;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update draft" };
  }
}

/** Delete a draft. */
export async function deleteDraft(draftId: string): Promise<{ error?: string }> {
  try {
    const result = await apiDelete<void>(`${API_PREFIX}/drafts/${draftId}`);
    if (result.error) return { error: result.error };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete draft" };
  }
}

export async function getPayoutStatus(reimId: string): Promise<PayoutInfo | null> {
  const result = await apiGet<PayoutInfo>(`${API_PREFIX}/payouts/${reimId}`);
  if (result.data) return result.data;
  return null;
}

