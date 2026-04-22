"use client";

import { Settings, CheckCircle2, ScanLine } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessingScreenProps {
  /** 0 = scanning, 1 = reading, 2 = extracting */
  currentStep: number;
}

// ─── Step definitions (OCR only — no policy check) ───────────────────────────

const OCR_STEPS = [
  {
    id: "scan",
    label: "Scanning document...",
    subtitle: "Document scanned successfully.",
  },
  {
    id: "read",
    label: "Reading document...",
    subtitle: "Text extracted successfully.",
  },
  {
    id: "extract",
    label: "Extracting data...",
    subtitle: "Identifying merchant and line items.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ProcessingScreen({ currentStep }: ProcessingScreenProps) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-center mt-6 md:mt-12 lg:mt-12">
      <div className="relative rounded-3xl overflow-hidden shadow-[0_24px_80px_-16px_rgba(44,47,49,0.18)] flex flex-col sm:flex-row min-h-[460px] w-full">

        {/* ── Left: Gradient Anchor ─────────────────── */}
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
              Processing<br />Receipt
            </h2>
          </div>

          {/* Engine Status badge */}
          <div className="relative z-10 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
            <p className="text-[10px] text-white/70 font-label font-semibold uppercase tracking-widest mb-1">
              Engine Status
            </p>
            <p className="text-white text-sm font-semibold font-body">Reclaim AI Active</p>
          </div>
        </div>

        {/* ── Right: Stepper ────────────────────────── */}
        <div className="flex-1 bg-surface-container-lowest p-8 sm:p-10 flex flex-col justify-center">

          {/* Header row */}
          <div className="flex items-center gap-4 mb-10">
            <div
              className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center shrink-0"
              style={{ animation: "spin 3s linear infinite" }}
            >
              <Settings className="w-5 h-5 text-primary" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-headline text-lg font-semibold text-on-surface leading-tight">
                Analyzing Data
              </h3>
              <p className="text-on-surface-variant text-sm font-body mt-0.5">
                Please do not close this window.
              </p>
            </div>
          </div>

          {/* Vertical Stepper */}
          <div className="relative ml-3">
            {/* Background track */}
            <div className="absolute top-3 bottom-3 left-[11px] w-0.5 bg-surface-container-high rounded-full" />
            {/* Progress fill — fills proportionally to currentStep */}
            <div
              className="absolute top-3 left-[11px] w-0.5 bg-primary rounded-full transition-all duration-700 ease-in-out"
              style={{
                height:
                  currentStep === 0 ? "0%" :
                  currentStep === 1 ? "40%" :
                  "80%",
              }}
            />

            <div className="flex flex-col gap-8">
              {OCR_STEPS.map((step, idx) => {
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
                    <div>
                      <p className={`font-semibold text-sm leading-tight font-headline ${
                        isActive    ? "text-primary" :
                        isCompleted ? "text-on-surface" :
                                      "text-on-surface-variant/40"
                      }`}>
                        {step.label}
                      </p>
                      {(isCompleted || isActive) && (
                        <p className="text-on-surface-variant text-xs mt-1 font-body leading-relaxed">
                          {step.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
