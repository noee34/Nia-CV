// Service worker: guarda la app en caché para abrirla y usarla sin conexión.
// Los REGISTROS no pasan por aquí: viven en IndexedDB en el dispositivo.
const VERSION = 'nia-cv-v1.6.0';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/app.js', './js/store.js', './js/dates.js', './js/stats.js', './js/ui.js', './js/art.js',
  './js/forms.js', './js/data-io.js', './js/sync.js', './js/remote-supabase.js', './js/config.js',
  './js/auth.js', './js/account.js', './js/theme.js', './js/characters.js', './js/photo.js', './js/vendor/supabase.js',
  './js/views/common.js', './js/views/today.js', './js/views/bottles.js', './js/views/poops.js',
  './js/views/diary.js', './js/views/settings.js', './js/views/profile.js',
  './fonts/cormorant-garamond-latin-500-normal.woff2', './fonts/cormorant-garamond-latin-600-normal.woff2',
  './fonts/cormorant-garamond-latin-500-italic.woff2', './fonts/dm-sans-latin-400-normal.woff2',
  './fonts/dm-sans-latin-500-normal.woff2', './fonts/dm-sans-latin-600-normal.woff2',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Primero la caché (arranque instantáneo y sin conexión); se actualiza en segundo plano.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) return cached;
      const res = await network;
      return res || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
    }),
  );
});
