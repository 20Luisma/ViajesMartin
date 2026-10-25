const CACHE_NAME = 'vuelos-martin-v1';
const STATIC_ASSETS = [
  './',
  'css/style.css',
  'js/app.js',
  'manifest.json',
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

// Network-first strategy: API y datos siempre frescos, app shell en caché
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Peticiones a API y datos de vuelos siempre directos a red
  if (url.pathname.includes('api.php') || url.pathname.includes('data/deals.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

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
