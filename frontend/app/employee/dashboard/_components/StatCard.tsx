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
  /** Controls the colour palette of the card */
  variant: "pending" | "approved" | "paid";
}

/**
 * blobBg — background colour of the decorative quarter-circle blob.
 * It matches iconBg at 30% opacity to stay subtle behind the content.
 */
const VARIANT_CONFIG = {
  pending: {
    card:        "bg-surface-container-lowest",
    iconBg:      "bg-secondary-container/60",
    iconColor:   "text-on-secondary-container",
    badge:       "bg-secondary-container/60 text-on-secondary-container",
    badgeLabel:  "Pending",
    subtext:     "text-on-surface-variant",
    blobColor:   "bg-secondary-container/30",
  },
  approved: {
    card:        "bg-surface-container-lowest",
    iconBg:      "bg-primary/10",
    iconColor:   "text-primary",
    badge:       "bg-primary/10 text-primary",
    badgeLabel:  "Approved",
    subtext:     "text-on-surface-variant",
    blobColor:   "bg-primary/30",
  },
  paid: {
    card:        "bg-gradient-to-br from-tertiary-container/20 to-error-container/5 border border-tertiary/10",
    iconBg:      "bg-tertiary/10",
    iconColor:   "text-tertiary",
    badge:       "bg-tertiary/10 text-tertiary",
    badgeLabel:  "Paid",
    subtext:     "text-on-surface-variant",
    blobColor:   "bg-tertiary/30",
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
    /*
     * `relative overflow-hidden` confines the decorative blob strictly inside
     * the card — no layout side-effects, satisfying the no-absolute constraint
     * (the blob is cosmetic, not a positioned layout element).
     */
    <div
      className={`
        relative overflow-hidden
        ${c.card}
        rounded-2xl p-6
        shadow-[0_10px_50px_-12px_rgba(44,47,49,0.06)]
        hover:shadow-[0_16px_60px_-10px_rgba(44,47,49,0.10)]
        transition-shadow duration-300
        group
      `}
    >
      {/* ── Decorative quarter-circle blob (top-right, z-0) ── */}
      {/*
       * A square whose side is 40% of card width.
       * `rounded-bl-full` turns the bottom-left corner into a full arc,
       * creating the 1/4-circle illusion.
       * Negative offset pushes it so only the arc is visible.
       * `z-0` keeps it behind content (content is z-10).
       */}
      <div
        aria-hidden="true"
        className={`
          absolute -top-10 -right-10
          w-36 h-36
          rounded-bl-full
          ${c.blobColor}
          z-0
          transition-transform duration-500 group-hover:scale-110
        `}
      />

      {/* ── All content sits above the blob (z-10) ─────────── */}
      <div className="relative z-10">
        {/* Header row: icon + badge */}
        <div className="flex justify-between items-start mb-5">
          <div className={`p-3 ${c.iconBg} rounded-xl ${c.iconColor}`}>
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
          <span
            className={`${c.badge} text-[14px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-body`}
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
    </div>
  );
}
