// ─── claim.ts ─────────────────────────────────────────────────────────────────
// Central type definitions for the claim submission flow.
// All components and pages import from here.
// ─────────────────────────────────────────────────────────────────────────────

/** Employee identity pulled from the database (read-only on the form). */
export interface DbEmployee {
  entityName:     string;
  employeeName:   string;
  employeeNumber: string;
  position:       string;
  location:       string;
  department:     string;
}

/** OCR extraction result for a single uploaded receipt. */
export interface OcrReceiptData {
  receiptIndex:  number;
  /** false = OCR failed; all amount fields will be 0, form fields left blank */
  success:       boolean;
  expenseDate:   string;  // "YYYY-MM-DD"
  merchant:      string;
  transport:     number;  // RM
  accommodation: number;  // RM
  meals:         number;  // RM
  others:        number;  // RM
  notes:         string;
}

/** A file that has been selected / captured by the user. */
export interface UploadedFile {
  id:         string;  // used as React key
  name:       string;
  size:       number;  // bytes
  previewUrl: string;  // blob URL — revoke on cleanup
  type:       string;  // MIME, e.g. "image/jpeg" | "application/pdf"
}

/** Travel metadata for the claim envelope (Section 2 of the form). */
export interface ClaimContext {
  travelDestination: string;
  travelPurpose:     string;
  overseas:          boolean;
  departureDate:     string;  // "YYYY-MM-DD"
  arrivalDate:       string;  // "YYYY-MM-DD"
}

/**
 * The final JSON payload sent to the backend on submission.
 * The backend merges this with DB variables and generates the PDF.
 * Frontend does NOT generate any PDF.
 */
export interface ClaimSubmissionPayload {
  dbData:       DbEmployee;
  mainCategory: string;
  claimContext: ClaimContext;
  /** User-validated (possibly edited) OCR receipts */
  receipts:     OcrReceiptData[];
  /** Computed sum of all receipt categories (transport + accommodation + meals + others) */
  subTotal:     number;
  submittedAt:  string;  // ISO 8601
}
