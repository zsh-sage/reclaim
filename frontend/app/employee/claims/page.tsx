"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ChevronDown,
  FileText,
  Upload,
  Trash2,
  Loader2,
  Search,
  Camera,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Pencil,
  Check,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
import type {
  UploadedFile,
  OcrReceiptData,
  ClaimContext,
  ClaimSubmissionPayload,
  DbEmployee,
} from "../../../src/types/claim";

// ─── Mock data (swap for real API calls at backend handoff) ───────────────────
import { POLICY_DATA, type MainCategoryConfig } from "../../../src/mocks/policyData";
import { MOCK_DB_DATA, MOCK_OCR_RECEIPTS } from "../../../src/mocks/claimMockData";

// ─── Screen components ────────────────────────────────────────────────────────
import { ProcessingScreen } from "./_components/ProcessingScreen";
import { VerificationScreen } from "./_components/VerificationScreen";
import { SuccessModal, type SuccessType } from "./_components/SuccessModal";
// CameraModal removed — using native <input capture="environment"> instead

// ─── Server Actions ───────────────────────────────────────────────────────────
import { getPolicies } from "@/lib/actions/policies";
import { uploadDocuments, editDocument, analyzeCompliance } from "@/lib/actions/claims";
import type { Policy, SubCategoryConfig, AnalyzeResponse } from "@/lib/api/types";

// ─── Stage type ───────────────────────────────────────────────────────────────

type Stage = "form" | "processing" | "verification";

// ─── Timing constants for OCR simulation ─────────────────────────────────────
// Per receipt: Scan(0ms) → Read(700ms) → Extract(1400ms) → done(2200ms)
const STEP_MS = [0, 700, 1400, 2200] as const;

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILES = 10;
const ACCEPT = ".pdf,.jpg,.jpeg,.png";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function compressImage(file: File, quality = 0.85, maxWidth = 2048): Promise<File> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const base = file.name.replace(/\.[^.]+$/, "");
      canvas.toBlob(
        blob => resolve(blob ? new File([blob], `${base}.jpg`, { type: "image/jpeg" }) : file),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ─── useOnClickOutside ────────────────────────────────────────────────────────

function useOnClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
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

// ─── CustomSelect ─────────────────────────────────────────────────────────────

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
}

function CustomSelect({ options, value, onChange, placeholder, disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => setIsOpen(false));

  const filtered = options.filter(o => o.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={`relative ${disabled ? "opacity-50 pointer-events-none" : ""}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        disabled={disabled}
        className={`w-full flex items-center justify-between text-left text-base rounded-2xl px-4 py-4 transition-all duration-200 font-body ${disabled
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant" strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="Search options…"
                  value={searchQuery}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface text-sm rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50 border border-transparent focus:border-primary/30"
                />
              </div>
            </div>
          )}
          <div className="max-h-64 overflow-y-auto overscroll-contain py-2 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-outline-variant/30 [&::-webkit-scrollbar-thumb]:rounded-full">
            {filtered.length === 0 ? (
              <div className="px-4 py-4 text-sm text-on-surface-variant text-center font-body">No options found</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setIsOpen(false); setSearch(""); }}
                  className={`w-full text-left px-4 py-3 text-sm font-body transition-colors ${value === opt
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

// ─── Inline Document Viewer (used in form stage right panel) ──────────────────

interface DocViewerProps {
  file: UploadedFile | null;
}

function DocViewer({ file }: DocViewerProps) {
  const [zoom, setZoom] = useState(1);

  // Reset zoom when file changes
  useEffect(() => { setZoom(1); }, [file?.id]);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-surface-container-low/30 rounded-2xl border-2 border-dashed border-outline-variant/20 min-h-[360px]">
        <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
          <FileText className="w-8 h-8 text-outline-variant/50" strokeWidth={1.25} />
        </div>
        <div className="text-center px-6">
          <p className="text-sm font-semibold text-on-surface-variant font-headline">No receipt selected</p>
          <p className="text-xs text-on-surface-variant/60 font-body mt-1">Click a receipt from the list to preview it here.</p>
        </div>
      </div>
    );
  }

  const isImage = file.type.startsWith("image/");
  const isPDF = file.type === "application/pdf";

  return (
    <div className="flex-1 flex flex-col bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-[0_8px_40px_-8px_rgba(44,47,49,0.08)] overflow-hidden min-h-[360px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
          <span className="text-sm font-medium text-on-surface font-body truncate">{file.name}</span>
        </div>
        {isImage && (
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Zoom out"
              className="w-7 h-7 bg-surface-container border border-outline-variant/20 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface active:scale-90 transition-all">
              <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <span className="text-[11px] font-semibold text-on-surface-variant w-9 text-center font-label">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Zoom in"
              className="w-7 h-7 bg-surface-container border border-outline-variant/20 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface active:scale-90 transition-all">
              <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button onClick={() => setZoom(1)} aria-label="Reset zoom"
              className="w-7 h-7 bg-surface-container border border-outline-variant/20 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface active:scale-90 transition-all">
              <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-surface-container-low/20 flex items-center justify-center" style={{ minHeight: 0 }}>
        {isImage ? (
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4" style={{ touchAction: "pinch-zoom" }}>
            <img
              src={file.previewUrl}
              alt={file.name}
              draggable={false}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                transition: "transform 0.15s ease",
                maxWidth: "100%",
                display: "block",
              }}
              className="rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] select-none"
            />
          </div>
        ) : isPDF ? (
          <iframe src={file.previewUrl} title={file.name} className="w-full h-full border-0" />
        ) : (
          <div className="flex flex-col items-center gap-4 py-16">
            <FileText className="w-12 h-12 text-outline-variant" strokeWidth={1.25} />
            <p className="text-sm text-on-surface-variant font-body">Preview not available</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── File card in the upload list ─────────────────────────────────────────────

interface FileCardProps {
  file: UploadedFile;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onRename: (newName: string) => void;
}

function FileCard({ file, index, isActive, onSelect, onRemove, onRename }: FileCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== file.name) onRename(trimmed);
    else setDraftName(file.name);
    setEditing(false);
  }

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation(); // don't trigger card click
    setDraftName(file.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }

  const isImage = file.type.startsWith("image/");

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150 group ${isActive
          ? "bg-primary/8 border border-primary/30 shadow-[0_0_0_2px_rgba(70,71,211,0.12)]"
          : "bg-surface-container-lowest border border-outline-variant/15 hover:border-primary/20 hover:bg-primary/3 shadow-[0_2px_8px_-2px_rgba(44,47,49,0.06)]"
        }`}
    >
      {/* Thumbnail */}
      <div className="w-9 h-9 rounded-lg bg-surface-container overflow-hidden flex items-center justify-center shrink-0">
        {isImage
          ? <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
          : <FileText className="w-4 h-4 text-primary" strokeWidth={1.75} />
        }
      </div>

      {/* Name / rename input */}
      <div className="flex-1 min-w-0" onClick={e => editing && e.stopPropagation()}>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setDraftName(file.name); setEditing(false); }
            }}
            className="w-full text-sm font-medium text-on-surface font-body bg-surface-container-lowest border border-primary/40 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm font-medium text-on-surface font-body truncate">{file.name}</p>
        )}
        <p className="text-xs text-on-surface-variant font-body mt-0.5">
          {(file.size / 1024).toFixed(0)} KB
        </p>
      </div>

      {/* Index badge */}
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-label shrink-0 transition-colors ${isActive ? "bg-primary/15 text-primary" : "bg-surface-container text-on-surface-variant"
        }`}>
        #{index + 1}
      </span>

      {/* Action icons — always visible (tap-friendly on mobile, hover highlight on desktop) */}
      <div className="flex items-center gap-0.5 shrink-0">
        {editing ? (
          <>
            <button
              onClick={e => { e.stopPropagation(); commitRename(); }}
              aria-label="Confirm rename"
              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 active:scale-90 transition-all"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setDraftName(file.name); setEditing(false); }}
              aria-label="Cancel rename"
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container active:scale-90 transition-all"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startEdit}
              aria-label={`Rename ${file.name}`}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface active:scale-90 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              id={`remove-file-${index}`}
              onClick={e => { e.stopPropagation(); onRemove(); }}
              aria-label={`Remove ${file.name}`}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error active:scale-90 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── BatchDropzone (dropzone only — no file list) ─────────────────────────────

interface BatchDropzoneProps {
  isFull: boolean;
  isLoading: boolean;
  onAdd: (files: File[]) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  cameraRef: React.RefObject<HTMLInputElement | null>;
}

function BatchDropzone({ isFull, isLoading, onAdd, inputRef, cameraRef }: BatchDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!isFull && e.dataTransfer.files.length) onAdd(Array.from(e.dataTransfer.files));
  }

  if (isFull) return null; // ceiling hit — hide dropzone entirely

  return (
    <>
      {/* Mobile: tap to open native camera / gallery */}
      <div
        className="md:hidden flex flex-col items-center justify-center gap-4 py-7 px-4 rounded-[20px] border-[2.5px] border-dashed border-primary/40 bg-primary/3 cursor-pointer active:scale-[0.97] transition-all duration-300"
        onClick={() => cameraRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center shadow-sm">
          <Camera className="w-6 h-6 text-primary" strokeWidth={1.75} />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-primary font-headline tracking-wide">Tap to Scan / Upload</p>
          <p className="text-xs text-primary/60 font-body mt-0.5">PDF, JPG or PNG · Max limit: 10 receipts.</p>
        </div>
      </div>

      {/* Desktop: drag-and-drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`hidden md:flex border-2 border-dashed rounded-2xl flex-col items-center justify-center py-9 px-6 text-center cursor-pointer transition-all duration-200 group ${dragging
            ? "border-primary/60 bg-primary/5"
            : "border-outline-variant/40 bg-surface-container-lowest hover:border-primary/40 hover:bg-primary/3"
          }`}
      >
        {isLoading ? (
          <Loader2 className="w-7 h-7 text-primary animate-spin mb-3" strokeWidth={1.75} />
        ) : (
          <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-3 transition-all duration-200 ${dragging ? "bg-primary/15 scale-110" : "bg-surface-container-low group-hover:bg-primary/10 group-hover:scale-110"}`}>
            <Upload className={`w-5 h-5 transition-colors ${dragging ? "text-primary" : "text-outline-variant group-hover:text-primary"}`} strokeWidth={1.75} />
          </div>
        )}
        <p className="text-sm font-semibold text-on-surface font-body">Click to upload or drag & drop</p>
        <p className="text-xs text-on-surface-variant font-body mt-1">PDF, JPG or PNG · Max limit: 10 receipts.</p>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CaptureReceiptPage() {
  // ── Stage ──────────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("form");

  // ── Policy data (fetched via server action) ────────────────────────────────
  const [policyData, setPolicyData] = useState<MainCategoryConfig[]>([]);
  const [rawPolicies, setRawPolicies] = useState<Policy[]>([]);

  useEffect(() => {
    getPolicies().then((policies) => {
      setRawPolicies(policies);
      // Map Policy type to local MainCategoryConfig shape
      const mapped: MainCategoryConfig[] = policies.map((p) => ({
        main_category: p.title,
        reimbursable_category: p.reimbursable_category,
        mandatory_conditions: {},
      }));
      setPolicyData(mapped);
    });
  }, []);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [mainCategory, setMainCategory] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Native camera input — OS handles Retake/Use Photo, no custom modal needed
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // Track actual File objects alongside UploadedFile metadata
  const fileMapRef = useRef<Map<string, File>>(new Map());

  // ── Processing state ───────────────────────────────────────────────────────
  const [processingIndex, setProcessingIndex] = useState(0);
  const [processingStep, setProcessingStep] = useState(0);
  const [completedNames, setCompletedNames] = useState<string[]>([]);

  // ── Verification state ─────────────────────────────────────────────────────
  const [ocrReceipts, setOcrReceipts] = useState<OcrReceiptData[]>([]);
  const [claimContext, setClaimContext] = useState<ClaimContext>({
    travelDestination: "",
    travelPurpose: "",
    overseas: false,
    departureDate: "",
    arrivalDate: "",
  });

  // ── Backend settlement/document state ──────────────────────────────────────
  const [settlementId, setSettlementId] = useState<string | null>(null);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [employeeData, setEmployeeData] = useState<DbEmployee | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const originalOcrRef = useRef<OcrReceiptData[]>([]);

  // ── Success modal ──────────────────────────────────────────────────────────
  const [showSuccess, setShowSuccess] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedMain = policyData.find(d => d.main_category === mainCategory);
  const canProcess = files.length > 0 && mainCategory !== "";
  const isFull = files.length >= MAX_FILES;
  const activeFile = files.find(f => f.id === activeDocId) ?? null;

  // ── File handlers ──────────────────────────────────────────────────────────
  async function handleAddFiles(rawFiles: File[]) {
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) return;
    const list = rawFiles.slice(0, remaining);
    setIsLoading(true);
    const processed = await Promise.all(
      list.map(f => f.type.startsWith("image/") ? compressImage(f) : Promise.resolve(f)),
    );
    const added: UploadedFile[] = processed.map(f => ({
      id: uid(),
      name: f.name,
      size: f.size,
      previewUrl: URL.createObjectURL(f),
      type: f.type,
    }));
    // Store actual File objects for later upload
    processed.forEach((f, idx) => fileMapRef.current.set(added[idx].id, f));
    setFiles(prev => {
      const next = [...prev, ...added].slice(0, MAX_FILES);
      // auto-select the first newly uploaded file
      if (added.length > 0) setActiveDocId(added[0].id);
      return next;
    });
    setIsLoading(false);
  }

  function handleRemoveFile(id: string) {
    fileMapRef.current.delete(id);
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter(f => f.id !== id);
      // If we removed the active doc, select the previous one (or null)
      if (activeDocId === id) {
        const idx = prev.findIndex(f => f.id === id);
        setActiveDocId(next[Math.max(0, idx - 1)]?.id ?? null);
      }
      return next;
    });
  }

  function handleRenameFile(id: string, newName: string) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  }

  // ── Real OCR via backend upload ────────────────────────────────────────────
  const runOcr = useCallback(async (uploadedFiles: UploadedFile[]) => {
    setCompletedNames([]);

    // Get actual File objects from the map
    const filesToUpload = uploadedFiles
      .map(f => fileMapRef.current.get(f.id))
      .filter((f): f is File => f !== undefined);

    if (filesToUpload.length === 0) {
      setStage("form");
      return;
    }

    // Show the first file as "processing" while the upload runs
    setProcessingIndex(0);
    setProcessingStep(0);

    const result = await uploadDocuments(filesToUpload);

    if ("error" in result) {
      setStage("form");
      setSubmitError(result.error);
      return;
    }

    setSettlementId(result.settlement_id);
    setDocumentIds(result.receipts.map(r => r.document_id));
    setCompletedNames(uploadedFiles.map(f => f.name));
    setProcessingIndex(uploadedFiles.length - 1);
    setProcessingStep(3);

    // Map backend receipts → OcrReceiptData
    const mappedReceipts: OcrReceiptData[] = result.receipts.map((r, idx) => ({
      receiptIndex: idx,
      success: r.warnings.length === 0,
      expenseDate: r.date ?? "",
      merchant: (r.extracted_data?.merchant_name as string) ?? r.description ?? "",
      transport: r.transportation ?? 0,
      accommodation: r.accommodation ?? 0,
      meals: r.meals ?? 0,
      others: r.others ?? 0,
      notes: r.description ?? "",
    }));

    originalOcrRef.current = mappedReceipts.map(r => ({ ...r }));
    setOcrReceipts(mappedReceipts);

    // Map employee data
    if (result.employee) {
      const emp = result.employee;
      setEmployeeData({
        entityName: "Reclaim",
        employeeName: emp.name ?? "",
        employeeNumber: emp.user_code ?? "",
        position: "",
        location: emp.destination ?? emp.location ?? "",
        department: emp.department ?? "",
      });
    }

    setStage("verification");
  }, []);

  async function handleProcessReceipts() {
    if (!canProcess) return;
    setProcessingIndex(0);
    setProcessingStep(0);
    setStage("processing");
  }

  useEffect(() => {
    if (stage === "processing") runOcr(files);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!settlementId) {
      setSubmitError("No settlement found. Please re-upload your receipts.");
      return;
    }

    const policy = rawPolicies.find(p => p.title === mainCategory);
    if (!policy) {
      setSubmitError("Please select a valid policy category.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // Send edits for any receipt that changed from original
    for (let i = 0; i < ocrReceipts.length; i++) {
      const curr = ocrReceipts[i];
      const orig = originalOcrRef.current[i];
      const docId = documentIds[i];
      if (!docId || !orig) continue;

      const changed =
        curr.merchant !== orig.merchant ||
        curr.expenseDate !== orig.expenseDate ||
        curr.transport !== orig.transport ||
        curr.accommodation !== orig.accommodation ||
        curr.meals !== orig.meals ||
        curr.others !== orig.others;

      if (changed) {
        await editDocument(docId, {
          merchant_name: curr.merchant,
          date: curr.expenseDate,
          total_amount: curr.transport + curr.accommodation + curr.meals + curr.others,
        });
      }
    }

    // Run compliance analysis
    const analyzeResult = await analyzeCompliance({
      settlement_id: settlementId,
      policy_id: policy.policy_id,
      all_category: [mainCategory],
      document_ids: documentIds,
    });

    setIsSubmitting(false);

    if ("error" in analyzeResult) {
      setSubmitError(analyzeResult.error);
      return;
    }

    setAnalysisResult(analyzeResult);
    setShowSuccess(true);
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetAll() {
    files.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    fileMapRef.current.clear();
    setFiles([]);
    setMainCategory("");
    setActiveDocId(null);
    setOcrReceipts([]);
    setSettlementId(null);
    setDocumentIds([]);
    setEmployeeData(null);
    setAnalysisResult(null);
    setSubmitError(null);
    setIsSubmitting(false);
    originalOcrRef.current = [];
    setClaimContext({ travelDestination: "", travelPurpose: "", overseas: false, departureDate: "", arrivalDate: "" });
    setProcessingIndex(0);
    setProcessingStep(0);
    setCompletedNames([]);
  }

  function handleSubmitAnother() {
    setShowSuccess(false);
    resetAll();
    setStage("form");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-12 lg:px-12 lg:pt-10 lg:pb-10 max-w-screen-xl mx-auto w-full">

      {/* Ambient gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 rounded-full bg-linear-to-br from-primary/15 to-tertiary/10 blur-3xl z-0"
      />

      <div className="relative z-10 flex flex-col gap-6">

        {/* ── Page Header (form stage only) ─────────────────────────────────── */}
        {stage === "form" && (
          <div className="flex flex-col gap-1">
            <h2
              className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              Capture Receipts
            </h2>
            <p className="text-base text-on-surface-variant font-body leading-relaxed">
              Upload your receipts and Reclaim AI will extract the data for you.
            </p>
          </div>
        )}

        {/* ── Stage Router ──────────────────────────────────────────────────── */}

        {stage === "processing" && (
          <ProcessingScreen
            totalFiles={files.length}
            currentIndex={processingIndex}
            currentStep={processingStep}
            completedFileNames={completedNames}
          />
        )}

        {stage === "verification" && (
          <>
            <VerificationScreen
              dbData={employeeData ?? MOCK_DB_DATA}
              mainCategory={mainCategory}
              ocrReceipts={ocrReceipts}
              claimContext={claimContext}
              onClaimContextChange={setClaimContext}
              onReceiptsChange={setOcrReceipts}
              onBack={() => setStage("form")}
              onSubmit={handleSubmit}
            />
            {submitError && (
              <p className="text-sm text-error font-body mt-2 text-center">{submitError}</p>
            )}
            {isSubmitting && (
              <p className="text-sm text-on-surface-variant font-body mt-2 text-center">Submitting claim…</p>
            )}
          </>
        )}

        {/* ── FORM STAGE ────────────────────────────────────────────────────── */}
        {stage === "form" && (
          <div className="flex flex-col gap-6">

            {/* Category selector — full width, matches the upload area below */}
            <div className="flex flex-col gap-2 relative z-20 w-full">
              <label className="text-sm font-semibold text-on-surface font-headline ml-1">
                Expense Category
              </label>
              <CustomSelect
                options={policyData.map(d => d.main_category)}
                value={mainCategory}
                onChange={v => { setMainCategory(v); setFiles([]); setActiveDocId(null); }}
                placeholder="Select a category…"
              />
              {selectedMain && (
                <p className="text-xs text-on-surface-variant font-body ml-1">
                  Covers: {selectedMain.reimbursable_category.slice(0, 3).join(", ")} &amp; more.
                </p>
              )}
            </div>

            {/* Split-view upload area */}
            {!mainCategory ? (
              /* Empty state — no category selected yet */
              <div className="bg-surface-container-lowest rounded-2xl flex flex-col items-center justify-center py-14 px-6 text-center shadow-[0_8px_40px_-8px_rgba(44,47,49,0.06)] border border-outline-variant/10">
                <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
                  <ImageIcon className="w-6 h-6 text-outline-variant" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-on-surface font-headline mb-1">Select a category first</h3>
                <p className="text-sm text-on-surface-variant font-body max-w-xs leading-relaxed">
                  Choose an expense category above before uploading your receipts.
                </p>
              </div>
            ) : (
              /* Two-column split: left = upload controls, right = doc preview */
              <div className="flex flex-col lg:flex-row gap-5 items-stretch" style={{ minHeight: 480 }}>

                {/* ── Left: Dropzone + file list ─────────────────────────── */}
                <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4">

                  {/* Dropzone */}
                  <BatchDropzone
                    isFull={isFull}
                    isLoading={isLoading}
                    onAdd={handleAddFiles}
                    inputRef={fileInputRef}
                    cameraRef={cameraInputRef}
                  />

                  {/* File list */}
                  {files.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between ml-1">
                        <span className="text-xs font-semibold text-on-surface-variant font-label">
                          Uploaded Receipts
                        </span>
                        <span className="text-xs text-on-surface-variant/60 font-body">
                          Max limit: 10 receipts.
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {files.map((f, idx) => (
                          <FileCard
                            key={f.id}
                            file={f}
                            index={idx}
                            isActive={activeDocId === f.id}
                            onSelect={() => setActiveDocId(f.id)}
                            onRemove={() => handleRemoveFile(f.id)}
                            onRename={name => handleRenameFile(f.id, name)}
                          />
                        ))}
                      </div>

                      {/* Add more — only visible on desktop when not full */}
                      {!isFull && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="hidden md:flex items-center justify-center gap-2 text-sm font-semibold text-primary font-body py-2 rounded-xl border border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/3 transition-all"
                        >
                          <Upload className="w-4 h-4" strokeWidth={1.75} />
                          Add more receipts
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Right: Document preview ────────────────────────────── */}
                <div className="flex-1 flex flex-col">
                  <DocViewer file={activeFile} />
                </div>
              </div>
            )}

            {/* Hidden file input — desktop multi-file picker */}
            <input
              ref={fileInputRef}
              id="batch-file-input"
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={e => { if (e.target.files) handleAddFiles(Array.from(e.target.files)); e.target.value = ""; }}
            />

            {/* Native camera input — mobile OS handles Retake/Use Photo natively */}
            <input
              ref={cameraInputRef}
              id="camera-file-input"
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) handleAddFiles([e.target.files[0]]);
                e.target.value = "";
              }}
            />

            {/* Bottom Action Bar */}
            <div className="flex flex-row items-center gap-3 pt-4 border-t border-outline-variant/15 w-full max-w-2xl lg:max-w-none">
              <button
                id="save-draft-btn"
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-on-surface-variant bg-surface-container hover:bg-surface-container-high active:scale-[0.97] transition-all duration-200 font-body text-sm text-center"
              >
                Save Draft
              </button>
              <button
                id="process-receipts-btn"
                disabled={!canProcess}
                onClick={handleProcessReceipts}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm font-body transition-all duration-200 ${canProcess
                    ? "bg-linear-to-r from-primary to-primary-dim text-on-primary shadow-[0_4px_16px_rgba(70,71,211,0.35)] hover:shadow-[0_6px_24px_rgba(70,71,211,0.45)] hover:scale-[1.02] active:scale-[0.97]"
                    : "bg-primary/30 text-on-primary/70 cursor-not-allowed"
                  }`}
              >
                {files.length > 0
                  ? `Process ${files.length} Receipt${files.length !== 1 ? "s" : ""}`
                  : "Process Receipts"}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Success Modal */}
      {showSuccess && (
        <SuccessModal type={"claim" as SuccessType} onSubmitAnother={handleSubmitAnother} />
      )}
    </div>
  );
}
