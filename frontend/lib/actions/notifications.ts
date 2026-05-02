"use server";

// ─── Notifications Server Actions ─────────────────────────────────────────────
// Provides notification data for the TopNav bell dropdown.
// Backend is DB-backed and may prepend an ephemeral GLM-fallback notification
// (sentinel UUID 00000000-0000-0000-0000-000000000fa1) when the model is degraded.
// ──────────────────────────────────────────────────────────────────────────────

import { apiGet, apiPost, apiDelete, API_PREFIX } from "@/lib/api/client";
import type { Notification } from "@/lib/api/types";
import type { PushSubscriptionJSON } from "@/lib/push/subscription";

interface BackendNotification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function mapNotification(n: BackendNotification): Notification {
  return {
    id: n.notification_id,
    type: (n.type as Notification["type"]) || "info",
    title: n.title,
    message: n.message,
    timestamp: n.created_at
      ? new Date(n.created_at).toLocaleDateString("en-MY", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    isRead: n.is_read,
    link: n.link || undefined,
  };
}

export async function getNotifications(): Promise<Notification[]> {
  const result = await apiGet<BackendNotification[]>(`${API_PREFIX}/notifications/`);
  if (result.data) return result.data.map(mapNotification);
  return [];
}

export async function getUnreadCount(): Promise<number> {
  const result = await apiGet<{ count: number }>(`${API_PREFIX}/notifications/unread-count`);
  return result.data?.count ?? 0;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPost(`${API_PREFIX}/notifications/read-all`);
}

export async function savePushSubscription(
  subscription: PushSubscriptionJSON
): Promise<void> {
  await apiPost(`${API_PREFIX}/push/subscribe`, subscription);
}

export async function removePushSubscription(): Promise<void> {
  await apiDelete(`${API_PREFIX}/push/unsubscribe`);
}

export async function getVapidPublicKeyAction(): Promise<string | null> {
  const result = await apiGet<{ public_key: string }>(`${API_PREFIX}/push/vapid-public-key`);
  return result.data?.public_key ?? null;
}
