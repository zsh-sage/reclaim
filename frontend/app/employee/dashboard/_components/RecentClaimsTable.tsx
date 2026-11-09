"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plane, UtensilsCrossed, Monitor, ChevronRight, Inbox, type LucideIcon } from "lucide-react";
import type { ColDef, ICellRendererParams, RowClickedEvent } from "ag-grid-community";
import { getRecentClaims } from "@/lib/actions/dashboard";
import type { ClaimSummary } from "@/lib/api/types";
import { ReclaimGrid } from "@/components/grid/ReclaimGrid";
import { LifecyclePill } from "@/components/claims/StatusBadge";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Travel: Plane,
  Meals: UtensilsCrossed,
  Equipment: Monitor,
};

function IdCell({ value }: ICellRendererParams<ClaimSummary, string>) {
  if (!value) return null;
  return (
    <span className="rounded-md bg-marshmallow px-2 py-1 font-mono text-[12px] text-on-surface-variant" title={value} translate="no">
      {value.slice(0, 8)}
    </span>
  );
}

function PolicyCell({ data }: ICellRendererParams<ClaimSummary>) {
  if (!data) return null;
  const Icon = CATEGORY_ICON_MAP[data.category] ?? Monitor;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="truncate text-on-surface">{data.category}</span>
    </div>
  );
}

function StatusCell({ value }: ICellRendererParams<ClaimSummary, string>) {
  return value ? <LifecyclePill status={value} /> : null;
}

export default function RecentClaimsTable() {
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    getRecentClaims(5).then(setClaims);
  }, []);

  const columnDefs = useMemo<ColDef<ClaimSummary>[]>(
    () => [
      { headerName: "Claim", field: "id", cellRenderer: IdCell, width: 112, sortable: false },
      { headerName: "Date", field: "date", flex: 1, minWidth: 112, cellClass: "text-on-surface-variant" },
      { headerName: "Policy", field: "category", cellRenderer: PolicyCell, flex: 1.3, minWidth: 150 },
      { headerName: "Receipts", field: "subCategory", flex: 0.9, minWidth: 96 },
      { headerName: "Amount", field: "amountNumeric", valueFormatter: (p) => p.data?.amount ?? "", type: "rightAligned", flex: 1, minWidth: 108, cellClass: "font-mono tabular-nums font-medium" },
      { headerName: "Status", field: "status", cellRenderer: StatusCell, flex: 1, minWidth: 116 },
    ],
    [],
  );

  const onRowClicked = useCallback(
    (e: RowClickedEvent<ClaimSummary>) => {
      if (e.data) router.push(`/employee/history?claimId=${e.data.id}`);
    },
    [router],
  );

  return (
    <section aria-labelledby="recent-claims-heading" className="min-w-0 overflow-hidden rounded-[20px] bg-white shadow-ambient">
      <div className="flex items-center justify-between border-b border-on-surface/[0.06] px-5 py-4 md:px-6">
        <div>
          <h2 id="recent-claims-heading" className="font-headline text-[17px] font-semibold tracking-[-0.02em] text-on-surface">
            Recent Claims
          </h2>
          <p className="text-[13px] text-on-surface-variant">Your latest submissions</p>
        </div>
        <Link
          id="recent-claims-view-all-btn"
          href="/employee/history"
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/[0.06]"
        >
          View All
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {claims !== null && claims.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-marshmallow text-on-surface-variant">
            <Inbox className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-3 font-semibold text-on-surface">No claims yet</p>
          <p className="mt-1 text-[13px] text-on-surface-variant">Upload your first receipt to get reimbursed.</p>
          <Link href="/employee/claims" className="mt-4 text-[13px] font-semibold text-primary hover:text-primary-dim">
            Upload a Claim →
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop: AG Grid */}
          <div className="hidden md:block">
            <ReclaimGrid<ClaimSummary>
              rowData={claims ?? undefined}
              loading={claims === null}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              getRowId={(p) => p.data.id}
            />
          </div>

          {/* Mobile: cards */}
          <ul className="flex flex-col divide-y divide-on-surface/[0.06] md:hidden">
            {(claims ?? []).map((claim) => {
              const Icon = CATEGORY_ICON_MAP[claim.category] ?? Monitor;
              return (
                <li key={claim.id}>
                  <Link
                    href={`/employee/history?claimId=${claim.id}`}
                    className="flex items-center gap-3 px-5 py-4 transition-colors active:bg-marshmallow"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-on-surface">{claim.category}</span>
                      <span className="block truncate text-[12px] text-on-surface-variant">
                        {claim.date.split(",")[0]} · <span className="font-mono">{claim.id.slice(0, 8)}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-[14px] font-semibold text-on-surface tabular-nums">{claim.amount}</span>
                      <LifecyclePill status={claim.status} />
                    </span>
                  </Link>
                </li>
              );
            })}
            {claims === null &&
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-4">
                  <span className="h-10 w-10 animate-pulse rounded-xl bg-surface-container" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-1/2 animate-pulse rounded bg-surface-container" />
                    <span className="block h-2.5 w-1/3 animate-pulse rounded bg-surface-container" />
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}
