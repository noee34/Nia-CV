// Service worker: guarda la app en caché para abrirla y usarla sin conexión.
// Los REGISTROS no pasan por aquí: viven en IndexedDB en el dispositivo.
const VERSION = 'nia-cv-v1.10.1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/app.js', './js/store.js', './js/dates.js', './js/stats.js', './js/ui.js', './js/art.js',
  './js/forms.js', './js/data-io.js', './js/sync.js', './js/remote-supabase.js', './js/config.js',
  './js/auth.js', './js/account.js', './js/theme.js', './js/characters.js', './js/photo.js', './js/vendor/supabase.js',
  './js/views/common.js', './js/views/today.js', './js/views/bottles.js', './js/views/poops.js',
  './js/views/diary.js', './js/views/settings.js', './js/views/profile.js', './js/views/medicine.js', './js/medical.js', './js/views/meds-view.js', './js/meds.js', './js/solids.js', './js/views/solids-view.js',
  './fonts/cormorant-garamond-latin-500-normal.woff2', './fonts/cormorant-garamond-latin-600-normal.woff2',
  './fonts/cormorant-garamond-latin-500-italic.woff2', './fonts/dm-sans-latin-400-normal.woff2',
  './fonts/dm-sans-latin-500-normal.woff2', './fonts/dm-sans-latin-600-normal.woff2',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' → descarga siempre del servidor (no de la caché HTTP del navegador),
  // para que una versión nueva no se guarde con archivos antiguos.
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Primero la red (así siempre se ve la última versión publicada); si no hay conexión
// o tarda más de 3 s, se usa la copia guardada.
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const network = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    const timeout = new Promise((r) => setTimeout(() => r(null), 3000));
    const fresh = await Promise.race([network, timeout]);
    if (fresh) return fresh;
    const cached = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
    return cached || (await network) || Response.error();
  })());
});
