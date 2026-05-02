"use client";

// ─── Push Notification Provider ──────────────────────────────────────────────
// Wraps the app and auto-manages Web Push subscriptions based on auth state.
// - Subscribes on login when permission == "granted"
// - Prompts once when permission == "default" via PushPermissionPrompt
// - Unsubscribes on logout
// Compatible with iOS Safari 16.4+ (PWA installed) and Android Chrome.
// ──────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getPushPermissionState,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSupported,
} from "@/lib/push/subscription";
import { savePushSubscription, removePushSubscription } from "@/lib/actions/notifications";

interface PushNotificationContextValue {
  permission: NotificationPermission | null;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  showPrompt: boolean;
  dismissPrompt: () => void;
}

const PushNotificationContext = createContext<PushNotificationContextValue>({
  permission: null,
  isSubscribed: false,
  isLoading: false,
  subscribe: async () => {},
  unsubscribe: async () => {},
  showPrompt: false,
  dismissPrompt: () => {},
});

export function usePushNotifications() {
  return useContext(PushNotificationContext);
}

const PROMPT_DISMISSED_KEY = "reclaim_push_prompt_dismissed";

export default function PushNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const hasAutoSubscribed = useRef(false);

  const refreshPermission = useCallback(() => {
    if (!isPushSupported()) return;
    setPermission(getPushPermissionState());
  }, []);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  // Auto-subscribe when user logs in and permission is granted
  useEffect(() => {
    if (!user || !permission || hasAutoSubscribed.current) return;
    if (permission === "granted") {
      hasAutoSubscribed.current = true;
      setIsLoading(true);
      subscribeToPush()
        .then(async (sub) => {
          if (sub) {
            await savePushSubscription(sub);
            setIsSubscribed(true);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [user, permission]);

  // Show prompt once if permission is default and not dismissed before
  useEffect(() => {
    if (!user || !permission) return;
    if (permission === "default") {
      const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY) === "1";
      if (!dismissed) {
        setShowPrompt(true);
      }
    } else {
      setShowPrompt(false);
    }
  }, [user, permission]);

  const handleSubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const newPerm = await requestPushPermission();
      setPermission(newPerm);
      if (newPerm === "granted") {
        const sub = await subscribeToPush();
        if (sub) {
          await savePushSubscription(sub);
          setIsSubscribed(true);
        }
      }
    } catch (err) {
      console.error("[Push] Subscription failed:", err);
    } finally {
      setIsLoading(false);
      setShowPrompt(false);
    }
  }, []);

  const handleUnsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const ok = await unsubscribeFromPush();
      if (ok) {
        await removePushSubscription();
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error("[Push] Unsubscribe failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(PROMPT_DISMISSED_KEY, "1");
  }, []);

  return (
    <PushNotificationContext.Provider
      value={{
        permission,
        isSubscribed,
        isLoading,
        subscribe: handleSubscribe,
        unsubscribe: handleUnsubscribe,
        showPrompt,
        dismissPrompt,
      }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
}
