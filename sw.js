const CACHE = 'kosmos-v2';
const STATIC = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/ui.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];
const API_HOST = 'kosmos-backend-1.onrender.com';

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(STATIC); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  if (url.hostname === API_HOST || url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    e.respondWith(
      fetch(e.request).catch(function() { return new Response(JSON.stringify({error:'offline'}), {headers:{'Content-Type':'application/json'}}); })
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        var network = fetch(e.request).then(function(resp) {
          if (resp && resp.status === 200) cache.put(e.request, resp.clone());
          return resp;
        }).catch(function() { return cached; });
        return cached || network;
      });
    })
  );
});
