"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { History } from "lucide-react";
import HistoryFilterBar, { FilterStatus } from "./_components/HistoryFilterBar";
import HistoryList from "./_components/HistoryList";
import ClaimSidebar from "./_components/ClaimSidebar";
import { type HistoryClaim, type ClaimStatus, type LineItem } from "./_components/historyData";
import type { ReimbursementRaw } from "@/lib/api/types";
import { getRawReimbursements, getRawReimbursement } from "@/lib/actions/claims";

// ─── Map backend ReimbursementRaw → HistoryClaim ─────────────────────────────

function mapToHistoryClaim(r: ReimbursementRaw): HistoryClaim {
  const statusMap: Record<string, ClaimStatus> = {
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PENDING: "Pending",
    REVIEW: "Pending",
    APPEALED: "Pending",
    Paid: "Paid",
    PAID: "Paid",
  };
  const claimStatus: ClaimStatus = statusMap[r.status] ?? "Pending";

  const sym = ({ MYR: "RM ", USD: "$", EUR: "€", GBP: "£" } as Record<string, string>)[r.currency] ?? `${r.currency} `;
  const net = r.total_approved_amount ?? 0;
  const requested = r.total_claimed_amount ?? 0;

  const lineItems: LineItem[] = (r.line_items ?? []).map((li, idx) => ({
    receiptRef: `REC-${String(idx + 1).padStart(2, "0")}`,
    category: li.description ?? li.category ?? `Receipt ${idx + 1}`,
    requested: li.claimed_amount ?? 0,
    approved: li.approved_amount ?? 0,
    lineStatus: li.judgment === "APPROVED" ? "Approved"
      : li.judgment === "REJECTED" ? "Rejected"
      : (li.claimed_amount ?? 0) > (li.approved_amount ?? 0) ? "Adjusted"
      : "Pending",
    adjustments: li.rejection_reason?.trim()
      ? [{ code: "AI_NOTE", description: li.rejection_reason }]
      : [],
  }));

  const displayDate = r.created_at
    ? new Date(r.created_at).toLocaleDateString("en-MY", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return {
    id: r.reim_id,
    date: displayDate,
    category: r.main_category ?? "General",
    subCategory: r.sub_categories?.[0] ?? "",
    categoryIcon: History as any,
    merchant: r.summary?.split(".")[0] ?? r.main_category ?? "Claim",
    amount: `${sym}${requested.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`,
    amountNumeric: requested,
    approvedAmount: net,
    status: claimStatus,
    hrNote: r.summary ?? undefined,
    lineItems,
    receiptCount: lineItems.length,
    pdfDownloadUrl: `/api/v1/reimbursements/${r.reim_id}/pdf`,
    settlementId: r.settlement_id,
    settlementTemplateUrl: r.settlement_id
      ? `/api/v1/documents/settlement/${r.settlement_id}/template`
      : undefined,
    employee: {
      name: r.employee_name ?? "Unknown",
      id: r.user_id ?? "",
      department: r.department_name ?? "",
      position: "",
    },
    claimContext: { purpose: r.summary?.split(".")[0] ?? "", overseas: false },
  };
}

export default function HistoryPage() {
  const [currentStatus, setCurrentStatus] = useState<FilterStatus>("All");
  const [selectedClaim, setSelectedClaim] = useState<HistoryClaim | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [dateRange, setDateRange] = useState("All Time");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [claims, setClaims] = useState<HistoryClaim[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    getRawReimbursements().then((raw) => {
      if (raw.length > 0) setClaims(raw.map(mapToHistoryClaim));
    });
  }, []);

  const handleSelectClaim = useCallback(async (claim: HistoryClaim) => {
    setIsLoadingDetail(true);
    try {
      const raw = await getRawReimbursement(claim.id);
      if (raw) {
        setSelectedClaim(mapToHistoryClaim(raw));
        return;
      }
    } finally {
      setIsLoadingDetail(false);
    }
    setSelectedClaim(claim);
  }, []);

  useEffect(() => {
    const claimId = searchParams.get("claimId");
    if (!claimId || claims.length === 0) return;
    const match = claims.find((c) => c.id === claimId);
    if (match) handleSelectClaim(match);
  }, [claims, searchParams, handleSelectClaim]);

  // Filter claims based on the selected filters
  const filteredClaims = useMemo(() => {
    let result = claims;
    if (currentStatus !== "All") result = result.filter((c) => c.status === currentStatus);
    if (selectedCategory !== "All") result = result.filter((c) => c.category === selectedCategory);
    if (dateRange !== "All Time") {
      const now = new Date();
      let days = Infinity;
      if (dateRange === "Last 30 Days") days = 30;
      else if (dateRange === "Last 90 Days") days = 90;
      else if (dateRange === "This Year") days = 365;
      result = result.filter(c => {
        const diff = (now.getTime() - new Date(c.date).getTime()) / (1000 * 3600 * 24);
        return diff <= days && diff >= 0;
      });
    }
    return result;
  }, [currentStatus, selectedCategory, dateRange, claims]);

  // KPI summary
  const summary = useMemo(() => {
    const fmt = (v: number) => `RM ${new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2 }).format(v)}`;
    const reimbursed = claims.filter((c) => c.status === "Approved" || c.status === "Paid").reduce((acc, c) => acc + c.approvedAmount, 0);
    const pending = claims.filter((c) => c.status === "Pending").reduce((acc, c) => acc + c.amountNumeric, 0);
    return { total: fmt(reimbursed), pending: fmt(pending) };
  }, [claims]);

  return (
    <main className="min-h-dvh pb-24 md:pb-12 bg-surface">
      <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <History className="w-5 h-5" />
              <span className="font-label font-bold tracking-widest uppercase text-xs">Claims Ledger</span>
            </div>
            <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight mb-2">
              History
            </h1>
            <p className="font-body text-sm md:text-base text-on-surface-variant flex items-center gap-2">
              <span className="font-semibold text-on-surface">Total Reimbursed: {summary.total}</span>
              <span className="text-outline-variant">•</span>
              <span>Pending: {summary.pending}</span>
            </p>
          </div>
        </header>

        {/* ── Filter Bar ── */}
        <section aria-labelledby="history-filters" className="relative z-10 w-full mb-6">
          <HistoryFilterBar
            currentStatus={currentStatus}
            onStatusChange={setCurrentStatus}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            category={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </section>

        {/* ── Claims List ── */}
        <section aria-label="Claims List" className="relative z-0">
          <HistoryList
            claims={filteredClaims}
            onSelectClaim={handleSelectClaim}
          />
        </section>

      </div>

      {/* ── Claim Sidebar Drawer ── */}
      <ClaimSidebar
        claim={selectedClaim}
        onClose={() => setSelectedClaim(null)}
        isLoading={isLoadingDetail}
      />
    </main>
  );
}
