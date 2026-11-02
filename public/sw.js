const CACHE_NAME = 'vuelos-martin-v9';
const STATIC_ASSETS = [
  './',
  'css/style.css?v=4.7',
  'js/app.js?v=4.7',
  'manifest.json',
  'data/trips.json',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Network-first con fallback a caché para viajes y estáticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Peticiones de rastreo o reenvío no se cachean
  if (url.search.includes('action=scan') || url.search.includes('action=send_telegram') || url.search.includes('action=trip_copilot')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para trips y app shell: intenta red primero, si falla (offline en Fez), sirve desde caché
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
