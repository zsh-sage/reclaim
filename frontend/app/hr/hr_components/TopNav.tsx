"use client";

import { useAuth } from "@/context/AuthContext";
import { Bell, HelpCircle } from "lucide-react";
import Image from "next/image";

export default function TopNav() {
  const { user } = useAuth();

  return (
    <header
      aria-label="Top navigation"
      className="sticky top-0 z-50 bg-surface/80 backdrop-blur-3xl border-b border-outline-variant/10 shadow-[0_4px_24px_-4px_rgba(44,47,49,0.06)]"
    >
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 w-full max-w-screen-2xl mx-auto gap-3">

        {/* ── Left: Brand (mobile) ─────────────────── */}
        <div className="lg:hidden flex items-center gap-2">
          <Image src="/images/logo.svg" alt="Reclaim Logo" width={24} height={24} className="w-6 h-6 object-contain" />
          <span className="text-xl font-extrabold bg-linear-to-r from-primary to-tertiary bg-clip-text text-transparent font-headline tracking-tight">
            Reclaim
          </span>
        </div>

        {/* ── Center: Spacer (md+) ──────────────── */}
        <div className="flex-1 hidden md:block"></div>

        {/* ── Right: Actions + Avatar ───────────────── */}
        <div className="flex items-center gap-1 md:gap-2">

          <button
            id="topnav-notification-btn"
            aria-label="Notifications"
            className="relative p-2.5 rounded-xl text-on-surface hover:bg-surface-container-low active:scale-95 transition-all cursor-pointer"
          >
            <Bell className="w-5 h-5" strokeWidth={1.75} />
            {/* Unread badge */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error border-2 border-surface pointer-events-none" />
          </button>

          <button
            id="topnav-help-btn"
            aria-label="Help"
            className="hidden sm:flex p-2.5 rounded-xl text-on-surface hover:bg-surface-container-low active:scale-95 transition-all cursor-pointer"
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
