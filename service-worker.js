// CoachAndTrack Service Worker
// Handles offline caching and PWA functionality
// Version: bump this when you deploy major changes to force cache refresh

const CACHE_VERSION = 'cat-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Files cached on install (the "app shell")
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png'
];

// URLs that should NEVER be cached (always go to network)
const NEVER_CACHE = [
  'stream.mux.com',           // Mux video streaming
  'image.mux.com',            // Mux thumbnails
  'supabase.co',              // Supabase API
  'stripe.com',               // Stripe payments
  'buy.stripe.com',           // Stripe checkout
  'api.stripe.com',
  'js.stripe.com',
  'googletagmanager.com',     // Google Analytics
  'google-analytics.com',
  '/.netlify/functions/',     // Netlify functions (Stripe webhook, etc.)
  '/api/'                     // API routes
];

// ── INSTALL: Cache the app shell ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// ── ACTIVATE: Clean up old caches ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.startsWith(CACHE_VERSION))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim()) // Take control of open pages
  );
});

// ── FETCH: Smart caching strategy ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip URLs that should never be cached (videos, payments, APIs)
  if (NEVER_CACHE.some((pattern) => url.href.includes(pattern))) {
    return; // Let browser handle normally
  }

  // Skip cross-origin requests we don't control
  if (url.origin !== location.origin && !url.hostname.includes('googleapis.com') && !url.hostname.includes('gstatic.com')) {
    return;
  }

  // HTML pages: Network first, fallback to cache (so users get fresh content)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh HTML for offline use
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline fallback: serve cached version
          return caches.match(request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts): Cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// ── MESSAGE: Handle update prompts from the page ──
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
