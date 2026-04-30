"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
import type {
  UploadedFile,
  OcrReceiptData,
  ClaimContext,
  ClaimSubmissionPayload,
  DbEmployee,
} from "../../../src/types/claim";



// ─── Screen components ────────────────────────────────────────────────────────
import { ProcessingScreen } from "./_components/ProcessingScreen";
import { VerificationScreen } from "./_components/VerificationScreen";
import { SuccessModal, type SuccessType } from "./_components/SuccessModal";
// CameraModal removed — using native <input capture="environment"> instead

// ─── Server Actions ───────────────────────────────────────────────────────────
import { getPolicies } from "@/lib/actions/policies";
import { uploadDocuments, editDocument, analyzeCompliance, saveDraft, updateDraft, loadDraft } from "@/lib/actions/claims";
import type { Policy, SubCategoryConfig, AnalyzeResponse, DocumentUploadResponse } from "@/lib/api/types";

// ─── SSE ─────────────────────────────────────────────────────────────────────
import { subscribeToProgress } from "@/lib/sse";

// ─── Stage type ───────────────────────────────────────────────────────────────

type Stage = "form" | "processing" | "verification";

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

function CaptureReceiptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Stage ──────────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("form");

  // ── Policy data (fetched via server action) ────────────────────────────────
  const [policyData, setPolicyData] = useState<Policy[]>([]);

  useEffect(() => {
    getPolicies().then((policies) => {
      setPolicyData(policies);
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
  const [currentStage, setCurrentStage] = useState("");
  const [stageData, setStageData] = useState<Record<string, unknown> | undefined>(undefined);
  const originalOcrRef = useRef<OcrReceiptData[]>([]);
  const sseCloseRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    return () => { sseCloseRef.current?.close(); };
  }, []);

  // ── Success modal ──────────────────────────────────────────────────────────
  const [showSuccess, setShowSuccess] = useState(false);

  // ── Draft state ────────────────────────────────────────────────────────────
  const [isSavingDraft, setIsSavingDraft]         = useState(false);
  const [draftSaved, setDraftSaved]               = useState(false);
  const [loadedDraftId, setLoadedDraftId]         = useState<string | null>(null);
  /**
   * Ref mirror of loadedDraftId — written synchronously so click handlers
   * can never read a stale null due to React batching or render timing.
   */
  const loadedDraftIdRef                           = useRef<string | null>(null);
  /** Always call this instead of setLoadedDraftId directly. */
  function setDraftId(id: string | null) {
    loadedDraftIdRef.current = id; // synchronous — safe to read in any handler
    setLoadedDraftId(id);
  }
  /**
   * Explicit dirty flag — true only after the USER makes a change.
   * Computed state caused bugs: loading a draft immediately triggered the guard,
   * and saving could never clear it.
   */
  const [isDirty, setIsDirty]                     = useState(false);

  // ── Unsaved-changes guard state ────────────────────────────────────────────
  const [showLeaveModal, setShowLeaveModal]       = useState(false);
  const [leaveModalStep, setLeaveModalStep]       = useState<"confirm" | "name">("confirm");
  /**
   * "leaving"  → triggered by nav interception; after save, navigate to pendingNavHref.
   * "saving"   → triggered by the explicit Save Draft button; after save, just close.
   */
  const [leaveModalMode, setLeaveModalMode]       = useState<"leaving" | "saving">("leaving");
  const [pendingNavHref, setPendingNavHref]       = useState<string | null>(null);
  const [pendingDraftTitle, setPendingDraftTitle] = useState("");
  const [isSavingLeave, setIsSavingLeave]         = useState(false);
  /** Names of original File objects (can't serialise blobs — shown in resume banner) */
  const [restoredFileNames, setRestoredFileNames] = useState<string[]>([]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedMain = policyData.find(d => d.title === mainCategory);
  const canProcess = files.length > 0 && mainCategory !== "";
  const isFull = files.length >= MAX_FILES;
  const activeFile = files.find(f => f.id === activeDocId) ?? null;

  // ── Browser refresh / tab-close guard ─────────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── In-app navigation intercept (captures <a> clicks in sidebar / bottom nav)
  useEffect(() => {
    if (!isDirty) return;
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      // Ignore same-page links or fragment/query links
      if (!href || href === "/employee/claims" || href.startsWith("#") || href.startsWith("?")) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavHref(href);
      setLeaveModalStep("confirm");
      setPendingDraftTitle("");
      setShowLeaveModal(true);
    };
    document.addEventListener("click", handleClick, true); // capture phase
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty]);

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
    processed.forEach((f, idx) => fileMapRef.current.set(added[idx].id, f));
    setFiles(prev => {
      const next = [...prev, ...added].slice(0, MAX_FILES);
      if (added.length > 0) setActiveDocId(added[0].id);
      return next;
    });
    setIsLoading(false);
    setIsDirty(true); // user added files
  }

  function handleRemoveFile(id: string) {
    fileMapRef.current.delete(id);
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter(f => f.id !== id);
      if (activeDocId === id) {
        const idx = prev.findIndex(f => f.id === id);
        setActiveDocId(next[Math.max(0, idx - 1)]?.id ?? null);
      }
      return next;
    });
    setIsDirty(true); // user removed a file
  }

  function handleRenameFile(id: string, newName: string) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  }

  // ── Real OCR via backend upload (with SSE live progress) ───────────────────
  function handleProcessResult(result: any, fileNames: string[]) {
    setSettlementId(result.settlement_id);
    setCompletedNames(fileNames);
    setProcessingIndex(fileNames.length - 1);
    setProcessingStep(3);

    // Map successful receipts
    const successReceipts: OcrReceiptData[] = ((result.receipts as any[]) || []).map((r: any, idx: number) => ({
      receiptIndex: idx,
      success: true,
      expenseDate: r.date ?? "",
      merchant: (r.extracted_data?.merchant_name as string) ?? r.description ?? "",
      transport: r.transportation ?? 0,
      accommodation: r.accommodation ?? 0,
      meals: r.meals ?? 0,
      others: r.others ?? 0,
      notes: r.description ?? "",
    }));

    // Map failed/skipped receipts — these were previously dropped entirely
    const skippedReceipts: OcrReceiptData[] = ((result.skipped_receipts as any[]) || []).map((r: any, idx: number) => ({
      receiptIndex: successReceipts.length + idx,
      success: false,
      expenseDate: r.date ?? "",
      merchant: (r.extracted_data?.merchant_name as string) ?? r.description ?? "",
      transport: r.transportation ?? 0,
      accommodation: r.accommodation ?? 0,
      meals: r.meals ?? 0,
      others: r.others ?? 0,
      notes: r.description ?? "",
    }));

    // Merge both — successful first, then failed (for display order)
    const mappedReceipts = [...successReceipts, ...skippedReceipts];

    // Collect document IDs from both successful and skipped receipts
    const successIds = ((result.receipts as any[]) || []).map((r: any) => r.document_id).filter(Boolean);
    const skippedIds = ((result.skipped_receipts as any[]) || []).map((r: any) => r.document_id).filter(Boolean);
    setDocumentIds([...successIds, ...skippedIds]);

    originalOcrRef.current = mappedReceipts.map(r => ({ ...r }));
    setOcrReceipts(mappedReceipts);

    if (result.employee) {
      const emp: any = result.employee;
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
  }

  async function runOcr(filesList: UploadedFile[]) {
    setProcessingIndex(0);
    setProcessingStep(1);
    setCompletedNames([]);

    const filesToUpload = filesList
      .map(f => fileMapRef.current.get(f.id))
      .filter((f): f is File => f !== undefined);

    if (filesToUpload.length === 0) {
      setStage("form");
      return;
    }

    const result = await uploadDocuments(filesToUpload);

    if ("error" in result) {
      setStage("form");
      setSubmitError(result.error);
      return;
    }

    const taskId = (result as unknown as Record<string, unknown>).task_id as string | undefined;

    if (!taskId) {
      handleProcessResult(result, filesList.map(f => f.name));
      return;
    }

    sseCloseRef.current = subscribeToProgress(taskId, "documents", {
      onProgress: (stage: string, data: Record<string, unknown>) => {
        setCurrentStage(stage);
        setStageData(data);

        if (stage === "ocr_processing") {
          const current = data.current as number;
          const filename = data.filename as string;
          setProcessingIndex(current - 1);
          setProcessingStep(2);
          if (filename) {
            setCompletedNames((prev: string[]) => [...prev, filename]);
          }
        } else if (stage === "saving") {
          setProcessingStep(2);
        }
      },
      onComplete: (completeResult: Record<string, unknown>) => {
        handleProcessResult(completeResult, filesList.map(f => f.name));
      },
        onError: (error: string) => {
          console.error("OCR SSE error:", error);
          handleProcessResult(result as unknown as DocumentUploadResponse, files.map(f => f.name));
        },
    });
  }

  async function handleProcessReceipts() {
    if (!canProcess) return;
    setProcessingIndex(0);
    setProcessingStep(0);
    setStage("processing");
    await runOcr(files);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!settlementId) {
      setSubmitError("No settlement found. Please re-upload your receipts.");
      return;
    }

    const policy = policyData.find(p => p.title === mainCategory);
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
      document_ids: documentIds,
    });

    if ("error" in analyzeResult) {
      setIsSubmitting(false);
      setSubmitError(analyzeResult.error);
      return;
    }

    const taskId = (analyzeResult as unknown as Record<string, unknown>).task_id as string | undefined;

    if (taskId) {
      sseCloseRef.current = subscribeToProgress(taskId, "reimbursements", {
        onProgress: (_stage: string, _data: Record<string, unknown>) => {
          // Compliance analysis progress updates
        },
        onComplete: (completeResult: Record<string, unknown>) => {
          setIsSubmitting(false);
          setAnalysisResult(completeResult as unknown as AnalyzeResponse);
          setShowSuccess(true);
        },
        onError: (error: string) => {
          console.error("Compliance SSE error:", error);
          setSubmitError(error);
          setIsSubmitting(false);
        },
      });
    } else {
      setIsSubmitting(false);
      setAnalysisResult(analyzeResult);
      setShowSuccess(true);
    }
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
    setCurrentStage("");
    setStageData(undefined);
    setDraftId(null);
    setDraftSaved(false);
    setRestoredFileNames([]);
    setIsDirty(false); // reset guard — form is now clean
  }

  function handleSubmitAnother() {
    setShowSuccess(false);
    resetAll();
    setStage("form");
  }

  // ── Draft: Save / Update ────────────────────────────────────────────────────
  /**
   * Persists the current form state as a draft.
   * - If `loadedDraftId` is set  → PUT (update existing, no title change needed).
   * - Otherwise                  → POST (create new, `customTitle` required).
   * Returns true on success, false on error.
   */
  async function handleSaveDraft(customTitle?: string): Promise<boolean> {
    setIsSavingDraft(true);
    setDraftSaved(false);

    const fileNames = files.map(f => f.name);
    const draftData: Record<string, unknown> = {
      ocrReceipts, claimContext, settlementId,
      documentIds, employeeData, mainCategory, stage, fileNames,
    };
    const failedCount = ocrReceipts.filter(r => !r.success).length;
    const payload = {
      main_category: mainCategory || null,
      settlement_id: settlementId || null,
      draft_data: draftData,
      receipt_count: ocrReceipts.length,
      failed_receipt_count: failedCount,
    };

    let result;
    const currentDraftId = loadedDraftIdRef.current; // read ref — always current
    if (currentDraftId) {
      // Scenario C — updating an existing draft silently
      result = await updateDraft(currentDraftId, payload);
    } else {
      // New draft — needs a title
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      result = await saveDraft({ ...payload, title: customTitle?.trim() || `Draft — ${today}` });
    }

    setIsSavingDraft(false);

    if ("error" in result) {
      setSubmitError(result.error);
      return false;
    }
    setDraftSaved(true);
    setIsDirty(false);
    if (!currentDraftId) setDraftId((result as any).draft_id);
    setTimeout(() => setDraftSaved(false), 3000);
    return true;
  }

  /**
   * Called by the explicit "Save Draft" button.
   * - Existing draft → silent update (no name prompt).
   * - New draft      → open naming dialog.
   */
  function handleSaveDraftButton() {
    const currentDraftId = loadedDraftIdRef.current;
    console.log('[Draft] Save button clicked. Current draft ID:', currentDraftId);
    if (currentDraftId) {
      // Existing draft — silent update, no name prompt
      handleSaveDraft();
    } else {
      // New draft — ask for a name
      setLeaveModalMode("saving");
      setLeaveModalStep("name");
      setPendingDraftTitle("");
      setPendingNavHref(null);
      setShowLeaveModal(true);
    }
  }

  // ── Draft: Load from query param ────────────────────────────────────────────
  const handleLoadDraft = useCallback(async (draftId: string) => {
    const result = await loadDraft(draftId);
    if ("error" in result) {
      setSubmitError(result.error);
      return;
    }

    const data = result.draft_data as Record<string, unknown>;
    setDraftId(result.draft_id);

    if (result.main_category) setMainCategory(result.main_category);
    if (result.settlement_id) setSettlementId(result.settlement_id);
    if (data.documentIds) setDocumentIds(data.documentIds as string[]);
    if (data.claimContext) setClaimContext(data.claimContext as ClaimContext);
    if (data.employeeData) setEmployeeData(data.employeeData as DbEmployee);

    console.log('[Draft] Loaded draft ID:', result.draft_id, '— loadedDraftIdRef:', loadedDraftIdRef.current);

    // Store original file names so we can show a re-upload banner
    if (data.fileNames) setRestoredFileNames(data.fileNames as string[]);

    if (data.ocrReceipts) {
      const receipts = data.ocrReceipts as OcrReceiptData[];
      setOcrReceipts(receipts);
      originalOcrRef.current = receipts.map(r => ({ ...r }));
    }

    // Restore to the saved stage (verification if OCR was done)
    const savedStage = data.stage as Stage | undefined;
    if (savedStage === "verification" && data.ocrReceipts) {
      setStage("verification");
    } else {
      setStage("form");
    }
    setIsDirty(false); // loading a draft → start clean, guard only fires after user edits

    // Strip the ?draft_id= query param so the URL is clean and this effect
    // doesn't re-fire on every subsequent re-render (which would reset loadedDraftId).
    if (typeof window !== "undefined") {
      const clean = window.location.pathname;
      window.history.replaceState(null, "", clean);
    }
  }, []);

  useEffect(() => {
    const draftId = searchParams.get("draft_id");
    if (draftId) {
      handleLoadDraft(draftId);
    }
  }, [searchParams, handleLoadDraft]);

  // ── Leave / Save modal handlers ────────────────────────────────────────────
  async function handleSaveAndLeave() {
    // Existing draft: no title input needed — ref holds the ID synchronously.
    // New draft: title must have been entered in the name step.
    if (!loadedDraftIdRef.current && !pendingDraftTitle.trim()) return;
    setIsSavingLeave(true);
    const ok = await handleSaveDraft(pendingDraftTitle || undefined);
    setIsSavingLeave(false);
    if (!ok) return;
    setShowLeaveModal(false);
    if (leaveModalMode === "leaving" && pendingNavHref) {
      resetAll();
      router.push(pendingNavHref);
    }
    // "saving" mode → just close, stay on page
  }

  function handleDiscardAndLeave() {
    setShowLeaveModal(false);
    const href = pendingNavHref;
    resetAll();
    if (href) router.push(href);
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

        {/* ── Re-upload banner (shown when resuming a form-stage draft) ───────── */}
        {loadedDraftId && stage === "form" && restoredFileNames.length > 0 && files.length === 0 && (
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3.5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 font-headline">
                Receipt files need to be re-added
              </p>
              <p className="text-xs text-amber-700 font-body mt-0.5 leading-relaxed">
                Draft restored — but uploaded files can’t be stored in a draft.
                Please re-add: <span className="font-semibold">{restoredFileNames.join(", ")}</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Stage Router ──────────────────────────────────────────────────── */}

        {stage === "processing" && (
          <ProcessingScreen
            totalFiles={files.length}
            currentIndex={processingIndex}
            currentStep={processingStep}
            completedFileNames={completedNames}
            currentStage={currentStage}
            stageData={stageData}
          />
        )}

        {stage === "verification" && (
          <>
            <VerificationScreen
              dbData={employeeData ?? {
                entityName: "Reclaim",
                employeeName: "Unknown",
                employeeNumber: "",
                position: "",
                location: "",
                department: "",
              }}
              mainCategory={mainCategory}
              ocrReceipts={ocrReceipts}
              claimContext={claimContext}
              onClaimContextChange={ctx => { setClaimContext(ctx); setIsDirty(true); }}
              onReceiptsChange={receipts => { setOcrReceipts(receipts); setIsDirty(true); }}
              onBack={() => setStage("form")}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
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
                options={policyData.map(d => d.title)}
                value={mainCategory}
                onChange={v => { setMainCategory(v); setFiles([]); setActiveDocId(null); setIsDirty(true); }}
                placeholder="Select a category…"
              />
              {selectedMain && (
                <p className="text-xs text-on-surface-variant font-body ml-1">
                  Covers: {selectedMain.reimbursable_categories.slice(0, 3).join(", ")} &amp; more.
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
                onClick={handleSaveDraftButton}
                disabled={isSavingDraft || (!mainCategory && files.length === 0 && ocrReceipts.length === 0)}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm font-body text-center transition-all duration-200 ${
                  draftSaved
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : isSavingDraft
                    ? "bg-surface-container text-on-surface-variant/50 cursor-wait"
                    : "text-on-surface-variant bg-surface-container hover:bg-surface-container-high active:scale-[0.97]"
                }`}
              >
                {isSavingDraft ? "Saving…" : draftSaved ? "✓ Draft Saved!" : "Save Draft"}
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

      {/* ── Leave / Unsaved-Changes Modal ───────────────────────────────────── */}
      {showLeaveModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", background: "rgba(15,15,25,0.45)" }}
        >
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-3xl shadow-[0_32px_80px_-16px_rgba(0,0,0,0.35)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {leaveModalStep === "confirm" ? (
              /* Step 1 — confirm save or discard */
              <div className="flex flex-col">
                {/* Icon header */}
                <div className="flex flex-col items-center pt-8 pb-5 px-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-7 h-7 text-amber-500" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-bold text-on-surface font-headline text-center">
                    You have unsaved changes
                  </h3>
                  <p className="text-sm text-on-surface-variant font-body text-center mt-1.5 leading-relaxed">
                    Do you want to save this as a draft before leaving? You can resume it later from the Drafts tab.
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-outline-variant/10 mx-6" />

                {/* Actions */}
                <div className="flex flex-col gap-2.5 p-5">
                  <button
                    id="leave-modal-save-btn"
                    onClick={() => {
                      setLeaveModalMode("leaving");
                      if (loadedDraftIdRef.current) {
                        // Existing draft — save silently without asking for a name
                        handleSaveAndLeave();
                      } else {
                        // New draft — must enter a name first
                        setLeaveModalStep("name");
                      }
                    }}
                    className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-semibold text-sm font-body shadow-[0_4px_16px_rgba(70,71,211,0.3)] hover:shadow-[0_6px_24px_rgba(70,71,211,0.4)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
                  >
                    Save Draft
                  </button>
                  <button
                    id="leave-modal-discard-btn"
                    onClick={handleDiscardAndLeave}
                    className="w-full py-3 rounded-2xl text-error font-semibold text-sm font-body hover:bg-error/8 active:scale-[0.97] transition-all duration-200"
                  >
                    Discard & Leave
                  </button>
                  <button
                    id="leave-modal-cancel-btn"
                    onClick={() => setShowLeaveModal(false)}
                    className="w-full py-2.5 rounded-2xl text-on-surface-variant font-medium text-sm font-body hover:bg-surface-container active:scale-[0.97] transition-all duration-200"
                  >
                    Stay on this page
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2 — name input (new draft) or hidden (existing draft auto-saves) */
              <div className="flex flex-col">
                <div className="flex flex-col pt-8 pb-5 px-6">
                  {leaveModalMode === "leaving" && (
                    <button
                      onClick={() => setLeaveModalStep("confirm")}
                      className="self-start text-xs font-semibold text-on-surface-variant hover:text-on-surface mb-4 flex items-center gap-1 active:scale-95 transition-all"
                    >
                      ← Back
                    </button>
                  )}
                  <h3 className="text-lg font-bold text-on-surface font-headline">
                    Name your draft
                  </h3>
                  <p className="text-sm text-on-surface-variant font-body mt-1 mb-5 leading-relaxed">
                    Give it a meaningful name so you can find it easily later.
                  </p>

                  <input
                    id="draft-title-input"
                    type="text"
                    autoFocus
                    value={pendingDraftTitle}
                    onChange={e => setPendingDraftTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && pendingDraftTitle.trim()) handleSaveAndLeave(); }}
                    placeholder="e.g. Kuching Trip — April 2026"
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-3 text-sm text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-on-surface-variant/40"
                  />
                </div>

                <div className="h-px bg-outline-variant/10 mx-6" />

                <div className="flex gap-2.5 p-5">
                  <button
                    onClick={() => setShowLeaveModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-surface-container text-on-surface-variant font-semibold text-sm font-body hover:bg-surface-container-high active:scale-[0.97] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    id="draft-save-confirm-btn"
                    onClick={handleSaveAndLeave}
                    disabled={(!loadedDraftId && !pendingDraftTitle.trim()) || isSavingLeave}
                    className={`flex-1 py-3 rounded-2xl font-semibold text-sm font-body transition-all duration-200 ${
                      (loadedDraftId || pendingDraftTitle.trim()) && !isSavingLeave
                        ? "bg-primary text-on-primary shadow-[0_4px_16px_rgba(70,71,211,0.3)] hover:scale-[1.02] active:scale-[0.97]"
                        : "bg-primary/30 text-on-primary/60 cursor-not-allowed"
                    }`}
                  >
                    {isSavingLeave ? "Saving…" : leaveModalMode === "saving" ? "Save Draft" : "Save & Leave"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CaptureReceiptPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-surface-container-lowest">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-on-surface-variant font-body">Loading Capture Receipts...</p>
        </div>
      </div>
    }>
      <CaptureReceiptContent />
    </Suspense>
  );
}
