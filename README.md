# Aplikasi Input Data Lapangan — Kesiapan Digital UMKM Kota Bengkulu

Aplikasi untuk mahasiswa mengisi data wawancara langsung dari HP saat turun ke lapangan, dan untuk dosen pembimbing memantau progresnya lewat dashboard di komputer. Dibangun dari tiga bagian:

- **Aplikasi HP mahasiswa** (`index.html`, `style.css`, `items.js`, `app.js`, `config.js`, `manifest.json`, `icon.png`) — dibuka mahasiswa di HP masing-masing lewat **GitHub Pages**. Ada login PIN, foto usaha, dan penghitung "sudah berapa UMKM yang diwawancarai".
- **Dashboard dosen** (`dashboard.html`, `dashboard.css`, `dashboard.js`) — dibuka dosen di komputer/laptop lewat GitHub Pages yang sama. Menampilkan progres tiap mahasiswa, grafik skor, kendala yang paling banyak disebut, dan ringkasan otomatis dari AI (Claude).
- **Backend** (folder `gas/`: `Items.gs`, `Code.gs`) — **Google Apps Script** yang mengatur PIN, menerima data, menghitung skor, menyimpan foto ke Google Drive, dan menulis semuanya ke **Google Sheet** Anda.

## PENTING sebelum dipakai wawancara sungguhan

Instrumen di dalam `items.js`/`gas/Items.gs` (23 pertanyaan inti) masih **status draf**, belum melalui validasi pakar (I-CVI). Ini sama persis dengan isi `Lampiran B`/`Lampiran F` (sektor Produksi) dan `Lampiran_B_F_RisetMu_SektorDagangJasa.docx` (sektor Dagang-Jasa) yang sudah dibuat sebelumnya. Jangan pakai aplikasi ini untuk data final skripsi/riset sebelum:

1. I-CVI pakar selesai dan redaksi dikunci.
2. Celah "Bagian Orang dan Budaya mungkin kurang 1 pertanyaan dibanding PDF resmi" sudah dicek ulang.
3. Item M... P1 dan U3 (ditandai di aplikasi dengan keterangan "berbeda redaksinya untuk usaha Dagang-Jasa") sudah dikonfirmasi pakar setara maknanya antara sektor Produksi dan Dagang-Jasa.

Kalau ada revisi kalimat dari pakar, **edit `items.js` DAN `gas/Items.gs` sekaligus** (keduanya harus tetap sama persis — ada pengecekan otomatis utk ini di `tests/`), lalu commit ulang di GitHub dan deploy ulang di Apps Script.

## Siapa pakai apa

| Peran | Buka apa | Lewat apa |
|---|---|---|
| Dosen pembimbing (admin) | `dashboard.html` | Komputer/laptop, PIN admin |
| Mahasiswa 1 | `index.html` | HP sendiri, PIN mahasiswa 1 |
| Mahasiswa 2 | `index.html` | HP sendiri, PIN mahasiswa 2 |

Total hanya 3 akun, diatur di satu tab baru bernama **`Akun`** yang otomatis muncul di Google Sheet Anda saat aplikasi pertama kali dipakai. Dosen bebas **mengedit tab itu langsung di Sheet** kapan saja (ganti PIN, nama mahasiswa, atau target jumlah wawancara) — tidak perlu ubah kode apa pun, berlaku langsung di percobaan login berikutnya.

PIN bawaan (ganti ini sebelum dibagikan, demi keamanan sederhana):

| peran | nama (contoh) | pin bawaan | target_wawancara |
|---|---|---|---|
| admin | Dosen Pembimbing | 1234 | 0 |
| mahasiswa1 | Zelika Nurcilia | 1111 | 20 |
| mahasiswa2 | Veronica Marisa | 2222 | 20 |

Catatan jujur soal keamanan: PIN ini bukan login yang benar-benar aman (siapa pun yang tahu PIN dan tautan aplikasinya bisa masuk) — tapi untuk tim kecil 3 orang yang saling kenal, ini cukup untuk mencegah orang asing iseng mengisi data atau melihat dashboard. Jangan sebar PIN admin ke mahasiswa.

## Langkah 1. Siapkan Google Sheet dan backend (Apps Script)

1. Buka [sheets.google.com](https://sheets.google.com), buat **Spreadsheet baru**. Beri nama misalnya "Data INDI 4.0 UMKM Bengkulu".
2. Di spreadsheet itu, buka menu **Extensions > Apps Script**.
3. Hapus isi bawaan `Code.gs`. Buat file baru lewat tombol **+** di sebelah "Files", beri nama `Items` (Apps Script otomatis menambah akhiran `.gs`).
4. Salin isi `gas/Items.gs` dari paket ini ke file `Items.gs` di editor — **persis apa adanya**, jangan diketik ulang manual (rawan salah ketik pada 23 soal).
5. Salin isi `gas/Code.gs` dari paket ini ke file `Code.gs` di editor.
6. **(Opsional tapi disarankan)** Isi API key Claude supaya fitur "Minta Analisis AI" di dashboard bisa dipakai — lihat bagian **Analisis AI** di bawah. Boleh dilewati dulu dan diisi belakangan; fitur lain tidak terpengaruh.
7. Klik **Deploy > New deployment**. Pilih ikon gerigi, jenis **Web app**. Isi:
   - Execute as: **Me (akun Anda)**
   - Who has access: **Anyone**
8. Klik **Deploy**. Saat pertama kali, muncul permintaan izin akses — klik **Advanced/Lanjutkan**, lalu **Go to (nama proyek) (unsafe)**, lalu **Allow**. Ini wajar, sama seperti script pribadi lain. Izin yang diminta mencakup akses Google Drive — itu dipakai untuk menyimpan foto wawancara.
9. Setelah selesai, **salin URL Web App** yang muncul (diakhiri `/exec`). URL inilah yang dipakai di Langkah 2.
10. Uji dulu dari editor: pilih fungsi `testKirimContoh` di dropdown atas, klik **Run**, lalu buka **Execution log**. Harus muncul `"status":"ok"` dan skor total `1.81`. Buka spreadsheet — akan muncul tab baru `Akun` (berisi 3 akun bawaan), `Jawaban_Mentah`, dan `Hasil_Skor` (masing-masing bertambah satu baris dengan kode usaha `P1-OP-TEST`).
11. **Ganti PIN bawaan** di tab `Akun` sekarang juga (kolom `pin`), dan sesuaikan nama mahasiswa serta `target_wawancara` kalau perlu.
12. **Hapus baris uji coba** (kode usaha `P1-OP-TEST`) dari tab `Jawaban_Mentah` dan `Hasil_Skor` sebelum wawancara sungguhan.

> Kalau nanti ada revisi `Items.gs` atau `Code.gs`, deploy ulang lewat **Deploy > Manage deployments > edit (ikon pensil) > New version > Deploy** — URL `/exec`-nya tetap sama, tidak perlu ganti di `config.js`.

## Langkah 2. Pasang di GitHub Pages (aplikasi HP + dashboard, satu tautan yang sama)

1. Login ke [github.com](https://github.com), buat **repository baru** (New repository), misalnya nama `indi40-umkm-bengkulu`. Pilih **Public** (GitHub Pages gratis mengharuskan ini, kecuali Anda punya GitHub Pro).
2. Di halaman repo kosong itu, klik **uploading an existing file**, lalu seret (drag and drop) SEMUA file di folder root paket ini: `index.html`, `style.css`, `items.js`, `app.js`, `config.js`, `manifest.json`, `manifest-dashboard.json`, `sw.js`, `icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `dashboard.html`, `dashboard.css`, `dashboard.js`. **Jangan** ikut mengunggah folder `gas/` atau `tests/` (itu bukan untuk GitHub Pages).
3. **Sebelum commit**, edit `config.js` dulu (klik ikon pensil di file itu setelah ter-upload, atau edit di komputer sebelum upload): ganti nilai `ENDPOINT_URL` dengan URL Web App dari Langkah 1.9. File `config.js` ini dipakai bersama oleh `index.html` DAN `dashboard.html`, jadi cukup diisi sekali.
4. Commit perubahan (tombol **Commit changes**).
5. Buka tab **Settings** repo itu > **Pages** (menu kiri). Di **Build and deployment > Source**, pilih **Deploy from a branch**. Branch: **main**, folder: **/ (root)**. Klik **Save**.
6. Tunggu 1-2 menit, lalu refresh halaman Settings > Pages itu. Akan muncul URL seperti `https://<nama-akun-anda>.github.io/indi40-umkm-bengkulu/`.
   - Tautan untuk **mahasiswa**: URL itu + `index.html` (atau cukup URL-nya saja, karena `index.html` otomatis dibuka).
   - Tautan untuk **dosen (dashboard)**: URL itu + `dashboard.html`.

## Langkah 3. Uji dulu sebelum dibagikan

1. Buka tautan aplikasi dari Langkah 2 di HP Anda sendiri. Masuk pakai salah satu PIN mahasiswa.
2. Isi satu wawancara contoh sampai selesai (boleh jawaban karangan, boleh pakai foto sungguhan untuk uji coba fitur kamera), tekan **Kirim Data**.
3. Buka `dashboard.html`, masuk dengan PIN admin, pastikan data uji coba tadi muncul di "Data Masuk Terbaru" dan progres mahasiswa bertambah.
4. **Matikan dulu WiFi/data seluler HP**, coba isi dan kirim satu wawancara lagi. Aplikasi harus menampilkan "Tersimpan di HP" (bukan error). Nyalakan kembali internet, kembali ke layar Mulai, tekan **Coba Kirim Sekarang** — data yang tertunda tadi harus terkirim.
5. Hapus baris-baris uji coba ini dari Google Sheet (tab `Jawaban_Mentah` dan `Hasil_Skor`) dan dari folder foto di Drive, sebelum wawancara sungguhan.

## Langkah 4. Bagikan ke mahasiswa

Kirim tautan aplikasi (Langkah 2.6) lewat WhatsApp ke kedua mahasiswa, beserta PIN masing-masing (jangan dikirim di grup yang sama, kirim personal).

Supaya gampang dibuka tiap wawancara, minta mahasiswa **meng-install aplikasinya** ke HP:
- **Android (Chrome):** buka tautan. Biasanya Chrome langsung menawarkan kotak **"Tambahkan Kesiapan Digital UMKM Bengkulu ke layar Utama"/"Install app"** di bagian bawah layar — tinggal ketuk **Install/Tambahkan**. Kalau kotak itu tidak muncul sendiri, ketuk menu titik tiga di kanan atas Chrome, lalu pilih **Install app** (atau **Tambahkan ke layar Utama**).
- **iPhone (Safari):** PWA di iPhone tidak bisa menawarkan sendiri, jadi harus manual: buka tautan, ketuk ikon **Bagikan** (kotak dengan panah ke atas), pilih **Tambah ke Layar Utama**.

Setelah ter-install, ikon aplikasi (ikon hijau) muncul di layar utama DAN di laci aplikasi (app drawer) HP mereka seperti aplikasi dari Play Store — terbuka tanpa bilah alamat browser. Login PIN cukup sekali, sesudahnya HP akan "ingat" sampai mahasiswa menekan tombol **Keluar**.

Mahasiswa juga bisa membuka **Panduan Penggunaan** langsung di dalam aplikasi (tombol di layar Mulai) kalau lupa urutan langkah wawancara.

## Aplikasi ini "aplikasi web" (PWA) — bisa di-install tanpa Play Store

`index.html` (aplikasi mahasiswa) **dan** `dashboard.html` (dashboard dosen) sama-sama dilengkapi `sw.js` (service worker), sebagai DUA aplikasi terpisah yang bisa di-install masing-masing (ikon beda, dibuka dari halaman beda — `manifest.json` untuk aplikasi mahasiswa, `manifest-dashboard.json` untuk dashboard):
1. Android/Chrome menawarkan tombol **Install app** sendiri di kedua halaman — tidak perlu Play Store, tidak perlu akun developer, tidak ada file `.apk` terpisah untuk dikirim manual. Caranya sama seperti di Langkah 4 di atas: buka `dashboard.html` di Chrome (bisa dari laptop maupun HP dosen), lalu ketuk/klik **Install app** kalau muncul, atau lewat menu titik tiga.
2. Setelah pernah dibuka sekali dengan internet, **tampilan aplikasinya** (bukan hanya datanya) tetap bisa dibuka walau sinyal benar-benar nol. Ini terpisah dari antrean offline yang sudah ada sebelumnya (yang mengurus data wawancaranya); fitur ini mengurus file aplikasinya sendiri.

**Kalau Anda merevisi file apa pun** (`items.js`, `app.js`, `style.css`, `dashboard.js`, dst — misalnya setelah redaksi dikunci pakar), WAJIB naikkan angka versi di baris `CACHE_NAME` paling atas `sw.js` (misalnya dari `'indi40-umkm-shell-v4'` jadi `'...-v5'`) sebelum commit ulang ke GitHub. Tanpa ini, HP yang sudah pernah install bisa diam-diam tetap memakai file LAMA — termasuk instrumen lama — karena service worker menyajikan dari cache HP lebih dulu. Satu `sw.js` ini dipakai bersama oleh aplikasi mahasiswa dan dashboard, jadi menaikkan versinya memperbarui cache KEDUANYA sekaligus. Setelah versi dinaikkan, tutup aplikasi sepenuhnya lalu buka lagi (kadang perlu dibuka dua kali) untuk mendapat versi baru; tidak perlu uninstall.

**Pengecualian: `config.js` TIDAK ikut aturan di atas.** File itu isinya pengaturan (`ENDPOINT_URL`, `NAMA_PROYEK`), bukan "kode" — jadi sengaja didesain NETWORK-FIRST: setiap kali aplikasi dibuka dengan internet, `config.js` SELALU diambil dari GitHub dulu, baru dicadangkan ke cache (dipakai kalau benar-benar offline). Jadi kalau Anda edit `ENDPOINT_URL` langsung di GitHub kapan pun, itu langsung kepakai di HP yang sudah install begitu dibuka ulang sekali — tidak perlu naikkan `CACHE_NAME`, tidak perlu uninstall.

Kedua manifest (`manifest.json`, `manifest-dashboard.json`) masing-masing punya kolom **`id`** eksplisit (`./index.html` dan `./dashboard.html`). Ini WAJIB ada supaya Chrome tidak bingung membedakan dua aplikasi yang sama-sama satu origin/folder — tanpa ini, kadang Chrome cuma mengenali SATU dari keduanya sebagai bisa di-install (yang satunya lagi menolak dengan pesan semacam "Tidak dapat membuka aplikasi" walau filenya sendiri sudah benar). Kalau Anda menambah manifest ketiga suatu saat nanti, beri `id` yang beda juga.

**Kalau sebelumnya sempat gagal coba install dashboard** (sebelum `id` ini ditambahkan), HP yang dipakai coba-coba tadi perlu "dibersihkan" dulu sebelum mencoba lagi, karena Chrome menyimpan status lama di HP tersebut:
1. Di Chrome (Android): titik tiga > **Settings** > **Site settings** (atau **Privacy and security > Site settings**) > cari/ketik alamat situsnya (tanpa `https://` dan tanpa path, cukup nama domainnya) > ketuk situsnya > **Clear & reset** (Hapus & reset data situs). Ini hanya menghapus data situs ini saja, bukan seluruh Chrome.
2. Kalau sempat ada ikon "Dashboard"/ikon lain dari percobaan gagal sebelumnya nyangkut di layar utama, hapus ikon itu dulu (tekan lama > Remove/Hapus).
3. Tutup Chrome sepenuhnya (bukan cuma minimize — tutup dari daftar aplikasi terakhir/recent apps).
4. Buka Chrome lagi, kunjungi ulang tautan dashboard dalam keadaan online, tunggu halamannya termuat penuh, baru coba **Install app** lagi (otomatis atau lewat titik tiga).

## Foto wawancara

Di langkah "Foto Usaha", mahasiswa bisa menekan tombol kamera untuk memotret langsung (di HP, ini otomatis membuka kamera, bukan galeri). Foto dikompres dulu di HP (supaya tidak terlalu besar dikirim lewat sinyal lemah), lalu saat terkirim, disimpan otomatis oleh Apps Script ke folder Google Drive bernama **"Foto Wawancara - Kesiapan Digital UMKM Bengkulu"** (folder ini dibuat otomatis saat foto pertama masuk). Tautan foto tiap responden muncul di kolom `foto_url` pada Sheet, dan di tabel "Data Masuk Terbaru" pada dashboard. Mengambil foto bersifat **opsional** — mahasiswa boleh melewatinya kalau pemilik usaha tidak berkenan difoto.

## Analisis AI (Claude)

Dashboard punya tombol **"Minta Analisis AI"** yang meringkas data yang sudah terkumpul (perbandingan sektor Produksi vs Dagang-Jasa, temuan menonjol, saran lanjutan) memakai Claude. Ini memanggil Claude lewat Apps Script di server Anda, **bukan** lewat aplikasi di HP mahasiswa.

Proses ini bisa makan waktu **sampai puluhan detik** (GAS perlu memanggil Claude, dan Claude perlu menulis beberapa paragraf) — tombolnya akan menampilkan "Meminta analisis..." selama itu, ini normal, bukan macet. Dashboard menunggu sampai 90 detik sebelum dianggap gagal.

Cara mengaktifkan:
1. Siapkan API key Claude dari [console.anthropic.com](https://console.anthropic.com) (Settings > API Keys).
2. Di editor Apps Script (Extensions > Apps Script di Sheet Anda), buka ikon gerigi **Project Settings** di kiri.
3. Scroll ke **Script Properties**, klik **Add script property**.
4. Isi: nama properti `CLAUDE_API_KEY`, nilai = API key Anda. Simpan.
5. (Opsional) Tambah properti lagi bernama `CLAUDE_MODEL` kalau ingin memakai model Claude tertentu (nilai bawaan kalau tidak diisi: `claude-sonnet-4-5-20250929`). Kalau dashboard menampilkan error "model tidak ditemukan", ganti nilai ini sesuai model yang tersedia di akun Anda (lihat docs.claude.com).

**API key TIDAK pernah ditaruh di kode `items.js`/`app.js`/dashboard** supaya tidak ikut ter-upload ke GitHub publik — tempatnya hanya di Script Properties, yang hanya bisa dilihat dari dalam editor Apps Script Anda sendiri. Hasil analisis tersimpan otomatis di tab baru `AnalisisAI` di Sheet, jadi dashboard tetap menampilkan hasil terakhir walau belum diminta ulang.

## Kalau sinyal lemah di lapangan

Aplikasi ini sudah menangani ini secara otomatis: kalau pengiriman gagal (tidak ada sinyal), data (termasuk foto) disimpan dulu di HP (localStorage browser) dan ditandai "tertunda". Begitu sinyal kembali, aplikasi akan otomatis mencoba mengirim ulang, atau mahasiswa bisa menekan **Coba Kirim Sekarang** di layar Mulai. Data **tidak hilang** selama mahasiswa tidak menghapus data/cache browser di HP tersebut. Login PIN sendiri **butuh sinyal** (hanya sekali, saat pertama masuk) — wawancara sesudahnya boleh sepenuhnya tanpa sinyal. Tetap ingatkan mahasiswa untuk mengecek tanda "data belum terkirim" di layar Mulai sebelum pulang dari lokasi survei, dan memastikan jumlahnya nol (semua terkirim) begitu dapat sinyal — angka "progres" di layar Mulai dan di dashboard dosen hanya menghitung data yang **sudah benar-benar sampai ke server**, bukan yang masih tertunda di HP.

## Data tercatat dobel/ganda (1 wawancara jadi beberapa baris)

**Sejak update ini, kejadian ini sudah dicegah otomatis untuk pengiriman BARU** — jadi bagian ini relevan untuk (a) memahami kenapa itu bisa terjadi sebelumnya, dan (b) membersihkan data yang SUDAH kadung dobel di Sheet Anda sebelum update ini terpasang.

**Kenapa bisa terjadi:** ini bukan mahasiswa mengirim berkali-kali dengan sengaja, dan bukan data rusak. Sebabnya adalah mekanisme "coba kirim ulang otomatis kalau sinyal lemah" (lihat bagian **Kalau sinyal lemah di lapangan** di atas) — kalau sinyal sangat lambat, HP mahasiswa bisa mengira pengiriman gagal (padahal sebenarnya sampai, hanya balasannya yang lambat/tidak sampai balik) lalu mencoba mengirim ulang data yang sama. Sebelum update ini, server tidak punya cara membedakan "ini wawancara baru" dari "ini pengiriman ulang dari data yang sama" — jadi tiap percobaan kirim dicatat sebagai baris baru.

**Apa yang sudah diperbaiki:** setiap pengiriman dari HP sekarang dibekali satu kode unik tersembunyi (`id_kirim`) yang dibuat SEKALI per wawancara dan tetap sama meski dicoba kirim ulang. Server (`gas/Code.gs`) sekarang mengecek kode ini sebelum menulis baris baru — kalau kode itu sudah pernah tercatat, server membalas sukses (jadi HP mahasiswa tidak menampilkan error) tapi **tidak menulis baris baru**. Ini berlaku otomatis untuk Sheet yang sudah berjalan sekalipun — Anda tidak perlu mengubah apa pun di Sheet secara manual, kolom `id_kirim` akan ditambahkan sendiri di ujung header `Jawaban_Mentah` dan `Hasil_Skor` saat ada pengiriman pertama setelah Anda meng-update file `gas/Code.gs` ini.

**Cara membersihkan data yang SUDAH dobel sekarang (manual, sekali saja):**

1. Buka tab **`Hasil_Skor`**, urutkan/cari kolom `kode_usaha`, lalu cari kode usaha yang muncul lebih dari satu kali (gunakan menu **Data > Buat tampilan filter**, atau rumus `=COUNTIF(B:B, B2)` di kolom bantu untuk mempercepat cari kode usaha yang nilainya >1).
2. Untuk kode usaha yang dobel, bandingkan baris-barisnya — biasanya isinya identik (sama persis skor/jawabannya) karena memang hasil kirim-ulang data yang sama. Simpan **satu baris saja** (baris mana pun boleh, karena isinya sama), hapus baris-baris lainnya.
3. Lakukan hal yang sama di tab **`Jawaban_Mentah`** untuk `kode_usaha` yang sama.
4. Kalau wawancara itu menyertakan foto: cek folder Drive "Foto Wawancara - Kesiapan Digital UMKM Bengkulu" — tiap percobaan kirim yang membawa foto akan mengunggah file foto sendiri (walau baris Sheet-nya nanti dihapus, filenya tidak otomatis terhapus), jadi akan ada beberapa file foto untuk kode usaha yang sama di folder itu. Boleh dihapus manual yang berlebih (sisakan satu), atau dibiarkan saja kalau ruang Drive tidak jadi masalah — ini tidak mempengaruhi data/skor di Sheet.
5. Setelah baris dobel dihapus, cek dashboard dosen (progres per mahasiswa, grafik, dsb) — angkanya akan otomatis benar lagi karena dashboard selalu menghitung langsung dari isi Sheet saat ini, tidak ada data tersembunyi lain yang perlu disesuaikan.

Setelah file `gas/Code.gs` versi ini dipasang (lihat Langkah 1-2 di atas), kejadian serupa untuk wawancara-wawancara BARU tidak akan terjadi lagi — Anda hanya perlu membersihkan yang sudah kadung terjadi sebelum update ini.

## Struktur data di Google Sheet

- Tab **`Akun`** — peran, nama, PIN, dan target wawancara tiap akun. Boleh diedit langsung.
- Tab **`Jawaban_Mentah`** — jawaban asli tiap wawancara (sebelum dihitung skornya), untuk keperluan audit/periksa ulang. Termasuk kolom `peran_pengirim`, `nama_pengirim`, `foto_url`.
- Tab **`Hasil_Skor`** — satu baris per usaha yang diwawancara: profil usaha, skor tiap 23 pertanyaan (0-4), skor per bagian (M, O, P, T, U — rata-rata), skor total berbobot, level kesiapan (0-4, dibulatkan), serta siapa yang mengirim dan tautan fotonya.
- Tab **`AnalisisAI`** — riwayat hasil ringkasan AI, satu baris tiap kali tombol "Minta Analisis AI" ditekan.

Bobot bagian: Manajemen dan Organisasi 17,5%, Orang dan Budaya 30%, Produk dan Layanan 17,5%, Teknologi 17,5%, Operasi Usaha 17,5% — sama dengan 00_ItemBank.gs dan Buku Panduan INDI 4.0 (Kemenperin, 2018).

Untuk mengunduh seluruh data (misalnya untuk diolah di SPSS/Excel), buka tab yang diinginkan di Google Sheet lalu **File > Download > Comma Separated Values (.csv)** — dashboard sengaja tidak membuat tombol unduh terpisah supaya datanya selalu konsisten dengan Sheet asli.

## Uji otomatis (opsional, untuk yang mau mengecek logika skor & server)

Folder `tests/` berisi skrip Node.js untuk memverifikasi logika tidak berubah tanpa sengaja:

```
node tests/test_skor.js        # cocokkan dengan tesSkorContoh() di 02_SkorOtomatis.gs (harus skor 1.81, level 2)
node tests/test_contoh_gas.js  # cocokkan dengan testKirimContoh() di gas/Code.gs
node tests/test_gas_mock.js    # uji gas/Code.gs + gas/Items.gs secara menyeluruh (login, PIN salah, kirim data+foto,
                                # progres per mahasiswa, dashboard, analisis AI) dengan Google Sheet/Drive/Claude ditiru
```

Jalankan ini setiap kali `items.js` atau `gas/Code.gs` diedit (lalu salin perubahan `items.js` yang sama ke `gas/Items.gs`).

## Pemecahan masalah

- **"URL server belum diatur"** saat login/kirim data → `config.js` di GitHub belum diisi URL Web App yang benar, atau belum di-commit.
- **"PIN salah"** padahal yakin benar → cek tab `Akun` di Sheet, kolom `pin` harus berupa teks (bukan angka yang kehilangan angka 0 di depan); format kolom itu sudah diatur sebagai teks secara otomatis, tapi bisa berubah kalau diedit sembarangan.
- **Data terkirim tapi tidak muncul di Sheet** → cek apakah deployment Apps Script masih "Anyone" bisa akses (bukan "Only myself"), dan apakah `Items.gs` di Apps Script sudah sama dengan `items.js` terbaru.
- **Foto tidak tersimpan** → data wawancara tetap tersimpan walau fotonya gagal diunggah (supaya satu masalah kecil tidak menggagalkan seluruh wawancara); cek folder Drive "Foto Wawancara - Kesiapan Digital UMKM Bengkulu" dan pastikan akun Google yang men-deploy Apps Script punya cukup ruang penyimpanan Drive.
- **Dashboard menampilkan "PIN ini bukan PIN dosen/admin"** → pastikan PIN yang dipakai adalah PIN dengan peran `admin` di tab `Akun`.
- **Analisis AI gagal / "CLAUDE_API_KEY belum diisi"** → lihat bagian **Analisis AI** di atas.
- **GitHub Pages menampilkan halaman kosong/404** → tunggu 1-2 menit setelah commit pertama, pastikan `index.html` ada persis di root repo (bukan di dalam subfolder).
- **Mahasiswa bilang halaman tidak berubah setelah Anda perbaiki sesuatu** → ini HAMPIR SELALU karena lupa menaikkan `CACHE_NAME` di `sw.js` (lihat bagian **Aplikasi ini "aplikasi web" (PWA)** di atas) — service worker menyajikan file lama dari cache HP. Naikkan versinya, commit ulang, minta mahasiswa tutup aplikasi sepenuhnya lalu buka lagi (bisa dua kali).
- **Tombol "Install app" tidak muncul di Chrome Android** → pastikan dibuka lewat HTTPS (GitHub Pages otomatis HTTPS, jadi biasanya bukan ini), coba muat ulang halaman sekali lagi (kadang Chrome butuh dua kunjungan), atau langsung pakai menu titik tiga Chrome > **Install app** secara manual — hasilnya sama saja.
- **Tombol "Install app" muncul di `index.html` tapi tidak di `dashboard.html` (atau sebaliknya)** → pastikan file `manifest-dashboard.json` ikut ter-upload ke GitHub Pages (lihat daftar file di Langkah 2.2) dan commit-nya sudah selesai 1-2 menit; coba muat ulang halaman itu sekali lagi.
- **Satu wawancara tercatat jadi beberapa baris (dobel/ganda)** → lihat bagian **Data tercatat dobel/ganda** di atas: sebabnya sinyal lemah memicu kirim-ulang otomatis, bukan kesalahan mahasiswa; pastikan `gas/Code.gs` versi terbaru ini sudah terpasang di Apps Script (supaya tidak terulang), lalu bersihkan baris dobel yang sudah ada sesuai langkah di bagian itu.
