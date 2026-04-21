"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Menu, Search, Upload, Bell, HelpCircle } from "lucide-react";

export default function TopNav() {
  const { user } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header
      aria-label="Top navigation"
      className="sticky top-0 z-50 bg-surface/80 backdrop-blur-3xl border-b border-outline-variant/10 shadow-[0_4px_24px_-4px_rgba(44,47,49,0.06)]"
    >
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 w-full max-w-screen-2xl mx-auto gap-3">

        {/* ── Left: Hamburger + Brand (mobile) ─────── */}
        <div className="flex items-center gap-3">
          <button
            id="topnav-mobile-menu-btn"
            aria-label="Open navigation menu"
            className="lg:hidden p-2 rounded-xl text-on-surface hover:bg-surface-container-low transition-all active:scale-95"
          >
            <Menu className="w-5 h-5" strokeWidth={2} />
          </button>
          <span className="lg:hidden text-xl font-extrabold bg-linear-to-r from-primary to-tertiary bg-clip-text text-transparent font-headline tracking-tight">
            Reclaim
          </span>
        </div>

        {/* ── Center: Search bar (md+) ──────────────── */}
        <div className="flex-1 max-w-sm hidden md:block">
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
              placeholder="Search claims, IDs, categories…"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full bg-surface-container-lowest/70 backdrop-blur-sm border border-outline-variant/30 text-on-surface text-sm rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>

        {/* ── Right: Actions + Avatar ───────────────── */}
        <div className="flex items-center gap-1 md:gap-2">
          <button
            id="topnav-upload-claim-btn"
            className="hidden md:flex items-center gap-2 text-primary font-body font-bold text-sm bg-primary/10 px-4 py-2.5 rounded-xl hover:bg-primary/15 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            Upload Claim
          </button>

          <button
            id="topnav-notification-btn"
            aria-label="Notifications"
            className="relative p-2.5 rounded-xl text-on-surface hover:bg-surface-container-low active:scale-95 transition-all"
          >
            <Bell className="w-5 h-5" strokeWidth={1.75} />
            {/* Unread badge */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error border-2 border-surface pointer-events-none" />
          </button>

          <button
            id="topnav-help-btn"
            aria-label="Help"
            className="hidden sm:flex p-2.5 rounded-xl text-on-surface hover:bg-surface-container-low active:scale-95 transition-all"
          >
            <HelpCircle className="w-5 h-5" strokeWidth={1.75} />
          </button>

          {/* Avatar */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Open profile"
            className="ml-1 h-9 w-9 rounded-full bg-linear-to-br from-primary-container to-tertiary-container shrink-0 flex items-center justify-center font-headline font-bold text-sm text-on-primary-container border-2 border-surface-container-lowest shadow-sm cursor-pointer hover:shadow-md hover:scale-105 transition-all"
          >
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
        </div>

      </div>
    </header>
  );
}
