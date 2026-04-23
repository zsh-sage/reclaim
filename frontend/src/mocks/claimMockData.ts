// ─── claimMockData.ts ─────────────────────────────────────────────────────────
// Mock data for the claim submission flow.
// BACKEND HANDOFF: Replace these exports with actual API fetch calls.
//   - MOCK_DB_DATA  → GET /api/me  (employee profile)
//   - MOCK_OCR_RECEIPTS → POST /api/ocr  (vision extraction results)
// ─────────────────────────────────────────────────────────────────────────────

import type { DbEmployee, OcrReceiptData } from "../types/claim";

/**
 * Simulated employee record pulled from the database.
 * Rendered read-only in Section 1 of the verification form.
 */
export const MOCK_DB_DATA: DbEmployee = {
  entityName:     "Reclaim Holdings Sdn. Bhd.",
  employeeName:   "Ahmad Farhan bin Aziz",
  employeeNumber: "EMP-2024-0042",
  position:       "Senior Business Analyst",
  location:       "Kuala Lumpur, Malaysia",
  department:     "Finance & Operations",
};

/**
 * Simulated OCR responses, one entry per uploaded receipt.
 * The UI maps `receipts[i]` to `uploadedFiles[i]` by index.
 *
 * BACKEND HANDOFF:
 *   const results = await fetch("/api/ocr", { method: "POST", body: formData });
 *   const ocrReceipts: OcrReceiptData[] = await results.json();
 */
export const MOCK_OCR_RECEIPTS: OcrReceiptData[] = [
  {
    receiptIndex:  0,
    success:       true,
    expenseDate:   "2024-10-24",
    merchant:      "Bouchon Bistro",
    transport:     0,
    accommodation: 0,
    meals:         342.50,
    others:        0,
    notes:         "Business dinner with Acme Corp team",
  },
  {
    receiptIndex:  1,
    success:       true,
    expenseDate:   "2024-10-25",
    merchant:      "Grab Ride",
    transport:     45.00,
    accommodation: 0,
    meals:         0,
    others:        0,
    notes:         "",
  },
  {
    receiptIndex:  2,
    success:       true,
    expenseDate:   "2024-10-25",
    merchant:      "Dorsett Hotel KL",
    transport:     0,
    accommodation: 520.00,
    meals:         0,
    others:        0,
    notes:         "2 nights accommodation",
  },
  // receiptIndex 3 intentionally fails — tests blank fields + "Required" validation
  {
    receiptIndex:  3,
    success:       false,
    expenseDate:   "",
    merchant:      "",
    transport:     0,
    accommodation: 0,
    meals:         0,
    others:        0,
    notes:         "",
  },
];
