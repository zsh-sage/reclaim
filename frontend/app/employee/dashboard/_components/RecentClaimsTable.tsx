"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plane, UtensilsCrossed, Monitor, ChevronRight } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { getRecentClaims } from "@/lib/actions/dashboard";
import type { ClaimSummary } from "@/lib/api/types";

/* ─── Types ──────────────────────────────────────────── */
type ClaimStatus = "Pending" | "Approved" | "Paid" | "Rejected";

interface DisplayClaim extends ClaimSummary {
  categoryIcon: LucideIcon;
}

/* ─── Icon mapping ───────────────────────────────────── */
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Travel: Plane,
  Meals: UtensilsCrossed,
  Equipment: Monitor,
};

function mapClaimForDisplay(claim: ClaimSummary): DisplayClaim {
  return {
    ...claim,
    categoryIcon: CATEGORY_ICON_MAP[claim.category] ?? Monitor,
  };
}

/* ─── Status styling maps ────────────────────────────── */
const STATUS_BADGE: Record<ClaimStatus, string> = {
  "Pending":    "bg-secondary-container/50 text-on-secondary-container",
  "Approved":   "bg-primary/10 text-primary",
  "Paid": "bg-tertiary/10 text-tertiary",
  "Rejected": "bg-error/10 text-error",
};

const STATUS_DOT: Record<ClaimStatus, string> = {
  "Pending":    "bg-secondary",
  "Approved":   "bg-primary",
  "Paid": "bg-tertiary",
  "Rejected": "bg-error",
};

/* ─── Component ──────────────────────────────────────── */
export default function RecentClaimsTable() {
  const [claims, setClaims] = useState<DisplayClaim[]>([]);
  const router = useRouter();

  useEffect(() => {
    getRecentClaims(3).then((data) => {
      setClaims(data.map(mapClaimForDisplay));
    });
  }, []);

  return (
    <section
      aria-labelledby="recent-claims-heading"
      className="bg-surface-container-low rounded-2xl p-4 md:p-6 shadow-[0_8px_40px_-12px_rgba(44,47,49,0.06)]"
    >
      {/* Section header */}
      <div className="flex justify-between items-center mb-5">
        <h3
          id="recent-claims-heading"
          className="font-headline text-xl font-bold text-on-surface"
        >
          Recent Claims
        </h3>
        <button
          id="recent-claims-view-all-btn"
          onClick={() => router.push("/employee/history")}
          className="text-primary font-body text-sm font-semibold hover:underline underline-offset-4 flex items-center gap-1 active:scale-95 transition-transform"
        >
          View All
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Desktop: Full table ───────────────────────── */}
      <div className="hidden md:block overflow-x-auto bg-surface-container-lowest rounded-xl border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant font-body text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold rounded-tl-xl">Claim ID</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Policy</th>
              <th className="p-4 font-semibold">Receipts</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold rounded-tr-xl">Status</th>
            </tr>
          </thead>
          <tbody className="font-body text-sm">
            {claims.map((claim) => (
              <tr
                key={claim.id}
                onClick={() => router.push(`/employee/history?claimId=${claim.id}`)}
                className="border-t border-outline-variant/5 hover:bg-surface-container-highest/40 transition-colors cursor-pointer group"
              >
                <td className="p-4 font-medium text-on-surface" title={claim.id}>
                  <span className="font-mono text-xs bg-surface-container px-2 py-1 rounded-lg">
                    {claim.id.slice(0, 8)}
                  </span>
                </td>
                <td className="p-4 text-on-surface-variant">{claim.date}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-surface-variant rounded-lg text-on-surface-variant">
                      <claim.categoryIcon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <span className="text-on-surface">{claim.category}</span>
                  </div>
                </td>
                <td className="p-4 text-on-surface">{claim.subCategory}</td>
                <td className="p-4 font-semibold text-on-surface tabular-nums">
                  {claim.amount}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[claim.status as ClaimStatus] ?? ""}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[claim.status as ClaimStatus] ?? ""}`}
                    />
                    {claim.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: Card list ─────────────────────────── */}
      <div className="md:hidden flex flex-col gap-3">
        {claims.map((claim) => (
          <div
            key={claim.id}
            onClick={() => router.push(`/employee/history?claimId=${claim.id}`)}
            className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 flex items-center justify-between hover:bg-surface-container-highest/30 transition-colors active:scale-[0.98]"
          >
            {/* Left: icon + meta */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-surface-container rounded-xl text-on-surface-variant shrink-0">
                <claim.categoryIcon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-headline font-bold text-sm text-on-surface mb-0.5">
                  {claim.category}
                </h4>
                <p className="font-body text-xs text-on-surface-variant">
                  {claim.date.split(",")[0]} &bull; <span title={claim.id}>{claim.id.slice(0, 8)}</span>
                </p>
              </div>
            </div>

            {/* Right: amount + badge */}
            <div className="text-right shrink-0 ml-2">
              <p className="font-headline font-bold text-sm text-on-surface mb-1 tabular-nums">
                {claim.amount}
              </p>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[claim.status as ClaimStatus] ?? ""}`}
              >
                {claim.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
