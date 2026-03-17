const CACHE_NAME = 'cc-v9-auth-fresh';
const OFFLINE_URL = '/offline';

const ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
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
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  const isPortal =
    url.pathname.startsWith('/parent') ||
    url.pathname.startsWith('/ecd') ||
    url.pathname.startsWith('/directory') ||
    url.pathname.startsWith('/admin');
  const isNavigation = request.mode === 'navigate' || request.destination === 'document';
  const isAuthPage =
    url.pathname === '/login' ||
    url.pathname === '/register' ||
    url.pathname === '/ecd/login' ||
    url.pathname === '/account/activate';
  const isNextScript = request.destination === 'script' || url.pathname.includes('/_next/static/');

  if (isAuthPage && isNavigation) {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (isPortal || isNavigation) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(request)
          .then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() =>
            cache.match(request).then((cachedResponse) => cachedResponse || caches.match(OFFLINE_URL))
          )
      )
    );
    return;
  }

  if (isNextScript) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(request)
          .then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => cache.match(request))
      )
    );
    return;
  }

  const isAsset = ['image', 'font', 'style'].includes(request.destination);

  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});

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
