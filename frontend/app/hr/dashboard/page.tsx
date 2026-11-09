"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SegmentedControl } from "glisse";
import type { ColDef, ICellRendererParams, RowClickedEvent } from "ag-grid-community";
import { ChevronRight, CheckCircle2, XCircle, Zap, Inbox, ShieldAlert, Sparkles, Download } from "lucide-react";
import type { Claim, ReimbursementRaw } from "@/lib/api/types";
import { getHRClaims } from "@/lib/actions/hr";
import { StatusBadge } from "@/components/claims/StatusBadge";
import { ViewAllModal } from "@/components/claims/ViewAllModal";
import { ReclaimGrid } from "@/components/grid/ReclaimGrid";
import { Avatar } from "@/components/ui/Avatar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader, PageShell } from "@/components/ui/PageHeader";
import { RingGauge } from "@/components/ui/RingGauge";
import { btn } from "@/components/ui/styles";
import type { AgGridReact } from "ag-grid-react";

type TabKey = "attention" | "passed" | "flagged";

/** "MYR 1,234.50" / "RM 12.00" → 1234.5 for numeric sorting. */
function parseAmount(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function EmployeeCell({ data }: ICellRendererParams<Claim>) {
  if (!data) return null;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={data.employee.name} initials={data.employee.initials} size="sm" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[14px] font-medium text-on-surface">{data.employee.name}</p>
        {data.note && <p className="truncate text-[12px] text-on-surface-variant">{data.note}</p>}
      </div>
    </div>
  );
}

function StatusCell({ data }: ICellRendererParams<Claim>) {
  return data ? <StatusBadge status={data.status} /> : null;
}

function ActionCell({ data, context }: ICellRendererParams<Claim, unknown, { action: string }>) {
  if (!data) return null;
  const isView = context.action === "View";
  return (
    <Link
      href={isView ? `/hr/view/${data.id}` : `/hr/review/${data.id}`}
      onClick={(e) => e.stopPropagation()}
      className={isView ? `${btn.ghost} h-8 px-3 text-[13px]` : `${btn.dark} h-8 px-3.5 text-[13px]`}
    >
      {context.action}
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

export default function HRDashboardPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact<Claim>>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("attention");
  const [modalOpen, setModalOpen] = useState(false);
  const [attentionClaims, setAttentionClaims] = useState<Claim[]>([]);
  const [passedClaims, setPassedClaims] = useState<Claim[]>([]);
  const [flaggedClaims, setFlaggedClaims] = useState<Claim[]>([]);
  const [allReims, setAllReims] = useState<ReimbursementRaw[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(true);

  useEffect(() => {
    getHRClaims()
      .then(({ attention, passed, flagged, allReims: reims }) => {
        setAttentionClaims(attention);
        setPassedClaims(passed);
        setFlaggedClaims(flagged);
        setAllReims(reims);
      })
      .catch(() => {})
      .finally(() => setIsLoadingClaims(false));
  }, []);

  // Auto-solve rate: (auto-approved + auto-rejected) / total
  const { autoSolveRate, autoSolvedCount, totalClaims } = useMemo(() => {
    const total = allReims.length;
    if (total === 0) return { autoSolveRate: 0, autoSolvedCount: 0, totalClaims: 0 };
    const autoSolved = allReims.filter(
      (r) => r.reviewed_by == null && ["APPROVED", "DISBURSING", "PAID", "REJECTED"].includes(r.status),
    ).length;
    return { autoSolveRate: (autoSolved / total) * 100, autoSolvedCount: autoSolved, totalClaims: total };
  }, [allReims]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "attention", label: "Needs Attention", count: attentionClaims.length },
    { key: "passed", label: "Passed AI", count: passedClaims.length },
    { key: "flagged", label: "Auto-Rejected", count: flaggedClaims.length },
  ];

  const activeClaims =
    activeTab === "attention" ? attentionClaims : activeTab === "passed" ? passedClaims : flaggedClaims;
  const actionLabel = activeTab === "attention" ? "Review" : "View";

  const modalTitle =
    activeTab === "attention"
      ? "All Pending Requests"
      : activeTab === "passed"
        ? "Passed AI Review (last 24 h)"
        : "Flagged AI Review (last 24 h)";

  const columnDefs = useMemo<ColDef<Claim>[]>(
    () => [
      {
        headerName: "Employee",
        colId: "employee",
        valueGetter: (p) => p.data?.employee.name ?? "",
        cellRenderer: EmployeeCell,
        flex: 1.6,
        minWidth: 220,
        filter: "agTextColumnFilter",
      },
      { headerName: "Submitted", field: "date", flex: 1, minWidth: 130, cellClass: "text-on-surface-variant" },
      {
        headerName: "Amount",
        colId: "amount",
        valueGetter: (p) => (p.data ? parseAmount(p.data.amount) : 0),
        valueFormatter: (p) => p.data?.amount ?? "",
        type: "rightAligned",
        flex: 1,
        minWidth: 130,
        cellClass: "font-mono tabular-nums font-medium",
        filter: "agNumberColumnFilter",
      },
      { headerName: "Category", field: "category", flex: 1, minWidth: 140, filter: "agTextColumnFilter" },
      { headerName: "AI Status", field: "status", cellRenderer: StatusCell, flex: 1.2, minWidth: 180 },
      {
        headerName: "",
        colId: "action",
        cellRenderer: ActionCell,
        width: 120,
        sortable: false,
        resizable: false,
        cellStyle: { justifyContent: "flex-end" },
      },
    ],
    [],
  );

  const onRowClicked = useCallback(
    (e: RowClickedEvent<Claim>) => {
      if (!e.data) return;
      router.push(actionLabel === "View" ? `/hr/view/${e.data.id}` : `/hr/review/${e.data.id}`);
    },
    [router, actionLabel],
  );

  const exportCsv = () =>
    gridRef.current?.api.exportDataAsCsv({
      fileName: `reclaim-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`,
      columnKeys: ["employee", "date", "amount", "category", "status"],
    });

  const emptyText =
    activeTab === "attention"
      ? "No claims need attention right now."
      : activeTab === "passed"
        ? "No auto-approved claims in the last 24 hours."
        : "No auto-rejected claims in the last 24 hours.";

  return (
    <PageShell>
      <PageHeader
        eyebrow="Operations"
        title="Reimbursement Triage"
        description="Manage exceptions and audit what the AI approved on its own."
        actions={
          <Link href="/hr/policy" className={btn.secondary}>
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            Policy Studio
          </Link>
        }
      />

      {/* KPIs */}
      <section aria-label="Key metrics" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 xl:grid-cols-4 xl:gap-5">
        <KpiCard
          label="Auto-Solve Rate"
          value={`${autoSolveRate.toFixed(1)}%`}
          loading={isLoadingClaims}
          tone="primary"
          sub={`${autoSolvedCount} of ${totalClaims} claims cleared without HR`}
          className="xl:col-span-1"
        >
          <div className="absolute right-5 top-5 hidden sm:block">
            {!isLoadingClaims && <RingGauge value={autoSolveRate} size={56} label={`Auto-solve rate ${autoSolveRate.toFixed(1)}%`} />}
          </div>
        </KpiCard>
        <KpiCard
          label="Pending Manual Review"
          value={attentionClaims.length}
          loading={isLoadingClaims}
          icon={ShieldAlert}
          tone="accent"
          sub="Requires HR action"
        />
        <KpiCard
          label="Passed AI Review"
          value={passedClaims.length}
          loading={isLoadingClaims}
          icon={Zap}
          tone="success"
          sub="Auto-approved · last 24 h"
        />
        <KpiCard
          label="Auto-Rejected"
          value={flaggedClaims.length}
          loading={isLoadingClaims}
          icon={XCircle}
          tone="neutral"
          sub="Employees notified · last 24 h"
        />
      </section>

      {/* Triage queue */}
      <section aria-labelledby="queue-heading" className="overflow-hidden rounded-[20px] bg-white shadow-ambient">
        <div className="flex flex-col gap-4 border-b border-on-surface/[0.06] px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <h2 id="queue-heading" className="font-headline text-[17px] font-semibold tracking-[-0.02em] text-on-surface">
              Claim Queue
            </h2>
            <p className="text-[13px] text-on-surface-variant">Sorted and bucketed by the Compliance Agent</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              aria-label="Queue bucket"
              items={tabs.map((t) => ({
                value: t.key,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    {t.label}
                    <span className="rounded-full bg-on-surface/[0.07] px-1.5 text-[11px] font-semibold tabular-nums">
                      {isLoadingClaims ? "–" : t.count}
                    </span>
                  </span>
                ),
              }))}
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as TabKey)}
              style={{ ["--lg-tab-width" as string]: "clamp(104px, 28vw, 150px)", ["--lg-tab-height" as string]: "34px" }}
            />
            <button type="button" onClick={exportCsv} className={`${btn.secondary} ${btn.sm} max-md:hidden`}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>

        {activeTab !== "attention" && (
          <div
            role="note"
            className={`mx-5 mt-4 flex items-start gap-2 rounded-xl px-4 py-2.5 text-[13px] md:mx-6 ${
              activeTab === "passed" ? "bg-success-container text-on-success-container" : "bg-surface-container text-on-surface-variant"
            }`}
          >
            {activeTab === "passed" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {activeTab === "passed"
              ? "Automatically approved by Reclaim AI (confidence > 70%) and payment initiated. No HR action required."
              : "Automatically rejected by Reclaim AI. Employees have been notified. No HR action required."}
          </div>
        )}

        {/* Desktop grid */}
        <div className="mt-2 hidden md:block">
          {!isLoadingClaims && activeClaims.length === 0 ? (
            <EmptyQueue text={emptyText} />
          ) : (
            <ReclaimGrid<Claim>
              ref={gridRef}
              rowData={isLoadingClaims ? undefined : activeClaims}
              loading={isLoadingClaims}
              columnDefs={columnDefs}
              context={{ action: actionLabel }}
              onRowClicked={onRowClicked}
              getRowId={(p) => p.data.id}
              pagination
              paginationPageSize={8}
              paginationPageSizeSelector={[8, 20, 50]}
              defaultColDef={{ sortable: true, resizable: true, floatingFilter: false }}
            />
          )}
        </div>

        {/* Mobile list */}
        <div className="md:hidden">
          {isLoadingClaims ? (
            <ul className="divide-y divide-on-surface/[0.06]">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-4">
                  <span className="h-9 w-9 animate-pulse rounded-full bg-surface-container" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-1/2 animate-pulse rounded bg-surface-container" />
                    <span className="block h-2.5 w-1/3 animate-pulse rounded bg-surface-container" />
                  </span>
                </li>
              ))}
            </ul>
          ) : activeClaims.length === 0 ? (
            <EmptyQueue text={emptyText} />
          ) : (
            <ul className="divide-y divide-on-surface/[0.06]">
              {activeClaims.slice(0, 5).map((claim) => (
                <li key={claim.id}>
                  <Link
                    href={actionLabel === "View" ? `/hr/view/${claim.id}` : `/hr/review/${claim.id}`}
                    className="flex items-center gap-3 px-5 py-4 transition-colors active:bg-marshmallow"
                  >
                    <Avatar name={claim.employee.name} initials={claim.employee.initials} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-on-surface">{claim.employee.name}</span>
                      <span className="block truncate text-[12px] text-on-surface-variant">
                        {claim.date} · {claim.category}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-mono text-[14px] font-semibold tabular-nums text-on-surface">{claim.amount}</span>
                      <span className="text-[12px] font-semibold text-primary">{actionLabel}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {activeClaims.length > 5 && (
            <div className="border-t border-on-surface/[0.06] p-3 text-center">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-[13px] font-semibold text-primary hover:bg-primary/[0.06]"
              >
                View All {activeClaims.length}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </section>

      <ViewAllModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        claims={activeClaims}
        actionLabel={actionLabel}
      />
    </PageShell>
  );
}

function EmptyQueue({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-marshmallow text-on-surface-variant">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 font-semibold text-on-surface">Queue is clear</p>
      <p className="mt-1 text-[13px] text-on-surface-variant">{text}</p>
    </div>
  );
}
