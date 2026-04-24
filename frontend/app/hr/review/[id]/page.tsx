"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { ArrowLeft, AlertTriangle, Clock, ShieldCheck, ShieldX, ChevronDown, ZoomIn, Pencil, FileText, ExternalLink, Download, X } from "lucide-react";
import { ClaimBundle, LineItem, MOCK_BUNDLES } from "../../hr_components/mockData";
import { CheckCircle2, LayoutDashboard } from "lucide-react";
import { SuccessModal } from "../../hr_components/SuccessModal";
import { getHRClaimBundle, updateReimbursementStatus } from "@/lib/actions/hr";


type Decision = "approve_full" | "approve_adjusted" | "reject" | null;

const STATUS_CHIP: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  PARTIAL_APPROVE: "bg-amber-50 text-amber-800",
  PENDING: "bg-surface-container text-on-surface-variant",
};
const CAT: Record<string, string> = { meals: "Meals", transportation: "Transport", accommodation: "Stay", others: "Others" };
const fmt = (n: number) => `MYR ${n.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;

function Card({ title, children, right }: { title: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl shadow-[0_4px_24px_-8px_rgba(44,47,49,0.08)] overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between">
        <h3 className="font-headline font-bold text-base text-on-surface">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold font-headline text-on-surface-variant uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-on-surface">{value}</p>
    </div>
  );
}

function ClaimFormModal({
  bundle,
  onClose,
}: {
  bundle: ClaimBundle;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalRequested = bundle.totals.total_requested;
  const totalApproved = bundle.totals.net_approved;
  const totalDeducted = bundle.totals.total_deduction;
  const effectiveStatus = bundle.overall_judgment.replace("_", " ");

  const statusChip: Record<string, string> = {
    APPROVED:             "bg-green-100 text-green-700",
    PARTIAL_APPROVE: "bg-amber-100 text-amber-700",
    REJECTED:             "bg-red-100 text-red-700",
    PENDING:              "bg-gray-100 text-gray-600",
  };
  const statusClass = statusChip[bundle.overall_judgment] || "bg-gray-100 text-gray-600";

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
              <p className="text-gray-500 font-mono text-xs">{bundle.id}</p>
              <p className="text-gray-500 text-xs mt-1">Date: {new Date(bundle.submitted_at).toLocaleDateString()}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${statusClass}`}>
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
                ["Full Name",   bundle.employee.name     || "—"],
                ["Employee ID", bundle.employee.employee_no       || "—"],
                ["Department",  bundle.employee.department || "—"],
                ["Position",    bundle.employee.position || "—"],
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
                <span className="font-semibold">{bundle.travel_purpose}</span>
              </div>
              {bundle.travel_destination && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28 shrink-0">Destination:</span>
                  <span className="font-semibold">{bundle.travel_destination}</span>
                </div>
              )}
              {bundle.departure_date && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28 shrink-0">Departure:</span>
                  <span className="font-semibold">{bundle.departure_date}</span>
                </div>
              )}
              {bundle.arrival_date && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-28 shrink-0">Arrival:</span>
                  <span className="font-semibold">{bundle.arrival_date}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">Overseas:</span>
                <span className="font-semibold">{bundle.is_overseas ? "Yes" : "No"}</span>
              </div>
            </div>
          </section>

          {/* Line Items Table */}
          <section className="mb-8">
            <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">
              Expense Line Items ({bundle.line_items.length} Receipts)
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
                {bundle.line_items.map((item, i) => {
                  return (
                    <tr key={i} className={
                      item.status === "REJECTED" ? "bg-red-50"
                    : item.status === "PARTIAL_APPROVE" ? "bg-amber-50"
                    : item.status === "PENDING"  ? "bg-gray-50"
                    : "bg-white"
                    }>
                      <td className="py-2 px-3 border border-gray-200 font-mono text-[10px] text-gray-500">
                        {item.document_id.slice(0, 8)}
                      </td>
                      <td className="py-2 px-3 border border-gray-200">
                        {item.category} - {item.description}
                        {item.audit_notes.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.audit_notes.map((adj, j) => (
                              <div key={j} className="text-[10px] text-gray-500 flex gap-1">
                                <span className="text-gray-400">↳</span>
                                <span>{adj.tag} {adj.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 border border-gray-200 text-right tabular-nums">
                        {item.requested_amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 border border-gray-200 text-right tabular-nums font-semibold">
                        {item.approved_amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 border border-gray-200 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === "APPROVED" ? "bg-green-100 text-green-700"
                        : item.status === "PARTIAL_APPROVE" ? "bg-amber-100 text-amber-700"
                        : item.status === "PENDING"  ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-700"
                        }`}>
                          {item.status.replace("_", " ")}
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
            <span>Generated by Reclaim v1.0 · {bundle.id}</span>
            <span>CONFIDENTIAL — Internal Use Only</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [bundle, setBundle] = useState<ClaimBundle | undefined | null>(undefined); // undefined = loading
  const [approvals, setApprovals] = useState<Record<string, number>>({});
  const [decision, setDecision] = useState<Decision>(null);
  const [note, setNote] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fallback = MOCK_BUNDLES[id];
    getHRClaimBundle(id)
      .then((b) => {
        const resolved = b ?? fallback ?? null;
        setBundle(resolved);
        if (resolved) {
          setApprovals(Object.fromEntries(
            resolved.line_items.map(li => [li.document_id, li.approved_amount])
          ));
        }
      })
      .catch(() => {
        setBundle(fallback ?? null);
        if (fallback) {
          setApprovals(Object.fromEntries(
            fallback.line_items.map(li => [li.document_id, li.approved_amount])
          ));
        }
      });
  }, [id]);

  if (bundle === undefined) return (
    <div className="flex items-center justify-center min-h-[60vh] gap-3 text-on-surface-variant">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Loading claim...</span>
    </div>
  );

  if (!bundle) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-on-surface-variant">No bundle found for <code className="font-mono">{id}</code></p>
      <button onClick={() => router.push("/hr/dashboard")} className="px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold">Back to Dashboard</button>
    </div>
  );

  const pct = Math.round(bundle.confidence * 100);
  const netHR = Object.values(approvals).reduce((a, b) => a + b, 0);
  const allFlags = bundle.line_items.flatMap(li => li.audit_notes.map(n => ({ ...n, receipt: li.description })));

  function preset(mode: "full" | "ai" | "zero") {
    setApprovals(Object.fromEntries(bundle!.line_items.map(li => [
      li.document_id,
      mode === "full" ? li.requested_amount : mode === "ai" ? li.approved_amount : 0,
    ])));
  }

  async function submit() {
    if (!decision) return;
    setSubmitting(true);
    setSubmitError(null);
    const status = decision === "reject" ? "REJECTED" : "APPROVED";
    const res = await updateReimbursementStatus(bundle!.id, status);
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(res.error ?? "Failed to update status.");
      return;
    }
    setShowSuccessModal(true);
    router.push("/hr/dashboard");
  }

  return (
    <div className="relative min-h-full p-6 md:p-10 pb-32 lg:pb-10">
      <div className="mb-8">
        <button onClick={() => router.push("/hr/dashboard")} className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary mb-4 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Back to Dashboard
        </button>
        <h2 className="font-headline font-extrabold text-on-background" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
          Review Claim <span className="font-mono text-primary/60 text-xl">{bundle.id}</span>
        </h2>
        <p className="text-sm text-on-surface-variant mt-1" suppressHydrationWarning>
  Submitted {new Date(bundle.submitted_at).toLocaleString("en-MY")} 
</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 min-w-0">

        {/* ═══ LEFT ═══ */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Employee Identity */}
          <Card title="Employee Identity">
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {([["Entity", bundle.employee.entity], ["Employee Name", bundle.employee.name], ["Employee No.", bundle.employee.employee_no],
                ["Position", bundle.employee.position], ["Department", bundle.employee.department], ["Location", bundle.employee.location]] as [string,string][])
                .map(([l, v]) => <Field key={l} label={l} value={v} />)}
            </div>
          </Card>

          {/* Claim Context */}
          <Card title="Claim Context">
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {([["Destination", bundle.travel_destination], ["Purpose", bundle.travel_purpose],
                ["Departure", bundle.departure_date], ["Arrival", bundle.arrival_date],
                ["Overseas Travel", bundle.is_overseas ? "Yes" : "No"]] as [string,string][])
                .map(([l, v]) => <Field key={l} label={l} value={v} />)}
            </div>
          </Card>

          {/* Official Document */}
          <Card title="Official Document">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-headline font-semibold text-sm text-on-surface">Official Claim Form</p>
                  <p className="font-body text-xs text-on-surface-variant">
                    {bundle.id}_claim_form.pdf
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  id={`view-form-${bundle.id}`}
                  onClick={() => setShowFormModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-on-primary font-body font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Official Claim Form
                </button>
                <a
                  id={`download-pdf-${bundle.id}`}
                  href={`/api/v1/reimbursements/${bundle.id}/pdf`}
                  download
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant font-body font-semibold text-sm hover:bg-surface-container transition-colors active:scale-[0.98] cursor-pointer"
                  aria-label="Download Official Form (PDF)"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download PDF</span>
                </a>
              </div>
            </div>
          </Card>

          {/* Financial Breakdown */}
          <Card title={<>Financial Breakdown <span className="ml-2 text-xs font-label bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">{bundle.line_items.length} receipts</span></>}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60">
                    {["#", "Date", "Cat.", "Description", "Requested", "AI Approved", "Status"].map(h => (
                      <th key={h} className="py-3 px-3 text-[10px] font-semibold font-headline text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {bundle.line_items.map((li, idx) => (
                    <tr key={li.document_id} className="hover:bg-surface-container-low/30 transition-colors align-top">
                      <td className="py-3 px-3 text-on-surface-variant">
                        {li.receipt_url
                          ? <button onClick={() => setLightbox(li.receipt_url!)} className="flex items-center gap-1 text-primary hover:underline text-xs"><ZoomIn className="w-3 h-3" />{idx + 1}</button>
                          : <span className="text-xs">{idx + 1}</span>}
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap text-xs">{li.date}</td>
                      <td className="py-3 px-3"><span className="text-xs bg-surface-container px-1.5 py-0.5 rounded-full text-on-surface-variant">{CAT[li.category]}</span></td>
                      <td className="py-3 px-3 max-w-[160px]">
                        <p className="text-on-surface text-xs truncate">{li.description}</p>
                        {li.human_edited && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1">
                            ⚠ EDITED · OCR: {fmt(li.ocr_amount ?? 0)}
                          </span>
                        )}
                        {li.audit_notes.map((n, i) => (
                          <p key={i} className="text-[10px] font-mono font-bold text-error-dim mt-0.5">{n.tag}</p>
                        ))}
                      </td>
                      <td className="py-3 px-3 font-semibold tabular-nums whitespace-nowrap text-xs">{fmt(li.requested_amount)}</td>
                      <td className="py-3 px-3 font-semibold tabular-nums text-emerald-700 whitespace-nowrap text-xs">{fmt(li.approved_amount)}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_CHIP[li.status]}`}>{li.status.replace("_", " ")}</span>
                        {li.deduction_amount > 0 && <p className="text-[10px] text-error-dim mt-0.5">-{fmt(li.deduction_amount)}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Policy Flags */}
          {allFlags.length > 0 && (
            <Card title={
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-error-dim" strokeWidth={2.5} />
                Policy Flags
                <span className="text-xs bg-error/10 text-error-dim px-2 py-0.5 rounded-full font-semibold">{allFlags.length}</span>
              </span>
            }>
              <div className="p-6 flex flex-col gap-3">
                {allFlags.map((f, i) => (
                  <div key={i} className="rounded-xl p-4 bg-error/5 border border-error/15">
                    <p className="text-[10px] font-mono font-bold text-error-dim mb-1">{f.tag}</p>
                    <p className="text-sm text-on-surface leading-relaxed">{f.message}</p>
                    <p className="text-[11px] text-on-surface-variant mt-1">Receipt: {f.receipt}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Audit Trail */}
          <Card title={
            <button onClick={() => setAuditOpen(o => !o)} className="w-full flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 font-headline font-bold text-base text-on-surface">
                <Clock className="w-4 h-4 text-on-surface-variant" strokeWidth={2} /> Audit Trail
                <span className="text-xs bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">{bundle.audit_log.length}</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${auditOpen ? "rotate-180" : ""}`} />
            </button>
          }>
            <div className={`overflow-hidden transition-all duration-300 ${auditOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="px-6 pb-6 ml-2 pl-6 border-l-2 border-outline-variant/20 flex flex-col gap-4">
                {bundle.audit_log.map(e => (
                  <div key={e.id} className="relative">
                    <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-surface-container-lowest border-2 border-primary/40" />
                    <p className="text-xs text-on-surface-variant">{e.timestamp}</p>
                    <p className="text-sm text-on-surface"><span className="font-semibold">{e.actor}</span> — {e.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* ═══ RIGHT ═══ */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:h-fit">

          {/* AI Analysis */}
          <Card title="AI Analysis">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-semibold font-headline text-on-surface-variant uppercase tracking-wider">Confidence</span>
                <span className={`text-2xl font-extrabold tabular-nums ${pct >= 85 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-error-dim"}`}>{pct}%</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CHIP[bundle.overall_judgment]}`}>{bundle.overall_judgment.replace("_", " ")}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container mb-4 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${pct >= 85 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-error"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-sm text-on-surface leading-relaxed">{bundle.summary}</p>
            </div>
          </Card>

          {/* Financial Totals */}
          <Card title="Financial Summary">
            <div className="p-6 flex flex-col gap-3">
              {([["Total Requested", fmt(bundle.totals.total_requested), "text-on-surface"],
                ["AI Deduction", `-${fmt(bundle.totals.total_deduction)}`, "text-error-dim"],
                ["AI Net Approved", fmt(bundle.totals.net_approved), "text-emerald-700"]] as [string, string, string][])
                .map(([l, v, cls]) => (
                  <div key={l} className="flex items-center justify-between">
                    <p className="text-sm text-on-surface-variant">{l}</p>
                    <p className={`text-sm tabular-nums font-semibold ${cls}`}>{v}</p>
                  </div>
                ))}
              <div className="border-t border-outline-variant/15 pt-3 flex items-center justify-between">
                <p className="text-sm font-bold text-on-surface">HR Approved Total</p>
                <p className="text-base font-extrabold tabular-nums text-primary">{fmt(netHR)}</p>
              </div>
            </div>
          </Card>

          {/* Per-Receipt Inputs */}
          <Card
            title="Per-Receipt Decision"
            right={
              <div className="flex gap-1">
                {(["full", "ai"] as const).map(m => (
                  <button key={m} onClick={() => preset(m)} className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors">
                    {m === "full" ? "Max" : "AI"}
                  </button>
                ))}
              </div>
            }
          >
            <div className="p-4 flex flex-col gap-3">
              {bundle.line_items.map((li, idx) => (
                <div key={li.document_id} className="flex items-center gap-3">
                  <span className="text-xs text-on-surface-variant w-5 shrink-0">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-on-surface truncate">{li.description}</p>
                    <p className="text-[10px] text-on-surface-variant">Req: {fmt(li.requested_amount)}</p>
                  </div>
                  <div className="flex items-center bg-surface-container-low rounded-lg ring-1 ring-outline-variant/20 focus-within:ring-primary/40 px-2 py-1.5 w-28 shrink-0 transition-all">
                    <span className="text-[10px] text-on-surface-variant mr-1">MYR</span>
                    <input
                      type="number" min={0} max={li.requested_amount}
                      value={approvals[li.document_id] ?? 0}
                      onChange={e => setApprovals(p => ({ ...p, [li.document_id]: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-transparent text-xs font-semibold text-on-surface outline-none tabular-nums"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Decision */}
          <Card title="Your Decision">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {([
                  ["approve_full", ShieldCheck, "Force Full Approval", `Approve full ${fmt(bundle.totals.total_requested)}`, "emerald", "full"],
                  ["approve_adjusted", Pencil, "Approve Adjusted Amount", `HR total: ${fmt(netHR)}`, "amber", "ai"],
                  ["reject", ShieldX, "Confirm Rejection", "Reject entire claim bundle", "error", "zero"],
                ] as const).map(([val, Icon, label, sub, color, p]) => {
                  const active = decision === val;
                  const s = {
                    emerald: active ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200" : "border-outline-variant/20 text-on-surface-variant hover:border-emerald-300 hover:text-emerald-700",
                    amber: active ? "bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-200" : "border-outline-variant/20 text-on-surface-variant hover:border-amber-300 hover:text-amber-800",
                    error: active ? "bg-error/10 text-error-dim border-error/30 ring-1 ring-error/20" : "border-outline-variant/20 text-on-surface-variant hover:border-error/30 hover:text-error-dim",
                  };
                  return (
                    <button key={val} onClick={() => { setDecision(val); preset(p as "full" | "ai" | "zero"); }}
                      className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold font-headline transition-all active:scale-[0.98] cursor-pointer border text-left bg-surface-container-lowest ${s[color]}`}>
                      <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                      <div><p>{label}</p><p className="text-[11px] font-normal mt-0.5 opacity-70">{sub}</p></div>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-[10px] font-semibold font-headline text-on-surface-variant uppercase tracking-wider mb-2 block">
                  HR Note <span className="normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <textarea rows={3} placeholder="Add a note for the employee…" value={note} onChange={e => setNote(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none ring-1 ring-outline-variant/20 focus:ring-primary/40 resize-none transition-all" />
              </div>

              <button id="submit-review" onClick={submit} disabled={!decision || submitting}
                className={`w-full py-3 rounded-xl text-sm font-semibold font-headline transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${decision ? "bg-primary text-on-primary shadow-[0_4px_16px_rgba(70,71,211,0.25)] hover:bg-primary-dim cursor-pointer" : "bg-surface-container text-on-surface-variant/50 cursor-not-allowed"}`}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {decision === "approve_full" ? "Submit Full Approval" : decision === "approve_adjusted" ? "Submit Adjusted Approval" : decision === "reject" ? "Submit Rejection" : "Select a decision"}
              </button>
              {submitError && (
                <p className="text-xs text-error text-center font-body mt-1">{submitError}</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-6" onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="Receipt" className="w-full h-full object-contain" />
            <button onClick={() => setLightbox(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-inverse-surface/70 text-white flex items-center justify-center">✕</button>
          </div>
        </div>
      )}

      {showFormModal && (
        <ClaimFormModal
          bundle={bundle}
          onClose={() => setShowFormModal(false)}
        />
      )}

      {showSuccessModal && <SuccessModal decision={decision} id={bundle.id} />}
    </div>
  );
}
