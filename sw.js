/**
 * NoteCraft - Service Worker for Offline PWA Support
 * Uses Cache-First & Stale-While-Revalidate strategies to enable 100% offline note-taking.
 */

const CACHE_NAME = 'notecraft-cache-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/editor.css',
  './css/canvas.css',
  './js/bundle.js',
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js'
];

// 1. Install: Cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache local files first
      const localAssets = STATIC_ASSETS.filter(url => !url.startsWith('http'));
      await cache.addAll(localAssets);

      // Attempt CDN resources without blocking if offline during install
      const cdnAssets = STATIC_ASSETS.filter(url => url.startsWith('http'));
      await Promise.allSettled(cdnAssets.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Stale-While-Revalidate for app assets, bypass firestore api
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET and Firebase backend APIs (handled by Firestore offline persistence / SDK)
  if (req.method !== 'GET') return;
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('securetoken.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      // Fetch in background to update cache (Stale-While-Revalidate)
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, fallback to index.html for navigation
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
