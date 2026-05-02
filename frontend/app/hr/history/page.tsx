"use client";

import { useState, useMemo, useEffect } from "react";
import {
  History,
  Search,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { getHRHistory, type HistoryClaim } from "@/lib/actions/hr";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClaimStatus = "Approved" | "Rejected" | "Paid";

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ClaimStatus,
  { label: string; bg: string; text: string; icon: typeof CheckCircle2; dot: string }
> = {
  Paid: {
    label: "Paid",
    bg: "bg-emerald-50 border border-emerald-200",
    text: "text-emerald-700",
    icon: Banknote,
    dot: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]",
  },
  Approved: {
    label: "Approved",
    bg: "bg-primary/8 border border-primary/20",
    text: "text-primary",
    icon: CheckCircle2,
    dot: "bg-primary shadow-[0_0_6px_rgba(70,71,211,0.4)]",
  },
  Rejected: {
    label: "Rejected",
    bg: "bg-red-50 border border-red-200",
    text: "text-red-600",
    icon: XCircle,
    dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]",
  },
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-outline-variant/5">
      <td className="py-4 px-6 w-32"><div className="h-4 bg-surface-container rounded-full animate-pulse w-full" /></td>
      <td className="py-4 px-6"><div className="h-4 bg-surface-container rounded-full animate-pulse w-3/4" /></td>
      <td className="py-4 px-6"><div className="h-4 bg-surface-container rounded-full animate-pulse w-2/3" /></td>
      <td className="py-4 px-6 w-32"><div className="h-4 bg-surface-container rounded-full animate-pulse w-full" /></td>
      <td className="py-4 px-6 w-32"><div className="h-4 bg-surface-container rounded-full animate-pulse w-full" /></td>
      <td className="py-4 px-6 w-28"><div className="h-4 bg-surface-container rounded-full animate-pulse w-full" /></td>
      <td className="py-4 px-6 w-24"><div className="h-4 bg-surface-container rounded-full animate-pulse w-full" /></td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 6;

export default function HRHistoryPage() {
  const [data, setData] = useState<HistoryClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ClaimStatus>("All");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    getHRHistory()
      .then(setData)
      .catch(() => setError("Failed to load claim history. Please try again."))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Filtering ──
  const filtered = useMemo(() => {
    let result = data;
    if (statusFilter !== "All") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.employeeName.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.policyName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, searchQuery, statusFilter]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // ── KPI Summary ──
  const kpis = useMemo(() => {
    const fmt = (v: number) =>
      `RM ${new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2 }).format(v)}`;
    const approved = data.filter((c) => c.status === "Approved" || c.status === "Paid");
    const rejected = data.filter((c) => c.status === "Rejected");
    const totalPaid = data
      .filter((c) => c.status === "Paid")
      .reduce((s, c) => s + c.amount, 0);
    return {
      total: data.length,
      approved: approved.length,
      rejected: rejected.length,
      totalPaid: fmt(totalPaid),
    };
  }, [data]);

  return (
    <div className="relative min-h-full p-6 md:p-10 lg:p-12">
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full bg-primary opacity-[0.07] blur-[80px]" />
        <div className="absolute top-32 right-40 w-[320px] h-[320px] rounded-full bg-tertiary opacity-[0.06] blur-[64px]" />
        <div className="absolute -top-8 right-[15%] w-[200px] h-[200px] rounded-full bg-primary-container opacity-[0.12] blur-[48px]" />
      </div>

      <div className="relative z-10">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <h2
              className="font-headline font-extrabold text-on-background mb-2 tracking-tight"
              style={{ fontSize: "2.5rem", letterSpacing: "-0.02em" }}
            >
              Claim History
            </h2>
            <p className="text-on-surface-variant text-lg font-body">
              A full audit log of all resolved claims across the organization.
            </p>
          </div>
        </div>

        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Resolved",
              value: isLoading ? "—" : kpis.total.toString(),
              sub: "all time",
              color: "text-on-surface",
              bg: "bg-primary/5",
              hoverShadow: "hover:shadow-[0_16px_48px_-12px_rgba(70,71,211,0.10)]",
              icon: History,
              iconColor: "text-primary",
            },
            {
              label: "Approved / Paid",
              value: isLoading ? "—" : kpis.approved.toString(),
              sub: "claims",
              color: "text-primary",
              bg: "bg-primary/5",
              hoverShadow: "hover:shadow-[0_16px_48px_-12px_rgba(70,71,211,0.12)]",
              icon: CheckCircle2,
              iconColor: "text-primary",
            },
            {
              label: "Rejected",
              value: isLoading ? "—" : kpis.rejected.toString(),
              sub: "claims",
              color: "text-red-600",
              bg: "bg-red-500/5",
              hoverShadow: "hover:shadow-[0_16px_48px_-12px_rgba(239,68,68,0.10)]",
              icon: XCircle,
              iconColor: "text-red-500",
            },
            {
              label: "Total Disbursed",
              value: isLoading ? "—" : kpis.totalPaid,
              sub: "paid out",
              color: "text-emerald-700",
              bg: "bg-emerald-500/5",
              hoverShadow: "hover:shadow-[0_16px_48px_-12px_rgba(16,185,129,0.10)]",
              icon: Banknote,
              iconColor: "text-emerald-600",
            },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className={`bg-surface-container-lowest/70 backdrop-blur-2xl rounded-xl p-5 shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] relative overflow-hidden group ${stat.hoverShadow} hover:-translate-y-0.5 transition-all duration-300`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-semibold font-headline text-on-surface-variant tracking-widest uppercase">
                    {stat.label}
                  </p>
                  <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${stat.iconColor}`} strokeWidth={2} />
                  </div>
                </div>
                <p className={`text-2xl font-extrabold font-headline ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-on-surface-variant/70 mt-0.5">{stat.sub}</p>
              </div>
            );
          })}
        </div>

        {/* ── Search & Filter Bar ── */}
        <div className="bg-surface-container-low/50 backdrop-blur-md border border-outline-variant/10 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors w-4 h-4" />
            <input
              type="text"
              placeholder="Search by employee name, claim ID, or policy…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-on-surface-variant shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-sm font-medium text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Paid">Paid</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* ── Error State ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Table / Cards ── */}
        <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl shadow-[0_12px_60px_-15px_rgba(44,47,49,0.08)] relative z-10">

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 text-on-surface-variant uppercase tracking-wider text-[10px] font-bold font-headline">
                  <th className="py-4 px-6 w-32">Claim ID</th>
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">Policy / Category</th>
                  <th className="py-4 px-6 w-32 text-right">Amount</th>
                  <th className="py-4 px-6 w-32">Resolved</th>
                  <th className="py-4 px-6 w-28">Status</th>
                  <th className="py-4 px-6 w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {/* Skeleton */}
                {isLoading &&
                  [...Array(ITEMS_PER_PAGE)].map((_, i) => <SkeletonRow key={i} />)}

                {/* Rows */}
                {!isLoading &&
                  paginated.map((claim) => {
                    const cfg = STATUS_CONFIG[claim.status];
                    const formatted = `RM ${new Intl.NumberFormat("en-MY", {
                      minimumFractionDigits: 2,
                    }).format(claim.amount)}`;

                    return (
                      <tr
                        key={claim.id}
                        className="hover:bg-surface-container/30 transition-colors group"
                      >
                        {/* Claim ID */}
                        <td className="py-4 px-6 align-middle whitespace-nowrap">
                          <span
                            className="font-mono text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg"
                            title={claim.id}
                          >
                            {claim.id.slice(0, 8)}
                          </span>
                        </td>

                        {/* Employee */}
                        <td className="py-4 px-6 align-middle overflow-hidden">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary-container to-tertiary-container flex items-center justify-center font-bold text-[10px] text-on-primary-container border-2 border-surface-container-lowest shadow-sm shrink-0">
                              {claim.employeeInitial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-on-surface truncate">
                                {claim.employeeName}
                              </p>
                              <p className="text-[10px] text-on-surface-variant truncate">
                                {claim.department}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Policy */}
                        <td className="py-4 px-6 align-middle overflow-hidden">
                          <p className="text-sm text-on-surface-variant truncate">
                            {claim.policyName}
                          </p>
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-6 text-right align-middle">
                          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                            <span className="font-semibold text-sm text-on-surface font-mono tabular-nums">
                              {formatted}
                            </span>
                          </div>
                        </td>

                        {/* Resolved Date */}
                        <td className="py-4 px-6 align-middle whitespace-nowrap overflow-hidden">
                          <div className="flex items-center gap-1.5 truncate">
                            <Clock className="w-3 h-3 text-on-surface-variant/50 shrink-0" />
                            <span className="text-xs text-on-surface-variant truncate">
                              {claim.dateResolved}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6 align-middle">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        {/* View Action */}
                        <td className="py-4 px-6 text-right align-middle whitespace-nowrap">
                          <Link
                            href={`/hr/view/${claim.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all active:scale-90 cursor-pointer"
                          >
                            View
                            <ExternalLink className="w-3 h-3" strokeWidth={2} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden flex flex-col gap-3 p-4">
            {isLoading &&
              [...Array(ITEMS_PER_PAGE)].map((_, i) => (
                <div key={i} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-surface-container shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-surface-container rounded-full w-2/3" />
                    <div className="h-2.5 bg-surface-container rounded-full w-1/2" />
                  </div>
                  <div className="h-3 bg-surface-container rounded-full w-16 shrink-0" />
                </div>
              ))}

            {!isLoading &&
              paginated.map((claim) => {
                const cfg = STATUS_CONFIG[claim.status];
                const formatted = `RM ${new Intl.NumberFormat("en-MY", {
                  minimumFractionDigits: 2,
                }).format(claim.amount)}`;

                return (
                  <Link
                    href={`/hr/view/${claim.id}`}
                    key={claim.id}
                    className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 flex items-center justify-between hover:bg-surface-container-highest/30 transition-colors active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary-container to-tertiary-container flex items-center justify-center font-bold text-[10px] text-on-primary-container border-2 border-surface-container-lowest shadow-sm shrink-0">
                        {claim.employeeInitial}
                      </div>
                      <div className="min-w-0 pr-2">
                        <h4 className="font-headline font-bold text-sm text-on-surface mb-0.5 truncate">
                          {claim.employeeName}
                        </h4>
                        <p className="font-body text-xs text-on-surface-variant truncate">
                          {claim.policyName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right shrink-0">
                        <p className="font-headline font-bold text-sm text-on-surface mb-1 tabular-nums">
                          {formatted}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant opacity-60" />
                    </div>
                  </Link>
                );
              })}
          </div>

        </div>

          {/* Empty State */}
          {!isLoading && filtered.length === 0 && (
            <div className="p-16 text-center">
              <div className="inline-flex p-4 bg-surface-container rounded-full mb-4">
                <Inbox className="w-8 h-8 text-on-surface-variant/40" />
              </div>
              <p className="font-headline font-bold text-lg text-on-surface">
                No claims found
              </p>
              <p className="text-on-surface-variant text-sm mt-1">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}

          {/* ── Pagination Footer ── */}
          {!isLoading && filtered.length > 0 && (
            <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between gap-4">
              <p className="text-xs text-on-surface-variant">
                Showing{" "}
                <span className="font-semibold text-on-surface">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-on-surface">{filtered.length}</span>{" "}
                results
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === i + 1
                        ? "bg-primary text-on-primary shadow-sm"
                        : "text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
