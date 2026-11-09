"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SegmentedControl, SearchField } from "glisse";
import type { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams, RowClickedEvent } from "ag-grid-community";
import { History, ChevronRight, ChevronLeft, ExternalLink, Inbox, CheckCircle2, XCircle, Banknote, Download } from "lucide-react";
import { getHRHistory, type HistoryClaim } from "@/lib/actions/hr";
import { ReclaimGrid } from "@/components/grid/ReclaimGrid";
import { LifecyclePill } from "@/components/claims/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader, PageShell } from "@/components/ui/PageHeader";
import { btn } from "@/components/ui/styles";

type ClaimStatus = HistoryClaim["status"];
type StatusFilter = "All" | ClaimStatus;

const ITEMS_PER_PAGE = 8;

function fmtAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency || "MYR", currencyDisplay: "code" }).format(amount);
  } catch {
    return `RM ${new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2 }).format(amount)}`;
  }
}

function IdCell({ value }: ICellRendererParams<HistoryClaim, string>) {
  if (!value) return null;
  return (
    <span className="rounded-md bg-marshmallow px-2 py-1 font-mono text-[12px] text-on-surface-variant" title={value} translate="no">
      {value.slice(0, 11)}
    </span>
  );
}

function EmployeeCell({ data }: ICellRendererParams<HistoryClaim>) {
  if (!data) return null;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={data.employeeName} size="sm" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[14px] font-medium text-on-surface">{data.employeeName}</p>
        <p className="truncate text-[12px] text-on-surface-variant">{data.department}</p>
      </div>
    </div>
  );
}

function StatusCell({ value }: ICellRendererParams<HistoryClaim, string>) {
  return value ? <LifecyclePill status={value} /> : null;
}

function ViewCell({ data }: ICellRendererParams<HistoryClaim>) {
  if (!data) return null;
  return (
    <Link
      href={`/hr/view/${data.reim_id}`}
      onClick={(e) => e.stopPropagation()}
      className={`${btn.ghost} h-8 px-3 text-[13px]`}
    >
      View
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

export default function HRHistoryPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact<HistoryClaim>>(null);
  const [data, setData] = useState<HistoryClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    getHRHistory()
      .then(setData)
      .catch(() => setError("Couldn’t load claim history. Check your connection and refresh the page."))
      .finally(() => setIsLoading(false));
  }, []);

  // Status filter is applied to rowData; text search uses AG Grid's quick filter on desktop.
  const byStatus = useMemo(
    () => (statusFilter === "All" ? data : data.filter((c) => c.status === statusFilter)),
    [data, statusFilter],
  );

  // Mobile list mirrors the same search semantics.
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter(
      (c) =>
        c.employeeName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.policyName.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q),
    );
  }, [byStatus, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const kpis = useMemo(() => {
    const approved = data.filter((c) => c.status === "Approved" || c.status === "Paid");
    const rejected = data.filter((c) => c.status === "Rejected");
    const totalPaid = data.filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0);
    return {
      total: data.length,
      approved: approved.length,
      rejected: rejected.length,
      totalPaid: fmtAmount(totalPaid, "MYR"),
    };
  }, [data]);

  const columnDefs = useMemo<ColDef<HistoryClaim>[]>(
    () => [
      { headerName: "Claim ID", field: "id", cellRenderer: IdCell, width: 150 },
      { headerName: "Employee", field: "employeeName", cellRenderer: EmployeeCell, flex: 1.5, minWidth: 210, filter: "agTextColumnFilter" },
      { headerName: "Policy / Category", field: "policyName", flex: 1.4, minWidth: 180, cellClass: "text-on-surface-variant", filter: "agTextColumnFilter", tooltipField: "policyName" },
      {
        headerName: "Amount",
        field: "amount",
        type: "rightAligned",
        flex: 1,
        minWidth: 140,
        valueFormatter: (p) => (p.data ? fmtAmount(p.data.amount, p.data.currency) : ""),
        cellClass: "font-mono tabular-nums font-medium",
        filter: "agNumberColumnFilter",
      },
      { headerName: "Resolved", field: "dateResolved", flex: 1, minWidth: 130, cellClass: "text-on-surface-variant" },
      { headerName: "Status", field: "status", cellRenderer: StatusCell, width: 140 },
      { headerName: "", colId: "view", cellRenderer: ViewCell, width: 110, sortable: false, resizable: false, cellStyle: { justifyContent: "flex-end" } },
      // Hidden searchable fields so the quick filter matches department too.
      { field: "department", hide: true },
    ],
    [],
  );

  const onRowClicked = useCallback(
    (e: RowClickedEvent<HistoryClaim>) => {
      if (e.data) router.push(`/hr/view/${e.data.reim_id}`);
    },
    [router],
  );

  const exportCsv = () =>
    gridRef.current?.api.exportDataAsCsv({
      fileName: `reclaim-history-${new Date().toISOString().slice(0, 10)}.csv`,
      columnKeys: ["id", "employeeName", "department", "policyName", "amount", "dateResolved", "status"],
      processCellCallback: (p) => (p.column.getColId() === "amount" && p.node?.data ? String(p.node.data.amount) : p.value),
    });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Records"
        title="Claim History"
        description="Every resolved claim — auto-processed and HR-reviewed — in one place."
        actions={
          <button type="button" onClick={exportCsv} disabled={isLoading || data.length === 0} className={`${btn.secondary} max-md:hidden`}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
        }
      />

      <section aria-label="Summary" className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:gap-5 lg:grid-cols-4">
        <KpiCard label="Total Resolved" value={kpis.total} sub="all time" icon={History} tone="primary" loading={isLoading} />
        <KpiCard label="Approved / Paid" value={kpis.approved} sub="claims" icon={CheckCircle2} tone="violet" loading={isLoading} />
        <KpiCard label="Rejected" value={kpis.rejected} sub="claims" icon={XCircle} tone="error" loading={isLoading} />
        <KpiCard label="Total Disbursed" value={kpis.totalPaid} sub="paid out" icon={Banknote} tone="success" loading={isLoading} />
      </section>

      {error && (
        <div role="alert" className="mb-6 flex items-center gap-3 rounded-2xl bg-error-container px-5 py-4 text-[14px] text-error">
          <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <section aria-label="Resolved claims" className="overflow-hidden rounded-[20px] bg-white shadow-ambient">
        <div className="flex flex-col gap-3 border-b border-on-surface/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div className="w-full sm:max-w-sm">
            <SearchField
              aria-label="Search claims"
              placeholder="Search claims…"
              value={searchQuery}
              onValueChange={setSearchQuery}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <SegmentedControl
            aria-label="Filter by status"
            items={[
              { value: "All", label: "All" },
              { value: "Approved", label: "Approved" },
              { value: "Paid", label: "Paid" },
              { value: "Rejected", label: "Rejected" },
            ]}
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            style={{ ["--lg-tab-width" as string]: "clamp(72px, 21vw, 92px)" }}
          />
        </div>

        {/* Desktop: AG Grid */}
        <div className="hidden md:block">
          <ReclaimGrid<HistoryClaim>
            ref={gridRef}
            rowData={isLoading ? undefined : byStatus}
            loading={isLoading}
            columnDefs={columnDefs}
            quickFilterText={searchQuery}
            onRowClicked={onRowClicked}
            getRowId={(p) => p.data.reim_id}
            pagination
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 25, 50, 100]}
            defaultColDef={{ sortable: true, resizable: true }}
            tooltipShowDelay={400}
            overlayNoRowsTemplate={
              data.length === 0
                ? '<span class="text-sm">Resolved claims appear here once they age out of the dashboard.</span>'
                : '<span class="text-sm">No claims match. Try a different search or status.</span>'
            }
          />
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden">
          <ul className="divide-y divide-on-surface/[0.06]">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-4">
                  <span className="h-9 w-9 animate-pulse rounded-full bg-surface-container" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-2/3 animate-pulse rounded bg-surface-container" />
                    <span className="block h-2.5 w-1/2 animate-pulse rounded bg-surface-container" />
                  </span>
                </li>
              ))}
            {!isLoading &&
              paginated.map((claim) => (
                <li key={claim.reim_id}>
                  <Link href={`/hr/view/${claim.reim_id}`} className="flex items-center gap-3 px-4 py-4 transition-colors active:bg-marshmallow">
                    <Avatar name={claim.employeeName} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-on-surface">{claim.employeeName}</span>
                      <span className="block truncate text-[12px] text-on-surface-variant">{claim.policyName}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-on-surface">{fmtAmount(claim.amount, claim.currency)}</span>
                      <LifecyclePill status={claim.status} />
                    </span>
                  </Link>
                </li>
              ))}
          </ul>

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-marshmallow text-on-surface-variant">
                <Inbox className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-3 font-semibold text-on-surface">No claims found</p>
              <p className="mt-1 text-[13px] text-on-surface-variant">
                {data.length === 0
                  ? "Resolved claims appear here once they age out of the dashboard."
                  : "Try a different search or status."}
              </p>
            </div>
          )}

          {!isLoading && filtered.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between gap-3 border-t border-on-surface/[0.06] px-4 py-3">
              <p className="text-[12px] text-on-surface-variant tabular-nums">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className={`${btn.icon} h-9 w-9 disabled:opacity-30`}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="px-2 text-[12px] font-medium text-on-surface tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className={`${btn.icon} h-9 w-9 disabled:opacity-30`}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
