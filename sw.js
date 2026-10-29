const CACHE_NAME = 'agent-2d-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Instantly activate new service worker
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('Cache error:', err));
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim()) // Immediately take control of open PWA clients
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Network-First for HTML navigation so GitHub updates appear instantly
  if (e.request.mode === 'navigate' || e.request.destination === 'document' || e.request.url.includes('.html')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(e.request).then(res => res || caches.match('./index.html')))
    );
    return;
  }

  // Stale-While-Revalidate for other static assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {});
      return cached || fetchPromise;
    })
  );
});
