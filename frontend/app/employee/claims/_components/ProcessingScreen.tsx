"use client";

import { CheckCircle2, ScanLine, FileSearch, DatabaseZap } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessingScreenProps {
  /** Total number of uploaded receipts being processed. */
  totalFiles:   number;
  /** Index of the receipt currently being processed (0-based). */
  currentIndex: number;
  /**
   * Trail log step within the current receipt:
   *   0 = Scanning document
   *   1 = Reading content
   *   2 = Extracting data
   */
  currentStep:  number;
  /** Names of fully-completed receipts (for the log list below the stepper). */
  completedFileNames: string[];
}

// ─── Trail log steps ──────────────────────────────────────────────────────────

const TRAIL_STEPS = [
  {
    id:       "scan",
    icon:     ScanLine,
    label:    "Scanning document",
    subtitle: "Document image captured.",
  },
  {
    id:       "read",
    icon:     FileSearch,
    label:    "Reading content",
    subtitle: "Text layer extracted.",
  },
  {
    id:       "extract",
    icon:     DatabaseZap,
    label:    "Extracting data",
    subtitle: "Fields identified and mapped.",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function ProcessingScreen({
  totalFiles,
  currentIndex,
  currentStep,
  completedFileNames,
}: ProcessingScreenProps) {
  const overallPct = totalFiles > 0
    ? Math.round((currentIndex / totalFiles) * 100)
    : 0;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-center mt-6 md:mt-12">
      <div className="relative rounded-3xl overflow-hidden shadow-[0_24px_80px_-16px_rgba(44,47,49,0.18)] flex flex-col sm:flex-row min-h-[480px] w-full">

        {/* ── Left: Gradient anchor ──────────────────────────────────────────── */}
        <div
          className="sm:w-[42%] p-8 flex flex-col justify-between relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #4647d3 0%, #9396ff 50%, #9e00b4 100%)" }}
        >
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-900/20 rounded-full blur-2xl translate-y-1/4 -translate-x-1/4 pointer-events-none" />

          {/* Icon + Title */}
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6">
              <ScanLine className="w-6 h-6 text-white" strokeWidth={1.75} />
            </div>
            <h2 className="font-headline text-2xl font-bold text-white tracking-tight leading-snug">
              Processing<br />Receipts
            </h2>
            <p className="text-white/70 text-sm font-body mt-2 leading-relaxed">
              Reclaim AI is reading your documents. Please keep this window open.
            </p>
          </div>

          {/* Overall progress */}
          <div className="relative z-10 mt-6">
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/70 font-label font-semibold uppercase tracking-widest">
                  Overall Progress
                </p>
                <span className="text-white text-xs font-bold font-label">
                  {overallPct}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700 ease-in-out"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <p className="text-white/80 text-xs font-body mt-2">
                Receipt {Math.min(currentIndex + 1, totalFiles)} of {totalFiles}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Trail log stepper ───────────────────────────────────────── */}
        <div className="flex-1 bg-surface-container-lowest p-8 sm:p-10 flex flex-col">

          {/* Active receipt label */}
          <div className="mb-8">
            <p className="text-[11px] text-primary/80 font-label font-bold uppercase tracking-widest mb-1">
              Currently Processing
            </p>
            <h3 className="font-headline text-lg font-semibold text-on-surface leading-tight">
              Receipt {currentIndex + 1} of {totalFiles}
            </h3>
            <p className="text-on-surface-variant text-sm font-body mt-0.5">
              Running AI vision extraction…
            </p>
          </div>

          {/* Trail log stepper */}
          <div className="relative ml-3 mb-8">
            {/* Background track */}
            <div className="absolute top-3 bottom-3 left-[11px] w-0.5 bg-surface-container-high rounded-full" />
            {/* Progress fill */}
            <div
              className="absolute top-3 left-[11px] w-0.5 bg-primary rounded-full transition-all duration-700 ease-in-out"
              style={{
                height:
                  currentStep === 0 ? "0%" :
                  currentStep === 1 ? "40%" :
                  "80%",
              }}
            />

            <div className="flex flex-col gap-7">
              {TRAIL_STEPS.map((step, idx) => {
                const StepIcon   = step.icon;
                const isCompleted = idx < currentStep;
                const isActive    = idx === currentStep;
                const isPending   = idx > currentStep;

                return (
                  <div key={step.id} className="flex items-start gap-5 relative">
                    {/* Dot indicator */}
                    {isCompleted && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 shadow-[0_4px_12px_rgba(70,71,211,0.35)] z-10">
                        <CheckCircle2 className="w-3.5 h-3.5 text-on-primary" strokeWidth={2.5} />
                      </div>
                    )}
                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-primary border-[3px] border-surface-container-lowest flex items-center justify-center shrink-0 mt-0.5 relative z-10 shadow-[0_0_0_2px_#4647d3]">
                        <div className="absolute inset-[-4px] rounded-full border-2 border-primary/50 animate-ping" />
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                    {isPending && (
                      <div className="w-6 h-6 rounded-full bg-surface-container border border-outline-variant/30 shrink-0 mt-0.5 z-10" />
                    )}

                    {/* Step text */}
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isActive    ? "bg-primary/15" :
                        isCompleted ? "bg-primary/10" :
                                      "bg-surface-container"
                      }`}>
                        <StepIcon
                          className={`w-4 h-4 transition-colors ${
                            isActive    ? "text-primary" :
                            isCompleted ? "text-primary/70" :
                                          "text-outline-variant/40"
                          }`}
                          strokeWidth={1.75}
                        />
                      </div>
                      <div>
                        <p className={`font-semibold text-sm leading-tight font-headline ${
                          isActive    ? "text-primary" :
                          isCompleted ? "text-on-surface" :
                                        "text-on-surface-variant/40"
                        }`}>
                          {step.label}
                        </p>
                        {(isCompleted || isActive) && (
                          <p className="text-on-surface-variant text-xs mt-0.5 font-body leading-relaxed">
                            {step.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completed receipts log */}
          {completedFileNames.length > 0 && (
            <div className="mt-auto pt-4 border-t border-outline-variant/10">
              <p className="text-[10px] text-on-surface-variant/60 font-label font-semibold uppercase tracking-widest mb-2">
                Completed
              </p>
              <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-1
                [&::-webkit-scrollbar]:w-1
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-outline-variant/20
                [&::-webkit-scrollbar-thumb]:rounded-full">
                {completedFileNames.map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs font-body text-on-surface-variant animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" strokeWidth={2} />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
