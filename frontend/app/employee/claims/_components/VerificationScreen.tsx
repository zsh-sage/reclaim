"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ClipboardList,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
} from "lucide-react";
import type { DbEmployee, OcrReceiptData, ClaimContext } from "../../../../src/types/claim";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `RM ${n.toFixed(2)}`;
}

function receiptRowTotal(r: OcrReceiptData) {
  return r.transport + r.accommodation + r.meals + r.others;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface VerificationScreenProps {
  dbData:               DbEmployee;
  mainCategory:         string;
  /** uploadedFiles intentionally removed — doc preview lives in the Upload stage */
  ocrReceipts:          OcrReceiptData[];
  claimContext:         ClaimContext;
  onClaimContextChange: (ctx: ClaimContext) => void;
  onReceiptsChange:     (receipts: OcrReceiptData[]) => void;
  onBack:               () => void;
  onSubmit:             () => void;
  isSubmitting?:        boolean;
}

// ─── Locked (read-only) field ─────────────────────────────────────────────────

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/15 relative group">
      <label className="block text-[10px] font-bold text-on-surface-variant/60 font-label uppercase tracking-widest mb-1">
        {label}
      </label>
      <div className="text-on-surface font-semibold text-sm font-body pr-5 truncate">
        {value || "—"}
      </div>
      <Lock className="w-3 h-3 text-outline-variant/50 absolute top-3 right-3" />
    </div>
  );
}

// ─── Editable amount input ────────────────────────────────────────────────────

interface AmountInputProps {
  label:    string;
  value:    number;
  onChange: (v: number) => void;
  required?: boolean;
}

function AmountInput({ label, value, onChange, required }: AmountInputProps) {
  const showError = required && value === 0;
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-on-surface-variant font-label">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      <div className={`relative flex items-center bg-surface-container-lowest border rounded-xl overflow-hidden transition-all ${
        showError ? "border-error/60 ring-2 ring-error/10" : "border-outline-variant/30 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10"
      }`}>
        <span className="pl-3 pr-1 text-sm text-on-surface-variant font-body shrink-0">RM</span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={value === 0 ? "" : value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          className="flex-1 bg-transparent text-sm text-on-surface font-body py-2.5 pr-3 focus:outline-none placeholder:text-on-surface-variant/30"
        />
      </div>
      {showError && (
        <p className="text-[11px] text-error font-body flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Required
        </p>
      )}
    </div>
  );
}

// ─── Per-receipt editable card ────────────────────────────────────────────────

interface ReceiptCardProps {
  receipt:  OcrReceiptData;
  index:    number;
  onChange: (r: OcrReceiptData) => void;
}

function ReceiptCard({ receipt, index, onChange }: ReceiptCardProps) {
  const [open, setOpen] = useState(true);
  const total = receiptRowTotal(receipt);

  function patch<K extends keyof OcrReceiptData>(key: K, val: OcrReceiptData[K]) {
    onChange({ ...receipt, [key]: val });
  }

  return (
    <div className={`rounded-2xl border transition-all duration-200 ${
      !receipt.success
        ? "border-amber-300/60 bg-amber-50/50"
        : "border-outline-variant/15 bg-surface-container-lowest"
    } shadow-[0_4px_20px_-4px_rgba(44,47,49,0.06)]`}>

      {/* Card header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 gap-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-label ${
            receipt.success ? "bg-primary/10 text-primary" : "bg-amber-200/70 text-amber-700"
          }`}>
            {index + 1}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface font-headline truncate">
              {receipt.merchant || `Receipt #${index + 1}`}
            </p>
            {receipt.expenseDate && (
              <p className="text-xs text-on-surface-variant font-body">{receipt.expenseDate}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!receipt.success && (
            <span className="text-[11px] font-bold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full font-label">
              Manual Entry
            </span>
          )}
          <span className="text-sm font-bold text-on-surface font-body">{fmt(total)}</span>
          {open
            ? <ChevronUp   className="w-4 h-4 text-outline-variant" strokeWidth={1.75} />
            : <ChevronDown className="w-4 h-4 text-outline-variant" strokeWidth={1.75} />
          }
        </div>
      </button>

      {/* OCR failure warning */}
      {!receipt.success && (
        <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl bg-amber-100/80 border border-amber-200/60 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-xs text-amber-700 font-body leading-relaxed">
            OCR could not read this receipt. Please fill in all fields manually.
          </p>
        </div>
      )}

      {/* Expanded form */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4">

          {/* Date + Merchant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant font-label">
                Expense Date<span className="text-error ml-0.5">*</span>
              </label>
              <input
                type="date"
                value={receipt.expenseDate}
                onChange={e => patch("expenseDate", e.target.value)}
                className={`w-full bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-sm text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all ${
                  !receipt.expenseDate ? "border-error/60 ring-2 ring-error/10" : "border-outline-variant/30"
                }`}
              />
              {!receipt.expenseDate && (
                <p className="text-[11px] text-error font-body flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Required
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant font-label">
                Merchant / Description<span className="text-error ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={receipt.merchant}
                onChange={e => patch("merchant", e.target.value)}
                placeholder="e.g. Grab, Hotel Istana"
                className={`w-full bg-surface-container-lowest border rounded-xl px-3 py-2.5 text-sm text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all placeholder:text-on-surface-variant/30 ${
                  !receipt.merchant ? "border-error/60 ring-2 ring-error/10" : "border-outline-variant/30"
                }`}
              />
              {!receipt.merchant && (
                <p className="text-[11px] text-error font-body flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Required
                </p>
              )}
            </div>
          </div>

          {/* Amount grid */}
          <div className="grid grid-cols-2 gap-3">
            <AmountInput label="Transport"     value={receipt.transport}     onChange={v => patch("transport",     v)} />
            <AmountInput label="Accommodation" value={receipt.accommodation} onChange={v => patch("accommodation", v)} />
            <AmountInput label="Meals"         value={receipt.meals}         onChange={v => patch("meals",         v)} />
            <AmountInput label="Others"        value={receipt.others}        onChange={v => patch("others",        v)} />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant font-label">
              Notes <span className="text-on-surface-variant/40 font-normal">(optional)</span>
            </label>
            <textarea
              value={receipt.notes}
              onChange={e => patch("notes", e.target.value)}
              placeholder="Any additional context for this receipt…"
              rows={2}
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all resize-none placeholder:text-on-surface-variant/30"
            />
          </div>

          {/* Row subtotal */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/10">
            <span className="text-xs text-on-surface-variant font-body">Receipt Subtotal:</span>
            <span className="text-sm font-bold text-on-surface font-headline">{fmt(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live A4 HTML Preview ─────────────────────────────────────────────────────

interface A4PreviewProps {
  dbData:       DbEmployee;
  mainCategory: string;
  claimContext: ClaimContext;
  receipts:     OcrReceiptData[];
  subTotal:     number;
}

function A4Preview({ dbData, mainCategory, claimContext, receipts, subTotal }: A4PreviewProps) {
  const blank = (v: string | number) => {
    if (typeof v === "number") return v > 0 ? fmt(v) : "___________";
    return v || "___________";
  };

  const categories = ["Transport", "Accommodation", "Meals", "Others"];

  return (
    <div
      style={{
        width: 794,
        minHeight: 1123,
        background: "white",
        padding: "48px 56px",
        fontFamily: "'Times New Roman', Georgia, serif",
        fontSize: 12,
        lineHeight: 1.6,
        color: "#1a1a1a",
        boxShadow: "0 4px 40px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 1, textTransform: "uppercase" }}>
          {dbData.entityName}
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Expense Reimbursement</div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            marginTop: 14,
            paddingBottom: 4,
            borderBottom: "2px solid #1a1a1a",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {mainCategory || "Business Travel Expense Claim"}
        </div>
      </div>

      {/* Identity table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 11 }}>
        <tbody>
          {[
            ["Employee Name", dbData.employeeName],
            ["Employee No.",  dbData.employeeNumber],
            ["Position",      dbData.position],
            ["Department",    dbData.department],
            ["Location",      dbData.location],
          ].map(([label, val]) => (
            <tr key={label}>
              <td style={{ width: "30%", paddingBottom: 4, color: "#555", fontWeight: 600 }}>{label}</td>
              <td style={{ width: "3%",  color: "#555" }}>:</td>
              <td style={{ fontWeight: 500 }}>{val || "___________"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Claim context */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 11 }}>
        <tbody>
          {[
            ["Travel Destination", blank(claimContext.travelDestination)],
            ["Travel Purpose",     blank(claimContext.travelPurpose)],
            ["Overseas",          claimContext.overseas ? "Yes" : "No"],
            ["Departure Date",     blank(claimContext.departureDate)],
            ["Arrival Date",      blank(claimContext.arrivalDate)],
          ].map(([label, val]) => (
            <tr key={label}>
              <td style={{ width: "30%", paddingBottom: 4, color: "#555", fontWeight: 600 }}>{label}</td>
              <td style={{ width: "3%",  color: "#555" }}>:</td>
              <td style={{ fontWeight: 500 }}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Expense table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4, fontSize: 11 }}>
        <thead>
          <tr style={{ borderTop: "1.5px solid #1a1a1a", borderBottom: "1px solid #555" }}>
            <th style={{ textAlign: "left",  padding: "6px 4px", fontWeight: 700, width: "5%"  }}>#</th>
            <th style={{ textAlign: "left",  padding: "6px 4px", fontWeight: 700, width: "12%" }}>Date</th>
            <th style={{ textAlign: "left",  padding: "6px 4px", fontWeight: 700, width: "22%" }}>Merchant / Description</th>
            {categories.map(c => (
              <th key={c} style={{ textAlign: "right", padding: "6px 4px", fontWeight: 700 }}>{c} (RM)</th>
            ))}
            <th style={{ textAlign: "right", padding: "6px 4px", fontWeight: 700 }}>Total (RM)</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r, i) => (
            <tr key={i} style={{ borderBottom: "0.5px solid #ddd" }}>
              <td style={{ padding: "5px 4px" }}>{i + 1}</td>
              <td style={{ padding: "5px 4px" }}>{r.expenseDate || "—"}</td>
              <td style={{ padding: "5px 4px" }}>{r.merchant    || "—"}</td>
              <td style={{ textAlign: "right", padding: "5px 4px" }}>{r.transport     > 0 ? r.transport.toFixed(2)     : "—"}</td>
              <td style={{ textAlign: "right", padding: "5px 4px" }}>{r.accommodation > 0 ? r.accommodation.toFixed(2) : "—"}</td>
              <td style={{ textAlign: "right", padding: "5px 4px" }}>{r.meals         > 0 ? r.meals.toFixed(2)         : "—"}</td>
              <td style={{ textAlign: "right", padding: "5px 4px" }}>{r.others        > 0 ? r.others.toFixed(2)        : "—"}</td>
              <td style={{ textAlign: "right", padding: "5px 4px", fontWeight: 600 }}>{receiptRowTotal(r).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "1.5px solid #1a1a1a" }}>
            <td colSpan={7} style={{ padding: "6px 4px", fontWeight: 700, textAlign: "right" }}>
              TOTAL SUB-TOTAL
            </td>
            <td style={{ padding: "6px 4px", fontWeight: 700, textAlign: "right" }}>
              {subTotal.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Declaration */}
      <div style={{ marginTop: 32, fontSize: 11, color: "#444", lineHeight: 1.7 }}>
        <strong>Declaration:</strong><br />
        I hereby certify that the expenses listed above were incurred solely for official business purposes
        and conform to the Company&apos;s Reimbursement Policy. All original supporting documents are attached herewith.
      </div>

      {/* Signature */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48, fontSize: 11 }}>
        {["Employee Signature", "Approved By"].map(label => (
          <div key={label} style={{ width: "40%", textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #555", paddingTop: 6 }}>{label}</div>
            <div style={{ marginTop: 4, color: "#555" }}>
              {label === "Employee Signature" ? dbData.employeeName : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VerificationScreen({
  dbData,
  mainCategory,
  ocrReceipts,
  claimContext,
  onClaimContextChange,
  onReceiptsChange,
  onBack,
  onSubmit,
  isSubmitting = false,
}: VerificationScreenProps) {
  const [activeTab,    setActiveTab]    = useState<"form" | "preview">("form");
  const [identityOpen, setIdentityOpen] = useState(true);
  const [previewZoom,  setPreviewZoom]  = useState(1);

  // Computed sub-total
  const subTotal = useMemo(
    () => ocrReceipts.reduce((acc, r) => acc + receiptRowTotal(r), 0),
    [ocrReceipts],
  );

  // Validation
  const contextValid =
    claimContext.travelDestination.trim() !== "" &&
    claimContext.travelPurpose.trim()     !== "" &&
    claimContext.departureDate             !== "" &&
    claimContext.arrivalDate               !== "";

  const receiptsValid = ocrReceipts.every(r => r.expenseDate !== "" && r.merchant !== "");
  const canSubmit     = contextValid && receiptsValid;

  function handleReceiptChange(idx: number, updated: OcrReceiptData) {
    const next = [...ocrReceipts];
    next[idx] = updated;
    onReceiptsChange(next);
  }

  function patchContext<K extends keyof ClaimContext>(key: K, val: ClaimContext[K]) {
    onClaimContextChange({ ...claimContext, [key]: val });
  }

  // ── Form panel (left column) ────────────────────────────────────────────────

  const formPanel = (
    <div className="h-full min-h-0 w-full lg:w-[480px] shrink-0 flex flex-col gap-5 overflow-y-auto
      [&::-webkit-scrollbar]:w-1.5
      [&::-webkit-scrollbar-track]:bg-transparent
      [&::-webkit-scrollbar-thumb]:bg-outline-variant/30
      [&::-webkit-scrollbar-thumb]:rounded-full
      pb-4">

      {/* Back button (desktop only — mobile has it in the header) */}
      <button
        onClick={onBack}
        className="hidden lg:flex items-center gap-1.5 self-start bg-surface-container text-on-surface-variant text-sm font-semibold font-body px-4 py-2 rounded-full hover:bg-surface-container-high active:scale-95 transition-all"
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        Back to Upload
      </button>

      {/* Section 1: Identity Block */}
      <div className="shrink-0 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-[0_4px_20px_-4px_rgba(44,47,49,0.06)] overflow-hidden">
        <button
          type="button"
          onClick={() => setIdentityOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-outline-variant" strokeWidth={1.75} />
            <span className="text-sm font-bold text-on-surface font-headline">Employee Identity</span>
            <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-label">Read-only</span>
          </div>
          {identityOpen
            ? <ChevronUp   className="w-4 h-4 text-outline-variant" strokeWidth={1.75} />
            : <ChevronDown className="w-4 h-4 text-outline-variant" strokeWidth={1.75} />
          }
        </button>
        {identityOpen && (
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <LockedField label="Entity Name"   value={dbData.entityName}     />
            <LockedField label="Employee Name" value={dbData.employeeName}   />
            <LockedField label="Employee No."  value={dbData.employeeNumber} />
            <LockedField label="Position"      value={dbData.position}       />
            <LockedField label="Location"      value={dbData.location}       />
            <LockedField label="Department"    value={dbData.department}     />
          </div>
        )}
      </div>

      {/* Section 2: Claim Context */}
      <div className="shrink-0 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-[0_4px_20px_-4px_rgba(44,47,49,0.06)] p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-on-surface font-headline">Claim Context</h3>
          <p className="text-xs text-on-surface-variant font-body mt-0.5">Trip details for this expense report.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant font-label">
            Travel Destination<span className="text-error ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={claimContext.travelDestination}
            onChange={e => patchContext("travelDestination", e.target.value)}
            placeholder="e.g. Kuching, Sarawak"
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all placeholder:text-on-surface-variant/30"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant font-label">
            Travel Purpose<span className="text-error ml-0.5">*</span>
          </label>
          <textarea
            value={claimContext.travelPurpose}
            onChange={e => patchContext("travelPurpose", e.target.value)}
            placeholder="Briefly describe the business purpose of this trip…"
            rows={2}
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all resize-none placeholder:text-on-surface-variant/30"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant font-label">
              Departure Date<span className="text-error ml-0.5">*</span>
            </label>
            <input
              type="date"
              value={claimContext.departureDate}
              onChange={e => patchContext("departureDate", e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant font-label">
              Arrival Date<span className="text-error ml-0.5">*</span>
            </label>
            <input
              type="date"
              value={claimContext.arrivalDate}
              min={claimContext.departureDate}
              onChange={e => patchContext("arrivalDate", e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Overseas toggle */}
        <div className="flex items-center justify-between py-2 px-3 bg-surface-container-low/50 rounded-xl border border-outline-variant/10">
          <span className="text-sm font-medium text-on-surface font-body">Overseas Travel?</span>
          <button
            type="button"
            onClick={() => patchContext("overseas", !claimContext.overseas)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              claimContext.overseas ? "bg-primary" : "bg-outline-variant/40"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
              claimContext.overseas ? "translate-x-6" : "translate-x-0"
            }`} />
          </button>
        </div>
      </div>

      {/* Section 3: Financial Breakdown */}
      <div className="shrink-0 flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-bold text-on-surface font-headline">Financial Breakdown</h3>
          <p className="text-xs text-on-surface-variant font-body mt-0.5">
            Review and edit AI-extracted data for each receipt.
          </p>
        </div>
        {ocrReceipts.map((r, i) => (
          <ReceiptCard
            key={i}
            receipt={r}
            index={i}
            onChange={updated => handleReceiptChange(i, updated)}
          />
        ))}
      </div>

      {/* Section 4: Summary & Action */}
      <div className="shrink-0 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-[0_4px_20px_-4px_rgba(44,47,49,0.06)] p-5">
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-bold text-on-surface font-headline">Sub-Total</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-on-surface font-headline tracking-tight">{fmt(subTotal)}</span>
            <Lock className="w-3.5 h-3.5 text-outline-variant" />
          </div>
        </div>
        {!canSubmit && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={1.75} />
            <p className="text-xs text-amber-700 font-body">
              {!contextValid
                ? "Please complete the Claim Context section."
                : "Please fill in all required receipt fields."}
            </p>
          </div>
        )}
        <button
          id="submit-claim-btn"
          disabled={!canSubmit || isSubmitting}
          onClick={onSubmit}
          className={`w-full py-3.5 rounded-xl font-bold text-sm font-body transition-all duration-200 flex items-center justify-center gap-2 ${
            canSubmit && !isSubmitting
              ? "bg-linear-to-r from-primary to-primary-dim text-on-primary shadow-[0_4px_20px_rgba(70,71,211,0.35)] hover:shadow-[0_6px_28px_rgba(70,71,211,0.45)] hover:scale-[1.01] active:scale-[0.97]"
              : "bg-primary/25 text-on-primary/50 cursor-not-allowed"
          }`}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
          {isSubmitting ? "Submitting…" : "Submit Claim"}
        </button>
      </div>
    </div>
  );

  // ── A4 preview panel (right column) ────────────────────────────────────────

  // Measure the scroll container to compute an auto-fit base scale for the
  // rigid 794px A4 canvas. User zoom (previewZoom) multiplies on top.
  const A4_WIDTH                          = 794;
  const scrollContainerRef               = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(794);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // baseScale auto-fits the 794px doc into the available container width
  // (with 32px total side padding so it doesn't hug the edges)
  const baseScale   = Math.min(1, (containerWidth - 32) / A4_WIDTH);
  const totalScale  = +(baseScale * previewZoom).toFixed(3);

  const previewPanel = (
    <div className="flex-1 bg-surface-container/50 rounded-2xl flex flex-col overflow-hidden min-h-[500px] lg:min-h-0">
      {/* Preview toolbar */}
      <div className="px-4 py-2.5 border-b border-outline-variant/10 bg-surface-container-lowest shrink-0 flex items-center justify-between">
        <p className="text-xs font-bold text-on-surface-variant/60 font-label uppercase tracking-widest">
          Live Document Preview
        </p>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setPreviewZoom(z => Math.max(0.4, +(z - 0.2).toFixed(1)))}
            aria-label="Zoom out preview"
            className="w-5 h-5 sm:w-7 sm:h-7 bg-surface-container border border-outline-variant/20 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface active:scale-90 transition-all"
          >
            <ZoomOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={1.75} />
          </button>
          <span className="hidden sm:inline text-[11px] font-semibold text-on-surface-variant w-9 text-center font-label">
            {Math.round(previewZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setPreviewZoom(z => Math.min(2.5, +(z + 0.2).toFixed(1)))}
            aria-label="Zoom in preview"
            className="w-5 h-5 sm:w-7 sm:h-7 bg-surface-container border border-outline-variant/20 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface active:scale-90 transition-all"
          >
            <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setPreviewZoom(1)}
            aria-label="Reset preview zoom"
            className="hidden sm:flex w-7 h-7 bg-surface-container border border-outline-variant/20 rounded-full items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface active:scale-90 transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      {/*
        Outer scroll container: overflow:auto for panning when zoomed > 1.
        ref is used by ResizeObserver to compute the container width.
      */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-outline-variant/30
          [&::-webkit-scrollbar-thumb]:rounded-full"
        style={{ touchAction: "pinch-zoom" }}
      >
        {/*
          Centering row: when the scaled doc is narrower than the container
          (zoomed out), margin:auto centres it. When wider (zoomed in),
          overflow:auto on the parent produces the correct scrollbars.
        */}
        <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
          {/*
            Dynamic bounding box: physically sized to the scaled dimensions so
            overflow:auto sees the true footprint and generates accurate scrollbars.
            transform-origin: top left paired with this approach eliminates clipping.
          */}
          <div
            style={{
              width:     A4_WIDTH * totalScale,
              minHeight: 1123    * totalScale,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width:           A4_WIDTH,
                transformOrigin: "top left",
                transform:       `scale(${totalScale})`,
              }}
            >
              <A4Preview
                dbData={dbData}
                mainCategory={mainCategory}
                claimContext={claimContext}
                receipts={ocrReceipts}
                subTotal={subTotal}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Desktop ≥ lg: strict 2-column (form left | A4 preview right) ─── */}
      <div
        className="hidden lg:flex gap-5 items-stretch w-full"
        style={{ height: "calc(100vh - 140px)" }}
      >
        {formPanel}
        {previewPanel}
      </div>

      {/* ── Mobile / Tablet < lg: Back button + tab switcher ────────────── */}
      <div className="flex lg:hidden flex-col gap-4 w-full">

        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 self-start bg-surface-container text-on-surface-variant text-sm font-semibold font-body px-4 py-2 rounded-full hover:bg-surface-container-high active:scale-95 transition-all"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          Back to Upload
        </button>

        {/* Tab bar */}
        <div className="flex bg-surface-container rounded-2xl p-1 gap-1">
          <button
            type="button"
            id="tab-form"
            onClick={() => setActiveTab("form")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold font-body transition-all duration-200 ${
              activeTab === "form"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <ClipboardList className="w-4 h-4" strokeWidth={1.75} />
            Form Details
          </button>
          <button
            type="button"
            id="tab-preview"
            onClick={() => setActiveTab("preview")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold font-body transition-all duration-200 ${
              activeTab === "preview"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Eye className="w-4 h-4" strokeWidth={1.75} />
            Live Preview
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "form" && formPanel}
        {activeTab === "preview" && <div className="min-h-[600px]">{previewPanel}</div>}
      </div>
    </>
  );
}
