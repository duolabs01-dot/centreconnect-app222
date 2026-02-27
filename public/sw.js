const CACHE_NAME = 'centreconnect-v1-cache';

// Files to cache for app shell
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Add other critical static assets here (e.g., CSS, JS bundles if not handled by Next.js automatically)
  // For Next.js, many JS/CSS assets are generated dynamically, so a more advanced Workbox setup
  // would be ideal for comprehensive app shell caching. This is a basic example.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activates the service worker immediately
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim()) // Takes control of current clients immediately
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  // Strategy for API routes: Network-first
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If network successful, cache and return
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(request)) // Fallback to cache if network fails
    );
    return;
  }

  // Strategy for directory listings: Stale-while-revalidate
  if (requestUrl.pathname.startsWith('/directory') || requestUrl.pathname === '/') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const networkFetch = fetch(request).then(response => {
            // Update cache and return response
            cache.put(request, response.clone());
            return response;
          }).catch(() => {
            // If network fails for revalidate, return cached if available
            return cachedResponse || new Response('<h1>Offline</h1><p>Content not available offline.</p>', {
              headers: { 'Content-Type': 'text/html' }
            }); // Fallback for network failure during revalidation
          });

          // Return cached response immediately if available, otherwise wait for network
          return cachedResponse || networkFetch;
        });
      })
    );
    return;
  }

  // Default strategy: Cache-first, falling back to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request).then((networkResponse) => {
        // If network request succeeds, cache it for future use
        if (networkResponse.ok && request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If both cache and network fail, you might want to show a generic offline page
        return new Response('<h1>Offline</h1><p>Content not available offline.</p>', {
            headers: { 'Content-Type': 'text/html' }
        });
      });
    })
  );
});
