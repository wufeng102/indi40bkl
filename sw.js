/**
 * Service worker — satu file ini dipakai bersama oleh aplikasi mahasiswa
 * (index.html) DAN dashboard dosen (dashboard.html), supaya keduanya bisa
 * di-"Install" sebagai aplikasi terpisah dan tetap bisa DIBUKA walau sinyal
 * nol (tampilan appnya, bukan datanya — data wawancara tetap diatur oleh
 * antrean di app.js, file ini sama sekali tidak menyentuh itu).
 *
 * PENTING kalau Anda mengedit file aplikasi (style.css/items.js/app.js/
 * dashboard.js/dst): naikkan angka di CACHE_NAME baris di bawah (mis. 'v2'
 * -> 'v3'), lalu commit ulang. Tanpa itu, HP yang sudah pernah membuka
 * aplikasi bisa tetap memakai file LAMA yang tersimpan di cache.
 */
var CACHE_NAME = 'indi40-umkm-shell-v2';

// Hanya file "cangkang" aplikasi (bukan data) yang disimpan di cache.
// v2: menambahkan dashboard.html/.css/.js + manifest-dashboard.json supaya
// dashboard (dosen) juga bisa di-"Install" dan dibuka tanpa sinyal, sebagai
// aplikasi terpisah dari aplikasi mahasiswa (index.html).
var FILE_CANGKANG = [
  './',
  './index.html',
  './style.css',
  './items.js',
  './app.js',
  './config.js',
  './manifest.json',
  './dashboard.html',
  './dashboard.css',
  './dashboard.js',
  './manifest-dashboard.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(FILE_CANGKANG);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.filter(function (n) { return n !== CACHE_NAME; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  // JANGAN pernah ikut campur selain GET (mis. POST kirim data ke Apps
  // Script) atau permintaan ke domain lain (Apps Script/Drive/Claude) —
  // itu harus selalu langsung ke jaringan, tidak boleh "dijawab" dari cache.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Stale-while-revalidate: langsung balas dari cache kalau ada (cepat +
  // tetap bisa dibuka tanpa sinyal), sambil diam-diam ambil versi terbaru
  // dari jaringan untuk dipakai lain kali.
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req).then(function (cached) {
        var jaringan = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(function () { return cached; });
        return cached || jaringan;
      });
    })
  );
});
