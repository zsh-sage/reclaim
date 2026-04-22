"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface RetryFailedScreenProps {
  onRetry: () => void;
}

export function RetryFailedScreen({ onRetry }: RetryFailedScreenProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 shadow-[0_8px_40px_-8px_rgba(44,47,49,0.1)] p-10 flex flex-col items-center text-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-amber-500" strokeWidth={1.75} />
        </div>

        {/* Text */}
        <h2 className="font-headline text-xl font-bold text-on-surface tracking-tight mb-3">
          Couldn&apos;t Read the Receipt
        </h2>
        <p className="text-sm text-on-surface-variant font-body leading-relaxed max-w-xs mb-8">
          This can happen with low-quality images, glare, or poor lighting.
          Please re-upload a clearer version of your document for our second attempt.
        </p>

        {/* Attempt indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-surface-container-high" />
          <span className="text-xs text-on-surface-variant font-label ml-1">Attempt 1 of 2</span>
        </div>

        {/* CTA */}
        <button
          onClick={onRetry}
          className="flex items-center gap-2 w-full justify-center px-6 py-3.5 rounded-xl font-semibold text-sm font-body bg-primary text-on-primary shadow-[0_4px_16px_rgba(70,71,211,0.3)] hover:bg-primary-dim hover:shadow-[0_6px_24px_rgba(70,71,211,0.4)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={2} />
          Re-upload Document
        </button>
      </div>
    </div>
  );
}
