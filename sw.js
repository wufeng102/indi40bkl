/**
 * Service worker — satu file ini dipakai bersama oleh aplikasi mahasiswa
 * (index.html) DAN dashboard dosen (dashboard.html), supaya keduanya bisa
 * di-"Install" sebagai aplikasi terpisah dan tetap bisa DIBUKA walau sinyal
 * nol (tampilan appnya, bukan datanya — data wawancara tetap diatur oleh
 * antrean di app.js, file ini sama sekali tidak menyentuh itu).
 *
 * PENTING kalau Anda mengedit file aplikasi (style.css/items.js/app.js/
 * dashboard.js/dst): naikkan angka di CACHE_NAME baris di bawah (mis. 'v5'
 * -> 'v6'), lalu commit ulang. Tanpa itu, HP yang sudah pernah membuka
 * aplikasi bisa tetap memakai file LAMA yang tersimpan di cache.
 *
 * KHUSUS config.js: TIDAK berlaku aturan di atas. File itu isinya
 * pengaturan (URL server, nama proyek) yang memang didesain untuk diedit
 * langsung di GitHub kapan saja tanpa commit ulang semua file. Supaya
 * perubahannya langsung kepakai di HP yang sudah install (tidak nunggu versi
 * cache dinaikkan), config.js SENGAJA tidak ikut aturan cache file lain di
 * bawah — lihat penanganan khusus di fetch handler paling bawah.
 */
var CACHE_NAME = 'indi40-umkm-shell-v6';

// Hanya file "cangkang" aplikasi (bukan data) yang disimpan di cache.
// v2: menambahkan dashboard.html/.css/.js + manifest-dashboard.json supaya
// dashboard (dosen) juga bisa di-"Install" dan dibuka tanpa sinyal, sebagai
// aplikasi terpisah dari aplikasi mahasiswa (index.html).
// v3: menambahkan "id" eksplisit di manifest.json & manifest-dashboard.json
// (lihat README — ini supaya Chrome tidak bingung membedakan 2 aplikasi
// yang satu origin/scope).
// v4: config.js sekarang network-first (lihat fetch handler) supaya edit
// ENDPOINT_URL langsung di GitHub tidak lagi butuh HP di-uninstall/pasang
// ulang untuk kepakai.
// v5: dashboard.js — batas waktu tombol "Minta Analisis AI" dinaikkan dari
// 20 detik jadi 90 detik (panggilan Claude lewat GAS memang bisa lebih dari
// 20 detik, itu bukan tanda server bermasalah).
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

  // config.js: NETWORK-FIRST. Ini satu-satunya file yang memang didesain
  // untuk diedit langsung di GitHub tanpa menaikkan CACHE_NAME (isinya
  // ENDPOINT_URL/NAMA_PROYEK, bukan "kode"). Kalau selalu diambil dari
  // jaringan dulu, perubahannya langsung kepakai di HP yang sudah install.
  // Cache cuma dipakai sebagai cadangan kalau benar-benar offline.
  if (/\/config\.js$/.test(new URL(req.url).pathname)) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, res.clone()); });
        }
        return res;
      }).catch(function () {
        return caches.open(CACHE_NAME).then(function (cache) { return cache.match(req); });
      })
    );
    return;
  }

  // File lainnya: stale-while-revalidate — langsung balas dari cache kalau
  // ada (cepat + tetap bisa dibuka tanpa sinyal), sambil diam-diam ambil
  // versi terbaru dari jaringan untuk dipakai lain kali.
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
