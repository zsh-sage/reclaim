"use client";

import { useEffect, useState } from "react";
import { Settings, User, Bell, Shield, Wallet, ChevronRight, Save, LifeBuoy, Zap, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getBankingDetails } from "@/lib/actions/settings";
import type { BankingDetails } from "@/lib/api/types";

// Mock API function
const toggleAutoReimbursementAPI = (enabled: boolean): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 1000);
  });
};

export default function SettingsLegacyContent() {
  const { user } = useAuth();
  const [banking, setBanking] = useState<BankingDetails | null>(null);

  // Feature State
  const [isAutoReimburseEnabled, setIsAutoReimburseEnabled] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch banking details via server action
  useEffect(() => {
    getBankingDetails().then(setBanking);
  }, []);

  const handleToggleClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmToggle = async () => {
    setIsUpdating(true);
    try {
      const success = await toggleAutoReimbursementAPI(!isAutoReimburseEnabled);
      if (success) {
        setIsAutoReimburseEnabled(!isAutoReimburseEnabled);
        setShowConfirmModal(false);
      }
    } catch (error) {
      console.error("Failed to update auto-reimbursement setting", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative min-h-full p-6 md:p-10 lg:p-12">
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full bg-primary opacity-[0.07] blur-[80px]" />
        <div className="absolute top-32 right-40 w-[320px] h-[320px] rounded-full bg-tertiary opacity-[0.06] blur-[64px]" />
        <div className="absolute -top-8 right-[15%] w-[200px] h-[200px] rounded-full bg-primary-container opacity-[0.12] blur-[48px]" />
      </div>

      <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            
            <h2
              className="font-headline font-extrabold text-on-background mb-2 tracking-tight"
              style={{ fontSize: "2.5rem", letterSpacing: "-0.02em" }}
            >
              Settings
            </h2>
            <p className="text-on-surface-variant text-lg font-body">
              Manage your account preferences and banking details for reimbursements.
            </p>
          </div>
        </div>

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

            {/* AI Auto-Reimbursement Section */}
            <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <div>
                  <h2 className="font-headline font-bold text-lg text-on-surface mb-1 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    AI Auto-Reimbursement
                  </h2>
                  <p className="font-body text-sm text-on-surface-variant max-w-md">
                    Automatically disburse funds to the employee's account for claims that are 100% approved by the AI.
                  </p>
                </div>
                <button
                  onClick={handleToggleClick}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ring-offset-2 focus:ring-2 focus:ring-primary/20 ${
                    isAutoReimburseEnabled ? "bg-primary" : "bg-outline-variant/30"
                  }`}
                  role="switch"
                  aria-checked={isAutoReimburseEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isAutoReimburseEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <div className="p-4 bg-amber-50/50 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-amber-800 font-medium italic">
                  Note: Enabling this feature will bypass manual HR review for all claims judged as valid by the AI pipeline. This action affects fund disbursement.
                </p>
              </div>
            </section>

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
                    <input type="text" defaultValue={user?.department_name || "General"} disabled className="w-full bg-surface-variant/30 text-on-surface-variant px-4 py-2.5 rounded-xl border border-transparent cursor-not-allowed" />
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

          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isUpdating && setShowConfirmModal(false)}
          />
          
          {/* Modal Card */}
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-[0_32px_128px_-16px_rgba(44,47,49,0.25)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                isAutoReimburseEnabled ? "bg-red-50 text-red-600" : "bg-primary/10 text-primary"
              }`}>
                {isAutoReimburseEnabled ? <AlertTriangle className="w-8 h-8" /> : <Zap className="w-8 h-8" />}
              </div>
              
              <h3 className="text-2xl font-extrabold font-headline text-on-surface mb-3 tracking-tight">
                {isAutoReimburseEnabled ? "Disable Auto-Reimbursement?" : "Enable Auto-Reimbursement?"}
              </h3>
              
              <p className="text-on-surface-variant font-body leading-relaxed mb-8">
                {isAutoReimburseEnabled 
                  ? "Are you sure you want to disable automatic payouts? All future claims will require manual HR review before disbursement."
                  : "Are you sure? Enabling this means funds will be sent automatically to employee bank accounts without manual HR review for AI-approved claims."
                }
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  disabled={isUpdating}
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-6 py-3.5 rounded-xl text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-outline-variant/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isUpdating}
                  onClick={handleConfirmToggle}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 ${
                    isAutoReimburseEnabled ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-hover"
                  }`}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    isAutoReimburseEnabled ? "Disable Feature" : "Enable Feature"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
