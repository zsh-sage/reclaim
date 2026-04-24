"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Clock, ShieldCheck, ShieldX, ChevronDown, ZoomIn, CheckCircle2, FileText, ExternalLink, Download, X, Loader2 } from "lucide-react";
import { ClaimBundle, MOCK_BUNDLES } from "../../hr_components/mockData";

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

export default function ViewPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const bundle: ClaimBundle | undefined = MOCK_BUNDLES[id];

  const [hrDecision, setHrDecision] = useState<"confirm" | "flag" | null>(null);
  const [note, setNote] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!bundle) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-on-surface-variant">No bundle found for <code className="font-mono">{id}</code></p>
      <button onClick={() => router.push("/hr/dashboard")} className="px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold">Back to Dashboard</button>
    </div>
  );

  const pct = Math.round(bundle.confidence * 100);

  function submit() {
    // TODO: POST /api/hr/bundles/:id/confirm  |  /api/hr/bundles/:id/flag
    console.log("view payload", { id, action: hrDecision, note });
    router.push("/hr/dashboard");
  }

  return (
    <div className="relative min-h-full p-6 md:p-10 pb-32 lg:pb-10">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-emerald-500 opacity-[0.04] blur-[80px]" />
        <div className="absolute top-40 right-32 w-[260px] h-[260px] rounded-full bg-primary opacity-[0.04] blur-[64px]" />
      </div>

      <div className="relative z-10 mb-8">
        <button onClick={() => router.push("/hr/dashboard")} className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary mb-4 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="font-headline font-extrabold text-on-background" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
            Review AI Approval
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} /> Passed AI Review
          </span>
        </div>
        <p className="text-sm text-on-surface-variant mt-1">
          Claim <span className="font-mono font-semibold">{bundle.id}</span> · Submitted {new Date(bundle.submitted_at).toLocaleString("en-MY")} · <span className="text-emerald-600 font-semibold">{pct}% confidence</span>
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 min-w-0">

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

          {/* Claimant Form PDF */}
          <Card
            title={<span className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" strokeWidth={2} /> Claimant Submission Form</span>}
            right={
              <button className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary/8 text-primary hover:bg-primary/15 transition-colors">
                <Download className="w-3 h-3" strokeWidth={2.5} /> Download PDF
              </button>
            }
          >
            <div className="p-5">
              <div className="rounded-lg border border-outline-variant/20 bg-[#fafaf9] shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden font-[system-ui]">
                <div className="px-6 py-4 bg-surface-container-low/60 border-b border-outline-variant/15 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Reclaim Sdn. Bhd.</p>
                    <p className="text-sm font-bold text-on-surface mt-0.5">Employee Expense Claim Form</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-on-surface-variant">Claim No.</p>
                    <p className="text-xs font-mono font-bold text-primary">{bundle.id.toUpperCase()}</p>
                  </div>
                </div>
                <div className="px-6 pt-4 pb-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3 border-b border-dashed border-outline-variant/30 pb-1">Section A — Claimant Information</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    {([  
                      ["Full Name", bundle.employee.name],
                      ["Employee No.", bundle.employee.employee_no],
                      ["Position", bundle.employee.position],
                      ["Department", bundle.employee.department],
                      ["Location", bundle.employee.location],
                      ["Email", bundle.employee.email],
                    ] as [string, string][]).map(([l, v]) => (
                      <div key={l}>
                        <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">{l}</p>
                        <p className="text-xs font-medium text-on-surface border-b border-dotted border-outline-variant/40 pb-0.5 mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-6 pt-3 pb-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3 border-b border-dashed border-outline-variant/30 pb-1">Section B — Claim Details</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    {([
                      ["Travel Destination", bundle.travel_destination],
                      ["Purpose of Travel", bundle.travel_purpose],
                      ["Departure Date", bundle.departure_date],
                      ["Return Date", bundle.arrival_date],
                      ["Overseas Travel", bundle.is_overseas ? "Yes ✓" : "No"],
                      ["Total Amount Claimed", `MYR ${bundle.totals.total_requested.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`],
                    ] as [string, string][]).map(([l, v]) => (
                      <div key={l}>
                        <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">{l}</p>
                        <p className="text-xs font-medium text-on-surface border-b border-dotted border-outline-variant/40 pb-0.5 mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-6 py-3 border-t border-outline-variant/15 flex items-center justify-between bg-surface-container-low/30">
                  <div>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">Employee Signature</p>
                    <p className="text-xs font-medium text-on-surface mt-1 italic">{bundle.employee.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">Date Submitted</p>
                    <p className="text-xs font-medium text-on-surface mt-1">{new Date(bundle.submitted_at).toLocaleDateString("en-MY")}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Financial Breakdown */}
          <Card title={<>Financial Breakdown <span className="ml-2 text-xs font-label bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{bundle.line_items.length} receipts · All Passed</span></>}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60">
                    {["#", "Date", "Cat.", "Description", "Amount", "Status"].map(h => (
                      <th key={h} className="py-3 px-3 text-[10px] font-semibold font-headline text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {bundle.line_items.map((li, idx) => (
                    <tr key={li.document_id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="py-3 px-3 text-on-surface-variant">
                        {li.receipt_url
                          ? <button onClick={() => setLightbox(li.receipt_url!)} className="flex items-center gap-1 text-primary hover:underline text-xs"><ZoomIn className="w-3 h-3" />{idx + 1}</button>
                          : <span className="text-xs">{idx + 1}</span>}
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap text-xs">{li.date}</td>
                      <td className="py-3 px-3"><span className="text-xs bg-surface-container px-1.5 py-0.5 rounded-full text-on-surface-variant">{CAT[li.category]}</span></td>
                      <td className="py-3 px-3 text-on-surface text-xs">{li.description}</td>
                      <td className="py-3 px-3 font-semibold tabular-nums text-emerald-700 whitespace-nowrap text-xs">{fmt(li.approved_amount)}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_CHIP[li.status]}`}>{li.status.replace("_", " ")}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

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
              <div className="px-6 pb-6 ml-2 pl-6 border-l-2 border-emerald-200/40 flex flex-col gap-4">
                {bundle.audit_log.map(e => (
                  <div key={e.id} className="relative">
                    <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-surface-container-lowest border-2 border-emerald-400/60" />
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

          {/* Approval Summary */}
          <div className="bg-emerald-50/80 backdrop-blur-xl rounded-xl border border-emerald-200/50 shadow-[0_8px_40px_-12px_rgba(16,185,129,0.12)] overflow-hidden">
            <div className="px-6 py-4 border-b border-emerald-200/40 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
              <h3 className="font-headline font-bold text-base text-emerald-800">Approval Summary</h3>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold font-headline text-emerald-700 uppercase tracking-wider mb-1">AI Confidence</p>
                  <p className="text-xl font-extrabold text-emerald-900">{pct}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold font-headline text-emerald-700 uppercase tracking-wider mb-1">Receipts</p>
                  <p className="text-xl font-extrabold text-emerald-900">{bundle.line_items.length} / {bundle.line_items.length} passed</p>
                </div>
              </div>
              <div className="rounded-xl bg-emerald-100/60 border border-emerald-200/50 p-4">
                <p className="text-[10px] font-semibold font-headline text-emerald-700 uppercase tracking-wider mb-1">Total Approved</p>
                <p className="text-2xl font-extrabold font-headline text-emerald-800 tabular-nums">{fmt(bundle.totals.net_approved)}</p>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">{bundle.summary}</p>
            </div>
          </div>

          {/* AI Analysis */}
          <Card title="AI Analysis">
            <div className="p-6">
              <div className="w-full h-2 rounded-full bg-surface-container mb-4 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-sm text-on-surface leading-relaxed">{bundle.summary}</p>
            </div>
          </Card>

          {/* HR Confirmation */}
          <Card title={<><span>HR Confirmation</span><span className="text-xs font-normal text-on-surface-variant ml-2">Verify before finalising</span></>}>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <button id="decision-confirm" onClick={() => setHrDecision("confirm")}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold font-headline transition-all active:scale-[0.98] cursor-pointer border text-left bg-surface-container-lowest ${hrDecision === "confirm" ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200" : "border-outline-variant/20 text-on-surface-variant hover:border-emerald-300 hover:text-emerald-700"}`}>
                  <ShieldCheck className="w-5 h-5 shrink-0" strokeWidth={2} />
                  <div>
                    <p>Confirm & Finalise Approval</p>
                    <p className="text-[11px] font-normal mt-0.5 opacity-70">Approve {fmt(bundle.totals.net_approved)} and notify employee</p>
                  </div>
                </button>
                <button id="decision-flag" onClick={() => setHrDecision("flag")}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold font-headline transition-all active:scale-[0.98] cursor-pointer border text-left bg-surface-container-lowest ${hrDecision === "flag" ? "bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-200" : "border-outline-variant/20 text-on-surface-variant hover:border-amber-300 hover:text-amber-800"}`}>
                  <ShieldX className="w-5 h-5 shrink-0" strokeWidth={2} />
                  <div>
                    <p>Flag for Re-review</p>
                    <p className="text-[11px] font-normal mt-0.5 opacity-70">Move to Requires Attention queue</p>
                  </div>
                </button>
              </div>

              {hrDecision === "flag" && (
                <div className="flex items-start gap-3 rounded-xl bg-amber-50/80 border border-amber-200/60 px-4 py-3">
                  <p className="text-xs text-amber-800 leading-relaxed">This claim will be moved to <span className="font-semibold">Requires Attention</span> for manual HR investigation.</p>
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold font-headline text-on-surface-variant uppercase tracking-wider mb-2 block">
                  HR Note <span className="normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <textarea rows={3} placeholder="Add a note for the record…" value={note} onChange={e => setNote(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none ring-1 ring-outline-variant/20 focus:ring-primary/40 resize-none transition-all" />
              </div>

              <button id="submit-hr-decision" onClick={submit} disabled={!hrDecision}
                className={`w-full py-3 rounded-xl text-sm font-semibold font-headline transition-all active:scale-[0.97] ${
                  hrDecision === "confirm" ? "bg-emerald-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:bg-emerald-700 cursor-pointer"
                  : hrDecision === "flag" ? "bg-amber-500 text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)] hover:bg-amber-600 cursor-pointer"
                  : "bg-surface-container text-on-surface-variant/50 cursor-not-allowed"}`}>
                {hrDecision === "confirm" ? "Confirm & Finalise Approval" : hrDecision === "flag" ? "Flag for Re-review" : "Select a decision"}
              </button>
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
    </div>
  );
}
