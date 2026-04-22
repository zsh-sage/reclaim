"use client";

import { Calendar, SlidersHorizontal } from "lucide-react";

export type FilterStatus = "All" | "Pending" | "Approved" | "Paid" | "Rejected";

interface HistoryFilterBarProps {
  currentStatus: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
}

const STATUSES: FilterStatus[] = ["All", "Pending", "Approved", "Paid", "Rejected"];

export default function HistoryFilterBar({ currentStatus, onStatusChange }: HistoryFilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
      
      {/* ── Status Pills (Horizontal Scroll on Mobile) ── */}
      <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 flex items-center gap-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x">
        {STATUSES.map((status) => {
          const isActive = status === currentStatus;
          return (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer active:scale-95 border snap-start ${
                isActive
                  ? "bg-primary text-on-primary border-primary shadow-sm"
                  : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-low border-outline-variant/20"
              }`}
            >
              {status}
            </button>
          );
        })}
      </div>

      {/* ── Secondary Filters (Date / Category) ── */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        {/* Date Button */}
        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-surface-container-lowest border border-outline-variant/20 text-on-surface px-4 py-2 rounded-xl text-sm font-semibold hover:bg-surface-container-low transition-colors cursor-pointer active:scale-95 shadow-sm hover:shadow">
          <Calendar className="w-4 h-4" />
          <span>Last 30 Days</span>
        </button>

        {/* Category / More Filters Button */}
        <button className="p-2 bg-surface-container-lowest border border-outline-variant/20 text-on-surface rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer active:scale-95 shadow-sm hover:shadow">
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>
      
    </div>
  );
}
