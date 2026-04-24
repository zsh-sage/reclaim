"use client";

import { useEffect, useState } from "react";
import { Settings, User, Bell, Shield, Wallet, ChevronRight, Save, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getBankingDetails } from "@/lib/actions/settings";
import type { BankingDetails } from "@/lib/api/types";

export default function SettingsLegacyContent() {
  const { user } = useAuth();
  const [banking, setBanking] = useState<BankingDetails | null>(null);

  // Fetch banking details via server action
  useEffect(() => {
    getBankingDetails().then(setBanking);
  }, []);

  return (
    <main className="min-h-dvh pb-24 md:pb-12 bg-surface">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── Header ── */}
        <header className="mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Settings className="w-5 h-5" />
            <span className="font-label font-bold tracking-widest uppercase text-xs">Preferences</span>
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
            Settings
          </h1>
          <p className="font-body text-sm md:text-base text-on-surface-variant mt-2">
            Manage your account preferences and banking details for reimbursements.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* ── Left Sidebar (Desktop Nav) ── */}
          <div className="hidden md:flex flex-col gap-2">
            {[
              { id: "profile", href: "/employee/settings", label: "Profile Information", icon: User, active: true },
              { id: "notifications", href: "/employee/settings", label: "Notifications", icon: Bell, active: false },
              { id: "security", href: "/employee/settings", label: "Security & Login", icon: Shield, active: false },
              { id: "banking", href: "/employee/settings", label: "Banking & Payouts", icon: Wallet, active: false },
              { id: "support", href: "/employee/support", label: "Help & Support", icon: LifeBuoy, active: false },
            ].map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-semibold transition-colors ${
                  item.active
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* ── Main Content Area ── */}
          <div className="md:col-span-2 space-y-6">

            {/* Profile Section */}
            <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-outline-variant/10">
                <h2 className="font-headline font-bold text-lg text-on-surface mb-1">Profile Information</h2>
                <p className="font-body text-sm text-on-surface-variant">Update your personal details below.</p>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary-container to-tertiary-container shadow-sm border-2 border-surface flex items-center justify-center font-headline font-bold text-xl text-on-primary-container">
                    {user?.name?.charAt(0) || "E"}
                  </div>
                  <button className="px-4 py-2 border border-outline-variant/20 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
                    Change Avatar
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Full Name</label>
                    <input type="text" defaultValue={user?.name || "Employee"} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl border border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
                    <input type="email" defaultValue={user?.email || "employee@reclaim.inc"} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl border border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Department</label>
                    <input type="text" defaultValue={user?.department || "General"} disabled className="w-full bg-surface-variant/30 text-on-surface-variant px-4 py-2.5 rounded-xl border border-transparent cursor-not-allowed" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-surface-container/30 border-t border-outline-variant/10 flex justify-end">
                <button className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all">
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </section>

            {/* Banking MVP Section */}
            <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-outline-variant/10">
                <h2 className="font-headline font-bold text-lg text-on-surface mb-1">Banking & Payouts</h2>
                <p className="font-body text-sm text-on-surface-variant">Where should we send your reimbursements?</p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between p-4 border border-outline-variant/20 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-container text-on-primary-container rounded-lg">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-headline font-bold text-sm text-on-surface">
                        {banking ? `${banking.institutionName} •••• ${banking.accountLastFour}` : "Loading…"}
                      </p>
                      <p className="font-body text-xs text-on-surface-variant">
                        {banking ? `${banking.routingType} • Updated ${banking.updatedAt}` : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </section>

            {/* Mobile Support Link */}
            <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm md:hidden block">
              <div className="p-6">
                <Link href="/employee/support" className="flex items-center justify-between p-4 border border-outline-variant/20 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-tertiary-container text-on-tertiary-container rounded-lg">
                      <LifeBuoy className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-headline font-bold text-sm text-on-surface">Help & Support</p>
                      <p className="font-body text-xs text-on-surface-variant">Access FAQs or contact HR</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
