// Wispr Stories — service worker
//
// Goal: make the typing path installable + usable offline. Voice recording,
// rewrites, uploads, and STT all need the network — those requests bypass
// the cache and fail fast when offline. Static shell (HTML/CSS/JS/fonts/icons)
// is served cache-first so the app boots instantly on revisit.
//
// Cache lifecycle:
//   - Version is baked into CACHE_NAME. Bump it on any shell change.
//   - On `activate`, all caches not matching the current name are deleted.
//
// Network rules:
//   - Same-origin /api/* and /c/*       → network-only (never cached)
//   - Cross-origin (fonts, CDNs)        → stale-while-revalidate
//   - Same-origin everything else       → cache-first, populate on miss

const CACHE_NAME = 'wispr-stories-v0.9.3';

// Files cached on install so the app shell works on first offline visit.
// Keep this list minimal — every entry must succeed or install fails.
const PRECACHE_URLS = [
  '/',
  '/wisprstories.html',
  '/wisprstories.js?v=20260522-v0.9.3',
  '/site.webmanifest',
  '/assets/ws-logo-blwbg.png',
  '/assets/ws-logo-wh.png',
  '/assets/ws-logo-bl.png',
  '/global/styles/main.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never cache POST/PUT/DELETE

  const url = new URL(req.url);

  // Same-origin dynamic routes — always go to network. Caching a rewrite
  // result or a /c/{id} share lookup would serve stale data.
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/c/')) {
      return; // browser handles it; we don't intercept
    }
  }

  // Cross-origin (Google Fonts, etc.) — stale-while-revalidate so updates
  // arrive on the next visit but offline still works.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          const fetchPromise = fetch(req)
            .then((resp) => {
              if (resp && resp.status === 200) cache.put(req, resp.clone());
              return resp;
            })
            .catch(() => cached); // offline fallback
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Same-origin static — cache-first, populate on miss.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        // Only cache OK basic responses (skip opaque/redirects).
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
        }
        return resp;
      }).catch(() => {
        // Offline + not in cache — return the cached shell so navigation
        // requests still resolve to something meaningful.
        if (req.mode === 'navigate') return caches.match('/wisprstories.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
