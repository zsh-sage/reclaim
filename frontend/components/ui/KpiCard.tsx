import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const TONES = {
  primary: { chip: "bg-primary/10 text-primary", bar: "from-primary to-secondary" },
  violet: { chip: "bg-secondary/10 text-secondary", bar: "from-secondary to-[#22b8ff]" },
  tertiary: { chip: "bg-tertiary/10 text-tertiary", bar: "from-tertiary to-primary" },
  success: { chip: "bg-success-container text-on-success-container", bar: "from-success to-[#34d399]" },
  accent: { chip: "bg-accent-container text-on-accent-container", bar: "from-accent to-tertiary" },
  error: { chip: "bg-error-container text-error", bar: "from-error to-accent" },
  neutral: { chip: "bg-surface-container text-on-surface-variant", bar: "from-outline to-outline-variant" },
} as const;

export type KpiTone = keyof typeof TONES;

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
  loading = false,
  badge,
  children,
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  tone?: KpiTone;
  loading?: boolean;
  badge?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div
      className={`group relative min-w-0 overflow-hidden rounded-[18px] bg-surface-container-lowest p-4 shadow-ambient transition-shadow duration-300 hover:shadow-ambient-lg sm:rounded-[20px] sm:p-5 md:p-6 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-[3px] bg-linear-to-r ${t.bar} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
      />
      <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4 sm:gap-3">
        <p className="min-w-0 text-[12px] font-medium leading-snug text-on-surface-variant sm:text-[13px]">{label}</p>
        {Icon && (
          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] sm:h-8 sm:w-8 sm:rounded-[10px] ${t.chip}`}>
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden="true" />
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-24 animate-pulse rounded-lg bg-surface-container sm:h-9 sm:w-32" />
      ) : (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1.5 sm:gap-x-3">
          <p className="min-w-0 break-words font-headline text-[22px] font-semibold leading-none tracking-[-0.03em] text-on-surface tabular-nums sm:text-[28px] md:text-[34px]">
            {value}
          </p>
          {badge}
        </div>
      )}
      {sub && <p className="mt-2 text-[12px] leading-snug text-on-surface-variant sm:mt-2.5 sm:text-[13px]">{sub}</p>}
      {children}
    </div>
  );
}
