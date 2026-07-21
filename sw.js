const CACHE = 'scoreteller-v2-1';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/js/app.js',
  '/js/ui.js',
  '/js/data.js',
  '/js/supabase.js',
  '/js/gameLogic.js',
  '/js/screens/home.js',
  '/js/screens/newSession.js',
  '/js/screens/scoreboard.js',
  '/js/screens/end.js',
  '/js/screens/players.js',
  '/js/screens/games.js',
  '/js/screens/stats.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Network-first: probeer netwerk, val terug op cache */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // Supabase/CDN niet cachen

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
