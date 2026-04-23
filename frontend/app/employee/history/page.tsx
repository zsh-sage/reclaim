"use client";

import { useState, useMemo } from "react";
import { History } from "lucide-react";
import HistoryFilterBar, { FilterStatus } from "./_components/HistoryFilterBar";
import HistoryList from "./_components/HistoryList";
import ClaimSidebar from "./_components/ClaimSidebar";
import { HISTORY_CLAIMS, type HistoryClaim } from "./_components/historyData";

export default function HistoryPage() {
  const [currentStatus, setCurrentStatus] = useState<FilterStatus>("All");
  const [selectedClaim, setSelectedClaim] = useState<HistoryClaim | null>(null);
  const [dateRange, setDateRange] = useState("All Time");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Filter claims based on the selected filters
  const filteredClaims = useMemo(() => {
    let result = HISTORY_CLAIMS;

    if (currentStatus !== "All") {
      result = result.filter((c) => c.status === currentStatus);
    }

    if (selectedCategory !== "All") {
      result = result.filter((c) => c.category === selectedCategory);
    }

    if (dateRange !== "All Time") {
      // Very simple mock date filtering assuming "now" is Nov 15, 2023 for our mock data
      const now = new Date("2023-11-15");
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
  }, [currentStatus, selectedCategory, dateRange]);

  // KPI summary from mock data
  const summary = useMemo(() => {
    const fmt = (v: number) =>
      `RM ${new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2 }).format(v)}`;
    const reimbursed = HISTORY_CLAIMS
      .filter((c) => c.status === "Approved" || c.status === "Paid")
      .reduce((acc, c) => acc + c.approvedAmount, 0);
    const pending = HISTORY_CLAIMS
      .filter((c) => c.status === "Pending")
      .reduce((acc, c) => acc + c.amountNumeric, 0);
    return { total: fmt(reimbursed), pending: fmt(pending) };
  }, []);

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
            onSelectClaim={setSelectedClaim}
          />
        </section>

      </div>

      {/* ── Claim Sidebar Drawer ── */}
      <ClaimSidebar
        claim={selectedClaim}
        onClose={() => setSelectedClaim(null)}
      />
    </main>
  );
}
