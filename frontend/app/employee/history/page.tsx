"use client";

import { useState, useMemo } from "react";
import { Download, History } from "lucide-react";
import { MOCK_HISTORY_CLAIMS, Claim, ClaimStatus } from "./_components/mockData";
import HistoryFilterBar, { FilterStatus } from "./_components/HistoryFilterBar";
import HistoryList from "./_components/HistoryList";
import ClaimSidebar from "./_components/ClaimSidebar";

export default function HistoryPage() {
  const [currentStatus, setCurrentStatus] = useState<FilterStatus>("All");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Filter claims based on the selected status pill
  const filteredClaims = useMemo(() => {
    if (currentStatus === "All") return MOCK_HISTORY_CLAIMS;
    return MOCK_HISTORY_CLAIMS.filter(claim => claim.status === currentStatus);
  }, [currentStatus]);

  // Aggregate KPI data (Total vs Pending) just for a tiny summary
  const summary = useMemo(() => {
    const total = MOCK_HISTORY_CLAIMS.filter(c => c.status === "Approved").reduce((acc, c) => acc + c.amountNumeric, 0);
    const pending = MOCK_HISTORY_CLAIMS.filter(c => c.status === "Pending").reduce((acc, c) => acc + c.amountNumeric, 0);
    
    // Formatting currency
    const formatCurrency = (val: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
    
    return {
      total: formatCurrency(total),
      pending: formatCurrency(pending)
    };
  }, []);

  return (
    <main className="min-h-dvh pb-24 md:pb-12 bg-surface">
      <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ── Header Row ── */}
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

          <div className="flex items-center gap-3">
            <button className="flex items-center justify-center gap-2 w-full md:w-auto bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:bg-surface-container-low transition-colors px-4 py-2.5 rounded-xl font-bold text-sm select-none active:scale-95">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </header>

        {/* ── Main Content Container ── */}
        <section aria-labelledby="history-filters" className="relative z-10 w-full mb-6">
          <HistoryFilterBar 
            currentStatus={currentStatus} 
            onStatusChange={setCurrentStatus} 
          />
        </section>

        <section aria-label="Claims List" className="relative z-0">
          <HistoryList 
            claims={filteredClaims} 
            onSelectClaim={setSelectedClaim} 
          />
        </section>

      </div>

      {/* ── Claim Sidebar (Overlays above everything except topnav/bottomnav depending on z-index) ── */}
      <ClaimSidebar 
        claim={selectedClaim} 
        onClose={() => setSelectedClaim(null)} 
      />

    </main>
  );
}
