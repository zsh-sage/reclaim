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
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-2xl flex items-start gap-3 sm:items-center">
        <div className="flex-shrink-0 mt-0.5 sm:mt-0">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-emerald-700" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Stay in the loop
          </p>
          {needsPwaInstall ? (
            <p className="text-xs text-gray-600 mt-0.5">
              To receive push notifications on iOS, please install this app:
              tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="text-xs text-gray-600 mt-0.5">
              Enable push notifications to get real-time updates about your
              reimbursement claims.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!needsPwaInstall && (
            <button
              onClick={subscribe}
              className="text-xs font-medium px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors active:scale-95"
            >
              Enable
            </button>
          )}
          <button
            onClick={dismissPrompt}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Dismiss notification prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
