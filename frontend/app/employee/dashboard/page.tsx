"use client";

import { useAuth } from "@/context/AuthContext";
import { History, CheckCircle2, CreditCard } from "lucide-react";

import StatCard          from "./_components/StatCard";
import RecentClaimsTable from "./_components/RecentClaimsTable";

export default function EmployeeDashboardPage() {
  const { user } = useAuth();

  // Show only the first name in the greeting
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    /*
     * The nav shell (SideNav, TopNav, BottomNav) is now provided by
     * app/employee/layout.tsx — this page only owns the scrollable content.
     */
    <div className="px-4 pt-6 pb-20 md:p-8 lg:p-12 lg:pb-8">

      {/* ── 1. Hero greeting ──────────────────────── */}
      <section
        aria-label="Welcome section"
        className="mb-6 md:mb-10 relative"
      >
        {/* Background gradient decorative element */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-linear-to-br from-[#4647D3]/20 to-[#9E00B4]/10 rounded-full blur-3xl pointer-events-none z-0" />

        <div className="flex flex-wrap items-start justify-between gap-3 relative z-10">
          <div>
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight mb-1.5">
              Welcome back, {firstName}.
            </h2>
          </div>

          {/* Current date pill — visible on md+ */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-surface-container-low rounded-xl shrink-0">
            <span className="font-label text-sm font-semibold text-primary">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month:   "long",
                day:     "numeric",
              })}
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. KPI Bento Grid ─────────────────── */}
      {/*
       * Grid:
       *   - 1 column on mobile (stacked, full-width cards are easy to read)
       *   - 3 columns on md+ (side-by-side bento layout matching boilerplate)
       */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10"
      >
        <StatCard
          label="Awaiting Review"
          value="$1,240.50"
          subtext="4 claims processing"
          icon={History}
          variant="pending"
        />
        <StatCard
          label="Reimbursed This Month"
          value="$3,850.00"
          subtext="12 claims settled"
          icon={CheckCircle2}
          variant="approved"
        />
        <StatCard
          label="Already Paid"
          value="$450.00"
          subtext="2 claims paid"
          icon={CreditCard}
          variant="paid"
        />
      </section>

      {/* ── 3. Recent Claims ──────────────────── */}
      <RecentClaimsTable />

    </div>
  );
}
