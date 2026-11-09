"use client";

// ─── Push Permission Prompt ──────────────────────────────────────────────────
// Inline banner shown once to users with default notification permission.
// iOS users are informed they need to install the PWA first.
// ──────────────────────────────────────────────────────────────────────────────

import { Bell, X } from "lucide-react";
import { usePushNotifications } from "./PushNotificationProvider";
import { isIosPwaInstalled, isStandaloneDisplayMode, isPushSupported } from "@/lib/push/subscription";

export default function PushPermissionPrompt() {
  const { showPrompt, subscribe, dismissPrompt } = usePushNotifications();

  if (!showPrompt) return null;
  if (!isPushSupported()) return null;

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const needsPwaInstall = isIos && !isStandaloneDisplayMode();

  return (
    <div role="dialog" aria-label="Enable notifications" className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[60] rounded-2xl bg-white px-4 py-3 shadow-float sm:inset-x-auto sm:left-1/2 sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 lg:bottom-5">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex-shrink-0 mt-0.5 sm:mt-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-on-surface">
            Stay in the loop
          </p>
          {needsPwaInstall ? (
            <p className="text-xs text-on-surface-variant mt-0.5">
              To receive push notifications on iOS, please install this app:
              tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="text-xs text-on-surface-variant mt-0.5">
              Enable push notifications to get real-time updates about your
              reimbursement claims.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!needsPwaInstall && (
            <button
              onClick={subscribe}
              className="text-[13px] font-semibold h-9 px-4 rounded-full bg-primary text-white hover:bg-primary-dim transition-colors active:scale-95"
            >
              Enable
            </button>
          )}
          <button
            onClick={dismissPrompt}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface transition-colors"
            aria-label="Dismiss notification prompt"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
