const CACHE = 'ventas-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './assets/styles.css',
  './assets/app.js',
  './assets/api.js',
  './manifest.webmanifest'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.map(k=>k!==CACHE && caches.delete(k))
  )));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  if(e.request.method==='GET'){
    e.respondWith(caches.match(e.request).then(resp=> resp || fetch(e.request)));
  }
});
