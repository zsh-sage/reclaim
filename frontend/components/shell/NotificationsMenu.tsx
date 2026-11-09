"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCircle2, AlertCircle, Info, XCircle, BellOff } from "lucide-react";
import { getNotifications, markAllNotificationsRead } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/api/types";

const NOTIF_TTL_MS = 15_000;
let cache: { key: string; data: Notification[]; ts: number } | null = null;

const ICONS: Record<Notification["type"], { icon: typeof CheckCircle2; cls: string }> = {
  success: { icon: CheckCircle2, cls: "bg-success-container text-on-success-container" },
  warning: { icon: AlertCircle, cls: "bg-accent-container text-on-accent-container" },
  error: { icon: XCircle, cls: "bg-error-container text-error" },
  info: { icon: Info, cls: "bg-secondary-container text-on-secondary-container" },
};

export default function NotificationsMenu({ cacheKey }: { cacheKey: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>(() =>
    cache && cache.key === cacheKey ? cache.data : [],
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cache && cache.key === cacheKey && Date.now() - cache.ts < NOTIF_TTL_MS) return;
    getNotifications().then((data) => {
      cache = { key: cacheKey, data, ts: Date.now() };
      setItems(data);
    });
  }, [cacheKey]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.isRead).length;

  async function markAll() {
    await markAllNotificationsRead();
    setItems((prev) => {
      const next = prev.map((n) => ({ ...n, isRead: true }));
      cache = { key: cacheKey, data: next, ts: Date.now() };
      return next;
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        id="topnav-notification-btn"
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          open ? "bg-on-surface/[0.06] text-on-surface" : "text-on-surface-variant hover:bg-on-surface/[0.04] hover:text-on-surface"
        }`}
      >
        <Bell className="h-[19px] w-[19px]" strokeWidth={1.75} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-white" aria-hidden="true" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-[70] mt-2 w-[min(360px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl bg-white shadow-float"
          >
            <div className="flex items-center justify-between border-b border-on-surface/[0.06] px-4 py-3">
              <h3 className="text-[14px] font-semibold text-on-surface">Notifications</h3>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="rounded text-[12px] font-semibold text-primary hover:text-primary-dim">
                  Mark All Read
                </button>
              )}
            </div>
            <ul className="max-h-[360px] overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-[13px] text-on-surface-variant">
                  <BellOff className="h-5 w-5" aria-hidden="true" />
                  You’re all caught up.
                </li>
              ) : (
                items.map((n) => {
                  const cfg = ICONS[n.type] ?? ICONS.info;
                  const Icon = cfg.icon;
                  const body = (
                    <>
                      <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.cls}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold text-on-surface">{n.title}</span>
                          {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                        </span>
                        <span className="mt-0.5 block break-words text-[12px] leading-relaxed text-on-surface-variant">{n.message}</span>
                        <span className="mt-1 block text-[11px] text-on-surface-variant/70">{n.timestamp}</span>
                      </span>
                    </>
                  );
                  const cls = `flex gap-3 px-4 py-3 text-left transition-colors hover:bg-marshmallow/60 ${!n.isRead ? "bg-primary/[0.03]" : ""}`;
                  return (
                    <li key={n.id} className="border-b border-on-surface/[0.04] last:border-0">
                      {n.link ? (
                        <Link href={n.link} className={cls} onClick={() => setOpen(false)}>
                          {body}
                        </Link>
                      ) : (
                        <div className={cls}>{body}</div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
