/**
 * PERONI APPLICATION TERMINAL - PORTAL INTERFACE JS
 * PT Peroni Karya Sentra
 */

(function () {
  'use strict';

  // State aplikasi
  let allApps = [];
  let departments = [];
  let activeCategory = 'Semua';
  let searchQuery = '';

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const categoryTabsEl = document.getElementById('categoryTabs');
  const appContainerEl = document.getElementById('appContainer');

  // Load Data Aplikasi dari Server
  async function loadApps() {
    try {
      const response = await fetch('api/apps.php?t=' + Date.now());
      if (!response.ok) {
        throw new Error('Gagal mengambil data aplikasi dari server.');
      }
      const resData = await response.json();
      if (resData.status === 'success') {
        allApps = resData.data.apps || [];
        departments = resData.data.departments || [];
        renderCategoryTabs();
        renderApps();
      }
    } catch (err) {
      console.error(err);
      if (appContainerEl) {
        appContainerEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-title">Koneksi Terminal Terputus</div>
            <div class="empty-sub">Tidak dapat memuat konfigurasi aplikasi dari server. Pastikan Laragon/Apache aktif.</div>
          </div>
        `;
      }
    }
  }

  // Render Tombol Kategori / Departemen
  function renderCategoryTabs() {
    if (!categoryTabsEl) return;

    // Susun daftar departemen dengan tab "Semua" di awal
    const tabs = ['Semua', ...departments];
    categoryTabsEl.innerHTML = '';

    tabs.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = `cat-tab ${cat === activeCategory ? 'active' : ''}`;
      btn.textContent = cat;
      btn.type = 'button';
      btn.addEventListener('click', () => {
        activeCategory = cat;
        renderCategoryTabs();
        renderApps();
      });
      categoryTabsEl.appendChild(btn);
    });
  }

  // Render Grid Aplikasi
  function renderApps() {
    if (!appContainerEl) return;

    // Filter berdasarkan Kategori & Query Pencarian
    const filteredApps = allApps.filter((app) => {
      const matchCategory =
        activeCategory === 'Semua' || app.department === activeCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (app.name && app.name.toLowerCase().includes(q)) ||
        (app.department && app.department.toLowerCase().includes(q)) ||
        (app.description && app.description.toLowerCase().includes(q)) ||
        (app.url && app.url.toLowerCase().includes(q));

      return matchCategory && matchSearch;
    });

    if (filteredApps.length === 0) {
      appContainerEl.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <div class="empty-title">Aplikasi Tidak Ditemukan</div>
          <div class="empty-sub">Tidak ada aplikasi yang cocok dengan kata kunci "${escapeHtml(searchQuery)}" di kategori "${activeCategory}".</div>
        </div>
      `;
      return;
    }

    // Jika filter "Semua" dan tidak sedang mencari, kita kelompokkan per departemen
    if (activeCategory === 'Semua' && !searchQuery.trim()) {
      renderGroupedByDepartment(filteredApps);
    } else {
      renderFlatGrid(filteredApps);
    }
  }

  // Render Dikelompokkan per Departemen
  function renderGroupedByDepartment(appsList) {
    // Kelompokkan aplikasi per departemen
    const groups = {};
    departments.forEach((dept) => {
      groups[dept] = [];
    });
    // Fallback jika ada departemen yang belum terdaftar di master
    appsList.forEach((app) => {
      const dept = app.department || 'Aplikasi Bersama';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(app);
    });

    let html = '';
    for (const [deptName, apps] of Object.entries(groups)) {
      if (apps.length === 0) continue; // Jangan tampilkan grup kosong

      html += `
        <section class="department-section">
          <div class="department-header">
            <h2 class="dept-title">
              <span>${escapeHtml(deptName)}</span>
              <span class="dept-badge-count">${apps.length}</span>
            </h2>
          </div>
          <div class="app-grid">
            ${apps.map((app) => createAppCardHtml(app)).join('')}
          </div>
        </section>
      `;
    }

    appContainerEl.innerHTML = html;
    attachIconErrorHandlers();
  }

  // Render Flat Grid (untuk tab spesifik atau hasil pencarian)
  function renderFlatGrid(appsList) {
    let title = activeCategory;
    if (searchQuery.trim()) {
      title = `Hasil Pencarian (${appsList.length} aplikasi ditemukan)`;
    }

    const html = `
      <section class="department-section">
        <div class="department-header">
          <h2 class="dept-title">
            <span>${escapeHtml(title)}</span>
            <span class="dept-badge-count">${appsList.length}</span>
          </h2>
        </div>
        <div class="app-grid">
          ${appsList.map((app) => createAppCardHtml(app)).join('')}
        </div>
      </section>
    `;

    appContainerEl.innerHTML = html;
    attachIconErrorHandlers();
  }

  // Template Kartu Aplikasi Launcher
  function createAppCardHtml(app) {
    const iconUrl = app.icon || 'assets/icons/default-app.svg';
    const firstLetter = (app.name || 'P').charAt(0).toUpperCase();

    return `
      <a href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer" class="app-item" title="${escapeHtml(app.name)}">
        <div class="icon-container">
          <img class="icon-img" src="${escapeHtml(iconUrl)}" alt="${escapeHtml(app.name)}" loading="lazy" data-fallback="${firstLetter}">
        </div>
        <div class="app-name">${escapeHtml(app.name)}</div>
        <div class="app-dept-tag">${escapeHtml(app.department || '')}</div>
        <div class="app-tooltip">
          <strong>${escapeHtml(app.name)}</strong>
          ${app.description ? `<p style="margin-top:4px;color:#94a3b8">${escapeHtml(app.description)}</p>` : ''}
          <span class="tooltip-url">${escapeHtml(app.url)}</span>
        </div>
      </a>
    `;
  }

  // Pasang Fallback jika icon gagal di-load
  function attachIconErrorHandlers() {
    const imgs = appContainerEl.querySelectorAll('.icon-img');
    imgs.forEach((img) => {
      img.onerror = function () {
        const fallbackLetter = this.getAttribute('data-fallback') || 'P';
        const parent = this.parentElement;
        if (parent) {
          parent.innerHTML = `<div class="icon-fallback">${escapeHtml(fallbackLetter)}</div>`;
        }
      };
    });
  }

  // Helper Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Event Listeners Pencarian
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchClearBtn) {
        searchClearBtn.style.display = searchQuery ? 'block' : 'none';
      }
      renderApps();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchQuery = '';
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      searchClearBtn.style.display = 'none';
      renderApps();
    });
  }

  // Shortcut Keyboard: Tekan '/' atau 'Ctrl+K' untuk mencari, 'Escape' untuk reset
  window.addEventListener('keydown', (e) => {
    if (
      (e.key === '/' && document.activeElement !== searchInput) ||
      (e.ctrlKey && e.key.toLowerCase() === 'k')
    ) {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === 'Escape' && document.activeElement === searchInput) {
      if (searchInput) {
        searchInput.value = '';
        searchInput.blur();
      }
      searchQuery = '';
      if (searchClearBtn) searchClearBtn.style.display = 'none';
      renderApps();
    }
  });

  // Polling / Auto-refresh halus setiap 30 detik agar jika admin menambah app, portal user otomatis ter-update
  setInterval(() => {
    // Hanya refresh jika user sedang tidak aktif mengetik di search bar
    if (document.activeElement !== searchInput) {
      loadApps();
    }
  }, 30000);

  // Inisialisasi
  loadApps();
})();
