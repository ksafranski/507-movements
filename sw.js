// Service worker: makes the site installable and fully usable offline.
// Bump VERSION when shipping changes to the app shell.
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const FONTS = 'fonts-v1';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'js/draw.js',
  'js/movements.js',
  'js/search.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache-first (font files never change for a given URL).
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTS).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // App files: network-first so updates show immediately, cache as offline fallback.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone()));
        return res;
      })
      .catch(async () => (await caches.match(req, { ignoreSearch: true }))
        || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())),
  );
});
