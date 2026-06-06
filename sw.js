// Wispr Stories — service worker
//
// Goal: make the app installable and usable offline. Voice recording,
// rewrites, uploads, and STT all need the network — those requests bypass
// the cache and fail gracefully when offline. The static shell (HTML/CSS/JS/
// fonts/icons) is cached so the app boots instantly on revisit.
//
// Cache strategy:
//   - HTML and JS              → network-first (always fetch latest when
//                                online; fall back to cache when offline)
//   - CSS and static assets    → cache-first (fast on repeat visits)
//   - Cross-origin (fonts etc) → stale-while-revalidate
//   - /api/* and /c/*          → network-only (never cached)
//
// Cache lifecycle:
//   CACHE_NAME is a stable identifier — no version number needed.
//   Because HTML and JS use network-first, users always get fresh code when
//   online. Only change CACHE_NAME when you want to force a full cache
//   flush across all existing users (rare — major structural changes only).

const CACHE_NAME = 'wispr-stories-shell-v12';

// Files seeded into the cache on install so the app works on first
// offline visit. Keep this list to the true shell only — every entry
// must succeed or the entire install fails.
const PRECACHE_URLS = [
  '/',
  '/wisprstories.html',
  '/wisprstories.js',
  '/site.webmanifest',
  '/assets/ws-logo-blwbg.png',
  '/assets/ws-logo-wh.png',
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

  // Skip non-HTTP(S) schemes (e.g. chrome-extension://) — Cache API doesn't
  // support them and trying to put() these URLs throws unhandled rejections.
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // Same-origin dynamic routes — always go to network. Never cache API
  // responses or share-link lookups.
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/c/')) {
      return; // browser handles it; we don't intercept
    }
  }

  // Vercel Blob storage — bypass the SW entirely. The browser loads these
  // directly via <img> (covered by img-src CSP). Intercepting them here
  // causes fetch() calls that hit connect-src and get blocked.
  if (url.hostname.endsWith('.blob.vercel-storage.com')) {
    return; // browser handles it; we don't intercept
  }

  // Cross-origin (Google Fonts, etc.) — stale-while-revalidate so updates
  // arrive on the next visit but offline still works.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          const fetchPromise = fetch(req)
            .then((resp) => {
              // Only cache explicit CORS responses (type === 'cors', status 200).
              // Opaque (no-cors), opaque-redirect, and error responses must not
              // be passed to cache.put() — they throw NetworkError unhandled.
              if (resp && resp.status === 200 && resp.type === 'cors') {
                cache.put(req, resp.clone()).catch(() => {});
              }
              return resp;
            })
            .catch(() => cached || new Response('', { status: 503, statusText: 'Offline' }));
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // HTML — network-only. Never cache HTML so users always get fresh version
  // on every navigation. Fall back to cached shell only when offline.
  const isHtml = url.pathname === '/' || url.pathname.endsWith('.html');

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .catch(() =>
          caches.match(req).then((cached) =>
            cached || caches.match('/wisprstories.html')
          )
        )
    );
    return;
  }

  // JS — network-first. Always fetch latest when online; cache for offline.
  // Fall back to cache only when offline.
  if (url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Everything else (CSS, images, fonts, icons) — cache-first for speed,
  // populate on miss, offline fallback to cached shell.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone)).catch(() => {});
        }
        return resp;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('/wisprstories.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
