/**
 * PERONI APPLICATION TERMINAL - ADMIN MANAGEMENT JS
 * PT Peroni Karya Sentra
 */

(function () {
  'use strict';

  // Global State
  let apps = [];
  let departments = [];
  let currentEditingApp = null;
  let selectedIconPath = 'assets/icons/default-app.svg';
  let uploadedFile = null;

  // Preset Icons
  const PRESET_ICONS = [
    { label: 'QC & Mutu', path: 'assets/icons/qc.svg' },
    { label: 'HR & KPI', path: 'assets/icons/hr.svg' },
    { label: 'PPIC & Jadwal', path: 'assets/icons/ppic.svg' },
    { label: 'Gudang & WMS', path: 'assets/icons/warehouse.svg' },
    { label: 'Maintenance', path: 'assets/icons/maintenance.svg' },
    { label: 'Marketing', path: 'assets/icons/marketing.svg' },
    { label: 'Aplikasi Bersama', path: 'assets/icons/shared.svg' },
    { label: 'Default App', path: 'assets/icons/default-app.svg' }
  ];

  // DOM Elements
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm = document.getElementById('loginForm');
  const loginPassword = document.getElementById('loginPassword');
  const loginErrorMsg = document.getElementById('loginErrorMsg');
  const btnLogout = document.getElementById('btnLogout');

  // Stats
  const statTotalApps = document.getElementById('statTotalApps');
  const statTotalDepts = document.getElementById('statTotalDepts');

  // Table & Filters
  const appsTableBody = document.getElementById('appsTableBody');
  const adminSearch = document.getElementById('adminSearch');
  const adminDeptFilter = document.getElementById('adminDeptFilter');
  const btnOpenAddModal = document.getElementById('btnOpenAddModal');

  // Modal Form
  const appModal = document.getElementById('appModal');
  const modalTitle = document.getElementById('modalTitle');
  const appForm = document.getElementById('appForm');
  const appIdInput = document.getElementById('appId');
  const appNameInput = document.getElementById('appName');
  const appUrlInput = document.getElementById('appUrl');
  const appDeptSelect = document.getElementById('appDept');
  const appOrderInput = document.getElementById('appOrder');
  const appDescInput = document.getElementById('appDesc');
  const modalCloseBtns = document.querySelectorAll('.close-modal');

  // Icon Selector Elements
  const tabPresetIcon = document.getElementById('tabPresetIcon');
  const tabUploadIcon = document.getElementById('tabUploadIcon');
  const presetIconArea = document.getElementById('presetIconArea');
  const uploadIconArea = document.getElementById('uploadIconArea');
  const presetIconsGrid = document.getElementById('presetIconsGrid');
  const iconFileInput = document.getElementById('iconFileInput');
  const uploadDropzone = document.getElementById('uploadDropzone');
  const previewImg = document.getElementById('previewImg');
  const previewText = document.getElementById('previewText');

  // Toast
  const toastAlert = document.getElementById('toastAlert');
  const toastMessage = document.getElementById('toastMessage');

  // -------------------------------------------------------------
  // TOAST NOTIFICATION HELPER
  // -------------------------------------------------------------
  function showToast(message, type = 'success') {
    if (!toastAlert || !toastMessage) return;
    toastAlert.className = `toast-alert show ${type}`;
    toastMessage.textContent = message;

    setTimeout(() => {
      toastAlert.className = 'toast-alert';
    }, 3500);
  }

  // -------------------------------------------------------------
  // AUTHENTICATION CHECK & HANDLERS
  // -------------------------------------------------------------
  async function checkAuthStatus() {
    try {
      const res = await fetch('api/auth.php?action=status&t=' + Date.now());
      const data = await res.json();
      if (data.status === 'success' && data.is_logged_in) {
        showDashboard();
      } else {
        showLogin();
      }
    } catch (err) {
      console.error(err);
      showLogin();
    }
  }

  function showLogin() {
    if (loginSection) loginSection.style.display = 'block';
    if (dashboardSection) dashboardSection.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'none';
    if (loginPassword) loginPassword.value = '';
    if (loginErrorMsg) loginErrorMsg.textContent = '';
  }

  function showDashboard() {
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'block';
    if (btnLogout) btnLogout.style.display = 'inline-flex';
    loadAppsData();
  }

  // Form Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = loginPassword.value;
      if (!password) {
        loginErrorMsg.textContent = 'Harap masukkan kata sandi.';
        return;
      }

      try {
        const res = await fetch('api/auth.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', password: password })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          showDashboard();
          showToast('Login berhasil sebagai Administrator.', 'success');
        } else {
          loginErrorMsg.textContent = data.message || 'Login gagal. Periksa kata sandi.';
        }
      } catch (err) {
        loginErrorMsg.textContent = 'Terjadi kesalahan jaringan atau server.';
      }
    });
  }

  // Tombol Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await fetch('api/auth.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' })
        });
        showLogin();
        showToast('Anda telah keluar dari panel admin.', 'success');
      } catch (err) {
        showLogin();
      }
    });
  }

  // -------------------------------------------------------------
  // LOAD & RENDER DATA APLIKASI
  // -------------------------------------------------------------
  async function loadAppsData() {
    try {
      const res = await fetch('api/apps.php?t=' + Date.now());
      const data = await res.json();
      if (data.status === 'success') {
        apps = data.data.apps || [];
        departments = data.data.departments || [];
        updateStats();
        populateDeptDropdowns();
        renderAppsTable();
      }
    } catch (err) {
      showToast('Gagal memuat konfigurasi aplikasi.', 'error');
    }
  }

  function updateStats() {
    if (statTotalApps) statTotalApps.textContent = apps.length;
    if (statTotalDepts) statTotalDepts.textContent = departments.length;
  }

  function populateDeptDropdowns() {
    // Populate filter dropdown
    if (adminDeptFilter) {
      const currentVal = adminDeptFilter.value;
      adminDeptFilter.innerHTML = '<option value="">Semua Departemen</option>';
      departments.forEach((dept) => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        adminDeptFilter.appendChild(opt);
      });
      adminDeptFilter.value = currentVal;
    }

    // Populate modal select
    if (appDeptSelect) {
      appDeptSelect.innerHTML = '';
      departments.forEach((dept) => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        appDeptSelect.appendChild(opt);
      });
      // Opsi Tambah Kategori Baru
      const customOpt = document.createElement('option');
      customOpt.value = '__new__';
      customOpt.textContent = '+ Tambah Departemen Baru...';
      appDeptSelect.appendChild(customOpt);
    }
  }

  // Render Tabel Aplikasi
  function renderAppsTable() {
    if (!appsTableBody) return;

    const query = (adminSearch ? adminSearch.value : '').toLowerCase().trim();
    const filterDept = adminDeptFilter ? adminDeptFilter.value : '';

    const filtered = apps.filter((app) => {
      const matchDept = !filterDept || app.department === filterDept;
      const matchSearch =
        !query ||
        app.name.toLowerCase().includes(query) ||
        (app.department && app.department.toLowerCase().includes(query)) ||
        (app.url && app.url.toLowerCase().includes(query));
      return matchDept && matchSearch;
    });

    if (filtered.length === 0) {
      appsTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:32px; color: var(--admin-text-muted);">
            Tidak ada data aplikasi yang cocok.
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    filtered.forEach((app) => {
      rowsHtml += `
        <tr>
          <td style="width: 50px; font-weight: 600; color: var(--admin-text-muted); text-align: center;">
            ${app.order || '-'}
          </td>
          <td style="width: 60px;">
            <div class="app-row-icon">
              <img src="${escapeHtml(app.icon || 'assets/icons/default-app.svg')}" alt="${escapeHtml(app.name)}" onerror="this.src='assets/icons/default-app.svg'">
            </div>
          </td>
          <td>
            <div class="app-row-details">
              <span class="app-row-title">${escapeHtml(app.name)}</span>
              ${app.description ? `<span class="app-row-desc">${escapeHtml(app.description)}</span>` : ''}
            </div>
          </td>
          <td>
            <a href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer" class="url-link" title="Buka URL aplikasi di tab baru">
              ${escapeHtml(app.url)}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
              </svg>
            </a>
          </td>
          <td>
            <span class="badge-dept">${escapeHtml(app.department || 'Aplikasi Bersama')}</span>
          </td>
          <td>
            <div class="action-buttons">
              <button type="button" class="btn-secondary btn-edit-app" data-id="${escapeHtml(app.id)}">
                Edit
              </button>
              <button type="button" class="btn-danger btn-delete-app" data-id="${escapeHtml(app.id)}" data-name="${escapeHtml(app.name)}">
                Hapus
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    appsTableBody.innerHTML = rowsHtml;

    // Attach Event Handlers untuk Edit & Delete
    appsTableBody.querySelectorAll('.btn-edit-app').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const targetApp = apps.find((a) => a.id === id);
        if (targetApp) openEditModal(targetApp);
      });
    });

    appsTableBody.querySelectorAll('.btn-delete-app').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        confirmDeleteApp(id, name);
      });
    });
  }

  // Event search & filter
  if (adminSearch) adminSearch.addEventListener('input', renderAppsTable);
  if (adminDeptFilter) adminDeptFilter.addEventListener('change', renderAppsTable);

  // -------------------------------------------------------------
  // PRESET & UPLOAD ICON LOGIC
  // -------------------------------------------------------------
  function renderPresetIcons() {
    if (!presetIconsGrid) return;
    presetIconsGrid.innerHTML = '';

    PRESET_ICONS.forEach((item) => {
      const div = document.createElement('div');
      div.className = `preset-icon-choice ${selectedIconPath === item.path ? 'selected' : ''}`;
      div.title = item.label;
      div.innerHTML = `<img src="${item.path}" alt="${item.label}">`;
      div.addEventListener('click', () => {
        selectedIconPath = item.path;
        uploadedFile = null;
        updatePreview(item.path, item.label);
        renderPresetIcons();
      });
      presetIconsGrid.appendChild(div);
    });
  }

  function updatePreview(path, name = 'Ikon terpilih') {
    if (previewImg) previewImg.src = path;
    if (previewText) previewText.textContent = name;
  }

  // Switch tabs between preset and upload
  if (tabPresetIcon && tabUploadIcon) {
    tabPresetIcon.addEventListener('click', () => {
      tabPresetIcon.classList.add('active');
      tabUploadIcon.classList.remove('active');
      presetIconArea.style.display = 'block';
      uploadIconArea.style.display = 'none';
    });

    tabUploadIcon.addEventListener('click', () => {
      tabUploadIcon.classList.add('active');
      tabPresetIcon.classList.remove('active');
      presetIconArea.style.display = 'none';
      uploadIconArea.style.display = 'block';
    });
  }

  // File Upload Handlers
  if (uploadDropzone && iconFileInput) {
    uploadDropzone.addEventListener('click', () => iconFileInput.click());

    uploadDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadDropzone.classList.add('dragover');
    });

    uploadDropzone.addEventListener('dragleave', () => {
      uploadDropzone.classList.remove('dragover');
    });

    uploadDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    iconFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  function handleFileSelection(file) {
    // Validasi ukuran < 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal adalah 2 MB.');
      return;
    }

    // Validasi tipe
    const allowed = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
      'image/x-icon',
      'image/vnd.microsoft.icon'
    ];
    if (!allowed.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|svg|ico)$/i)) {
      alert('Harap unggah file gambar berformat PNG, JPG, WEBP, SVG, atau ICO.');
      return;
    }

    uploadedFile = file;

    // Tampilkan local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      updatePreview(e.target.result, `File: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    };
    reader.readAsDataURL(file);
  }

  // -------------------------------------------------------------
  // MODAL FORM TAMBAH & EDIT APLIKASI
  // -------------------------------------------------------------
  if (btnOpenAddModal) {
    btnOpenAddModal.addEventListener('click', () => {
      currentEditingApp = null;
      modalTitle.textContent = 'Tambah Aplikasi Baru';
      appForm.reset();
      appIdInput.value = '';
      appOrderInput.value = apps.length + 1;
      selectedIconPath = 'assets/icons/default-app.svg';
      uploadedFile = null;
      updatePreview(selectedIconPath, 'Ikon Default');
      renderPresetIcons();
      if (tabPresetIcon) tabPresetIcon.click();
      appModal.classList.add('active');
    });
  }

  function openEditModal(app) {
    currentEditingApp = app;
    modalTitle.textContent = `Edit Aplikasi: ${app.name}`;
    appIdInput.value = app.id;
    appNameInput.value = app.name;
    appUrlInput.value = app.url;
    appDeptSelect.value = app.department || 'Aplikasi Bersama';
    appOrderInput.value = app.order || 1;
    appDescInput.value = app.description || '';
    selectedIconPath = app.icon || 'assets/icons/default-app.svg';
    uploadedFile = null;

    updatePreview(selectedIconPath, 'Ikon saat ini');
    renderPresetIcons();
    if (tabPresetIcon) tabPresetIcon.click();
    appModal.classList.add('active');
  }

  modalCloseBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      appModal.classList.remove('active');
    });
  });

  // Handle Dropdown Tambah Kategori Baru
  if (appDeptSelect) {
    appDeptSelect.addEventListener('change', () => {
      if (appDeptSelect.value === '__new__') {
        const newCat = prompt('Masukkan nama departemen / kategori baru:');
        if (newCat && newCat.trim()) {
          const cleanCat = newCat.trim();
          if (!departments.includes(cleanCat)) {
            departments.push(cleanCat);
            populateDeptDropdowns();
          }
          appDeptSelect.value = cleanCat;
        } else {
          appDeptSelect.value = departments[0] || 'Aplikasi Bersama';
        }
      }
    });
  }

  // Submit Handler Tambah/Edit
  if (appForm) {
    appForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = appNameInput.value.trim();
      const url = appUrlInput.value.trim();
      const department = appDeptSelect.value;
      const order = parseInt(appOrderInput.value, 10) || 1;
      const description = appDescInput.value.trim();
      const id = appIdInput.value.trim();

      if (!name) {
        alert('Nama aplikasi wajib diisi.');
        return;
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('URL harus diawali dengan http:// atau https:// (contoh: http://10.88.8.46:6002)');
        return;
      }

      let finalIconPath = selectedIconPath;

      // Jika admin mengunggah file gambar baru, lakukan upload terlebih dahulu
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('icon_file', uploadedFile);

        try {
          const uploadRes = await fetch('api/upload.php', {
            method: 'POST',
            body: formData
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok || uploadData.status !== 'success') {
            alert(uploadData.message || 'Gagal mengunggah ikon.');
            return;
          }
          finalIconPath = uploadData.icon_path;
        } catch (err) {
          alert('Terjadi kesalahan jaringan saat mengunggah ikon.');
          return;
        }
      }

      // Payload untuk simpan/update ke server
      const payload = {
        action: id ? 'update' : 'create',
        id: id,
        name: name,
        url: url,
        department: department,
        order: order,
        description: description,
        icon: finalIconPath
      };

      try {
        const res = await fetch('api/apps.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const resData = await res.json();

        if (res.ok && resData.status === 'success') {
          appModal.classList.remove('active');
          showToast(resData.message, 'success');
          loadAppsData();
        } else {
          alert(resData.message || 'Gagal menyimpan aplikasi.');
        }
      } catch (err) {
        alert('Terjadi kesalahan saat menyimpan data ke server.');
      }
    });
  }

  // -------------------------------------------------------------
  // HAPUS APLIKASI
  // -------------------------------------------------------------
  async function confirmDeleteApp(id, name) {
    if (!confirm(`Apakah Anda yakin ingin menghapus aplikasi "${name}"?\nTindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch('api/apps.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: id })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast(data.message, 'success');
        loadAppsData();
      } else {
        alert(data.message || 'Gagal menghapus aplikasi.');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan saat menghapus aplikasi.');
    }
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

  // Inisialisasi Auth & Tampilan
  checkAuthStatus();
})();
