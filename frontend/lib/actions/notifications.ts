"use server";

// ─── Notifications Server Actions ─────────────────────────────────────────────
// Provides notification data for the TopNav bell dropdown.
// Falls back to mock data until the backend endpoint is built.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost, API_PREFIX } from "@/lib/api/client";
import type { Notification } from "@/lib/api/types";

// ─── Mock Fallback ───────────────────────────────────────────────────────────

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    type: "success",
    title: "Claim #RC-8891 Approved",
    message:
      "Your claim for $124.50 has been approved and moved to payouts.",
    timestamp: "2 hours ago",
    isRead: false,
    link: "/employee/history?id=RC-8891",
  },
  {
    id: "notif-2",
    type: "warning",
    title: "Action Required: Claim #RC-8885",
    message:
      "Please provide an itemized receipt for the laptop purchase.",
    timestamp: "1 day ago",
    isRead: false,
    link: "/employee/history?id=RC-8885",
  },
  {
    id: "notif-3",
    type: "info",
    title: "System Maintenance",
    message:
      "Reclaim will undergo scheduled maintenance this Friday at 2AM EST.",
    timestamp: "2 days ago",
    isRead: true,
  },
];

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Fetch all notifications for the current user. */
export async function getNotifications(): Promise<Notification[]> {
  const result = await apiGet<Notification[]>(`${API_PREFIX}/notifications/`);
  return result.data ?? MOCK_NOTIFICATIONS;
}

/** Mark all notifications as read. */
export async function markAllNotificationsRead(): Promise<void> {
  await apiPost(`${API_PREFIX}/notifications/read-all`);
}
