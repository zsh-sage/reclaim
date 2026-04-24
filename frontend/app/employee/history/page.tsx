"use client";

import { useState, useMemo, useEffect } from "react";
import { History } from "lucide-react";
import HistoryFilterBar, { FilterStatus } from "./_components/HistoryFilterBar";
import HistoryList from "./_components/HistoryList";
import ClaimSidebar from "./_components/ClaimSidebar";
import { HISTORY_CLAIMS, type HistoryClaim, type ClaimStatus, type LineItem } from "./_components/historyData";

// ─── Map backend ReimbursementRaw → HistoryClaim ─────────────────────────────

interface RawLineItem {
  receipt_name?: string;
  status?: string;
  requested_amount?: number;
  approved_amount?: number;
  deduction_amount?: number;
  audit_notes?: string;
}

interface ReimbursementRaw {
  reim_id: string;
  user_id?: string;
  main_category?: string;
  sub_category?: string[];
  employee_department?: string | null;
  currency: string;
  totals?: { total_requested: number; total_deduction: number; net_approved: number };
  line_items?: RawLineItem[];
  judgment: string;
  status: string;
  summary?: string;
  created_at?: string | null;
}

function mapToHistoryClaim(r: ReimbursementRaw): HistoryClaim {
  const statusMap: Record<string, ClaimStatus> = {
    APPROVE: "Approved", APPROVED: "Approved", Approved: "Approved",
    REJECT: "Rejected",  REJECTED: "Rejected",  Rejected: "Rejected",
    REVIEW: "Pending",   Pending: "Pending",
    PAID: "Paid",        Paid: "Paid",
    PARTIAL_APPROVE: "Partially Approved",
  };
  const claimStatus: ClaimStatus = statusMap[r.judgment] ?? statusMap[r.status] ?? "Pending";

  const sym = ({ MYR: "RM ", USD: "$", EUR: "€", GBP: "£" } as Record<string, string>)[r.currency] ?? `${r.currency} `;
  const net = r.totals?.net_approved ?? 0;
  const requested = r.totals?.total_requested ?? 0;

  const lineItems: LineItem[] = (r.line_items ?? []).map((li, idx) => ({
    receiptRef: `REC-${String(idx + 1).padStart(2, "0")}`,
    category: li.receipt_name ?? `Receipt ${idx + 1}`,
    requested: li.requested_amount ?? 0,
    approved: li.approved_amount ?? 0,
    lineStatus: li.status === "APPROVED" ? "Approved"
      : li.status === "REJECTED" ? "Rejected"
      : (li.deduction_amount ?? 0) > 0 ? "Adjusted"
      : "Pending",
    adjustments: li.audit_notes?.trim()
      ? [{ code: "AI_NOTE", description: li.audit_notes }]
      : [],
  }));

  const displayDate = r.created_at
    ? new Date(r.created_at).toLocaleDateString("en-MY", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return {
    id: r.reim_id,
    date: displayDate,
    category: r.main_category ?? "General",
    subCategory: r.sub_category?.[0] ?? "",
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
    employee: {
      name: r.employee_department ?? "Unknown",
      id: r.user_id ?? "",
      department: r.employee_department ?? "",
      position: "",
    },
    claimContext: { purpose: r.summary?.split(".")[0] ?? "", overseas: false },
  };
}

export default function HistoryPage() {
  const [currentStatus, setCurrentStatus] = useState<FilterStatus>("All");
  const [selectedClaim, setSelectedClaim] = useState<HistoryClaim | null>(null);
  const [dateRange, setDateRange] = useState("All Time");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [claims, setClaims] = useState<HistoryClaim[]>(HISTORY_CLAIMS);

  // Fetch real reimbursements from the backend on mount
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        // Use the same Next.js server route that the server actions call.
        // We can call the server action directly from client components in Next.js 14.
        const { getClaims } = await import("@/lib/actions/claims");
        // getClaims returns ClaimSummary[] which is fine for the list, but for the
        // sidebar detail view we need the richer shape. We call the raw reimbursements
        // endpoint directly via a client-side fetch (cookies are sent automatically).
        const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const res = await fetch(`${base}/api/v1/reimbursements/`, { credentials: "include", cache: "no-store" });
        if (res.ok) {
          const raw: ReimbursementRaw[] = await res.json();
          if (raw.length > 0) {
            setClaims(raw.map(mapToHistoryClaim));
            return;
          }
        }
      } catch {
        // fall through to mock data
      }
      // If fetch failed or returned empty, keep HISTORY_CLAIMS mock
    };
    fetchClaims();
  }, []);

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
