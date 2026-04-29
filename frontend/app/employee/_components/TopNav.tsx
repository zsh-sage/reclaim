"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getNotifications, markAllNotificationsRead } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/api/types";
import { Search, Upload, Bell, HelpCircle, CheckCircle2, AlertCircle, Info } from "lucide-react";

let _notifCache: { data: Notification[]; ts: number } | null = null;
const NOTIF_TTL_MS = 15_000;

/* ─── Icon map for notification types ────────────────── */
const NOTIF_ICON_MAP: Record<Notification["type"], { icon: typeof CheckCircle2; bg: string; text: string }> = {
  success: { icon: CheckCircle2, bg: "bg-primary/10", text: "text-primary" },
  warning: { icon: AlertCircle, bg: "bg-tertiary/20", text: "text-tertiary" },
  error:   { icon: AlertCircle, bg: "bg-error/10", text: "text-error" },
  info:    { icon: Info, bg: "bg-surface-variant", text: "text-on-surface-variant" },
};

export default function TopNav() {
  const { user } = useAuth();
  
  // States for search and dropdowns
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Click outside ref for notifications
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch notifications — skip if cache is still fresh
  useEffect(() => {
    const now = Date.now();
    if (_notifCache && now - _notifCache.ts < NOTIF_TTL_MS) {
      setNotifications(_notifCache.data);
      return;
    }
    getNotifications().then((data) => {
      _notifCache = { data, ts: Date.now() };
      setNotifications(data);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      _notifCache = { data: updated, ts: Date.now() };
      return updated;
    });
    setShowNotifications(false);
  }

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
            
            {/* Search hint */}
            {searchFocused && searchQuery.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-surface border border-outline-variant/20 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 text-center">
                  <Search className="w-5 h-5 text-on-surface-variant/40 mx-auto mb-1.5" />
                  <p className="text-xs text-on-surface-variant">
                    Press Enter to search your claims history
                  </p>
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
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error border-2 border-surface pointer-events-none" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-surface border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-70">
                <div className="flex items-center justify-between p-4 border-b border-outline-variant/10 bg-surface-container-lowest">
                  <h3 className="font-headline font-bold text-sm text-on-surface">Notifications</h3>
                  <button className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                </div>
                
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((notif) => {
                    const iconConfig = NOTIF_ICON_MAP[notif.type];
                    const IconComponent = iconConfig.icon;
                    return (
                      <button
                        key={notif.id}
                        type="button"
                        role="menuitem"
                        className={`w-full text-left flex gap-3 p-4 border-b border-outline-variant/5 hover:bg-surface-container-lowest transition-colors cursor-pointer ${
                          !notif.isRead ? "bg-tertiary/5 hover:bg-tertiary/10" : ""
                        }`}
                        onClick={() => setShowNotifications(false)}
                      >
                        <div className="relative">
                          <div className={`p-2 h-fit ${iconConfig.bg} ${iconConfig.text} rounded-full shrink-0`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          {!notif.isRead && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{notif.title}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] font-bold text-on-surface-variant/50 mt-1 block">{notif.timestamp}</span>
                        </div>
                      </button>
                    );
                  })}
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
