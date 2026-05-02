// lib/push/subscription.ts
// Client-side utilities for Web Push API subscription management.
// Works on iOS Safari 16.4+ (installed PWA) and Android Chrome.

import { getVapidPublicKeyAction } from "@/lib/actions/notifications";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

let _cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;
  if (_cachedVapidKey) return _cachedVapidKey;

  try {
    const key = await getVapidPublicKeyAction();
    if (key) _cachedVapidKey = key;
    return key;
  } catch (e) {
    console.warn("[Push] Failed to fetch VAPID public key via server action:", e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padLen = (4 - (base64String.length % 4)) % 4;
  const padded = base64String + "=".repeat(padLen);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  if (outputArray.byteLength !== 65) {
    console.warn(
      `[Push] Unexpected VAPID key length: ${outputArray.byteLength} bytes (expected 65) — key may be invalid`
    );
  }
  return outputArray;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function getPushPermissionState(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  const result = await Notification.requestPermission();
  return result;
}

export async function subscribeToPush(): Promise<PushSubscriptionJSON | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("[Push] Service Worker not supported");
    return null;
  }

  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) {
    console.warn("[Push] No VAPID public key available — is backend running on NEXT_PUBLIC_API_URL?");
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  console.log("[Push] SW registered, scope:", registration.scope);

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    console.log("[Push] Already subscribed, returning existing");
    return existing.toJSON() as PushSubscriptionJSON;
  }

  const applicationServerKey = urlBase64ToUint8Array(vapidKey);
  console.log("[Push] VAPID key length:", applicationServerKey.byteLength, "bytes");
  console.log(
    "[Push] VAPID key hex:",
    Array.from(applicationServerKey.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ") +
      " ... (first byte should be 04 for uncompressed P-256)"
  );
  console.log("[Push] VAPID key raw base64:", vapidKey);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as any,
    });
    console.log("[Push] Subscribed successfully, endpoint:", subscription.endpoint);
    return subscription.toJSON() as PushSubscriptionJSON;
  } catch (err: unknown) {
    const domErr = err as DOMException;
    console.error("[Push] Subscribe failed:", domErr.name, domErr.message);

    if (domErr.name === "InvalidCharacterError") {
      throw new Error("PushRegistration:InvalidVapidKey — the VAPID public key is malformed or not a valid P-256 uncompressed point");
    }
    if (domErr.name === "NotAllowedError") {
      throw new Error("PushRegistration:PermissionDenied — notification permission was not granted");
    }
    if (domErr.name === "AbortError") {
      throw new Error("PushRegistration:Aborted — push service unreachable or subscription was cancelled. This is usually a Chrome/FCM connectivity issue — check VPN/firewall settings or try in an incognito window.");
    }
    throw new Error(`PushRegistration:${domErr.name} — ${domErr.message}`);
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (!existing) return true;
  const ok = await existing.unsubscribe();
  return ok;
}

export function isIosPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    "standalone" in window.navigator &&
    (window.navigator as { standalone?: boolean }).standalone === true;
  return isIos && isStandalone;
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "PushManager" in window && "Notification" in window;
}
