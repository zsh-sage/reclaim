"use client";

import { CheckCircle2, LayoutDashboard, ShieldX, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export type HRDecision = "approve_full" | "approve_adjusted" | "reject" | "confirm" | "flag" | null;

export function SuccessModal({ decision, id }: { decision: HRDecision, id: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  let title = "Review Submitted!";
  let subtitle = "The claim has been processed successfully.";
  
  if (decision === "approve_full") {
    subtitle = `Claim bundle ${id} has been fully approved.`;
  } else if (decision === "approve_adjusted") {
    subtitle = `Claim bundle ${id} has been approved with HR adjustments.`;
  } else if (decision === "reject") {
    title = "Claim Rejected";
    subtitle = `Claim bundle ${id} has been rejected.`;
  } else if (decision === "confirm") {
    title = "Approval Finalised!";
    subtitle = `Claim bundle ${id} has been fully finalised and the employee has been notified.`;
  } else if (decision === "flag") {
    title = "Claim Flagged";
    subtitle = `Claim bundle ${id} has been flagged for re-review.`;
  }

  const isError = decision === "reject";
  const isWarning = decision === "flag";
  const isSuccess = !isError && !isWarning;

  let Icon = CheckCircle2;
  let colorTheme = "green";
  if (isError) {
    Icon = ShieldX;
    colorTheme = "error";
  } else if (isWarning) {
    Icon = AlertTriangle;
    colorTheme = "amber";
  }

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
        <div className="relative w-20 h-20 mb-7">
          <div className={`absolute inset-0 rounded-full animate-ping ${
            colorTheme === "error" ? "bg-error/10" : colorTheme === "amber" ? "bg-amber-500/10" : "bg-green-500/10"
          }`} />
          <div className={`relative w-20 h-20 rounded-full border flex items-center justify-center ${
            colorTheme === "error" ? "bg-error/15 border-error/30" : colorTheme === "amber" ? "bg-amber-500/15 border-amber-500/30" : "bg-green-500/15 border-green-500/30"
          }`}>
            <Icon className={`w-10 h-10 ${
              colorTheme === "error" ? "text-error" : colorTheme === "amber" ? "text-amber-500" : "text-green-500"
            }`} strokeWidth={1.75} />
          </div>
        </div>

        <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight mb-3">
          {title}
        </h2>

        <p className="text-sm text-on-surface-variant font-body leading-relaxed max-w-xs mb-8">
          {subtitle}
        </p>

        <div className="w-full">
          <Link
            href="/hr/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-3 w-full rounded-xl font-semibold text-sm font-body bg-primary text-on-primary shadow-[0_4px_16px_rgba(70,71,211,0.3)] hover:bg-primary-dim hover:shadow-[0_6px_24px_rgba(70,71,211,0.4)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
          >
            <LayoutDashboard className="w-4 h-4" strokeWidth={2} />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
