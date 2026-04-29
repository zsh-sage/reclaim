"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, ChevronRight, CheckCircle2 } from "lucide-react";
import type { Claim } from "@/lib/api/types";
import { getHRClaims } from "@/lib/actions/hr";
import { ClaimRow } from "@/components/claims/ClaimRow";
import { ViewAllModal } from "@/components/claims/ViewAllModal";

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_ICON: Record<AiStatus, JSX.Element> = {
  "Policy Flagged": <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />,
  "Awaiting Review": <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />,
  "Passed AI Review": <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />,
  "Low Confidence": <HelpCircle className="w-3.5 h-3.5" strokeWidth={2.5} />,
};

const STATUS_STYLE: Record<AiStatus, string> = {
  "Policy Flagged": "bg-error/10 text-error-dim",
  "Awaiting Review": "bg-amber-100 text-amber-800",
  "Passed AI Review": "bg-emerald-50 text-emerald-700",
  "Low Confidence": "bg-tertiary/10 text-tertiary-dim",
};

function StatusBadge({ status }: { status: AiStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {STATUS_ICON[status]}
      {status}
    </span>
  );
}

function Avatar({ name, initials }: { name: string; initials: string }) {
  return (
    <div
      aria-label={name}
      className="w-9 h-9 rounded-full bg-secondary-container flex items-center
                 justify-center text-on-secondary-container font-bold text-xs
                 shrink-0 select-none ring-2 ring-surface-container-lowest"
    >
      {initials}
    </div>
  );
}

/** Dashboard preview row — enlarged with slide + glow hover animation */
function ClaimRow({
  claim,
  actionLabel,
  onNavigate,
}: {
  claim: Claim;
  actionLabel: string;
  onNavigate: (path: string) => void;
}) {
  function navigate() {
    const path = actionLabel === "View"
      ? `/hr/view/${claim.id}`
      : `/hr/review/${claim.id}`;
    onNavigate(path);
  }

  return (
    <tr
      onClick={navigate}
      tabIndex={0}
      role="button"
      aria-label={`${actionLabel} claim from ${claim.employee.name}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(); } }}
      className="group transition-all duration-200
                 hover:bg-primary/[0.04] hover:shadow-[inset_4px_0_0_0_#4647d3]
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
                 cursor-pointer"
    >
      {/* Employee */}
      <td className="py-5 px-6">
        <div className="flex items-center gap-3">
          <Avatar name={claim.employee.name} initials={claim.employee.initials} />
          <div>
            <p className="font-semibold text-on-surface text-sm leading-tight">
              {claim.employee.name}
            </p>
            {claim.note && (
              <p className="text-[11px] text-on-surface-variant mt-0.5 leading-tight">
                {claim.note}
              </p>
            )}
          </div>
        </div>
      </td>
      {/* Date */}
      <td className="py-5 px-6 text-on-surface-variant text-sm hidden sm:table-cell">
        {claim.date}
      </td>
      {/* Amount */}
      <td className="py-5 px-6">
        <span className="font-semibold text-on-surface text-sm tabular-nums">
          {claim.amount}
        </span>
      </td>
      {/* Category */}
      <td className="py-5 px-6 text-on-surface-variant text-sm hidden md:table-cell">
        {claim.category}
      </td>
      {/* AI Status */}
      <td className="py-5 px-6 hidden lg:table-cell">
        <StatusBadge status={claim.status} />
      </td>
      {/* Action */}
      <td className="py-5 px-6 text-right">
        <button
          id={`action-btn-${claim.id}`}
          onClick={(e) => { e.stopPropagation(); navigate(); }}
          className="text-primary font-semibold text-sm
                     group-hover:underline group-hover:translate-x-0.5
                     transition-all duration-150 active:scale-95"
        >
          {actionLabel}
        </button>
      </td>
    </tr>
  );
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

/** Derive the unique set of values for a given key across a claim list. */
function uniqueValues<K extends keyof Claim>(claims: Claim[], key: K): string[] {
  return Array.from(new Set(claims.map((c) => String(c[key])))).sort();
}

/** Parse a dollar-string like "$1,450.00" → number */
function parseDollar(s: string): number {
  return parseFloat(s.replace(/MYR\s?|[$,]/gi, "")) || 0;
}

interface FilterState {
  statuses: AiStatus[];
  categories: string[];
  amountMin: string;
  amountMax: string;
}

const EMPTY_FILTERS: FilterState = {
  statuses: [],
  categories: [],
  amountMin: "",
  amountMax: "",
};

function countActiveFilters(f: FilterState): number {
  return (
    f.statuses.length +
    f.categories.length +
    (f.amountMin !== "" ? 1 : 0) +
    (f.amountMax !== "" ? 1 : 0)
  );
}

function applyFilters(claims: Claim[], query: string, filters: FilterState): Claim[] {
  const q = query.toLowerCase();
  const minAmt = parseDollar(filters.amountMin);
  const maxAmt = parseDollar(filters.amountMax);

  return claims.filter((c) => {
    // Text search
    const matchesQuery =
      !q ||
      c.employee.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q);

    // Status filter
    const matchesStatus =
      filters.statuses.length === 0 || filters.statuses.includes(c.status);

    // Category filter
    const matchesCategory =
      filters.categories.length === 0 || filters.categories.includes(c.category);

    // Amount range
    const amount = parseDollar(c.amount);
    const matchesMin = filters.amountMin === "" || amount >= minAmt;
    const matchesMax = filters.amountMax === "" || amount <= maxAmt;

    return matchesQuery && matchesStatus && matchesCategory && matchesMin && matchesMax;
  });
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

function FilterPanel({
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
              <span className="text-xs text-on-surface-variant mr-1">MYR</span>
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
              <span className="text-xs text-on-surface-variant mr-1">MYR</span>
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

// ─── "View All" Modal ─────────────────────────────────────────────────────────

function ViewAllModal({
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
  const handleNavigate = useCallback((path: string) => router.push(path), [router]);

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
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const all = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ));
      if (!all.length) return;
      const first = all[0]; const last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);
  const filtered = useMemo(() => applyFilters(claims, query, filters), [claims, query, filters]);

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
                    onNavigate={handleNavigate}
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
                        onClick={() => { setFilters(EMPTY_FILTERS); setQuery(""); }}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HRDashboardPage() {
  const router = useRouter();
  const handleNavigate = useCallback((path: string) => router.push(path), [router]);

  const [activeTab, setActiveTab] = useState<TabKey>("attention");
  const [modalOpen, setModalOpen] = useState(false);
  const [attentionClaims, setAttentionClaims] = useState<Claim[]>([]);
  const [approvedClaims, setApprovedClaims] = useState<Claim[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(true);

  // Fetch real reimbursements from backend on mount
  useEffect(() => {
    getHRClaims()
      .then(({ attention, approved }) => {
        setAttentionClaims(attention);
        setApprovedClaims(approved);
      })
      .catch(() => {
        // Keep empty arrays on error — UI will show empty state
      })
      .finally(() => {
        setIsLoadingClaims(false);
      });
  }, []);

  // Derive KPIs from real claims data (no backend dashboard endpoint needed)
  const totalClaims = attentionClaims.length + approvedClaims.length;
  const autoApprovalRate = useMemo(() => {
    if (totalClaims === 0) return 0;
    return (approvedClaims.length / totalClaims) * 100;
  }, [approvedClaims.length, totalClaims]);

  const previewClaims =
    activeTab === "attention"
      ? attentionClaims.slice(0, 5)
      : approvedClaims.slice(0, 3);
  const allClaims =
    activeTab === "attention" ? attentionClaims : approvedClaims;
  const actionLabel = activeTab === "attention" ? "Review" : "View";
  const modalTitle =
    activeTab === "attention"
      ? "All Pending Requests"
      : "All Passed AI Review Claims";
  const viewAllLabel =
    activeTab === "attention"
      ? "View All Pending Requests"
      : "View All Passed AI Review Claims";

  return (
    <div className="relative min-h-full p-6 md:p-10 lg:p-12">
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full bg-primary opacity-[0.07] blur-[80px]" />
        <div className="absolute top-32 right-40 w-[320px] h-[320px] rounded-full bg-tertiary opacity-[0.06] blur-[64px]" />
        <div className="absolute -top-8 right-[15%] w-[200px] h-[200px] rounded-full bg-primary-container opacity-[0.12] blur-[48px]" />
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 relative z-10">
        <div className="max-w-2xl">
          <h2
            className="font-headline font-extrabold text-on-background mb-2 tracking-tight"
            style={{ fontSize: "2.5rem", letterSpacing: "-0.02em" }}
          >
            HR Dashboard
          </h2>
          <p className="text-on-surface-variant text-lg font-body">
            Manage exceptions and review automated approvals.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 relative z-10">
        <div className="bg-surface-container-lowest/70 backdrop-blur-2xl rounded-xl p-6 shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] relative overflow-hidden group hover:shadow-[0_16px_48px_-12px_rgba(70,71,211,0.12)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="relative z-10">
            <p className="text-xs font-semibold font-headline text-on-surface-variant tracking-widest uppercase mb-2">
              Auto-Approval Rate
            </p>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-extrabold font-headline text-on-surface">84.2%</span>
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mb-1">
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                +2.4%
              </span>
              {!isLoadingClaims && totalClaims > 0 && (
                <span className="flex items-center gap-1 text-sm font-medium
                                 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {approvedClaims.length} passed
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-3">
              {isLoadingClaims ? "Loading…" : `of ${totalClaims} total claims`}
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-500" />
        </div>

        <div className="bg-surface-container-lowest/70 backdrop-blur-2xl rounded-xl p-6 shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] relative overflow-hidden group hover:shadow-[0_16px_48px_-12px_rgba(180,19,64,0.10)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="relative z-10">
            <p className="text-xs font-semibold font-headline text-on-surface-variant tracking-widest uppercase mb-2">
              Pending Manual Reviews
            </p>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-extrabold font-headline text-on-surface">
                {attentionClaims.length}
              </span>
              <span className="text-sm text-on-surface-variant font-medium mb-1">
                total requests
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-3">requires HR action</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-error/5 rounded-full blur-2xl group-hover:bg-error/12 group-hover:scale-110 transition-all duration-500" />
        </div>
      </div>

      {/* Triage Table */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl shadow-[0_12px_60px_-15px_rgba(44,47,49,0.08)] overflow-hidden relative z-10">
        {/* Tab strip */}
        <div className="flex border-b border-outline-variant/15 px-6 pt-4 gap-8">
          <button
            id="tab-requires-attention"
            onClick={() => setActiveTab("attention")}
            className={`pb-3 text-sm font-headline font-bold transition-all duration-300 ease-out flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 active:scale-95 border-b-2 ${
              activeTab === "attention"
                ? "text-primary border-primary"
                : "text-on-surface-variant border-transparent hover:text-on-surface"
            }`}
          >
            Requires Attention
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-label font-semibold transition-colors duration-300 ${
              activeTab === "attention" ? "bg-error/10 text-error-dim" : "bg-surface-container text-on-surface-variant"
            }`}>
              {attentionClaims.length}
            </span>
          </button>

          <button
            id="tab-passed-ai-review"
            onClick={() => setActiveTab("approved")}
            className={`pb-3 text-sm font-headline font-bold transition-all duration-300 ease-out flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 active:scale-95 border-b-2 ${
              activeTab === "approved"
                ? "text-primary border-primary"
                : "text-on-surface-variant border-transparent hover:text-on-surface"
            }`}
          >
            Passed AI Review
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-label font-semibold transition-colors duration-300 ${
              activeTab === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-surface-container text-on-surface-variant"
            }`}>
              {approvedClaims.length}
            </span>
          </button>
        </div>

        {/* Responsive table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider">
                  Employee
                </th>
                <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider hidden sm:table-cell">
                  Date
                </th>
                <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider">
                  Amount
                </th>
                <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                  Category
                </th>
                <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">
                  AI Status
                </th>
                <th className="py-4 px-6 text-xs font-semibold font-headline text-on-surface-variant uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {isLoadingClaims ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-5 px-6"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-surface-container-high shrink-0" /><div className="space-y-1.5"><div className="h-3 w-28 rounded bg-surface-container-high" /><div className="h-2.5 w-20 rounded bg-surface-container-low" /></div></div></td>
                    <td className="py-5 px-6 hidden sm:table-cell"><div className="h-3 w-20 rounded bg-surface-container-high" /></td>
                    <td className="py-5 px-6"><div className="h-3 w-16 rounded bg-surface-container-high" /></td>
                    <td className="py-5 px-6 hidden md:table-cell"><div className="h-3 w-24 rounded bg-surface-container-high" /></td>
                    <td className="py-5 px-6 hidden lg:table-cell"><div className="h-6 w-28 rounded-full bg-surface-container-high" /></td>
                    <td className="py-5 px-6 text-right"><div className="h-3 w-12 rounded bg-surface-container-high ml-auto" /></td>
                  </tr>
                ))
              ) : (
                previewClaims.map((claim) => (
                  <ClaimRow
                    key={claim.id}
                    claim={claim}
                    actionLabel={actionLabel}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer CTA */}
        <div className="p-5 text-center border-t border-outline-variant/15">
          <button
            id="view-all-btn"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold font-headline text-primary hover:text-primary-dim transition-all duration-200 active:scale-95 group/cta px-4 py-2 rounded-xl hover:bg-primary/5 cursor-pointer"
          >
            {viewAllLabel}
            <ChevronRight className="w-4 h-4 group-hover/cta:translate-x-0.5 transition-transform duration-150" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* View All Modal */}
      <ViewAllModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        claims={allClaims}
        actionLabel={actionLabel}
      />
    </div>
  );
}
