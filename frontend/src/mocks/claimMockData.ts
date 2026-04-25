// ─── claimMockData.ts ─────────────────────────────────────────────────────────
// Mock data removed — all data now comes from backend API calls.
//   - Employee profile  → GET /api/v1/auth/me
//   - OCR results       → POST /api/v1/documents/upload
// ─────────────────────────────────────────────────────────────────────────────

import type { DbEmployee, OcrReceiptData } from "../types/claim";

/** Empty fallback — the UI should fetch real data before rendering. */
export const MOCK_DB_DATA: DbEmployee = {
  entityName:     "",
  employeeName:   "",
  employeeNumber: "",
  position:       "",
  location:       "",
  department:     "",
};

/** Empty fallback — OCR data comes from the upload API. */
export const MOCK_OCR_RECEIPTS: OcrReceiptData[] = [];
