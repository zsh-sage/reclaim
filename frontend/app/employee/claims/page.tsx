"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Clock,
  CheckCircle2,
  Circle,
  FileText,
  Upload,
  Trash2,
  Loader2,
  Sparkles,
  Search,
  AlertTriangle,
  Camera,
} from "lucide-react";

// ─── Screen Components ────────────────────────────────────────────────────────
import { ProcessingScreen } from "./_components/ProcessingScreen";
import { VerificationScreen, type ExtractedData } from "./_components/VerificationScreen";
import { RetryFailedScreen } from "./_components/RetryFailedScreen";
import { DoubleFailedScreen } from "./_components/DoubleFailedScreen";
import { HrEscalationScreen } from "./_components/HrEscalationScreen";
import { SuccessModal, type SuccessType } from "./_components/SuccessModal";
import { CameraModal } from "./_components/CameraModal";

// ─── Stage type ───────────────────────────────────────────────────────────────

type Stage =
  | "form"
  | "processing"
  | "verification"
  | "retry_failed"
  | "double_failed"
  | "hr_escalation";

// ─── Form data types ──────────────────────────────────────────────────────────

interface DocumentSlot {
  id: string;
  label: string;
  hint: string;
}

interface SubCategoryConfig {
  required_documents: string[];
  condition: string[];
}

interface MainCategoryConfig {
  main_category: string;
  reimbursable_category: string[];
  mandatory_conditions: Record<string, SubCategoryConfig>;
}

// ─── Mock Policy Data ─────────────────────────────────────────────────────────

const POLICY_DATA: MainCategoryConfig[] = [
  {
    main_category: "Business Travel Policy",
    reimbursable_category: [
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
        condition: ["Reimbursement for Business Travel transportation costs covering seaport/airport tax"],
      },
      "Travel Insurance": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: ["Reimbursement for Business Travel transportation costs covering travel insurance if applicable"],
      },
      "Internet Expenses": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: ["Full reimbursement for Employee with grade 8 and above"],
      },
      "Telephone (Business & Private Calls)": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: ["Full reimbursement for Employee with grade 8 and above"],
      },
      Laundry: {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: ["Full reimbursement for Employee with grade 8 and above, minimum 3 days trip and maximum 2 sets"],
      },
      "Minibar (Non-Alcohol)": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: ["Full reimbursement for Employee with grade 8 and above, non-alcohol only"],
      },
      Parking: {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: ["Full reimbursement for Employee with grade 8 and above"],
      },
      "Toll Expenses": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: ["Full reimbursement for Employee with grade 8 and above"],
      },
      "Client's Entertainment": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: ["Refer to compliance regulation (Gifts and Entertainment Policy)"],
      },
      "Inner City Transportation": {
        required_documents: [
          "Business Travel Settlement Form (Appendix 2b)",
          "Original printed receipt",
        ],
        condition: ["Full reimbursement for Employee with grade 8 and above"],
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
        condition: ["Company will provide payment based on reimbursement of actual transportation costs"],
      },
    },
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildDocSlots(config: SubCategoryConfig): DocumentSlot[] {
  return config.required_documents.map((label, idx) => ({
    id: `doc-${idx}`,
    label,
    hint: config.condition[0] ?? "Required document",
  }));
}

// ─── Image compression (client-side, no backend needed) ───────────────────────

function compressImage(file: File, quality = 0.85, maxWidth = 2048): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width  = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ─── Click Outside Hook ───────────────────────────────────────────────────────

function useOnClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

// ─── Custom Select ────────────────────────────────────────────────────────────

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
}

function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => setIsOpen(false));

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className={`relative ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        disabled={disabled}
        className={`w-full flex items-center justify-between text-left text-base rounded-2xl px-4 py-4 transition-all duration-200 font-body ${
          disabled
            ? "bg-surface-container-low border border-outline-variant/20 text-on-surface-variant cursor-not-allowed"
            : "bg-surface-container-lowest border border-outline-variant/30 text-on-surface cursor-pointer shadow-[0_2px_12px_rgba(44,47,49,0.06)] hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10"
        }`}
      >
        <span className={value ? "text-on-surface truncate pr-4" : "text-on-surface-variant/70 truncate pr-4"}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-5 h-5 shrink-0 text-outline-variant transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : ""}`}
          strokeWidth={1.75}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-[0_16px_48px_-12px_rgba(44,47,49,0.2)] flex flex-col overflow-hidden origin-top animate-in fade-in zoom-in-95 duration-200">
          {options.length > 5 && (
            <div className="p-3 border-b border-outline-variant/10 sticky top-0 bg-surface-container-lowest shrink-0">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant"
                  strokeWidth={1.75}
                />
                <input
                  type="text"
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface text-sm rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50 border border-transparent focus:border-primary/30"
                />
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto overscroll-contain py-2 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-outline-variant/30 [&::-webkit-scrollbar-thumb]:rounded-full">
            {filtered.length === 0 ? (
              <div className="px-4 py-4 text-sm text-on-surface-variant text-center font-body">
                No options found
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-body transition-colors ${
                    value === opt
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-on-surface hover:bg-surface-container-highest/50 active:bg-surface-container-highest"
                  }`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DocSlotCard ──────────────────────────────────────────────────────────────

interface UploadedFile {
  name: string;
  size: number;
  previewUrl: string; // blob URL — revoke on remove/reset
  type: string;       // MIME type e.g. "image/jpeg", "application/pdf"
}

interface DocSlotCardProps {
  slot: DocumentSlot;
  uploaded: UploadedFile | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  index: number;
}

function DocSlotCard({ slot, uploaded, onUpload, onRemove, index }: DocSlotCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]       = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraOpen, setCameraOpen]   = useState(false);

  async function processFile(file: File) {
    setIsUploading(true);
    // Compress images client-side before handing off
    let finalFile = file;
    if (file.type.startsWith("image/")) {
      try { finalFile = await compressImage(file); } catch { /* fallback to original */ }
    }
    await new Promise(r => setTimeout(r, 900));
    setIsUploading(false);
    onUpload(finalFile);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-3 shadow-[0_8px_40px_-8px_rgba(44,47,49,0.06)] transition-all duration-200">
      {/* Slot header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-on-surface font-headline leading-snug">
            {slot.label}
          </h4>
          <p className="text-xs text-on-surface-variant font-body mt-0.5 leading-relaxed">
            {slot.hint}
          </p>
        </div>
        <div className="shrink-0 mt-0.5">
          {uploaded ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" strokeWidth={2} />
          ) : (
            <Circle className="w-5 h-5 text-outline-variant" strokeWidth={1.5} />
          )}
        </div>
      </div>

      {/* Body */}
      {uploaded ? (
        /* Uploaded row */
        <div className="flex items-center gap-3 bg-surface-container-low rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" strokeWidth={1.75} />
          </div>
          <span className="text-sm text-on-surface font-medium truncate flex-1 font-body">
            {uploaded.name}
          </span>
          <span className="text-xs text-on-surface-variant font-body shrink-0">
            {(uploaded.size / 1024).toFixed(0)} KB
          </span>
          <button
            id={`doc-remove-${index}`}
            onClick={onRemove}
            aria-label={`Remove ${slot.label}`}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-all active:scale-90"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      ) : isUploading ? (
        /* Loading */
        <div className="border border-outline-variant/20 rounded-xl flex items-center justify-center py-9 px-4 text-center bg-surface-container-lowest">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" strokeWidth={2} />
            <span className="text-sm font-medium text-on-surface font-body animate-pulse">
              Uploading document…
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* ── Mobile: single tap-to-scan zone (< md) ── */}
          <div
            className="md:hidden flex flex-col items-center justify-center gap-4 py-8 px-4 rounded-[20px] border-[2.5px] border-dashed border-primary/40 bg-primary/3 cursor-pointer active:scale-[0.97] transition-all duration-300 shadow-[0_8px_24px_rgba(70,71,211,0.04)]"
            onClick={() => setCameraOpen(true)}
          >
            <div className="w-14 h-14 rounded-[18px] bg-primary/10 flex items-center justify-center shadow-sm">
              <Camera className="w-7 h-7 text-primary" strokeWidth={1.75} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-primary font-headline tracking-wide">Tap to Scan</p>
              <p className="text-xs text-primary/70 font-body mt-1 font-medium leading-relaxed">
                We'll extract text automatically<br />with Reclaim AI.
              </p>
            </div>
          </div>

          {/* ── Desktop: drag-and-drop zone (≥ md) ── */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`hidden md:flex border-2 border-dashed rounded-xl flex-col items-center justify-center py-6 px-4 text-center cursor-pointer transition-all duration-200 group ${
              dragging
                ? "border-primary/60 bg-primary/5"
                : "border-outline-variant/40 bg-surface-container-lowest hover:border-primary/40 hover:bg-primary/3"
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 transition-all duration-200 ${dragging ? "bg-primary/15 scale-110" : "bg-surface-container-low group-hover:bg-primary/10 group-hover:scale-110"}`}>
              <Upload
                className={`w-4 h-4 transition-colors ${dragging ? "text-primary" : "text-outline-variant group-hover:text-primary"}`}
                strokeWidth={1.75}
              />
            </div>
            <p className="text-sm font-medium text-on-surface font-body">Click to upload or drag &amp; drop</p>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">PDF, JPG or PNG (max 10 MB)</p>
          </div>
        </>
      )}

      {/* Hidden file input — shared by both mobile tiles and desktop dropzone */}
      <input
        ref={inputRef}
        id={`doc-input-${index}`}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Camera modal — mobile only */}
      <CameraModal
        isOpen={cameraOpen}
        onCapture={processFile}
        onClose={() => setCameraOpen(false)}
      />
    </div>
  );
}

// ─── Main Page (Orchestrator) ─────────────────────────────────────────────────

export default function CaptureReceiptPage() {
  // ── Stage ──────────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("form");

  // ── Form state ─────────────────────────────────────────────────────────────
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory]   = useState("");
  const [uploads, setUploads]           = useState<Record<string, UploadedFile | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Processing state ───────────────────────────────────────────────────────
  const [processingStep, setProcessingStep] = useState(0);
  const [attemptCount, setAttemptCount]     = useState(0);

  // ── Verification state ─────────────────────────────────────────────────────
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    merchant: "",
    amount: "",
    date: "",
  });
  const [clientName, setClientName] = useState("");
  const [purpose, setPurpose]       = useState("");

  // ── Success modal ──────────────────────────────────────────────────────────
  const [showSuccess, setShowSuccess]   = useState(false);
  const [successType, setSuccessType]   = useState<SuccessType>("claim");

  // ── Derived form values ────────────────────────────────────────────────────
  const selectedMain = POLICY_DATA.find(d => d.main_category === mainCategory);
  const selectedSubConfig =
    selectedMain && subCategory
      ? selectedMain.mandatory_conditions[subCategory]
      : null;
  const docSlots: DocumentSlot[] = selectedSubConfig ? buildDocSlots(selectedSubConfig) : [];
  const allUploaded = docSlots.length > 0 && docSlots.every(s => uploads[s.id] != null);
  const uploadedCount = docSlots.filter(s => uploads[s.id] != null).length;

  // ── Form handlers ──────────────────────────────────────────────────────────
  function handleMainCategoryChange(v: string) {
    setMainCategory(v);
    setSubCategory("");
    setUploads({});
  }
  function handleSubCategoryChange(v: string) {
    setSubCategory(v);
    setUploads({});
  }
  function handleUpload(slotId: string, file: File) {
    const previewUrl = URL.createObjectURL(file);
    setUploads(prev => ({
      ...prev,
      [slotId]: { name: file.name, size: file.size, previewUrl, type: file.type },
    }));
  }
  function handleRemove(slotId: string) {
    const existing = uploads[slotId];
    if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);
    setUploads(prev => ({ ...prev, [slotId]: null }));
  }

  // ── Kick off OCR processing ────────────────────────────────────────────────
  async function handleProcessReceipt() {
    if (!allUploaded) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 300)); // brief visual delay
    setIsSubmitting(false);
    setProcessingStep(0);
    setStage("processing");
  }

  // ── OCR simulation effect (runs whenever stage === "processing") ────────────
  useEffect(() => {
    if (stage !== "processing") return;

    setProcessingStep(0);

    const t1 = setTimeout(() => setProcessingStep(1), 1500);
    const t2 = setTimeout(() => setProcessingStep(2), 3000);
    const t3 = setTimeout(() => {
      // ── TODO: Replace with real OCR API call ──────────────────────────────
      // const result = await ocrService.extract(uploadedFiles);
      // if (result.ok) {
      //   setExtractedData(result.data);
      //   setStage("verification");
      // } else {
      //   const next = attemptCount + 1;
      //   setAttemptCount(next);
      //   setStage(next >= 2 ? "double_failed" : "retry_failed");
      // }
      // ─────────────────────────────────────────────────────────────────────

      // Mock: always succeed
      setExtractedData({
        merchant: "Bouchon Bistro",
        amount:   "RM 342.50",
        date:     "October 24, 2023 at 8:45 PM",
      });
      setStage("verification");

      // Mock: force failure for testing
      // const nextAttempt = attemptCount + 1;
      // setAttemptCount(nextAttempt);
      // setStage(nextAttempt >= 2 ? "double_failed" : "retry_failed");
    }, 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Verification submit ───────────────────────────────────────────────────
  function handleVerificationSubmit() {
    setSuccessType("claim");
    setShowSuccess(true);

    // ── Policy check runs silently in background — no UI feedback ──────────
    // TODO: runPolicyCheck({ extractedData, clientName, purpose, uploads })
    //   .then(result => { /* store or log result */ })
    //   .catch(err  => { /* silent fail — log only */ });
  }

  // ── Retry OCR ─────────────────────────────────────────────────────────────
  function handleRetry() {
    setAttemptCount(prev => prev + 1);
    setUploads({}); // Require user to re-upload documents
    setStage("form"); // Send back to form instead of directly processing
  }

  // ── Discard ───────────────────────────────────────────────────────────────
  function resetAll() {
    // Revoke all blob URLs to free memory
    Object.values(uploads).forEach(f => {
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setMainCategory("");
    setSubCategory("");
    setUploads({});
    setProcessingStep(0);
    setAttemptCount(0);
    setExtractedData({ merchant: "", amount: "", date: "" });
    setClientName("");
    setPurpose("");
  }
  function handleDiscard() {
    resetAll();
    setStage("form");
  }

  // ── HR escalation submit ──────────────────────────────────────────────────
  function handleHrSubmit() {
    setSuccessType("hr");
    setShowSuccess(true);
  }

  // ── Reset after success ───────────────────────────────────────────────────
  function handleSubmitAnother() {
    setShowSuccess(false);
    resetAll();
    setStage("form");
  }

  // ── Build uploaded files list for verification ────────────────────────────
  const uploadedFiles = docSlots
    .map(s => uploads[s.id])
    .filter((f): f is UploadedFile => f != null);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-12 lg:px-12 lg:pt-10 lg:pb-10 max-w-5xl mx-auto w-full">

      {/* Ambient gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 rounded-full bg-linear-to-br from-primary/15 to-tertiary/10 blur-3xl z-0"
      />

      <div className="relative z-10 flex flex-col gap-8">

        {/* ── Page Header (only on form stage) ─────────────────────────────── */}
        {stage === "form" && (
          <div className="flex flex-col gap-1.5">
            <h2
              className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              Capture Receipt
            </h2>
            <p className="text-base text-on-surface-variant font-body leading-relaxed">
              Upload your expense document for AI processing. We support PDF, JPG and PNG formats.
            </p>
          </div>
        )}

        {/* ── Stage Router ─────────────────────────────────────────────────── */}

        {stage === "processing" && (
          <ProcessingScreen currentStep={processingStep} />
        )}

        {stage === "verification" && (
          <VerificationScreen
            extractedData={extractedData}
            uploadedFiles={uploadedFiles}
            clientName={clientName}
            purpose={purpose}
            onClientNameChange={setClientName}
            onPurposeChange={setPurpose}
            onBack={() => setStage("form")}
            onSaveDraft={() => { /* TODO: save draft API */ }}
            onSubmit={handleVerificationSubmit}
          />
        )}

        {stage === "retry_failed" && (
          <RetryFailedScreen onRetry={handleRetry} />
        )}

        {stage === "double_failed" && (
          <DoubleFailedScreen
            onDiscard={handleDiscard}
            onEscalate={() => setStage("hr_escalation")}
          />
        )}

        {stage === "hr_escalation" && (
          <HrEscalationScreen
            onBack={() => setStage("double_failed")}
            onSubmit={handleHrSubmit}
          />
        )}

        {/* ── FORM STAGE ───────────────────────────────────────────────────── */}
        {stage === "form" && (
          <div className="flex flex-col gap-6">

            {attemptCount === 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800 font-headline">Re-upload Required</h4>
                  <p className="text-xs text-amber-700/80 font-body mt-0.5">Please provide a clearer version of your document for our second attempt.</p>
                </div>
              </div>
            )}

            {/* 1. Main Category */}
            <div className="flex flex-col gap-2 relative z-20">
              <label className="text-sm font-semibold text-on-surface font-headline ml-1">
                Main Category
              </label>
              <CustomSelect
                options={POLICY_DATA.map(d => d.main_category)}
                value={mainCategory}
                onChange={handleMainCategoryChange}
                placeholder="Select a category..."
              />
            </div>

            {/* 2. Sub-category */}
            <div className="flex flex-col gap-2 relative z-10">
              <label className="text-sm font-semibold text-on-surface font-headline ml-1">
                Sub-category
              </label>
              <CustomSelect
                options={selectedMain?.reimbursable_category ?? []}
                value={subCategory}
                onChange={handleSubCategoryChange}
                placeholder={mainCategory ? "Select a sub-category..." : "Select a main category first..."}
                disabled={!mainCategory}
              />
            </div>

            {/* 3. Required Documents */}
            <div className={`flex flex-col gap-4 mt-2 transition-all duration-500 ${!subCategory ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-semibold text-on-surface font-headline">
                  Required Documents
                </label>
                {subCategory && docSlots.length > 0 && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full font-label">
                    {uploadedCount} of {docSlots.length} Uploaded
                  </span>
                )}
              </div>

              {!subCategory ? (
                <div className="bg-surface-container-lowest rounded-2xl flex flex-col items-center justify-center py-12 px-6 text-center shadow-[0_8px_40px_-8px_rgba(44,47,49,0.06)]">
                  <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-outline-variant" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-semibold text-on-surface font-headline mb-1">
                    Waiting for selection
                  </h3>
                  <p className="text-sm text-on-surface-variant font-body max-w-xs leading-relaxed">
                    Please select a category and sub-category to view required documents.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {docSlots.map((slot, idx) => (
                    <DocSlotCard
                      key={slot.id}
                      slot={slot}
                      index={idx}
                      uploaded={uploads[slot.id] ?? null}
                      onUpload={file => handleUpload(slot.id, file)}
                      onRemove={() => handleRemove(slot.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Policy Conditions notice */}
            {selectedSubConfig && selectedSubConfig.condition.length > 0 && (
              <div className="bg-primary/5 rounded-2xl p-4 flex flex-col gap-2 border border-primary/10">
                <p className="text-xs font-semibold text-primary font-headline uppercase tracking-wider">
                  Policy Conditions
                </p>
                <ul className="flex flex-col gap-1.5">
                  {selectedSubConfig.condition.map((c, i) => (
                    <li
                      key={i}
                      className="text-sm text-on-surface-variant font-body leading-relaxed flex gap-2"
                    >
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bottom Action Bar */}
            <div className="flex flex-row items-center gap-3 pt-6 border-t border-outline-variant/15 w-full">
              <button
                id="save-draft-btn"
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-on-surface-variant bg-surface-container hover:bg-surface-container-high active:scale-[0.97] transition-all duration-200 font-body text-sm text-center"
              >
                Save Draft
              </button>

              <button
                id="process-receipt-btn"
                disabled={!allUploaded || isSubmitting}
                onClick={handleProcessReceipt}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm font-body transition-all duration-200 ${
                  allUploaded && !isSubmitting
                    ? "bg-linear-to-r from-primary to-primary-dim text-on-primary shadow-[0_4px_16px_rgba(70,71,211,0.35)] hover:shadow-[0_6px_24px_rgba(70,71,211,0.45)] hover:scale-[1.02] active:scale-[0.97]"
                    : "bg-primary/30 text-on-primary/70 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                    Starting…
                  </>
                ) : (
                  <>
                    Process Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Success Modal (portal-like overlay) ──────────────────────────────── */}
      {showSuccess && (
        <SuccessModal type={successType} onSubmitAnother={handleSubmitAnother} />
      )}
    </div>
  );
}
