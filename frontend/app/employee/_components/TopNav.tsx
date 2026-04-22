"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Search, Upload, Bell, HelpCircle, CheckCircle2, AlertCircle, Info, FileText } from "lucide-react";

export default function TopNav() {
  const { user } = useAuth();
  
  // States for search and dropdowns
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Click outside ref for notifications
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      aria-label="Top navigation"
      className="sticky top-0 z-50 bg-surface/80 backdrop-blur-3xl border-b border-outline-variant/10 shadow-[0_4px_24px_-4px_rgba(44,47,49,0.06)]"
    >
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 w-full max-w-screen-2xl mx-auto gap-3">

        {/* ── Left: Brand (mobile) ─────────────────── */}
        <span className="lg:hidden text-xl font-extrabold bg-linear-to-r from-primary to-tertiary bg-clip-text text-transparent font-headline tracking-tight">
          Reclaim
        </span>

        {/* ── Center: Search bar (md+) ──────────────── */}
        <div className="flex-1 max-w-sm hidden md:block relative z-60">
          <div className={`relative group transition-all duration-300 ${searchFocused ? "max-w-md" : ""}`}>
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                searchFocused ? "text-primary" : "text-outline-variant"
              }`}
              strokeWidth={1.75}
            />
            <input
              id="topnav-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)} // Delay so click registers
              placeholder="Search claims, IDs, categories…"
              className="w-full bg-surface-container-lowest/70 backdrop-blur-sm border border-outline-variant/30 text-on-surface text-sm rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/50"
            />
            
            {/* Mock Search Dropdown */}
            {searchFocused && searchQuery.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-surface border border-outline-variant/20 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-2 border-b border-outline-variant/10">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-2">Top Results</p>
                </div>
                <Link href="/employee/history" className="flex items-center gap-3 p-3 hover:bg-surface-container-low transition-colors" onClick={() => setSearchQuery("")}>
                  <div className="p-2 bg-surface-variant rounded-lg"><FileText className="w-4 h-4 text-on-surface-variant" /></div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Claim #RC-8892</h4>
                    <p className="text-xs text-on-surface-variant">Travel • Flight</p>
                  </div>
                </Link>
                <Link href="/employee/history" className="flex items-center gap-3 p-3 hover:bg-surface-container-low transition-colors border-t border-outline-variant/5" onClick={() => setSearchQuery("")}>
                  <div className="p-2 bg-surface-variant rounded-lg"><FileText className="w-4 h-4 text-on-surface-variant" /></div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Claim #RC-8885</h4>
                    <p className="text-xs text-on-surface-variant">Equipment • Laptop</p>
                  </div>
                </Link>
                <div className="p-3 bg-surface-container-lowest border-t border-outline-variant/10 text-center">
                  <Link href="/employee/history" className="text-xs font-bold text-primary hover:underline" onClick={() => setSearchQuery("")}>
                    See all results for "{searchQuery}"
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Actions + Avatar ───────────────── */}
        <div className="flex items-center gap-1 md:gap-2">
          
          <Link
            id="topnav-upload-claim-btn"
            href="/employee/claims"
            className="hidden md:flex items-center gap-2 text-primary font-body font-bold text-sm bg-primary/10 px-4 py-2.5 rounded-xl hover:bg-primary/15 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            Upload Claim
          </Link>

          {/* Notifications Dropdown Container */}
          <div className="relative" ref={notifRef}>
            <button
              id="topnav-notification-btn"
              aria-label="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2.5 rounded-xl transition-all active:scale-95 ${
                showNotifications ? "bg-surface-container-high text-primary" : "text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <Bell className="w-5 h-5" strokeWidth={1.75} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error border-2 border-surface pointer-events-none" />
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-surface border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-70">
                <div className="flex items-center justify-between p-4 border-b border-outline-variant/10 bg-surface-container-lowest">
                  <h3 className="font-headline font-bold text-sm text-on-surface">Notifications</h3>
                  <button className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider" onClick={() => setShowNotifications(false)}>
                    Mark all read
                  </button>
                </div>
                
                <div className="max-h-72 overflow-y-auto">
                  {/* Notification 1 */}
                  <div className="flex gap-3 p-4 border-b border-outline-variant/5 hover:bg-surface-container-lowest transition-colors cursor-pointer" onClick={() => setShowNotifications(false)}>
                    <div className="p-2 h-fit bg-primary/10 text-primary rounded-full shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">Claim #RC-8891 Approved</p>
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">Your claim for $124.50 has been approved and moved to payouts.</p>
                      <span className="text-[10px] font-bold text-on-surface-variant/50 mt-1 block">2 hours ago</span>
                    </div>
                  </div>

                  {/* Notification 2 */}
                  <div className="flex gap-3 p-4 border-b border-outline-variant/5 bg-tertiary/5 hover:bg-tertiary/10 transition-colors cursor-pointer" onClick={() => setShowNotifications(false)}>
                    <div className="relative">
                      <div className="p-2 h-fit bg-tertiary/20 text-tertiary rounded-full shrink-0"><AlertCircle className="w-4 h-4" /></div>
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">Action Required: Claim #RC-8885</p>
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">Please provide an itemized receipt for the laptop purchase.</p>
                      <span className="text-[10px] font-bold text-on-surface-variant/50 mt-1 block">1 day ago</span>
                    </div>
                  </div>

                  {/* Notification 3 */}
                  <div className="flex gap-3 p-4 hover:bg-surface-container-lowest transition-colors cursor-pointer" onClick={() => setShowNotifications(false)}>
                    <div className="p-2 h-fit bg-surface-variant text-on-surface-variant rounded-full shrink-0"><Info className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">System Maintenance</p>
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">Reclaim will undergo scheduled maintenance this Friday at 2AM EST.</p>
                      <span className="text-[10px] font-bold text-on-surface-variant/50 mt-1 block">2 days ago</span>
                    </div>
                  </div>
                </div>

                <div className="p-2 border-t border-outline-variant/10 text-center bg-surface-container-lowest">
                  <button className="text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setShowNotifications(false)}>
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link
            id="topnav-help-btn"
            href="/employee/support"
            aria-label="Help"
            className="hidden sm:flex p-2.5 rounded-xl text-on-surface hover:bg-surface-container-low active:scale-95 transition-all"
          >
            <HelpCircle className="w-5 h-5" strokeWidth={1.75} />
          </Link>

          {/* Avatar routed to settings */}
          <Link
            id="topnav-profile-btn"
            href="/employee/settings"
            aria-label="Open profile settings"
            className="ml-1 h-9 w-9 rounded-full bg-linear-to-br from-primary-container to-tertiary-container shrink-0 flex items-center justify-center font-headline font-bold text-sm text-on-primary-container border-2 border-surface-container-lowest shadow-sm hover:shadow-md hover:scale-105 transition-all"
          >
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </Link>

        </div>

      </div>
    </header>
  );
}
