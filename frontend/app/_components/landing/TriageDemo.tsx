"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SegmentedControl, SearchField } from "glisse";
import type { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams, RowClickedEvent } from "ag-grid-community";
import { Brain, CheckCircle2, AlertTriangle, XCircle, Sparkles, FileSearch } from "lucide-react";
import { ReclaimGrid } from "@/components/grid/ReclaimGrid";
import { Avatar } from "@/components/ui/Avatar";
import { Reveal, SectionIntro } from "./primitives";

type Verdict = "APPROVE" | "PARTIAL_APPROVE" | "MANUAL_REVIEW" | "REJECT";

interface DemoClaim {
  id: string;
  employee: string;
  dept: string;
  country: string;
  category: string;
  amount: number;
  currency: string;
  verdict: Verdict;
  confidence: number;
  reasons: string[];
}

/* Illustrative sample rows for the public landing page only. */
const ROWS: DemoClaim[] = [
  { id: "RC-8F21A0", employee: "Aisha Rahman", dept: "Sales", country: "MY", category: "Travel · Flight", amount: 486, currency: "MYR", verdict: "APPROVE", confidence: 0.97, reasons: ["Economy fare within RM 800 cap", "Receipt date matches trip request", "Merchant verified: AirAsia"] },
  { id: "RC-2C9B14", employee: "Daniel Tan", dept: "Engineering", country: "SG", category: "Equipment", amount: 1890, currency: "SGD", verdict: "MANUAL_REVIEW", confidence: 0.62, reasons: ["Exceeds SGD 1,500 equipment cap", "No manager pre-approval attached", "Employee edited amount field (+12%)"] },
  { id: "RC-77D0E3", employee: "Priya Nair", dept: "Marketing", country: "IN", category: "Meals · Client", amount: 8450, currency: "INR", verdict: "APPROVE", confidence: 0.94, reasons: ["Client name present on receipt", "Per-head spend within policy", "GST line extracted and valid"] },
  { id: "RC-5E1F88", employee: "Lucas Moreau", dept: "Finance", country: "FR", category: "Hotel", amount: 642.5, currency: "EUR", verdict: "PARTIAL_APPROVE", confidence: 0.88, reasons: ["3 nights approved, 1 night outside trip window", "Minibar charges excluded per §4.2", "Approved: EUR 481.88"] },
  { id: "RC-A04C2B", employee: "Mei Lin", dept: "Operations", country: "MY", category: "Transport · Grab", amount: 38.6, currency: "MYR", verdict: "APPROVE", confidence: 0.99, reasons: ["Ride within business hours", "Pickup near office geofence", "Under auto-approve threshold"] },
  { id: "RC-91B7FD", employee: "James Okafor", dept: "Sales", country: "NG", category: "Entertainment", amount: 310, currency: "USD", verdict: "REJECT", confidence: 0.91, reasons: ["Alcohol-only receipt — non-reimbursable §6.1", "No attendee list provided", "Duplicate of RC-91B7F2 (hash match)"] },
  { id: "RC-3D66C1", employee: "Sofia García", dept: "Design", country: "ES", category: "Software", amount: 59.99, currency: "EUR", verdict: "APPROVE", confidence: 0.96, reasons: ["Approved vendor list: Figma", "Recurring subscription matched", "VAT ID extracted"] },
  { id: "RC-C82A9E", employee: "Hiro Tanaka", dept: "Engineering", country: "JP", category: "Travel · Rail", amount: 14170, currency: "JPY", verdict: "MANUAL_REVIEW", confidence: 0.55, reasons: ["Low OCR confidence on total (handwritten)", "Green Car upgrade needs justification", "Route matches calendar event"] },
];

const VERDICT_META: Record<Verdict, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  APPROVE: { label: "Approve", cls: "bg-success-container text-on-success-container ring-success/15", icon: CheckCircle2 },
  PARTIAL_APPROVE: { label: "Partial", cls: "bg-secondary-container text-on-secondary-container ring-secondary/15", icon: Sparkles },
  MANUAL_REVIEW: { label: "Needs Review", cls: "bg-warning-container text-warning ring-warning/15", icon: AlertTriangle },
  REJECT: { label: "Reject", cls: "bg-error-container text-error ring-error/15", icon: XCircle },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "attention", label: "Attention" },
  { value: "passed", label: "Passed" },
  { value: "rejected", label: "Rejected" },
];

function fmtMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "code" }).format(amount);
}

function EmployeeCell({ data }: ICellRendererParams<DemoClaim>) {
  if (!data) return null;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={data.employee} size="sm" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[14px] font-medium text-on-surface">{data.employee}</p>
        <p className="truncate text-[12px] text-on-surface-variant">
          {data.dept} · {data.country}
        </p>
      </div>
    </div>
  );
}

function VerdictCell({ value }: ICellRendererParams<DemoClaim, Verdict>) {
  return value ? <VerdictPill verdict={value} /> : null;
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${m.cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {m.label}
    </span>
  );
}

function ConfidenceCell({ value }: ICellRendererParams<DemoClaim, number>) {
  const v = value ?? 0;
  const pct = Math.round(v * 100);
  const color = v >= 0.85 ? "bg-success" : v >= 0.7 ? "bg-secondary" : "bg-accent";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-container">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right font-mono text-[12px] tabular-nums text-on-surface-variant">{pct}%</span>
    </div>
  );
}

export default function TriageDemo() {
  const gridRef = useRef<AgGridReact<DemoClaim>>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DemoClaim | null>(ROWS[1]);

  const rows = useMemo(() => {
    switch (filter) {
      case "attention":
        return ROWS.filter((r) => r.verdict === "MANUAL_REVIEW" || r.verdict === "PARTIAL_APPROVE");
      case "passed":
        return ROWS.filter((r) => r.verdict === "APPROVE");
      case "rejected":
        return ROWS.filter((r) => r.verdict === "REJECT");
      default:
        return ROWS;
    }
  }, [filter]);

  const columnDefs = useMemo<ColDef<DemoClaim>[]>(
    () => [
      { headerName: "Employee", field: "employee", cellRenderer: EmployeeCell, flex: 1.5, minWidth: 180 },
      { headerName: "Category", field: "category", flex: 1, minWidth: 120, cellClass: "text-on-surface-variant" },
      {
        headerName: "Amount",
        field: "amount",
        type: "rightAligned",
        flex: 1,
        minWidth: 120,
        valueFormatter: (p) => (p.data ? fmtMoney(p.data.amount, p.data.currency) : ""),
        cellClass: "font-mono tabular-nums",
        comparator: (a, b) => a - b,
      },
      { headerName: "AI Verdict", field: "verdict", cellRenderer: VerdictCell, flex: 1, minWidth: 140 },
      { headerName: "Confidence", field: "confidence", cellRenderer: ConfidenceCell, width: 156, minWidth: 156, suppressSizeToFit: true, sort: "asc" },
    ],
    [],
  );

  const onRowClicked = useCallback((e: RowClickedEvent<DemoClaim>) => {
    if (e.data) setSelected(e.data);
  }, []);

  return (
    <section id="triage" className="relative isolate overflow-hidden bg-marshmallow py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionIntro
          align="center"
          eyebrow="Triage"
          title={<>Every claim pre-sorted. <span className="text-on-surface-variant">Every verdict explained.</span></>}
          lede="Click any row to see the agent’s reasoning."
        />

        {/* App window */}
        <Reveal className="relative mt-12 lg:mt-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[-6%] -bottom-16 top-16 -z-10">
            <div className="absolute left-0 top-0 h-full w-[55%] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(70 71 211 / 0.18), transparent)" }} />
            <div className="absolute right-0 top-[10%] h-full w-[55%] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(0 156 222 / 0.16), transparent)" }} />
          </div>
          <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_30px_80px_-30px_rgb(20_20_43/0.25)] ring-1 ring-on-surface/[0.08]">
            <div className="flex flex-wrap items-center gap-3 border-b border-on-surface/[0.06] bg-[#fafafb] px-4 py-3 sm:px-5">
              <p className="text-[14px] font-medium text-on-surface">
                HR Triage <span className="ml-1.5 font-normal text-on-surface-variant">Sample data</span>
              </p>
              <div className="ml-auto flex w-full flex-wrap items-center gap-3 sm:w-auto">
                <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
                  <SearchField
                    aria-label="Search sample claims"
                    placeholder="Search claims…"
                    value={query}
                    onValueChange={setQuery}
                    autoComplete="off"
                  />
                </div>
                <SegmentedControl
                  aria-label="Filter by AI verdict"
                  items={FILTERS}
                  value={filter}
                  onValueChange={setFilter}
                  style={{ ["--lg-tab-width" as string]: "78px" }}
                />
              </div>
            </div>

            <div className="grid xl:grid-cols-[1fr_320px]">
              <div className="min-w-0 overflow-x-auto">
                <div className="min-h-[526px] min-w-[716px]">
                  <ReclaimGrid<DemoClaim>
                    ref={gridRef}
                    rowData={rows}
                    columnDefs={columnDefs}
                    quickFilterText={query}
                    onRowClicked={onRowClicked}
                    getRowId={(p) => p.data.id}
                    height="auto"
                    defaultColDef={{ resizable: false, sortable: true }}
                    suppressHorizontalScroll
                    enableCellTextSelection={false}
                    rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }}
                    overlayNoRowsTemplate='<span class="text-sm text-on-surface-variant">No claims match this view.</span>'
                  />
                </div>
              </div>

              <aside
                aria-live="polite"
                className="border-t border-on-surface/[0.06] bg-[#fbfbfd] p-5 xl:border-l xl:border-t-0"
              >
                <AnimatePresence mode="wait">
                  {selected ? (
                    <motion.div
                      key={selected.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex items-center gap-2 text-[13px] font-medium text-on-surface-variant">
                        <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
                        Compliance Agent
                      </div>
                      <p className="mt-3 font-mono text-[12px] text-on-surface-variant" translate="no">{selected.id}</p>
                      <p className="mt-1 font-headline text-[24px] font-medium tracking-[-0.03em] text-on-surface">
                        {fmtMoney(selected.amount, selected.currency)}
                      </p>
                      <p className="text-[13px] text-on-surface-variant">
                        {selected.employee} · {selected.category}
                      </p>
                      <div className="mt-4">
                        <VerdictPill verdict={selected.verdict} />
                      </div>
                      <h3 className="mt-6 text-[13px] font-semibold text-on-surface">Why this verdict</h3>
                      <ol className="mt-3 space-y-2.5">
                        {selected.reasons.map((r, i) => (
                          <li key={r} className="flex gap-3 text-[13px] leading-snug text-on-surface-variant">
                            <span className="mt-px w-4 shrink-0 font-mono text-[12px] text-on-surface-variant/60 tabular-nums">
                              {i + 1}
                            </span>
                            <span className="min-w-0 break-words">{r}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-6 border-t border-on-surface/[0.06] pt-4">
                        <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
                          <span>Model confidence</span>
                          <span className="font-mono tabular-nums text-on-surface">{Math.round(selected.confidence * 100)}%</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container">
                          <motion.div
                            className="h-full rounded-full bg-primary"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: selected.confidence }}
                            style={{ originX: 0 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center py-10 text-center text-on-surface-variant">
                      <FileSearch className="h-6 w-6" aria-hidden="true" />
                      <p className="mt-2 text-sm">Select a claim to see the agent’s reasoning.</p>
                    </div>
                  )}
                </AnimatePresence>
              </aside>
            </div>
          </div>
          <p className="mt-4 text-center text-[12px] text-on-surface-variant">
            Interactive grid powered by AG Grid · Illustrative sample data
          </p>
        </Reveal>
      </div>
    </section>
  );
}
