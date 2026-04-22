"use client";

import { CheckCircle2, LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export type SuccessType = "claim" | "hr";

interface SuccessModalProps {
  type: SuccessType;
  onSubmitAnother: () => void;
}

export function SuccessModal({ type, onSubmitAnother }: SuccessModalProps) {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const isHr = type === "hr";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? "bg-black/30 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div
        className={`w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-[0_32px_80px_-16px_rgba(44,47,49,0.25)] border border-outline-variant/15 flex flex-col items-center text-center p-10 transition-all duration-500 ${
          visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
        }`}
      >
        {/* Success animation ring */}
        <div className="relative w-20 h-20 mb-7">
          <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={1.75} />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight mb-3">
          {isHr ? "Sent to HR!" : "Claim Submitted!"}
        </h2>

        {/* Body */}
        <p className="text-sm text-on-surface-variant font-body leading-relaxed max-w-xs mb-2">
          {isHr
            ? "Your claim and documents have been forwarded to the HR team for manual review."
            : "Your expense claim has been submitted for approval."}
        </p>
        <p className="text-sm text-on-surface-variant font-body leading-relaxed max-w-xs mb-8">
          {isHr
            ? "You'll be notified once they complete the verification."
            : "You'll be notified once it's reviewed by your manager."}
        </p>

        {/* Policy check note (only for normal submission) */}
        {!isHr && (
          <div className="bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3 mb-8 w-full">
            <p className="text-xs text-primary font-body leading-relaxed">
              🔍 Policy compliance check is running in the background — no action needed from you.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={onSubmitAnother}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm font-body border border-outline-variant/30 text-on-surface bg-surface-container hover:bg-surface-container-high active:scale-95 transition-all duration-200"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Submit Another
          </button>
          <Link
            href="/employee/dashboard"
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm font-body bg-primary text-on-primary shadow-[0_4px_16px_rgba(70,71,211,0.3)] hover:bg-primary-dim hover:shadow-[0_6px_24px_rgba(70,71,211,0.4)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
          >
            <LayoutDashboard className="w-4 h-4" strokeWidth={2} />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
