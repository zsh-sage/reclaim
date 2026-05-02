"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, ChevronRight, CheckCircle2, XCircle, Zap } from "lucide-react";
import type { Claim, ReimbursementRaw } from "@/lib/api/types";
import { getHRClaims } from "@/lib/actions/hr";
import { ClaimRow } from "@/components/claims/ClaimRow";
import { ViewAllModal } from "@/components/claims/ViewAllModal";

type TabKey = "attention" | "passed" | "flagged";

export default function HRDashboardPage() {
  const router = useRouter();
  const handleNavigate = useCallback((path: string) => router.push(path), [router]);

  const [activeTab, setActiveTab] = useState<TabKey>("attention");
  const [modalOpen, setModalOpen] = useState(false);
  const [attentionClaims, setAttentionClaims] = useState<Claim[]>([]);
  const [passedClaims, setPassedClaims] = useState<Claim[]>([]);
  const [flaggedClaims, setFlaggedClaims] = useState<Claim[]>([]);
  const [allReims, setAllReims] = useState<ReimbursementRaw[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(true);

  useEffect(() => {
    getHRClaims()
      .then(({ attention, passed, flagged, allReims: reims }) => {
        setAttentionClaims(attention);
        setPassedClaims(passed);
        setFlaggedClaims(flagged);
        setAllReims(reims);
      })
      .catch(() => {})
      .finally(() => setIsLoadingClaims(false));
  }, []);

  // Auto-solve rate: (auto-approved + auto-rejected) / total
  const { autoSolveRate, autoSolvedCount, totalClaims } = useMemo(() => {
    const total = allReims.length;
    if (total === 0) return { autoSolveRate: 0, autoSolvedCount: 0, totalClaims: 0 };
    const autoSolved = allReims.filter(
      (r) =>
        r.reviewed_by == null &&
        ["APPROVED", "DISBURSING", "PAID", "REJECTED"].includes(r.status),
    ).length;
    return {
      autoSolveRate: (autoSolved / total) * 100,
      autoSolvedCount: autoSolved,
      totalClaims: total,
    };
  }, [allReims]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "attention", label: "Required Attention", count: attentionClaims.length },
    { key: "passed", label: "Passed AI Review", count: passedClaims.length },
    { key: "flagged", label: "Flagged AI Review", count: flaggedClaims.length },
  ];

  const activeClaims =
    activeTab === "attention"
      ? attentionClaims
      : activeTab === "passed"
        ? passedClaims
        : flaggedClaims;

  const previewClaims = activeClaims.slice(0, activeTab === "attention" ? 5 : 3);

  const actionLabel =
    activeTab === "attention" ? "Review" : "View";

  const modalTitle =
    activeTab === "attention"
      ? "All Pending Requests"
      : activeTab === "passed"
        ? "Passed AI Review (last 24 h)"
        : "Flagged AI Review (last 24 h)";

  const viewAllLabel =
    activeTab === "attention"
      ? "View All Pending Requests"
      : activeTab === "passed"
        ? "View All Passed Claims"
        : "View All Flagged Claims";

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
          <p className="text-primary font-body text-sm font-bold italic mb-4 tracking-wide">
            From receipt to reimbursement — in minutes, not days
          </p>
          <p className="text-on-surface-variant text-lg font-body">
            Manage exceptions and review automated approvals.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 relative z-10">
        {/* Auto-Solve Rate */}
        <div className="bg-surface-container-lowest/70 backdrop-blur-2xl rounded-xl p-6 shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)] relative overflow-hidden group hover:shadow-[0_16px_48px_-12px_rgba(70,71,211,0.12)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="relative z-10">
            <p className="text-xs font-semibold font-headline text-on-surface-variant tracking-widest uppercase mb-2">
              Auto-Solve Rate
            </p>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-extrabold font-headline text-on-surface">
                {isLoadingClaims ? "—" : `${autoSolveRate.toFixed(1)}%`}
              </span>
              {!isLoadingClaims && totalClaims > 0 && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mb-1">
                  <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {autoSolvedCount} auto-solved
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-3">
              {isLoadingClaims ? "Loading…" : `of ${totalClaims} total claims`}
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-500" />
        </div>

        {/* Pending Manual Reviews */}
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
        <div className="flex border-b border-outline-variant/15 px-6 pt-4 gap-6 overflow-x-auto">
          {tabs.map(({ key, label, count }) => {
            const isActive = activeTab === key;
            const badgeStyle =
              key === "attention"
                ? isActive
                  ? "bg-error/10 text-error-dim"
                  : "bg-surface-container text-on-surface-variant"
                : key === "passed"
                  ? isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-surface-container text-on-surface-variant"
                  : isActive
                    ? "bg-amber-50 text-amber-700"
                    : "bg-surface-container text-on-surface-variant";

            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`pb-3 text-sm font-headline font-bold transition-all duration-300 ease-out flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 active:scale-95 border-b-2 whitespace-nowrap ${
                  isActive
                    ? "text-primary border-primary"
                    : "text-on-surface-variant border-transparent hover:text-on-surface"
                }`}
              >
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-label font-semibold transition-colors duration-300 ${badgeStyle}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Informational banner for auto-processed tabs */}
        {activeTab === "passed" && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
            These claims were automatically approved by Reclaim AI (confidence &gt; 70%) and payment has been initiated. No HR action required.
          </div>
        )}
        {activeTab === "flagged" && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <XCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
            These claims were automatically rejected by Reclaim AI. Employees have been notified. No HR action required.
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
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
              ) : previewClaims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-on-surface-variant">
                    {activeTab === "attention"
                      ? "No claims require attention right now."
                      : activeTab === "passed"
                        ? "No auto-approved claims in the last 24 hours."
                        : "No auto-rejected claims in the last 24 hours."}
                  </td>
                </tr>
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

        {/* Mobile Card List */}
        <div className="md:hidden flex flex-col gap-2 p-4">
          {isLoadingClaims ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-container-high shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-28 rounded bg-surface-container-high" />
                    <div className="h-2.5 w-20 rounded bg-surface-container-low" />
                  </div>
                  <div className="h-3 w-12 rounded bg-surface-container-high" />
                </div>
              </div>
            ))
          ) : previewClaims.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">
              Nothing here right now.
            </p>
          ) : (
            previewClaims.map((claim) => (
              <button
                key={claim.id}
                onClick={() => {
                  const path = actionLabel === "View" ? `/hr/view/${claim.id}` : `/hr/review/${claim.id}`;
                  handleNavigate(path);
                }}
                className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 text-left active:scale-[0.98] transition-all flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary-container to-tertiary-container flex items-center justify-center font-bold text-xs text-on-primary-container border-2 border-surface-container-lowest shadow-sm shrink-0">
                  {claim.employee.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-on-surface truncate">{claim.employee.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{claim.date} · {claim.category}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-semibold text-sm text-on-surface">{claim.amount}</span>
                  <span className="text-primary font-semibold text-xs">{actionLabel}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-5 text-center border-t border-outline-variant/15">
          <button
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
        claims={activeClaims}
        actionLabel={actionLabel}
      />
    </div>
  );
}
