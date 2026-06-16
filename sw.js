// Know It All — Service Worker
// Caches the app shell for offline use

const CACHE_NAME = 'know-it-all-v1';
const SHELL_URLS = [
  './',
  './know-it-all.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Nunito+Sans:wght@400;600;700&display=swap',
];

// Install: cache app shell
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache what we can, ignore failures (CDN fonts may block)
      return Promise.allSettled(SHELL_URLS.map(url => cache.add(url)));
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for Firebase/API, cache-first for app shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network for Firebase, Google APIs, CDN resources
  const networkOnly = [
    'firebaseio.com',
    'firebase.googleapis.com',
    'firebaseapp.com',
    'googleapis.com',
    'gstatic.com',
  ];
  if (networkOnly.some(d => url.hostname.includes(d))) {
    return; // Let browser handle it
  }

  // question-bank.js: network-first with cache fallback
  if (url.pathname.includes('question-bank.js')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
