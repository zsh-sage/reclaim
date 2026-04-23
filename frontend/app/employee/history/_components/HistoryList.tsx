"use client";

import { ChevronRight } from "lucide-react";
import { HistoryClaim, STATUS_BADGE, STATUS_DOT } from "./historyData";

interface HistoryListProps {
  claims: HistoryClaim[];
  onSelectClaim: (claim: HistoryClaim) => void;
}

export default function HistoryList({ claims, onSelectClaim }: HistoryListProps) {
  if (claims.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
        <p className="font-headline font-bold text-lg text-on-surface mb-2">No claims found.</p>
        <p className="font-body text-sm text-on-surface-variant">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ── Desktop: Full table ───────────────────────── */}
      <div className="hidden md:block overflow-x-auto bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant font-body text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold rounded-tl-xl w-32">Date</th>
              <th className="p-4 font-semibold w-40">Main Category</th>
              <th className="p-4 font-semibold">Sub Category / Merchant</th>
              <th className="p-4 font-semibold w-32">Amount</th>
              <th className="p-4 font-semibold w-36">Status</th>
              <th className="p-4 font-semibold rounded-tr-xl w-10"></th>
            </tr>
          </thead>
          <tbody className="font-body text-sm">
            {claims.map((claim) => (
              <tr
                key={claim.id}
                onClick={() => onSelectClaim(claim)}
                className="border-t border-outline-variant/5 hover:bg-surface-container-highest/40 transition-colors cursor-pointer group"
              >
                <td className="p-4 text-on-surface-variant whitespace-nowrap">{claim.date}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-surface-variant rounded-lg text-on-surface-variant">
                      <claim.categoryIcon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <span className="text-on-surface font-medium">{claim.category}</span>
                  </div>
                </td>
                <td className="p-4 text-on-surface">
                  <div className="flex flex-col">
                    <span className="font-semibold">{claim.merchant}</span>
                    <span className="text-xs text-on-surface-variant">{claim.subCategory} • {claim.id}</span>
                  </div>
                </td>
                <td className="p-4 font-bold text-on-surface tabular-nums">
                  {claim.amount}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[claim.status]}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[claim.status]}`}
                    />
                    {claim.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <ChevronRight className="w-5 h-5 text-on-surface-variant opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
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
            onClick={() => onSelectClaim(claim)}
            className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 flex items-center justify-between hover:bg-surface-container-highest/30 transition-colors active:scale-[0.98] cursor-pointer"
          >
            {/* Left: icon + meta */}
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-3 bg-surface-container rounded-xl text-on-surface-variant shrink-0">
                <claim.categoryIcon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 pr-2">
                <h4 className="font-headline font-bold text-sm text-on-surface mb-0.5 truncate">
                  {claim.merchant}
                </h4>
                <p className="font-body text-xs text-on-surface-variant truncate">
                  {claim.date.split(",")[0]} • {claim.category}
                </p>
              </div>
            </div>

            {/* Right: amount + badge */}
            <div className="flex items-center gap-2 shrink-0">
               <div className="text-right shrink-0">
                 <p className="font-headline font-bold text-sm text-on-surface mb-1 tabular-nums">
                   {claim.amount}
                 </p>
                 <span
                   className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[claim.status]}`}
                 >
                   {claim.status}
                 </span>
               </div>
               <ChevronRight className="w-4 h-4 text-on-surface-variant opacity-60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
