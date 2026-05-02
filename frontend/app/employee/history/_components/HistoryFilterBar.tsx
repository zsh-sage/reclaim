"use client";

import { useState } from "react";
import { Calendar, ChevronDown, Filter, Check } from "lucide-react";

export type FilterStatus = "All" | "Pending" | "Approved" | "Partially Approved" | "Paid" | "Rejected";

interface HistoryFilterBarProps {
  currentStatus: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
}

const STATUSES: FilterStatus[] = ["All", "Pending", "Approved", "Partially Approved", "Paid", "Rejected"];
const DATE_OPTIONS = ["Last 30 Days", "Last 90 Days", "This Year", "All Time"];
const CATEGORY_OPTIONS = [
  { id: "All", label: "All Categories" },
  { id: "Travel", label: "Travel" },
  { id: "Meals", label: "Meals" },
  { id: "Equipment", label: "Equipment" },
  { id: "Office", label: "Office" },
];

export default function HistoryFilterBar({ 
  currentStatus, 
  onStatusChange,
  dateRange,
  onDateRangeChange,
  category,
  onCategoryChange
}: HistoryFilterBarProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 relative">
      
      {/* ── Overlay for Popovers ── */}
      {(dateOpen || categoryOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => { setDateOpen(false); setCategoryOpen(false); }} 
        />
      )}

      {/* ── Status Pills (Horizontal Scroll on Mobile) ── */}
      <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 flex items-center gap-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x scroll-pl-4 relative z-30">
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
      <div className="flex items-center gap-2 w-full md:w-auto relative z-50">
        
        {/* Date Dropdown */}
        <div className="relative flex-1 md:flex-none shrink-0">
          <button 
            type="button"
            onClick={() => { setDateOpen(!dateOpen); setCategoryOpen(false); }}
            className="w-full flex items-center justify-between md:justify-center gap-2 bg-surface-container-lowest border border-outline-variant/20 text-on-surface pl-10 pr-4 md:pr-4 py-2 md:py-1.5 rounded-xl text-sm font-semibold hover:bg-surface-container-low transition-colors shadow-sm outline-none focus:border-primary/50 h-[38px] md:h-9"
          >
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface pointer-events-none" />
            <span className="truncate">{dateRange}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${dateOpen ? "rotate-180" : ""}`} />
          </button>
          
          {dateOpen && (
            <div className="absolute right-0 md:left-0 top-[calc(100%+8px)] w-48 bg-surface border border-outline-variant/20 rounded-2xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { onDateRangeChange(opt); setDateOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-surface-container-low transition-colors"
                >
                  <span className={dateRange === opt ? "font-bold text-primary" : "text-on-surface font-medium"}>
                    {opt}
                  </span>
                  {dateRange === opt && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="relative flex-none shrink-0 h-[38px] md:h-9">
          <button 
            type="button"
            onClick={() => { setCategoryOpen(!categoryOpen); setDateOpen(false); }}
            className="w-full h-full px-2.5 flex items-center justify-center bg-surface-container-lowest border border-outline-variant/20 text-on-surface rounded-xl hover:bg-surface-container-low transition-colors shadow-sm outline-none"
            aria-label="Filter by Category"
            title="Filter by Category"
          >
            <Filter className={`w-5 h-5 md:w-4 md:h-4 ${category !== "All" ? "text-primary fill-primary/20" : ""}`} />
            {category !== "All" && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-surface-container-lowest" />
            )}
          </button>

          {categoryOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-48 bg-surface border border-outline-variant/20 rounded-2xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { onCategoryChange(opt.id); setCategoryOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-surface-container-low transition-colors"
                >
                  <span className={category === opt.id ? "font-bold text-primary" : "text-on-surface font-medium"}>
                    {opt.label}
                  </span>
                  {category === opt.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
      
    </div>
  );
}
