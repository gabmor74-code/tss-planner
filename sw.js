/* TSS Planner - planner only v8.9.1 */
const CACHE = 'tss-planner-v8.9.1.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE) ? null : caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try{
      const fresh = await fetch(req);
      // cache same-origin only
      const url = new URL(req.url);
      if (url.origin === self.location.origin) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    }catch(e){
      // fallback to app shell
      return (await cache.match('./index.html')) || new Response('Offline', {status: 503});
    }
  })());
});
