self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

// ─── Push Notifications ──────────────────────────────────────────────────────
// Compatible with iOS Safari 16.4+ (PWA installed) and Android Chrome.
// The payload from the backend must be JSON: { title, body, icon?, badge?, link? }
// ──────────────────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Reclaim", body: event.data.text() };
  }

  const title = payload.title || "Reclaim";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    tag: payload.tag || "reclaim-notification",
    data: {
      link: payload.link || "/",
      ...payload.data,
    },
    requireInteraction: false,
    // iOS doesn't support actions yet, but we can include them for Android
    actions: payload.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const link = event.notification.data?.link || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If an existing tab is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url === link && "focus" in client) {
            return client.focus();
          }
        }
        // If a Reclaim tab exists but on a different route, focus and navigate
        for (const client of clientList) {
          if ("focus" in client && "navigate" in client) {
            client.focus();
            return client.navigate(link);
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(link);
        }
      })
  );
});
