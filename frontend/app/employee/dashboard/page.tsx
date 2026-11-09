"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, CheckCircle2, CreditCard, Plus, Camera, ClipboardList, ArrowUpRight } from "lucide-react";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { useAuth } from "@/context/AuthContext";
import type { DashboardStats } from "@/lib/api/types";
import { PageHeader, PageShell } from "@/components/ui/PageHeader";
import { btn } from "@/components/ui/styles";

import StatCard from "./_components/StatCard";
import RecentClaimsTable from "./_components/RecentClaimsTable";

const QUICK_ACTIONS = [
  { href: "/employee/claims", label: "Upload Receipts", sub: "JPEG, PNG, or PDF · up to 10", icon: Camera },
  { href: "/employee/drafts", label: "Resume a Draft", sub: "Pick up where you left off", icon: ClipboardList },
  { href: "/employee/history", label: "Track Claims", sub: "Status from submission to payout", icon: History },
];

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [today, setToday] = useState("");

  const firstName = user?.name?.split(" ")[0] ?? "there";

  useEffect(() => {
    getDashboardStats().then(setStats);
  }, []);

  // Client-only date avoids a server/client hydration mismatch
  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()),
    );
  }, []);

  const loading = stats === null;

  return (
    <PageShell>
      <PageHeader
        eyebrow={today || " "}
        title={`Welcome back, ${firstName}.`}
        description="Here’s where your reimbursements stand today."
        actions={
          <Link href="/employee/claims" className={`${btn.primary} md:hidden`}>
            <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
            New Claim
          </Link>
        }
      />

      <section aria-label="Key metrics" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 md:grid-cols-3 md:gap-5 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1">
        <StatCard
          label="Awaiting Review"
          value={stats?.awaitingReview.amount ?? "MYR —"}
          subtext={`${stats?.awaitingReview.count ?? 0} claims processing`}
          icon={History}
          variant="pending"
          loading={loading}
        />
        <StatCard
          label="Reimbursed This Month"
          value={stats?.reimbursedThisMonth.amount ?? "MYR —"}
          subtext={`${stats?.reimbursedThisMonth.count ?? 0} claims settled`}
          icon={CheckCircle2}
          variant="approved"
          loading={loading}
        />
        <StatCard
          label="Already Paid"
          value={stats?.alreadyPaid.amount ?? "MYR —"}
          subtext={`${stats?.alreadyPaid.count ?? 0} claims paid`}
          icon={CreditCard}
          variant="paid"
          loading={loading}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <RecentClaimsTable />

        <aside aria-label="Quick actions" className="flex flex-col gap-3">
          <div className="mesh-ink relative overflow-hidden rounded-[20px] p-6 text-white">
            <div aria-hidden="true" className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#105bff] opacity-40 blur-3xl" />
            <p className="relative text-[12px] font-semibold uppercase tracking-[0.12em] text-[#a5a7ff]">Tip</p>
            <p className="relative mt-2 font-headline text-[19px] font-semibold leading-snug tracking-[-0.02em]">
              Snap receipts as you go — AI fills in the rest.
            </p>
            <p className="relative mt-2 text-[13px] text-white/60">
              Merchant, date, amount and category are extracted automatically. You only confirm.
            </p>
          </div>
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-4 rounded-[18px] bg-white p-4 shadow-ambient transition-shadow hover:shadow-ambient-lg"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <a.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-on-surface">{a.label}</span>
                <span className="block truncate text-[12px] text-on-surface-variant">{a.sub}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-on-surface-variant transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </aside>
      </div>
    </PageShell>
  );
}
