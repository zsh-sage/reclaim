import type { AiStatus } from "@/lib/api/types";
import { AlertTriangle, Clock, CheckCircle2, HelpCircle } from "lucide-react";
import { JSX } from "react";

export const STATUS_ICON: Record<AiStatus, JSX.Element> = {
  "Policy Flagged": <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />,
  "Awaiting Review": <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />,
  "Passed AI Review": <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />,
  "Low Confidence": <HelpCircle className="w-3.5 h-3.5" strokeWidth={2.5} />,
};

export const STATUS_STYLE: Record<AiStatus, string> = {
  "Policy Flagged": "bg-error/10 text-error-dim",
  "Awaiting Review": "bg-amber-100 text-amber-800",
  "Passed AI Review": "bg-emerald-50 text-emerald-700",
  "Low Confidence": "bg-tertiary/10 text-tertiary-dim",
};

export function StatusBadge({ status }: { status: AiStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {STATUS_ICON[status]}
      {status}
    </span>
  );
}
