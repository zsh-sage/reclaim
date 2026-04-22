"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  FileText,
  Folder,
  ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedData {
  merchant: string;
  amount: string;
  date: string;
}

interface UploadedFileMeta {
  name: string;
  size: number;
  previewUrl: string; // blob URL from URL.createObjectURL
  type: string;       // MIME type
}

interface VerificationScreenProps {
  extractedData: ExtractedData;
  uploadedFiles: UploadedFileMeta[];
  clientName: string;
  purpose: string;
  onClientNameChange: (v: string) => void;
  onPurposeChange: (v: string) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

// ─── Locked field (read-only, OCR-extracted) ──────────────────────────────────

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/15 relative group">
      <label className="block text-xs font-medium text-on-surface-variant font-label mb-1">
        {label}
      </label>
      <div className="text-on-surface font-semibold text-base font-headline truncate pr-6">
        {value}
      </div>
      <Lock className="w-3.5 h-3.5 text-outline-variant absolute top-4 right-4 group-hover:text-on-surface-variant transition-colors" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VerificationScreen({
  extractedData,
  uploadedFiles,
  clientName,
  purpose,
  onClientNameChange,
  onPurposeChange,
  onBack,
  onSaveDraft,
  onSubmit,
}: VerificationScreenProps) {
  const [activeDocIdx, setActiveDocIdx] = useState(0);
  const [zoom, setZoom]                 = useState(1);
  const canSubmit = clientName.trim().length > 0 && purpose.trim().length > 0;

  const ZOOM_STEP = 0.25;
  const MIN_ZOOM  = 0.5;
  const MAX_ZOOM  = 3;

  function zoomIn()    { setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))); }
  function zoomOut()   { setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))); }
  function zoomReset() { setZoom(1); }

  return (
    <div className="w-full flex flex-col lg:flex-row gap-5 items-stretch">

      {/* ── Left: Document Viewer ─────────────────── */}
      <div className="w-full lg:flex-1 min-h-[500px] h-[60vh] lg:h-auto bg-surface-container-lowest rounded-3xl border border-outline-variant/15 shadow-[0_8px_40px_-8px_rgba(44,47,49,0.08)] flex flex-col overflow-hidden relative">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container-lowest z-10 border-b border-outline-variant/10">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 bg-primary text-on-primary text-sm font-semibold font-body px-4 py-2 rounded-full hover:bg-primary-dim active:scale-95 transition-all duration-200 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
              Back
            </button>

            <div className="flex items-center gap-2">
              {/* Zoom controls — only useful for images */}
              <button onClick={zoomOut}  aria-label="Zoom out"  className="w-9 h-9 bg-surface-container border border-outline-variant/20 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface active:scale-90 transition-all"><ZoomOut  className="w-4 h-4" strokeWidth={1.75} /></button>
              <span className="text-xs font-semibold text-on-surface-variant w-10 text-center font-label">{Math.round(zoom * 100)}%</span>
              <button onClick={zoomIn}   aria-label="Zoom in"   className="w-9 h-9 bg-surface-container border border-outline-variant/20 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface active:scale-90 transition-all"><ZoomIn   className="w-4 h-4" strokeWidth={1.75} /></button>
              <button onClick={zoomReset} aria-label="Reset zoom" className="w-9 h-9 bg-surface-container border border-outline-variant/20 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface active:scale-90 transition-all"><Maximize2 className="w-4 h-4" strokeWidth={1.75} /></button>
            </div>
          </div>

          {/* ── Strict viewer box ── */}
          <div
            className="flex-1 overflow-auto bg-surface-container-low/30 flex items-center justify-center"
            style={{ minHeight: 0 }}
          >
            {uploadedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <FileText className="w-12 h-12 text-outline-variant" strokeWidth={1.25} />
                <p className="text-sm text-on-surface-variant font-body">No documents attached</p>
              </div>
            ) : (() => {
              const current = uploadedFiles[activeDocIdx];
              if (!current) return null;
              const isImage = current.type.startsWith("image/");
              const isPDF   = current.type === "application/pdf";

              if (isImage) return (
                <div
                  className="w-full h-full overflow-auto flex items-center justify-center p-4 lg:p-6"
                  style={{ touchAction: "pinch-zoom" }}
                >
                  <img
                    src={current.previewUrl}
                    alt={current.name}
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
              );

              if (isPDF) return (
                <iframe
                  src={current.previewUrl}
                  title={current.name}
                  className="w-full h-full border-0"
                />
              );

              return (
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 bg-surface-container rounded-3xl flex items-center justify-center shadow-sm">
                    <FileText className="w-10 h-10 text-outline-variant" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-on-surface font-headline">{current.name}</p>
                    <p className="text-xs text-on-surface-variant font-body mt-1">Preview not available for this file type</p>
                  </div>
                </div>
              );
            })()}
          </div>

        {/* Footer: current file + Scanned badge + multi-doc pagination */}
        {uploadedFiles.length > 0 && (
          <div className="border-t border-outline-variant/10 bg-surface-container-lowest px-4 py-2.5 flex items-center gap-3">

            {/* Multi-doc prev/next (when >1 doc) */}
            {uploadedFiles.length > 1 && (
              <div className="flex items-center shrink-0">
                <button onClick={() => { setActiveDocIdx(i => Math.max(0, i - 1)); setZoom(1); }} className="p-1 text-on-surface-variant hover:text-on-surface transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-1.5 text-xs font-semibold text-on-surface font-label whitespace-nowrap">
                  {activeDocIdx + 1} / {uploadedFiles.length}
                </span>
                <button onClick={() => { setActiveDocIdx(i => Math.min(uploadedFiles.length - 1, i + 1)); setZoom(1); }} className="p-1 text-on-surface-variant hover:text-on-surface transition-colors">
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm font-medium text-on-surface truncate flex-1">
              <FileText className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
              <span className="truncate">{uploadedFiles[activeDocIdx]?.name}</span>
            </div>
            <span className="bg-primary/10 text-primary text-[11px] font-semibold font-label px-3 py-1 rounded-full shrink-0 tracking-wide">
              Scanned
            </span>
          </div>
        )}
      </div>

      {/* ── Right: Data Entry Panel ───────────────── */}
      <div className="w-full lg:w-[460px] bg-surface-container-lowest rounded-3xl border border-outline-variant/15 shadow-[0_8px_40px_-8px_rgba(44,47,49,0.08)] flex flex-col overflow-hidden">
        <div className="flex-1 p-6 lg:p-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight mb-1.5">
              Transaction Details
            </h1>
            <p className="text-sm text-on-surface-variant font-body leading-relaxed">
              Review extracted data and complete missing information.
            </p>
          </div>

          {/* Extracted Data section */}
          <div className="mb-8">
            <h3 className="text-[11px] font-bold text-primary font-label uppercase tracking-widest mb-4">
              Extracted Data
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <LockedField label="Merchant" value={extractedData.merchant} />
              <LockedField label="Amount" value={extractedData.amount} />
            </div>
            <LockedField label="Date" value={extractedData.date} />
          </div>

          {/* Divider */}
          <hr className="border-outline-variant/15 mb-8" />

          {/* Report Information */}
          <div className="bg-surface-container-low/50 rounded-3xl p-5 border border-outline-variant/10">
            <div className="flex items-start gap-3 mb-5">
              <div className="bg-surface-container-lowest p-2 rounded-xl shadow-sm border border-outline-variant/10 text-primary shrink-0">
                <Folder className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface font-headline uppercase tracking-wider">
                  Report Information
                </h3>
                <p className="text-xs text-on-surface-variant font-body mt-0.5 leading-relaxed">
                  Applies to all documents in this claim.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Client Name */}
              <div>
                <label
                  htmlFor="client-name"
                  className="block text-sm font-medium text-on-surface font-body mb-2"
                >
                  Client Name <span className="text-error">*</span>
                </label>
                <input
                  id="client-name"
                  type="text"
                  value={clientName}
                  onChange={e => onClientNameChange(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-sm rounded-xl px-4 py-3 font-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm placeholder:text-on-surface-variant/50"
                />
              </div>

              {/* Purpose */}
              <div>
                <label
                  htmlFor="purpose"
                  className="block text-sm font-medium text-on-surface font-body mb-2"
                >
                  Purpose of Expense <span className="text-error">*</span>
                </label>
                <textarea
                  id="purpose"
                  value={purpose}
                  onChange={e => onPurposeChange(e.target.value)}
                  placeholder="Briefly describe the business purpose..."
                  rows={3}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface text-sm rounded-xl px-4 py-3 font-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm resize-none placeholder:text-on-surface-variant/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="border-t border-outline-variant/10 bg-surface-container-lowest/80 backdrop-blur-md px-6 py-4 flex items-center justify-between rounded-b-3xl">
          <button
            onClick={onSaveDraft}
            className="text-primary font-semibold text-sm hover:text-primary-dim px-4 py-2 rounded-xl transition-colors active:scale-95 font-body"
          >
            Save Draft
          </button>
          <button
            disabled={!canSubmit}
            onClick={onSubmit}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm font-body transition-all duration-200 ${
              canSubmit
                ? "bg-primary text-on-primary hover:bg-primary-dim shadow-[0_4px_16px_rgba(70,71,211,0.3)] hover:shadow-[0_6px_24px_rgba(70,71,211,0.4)] hover:scale-[1.02] active:scale-[0.97]"
                : "bg-primary/25 text-on-primary/50 cursor-not-allowed"
            }`}
          >
            Submit for Approval
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
