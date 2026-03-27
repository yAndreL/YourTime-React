const CACHE_NAME = 'yourtime-v1';
const OFFLINE_BATIDAS_KEY = 'yourtime-offline-batidas';

const STATIC_ASSETS = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_OFFLINE_BATIDAS') {
    syncOfflineBatidas();
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-batidas') {
    event.waitUntil(syncOfflineBatidas());
  }
});

async function syncOfflineBatidas() {
  // Placeholder para sincronização offline -> online
  // A implementação real será feita no OfflineService
}
