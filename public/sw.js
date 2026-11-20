const STATIC_CACHE = 'masjidledger-static-v4';
const RUNTIME_CACHE = 'masjidledger-runtime-v4';
const FONTS_CACHE = 'masjidledger-fonts-v4';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/mosque_dome_logo.jpg',
];

function isViteDevRequest(url) {
  const p = url.pathname;
  return (
    p.startsWith('/src/') ||
    p.startsWith('/node_modules/') ||
    p.startsWith('/@vite/') ||
    p.startsWith('/@react-refresh') ||
    p.startsWith('/@fs/') ||
    p.startsWith('/@id/') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t') ||
    url.searchParams.has('import')
  );
}

// Install: Pre-cache essential app shell & PWA assets gracefully
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up outdated cache versions immediately
self.addEventListener('activate', (event) => {
  const validCaches = new Set([STATIC_CACHE, RUNTIME_CACHE, FONTS_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (!validCaches.has(name)) {
              return caches.delete(name);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Allow clients to trigger immediate activation on update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP(S) schemes (chrome-extension, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 0. Never intercept or cache Vite dev server module/dependency requests
  if (url.origin === self.location.origin && isViteDevRequest(url)) {
    return;
  }

  // 1. API requests, WebSockets, and non-GET mutations: STRICTLY NETWORK-ONLY
  const isApi = url.pathname.startsWith('/api/');
  const isWs = url.pathname.includes('/ws');
  if (isApi || isWs || request.method !== 'GET') {
    event.respondWith(
      fetch(request).catch(() => {
        if (isApi) {
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              error: {
                code: 'NETWORK_OFFLINE',
                message: 'অফলাইন মোড: ইন্টারনেট সংযোগ বিচ্ছিন্ন রয়েছে। সংযোগ ফিরে এলে পুনরায় চেষ্টা করুন।',
              },
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        }
        return new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // 2. Google Fonts: Cache-First so Bengali fonts work reliably offline
  if (
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(FONTS_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((networkRes) => {
              if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
                cache.put(request, networkRes.clone());
              }
              return networkRes;
            })
            .catch(() => cached || new Response('', { status: 408 }));
        })
      )
    );
    return;
  }

  // 3. Page Navigation Requests: Network-First with App Shell + Offline Page Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put('/index.html', copy));
          }
          return networkRes;
        })
        .catch(async () => {
          const cachedShell = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cachedShell) return cachedShell;
          const offlineFallback = await caches.match('/offline.html');
          if (offlineFallback) return offlineFallback;
          return new Response(
            '<html lang="bn"><body style="font-family:sans-serif;text-align:center;padding:40px;"><h2>অফলাইন মোড</h2><p>ইন্টারনেট সংযোগ বিচ্ছিন্ন রয়েছে।</p></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 4. Same-origin Production Static Assets (/assets/*, images, icons, manifest): Stale-While-Revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
              const copy = networkRes.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});
