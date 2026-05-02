"use client";

import { useEffect, useState } from "react";
import { History, CheckCircle2, CreditCard } from "lucide-react";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { useAuth } from "@/context/AuthContext";
import type { DashboardStats } from "@/lib/api/types";

import StatCard          from "./_components/StatCard";
import RecentClaimsTable from "./_components/RecentClaimsTable";

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [today, setToday] = useState("");

  // Show only the first name in the greeting
  const firstName = user?.name?.split(" ")[0] ?? "there";

  // Fetch dashboard stats via server action
  useEffect(() => {
    getDashboardStats().then(setStats);
  }, []);

  // Render date client-only to avoid hydration mismatch
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

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
            <p className="text-on-surface-variant font-body text-sm font-medium italic opacity-80">
              From receipt to reimbursement — in minutes, not days
            </p>
          </div>

          {/* Current date pill — visible on md+ */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-surface-container-low rounded-xl shrink-0">
            <span className="font-label text-sm font-semibold text-primary">
              {today || "Loading..."}
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. KPI Bento Grid ─────────────────── */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10"
      >
        <StatCard
          label="Awaiting Review"
          value={stats?.awaitingReview.amount ?? "MYR —"}
          subtext={`${stats?.awaitingReview.count ?? 0} claims processing`}
          icon={History}
          variant="pending"
        />
        <StatCard
          label="Reimbursed This Month"
          value={stats?.reimbursedThisMonth.amount ?? "MYR —"}
          subtext={`${stats?.reimbursedThisMonth.count ?? 0} claims settled`}
          icon={CheckCircle2}
          variant="approved"
        />
        <StatCard
          label="Already Paid"
          value={stats?.alreadyPaid.amount ?? "MYR —"}
          subtext={`${stats?.alreadyPaid.count ?? 0} claims paid`}
          icon={CreditCard}
          variant="paid"
        />
      </section>

      {/* ── 3. Recent Claims ──────────────────── */}
      <RecentClaimsTable />

    </div>
  );
}
