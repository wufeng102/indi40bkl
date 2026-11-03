/**
 * Dashboard pemantauan — dibuka dosen pembimbing di komputer/laptop (bukan di HP mahasiswa).
 * Mengambil ringkasan data lewat GAS (action "dashboard"), lalu menggambar
 * statistik dengan HTML/CSS biasa (tanpa pustaka grafik eksternal).
 */
(function () {
  'use strict';

  var LS_PIN = 'indi40_dash_pin_v1';
  var root = document.getElementById('dash');
  var state = { pin: null, ringkasan: null, analisis: null, memuatAnalisis: false, error: null };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
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

  function apiCall(body) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeout = controller ? setTimeout(function () { controller.abort(); }, 20000) : null;
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

  function render() {
    root.innerHTML = '';
    if (!state.pin) { root.appendChild(renderLogin()); return; }
    if (!state.ringkasan) { root.appendChild(renderMemuat()); return; }
    root.appendChild(renderDashboard());
  }

  function renderMemuat() {
    var wrap = el('div', { class: 'login-wrap' }, []);
    wrap.appendChild(el('p', {}, [state.error || 'Memuat data dashboard...']));
    if (state.error) {
      wrap.appendChild(el('button', { class: 'btn-primary', onclick: function () { muatDashboard(); } }, ['Coba Lagi']));
    }
    return wrap;
  }

  function renderLogin() {
    var wrap = el('div', { class: 'login-wrap' }, [
      el('h1', { style: 'font-size:18px' }, [typeof NAMA_PROYEK !== 'undefined' ? NAMA_PROYEK : 'Dashboard']),
      el('p', { class: 'sub' }, ['Masuk dengan PIN dosen/admin untuk melihat dashboard.']),
    ]);
    var pinInput = el('input', { type: 'password', inputmode: 'numeric', placeholder: 'PIN admin' });
    wrap.appendChild(pinInput);
    if (state.error) wrap.appendChild(el('div', { class: 'error' }, [state.error]));
    wrap.appendChild(el('button', {
      class: 'btn-primary', style: 'width:100%',
      onclick: function () { cobaMasuk(pinInput.value); },
    }, ['Masuk']));
    pinInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') cobaMasuk(pinInput.value); });
    return wrap;
  }

  function cobaMasuk(pin) {
    pin = (pin || '').trim();
    if (!pin) { state.error = 'Isi PIN dahulu.'; render(); return; }
    if (!ENDPOINT_URL || ENDPOINT_URL.indexOf('GANTI_DENGAN') === 0) {
      state.error = 'URL server belum diatur di config.js.'; render(); return;
    }
    state.pin = pin;
    state.error = null;
    render();
    muatDashboard();
  }

  function muatDashboard() {
    apiCall({ action: 'dashboard', pin: state.pin }).then(function (json) {
      if (!json || json.status !== 'ok') {
        state.pin = null; state.ringkasan = null;
        state.error = (json && json.message) || 'PIN salah.';
        render();
        return;
      }
      try { localStorage.setItem(LS_PIN, state.pin); } catch (e) {}
      state.ringkasan = json.ringkasan;
      state.error = null;
      render();
      muatAnalisisTerakhir();
    }).catch(function () {
      state.error = 'Tidak bisa menghubungi server. Cek koneksi internet atau URL server di config.js.';
      render();
    });
  }

  function muatAnalisisTerakhir() {
    apiCall({ action: 'analisisTerakhir', pin: state.pin }).then(function (json) {
      if (json && json.status === 'ok') { state.analisis = json; render(); }
    }).catch(function () {});
  }

  function mintaAnalisisAI() {
    state.memuatAnalisis = true;
    render();
    apiCall({ action: 'analisisAI', pin: state.pin }).then(function (json) {
      state.memuatAnalisis = false;
      if (json && json.status === 'ok') { state.analisis = json; }
      else { state.analisisError = (json && json.message) || 'Gagal meminta analisis.'; }
      render();
    }).catch(function () {
      state.memuatAnalisis = false;
      state.analisisError = 'Tidak bisa menghubungi server Claude lewat GAS.';
      render();
    });
  }

  function keluar() {
    state.pin = null; state.ringkasan = null; state.analisis = null;
    try { localStorage.removeItem(LS_PIN); } catch (e) {}
    render();
  }

  // ---------- bagian-bagian dashboard ----------
  function renderDashboard() {
    var r = state.ringkasan;
    var wrap = el('div', {}, []);

    wrap.appendChild(el('div', { class: 'dash-header' }, [
      el('div', {}, [
        el('h1', {}, [typeof NAMA_PROYEK !== 'undefined' ? NAMA_PROYEK : 'Dashboard']),
        el('div', { class: 'sub' }, ['Dashboard pemantauan data lapangan — dilihat oleh dosen pembimbing.']),
      ]),
      el('div', { style: 'display:flex;gap:8px' }, [
        el('button', { class: 'btn-secondary', onclick: function () { muatDashboard(); } }, ['↻ Muat Ulang']),
        el('button', { class: 'btn-secondary', onclick: keluar }, ['Keluar']),
      ]),
    ]));

    wrap.appendChild(el('div', { class: 'grid-stats' }, [
      statTile('Total wawancara masuk', r.totalEntri, ''),
      statTile('Sektor Produksi', r.perSektor['Produksi'] || 0, 'blue'),
      statTile('Sektor Dagang-Jasa', r.perSektor['Dagang-Jasa'] || 0, 'orange'),
    ]));

    wrap.appendChild(kartuProgresMahasiswa(r.perMahasiswa));
    wrap.appendChild(kartuPilar(r.pilarRataPerSektor));
    wrap.appendChild(kartuLevel(r.levelDistribusi));
    wrap.appendChild(kartuHambatan(r.hambatanTerbanyak));
    wrap.appendChild(kartuAnalisisAI());
    wrap.appendChild(kartuEntriTerbaru(r.entriTerbaru));

    return wrap;
  }

  function statTile(label, value, warna) {
    return el('div', { class: 'stat-tile' }, [
      el('div', { class: 'label' }, [label]),
      el('div', { class: 'value' + (warna ? ' ' + warna : '') }, [String(value)]),
    ]);
  }

  function kartuProgresMahasiswa(list) {
    var card = el('div', { class: 'card' }, [
      el('h2', {}, ['Progres Wawancara per Mahasiswa']),
    ]);
    if (!list || list.length === 0) {
      card.appendChild(el('p', { class: 'hint' }, ['Belum ada akun mahasiswa di tab "Akun" pada Google Sheet.']));
      return card;
    }
    list.forEach(function (m) {
      var pct = m.target > 0 ? Math.min(100, Math.round((m.sudah / m.target) * 100)) : 0;
      var selesai = m.target > 0 && m.sudah >= m.target;
      card.appendChild(el('div', { class: 'progress-mhs' }, [
        el('div', { class: 'nama' }, [m.nama + ' (' + m.peran + ')']),
        el('div', { class: 'track' }, [el('div', { class: 'fill' + (selesai ? ' selesai' : ''), style: 'width:' + pct + '%' })]),
        el('div', { class: 'ket' }, [m.sudah + ' dari ' + m.target + ' UMKM' + (selesai ? ' — target tercapai' : '')]),
      ]));
    });
    return card;
  }

  function kartuPilar(pilarRataPerSektor) {
    var kode = ['M', 'O', 'P', 'T', 'U'];
    var card = el('div', { class: 'card' }, [
      el('h2', {}, ['Rata-rata Skor per Bagian (skala 0–4)']),
      el('div', { class: 'legend' }, [
        el('span', {}, [el('span', { class: 'dot blue' }, []), 'Produksi']),
        el('span', {}, [el('span', { class: 'dot orange' }, []), 'Dagang-Jasa']),
      ]),
    ]);
    var p = pilarRataPerSektor || {};
    var prod = p['Produksi'] || { M: 0, O: 0, P: 0, T: 0, U: 0 };
    var dj = p['Dagang-Jasa'] || { M: 0, O: 0, P: 0, T: 0, U: 0 };
    kode.forEach(function (k) {
      var label = (typeof NAMA_PILAR !== 'undefined' && NAMA_PILAR[k]) ? NAMA_PILAR[k] : k;
      card.appendChild(barDuaSeri(label, prod[k] || 0, dj[k] || 0, 4));
    });
    return card;
  }

  function barDuaSeri(label, vBlue, vOrange, maks) {
    var pctBlue = Math.max(2, Math.round((vBlue / maks) * 100));
    var pctOrange = Math.max(2, Math.round((vOrange / maks) * 100));
    return el('div', { class: 'bar-row' }, [
      el('div', { class: 'bar-label' }, [el('b', {}, [label])]),
      el('div', { class: 'bar-track', style: 'margin-bottom:4px' }, [
        el('div', { class: 'bar-fill blue', style: 'width:' + pctBlue + '%' }, [el('span', { class: 'val' }, [String(vBlue)])]),
      ]),
      el('div', { class: 'bar-track' }, [
        el('div', { class: 'bar-fill orange', style: 'width:' + pctOrange + '%' }, [el('span', { class: 'val' }, [String(vOrange)])]),
      ]),
    ]);
  }

  function kartuLevel(dist) {
    var card = el('div', { class: 'card' }, [
      el('h2', {}, ['Distribusi Level Kesiapan (semua UMKM)']),
      el('div', { class: 'hint' }, ['Level 0 = paling belum siap digital, Level 4 = paling siap.']),
    ]);
    var maks = Math.max(1, Math.max.apply(null, dist || [0]));
    (dist || [0, 0, 0, 0, 0]).forEach(function (n, lvl) {
      var pct = Math.max(2, Math.round((n / maks) * 100));
      card.appendChild(el('div', { class: 'bar-row' }, [
        el('div', { class: 'bar-label' }, ['Level ' + lvl]),
        el('div', { class: 'bar-track' }, [el('div', { class: 'bar-fill blue', style: 'width:' + pct + '%' }, [el('span', { class: 'val' }, [String(n)])])]),
      ]));
    });
    return card;
  }

  function kartuHambatan(list) {
    var card = el('div', { class: 'card' }, [el('h2', {}, ['Kendala Digitalisasi yang Paling Banyak Disebut'])]);
    if (!list || list.length === 0) { card.appendChild(el('p', { class: 'hint' }, ['Belum ada data.'])); return card; }
    var maks = list[0].jumlah;
    list.forEach(function (h) {
      var pct = Math.max(2, Math.round((h.jumlah / maks) * 100));
      card.appendChild(el('div', { class: 'hambatan-row' }, [
        el('div', { class: 'label' }, [h.label]),
        el('div', { class: 'bar-track', style: 'flex:2' }, [el('div', { class: 'bar-fill blue', style: 'width:' + pct + '%' }, [el('span', { class: 'val' }, [String(h.jumlah)])])]),
      ]));
    });
    return card;
  }

  function kartuAnalisisAI() {
    var card = el('div', { class: 'card' }, [
      el('h2', {}, ['Analisis AI (Claude)']),
      el('div', { class: 'hint' }, ['Ringkasan otomatis dari data yang sudah terkumpul. Tekan tombol untuk membuat ringkasan baru (butuh CLAUDE_API_KEY sudah diisi di Script Properties — lihat README).']),
    ]);
    card.appendChild(el('button', {
      class: 'btn-primary', disabled: state.memuatAnalisis ? 'disabled' : null,
      onclick: mintaAnalisisAI,
    }, [state.memuatAnalisis ? 'Meminta analisis...' : 'Minta Analisis AI']));
    if (state.analisisError) card.appendChild(el('div', { class: 'error', style: 'margin-top:10px' }, [state.analisisError]));
    if (state.analisis) {
      card.appendChild(el('div', { class: 'ai-box' }, [state.analisis.teks]));
      card.appendChild(el('div', { class: 'ai-waktu' }, ['Dibuat: ' + formatWaktu(state.analisis.waktu)]));
    }
    return card;
  }

  function kartuEntriTerbaru(list) {
    var card = el('div', { class: 'card' }, [el('h2', {}, ['Data Masuk Terbaru (15 terakhir)'])]);
    if (!list || list.length === 0) { card.appendChild(el('p', { class: 'hint' }, ['Belum ada data masuk.'])); return card; }
    var table = el('table', { class: 'tbl' }, []);
    var thead = el('tr', {}, ['Waktu', 'Kode Usaha', 'Jenis', 'Skor', 'Level', 'Mahasiswa', 'Foto'].map(function (h) { return el('th', {}, [h]); }));
    table.appendChild(thead);
    list.forEach(function (r) {
      table.appendChild(el('tr', {}, [
        el('td', {}, [formatWaktu(r.waktu)]),
        el('td', {}, [r.kode_usaha]),
        el('td', {}, [r.sektor]),
        el('td', {}, [String(r.skor_total)]),
        el('td', {}, [String(r.level)]),
        el('td', {}, [r.nama_pengirim || '-']),
        el('td', {}, [r.foto_url ? el('a', { href: r.foto_url, target: '_blank', rel: 'noopener' }, ['Lihat']) : '-']),
      ]));
    });
    card.appendChild(table);
    return card;
  }

  function formatWaktu(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(iso); }
  }

  // ---------- init ----------
  document.addEventListener('DOMContentLoaded', function () {
    var pinTersimpan = null;
    try { pinTersimpan = localStorage.getItem(LS_PIN); } catch (e) {}
    if (pinTersimpan) { state.pin = pinTersimpan; render(); muatDashboard(); }
    else { render(); }
  });
})();
