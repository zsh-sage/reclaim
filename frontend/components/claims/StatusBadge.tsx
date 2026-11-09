import type { AiStatus } from "@/lib/api/types";
import { AlertTriangle, Clock, CheckCircle2, HelpCircle, Zap, XCircle } from "lucide-react";
import { JSX } from "react";

const ICON = "w-3.5 h-3.5";

export const STATUS_ICON: Record<AiStatus, JSX.Element> = {
  "Policy Flagged": <AlertTriangle className={ICON} strokeWidth={2.25} aria-hidden="true" />,
  "Awaiting Review": <Clock className={ICON} strokeWidth={2.25} aria-hidden="true" />,
  "Passed AI Review": <CheckCircle2 className={ICON} strokeWidth={2.25} aria-hidden="true" />,
  "Low Confidence": <HelpCircle className={ICON} strokeWidth={2.25} aria-hidden="true" />,
  "Auto-Approved": <Zap className={ICON} strokeWidth={2.25} aria-hidden="true" />,
  "Auto-Rejected": <XCircle className={ICON} strokeWidth={2.25} aria-hidden="true" />,
};

export const STATUS_STYLE: Record<AiStatus, string> = {
  "Policy Flagged": "bg-error-container text-error ring-error/15",
  "Awaiting Review": "bg-warning-container text-warning ring-warning/15",
  "Passed AI Review": "bg-success-container text-on-success-container ring-success/15",
  "Low Confidence": "bg-tertiary-container text-on-tertiary-container ring-tertiary/15",
  "Auto-Approved": "bg-secondary-container text-on-secondary-container ring-secondary/15",
  "Auto-Rejected": "bg-surface-container text-on-surface-variant ring-on-surface/10",
};

export function StatusBadge({ status }: { status: AiStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[status] ?? STATUS_STYLE["Awaiting Review"]}`}
    >
      {STATUS_ICON[status]}
      {status}
    </span>
  );
}

/** Generic pill for claim lifecycle states (Pending / Approved / Paid / Rejected …). */
const LIFECYCLE: Record<string, { cls: string; dot: string }> = {
  Pending: { cls: "bg-warning-container text-warning ring-warning/15", dot: "bg-warning" },
  Review: { cls: "bg-warning-container text-warning ring-warning/15", dot: "bg-warning" },
  Approved: { cls: "bg-primary-container text-on-primary-container ring-primary/15", dot: "bg-primary" },
  "Partially Approved": { cls: "bg-secondary-container text-on-secondary-container ring-secondary/15", dot: "bg-secondary" },
  Disbursing: { cls: "bg-secondary-container text-on-secondary-container ring-secondary/15", dot: "bg-secondary" },
  Paid: { cls: "bg-success-container text-on-success-container ring-success/15", dot: "bg-success" },
  Rejected: { cls: "bg-error-container text-error ring-error/15", dot: "bg-error" },
  Active: { cls: "bg-success-container text-on-success-container ring-success/15", dot: "bg-success" },
  Inactive: { cls: "bg-surface-container text-on-surface-variant ring-on-surface/10", dot: "bg-outline" },
};

export function LifecyclePill({ status }: { status: string }) {
  const s = LIFECYCLE[status] ?? LIFECYCLE.Inactive;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.cls}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}
