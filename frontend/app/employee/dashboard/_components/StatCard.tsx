import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export interface StatCardProps {
  /** Descriptive sub-label below the value */
  label: string;
  /** Primary monetary/numeric display value */
  value: string;
  /** Supporting footnote or call-to-action hint */
  subtext: ReactNode;
  /** lucide-react icon component */
  icon: LucideIcon;
  /** Controls the color palette of the card */
  variant: "pending" | "approved" | "action";
}

const VARIANT_CONFIG = {
  pending: {
    card:       "bg-surface-container-lowest",
    iconBg:     "bg-secondary-container/60",
    iconColor:  "text-on-secondary-container",
    badge:      "bg-secondary-container/60 text-on-secondary-container",
    badgeLabel: "Pending",
    subtext:    "text-on-surface-variant",
  },
  approved: {
    card:       "bg-surface-container-lowest",
    iconBg:     "bg-primary/10",
    iconColor:  "text-primary",
    badge:      "bg-primary/10 text-primary",
    badgeLabel: "Approved",
    subtext:    "text-on-surface-variant",
  },
  action: {
    card:       "bg-gradient-to-br from-tertiary-container/20 to-error-container/5 border border-tertiary/10",
    iconBg:     "bg-tertiary/10",
    iconColor:  "text-tertiary",
    badge:      "bg-tertiary/10 text-tertiary",
    badgeLabel: "Action",
    subtext:    "text-tertiary font-medium",
  },
} as const;

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant,
}: StatCardProps) {
  const c = VARIANT_CONFIG[variant];

  return (
    <div
      className={`
        ${c.card}
        rounded-2xl p-6
        shadow-[0_10px_50px_-12px_rgba(44,47,49,0.06)]
        hover:shadow-[0_16px_60px_-10px_rgba(44,47,49,0.10)]
        transition-shadow duration-300
        group
      `}
    >
      {/* Header row: icon + badge */}
      <div className="flex justify-between items-start mb-5">
        <div className={`p-3 ${c.iconBg} rounded-xl ${c.iconColor}`}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <span
          className={`${c.badge} text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-body`}
        >
          {c.badgeLabel}
        </span>
      </div>

      {/* Value block */}
      <p className="font-body text-on-surface-variant text-sm font-medium mb-1">
        {label}
      </p>
      <h3 className="font-headline text-3xl font-extrabold text-on-surface tabular-nums tracking-tight">
        {value}
      </h3>
      <p className={`font-body text-xs ${c.subtext} mt-2 flex items-center gap-1`}>
        {subtext}
      </p>
    </div>
  );
}
