const CACHE_NAME = 'cc-v5-ultra';
const OFFLINE_URL = '/offline';

const ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/centreconnect-logo.svg',
  '/offline'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Advanced PWA Strategy: Stale-While-Revalidate for everything except API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and API calls
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  // For portal routes, use Stale-While-Revalidate for "Instant" feel
  const isPortal = url.pathname.startsWith('/parent') || url.pathname.startsWith('/ecd') || url.pathname.startsWith('/directory');

  if (isPortal || request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchedResponse = fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // If network fails and no cache, fallback to offline
            return cachedResponse || caches.match(OFFLINE_URL);
          });

          return cachedResponse || fetchedResponse;
        });
      })
    );
    return;
  }

  // Cache-first for static assets (images, fonts, styles)
  const isAsset = ['image', 'font', 'style', 'script'].includes(request.destination) || 
                  url.pathname.includes('/_next/static/');

  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});

// Listen for messages to clear cache (e.g., on sign out)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'CentreConnect';
  const options = {
    body: data.body ?? 'Update from your ECD centre',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url ?? '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
