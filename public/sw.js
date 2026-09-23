/**
 * KisanSahay Service Worker
 * Strategy: Cache-First for static application shell, Network-first for dynamic API endpoints.
 * Includes Web Push notifications for farmer EMI reminders and scheme updates.
 */

const CACHE_NAME = 'kisansahay-v1';

// Pre-cached application shell
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/schemes_data.js',
  '/categories_data.js',
  '/different_languages.js',
  '/multiuser.js',
  '/voice_input.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ==========================================================================
// 1. Install Event — Pre-cache Shell Assets
// ==========================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[KisanSahay SW] Pre-caching application shell...');
      try {
        await cache.addAll(SHELL_ASSETS);
        console.log('[KisanSahay SW] All shell assets cached successfully.');
      } catch (err) {
        console.warn('[KisanSahay SW] Failed to cache some shell assets:', err);
      }
    }).then(() => self.skipWaiting())
  );
});

// ==========================================================================
// 2. Activate Event — Clean Up Outdated Caches
// ==========================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[KisanSahay SW] Removing obsolete cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==========================================================================
// 3. Fetch Event — Cache-First for Shell, Network-First for API
// ==========================================================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Strategy A: Network-First with Cache/Offline Fallback for API Endpoints
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If response is valid, clone and store in cache
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallback to cached API response if available
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return an informative offline JSON payload
          return new Response(
            JSON.stringify({
              offline: true,
              message: 'You are currently offline. Displaying cached local data.',
              timestamp: new Date().toISOString()
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Strategy B: Cache-First for App Shell, CSS, JS, Images, Icons, and Fonts
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache immediately
        return cachedResponse;
      }

      // Not in cache: fetch from network, then cache dynamically
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(async () => {
          // If navigation request (HTML page) fails, serve cached index.html
          if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
            const fallbackIndex = await caches.match('/index.html') || await caches.match('/');
            if (fallbackIndex) return fallbackIndex;
          }
        });
    })
  );
});

// ==========================================================================
// 4. Push Event — Farmer Reminders & Alert Notifications
// ==========================================================================
self.addEventListener('push', function (event) {
  let data = {
    title: '🌾 KisanSahay Alert',
    body: 'Upcoming EMI due reminder or new government scheme update.',
    url: '/'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || data.message,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ==========================================================================
// 5. Notification Click Event — Open or Focus KisanSahay Window
// ==========================================================================
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
