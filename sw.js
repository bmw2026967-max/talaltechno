/* ==========================================================================
   طلال تكنو — Service Worker (offline-first shell)
   ========================================================================== */
const VERSION = 'talaltechno-v1.0.1';
const SHELL = [
  './',
  './index.html',
  './emenu.html',
  './manifest.webmanifest',
  './manifest-emenu.webmanifest',
  './assets/favicon.svg',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './assets/css/app.css',
  './assets/css/emenu.css',
  './assets/js/vendor/qrcode.js',
  './assets/js/core/utils.js',
  './assets/js/core/db.js',
  './assets/js/core/restaurant.js',
  './assets/js/core/zatca.js',
  './assets/js/core/integrations.js',
  './assets/js/core/accounting.js',
  './assets/js/core/seed.js',
  './assets/js/core/ui.js',
  './assets/js/core/actions.js',
  './assets/js/core/pwa.js',
  './assets/js/pages/shared.js',
  './assets/js/pages/dashboard.js',
  './assets/js/pages/pos.js',
  './assets/js/pages/kds.js',
  './assets/js/pages/tables.js',
  './assets/js/pages/emenu.js',
  './assets/js/pages/products.js',
  './assets/js/pages/inventory.js',
  './assets/js/pages/sales.js',
  './assets/js/pages/purchases.js',
  './assets/js/pages/contacts.js',
  './assets/js/pages/accounting-page.js',
  './assets/js/pages/treasury.js',
  './assets/js/pages/reports.js',
  './assets/js/pages/loyalty.js',
  './assets/js/pages/shifts.js',
  './assets/js/pages/zatca-page.js',
  './assets/js/pages/integrations.js',
  './assets/js/pages/users.js',
  './assets/js/pages/settings.js',
  './assets/js/app.js',
  './assets/js/emenu.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).catch((err) => {
      console.warn('SW precache incomplete', err);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => hit))
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || new Response('', { status: 503, statusText: 'Offline' })))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
