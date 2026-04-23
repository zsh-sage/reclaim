"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
  AlertTriangle,
  Info,
  CheckCheck,
  MinusCircle,
  XCircle,
  Building2,
  MapPin,
  Calendar as CalendarIcon,
  Sparkles,
} from "lucide-react";
import type { HistoryClaim, LineItem, ClaimStatus } from "./historyData";

// ─── Prop types ───────────────────────────────────────────────────────────────

interface ClaimSidebarProps {
  claim: HistoryClaim | null;
  onClose: () => void;
}

// ─── Currency formatter (MYR) ─────────────────────────────────────────────────

function fmt(v: number) {
  return `RM ${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)}`;
}

// ─── Status Cascading Logic ───────────────────────────────────────────────────
// Derives effective parent status from the actual lineItems totals.
// Pending always stays Pending.

function deriveStatus(claim: HistoryClaim): ClaimStatus {
  if (claim.status === "Pending") return "Pending";
  const items      = claim.lineItems ?? [];
  const totalReq   = items.reduce((s, i) => s + i.requested, 0);
  const totalApp   = items.reduce((s, i) => s + i.approved,  0);
  if (totalApp === 0)       return "Rejected";
  if (totalApp >= totalReq) return claim.status === "Paid" ? "Paid" : "Approved";
  return "Partially Approved";
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ClaimStatus }) {
  const styles: Record<ClaimStatus, string> = {
    Pending:              "bg-secondary-container/50 text-on-secondary-container",
    Approved:             "bg-primary/10 text-primary",
    "Partially Approved": "bg-amber-500/10 text-amber-600",
    Paid:                 "bg-tertiary/10 text-tertiary",
    Rejected:             "bg-error/10 text-error",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

// ─── Per-Row Mini Status Badge ────────────────────────────────────────────────

function LineStatusBadge({ s }: { s: LineItem["lineStatus"] }) {
  const cfg = {
    Approved: { cls: "bg-primary/10 text-primary",     Icon: CheckCheck  },
    Adjusted: { cls: "bg-amber-500/10 text-amber-600", Icon: MinusCircle },
    Rejected: { cls: "bg-error/10 text-error",         Icon: XCircle     },
    Pending:  { cls: "bg-secondary-container/50 text-on-secondary-container", Icon: Clock },
  }[s];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${cfg.cls}`}>
      <cfg.Icon className="w-2.5 h-2.5" />
      {s}
    </span>
  );
}

// ─── HR Note Banner ───────────────────────────────────────────────────────────

function HRNoteBanner({ note }: { note: string }) {
  return (
    <div className="flex gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/15">
      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="font-headline font-semibold text-xs text-primary mb-0.5 uppercase tracking-wider">
          HR Note
        </p>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed">{note}</p>
      </div>
    </div>
  );
}

// ─── Line Item Row ────────────────────────────────────────────────────────────
// masterRejected=true: override all child rows to show Rejected + RM 0.00
// regardless of individual data (Cascading Rejection rule).

function LineItemRow({
  item,
  masterRejected,
  masterPending,
}: {
  item: LineItem;
  masterRejected: boolean;
  masterPending: boolean;
}) {
  const effectiveStatus: LineItem["lineStatus"] = masterPending ? "Pending" : masterRejected ? "Rejected" : item.lineStatus;
  const effectiveApproved = (masterPending || masterRejected) ? 0 : item.approved;

  const isRejected = effectiveStatus === "Rejected";
  const isAdjusted = effectiveStatus === "Adjusted";
  const isPending  = effectiveStatus === "Pending";
  const isDeducted = isRejected || isAdjusted;

  const rowBg      = isRejected ? "bg-error/5 border-error/15"
                   : isAdjusted ? "bg-amber-500/5 border-amber-500/15"
                   : isPending  ? "bg-secondary-container/20 border-outline-variant/10 opacity-80"
                   : "bg-surface-container-lowest border-outline-variant/10";

  const amountColor = isRejected ? "text-error"
                    : isAdjusted ? "text-amber-600"
                    : isPending  ? "text-on-surface-variant font-medium"
                    : "text-primary";

  return (
    <div className={`rounded-xl border p-3 ${rowBg}`}>
      {/* Row header: category + receipt ref tag + mini badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-headline font-semibold text-sm text-on-surface">
              {item.category}
            </p>
            <span className="font-mono text-[10px] text-on-surface-variant/60 bg-surface-container px-1.5 py-0.5 rounded">
              {item.receiptRef}
            </span>
          </div>
        </div>
        <LineStatusBadge s={effectiveStatus} />
      </div>

      {/* Requested vs Approved amounts */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-on-surface-variant">
          {isDeducted ? (
            <>Requested: <del className="opacity-60">{fmt(item.requested)}</del></>
          ) : (
            isPending ? "Requested:" : <span className="opacity-70">{fmt(item.requested)}</span>
          )}
        </span>
        <span className={`font-headline font-bold text-sm tabular-nums ${amountColor}`}>
          {isPending ? fmt(item.requested) : fmt(effectiveApproved)}
        </span>
      </div>

      {/* Audit Note box — shown when there are deduction reasons */}
      {item.adjustments.length > 0 && (
        <div className="mt-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1.5">
            Audit Note
          </p>
          <ul className="space-y-1">
            {item.adjustments.map((adj, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <span className="font-mono text-[10px] text-amber-600/80 uppercase mr-1">
                    [{adj.code}]
                  </span>
                  {adj.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── A4 HTML Claim Form Modal ─────────────────────────────────────────────────

function ClaimFormModal({
  claim,
  effectiveStatus,
  totalRequested,
  totalApproved,
  masterRejected,
  masterPending,
  onClose,
}: {
  claim: HistoryClaim;
  effectiveStatus: ClaimStatus;
  totalRequested: number;
  totalApproved: number;
  masterRejected: boolean;
  masterPending: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalDeducted = totalRequested - totalApproved;

  const statusChip = {
    Approved:             "bg-green-100 text-green-700",
    "Partially Approved": "bg-amber-100 text-amber-700",
    Rejected:             "bg-red-100 text-red-700",
    Paid:                 "bg-green-100 text-green-700",
    Pending:              "bg-gray-100 text-gray-600",
  }[effectiveStatus];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm overflow-auto"
      onClick={onClose}
    >
      <style>{`
        .a4-modal-zoom { zoom: 1; }
        @media (max-width: 850px) {
          .a4-modal-zoom { zoom: calc((100vw - 32px) / 794); }
        }
      `}</style>

      {/* High-visibility fixed close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 md:top-8 md:right-8 z-[200] p-3 bg-gray-900/60 hover:bg-gray-900/90 text-white rounded-full shadow-2xl backdrop-blur transition-all active:scale-95 border border-white/10"
        aria-label="Close preview"
      >
        <X className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Scrollable canvas region */}
      <div className="min-h-full w-full flex justify-center p-4 md:p-12 pb-24 touch-pan-x touch-pan-y">
        {/* A4 Physical Paper */}
        <div
          className="a4-modal-zoom bg-white rounded-sm shadow-2xl shrink-0 border border-gray-200/50"
          style={{ width: "794px", minHeight: "1123px", fontFamily: "sans-serif" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-12 md:p-16 text-gray-900" style={{ fontSize: "12px" }}>
            {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-gray-800 pb-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">R</span>
                </div>
                <span className="font-bold text-xl text-gray-900 tracking-tight">Reclaim</span>
              </div>
              <p className="text-gray-500 text-xs">Automated Reimbursement Management System</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-base text-gray-900">EXPENSE CLAIM FORM</p>
              <p className="text-gray-500 font-mono text-xs">{claim.id}</p>
              <p className="text-gray-500 text-xs mt-1">Date: {claim.date}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${statusChip}`}>
                {effectiveStatus}
              </span>
            </div>
          </div>

          {/* Employee Details */}
          <section className="mb-8">
            <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">
              Employee Information
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {[
                ["Full Name",   claim.employee.name     || "—"],
                ["Employee ID", claim.employee.id       || "—"],
                ["Department",  claim.employee.department || "—"],
                ["Position",    claim.employee.position || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <span className="text-gray-500 w-28 shrink-0">{label}:</span>
                  <span className="font-semibold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Claim Context */}
          <section className="mb-8">
            <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">
              Claim Context
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">Purpose:</span>
                <span className="font-semibold">{claim.claimContext.purpose}</span>
              </div>
              {claim.claimContext.destination && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28 shrink-0">Destination:</span>
                  <span className="font-semibold">{claim.claimContext.destination}</span>
                </div>
              )}
              {claim.claimContext.departurDate && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28 shrink-0">Departure:</span>
                  <span className="font-semibold">{claim.claimContext.departurDate}</span>
                </div>
              )}
              {claim.claimContext.arrivalDate && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28 shrink-0">Arrival:</span>
                  <span className="font-semibold">{claim.claimContext.arrivalDate}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">Overseas:</span>
                <span className="font-semibold">{claim.claimContext.overseas ? "Yes" : "No"}</span>
              </div>
            </div>
          </section>

          {/* Line Items Table */}
          <section className="mb-8">
            <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">
              Expense Line Items ({claim.lineItems.length} Receipts)
            </h3>
            <table className="w-full border-collapse" style={{ fontSize: "12px" }}>
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider">
                  <th className="text-left py-2 px-3 border border-gray-200 font-semibold w-16">Ref</th>
                  <th className="text-left py-2 px-3 border border-gray-200 font-semibold">Category / Audit Notes</th>
                  <th className="text-right py-2 px-3 border border-gray-200 font-semibold w-28">Requested (RM)</th>
                  <th className="text-right py-2 px-3 border border-gray-200 font-semibold w-28">Approved (RM)</th>
                  <th className="text-center py-2 px-3 border border-gray-200 font-semibold w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {claim.lineItems.map((item, i) => {
                  const effStatus   = masterPending ? "Pending" : masterRejected ? "Rejected" : item.lineStatus;
                  const effApproved = (masterPending || masterRejected) ? 0 : item.approved;
                  return (
                    <tr key={i} className={
                      effStatus === "Rejected" ? "bg-red-50"
                    : effStatus === "Adjusted" ? "bg-amber-50"
                    : effStatus === "Pending"  ? "bg-gray-50"
                    : "bg-white"
                    }>
                      <td className="py-2 px-3 border border-gray-200 font-mono text-[10px] text-gray-500">
                        {item.receiptRef}
                      </td>
                      <td className="py-2 px-3 border border-gray-200">
                        {item.category}
                        {item.adjustments.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.adjustments.map((adj, j) => (
                              <div key={j} className="text-[10px] text-gray-500 flex gap-1">
                                <span className="text-gray-400">↳</span>
                                <span>[{adj.code}] {adj.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 border border-gray-200 text-right tabular-nums">
                        {item.requested.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 border border-gray-200 text-right tabular-nums font-semibold">
                        {effApproved.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 border border-gray-200 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          effStatus === "Approved" ? "bg-green-100 text-green-700"
                        : effStatus === "Adjusted" ? "bg-amber-100 text-amber-700"
                        : effStatus === "Pending"  ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-700"
                        }`}>
                          {effStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={2} className="py-2 px-3 border border-gray-200 text-right text-gray-700">Total Requested</td>
                  <td className="py-2 px-3 border border-gray-200 text-right tabular-nums">{totalRequested.toFixed(2)}</td>
                  <td className="py-2 px-3 border border-gray-200 text-right tabular-nums text-gray-900">{totalApproved.toFixed(2)}</td>
                  <td className="py-2 px-3 border border-gray-200" />
                </tr>
                {totalDeducted > 0 && (
                  <tr className="bg-red-50">
                    <td colSpan={2} className="py-2 px-3 border border-gray-200 text-right text-red-700 font-semibold">Total Deduction</td>
                    <td className="py-2 px-3 border border-gray-200" />
                    <td className="py-2 px-3 border border-gray-200 text-right tabular-nums text-red-700 font-bold">({totalDeducted.toFixed(2)})</td>
                    <td className="py-2 px-3 border border-gray-200" />
                  </tr>
                )}
                <tr className="bg-indigo-50">
                  <td colSpan={2} className="py-3 px-3 border border-gray-200 text-right text-indigo-700 font-bold uppercase tracking-wide">NET APPROVED</td>
                  <td className="py-3 px-3 border border-gray-200" />
                  <td className="py-3 px-3 border border-gray-200 text-right tabular-nums text-indigo-700 font-extrabold text-base">{totalApproved.toFixed(2)}</td>
                  <td className="py-3 px-3 border border-gray-200" />
                </tr>
              </tfoot>
            </table>
          </section>

          {/* HR Comments */}
          {claim.hrNote && (
            <section className="mb-8">
              <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
                HR Comments
              </h3>
              <p className="text-gray-700 leading-relaxed italic">&ldquo;{claim.hrNote}&rdquo;</p>
            </section>
          )}

          {/* Signature Block */}
          <div className="mt-12 grid grid-cols-2 gap-12 border-t border-gray-200 pt-6">
            {["Employee Signature", "HR Authorisation"].map((label) => (
              <div key={label}>
                <div className="h-12 border-b border-gray-400 mb-2" />
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">Date: ___________</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between text-gray-400 text-[10px]">
            <span>Generated by Reclaim v1.0 · {claim.id}</span>
            <span>CONFIDENTIAL — Internal Use Only</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── Main ClaimSidebar Component ──────────────────────────────────────────────

export default function ClaimSidebar({ claim, onClose }: ClaimSidebarProps) {
  const [isVisible,     setIsVisible]     = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    if (claim) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      setShowFormModal(false);
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [claim]);

  const openFormModal  = useCallback(() => setShowFormModal(true),  []);
  const closeFormModal = useCallback(() => setShowFormModal(false), []);

  // ── Derived values (cached) ─────────────────────────────────────────────────
  const effectiveStatus = useMemo(
    () => (claim ? deriveStatus(claim) : ("Pending" as ClaimStatus)),
    [claim]
  );
  const items = useMemo(() => claim?.lineItems ?? [], [claim]);
  const totalRequested = useMemo(() => items.reduce((s, i) => s + i.requested, 0), [items]);
  const totalApproved  = useMemo(() => {
    if (effectiveStatus === "Rejected") return 0;
    return items.reduce((s, i) => s + i.approved, 0);
  }, [items, effectiveStatus]);
  const totalDeducted  = totalRequested - totalApproved;

  const masterRejected = effectiveStatus === "Rejected";
  const isPending      = effectiveStatus === "Pending";
  const isPartial      = effectiveStatus === "Partially Approved";

  if (!claim && !isVisible) return null;

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className={`fixed inset-0 bg-surface/40 backdrop-blur-sm z-60 transition-opacity duration-300 ${
          claim ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer (max-w-2xl on desktop) ── */}
      <div
        className={`fixed top-0 right-0 h-dvh w-full md:max-w-2xl bg-surface z-70 shadow-[-8px_0_40px_rgba(0,0,0,0.08)] transform transition-transform duration-300 ease-in-out flex flex-col ${
          claim ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10 shrink-0">
          <div>
            <h2 className="font-headline font-bold text-lg text-on-surface">Claim Details</h2>
            <p className="font-body text-xs text-on-surface-variant">{claim?.id}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close claim details"
            className="p-2 bg-surface-container rounded-full text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        {claim && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

            {/* ① CONDITIONAL HEADER ─────────────────────────────────────── */}
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">

              {/* PENDING: show requested only — no approved field */}
              {isPending && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                      Amount Submitted
                    </p>
                    <span className="font-headline font-extrabold text-3xl text-on-surface">
                      {claim.amount}
                    </span>
                  </div>
                  <StatusBadge status={effectiveStatus} />
                </div>
              )}

              {/* REJECTED: requested | RM 0.00 approved */}
              {masterRejected && (
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                      Amount Requested
                    </p>
                    <span className="font-headline font-extrabold text-3xl text-on-surface">
                      {claim.amount}
                    </span>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                      Total Approved
                    </p>
                    <span className="font-headline font-extrabold text-3xl text-error">RM 0.00</span>
                    <div className="mt-2"><StatusBadge status={effectiveStatus} /></div>
                  </div>
                </div>
              )}

              {/* PARTIALLY APPROVED: approved primary | requested strikethrough */}
              {isPartial && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                        Total Approved
                      </p>
                      <span className="font-headline font-extrabold text-3xl text-primary">
                        {fmt(totalApproved)}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                        Amount Requested
                      </p>
                      <del className="font-headline font-semibold text-xl text-on-surface-variant/50">
                        {claim.amount}
                      </del>
                    </div>
                  </div>
                  <div className="mt-3"><StatusBadge status={effectiveStatus} /></div>
                </>
              )}

              {/* APPROVED / PAID */}
              {!isPending && !masterRejected && !isPartial && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                      Total Approved
                    </p>
                    <span className="font-headline font-extrabold text-3xl text-on-surface">
                      {fmt(totalApproved)}
                    </span>
                  </div>
                  <StatusBadge status={effectiveStatus} />
                </div>
              )}
            </div>

            {/* ② HR NOTE ─────────────────────────────────────────────────── */}
            {claim.hrNote && <HRNoteBanner note={claim.hrNote} />}

            {/* CONTEXT META ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-3 text-xs text-on-surface-variant">
              {claim.employee.department && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {claim.employee.department}
                </span>
              )}
              {claim.claimContext.destination && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {claim.claimContext.destination}
                </span>
              )}
              {claim.claimContext.departurDate && (
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {claim.claimContext.departurDate}
                  {claim.claimContext.arrivalDate && ` → ${claim.claimContext.arrivalDate}`}
                </span>
              )}
            </div>

            {/* ③ AUDIT TABLE ──────────────────────────────────────────────── */}
            <div>
              <h4 className="font-headline font-semibold text-sm text-on-surface mb-3">
                Financial Breakdown
                <span className="ml-2 text-xs font-normal text-on-surface-variant/60">
                  ({items.length} receipt{items.length !== 1 ? "s" : ""})
                </span>
              </h4>

              <div className="space-y-2.5">
                {items.map((item, i) => (
                  <LineItemRow key={i} item={item} masterRejected={masterRejected} masterPending={isPending} />
                ))}
              </div>

              {/* Footer totals */}
              <div className="mt-3 rounded-xl overflow-hidden border border-outline-variant/10">
                <div className="flex items-center justify-between px-3 py-2.5 bg-surface-container">
                  <span className="font-body text-sm font-semibold text-on-surface-variant">Total Requested</span>
                  <span className="font-headline font-bold text-sm text-on-surface tabular-nums">
                    {fmt(totalRequested)}
                  </span>
                </div>
                {totalDeducted > 0 && (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-error/5 border-t border-error/10">
                    <span className="font-body text-sm font-semibold text-error/80">Total Deduction</span>
                    <span className="font-headline font-bold text-sm text-error tabular-nums">
                      − {fmt(totalDeducted)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-3 bg-primary/5 border-t border-primary/10">
                  <span className="font-body text-sm font-bold text-primary uppercase tracking-wide">
                    Net Approved
                  </span>
                  <span className="font-headline font-extrabold text-base text-primary tabular-nums">
                    {fmt(totalApproved)}
                  </span>
                </div>
              </div>
            </div>

            {/* ④ TIMELINE ─────────────────────────────────────────────────── */}
            <div>
              <h4 className="font-headline font-semibold text-sm text-on-surface mb-4">Timeline</h4>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-outline-variant/20 before:to-transparent">

                {/* Submitted */}
                <div className="relative flex items-start gap-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border border-surface bg-primary/10 shadow shrink-0 z-10">
                    <CheckCircle2 className="w-4 h-4 fill-primary text-surface" />
                  </div>
                  <div className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-on-surface">Submitted</span>
                      <time className="font-mono text-xs text-on-surface-variant">{claim.date}</time>
                    </div>
                    <p className="text-sm text-on-surface-variant">Via Employee App</p>
                  </div>
                </div>

                {/* AI Validation */}
                <div className="relative flex items-start gap-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border border-surface bg-primary/10 shadow shrink-0 z-10">
                    {isPending
                      ? <Clock className="w-4 h-4 text-primary" />
                      : <Sparkles className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-on-surface">AI Validation</span>
                      {!isPending && (
                        <time className="font-mono text-xs text-on-surface-variant">{claim.date}</time>
                      )}
                    </div>
                    <p className="text-sm text-on-surface-variant">
                      {isPending
                        ? "Processing receipt & policy check…"
                        : `${items.length} receipt${items.length !== 1 ? "s" : ""} extracted. Policy check completed.`}
                    </p>
                  </div>
                </div>

                {/* HR Review — only for non-pending */}
                {!isPending && (
                  <div className="relative flex items-start gap-4">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border border-surface shadow shrink-0 z-10 ${
                      masterRejected ? "bg-error/10" : isPartial ? "bg-amber-500/10" : "bg-primary/10"
                    }`}>
                      {masterRejected
                        ? <AlertCircle className="w-4 h-4 fill-error text-surface" />
                        : isPartial
                        ? <AlertTriangle className="w-4 h-4 fill-amber-500 text-surface" />
                        : <CheckCircle2 className="w-4 h-4 fill-primary text-surface" />}
                    </div>
                    <div className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-on-surface">
                          {masterRejected ? "HR Rejected" : isPartial ? "HR Partially Approved" : "HR Approved"}
                        </span>
                        <time className="font-mono text-xs text-on-surface-variant">{claim.date}</time>
                      </div>
                      <p className="text-sm text-on-surface-variant">
                        {masterRejected
                          ? "Claim rejected — does not meet reimbursement policy."
                          : isPartial
                          ? `Adjustments made based on company policy. ${fmt(totalApproved)} of ${claim.amount} approved.`
                          : `Fully approved. ${fmt(totalApproved)} queued for processing.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Paid Disbursed — only if Paid */}
                {effectiveStatus === "Paid" && (
                  <div className="relative flex items-start gap-4">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-surface shadow shrink-0 z-10 bg-tertiary/10">
                      <CheckCircle2 className="w-4 h-4 fill-tertiary text-surface" />
                    </div>
                    <div className="w-full p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-on-surface">Payment Disbursed</span>
                        <time className="font-mono text-xs text-on-surface-variant">Nov 15, 2023</time>
                      </div>
                      <p className="text-sm text-on-surface-variant">Claim amount has been deposited to your salary account.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ⑤ DOCUMENT ACTIONS — Official Form Only ─────────────────────── */}
            <div>
              <h4 className="font-headline font-semibold text-sm text-on-surface mb-3">Documents</h4>
              <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-headline font-semibold text-sm text-on-surface">Official Claim Form</p>
                    <p className="font-body text-xs text-on-surface-variant">
                      {claim.id.replace("#", "")}_claim_form.pdf
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Primary: opens A4 HTML modal */}
                  <button
                    id={`view-form-${claim.id}`}
                    onClick={openFormModal}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-on-primary font-body font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Official Claim Form
                  </button>
                  {/* Secondary: download PDF via backend URL */}
                  <a
                    id={`download-pdf-${claim.id}`}
                    href={claim.pdfDownloadUrl}
                    download
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant font-body font-semibold text-sm hover:bg-surface-container transition-colors active:scale-95"
                    aria-label="Download Official Form (PDF)"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </a>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* A4 Claim Form Modal */}
      {showFormModal && claim && (
        <ClaimFormModal
          claim={claim}
          effectiveStatus={effectiveStatus}
          totalRequested={totalRequested}
          totalApproved={totalApproved}
          masterRejected={masterRejected}
          masterPending={isPending}
          onClose={closeFormModal}
        />
      )}
    </>
  );
}
