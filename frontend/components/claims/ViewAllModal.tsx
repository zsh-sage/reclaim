"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Search, SlidersHorizontal } from "lucide-react";
import type { Claim } from "@/lib/api/types";
import { ClaimRow } from "./ClaimRow";
import { FilterPanel } from "./FilterPanel";
import {
  FilterState,
  EMPTY_FILTERS,
  countActiveFilters,
  applyFilters,
} from "@/lib/hooks/useClaimsFilter";

export function ViewAllModal({
  isOpen,
  onClose,
  title,
  claims,
  actionLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  claims: Claim[];
  actionLabel: string;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const all = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!all.length) return;
      const first = all[0];
      const last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);
  const filtered = useMemo(
    () => applyFilters(claims, query, filters),
    [claims, query, filters]
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
    >
      {/* Dimmed overlay */}
      <div
        className="absolute inset-0 bg-inverse-surface/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full sm:max-w-4xl max-h-[92dvh] flex flex-col
                   bg-surface-container-lowest rounded-t-3xl sm:rounded-2xl
                   shadow-[0_32px_80px_-8px_rgba(44,47,49,0.22)]
                   overflow-hidden"
      >
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/15 shrink-0">
          <div>
            <h3 className="font-headline font-bold text-lg text-on-surface">
              {title}
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {filtered.length} of {claims.length} records
              {activeCount > 0 && (
                <span className="ml-1.5 text-primary font-semibold">
                  · {activeCount} filter{activeCount !== 1 ? "s" : ""} active
                </span>
              )}
            </p>
          </div>
          <button
            id="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-on-surface hover:bg-surface-container-low
                       active:scale-95 transition-all"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* ── Search + Filter toggle ─────────────────────────────────────── */}
        <div className="px-6 py-4 bg-surface border-b border-outline-variant/10 shrink-0">
          <div className="flex gap-3">
            {/* Search */}
            <div className="flex-1 flex items-center gap-2.5 bg-surface-container-low
                            rounded-xl px-4 py-2.5 ring-1 ring-outline-variant/20
                            focus-within:ring-primary/40 focus-within:bg-surface-container-lowest
                            transition-all">
              <Search className="w-4 h-4 text-on-surface-variant shrink-0" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search by name, category or status…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-on-surface
                           placeholder:text-on-surface-variant/60 outline-none font-body"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Filter toggle button */}
            <button
              id="filter-toggle-btn"
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm
                          font-semibold font-headline transition-all duration-200
                          active:scale-95 shrink-0 ring-1 cursor-pointer ${
                            filterOpen || activeCount > 0
                              ? "bg-primary text-on-primary ring-primary shadow-[0_4px_16px_rgba(70,71,211,0.25)]"
                              : "bg-surface-container-low text-on-surface ring-outline-variant/20 hover:bg-surface-container"
                          }`}
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Filter</span>
              {activeCount > 0 && (
                <span
                  className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px]
                              font-bold flex items-center justify-center ${
                                filterOpen || activeCount > 0
                                  ? "bg-on-primary text-primary"
                                  : "bg-primary text-on-primary"
                              }`}
                >
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Collapsible Filter Panel ───────────────────────────────────── */}
        <div
          className={`shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            filterOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <FilterPanel
            claims={claims}
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
          />
        </div>

        {/* ── Scrollable Table ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-container-low/80 backdrop-blur-sm">
                {["Employee", "Date", "Amount", "Category", "AI Status", "Action"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`py-3.5 px-6 text-xs font-semibold font-headline
                                  text-on-surface-variant uppercase tracking-wider
                                  ${i === 1 ? "hidden sm:table-cell" : ""}
                                  ${i === 3 ? "hidden md:table-cell" : ""}
                                  ${i === 4 ? "hidden lg:table-cell" : ""}
                                  ${i === 5 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.length > 0 ? (
                filtered.map((claim) => (
                  <ClaimRow
                    key={claim.id}
                    claim={claim}
                    actionLabel={actionLabel}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <SlidersHorizontal
                        className="w-8 h-8 text-outline-variant"
                        strokeWidth={1.5}
                      />
                      <p className="text-sm text-on-surface-variant font-medium">
                        No records match your filters.
                      </p>
                      <button
                        onClick={() => {
                          setFilters(EMPTY_FILTERS);
                          setQuery("");
                        }}
                        className="text-xs text-primary font-semibold hover:underline mt-1"
                      >
                        Clear all
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-outline-variant/10 shrink-0
                        flex items-center justify-between bg-surface">
          <p className="text-xs text-on-surface-variant">
            Showing{" "}
            <span className="font-semibold text-on-surface">{filtered.length}</span>{" "}
            result{filtered.length !== 1 ? "s" : ""}
            {activeCount > 0 && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="ml-2 text-primary hover:underline font-semibold"
              >
                Reset filters
              </button>
            )}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold
                       font-headline hover:bg-primary-dim active:scale-95 transition-all
                       shadow-[0_4px_16px_rgba(70,71,211,0.25)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
