// ═══════════════════════════════════════════════════════════════════════════════
// SOMOPA.ste — Push Notification Service Worker
// Place at: public/sw.js
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'somopa-push-v1';

// ── Install ──
self.addEventListener('install', (event) => {
  console.log('[SW] Push service worker installed');
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Push service worker activated');
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ── Push Event ──
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'SOMOPA.ste',
    body: 'Vous avez une nouvelle notification',
    icon: '/brand/logo.png',
    badge: '/brand/logo.png',
    url: '/',
    tag: 'somopa-notification',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Voir' },
      { action: 'dismiss', title: 'Fermer' },
    ],
    data: {
      url: data.url,
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click ──
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Push Subscription Change ──
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      // The new VAPID key should be fetched from server
    }).then((subscription) => {
      // Send new subscription to server
      return fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys,
        }),
      });
    }).catch((err) => {
      console.error('[SW] Failed to resubscribe:', err);
    })
  );
});