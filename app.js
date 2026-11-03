/**
 * Aplikasi input data lapangan — Kesiapan Digital UMKM Kota Bengkulu.
 * Vanilla JS, tanpa framework, supaya mudah dibaca dan dirawat oleh dosen
 * pembimbing sendiri. Bergantung pada items.js (bank soal) dan config.js
 * (URL Web App GAS).
 */

(function () {
  'use strict';

  var LS_DRAFT = 'indi40_draft_v1';
  var LS_QUEUE = 'indi40_queue_v1';
  var LS_SESSION = 'indi40_session_v1';

  // Langkah yang TAMPIL di garis progres (dipakai utk hitung persen & panduan).
  var STEPS = ['login', 'home', 'consent', 'profil', 'foto', 'M', 'O', 'P', 'T', 'U', 'hambatan', 'review', 'done'];
  var LANGKAH_ISI = ['consent', 'profil', 'foto', 'M', 'O', 'P', 'T', 'U', 'hambatan', 'review']; // tanpa login/home/done
  var STEP_LABEL = {
    login: 'Masuk', home: 'Mulai', consent: 'Izin & Jenis Usaha', profil: 'Data Usaha',
    foto: 'Foto Usaha',
    M: 'Manajemen & Organisasi', O: 'Orang & Budaya', P: 'Produk & Layanan',
    T: 'Teknologi', U: 'Operasi Usaha', hambatan: 'Kendala & Catatan',
    review: 'Cek Lagi & Kirim', done: 'Selesai',
  };

  var state = {
    stepIndex: 0,
    answers: {},
    lastResult: null,
    session: null,       // {pin, peran, nama, target}
    progressCache: null, // {sudah, target} — dimuat sekali per kunjungan ke layar Mulai
    showPanduan: false,
    loginBusy: false,
    loginError: null,
  };

  var appEl = document.getElementById('app');

  // ---------- util ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return; // jangan set atribut kosong (mis. checked: null)
      if (k === 'class') node.className = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(LS_QUEUE) || '[]'); } catch (e) { return []; }
  }
  function saveQueue(q) {
    try { localStorage.setItem(LS_QUEUE, JSON.stringify(q)); } catch (e) {}
  }
  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(LS_DRAFT) || 'null'); } catch (e) { return null; }
  }
  function saveDraft() {
    try { localStorage.setItem(LS_DRAFT, JSON.stringify(state.answers)); } catch (e) {}
  }
  function clearDraft() {
    try { localStorage.removeItem(LS_DRAFT); } catch (e) {}
  }
  function loadSession() {
    try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); } catch (e) { return null; }
  }
  function saveSession(sess) {
    try { localStorage.setItem(LS_SESSION, JSON.stringify(sess)); } catch (e) {}
  }
  function clearSession() {
    try { localStorage.removeItem(LS_SESSION); } catch (e) {}
  }

  function currentItems() {
    if (!state.answers.sektor) return [];
    return getItemsForSektor(state.answers.sektor);
  }

  function goTo(stepName) {
    var idx = STEPS.indexOf(stepName);
    if (idx >= 0) state.stepIndex = idx;
    window.scrollTo(0, 0);
    render();
  }
  function goStep(delta) {
    state.stepIndex = Math.max(0, Math.min(STEPS.length - 1, state.stepIndex + delta));
    window.scrollTo(0, 0);
    render();
  }

  // ---------- panggilan ke server (selalu POST + text/plain, menghindari masalah CORS di GAS) ----------
  function apiCall(body, timeoutMs) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeout = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 15000) : null;
    return fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    }).then(function (res) {
      if (timeout) clearTimeout(timeout);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  // ---------- validation per step ----------
  function stopReason() {
    var a = state.answers;
    if (a.jenisUsahaStop) return 'Jenis usaha di luar cakupan riset ini.';
    if (a.lama_usaha !== undefined && a.lama_usaha !== '' && Number(a.lama_usaha) < 1) {
      return 'Usaha berjalan kurang dari 1 tahun, bukan sampel riset ini.';
    }
    if (a.omzet_kat === 3) return 'Omzet di atas Rp15 miliar, bukan sampel riset ini (bukan UMKM).';
    return null;
  }

  function validateStep(stepName) {
    var a = state.answers;
    if (stepName === 'consent') {
      if (!a.consent) return 'Centang dulu kotak persetujuan responden.';
      if (!a.sektor) return 'Pilih jenis usaha (Produksi atau Dagang-Jasa) dahulu.';
      if (!a.jenisUsahaKode) return 'Pilih jenis usaha yang paling sesuai.';
      if (a.jenisUsahaStop) return 'Usaha ini di luar cakupan riset. Tidak bisa dilanjutkan — ucapkan terima kasih ke responden.';
      return null;
    }
    if (stepName === 'profil') {
      if (!a.kode_seq) return 'Isi dulu nomor urut kode usaha.';
      var missing = PROFIL_UMUM.some(function (p) { return a[p.key] === undefined || a[p.key] === ''; });
      if (missing) return 'Masih ada pertanyaan data usaha yang belum diisi.';
      var stop = stopReason();
      if (stop) return stop + ' Tidak bisa dilanjutkan — ucapkan terima kasih ke responden.';
      return null;
    }
    if (stepName === 'foto') return null; // foto bersifat opsional, tidak menghalangi lanjut
    if (['M', 'O', 'P', 'T', 'U'].indexOf(stepName) >= 0) {
      var items = currentItems().filter(function (it) { return it.pilar === stepName; });
      var belum = items.some(function (it) {
        if (it.tipe !== 'single') return false;
        return a[it.kode] === undefined || a[it.kode] === '';
      });
      if (belum) return 'Masih ada pertanyaan pilihan tunggal yang belum dijawab di bagian ini.';
      return null;
    }
    return null;
  }

  // ---------- rendering per step ----------
  function render() {
    appEl.innerHTML = '';
    if (state.showPanduan) { appEl.appendChild(renderPanduanOverlay()); return; }
    var stepName = STEPS[state.stepIndex];
    appEl.appendChild(renderTopbar(stepName));
    var mainEl = el('main', {}, [renderStep(stepName)]);
    appEl.appendChild(mainEl);
    var nav = renderNav(stepName);
    if (nav) appEl.appendChild(nav);
  }

  function renderTopbar(stepName) {
    var posisi = LANGKAH_ISI.indexOf(stepName);
    var pct = posisi >= 0 ? Math.round(((posisi + 1) / LANGKAH_ISI.length) * 100) : 0;
    var bar = el('div', { class: 'topbar' }, [
      el('h1', {}, [typeof NAMA_PROYEK !== 'undefined' ? NAMA_PROYEK : 'Survei Lapangan']),
    ]);
    if (posisi >= 0) {
      bar.appendChild(el('div', { class: 'progress-track' }, [el('div', { class: 'progress-fill', style: 'width:' + pct + '%' })]));
      bar.appendChild(el('div', { class: 'step-label' }, ['Langkah: ' + STEP_LABEL[stepName]]));
    }
    return el('header', { class: 'topbar' }, Array.prototype.slice.call(bar.children));
  }

  function renderNav(stepName) {
    if (['home', 'done', 'login'].indexOf(stepName) >= 0) return null;
    var backBtn = el('button', { class: 'btn-secondary', onclick: function () { goStep(-1); } }, ['← Kembali']);
    var nextLabel = stepName === 'review' ? 'Kirim Data' : 'Lanjut →';
    var nextBtn = el('button', {
      class: 'btn-primary', onclick: function () {
        var msg = validateStep(stepName);
        if (msg) { alert(msg); return; }
        saveDraft();
        if (stepName === 'review') { doSubmit(); return; }
        goStep(1);
      }
    }, [nextLabel]);
    return el('nav', { class: 'bottom-nav' }, [backBtn, nextBtn]);
  }

  function renderStep(stepName) {
    if (stepName === 'login') return renderLogin();
    if (stepName === 'home') return renderHome();
    if (stepName === 'consent') return renderConsent();
    if (stepName === 'profil') return renderProfil();
    if (stepName === 'foto') return renderFoto();
    if (['M', 'O', 'P', 'T', 'U'].indexOf(stepName) >= 0) return renderPilar(stepName);
    if (stepName === 'hambatan') return renderHambatan();
    if (stepName === 'review') return renderReview();
    if (stepName === 'done') return renderDone();
    return el('div', {}, ['...']);
  }

  // ---- LOGIN ----
  function renderLogin() {
    var wrap = el('div', {}, []);
    wrap.appendChild(el('div', { class: 'card home-card' }, [
      el('div', { class: 'icon' }, ['🔑']),
      el('h2', {}, [typeof NAMA_PROYEK !== 'undefined' ? NAMA_PROYEK : 'Survei Lapangan']),
      el('p', { class: 'subtitle' }, ['Masukkan PIN yang diberikan dosen pembimbing untuk masuk.']),
    ]));

    var pinInput = el('input', {
      type: 'tel', inputmode: 'numeric', placeholder: 'PIN', autocomplete: 'off',
      style: 'font-size:22px;text-align:center;letter-spacing:4px',
      value: state.loginPinSementara || '',
      oninput: function (e) { state.loginPinSementara = e.target.value.replace(/[^0-9]/g, ''); e.target.value = state.loginPinSementara; },
    });
    var card = el('div', { class: 'card' }, [
      el('div', { class: 'question' }, [pinInput]),
    ]);
    if (state.loginError) {
      card.appendChild(el('div', { class: 'banner error' }, [state.loginError]));
    }
    card.appendChild(el('button', {
      class: 'btn-primary', style: 'width:100%;margin-top:8px',
      onclick: function () { doLogin(state.loginPinSementara || ''); },
    }, [state.loginBusy ? 'Memeriksa...' : 'Masuk']));
    wrap.appendChild(card);

    wrap.appendChild(el('p', { class: 'small-note' }, [
      'Belum punya PIN atau lupa PIN? Hubungi dosen pembimbing. Setelah berhasil masuk sekali, HP ini akan ' +
      'tetap "ingat" sampai Anda menekan tombol Keluar.',
    ]));
    return wrap;
  }

  function doLogin(pin) {
    if (!pin) { state.loginError = 'Isi PIN dahulu.'; render(); return; }
    if (!ENDPOINT_URL || ENDPOINT_URL.indexOf('GANTI_DENGAN') === 0) {
      state.loginError = 'URL server belum diatur di aplikasi ini (config.js). Hubungi dosen pembimbing.';
      render();
      return;
    }
    state.loginBusy = true; state.loginError = null; render();
    apiCall({ action: 'login', pin: pin }).then(function (json) {
      state.loginBusy = false;
      if (!json || json.status !== 'ok') {
        state.loginError = (json && json.message) || 'PIN salah.';
        render();
        return;
      }
      if (json.isAdmin) {
        state.loginError = 'PIN ini adalah PIN dosen/admin. Aplikasi di HP ini untuk mahasiswa yang mewawancarai. Buka dashboard.html di komputer untuk memantau data.';
        render();
        return;
      }
      state.session = { pin: pin, peran: json.peran, nama: json.nama, target: json.target };
      saveSession(state.session);
      state.progressCache = null;
      state.loginPinSementara = '';
      goTo('home');
    }).catch(function () {
      state.loginBusy = false;
      state.loginError = 'Tidak bisa menghubungi server. Pastikan HP terhubung internet (login butuh sinyal, wawancara sesudahnya boleh tanpa sinyal).';
      render();
    });
  }

  // ---- HOME ----
  function renderHome() {
    var queue = loadQueue();
    var draft = loadDraft();
    var wrap = el('div', {}, []);

    wrap.appendChild(el('div', { class: 'card home-card' }, [
      el('div', { class: 'icon' }, ['📋']),
      el('h2', {}, [typeof NAMA_PROYEK !== 'undefined' ? NAMA_PROYEK : 'Survei Lapangan']),
      el('p', { class: 'subtitle' }, ['Halo, ' + (state.session ? state.session.nama : '') + '.']),
    ]));

    wrap.appendChild(renderKartuProgres());

    if (queue.length > 0) {
      wrap.appendChild(el('div', { class: 'banner warn' }, [
        '⚠️ ' + queue.length + ' data belum terkirim (tersimpan di HP ini). ',
        el('button', {
          class: 'btn-secondary', style: 'margin-top:8px;display:block;width:100%',
          onclick: function () { flushQueue(true); }
        }, ['Coba Kirim Sekarang']),
      ]));
    }

    if (draft && Object.keys(draft).length > 0) {
      wrap.appendChild(el('div', { class: 'card' }, [
        el('p', {}, ['Ada wawancara yang belum selesai (draf tersimpan di HP ini).']),
        el('button', {
          class: 'btn-primary', style: 'width:100%;margin-bottom:8px',
          onclick: function () { state.answers = draft; goTo('consent'); }
        }, ['Lanjutkan Draf']),
        el('button', {
          class: 'btn-secondary', style: 'width:100%',
          onclick: function () { if (confirm('Hapus draf dan mulai baru?')) { clearDraft(); state.answers = {}; goTo('consent'); } }
        }, ['Buang Draf, Mulai Baru']),
      ]));
    } else {
      wrap.appendChild(el('button', {
        class: 'btn-primary', style: 'width:100%',
        onclick: function () { state.answers = {}; goTo('consent'); }
      }, ['Mulai Wawancara Baru']));
    }

    wrap.appendChild(el('div', { style: 'display:flex;gap:8px;margin-top:14px' }, [
      el('button', { class: 'btn-secondary', style: 'flex:1', onclick: function () { state.showPanduan = true; render(); } }, ['📖 Panduan']),
      el('button', {
        class: 'btn-secondary', style: 'flex:1',
        onclick: function () {
          if (confirm('Keluar dan ganti pengguna?')) { clearSession(); state.session = null; state.progressCache = null; goTo('login'); }
        }
      }, ['Keluar']),
    ]));

    wrap.appendChild(el('p', { class: 'small-note' }, [
      'Data tersimpan di HP ini sampai berhasil terkirim ke server. Jangan hapus data/penyimpanan aplikasi ' +
      'sebelum memastikan semua data terkirim (lihat tanda di atas, harus sampai 0).',
    ]));
    return wrap;
  }

  function renderKartuProgres() {
    var box = el('div', { class: 'card' }, []);
    if (!state.session) return box;
    if (state.progressCache === null) {
      box.appendChild(el('p', { class: 'subtitle' }, ['Memuat progres Anda...']));
      muatProgres();
    } else {
      var sudah = state.progressCache.sudah;
      var target = state.progressCache.target || state.session.target || 0;
      var pct = target > 0 ? Math.min(100, Math.round((sudah / target) * 100)) : 0;
      box.appendChild(el('div', { class: 'summary-row' }, [
        el('span', { class: 'k' }, [el('b', {}, ['Progres Anda'])]),
        el('span', { class: 'v' }, [sudah + ' dari ' + target + ' UMKM']),
      ]));
      box.appendChild(el('div', { class: 'progress-track' }, [el('div', { class: 'progress-fill', style: 'width:' + pct + '%' })]));
      if (target > 0 && sudah >= target) {
        box.appendChild(el('p', { class: 'small-note', style: 'color:#15803d;font-weight:600' }, ['Target sudah tercapai. Terima kasih! Boleh tetap lanjut kalau dosen minta tambahan.']));
      }
    }
    return box;
  }

  function muatProgres() {
    if (!state.session || state._progresSedangDimuat) return;
    state._progresSedangDimuat = true;
    apiCall({ action: 'progress', pin: state.session.pin }).then(function (json) {
      state._progresSedangDimuat = false;
      if (json && json.status === 'ok') {
        state.progressCache = { sudah: json.sudah, target: json.target };
        if (STEPS[state.stepIndex] === 'home') render();
      }
    }).catch(function () { state._progresSedangDimuat = false; });
  }

  // ---- PANDUAN (overlay, bisa dibuka dari layar Mulai) ----
  function renderPanduanOverlay() {
    var wrap = el('div', { class: 'panduan-overlay' }, []);
    var card = el('div', { class: 'card' }, [
      el('h2', {}, ['Panduan Penggunaan']),
      el('p', {}, ['Ikuti urutan ini setiap kali mewawancarai satu UMKM:']),
      el('ol', { class: 'panduan-list' }, [
        el('li', {}, [el('b', {}, ['1. Izin.']), ' Jelaskan ke pemilik usaha bahwa ini untuk riset kampus, bersifat sukarela, dan jawabannya dijaga kerahasiaannya. Centang kotak izin kalau pemilik setuju.']),
        el('li', {}, [el('b', {}, ['2. Jenis usaha.']), ' Pilih Produksi atau Dagang-Jasa, lalu pilih jenis usaha yang paling cocok.']),
        el('li', {}, [el('b', {}, ['3. Data usaha.']), ' Isi kode usaha (nomor urut) dan beberapa data umum usaha ini.']),
        el('li', {}, [el('b', {}, ['4. Foto.']), ' Ambil 1 foto tampak usaha (boleh dilewati kalau pemilik tidak berkenan).']),
        el('li', {}, [el('b', {}, ['5. Pertanyaan inti.']), ' Ada 5 bagian (Manajemen, Orang & Budaya, Produk, Teknologi, Operasi). Bacakan tiap pertanyaan ke pemilik usaha, lalu pilih jawaban yang paling sesuai dengan apa yang sebenarnya terjadi di usaha itu — bukan yang ingin didengar pemilik.']),
        el('li', {}, [el('b', {}, ['6. Kendala & catatan.']), ' Tanyakan kendala terbesar dan rencana usaha ke depan.']),
        el('li', {}, [el('b', {}, ['7. Cek lagi & kirim.']), ' Periksa ringkasan, lalu tekan "Kirim Data".']),
      ]),
      el('h2', {}, ['Kalau sinyal HP lemah di lokasi']),
      el('p', {}, ['Tetap lanjutkan wawancara seperti biasa. Saat ditekan "Kirim Data", kalau sinyal tidak ada, data otomatis disimpan dulu di HP (bukan hilang). Nanti di layar Mulai akan ada tanda jumlah data yang belum terkirim — begitu sinyal kembali, tekan "Coba Kirim Sekarang".']),
      el('h2', {}, ['Progres & target']),
      el('p', {}, ['Jumlah UMKM yang sudah Anda wawancarai dan target Anda muncul di layar Mulai, dihitung otomatis oleh server setelah data terkirim (bukan dari data yang masih tersimpan di HP).']),
      el('h2', {}, ['Kalau ada masalah']),
      el('p', {}, ['Hubungi dosen pembimbing. Jangan hapus aplikasi atau data browser di HP sebelum memastikan semua data sudah terkirim.']),
      el('button', { class: 'btn-primary', style: 'width:100%;margin-top:8px', onclick: function () { state.showPanduan = false; render(); } }, ['Tutup']),
    ]);
    wrap.appendChild(card);
    return wrap;
  }

  // ---- CONSENT + SEKTOR ----
  function renderConsent() {
    var a = state.answers;
    var wrap = el('div', {}, []);
    wrap.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'consent-box' }, [
        el('b', {}, ['Izin responden. ']),
        'Bacakan dulu ke pemilik usaha: penelitian ini untuk riset kampus, bersifat sukarela, ' +
        'jawaban dijaga kerahasiaannya dan hanya dipakai untuk kepentingan penelitian. Centang kotak di ' +
        'bawah kalau pemilik usaha setuju diwawancarai.',
      ]),
      checkboxSingle('consent', a.consent, 'Pemilik usaha setuju diwawancarai secara sukarela', function (val) {
        a.consent = val; render();
      }),
    ]));

    wrap.appendChild(el('div', { class: 'card' }, [
      el('h2', {}, ['Jenis usaha']),
      el('div', { class: 'sektor-choice' }, [
        sektorOption('produksi', 'Usaha Produksi', 'Mengolah bahan jadi produk: makanan/minuman, fesyen & batik, atau kerajinan', a),
        sektorOption('dagangjasa', 'Usaha Dagang atau Jasa', 'Berjualan barang (toko/reseller), rumah makan/warung, atau jasa', a),
      ]),
    ]));

    if (a.sektor) {
      var ju = JENIS_USAHA[a.sektor];
      var optWrap = el('div', {}, []);
      ju.opsi.forEach(function (o) {
        optWrap.appendChild(el('div', {
          class: 'opt' + (a.jenisUsahaKode === o.kode ? ' selected' : ''),
          onclick: function () {
            a.jenisUsahaKode = o.kode;
            a.jenisUsahaStop = !!o.stop;
            render();
          }
        }, [
          el('input', { type: 'radio', name: 'jenisusaha', checked: a.jenisUsahaKode === o.kode ? 'checked' : null }),
          el('div', { class: 'opt-text' }, [o.teks]),
        ]));
      });
      wrap.appendChild(el('div', { class: 'card' }, [el('h2', {}, ['Pilih yang paling sesuai']), optWrap]));

      if (a.jenisUsahaStop) {
        wrap.appendChild(el('div', { class: 'banner error' }, [
          'Usaha ini di luar cakupan riset. Hentikan wawancara dengan sopan, ucapkan terima kasih ke pemilik usaha.',
        ]));
      }
    }
    return wrap;
  }

  function sektorOption(key, title, desc, a) {
    var selected = a.sektor === key;
    return el('div', {
      class: 'opt' + (selected ? ' selected' : ''),
      onclick: function () {
        if (a.sektor !== key) { a.jenisUsahaKode = null; a.jenisUsahaStop = false; }
        a.sektor = key; render();
      }
    }, [
      el('input', { type: 'radio', name: 'sektor', checked: selected ? 'checked' : null }),
      el('div', {}, [
        el('div', { class: 'opt-text', style: 'font-weight:600' }, [title]),
        el('div', { class: 'opt-text', style: 'color:#6b7280;font-size:13px' }, [desc]),
      ]),
    ]);
  }

  function checkboxSingle(key, checked, label, onChange) {
    return el('div', {
      class: 'opt' + (checked ? ' selected' : ''),
      onclick: function () { onChange(!checked); }
    }, [
      el('input', { type: 'checkbox', checked: checked ? 'checked' : null, onclick: function (e) { e.stopPropagation(); onChange(e.target.checked); } }),
      el('div', { class: 'opt-text' }, [label]),
    ]);
  }

  // ---- PROFIL ----
  function renderProfil() {
    var a = state.answers;
    var ju = JENIS_USAHA[a.sektor];
    var card = el('div', { class: 'card' }, [
      el('h2', {}, ['Data Usaha']),
      el('p', { class: 'subtitle' }, ['Nama usaha, nama pemilik, dan kontak TIDAK dicatat di sini. Kalau perlu, simpan terpisah dan hubungkan lewat kode usaha.']),
      el('div', { class: 'question' }, [
        el('div', { class: 'q-text' }, ['Kode usaha']),
        el('div', { class: 'kode-usaha-row' }, [
          el('span', { class: 'kode-prefix' }, [ju.prefix + '-' + a.jenisUsahaKode + '-']),
          el('input', {
            type: 'text', inputmode: 'numeric', placeholder: '001', value: a.kode_seq || '',
            oninput: function (e) { a.kode_seq = e.target.value.replace(/[^0-9]/g, ''); e.target.value = a.kode_seq; }
          }),
        ]),
        el('div', { class: 'helper' }, ['Nomor urut usaha yang Anda wawancarai, misalnya 001, 002, dan seterusnya.']),
      ]),
    ]);

    PROFIL_UMUM.forEach(function (p) {
      card.appendChild(renderQuestionGeneric(p, a));
    });
    return card;
  }

  function renderQuestionGeneric(p, a) {
    var q = el('div', { class: 'question' }, [el('div', { class: 'q-text' }, [p.tanya])]);
    if (p.tipe === 'short') {
      q.appendChild(el('input', {
        type: 'text', value: a[p.key] || '',
        oninput: function (e) { a[p.key] = e.target.value; }
      }));
    } else {
      p.opsi.forEach(function (opt, i) {
        q.appendChild(el('div', {
          class: 'opt' + (a[p.key] === i ? ' selected' : ''),
          onclick: function () { a[p.key] = i; render(); }
        }, [
          el('input', { type: 'radio', checked: a[p.key] === i ? 'checked' : null }),
          el('div', { class: 'opt-text' }, [opt]),
        ]));
      });
    }
    return q;
  }

  // ---- FOTO ----
  function renderFoto() {
    var a = state.answers;
    var card = el('div', { class: 'card' }, [
      el('h2', {}, ['Foto Usaha']),
      el('p', { class: 'subtitle' }, ['Ambil 1 foto tampak depan atau dalam usaha ini. Boleh dilewati kalau pemilik usaha tidak berkenan difoto.']),
    ]);

    if (a.foto) {
      card.appendChild(el('img', { src: a.foto, style: 'width:100%;border-radius:10px;margin-bottom:10px' }, []));
      card.appendChild(el('button', {
        class: 'btn-secondary', style: 'width:100%',
        onclick: function () { a.foto = null; render(); }
      }, ['Ambil Ulang']));
    } else {
      var fileInput = el('input', {
        type: 'file', accept: 'image/*', capture: 'environment', id: 'inputFoto', style: 'display:none',
        onchange: function (e) { prosesFoto(e.target.files && e.target.files[0]); },
      });
      card.appendChild(fileInput);
      card.appendChild(el('label', {
        for: 'inputFoto', class: 'btn-primary foto-btn', style: 'width:100%;display:flex;align-items:center;justify-content:center;gap:8px',
      }, ['📷 Ambil Foto']));
    }
    return card;
  }

  function prosesFoto(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var maxLebar = 900;
        var skala = Math.min(1, maxLebar / img.width);
        var w = Math.round(img.width * skala), h = Math.round(img.height * skala);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        state.answers.foto = canvas.toDataURL('image/jpeg', 0.6);
        render();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---- PILAR ----
  function renderPilar(kodePilar) {
    var a = state.answers;
    var items = currentItems().filter(function (it) { return it.pilar === kodePilar; });
    var card = el('div', { class: 'card' }, [
      el('h2', {}, ['Bagian ' + NAMA_PILAR[kodePilar]]),
    ]);
    items.forEach(function (it) {
      var q = el('div', { class: 'question' }, []);
      if (it.sektorKhusus) {
        q.appendChild(el('div', { class: 'adaptasi-flag' }, ['Pertanyaan ini sedikit berbeda redaksinya untuk usaha Dagang-Jasa']));
      }
      q.appendChild(el('div', { class: 'q-text' }, [it.kode + '. ' + it.tanya]));

      if (it.tipe === 'single') {
        it.opsi.forEach(function (opt, i) {
          q.appendChild(el('div', {
            class: 'opt' + (a[it.kode] === i ? ' selected' : ''),
            onclick: function () { a[it.kode] = i; render(); }
          }, [
            el('input', { type: 'radio', checked: a[it.kode] === i ? 'checked' : null }),
            el('div', { class: 'opt-text' }, [opt]),
          ]));
        });
      } else {
        var arr = a[it.kode] || [];
        it.opsi.forEach(function (opt) {
          var checked = arr.indexOf(opt) >= 0;
          q.appendChild(el('div', {
            class: 'opt' + (checked ? ' selected' : ''),
            onclick: function () {
              var cur = a[it.kode] || [];
              var idx = cur.indexOf(opt);
              if (idx >= 0) cur.splice(idx, 1); else cur.push(opt);
              a[it.kode] = cur;
              render();
            }
          }, [
            el('input', { type: 'checkbox', checked: checked ? 'checked' : null }),
            el('div', { class: 'opt-text' }, [opt]),
          ]));
        });
      }
      if (it.bukti) q.appendChild(el('div', { class: 'q-bukti' }, ['Yang perlu dilihat langsung: ' + it.bukti]));
      card.appendChild(q);
    });
    return card;
  }

  // ---- HAMBATAN + TERBUKA ----
  function renderHambatan() {
    var a = state.answers;
    var sel = a.hambatan || [];
    var card = el('div', { class: 'card' }, [
      el('h2', {}, ['Kendala Usaha Ini Pakai Teknologi Digital']),
      el('p', { class: 'subtitle' }, ['Bacakan daftar ke pemilik usaha. Minta pemilik memilih paling banyak tiga yang paling menghambat.']),
    ]);
    HAMBATAN.forEach(function (h) {
      var checked = sel.indexOf(h) >= 0;
      card.appendChild(el('div', {
        class: 'opt' + (checked ? ' selected' : ''),
        onclick: function () {
          var cur = a.hambatan || [];
          var idx = cur.indexOf(h);
          if (idx >= 0) { cur.splice(idx, 1); }
          else {
            if (cur.length >= 3) { alert('Pilih paling banyak 3 kendala saja.'); return; }
            cur.push(h);
          }
          a.hambatan = cur;
          render();
        }
      }, [
        el('input', { type: 'checkbox', checked: checked ? 'checked' : null }),
        el('div', { class: 'opt-text' }, [h]),
      ]));
    });

    var card2 = el('div', { class: 'card' }, [el('h2', {}, ['Catatan Tambahan'])]);
    PERTANYAAN_TERBUKA.forEach(function (q) {
      card2.appendChild(el('div', { class: 'question' }, [
        el('div', { class: 'q-text' }, [q.tanya]),
        el('textarea', {
          oninput: function (e) { a[q.key] = e.target.value; }
        }, [a[q.key] || '']),
      ]));
    });

    var wrap = el('div', {}, [card, card2]);
    return wrap;
  }

  // ---- REVIEW ----
  function renderReview() {
    var a = state.answers;
    var items = currentItems();
    var skorItem = {};
    items.forEach(function (it) { skorItem[it.kode] = skorItemDariJawaban(it, a[it.kode]); });
    var agregat = hitungAgregat(items, skorItem);
    state.lastResult = agregat;

    var ju = JENIS_USAHA[a.sektor];
    var wrap = el('div', {}, []);
    wrap.appendChild(el('div', { class: 'card' }, [
      el('h2', {}, ['Cek Lagi Sebelum Kirim']),
      el('div', { class: 'summary-row' }, [el('span', { class: 'k' }, ['Kode usaha']), el('span', { class: 'v' }, [ju.prefix + '-' + a.jenisUsahaKode + '-' + a.kode_seq])]),
      el('div', { class: 'summary-row' }, [el('span', { class: 'k' }, ['Jenis usaha']), el('span', { class: 'v' }, [a.sektor === 'produksi' ? 'Produksi' : 'Dagang-Jasa'])]),
      el('div', { class: 'summary-row' }, [el('span', { class: 'k' }, ['Produk/layanan']), el('span', { class: 'v' }, [a.produk_utama || '-'])]),
      el('div', { class: 'summary-row' }, [el('span', { class: 'k' }, ['Kecamatan']), el('span', { class: 'v' }, [a.kecamatan || '-'])]),
      el('div', { class: 'summary-row' }, [el('span', { class: 'k' }, ['Foto']), el('span', { class: 'v' }, [a.foto ? 'Ada' : 'Tidak ada'])]),
    ]));

    wrap.appendChild(el('div', { class: 'card' }, [
      el('h2', {}, ['Perkiraan Skor (dihitung ulang di server)']),
      ['M', 'O', 'P', 'T', 'U'].map(function (p) {
        return el('div', { class: 'summary-row' }, [el('span', { class: 'k' }, [NAMA_PILAR[p]]), el('span', { class: 'v' }, [String(agregat.pilarSkor[p])])]);
      }).reduce(function (acc, node) { acc.appendChild(node); return acc; }, el('div', {}, [])),
      el('div', { class: 'summary-row' }, [el('span', { class: 'k' }, [el('b', {}, ['Skor total'])]), el('span', { class: 'v' }, [String(agregat.skorTotal)])]),
      el('div', { class: 'summary-row' }, [el('span', { class: 'k' }, [el('b', {}, ['Level kesiapan'])]), el('span', { class: 'v' }, [String(agregat.level) + ' dari 4'])]),
    ]));

    wrap.appendChild(el('p', { class: 'small-note' }, ['Tekan "Kirim Data" untuk menyimpan ke server. Kalau sinyal lemah, data disimpan dulu di HP dan dikirim otomatis saat sinyal kembali.']));
    return wrap;
  }

  // ---- DONE ----
  function renderDone() {
    var ok = state.lastSubmitOk;
    var wrap = el('div', {}, []);
    wrap.appendChild(el('div', { class: 'card home-card' }, [
      el('div', { class: 'icon' }, [ok ? '✅' : '📴']),
      el('h2', {}, [ok ? 'Data Terkirim' : 'Tersimpan di HP']),
      el('p', { class: 'subtitle' }, [ok
        ? 'Data wawancara berhasil disimpan ke server.'
        : 'Sinyal tidak tersedia. Data disimpan di HP ini dan akan dikirim otomatis begitu sinyal kembali, atau tekan "Coba Kirim Sekarang" di layar Mulai.']),
      el('button', {
        class: 'btn-primary', style: 'width:100%',
        onclick: function () { state.answers = {}; clearDraft(); goTo('home'); }
      }, ['Wawancara Berikutnya']),
    ]));
    return wrap;
  }

  // ---------- submit & queue ----------
  function buildPayload() {
    var a = state.answers;
    var ju = JENIS_USAHA[a.sektor];
    var items = currentItems();
    var skorItem = {};
    items.forEach(function (it) { skorItem[it.kode] = skorItemDariJawaban(it, a[it.kode]); });
    var payload = {
      pin: state.session ? state.session.pin : '',
      kode_usaha: ju.prefix + '-' + a.jenisUsahaKode + '-' + a.kode_seq,
      sektor: a.sektor === 'produksi' ? 'Produksi' : 'Dagang-Jasa',
      jenis_usaha: a.jenisUsahaKode,
      produk_utama: a.produk_utama || '',
      kecamatan: a.kecamatan || '',
      lama_usaha: a.lama_usaha || '',
      pekerja: a.pekerja || '',
      omzet_kat: a.omzet_kat,
      usia: a.usia || '',
      pendidikan: a.pendidikan,
      posisi: a.posisi,
      pelatihan: a.pelatihan,
      pembiayaan: a.pembiayaan,
      jawaban: {},
      hambatan: a.hambatan || [],
      tantangan_terbesar: a.tantangan_terbesar || '',
      bantuan_diharapkan: a.bantuan_diharapkan || '',
      rencana_setahun: a.rencana_setahun || '',
      foto_base64: a.foto || '',
      waktu_kirim: new Date().toISOString(),
    };
    items.forEach(function (it) { payload.jawaban[it.kode] = a[it.kode] !== undefined ? a[it.kode] : ''; });
    return payload;
  }

  function postPayload(payload) {
    return apiCall(payload).then(function (json) {
      if (!json || json.status !== 'ok') throw new Error((json && json.message) || 'Respons server tidak sesuai.');
      return json;
    });
  }

  function doSubmit() {
    var payload = buildPayload();
    var nextBtn = document.querySelector('.btn-primary');
    if (nextBtn) { nextBtn.disabled = true; nextBtn.textContent = 'Mengirim...'; }

    if (!ENDPOINT_URL || ENDPOINT_URL.indexOf('GANTI_DENGAN') === 0) {
      alert('URL server belum diatur (config.js). Hubungi dosen pembimbing.');
      if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'Kirim Data'; }
      return;
    }

    postPayload(payload).then(function () {
      state.lastSubmitOk = true;
      state.progressCache = null; // paksa muat ulang progres di layar Mulai
      clearDraft();
      goTo('done');
    }).catch(function () {
      var q = loadQueue();
      q.push(payload);
      saveQueue(q);
      state.lastSubmitOk = false;
      clearDraft();
      goTo('done');
    });
  }

  function flushQueue(manual) {
    var q = loadQueue();
    if (q.length === 0) { if (manual) alert('Tidak ada data tertunda.'); return; }
    var remaining = [];
    var sent = 0;
    var tasks = q.map(function (payload) {
      return postPayload(payload).then(function () { sent++; }).catch(function () { remaining.push(payload); });
    });
    Promise.all(tasks).then(function () {
      saveQueue(remaining);
      if (sent > 0) state.progressCache = null;
      if (manual) alert(sent + ' data terkirim. ' + remaining.length + ' masih tertunda.');
      render();
    });
  }

  // ---------- init ----------
  window.addEventListener('online', function () { flushQueue(false); });
  document.addEventListener('DOMContentLoaded', function () {
    state.session = loadSession();
    state.stepIndex = state.session ? STEPS.indexOf('home') : STEPS.indexOf('login');
    flushQueue(false);
    render();
  });
})();
