"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  User, Bell, Shield, Wallet, ChevronRight, Save, LifeBuoy,
  Zap, AlertTriangle, Loader2, CheckCircle2, X,
  Building2, CalendarClock, Wifi,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getBankingDetails } from "@/lib/actions/settings";
import type { BankingDetails } from "@/lib/api/types";

// ─── Toast Component ──────────────────────────────────────────────────────────

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-[100] flex items-center gap-3 bg-surface-container-highest text-on-surface px-4 py-3 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-outline-variant/20 animate-in fade-in slide-in-from-top-2 duration-300 max-w-sm">
      <div className="p-1 bg-outline-variant/10 rounded-lg shrink-0">
        <CheckCircle2 className="w-4 h-4 text-on-surface-variant" />
      </div>
      <p className="text-sm font-medium font-body flex-1">{message}</p>
      <button onClick={onDismiss} className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsLegacyContent() {
  const { user } = useAuth();
  const [banking, setBanking] = useState<BankingDetails | null>(null);

  // ── Toast state ──
  const [toast, setToast] = useState<string | null>(null);
  const showToast = () => setToast("Feature has not been implemented yet.");

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState("profile");

  // ── Auto-Reimbursement state ──
  const [isAutoReimburseEnabled, setIsAutoReimburseEnabled] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("reclaim_auto_reimburse");
    if (saved === "true") setIsAutoReimburseEnabled(true);
  }, []);

  const toggleAutoReimbursementAPI = async (newState: boolean): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    localStorage.setItem("reclaim_auto_reimburse", newState.toString());
    return true;
  };

  useEffect(() => {
    getBankingDetails().then(setBanking);
  }, []);

  const handleToggleClick = () => setShowConfirmModal(true);

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

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

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
              { id: "profile", label: "Profile Information", icon: User },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "security", label: "Security & Login", icon: Shield },
              { id: "banking", label: "Banking & Payouts", icon: Wallet },
              { id: "support", href: "/hr/support", label: "Help & Support", icon: LifeBuoy },
            ].map((item) => {
              const isActive = item.id === activeTab;
              const className = `flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-semibold transition-colors w-full text-left cursor-pointer ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface"
              }`;
              
              if (item.href) {
                return (
                  <Link key={item.id} href={item.href} className={className}>
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={className}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* ── Main Content Area ── */}
          <div className="md:col-span-2 space-y-6">

            {/* ── Banking & Payouts ── */}
            {activeTab === "banking" && (
              <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
              <div className="p-6 border-b border-outline-variant/10">
                <h2 className="font-headline font-bold text-lg text-on-surface mb-1 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Banking & Payouts
                </h2>
                <p className="font-body text-sm text-on-surface-variant">
                  Manage disbursement accounts, schedules, and auto-payout settings.
                </p>
              </div>

              <div className="divide-y divide-outline-variant/8">

                {/* Corporate Bank Account */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-primary-container text-on-primary-container rounded-xl shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-headline font-semibold text-sm text-on-surface">Corporate Bank Account</p>
                      <p className="font-body text-xs text-on-surface-variant mt-0.5">
                        {banking?.bank_code
                          ? `${banking.bank_code} ${banking.bank_account_number ? '•••• ' + banking.bank_account_number.slice(-4) : ''}`
                          : "No bank account set up"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={showToast}
                    className="shrink-0 px-4 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-xl hover:bg-primary/10 active:scale-95 transition-all cursor-pointer"
                  >
                    Update
                  </button>
                </div>

                {/* Disbursement Schedule */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-tertiary-container text-on-tertiary-container rounded-xl shrink-0">
                      <CalendarClock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-headline font-semibold text-sm text-on-surface">Disbursement Schedule</p>
                      <p className="font-body text-xs text-on-surface-variant mt-0.5">Weekly (Fridays)</p>
                    </div>
                  </div>
                  <button
                    onClick={showToast}
                    className="shrink-0 px-4 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/30 rounded-xl hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* Payment Gateway Status */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-headline font-semibold text-sm text-on-surface">Payment Gateway</p>
                      <p className="font-body text-xs text-on-surface-variant mt-0.5">Stripe / Bank API</p>
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    Connected
                  </span>
                </div>

                {/* AI Auto-Reimbursement (moved here) */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-headline font-semibold text-sm text-on-surface">AI Auto-Reimbursement</p>
                      <p className="font-body text-xs text-on-surface-variant mt-0.5 max-w-xs">
                        Auto-disburse funds for claims 100% approved by the AI pipeline.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleClick}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
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

                {/* Auto-reimburse warning footer */}
                <div className="px-5 py-3 bg-amber-50/50 flex items-start gap-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-amber-800 font-medium italic">
                    Enabling auto-reimbursement bypasses manual HR review for all AI-approved claims and directly affects fund disbursement.
                  </p>
                </div>

              </div>
            </section>
            )}

            {/* ── Profile Section ── */}
            {activeTab === "profile" && (
              <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
              <div className="p-6 border-b border-outline-variant/10">
                <h2 className="font-headline font-bold text-lg text-on-surface mb-1">Profile Information</h2>
                <p className="font-body text-sm text-on-surface-variant">Update your personal details below.</p>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary-container to-tertiary-container shadow-sm border-2 border-surface flex items-center justify-center font-headline font-bold text-xl text-on-primary-container">
                    {user?.name?.charAt(0) || "H"}
                  </div>
                  <button onClick={showToast} className="px-4 py-2 border border-outline-variant/20 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer">
                    Change Avatar
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Full Name</label>
                    <input type="text" defaultValue={user?.name || "HR Admin"} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl border border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
                    <input type="email" defaultValue={user?.email || "hr@reclaim.inc"} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl border border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider">Department</label>
                    <input type="text" defaultValue={user?.department_name || "Human Resources"} disabled className="w-full bg-surface-variant/30 text-on-surface-variant px-4 py-2.5 rounded-xl border border-transparent cursor-not-allowed" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-surface-container/30 border-t border-outline-variant/10 flex justify-end">
                <button onClick={showToast} className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer">
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </section>
            )}

            {/* ── Notifications Section ── */}
            {activeTab === "notifications" && (
              <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
              <div className="p-6 border-b border-outline-variant/10">
                <h2 className="font-headline font-bold text-lg text-on-surface mb-1">Notifications</h2>
                <p className="font-body text-sm text-on-surface-variant">Choose when and how you are notified.</p>
              </div>
              <div className="divide-y divide-outline-variant/8">
                {[
                  { label: "Claim Submitted", desc: "Notify when an employee submits a new claim." },
                  { label: "Claim Auto-Approved", desc: "Notify when AI fully approves a claim." },
                  { label: "Disbursement Sent", desc: "Notify after a payout is processed." },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-5">
                    <div>
                      <p className="font-headline font-semibold text-sm text-on-surface">{row.label}</p>
                      <p className="font-body text-xs text-on-surface-variant mt-0.5">{row.desc}</p>
                    </div>
                    <button
                      onClick={showToast}
                      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-outline-variant/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                      role="switch"
                      aria-checked={false}
                    >
                      <span aria-hidden="true" className="pointer-events-none inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow-sm ring-0 transition" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-surface-container/30 border-t border-outline-variant/10 flex justify-end">
                <button onClick={showToast} className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer">
                  <Save className="w-4 h-4" />
                  Save Preferences
                </button>
              </div>
            </section>
            )}

            {/* ── Security Section ── */}
            {activeTab === "security" && (
              <section className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
              <div className="p-6 border-b border-outline-variant/10">
                <h2 className="font-headline font-bold text-lg text-on-surface mb-1">Security & Login</h2>
                <p className="font-body text-sm text-on-surface-variant">Manage your password and access credentials.</p>
              </div>
              <div className="divide-y divide-outline-variant/8">
                {[
                  { label: "Change Password", desc: "Last updated 3 months ago." },
                  { label: "Two-Factor Authentication", desc: "Add an extra layer of security to your account." },
                  { label: "Active Sessions", desc: "1 active session on this device." },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-5">
                    <div>
                      <p className="font-headline font-semibold text-sm text-on-surface">{row.label}</p>
                      <p className="font-body text-xs text-on-surface-variant mt-0.5">{row.desc}</p>
                    </div>
                    <button
                      onClick={showToast}
                      className="px-4 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/30 rounded-xl hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            </section>
            )}

          </div>
        </div>
      </div>

      {/* ── Auto-Reimbursement Confirmation Modal ── */}
      {showConfirmModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isUpdating && setShowConfirmModal(false)}
          />
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
                  className="flex-1 px-6 py-3.5 rounded-xl text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-outline-variant/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={isUpdating}
                  onClick={handleConfirmToggle}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
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
        </div>,
        document.body
      )}
    </div>
  );
}
