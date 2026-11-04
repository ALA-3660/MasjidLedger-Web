const CACHE_NAME = 'masjidledger-static-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Install Event: Cache static shell and skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up all old caches (v1, demo caches) immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Purging old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Strategy based on request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. ALL API requests and WebSockets are STRICTLY NETWORK-ONLY.
  // Never serve cached API responses for settings, financial data, prayers, or portal data.
  const isApi = url.pathname.startsWith('/api/');
  const isWebSocket = url.protocol === 'ws:' || url.protocol === 'wss:' || url.pathname.includes('/ws');
  const isMutation = event.request.method !== 'GET';

  if (isWebSocket || isMutation || isApi) {
    // Strictly network-only - NEVER read from or write to Cache Storage
    event.respondWith(
      fetch(event.request).catch(() => {
        if (isApi) {
          return new Response(JSON.stringify({ success: false, error: { code: 'NETWORK_OFFLINE', message: 'ইন্টারনেট সংযোগ বিচ্ছিন্ন রয়েছে।' } }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
    return;
  }

  // For static assets: Cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update static cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
