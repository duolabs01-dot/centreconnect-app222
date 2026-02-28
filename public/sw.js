const CACHE_NAME = 'cc-v4-premium';
const OFFLINE_URL = '/offline'; // Create a simple offline page or fallback

const ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/centreconnect-logo.svg',
  '/globals.css',
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

// Network-first for dynamic content, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // For navigation requests, try network first, then cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((response) => {
          return response || caches.match('/offline');
        });
      })
    );
    return;
  }

  // Cache-first for images/fonts, network-first for others
  const isAsset = ['image', 'font', 'style', 'script'].includes(request.destination);

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
  } else {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});

// Background Sync for failed applications (example)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-applications') {
    event.waitUntil(sendPendingApplications());
  }
});

async function sendPendingApplications() {
  // Logic to read from IndexedDB and send to API
  console.log('Background Sync: Sending pending applications...');
}

// Push notifications support
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'CentreConnect';
  const options = {
    body: data.body ?? 'Update from your ECD centre',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
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
