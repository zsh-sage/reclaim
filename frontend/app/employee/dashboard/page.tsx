"use client";

import { useAuth } from "@/context/AuthContext";
import { Clock, CheckCircle2, AlertTriangle, ScanLine, ArrowRight } from "lucide-react";

import SideNav            from "./_components/SideNav";
import TopNav             from "./_components/TopNav";
import StatCard           from "./_components/StatCard";
import QuickActions       from "./_components/QuickActions";
import RecentClaimsTable  from "./_components/RecentClaimsTable";
import BottomNav          from "./_components/BottomNav";

/* ─── Page metadata ──────────────────────────────────── */
export const metadata = {
  title: "Dashboard — Reclaim",
  description: "Employee expense reimbursement dashboard",
};

export default function EmployeeDashboardPage() {
  const { user } = useAuth();

  // Show only the first name in the greeting
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    /*
     * Root layout:
     *   - `flex h-screen overflow-hidden` traps scroll to the main content area
     *   - SideNav is a hidden-until-lg flex child (w-64 shrink-0)
     *   - The right column is flex-col with TopNav + scrollable <main>
     */
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">

      {/* ── Desktop Sidebar ──────────────────────── */}
      <SideNav />

      {/* ── Right Column ─────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Sticky top navigation */}
        <TopNav />

        {/*
         * Scrollable canvas:
         *   - `pb-24 lg:pb-12` adds bottom padding so BottomNav never covers content
         *   - Padding scales: p-4 (mobile) → p-8 (md) → p-12 (lg)
         */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 lg:pb-12 bg-surface"
        >

          {/* ── 1. Hero greeting ──────────────────── */}
          <section
            aria-label="Welcome section"
            className="mb-8 md:mb-10"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight mb-1.5">
                  Welcome back, {firstName}.
                </h2>
                <p className="font-body text-on-surface-variant text-base md:text-lg">
                  You have{" "}
                  <span className="text-tertiary font-semibold">
                    2 pending claims
                  </span>{" "}
                  requiring your attention.
                </p>
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
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10"
          >
            <StatCard
              label="Awaiting Review"
              value="$1,240.50"
              subtext="4 claims processing"
              icon={Clock}
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
              label="Needs Receipts"
              value="$450.00"
              subtext={
                <span className="flex items-center gap-1">
                  Review 2 items <ArrowRight className="w-3.5 h-3.5" />
                </span>
              }
              icon={AlertTriangle}
              variant="action"
            />
          </section>

          {/* ── 3. Quick Actions ──────────────────── */}
          <section className="mb-8 md:mb-10">
            <QuickActions />
          </section>

          {/* ── 4. Recent Claims ──────────────────── */}
          <RecentClaimsTable />

        </main>
      </div>

      {/*
       * Mobile FAB — scanner shortcut.
       * `fixed` is explicitly allowed for FABs per layout constraints.
       * Positioned above the BottomNav (bottom-24 = 96px).
       */}
      <button
        id="mobile-scanner-fab"
        aria-label="Open receipt scanner"
        className="lg:hidden fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-linear-to-br from-primary to-tertiary text-on-primary flex items-center justify-center shadow-[0_8px_28px_-4px_rgba(70,71,211,0.45)] hover:shadow-[0_12px_36px_-4px_rgba(70,71,211,0.55)] active:scale-95 transition-all duration-200"
      >
        <ScanLine className="w-6 h-6" strokeWidth={2} />
      </button>

      {/* Mobile bottom navigation (fixed — FAB exception) */}
      <BottomNav />

    </div>
  );
}
