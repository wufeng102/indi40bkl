/**
 * Bank soal INDI 4.0 adaptasi UMKM — dipakai bersama oleh app.js (frontend)
 * dan harus TETAP SINKRON dengan gas/Code.gs (backend, yang menghitung ulang
 * skor secara independen demi keamanan data).
 *
 * Sumber: GForm_INDI40_UMKM/00_ItemBank.gs (25 Sept 2026) dan
 * Lampiran_B_F_RisetMu_SektorDagangJasa.docx (adaptasi sektor dagang-jasa).
 *
 * STATUS DRAF — instrumen ini belum melalui validasi pakar (I-CVI). Jangan
 * dipakai untuk wawancara sungguhan sebelum Langkah 3 (I-CVI) selesai dan
 * redaksi dikunci oleh dosen pembimbing.
 */

var BOBOT_PILAR = { M: 0.175, O: 0.300, P: 0.175, T: 0.175, U: 0.175 };

var NAMA_PILAR = {
  M: 'Manajemen dan Organisasi',
  O: 'Orang dan Budaya',
  P: 'Produk dan Layanan',
  T: 'Teknologi',
  U: 'Operasi Usaha',
};

// Pita skor untuk pertanyaan pilih-semua (checkbox), berdasarkan jumlah opsi
// yang dipilih (k). Format tiap baris: [k minimal, k maksimal, skor].
// HARUS SAMA PERSIS dengan gas/Code.gs dan 00_ItemBank.gs.
var BAND_COUNT4 = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4]];
var BAND5 = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 4, 3], [5, 5, 4]];
var BAND_T4 = [[0, 0, 0], [1, 2, 1], [3, 5, 2], [6, 8, 3], [9, 12, 4]];
var BAND_T5 = [[0, 0, 0], [1, 1, 1], [2, 3, 2], [4, 5, 3], [6, 6, 4]];

function bandScore(k, bands) {
  for (var i = 0; i < bands.length; i++) {
    if (k >= bands[i][0] && k <= bands[i][1]) return bands[i][2];
  }
  return 0;
}

// 23 item inti. P1 dan U3 punya dua varian teks (lihat ITEMS_VARIAN_SEKTOR
// di bawah) karena redaksi aslinya (sektor Produksi) memakai contoh mesin
// produksi yang tidak relevan untuk sektor Dagang-Jasa. 21 item lainnya
// SAMA PERSIS untuk kedua sektor.
var ITEMS_BASE = [
  // ---- Pilar M: Manajemen dan Organisasi ----
  { kode: 'M1', pilar: 'M', pdf: '2.1', tipe: 'single',
    tanya: 'Bagaimana dukungan pemilik terhadap penggunaan teknologi digital di usaha ini?',
    opsi: ['Menolak atau tidak mendukung', 'Ragu dan belum ada keputusan', 'Mendukung, tetapi belum melakukan apa pun', 'Mendukung dan sudah mencoba satu atau dua teknologi digital', 'Memimpin dan mendorong penggunaan teknologi digital secara rutin'],
    bukti: 'Contoh keputusan digital terakhir yang diambil pemilik.' },
  { kode: 'M2', pilar: 'M', pdf: '2.2', tipe: 'single',
    tanya: 'Bagaimana status rencana digital usaha (misalnya target berjualan daring atau pembukuan digital)?',
    opsi: ['Belum ada rencana', 'Baru dipikirkan, belum ditulis', 'Sudah disepakati atau ditulis, tetapi belum dijalankan', 'Sedang dijalankan pada sebagian kegiatan (misalnya penjualan)', 'Dijalankan pada penjualan, produksi, dan keuangan, dan dievaluasi berkala'],
    bukti: 'Catatan atau target tertulis.' },
  { kode: 'M3', pilar: 'M', pdf: '2.3', tipe: 'single',
    tanya: 'Berapa dana yang dialokasikan untuk kebutuhan digital dalam satu tahun terakhir (perangkat, aplikasi, iklan, kuota internet untuk usaha)?',
    opsi: ['Tidak ada dana', 'Ada rencana, tetapi belum ada dana khusus', 'Kurang dari Rp1 juta per tahun', 'Rp1 juta sampai Rp5 juta per tahun', 'Lebih dari Rp5 juta per tahun'],
    bukti: 'Nota pembelian atau catatan pengeluaran. Pulsa pribadi tidak dihitung.' },
  { kode: 'M4', pilar: 'M', pdf: '2.4', tipe: 'single',
    tanya: 'Siapa yang bertanggung jawab atas urusan digital usaha?',
    opsi: ['Tidak ada', 'Belum ada, tetapi pernah bertanya atau berkonsultasi (teman, pendamping, dinas)', 'Sedang direncanakan', 'Ada satu orang yang mengurus (pemilik, keluarga, atau pekerja), tetapi belum maksimal', 'Ada orang atau tim dengan tugas jelas dan hasilnya terlihat'],
    bukti: 'Nama orang yang mengurus dan contoh hasilnya.' },
  { kode: 'M5', pilar: 'M', pdf: '2.5', tipe: 'single',
    tanya: 'Adakah percobaan atau inovasi digital dalam 12 bulan terakhir?',
    opsi: ['Tidak ada', 'Baru wacana', 'Mencoba satu hal baru', 'Mencoba beberapa hal dan sebagian berlanjut', 'Rutin mencoba dan menerapkan inovasi digital di banyak bagian usaha'],
    bukti: 'Contoh percobaan yang dilakukan.' },

  // ---- Pilar O: Orang dan Budaya ----
  { kode: 'O1', pilar: 'O', pdf: '3.1', tipe: 'single',
    tanya: 'Bagaimana budaya kerja di usaha ini?',
    opsi: ['Belum ada kebiasaan kerja teratur (jam dan target tidak jelas)', 'Kerja teratur dan disiplin waktu', 'Teratur dan mau belajar hal baru', 'Teratur, mau belajar, dan terbuka pada perubahan cara kerja', 'Terbiasa mencoba cara baru dan memperbaiki terus-menerus'],
    bukti: 'Contoh perubahan cara kerja yang pernah dilakukan.' },
  { kode: 'O2', pilar: 'O', pdf: '3.3', tipe: 'multi', bands: 'BAND_COUNT4',
    tanya: 'Kebiasaan apa yang ada di usaha ini? (pilih semua yang berlaku)',
    opsi: ['Memperbaiki produk atau cara kerja secara rutin', 'Terbuka menerima kritik dan saran pelanggan', 'Mengikuti tren atau contoh dari luar kota atau luar negeri', 'Mudah menyesuaikan diri bila cara kerja berubah'],
    bukti: 'Contoh nyata untuk tiap yang dipilih.' },
  { kode: 'O3', pilar: 'O', pdf: '3.4', tipe: 'single',
    tanya: 'Seberapa terbuka pemilik dan pekerja terhadap teknologi baru?',
    opsi: ['Menolak atau tidak tertarik', 'Ingin, tetapi enggan atau kurang', 'Umumnya terbuka bila dibantu', 'Terbuka dan mau mencoba sendiri', 'Semua orang di usaha terbuka dan aktif belajar'],
    bukti: 'Contoh teknologi baru yang pernah dicoba.' },
  { kode: 'O4', pilar: 'O', pdf: '3.5', tipe: 'single',
    tanya: 'Pelatihan digital apa yang pernah diikuti?',
    opsi: ['Belum pernah', 'Ada rencana mengikuti', 'Pernah ikut satu kali (pemilik)', 'Pernah ikut beberapa kali, atau ada pekerja yang ikut', 'Rutin ikut atau mengadakan pelatihan dan hasilnya dipraktikkan'],
    bukti: 'Nama pelatihan dan waktunya.' },
  { kode: 'O5', pilar: 'O', pdf: 'tambahan', tipe: 'multi', bands: 'BAND5',
    tanya: 'Kemampuan digital dasar apa yang dimiliki pemilik atau pekerja? (pilih semua yang berlaku)',
    opsi: ['Memakai ponsel atau komputer untuk kegiatan usaha', 'Memakai media sosial untuk berjualan', 'Memakai pembayaran digital (QRIS, dompet digital, transfer lewat aplikasi)', 'Memakai aplikasi pembukuan atau spreadsheet', 'Mengelola toko di marketplace'],
    bukti: 'Minta tunjukkan contoh untuk tiap yang dipilih.' },

  // ---- Pilar P: Produk dan Layanan ----
  // P1 di-override per sektor, lihat ITEMS_VARIAN_SEKTOR
  { kode: 'P1', pilar: 'P', pdf: '4.1', tipe: 'single', sektorKhusus: true },
  { kode: 'P2', pilar: 'P', pdf: '4.2', tipe: 'single',
    tanya: 'Bagaimana pengumpulan dan penggunaan data pelanggan (pesan, pesanan, ulasan)?',
    opsi: ['Tidak dikumpulkan', 'Dikumpulkan tidak teratur (tersebar di chat)', 'Dicatat teratur, tetapi belum dianalisis', 'Dianalisis sederhana sesekali', 'Dianalisis rutin dan dipakai untuk keputusan'],
    bukti: 'Catatan pelanggan atau contoh analisis.' },
  { kode: 'P3', pilar: 'P', pdf: '4.3', tipe: 'multi', bands: 'BAND5',
    tanya: 'Data pelanggan atau usaha dipakai untuk apa? (pilih semua yang berlaku; bila belum mengumpulkan data, jangan pilih apa pun)',
    opsi: ['Merancang produk atau cara jual baru', 'Meningkatkan layanan pelanggan', 'Mengevaluasi hasil produksi atau penjualan', 'Meningkatkan mutu produk', 'Menentukan harga atau promosi'],
    bukti: 'Contoh keputusan yang diambil dari data.' },
  { kode: 'P4', pilar: 'P', pdf: '4.4', tipe: 'multi', bands: 'BAND5',
    tanya: 'Teknologi apa yang menempel pada produk, kemasan, atau layanan? (pilih semua yang berlaku)',
    opsi: ['Barcode atau QR pada kemasan', 'Kode produksi atau nomor lacak pesanan', 'Katalog atau toko digital (akun toko, website, marketplace)', 'Informasi produk lewat QR atau tautan (menu digital, cerita produk)', 'Layanan pelanggan online atau pesan otomatis'],
    bukti: 'Tunjukkan kemasan atau akun toko.' },

  // ---- Pilar T: Teknologi ----
  { kode: 'T1', pilar: 'T', pdf: '5.1', tipe: 'single',
    tanya: 'Bagaimana keamanan digital usaha (akun media sosial, marketplace, aplikasi, data)?',
    opsi: ['Belum menerapkan dan belum memikirkan', 'Sudah memikirkan, tetapi belum menerapkan', 'Kata sandi sederhana pada beberapa akun', 'Kata sandi kuat dan verifikasi dua langkah pada akun utama', 'Semua akun dan data dilindungi (sandi berbeda, verifikasi dua langkah, cadangan rutin, akses dibatasi)'],
    bukti: 'Tunjukkan pengaturan keamanan di akun utama.' },
  { kode: 'T2', pilar: 'T', pdf: '5.2', tipe: 'single',
    tanya: 'Bagaimana internet dipakai dalam kegiatan usaha?',
    opsi: ['Belum memakai internet untuk usaha', 'Ada, tetapi jarang dipakai', 'Dipakai sebagian (misalnya untuk berkirim pesan dengan pelanggan)', 'Dipakai rutin untuk pesanan dan pembayaran', 'Dipakai terus-menerus dan sudah ditingkatkan (paket, perangkat, atau jaringan diperbarui)'],
    bukti: 'Contoh pesanan atau pembayaran terakhir.' },
  { kode: 'T3', pilar: 'T', pdf: '5.3', tipe: 'single',
    tanya: 'Seberapa terhubung sistem atau pihak yang berkaitan dengan usaha (misalnya toko daring terhubung ke pembayaran, pengiriman, dan pembukuan)?',
    opsi: ['Tidak ada', 'Ada, tetapi tidak terpakai', 'Sebagian terhubung', 'Terhubung dan dipakai rutin', 'Terhubung otomatis dan dipakai terus-menerus'],
    bukti: 'Tunjukkan contoh keterhubungan.' },
  { kode: 'T4', pilar: 'T', pdf: '5.4', tipe: 'multi', bands: 'BAND_T4',
    tanya: 'Teknologi apa saja yang sudah dipakai rutin di usaha? (pilih semua yang berlaku)',
    opsi: ['WhatsApp Business', 'Media sosial untuk berjualan (Instagram, Facebook, TikTok)', 'Marketplace', 'QRIS atau dompet digital', 'Aplikasi kasir', 'Aplikasi pembukuan', 'Penyimpanan awan (misalnya Google Drive)', 'Website atau toko daring sendiri', 'Mesin listrik atau semi-otomatis pada produksi', 'Printer label atau barcode', 'Kamera pemantau atau alat pantau digital', 'Aplikasi desain atau kecerdasan buatan (misalnya Canva, ChatGPT)'],
    bukti: 'Minta tunjukkan tiap yang dipilih.' },
  { kode: 'T5', pilar: 'T', pdf: '5.5', tipe: 'multi', bands: 'BAND_T5',
    tanya: 'Kegiatan usaha mana yang sudah dibantu aplikasi atau perangkat digital secara rutin? (pilih semua yang berlaku)',
    opsi: ['Penjualan', 'Pembayaran', 'Pembukuan', 'Stok atau produksi', 'Pengadaan bahan', 'Layanan pelanggan'],
    bukti: 'Contoh untuk tiap yang dipilih.' },

  // ---- Pilar U: Operasi Usaha (di PDF resmi bernama Operasi Pabrik) ----
  { kode: 'U1', pilar: 'U', pdf: '6.1', tipe: 'single',
    tanya: 'Di mana data dan catatan usaha disimpan?',
    opsi: ['Belum ada catatan', 'Buku atau kertas', 'Ponsel atau komputer pribadi tanpa aturan', 'Folder atau aplikasi yang teratur pada satu perangkat', 'Penyimpanan awan dengan cadangan dan dapat diakses beberapa orang'],
    bukti: 'Tunjukkan tempat penyimpanan.' },
  { kode: 'U2', pilar: 'U', pdf: '6.2', tipe: 'multi', bands: 'BAND5',
    tanya: 'Bagian pengadaan bahan dan logistik mana yang sudah digital? (pilih semua yang berlaku)',
    opsi: ['Stok bahan atau produk dicatat digital', 'Pesan bahan lewat aplikasi atau marketplace', 'Bayar pemasok secara non-tunai', 'Lacak pengiriman dengan nomor resi atau lokasi', 'Pengingat atau pemesanan ulang otomatis'],
    bukti: 'Contoh catatan atau pesanan terakhir.' },
  // U3 di-override per sektor, lihat ITEMS_VARIAN_SEKTOR
  { kode: 'U3', pilar: 'U', pdf: '6.3', tipe: 'single', sektorKhusus: true },
  { kode: 'U4', pilar: 'U', pdf: '6.4', tipe: 'single',
    tanya: 'Bagaimana perawatan peralatan usaha (produksi atau operasional)?',
    opsi: ['Belum ada perawatan', 'Diperbaiki bila rusak', 'Dijadwalkan berkala', 'Jadwal tercatat dan tanda awal kerusakan dipantau', 'Pemantauan dan catatan perawatan secara digital'],
    bukti: 'Catatan jadwal perawatan.' },
];

// Varian P1 dan U3 per sektor.
var ITEMS_VARIAN_SEKTOR = {
  produksi: {
    P1: {
      tanya: 'Berapa persen produk yang dibuat sesuai pesanan atau permintaan khusus pelanggan?',
      opsi: ['0 persen', '1 sampai 25 persen', '26 sampai 50 persen', '51 sampai 75 persen', '76 sampai 100 persen'],
      bukti: 'Contoh pesanan khusus terakhir.',
    },
    U3: {
      tanya: 'Berapa persen tahap produksi yang dibantu mesin atau otomatis (misalnya oven listrik dengan timer, mesin jahit elektrik, mesin pengemas, alat cetak otomatis)?',
      opsi: ['0 persen', '1 sampai 25 persen', '26 sampai 50 persen', '51 sampai 75 persen', '76 sampai 100 persen'],
      bukti: 'Lihat peralatan langsung bila memungkinkan.',
    },
  },
  dagangjasa: {
    P1: {
      tanya: 'Berapa persen produk atau layanan yang disediakan sesuai permintaan atau pesanan khusus pelanggan (bukan sekadar stok atau menu standar)?',
      opsi: ['0 persen', '1 sampai 25 persen', '26 sampai 50 persen', '51 sampai 75 persen', '76 sampai 100 persen'],
      bukti: 'Contoh permintaan/pesanan khusus terakhir (misalnya request varian/ukuran khusus, custom order jasa, racikan khusus pelanggan).',
    },
    U3: {
      tanya: 'Berapa persen tahap pelayanan yang dibantu mesin atau otomatis (misalnya mesin kasir/EDC terhubung ke stok, mesin kopi atau minuman otomatis, mesin cuci otomatis untuk laundry, sistem antrean atau booking otomatis, timbangan digital terhubung kasir)?',
      opsi: ['0 persen', '1 sampai 25 persen', '26 sampai 50 persen', '51 sampai 75 persen', '76 sampai 100 persen'],
      bukti: 'Lihat peralatan langsung bila memungkinkan.',
    },
  },
};

var BAND_MAP = { BAND_COUNT4: BAND_COUNT4, BAND5: BAND5, BAND_T4: BAND_T4, BAND_T5: BAND_T5 };

// Mengembalikan daftar 23 item dengan P1/U3 sudah disesuaikan untuk sektor
// yang dipilih ('produksi' atau 'dagangjasa').
function getItemsForSektor(sektor) {
  var varian = ITEMS_VARIAN_SEKTOR[sektor];
  return ITEMS_BASE.map(function (it) {
    if (it.sektorKhusus) {
      var v = varian[it.kode];
      return Object.assign({}, it, v);
    }
    return it;
  });
}

var JENIS_USAHA = {
  produksi: {
    label: 'Produksi (olahan pangan, fesyen dan batik, atau kriya)',
    prefix: 'P1',
    opsi: [
      { kode: 'OP', teks: 'Olahan pangan (mengolah bahan mentah menjadi produk makanan atau minuman untuk dijual)' },
      { kode: 'FB', teks: 'Fesyen dan batik (menjahit, membatik, atau membuat produk pakaian)' },
      { kode: 'KR', teks: 'Kriya (membuat kerajinan tangan atau produk non-pangan lain dari bahan mentah)' },
      { kode: 'LAIN', teks: 'Lainnya (bukan usaha produksi — hentikan wawancara, bukan sampel riset ini)', stop: true },
    ],
  },
  dagangjasa: {
    label: 'Dagang, kuliner siap saji, atau jasa',
    prefix: 'P2',
    opsi: [
      { kode: 'PD', teks: 'Pedagang atau reseller barang jadi (sembako, pakaian jadi, elektronik, dan sejenisnya, tanpa mengolah bahan mentah)' },
      { kode: 'RM', teks: 'Rumah makan, warung makan, atau kedai (menyajikan atau menjual kembali makanan matang, bukan usaha olahan skala produksi)' },
      { kode: 'JS', teks: 'Jasa (servis, salon, laundry, bengkel, dan sejenisnya)' },
      { kode: 'LAIN', teks: 'Lainnya (bukan usaha dagang, kuliner siap saji, atau jasa — hentikan wawancara, bukan sampel riset ini)', stop: true },
    ],
  },
};

var PROFIL_UMUM = [
  { key: 'produk_utama', tanya: 'Produk atau layanan utama', tipe: 'short' },
  { key: 'kecamatan', tanya: 'Kecamatan lokasi usaha', tipe: 'short' },
  { key: 'lama_usaha', tanya: 'Sudah berapa tahun usaha berjalan? (minimal 1 tahun; kurang dari itu, hentikan wawancara)', tipe: 'short' },
  { key: 'pekerja', tanya: 'Jumlah pekerja tetap termasuk pemilik', tipe: 'short' },
  { key: 'omzet_kat', tanya: 'Perkiraan omzet per tahun', tipe: 'single',
    opsi: ['Sampai Rp500 juta', 'Di atas Rp500 juta sampai Rp2 miliar', 'Di atas Rp2 miliar sampai Rp15 miliar', 'Di atas Rp15 miliar (bukan sampel — hentikan wawancara)'] },
  { key: 'usia', tanya: 'Usia pemilik atau pengelola (tahun)', tipe: 'short' },
  { key: 'pendidikan', tanya: 'Pendidikan terakhir pemilik atau pengelola', tipe: 'single',
    opsi: ['SD atau SMP', 'SMA atau SMK', 'D3', 'S1', 'S2 atau S3'] },
  { key: 'posisi', tanya: 'Posisi responden', tipe: 'single',
    opsi: ['Pemilik', 'Pengelola', 'Anggota keluarga pengambil keputusan'] },
  { key: 'pelatihan', tanya: 'Pernah mengikuti pelatihan digital dalam 3 tahun terakhir?', tipe: 'single', opsi: ['Ya', 'Tidak'] },
  { key: 'pembiayaan', tanya: 'Pernah menerima kredit atau pembiayaan dari bank, koperasi, atau lembaga resmi?', tipe: 'single', opsi: ['Ya', 'Tidak'] },
];

var HAMBATAN = [
  'Kekurangan SDM yang paham digital', 'Keterbatasan dana', 'Internet atau listrik kurang memadai',
  'Pemilik kurang paham teknologi digital', 'Kekhawatiran keamanan data atau penipuan',
  'Sulit menemukan mitra atau pendamping teknologi', 'Manfaatnya belum jelas bagi usaha', 'Lainnya',
];

var PERTANYAAN_TERBUKA = [
  { key: 'tantangan_terbesar', tanya: 'Apa tantangan terbesar yang Bapak atau Ibu rasakan dalam memakai teknologi digital di usaha ini?' },
  { key: 'bantuan_diharapkan', tanya: 'Bantuan apa yang paling Bapak atau Ibu harapkan dari pemerintah, kampus, atau komunitas?' },
  { key: 'rencana_setahun', tanya: 'Apa satu hal digital yang ingin Bapak atau Ibu lakukan dalam satu tahun ke depan?' },
];

// Menghitung skor satu item dari jawaban mentah.
// raw: untuk 'single' adalah index (0-4) opsi yang dipilih; untuk 'multi'
// adalah array string opsi yang dicentang.
function skorItemDariJawaban(it, raw) {
  if (raw === undefined || raw === null || raw === '') return '';
  if (it.tipe === 'single') {
    return typeof raw === 'number' ? raw : '';
  }
  var k = Array.isArray(raw) ? raw.length : 0;
  return bandScore(k, BAND_MAP[it.bands]);
}

// Menghitung agregat (skor per pilar, skor total berbobot, level) dari
// objek skorItem { kode: skor }. items = hasil getItemsForSektor(sektor).
function hitungAgregat(items, skorItem) {
  var pilarSkor = {};
  ['M', 'O', 'P', 'T', 'U'].forEach(function (p) {
    var kodes = items.filter(function (it) { return it.pilar === p; }).map(function (it) { return it.kode; });
    var total = 0, n = 0;
    kodes.forEach(function (k) {
      if (typeof skorItem[k] === 'number') { total += skorItem[k]; n++; }
    });
    pilarSkor[p] = n ? round2(total / n) : 0;
  });
  var skorTotal = round2(
    BOBOT_PILAR.M * pilarSkor.M + BOBOT_PILAR.O * pilarSkor.O + BOBOT_PILAR.P * pilarSkor.P +
    BOBOT_PILAR.T * pilarSkor.T + BOBOT_PILAR.U * pilarSkor.U
  );
  var level = Math.round(skorTotal);
  return { pilarSkor: pilarSkor, skorTotal: skorTotal, level: level };
}

function round2(x) { return Math.round(x * 100) / 100; }

if (typeof module !== 'undefined') {
  module.exports = {
    BOBOT_PILAR: BOBOT_PILAR, NAMA_PILAR: NAMA_PILAR, BAND_COUNT4: BAND_COUNT4, BAND5: BAND5,
    BAND_T4: BAND_T4, BAND_T5: BAND_T5, bandScore: bandScore, ITEMS_BASE: ITEMS_BASE,
    ITEMS_VARIAN_SEKTOR: ITEMS_VARIAN_SEKTOR, getItemsForSektor: getItemsForSektor,
    JENIS_USAHA: JENIS_USAHA, PROFIL_UMUM: PROFIL_UMUM, HAMBATAN: HAMBATAN,
    PERTANYAAN_TERBUKA: PERTANYAAN_TERBUKA, skorItemDariJawaban: skorItemDariJawaban,
    hitungAgregat: hitungAgregat, round2: round2,
  };
}
