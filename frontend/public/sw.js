const CACHE_NAME = 'bizora-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install Event - Pre-cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core assets...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Pre-caching error (some optional assets could not be cached):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  // Ignore non-http(s) schemes (e.g. chrome-extension://, moz-extension://, blob:)
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // 1. Cache critical GET API responses (Network-First strategy)
  if (event.request.method === 'GET' && (
    requestUrl.pathname === '/api/business/config' || 
    requestUrl.pathname === '/api/health' || 
    requestUrl.pathname.startsWith('/api/users')
  )) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache if network is unavailable/offline
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline JSON response fallback
            return new Response(
              JSON.stringify({ 
                error: true, 
                offline: true, 
                message: 'You are offline. Serving offline cached configuration template.',
                taxRegions: [
                  { id: "default", name: "Default (15% VAT)", rate: 15 },
                  { id: "zero", name: "Zero Rated (0%)", rate: 0 }
                ],
                plans: {
                  Basic: { limitStores: 1 },
                  "Nexus Pro": { limitStores: 10 }
                }
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // 2. Handle non-cached or non-GET API calls (Network Only)
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return a offline-friendly JSON response for API routes when offline
        return new Response(
          JSON.stringify({ 
            error: true, 
            offline: true, 
            message: 'You are offline. Actions will be synchronized locally in offline database.' 
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 2. Ignore non-GET requests for caching
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // 3. Cache-First with Stale-While-Revalidate fallback for local and CDN assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version immediately, but refresh local assets / CDN scripts in the background
        if (
          requestUrl.origin === self.location.origin || 
          requestUrl.href.includes('esm.sh') ||
          requestUrl.href.includes('tailwindcss.com') ||
          requestUrl.href.includes('googleapis.com') ||
          requestUrl.href.includes('gstatic.com')
        ) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => { /* Ignore background update network failure */ });
        }
        return cachedResponse;
      }

      // Fetch from network, then cache dynamically
      return fetch(event.request).then((networkResponse) => {
        // Only cache valid GET responses
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        // If network request failed (e.g. user is completely offline)
        // Check if request is for document navigation, return index.html shell
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') || caches.match('/');
        }
        console.warn('[Service Worker] Fetch failed for offline resource:', event.request.url, err);
      });
    })
  );
});
