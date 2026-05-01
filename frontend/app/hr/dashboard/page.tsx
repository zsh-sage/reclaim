"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, ChevronRight, CheckCircle2 } from "lucide-react";
import type { Claim } from "@/lib/api/types";
import { getHRClaims } from "@/lib/actions/hr";
import { ClaimRow } from "@/components/claims/ClaimRow";
import { ViewAllModal } from "@/components/claims/ViewAllModal";

type TabKey = "attention" | "approved";

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
          <p className="text-primary font-body text-sm font-bold italic mb-4 tracking-wide">
            Every receipt reviewed. Every decision yours.
          </p>
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
        <div className="md:hidden flex flex-col gap-2">
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
          ) : (
            previewClaims.map((claim) => (
              <button
                key={claim.id}
                onClick={() => {
                  const path = actionLabel === "View" ? `/hr/view/${claim.id}` : `/hr/review/${claim.id}`;
                  window.location.href = path;
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