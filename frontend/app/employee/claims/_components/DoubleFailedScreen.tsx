"use client";

import { XCircle, Trash2, UserCheck } from "lucide-react";

interface DoubleFailedScreenProps {
  onDiscard: () => void;
  onEscalate: () => void;
}

export function DoubleFailedScreen({ onDiscard, onEscalate }: DoubleFailedScreenProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 shadow-[0_8px_40px_-8px_rgba(44,47,49,0.1)] p-10 flex flex-col items-center text-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-error/10 border border-error/20 flex items-center justify-center mb-6">
          <XCircle className="w-8 h-8 text-error" strokeWidth={1.75} />
        </div>

        {/* Text */}
        <h2 className="font-headline text-xl font-bold text-on-surface tracking-tight mb-3">
          Unable to Process Receipt
        </h2>
        <p className="text-sm text-on-surface-variant font-body leading-relaxed max-w-xs mb-2">
          Our AI couldn&apos;t extract the required data after 2 attempts.
        </p>
        <p className="text-sm text-on-surface-variant font-body leading-relaxed max-w-xs mb-8">
          You can discard this submission, or request a manual review by HR who will verify the claim on your behalf.
        </p>

        {/* Attempt indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-2.5 h-2.5 rounded-full bg-error" />
          <div className="w-2.5 h-2.5 rounded-full bg-error" />
          <span className="text-xs text-error font-label ml-1 font-semibold">2 attempts failed</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={onDiscard}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm font-body border border-error/30 text-error bg-error/5 hover:bg-error/10 hover:border-error/50 active:scale-95 transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
            Discard Claim
          </button>
          <button
            onClick={onEscalate}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm font-body bg-primary text-on-primary shadow-[0_4px_16px_rgba(70,71,211,0.3)] hover:bg-primary-dim hover:shadow-[0_6px_24px_rgba(70,71,211,0.4)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
          >
            <UserCheck className="w-4 h-4" strokeWidth={1.75} />
            Request HR Review
          </button>
        </div>
      </div>
    </div>
  );
}
