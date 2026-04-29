import {
  FilterState,
  EMPTY_FILTERS,
  uniqueValues,
} from "@/lib/hooks/useClaimsFilter";
import { STATUS_ICON, STATUS_STYLE } from "./StatusBadge";
import type { AiStatus, Claim } from "@/lib/api/types";

export function FilterPanel({
  claims,
  filters,
  onChange,
  onClear,
}: {
  claims: Claim[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onClear: () => void;
}) {
  const allStatuses = uniqueValues(claims, "status") as AiStatus[];
  const allCategories = uniqueValues(claims, "category");

  function toggleStatus(s: AiStatus) {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    onChange({ ...filters, statuses: next });
  }

  function toggleCategory(cat: string) {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((x) => x !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories: next });
  }

  return (
    <div className="px-6 pt-4 pb-5 bg-surface-container-low/60 border-b border-outline-variant/10
                    flex flex-col gap-4">

      {/* ── Row 1: Status + Amount Range + Clear ──────────────────────── */}
      <div className="flex flex-wrap items-start gap-6">

        {/* Status chips */}
        <div className="flex-1 min-w-[200px]">
          <p className="text-[11px] font-semibold font-headline text-on-surface-variant
                        uppercase tracking-widest mb-2">
            AI Status
          </p>
          <div className="flex flex-wrap gap-2">
            {allStatuses.map((s) => {
              const active = filters.statuses.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                              font-semibold font-label border transition-all duration-150
                              active:scale-95 cursor-pointer ${
                                active
                                  ? `${STATUS_STYLE[s]} border-current shadow-sm`
                                  : "bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/50"
                              }`}
                >
                  {active && STATUS_ICON[s]}
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount range */}
        <div className="shrink-0">
          <p className="text-[11px] font-semibold font-headline text-on-surface-variant
                        uppercase tracking-widest mb-2">
            Amount Range
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface-container-lowest rounded-lg
                            ring-1 ring-outline-variant/20 focus-within:ring-primary/40
                            px-3 py-2 w-28 transition-all">
              <span className="text-xs text-on-surface-variant mr-1">$</span>
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={filters.amountMin}
                onChange={(e) => onChange({ ...filters, amountMin: e.target.value })}
                className="w-full bg-transparent text-sm text-on-surface outline-none font-body"
              />
            </div>
            <span className="text-on-surface-variant text-xs shrink-0">–</span>
            <div className="flex items-center bg-surface-container-lowest rounded-lg
                            ring-1 ring-outline-variant/20 focus-within:ring-primary/40
                            px-3 py-2 w-28 transition-all">
              <span className="text-xs text-on-surface-variant mr-1">$</span>
              <input
                type="number"
                min={0}
                placeholder="Max"
                value={filters.amountMax}
                onChange={(e) => onChange({ ...filters, amountMax: e.target.value })}
                className="w-full bg-transparent text-sm text-on-surface outline-none font-body"
              />
            </div>
          </div>
        </div>

        {/* Clear all — top-right of row 1 */}
        <button
          onClick={onClear}
          className="self-end text-xs font-semibold text-on-surface-variant
                     hover:text-error transition-colors active:scale-95 shrink-0 pb-2.5"
        >
          Clear all filters
        </button>
      </div>

      {/* ── Row 2: Category — horizontal scroll strip ──────────────────── */}
      <div>
        <p className="text-[11px] font-semibold font-headline text-on-surface-variant
                      uppercase tracking-widest mb-2">
          Category
        </p>
        {/* flex-nowrap + overflow-x-auto: single line, never wraps vertically */}
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1
                        scrollbar-thin scrollbar-thumb-outline-variant/30 scrollbar-track-transparent">
          {allCategories.map((cat) => {
            const active = filters.categories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-label
                            border transition-all duration-150 active:scale-95 cursor-pointer ${
                              active
                                ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                                : "bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/50"
                            }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
