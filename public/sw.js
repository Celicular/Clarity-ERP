// Basic Service Worker to satisfy PWA installation requirements
const CACHE_NAME = 'clarity-pwa-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/login'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
