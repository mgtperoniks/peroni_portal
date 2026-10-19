# Peroni Application Terminal

Portal aplikasi internal untuk **PT Peroni Karya Sentra** yang berfungsi sebagai *application launcher* berbasis web lokal (LAN). Pengguna cukup membuka satu alamat portal untuk mengakses seluruh sistem operasional divisi, sementara administrator dapat menambah, mengedit, mengunggah ikon, dan mengelola aplikasi tanpa perlu mengedit kode program atau file database secara manual.

---

## Fitur Utama

- **Corporate Light Theme:** Desain antarmuka bersih, elegan, dan profesional yang selaras dengan identitas visual perusahaan (`peroniks.id`).
- **Android App Launcher Concept:** Grid ikon aplikasi intuitif dengan label departemen, nama aplikasi jelas, dan indikator port/URL.
- **100% Offline LAN-Ready:** Dibangun dengan HTML, CSS Vanilla, JavaScript murni, dan PHP native. Tanpa CDN eksternal, framework frontend, Node.js, atau Google Fonts.
- **Pencarian Real-Time:** Filter aplikasi secara instan berdasarkan nama, departemen, atau nomor port dengan shortcut keyboard `/` dan `Ctrl+K`.
- **Pengelompokan 7 Departemen:**
  1. Aplikasi QC
  2. HR-KPI
  3. PPIC
  4. Gudang
  5. Maintenance
  6. Marketing
  7. Aplikasi Bersama
- **Panel Pengelolaan Administrator:**
  - Proteksi autentikasi sesi admin.
  - CRUD aplikasi lengkap (Tambah, Edit, Hapus, Urutan).
  - Pilihan ikon bawaan SVG atau unggah ikon kustom dari komputer (PNG, JPG, WEBP, SVG) dengan *live preview*.
  - Penyimpanan konfigurasi terpusat pada file JSON di server (`data/apps.json`) yang aman dari penulisan bersamaan (*concurrency safe* via `flock`).

---

## Struktur Proyek

```text
peroni_portal/
├── index.html                 # Halaman Portal Utama (Launcher)
├── index.php                  # Entry point kompatibilitas web server
├── admin.html                 # Halaman Panel Administrasi
├── admin.php                  # Entry point admin
├── config.php                 # Konfigurasi terpusat & session handler
├── config.local.example.php   # Template konfigurasi lokal / kredensial aman
├── .gitignore                 # Filter file Git (mengabaikan data operasional & secret)
├── api/
│   ├── auth.php               # Endpoint Login, Logout, & Cek Status Sesi
│   ├── apps.php               # Endpoint CRUD Aplikasi
│   └── upload.php             # Endpoint Unggah Ikon (Validasi MIME & Sanitasi SVG)
├── assets/
│   ├── css/
│   │   ├── style.css          # Stylesheet Portal Utama (Corporate Light Theme)
│   │   └── admin.css          # Stylesheet Panel Admin (Corporate Light Theme)
│   ├── js/
│   │   ├── portal.js          # Logika Launcher, Pencarian, & Filter
│   │   └── admin.js           # Logika Admin Manager, Preview, & API Integration
│   └── icons/                 # Koleksi Ikon SVG Lokal Resmi
│       ├── peroni-logo.svg    # Logo PT Peroni Karya Sentra
│       ├── qc.svg             # Ikon Aplikasi QC
│       ├── hr.svg             # Ikon HR-KPI
│       ├── ppic.svg           # Ikon PPIC
│       ├── warehouse.svg      # Ikon Gudang
│       ├── maintenance.svg    # Ikon Maintenance
│       ├── marketing.svg      # Ikon Marketing
│       ├── shared.svg         # Ikon Aplikasi Bersama
│       └── default-app.svg    # Ikon Fallback
└── data/
    ├── apps.example.json      # Template data aplikasi awal untuk deployment
    ├── apps.json              # Data operasional aktif di server (diabaikan oleh Git)
    └── uploads/               # Direktori penyimpanan ikon hasil unggahan admin
        ├── .gitkeep           # Penanda direktori Git
        └── .htaccess          # Pencegahan eksekusi skrip PHP di folder upload
```

---

## Panduan Instalasi & Deployment

### 1. Pengembangan Lokal di Windows (Laragon)

1. Letakkan folder proyek di `C:\laragon\www\peroni_portal`.
2. Pastikan web server Apache dan PHP di Laragon aktif.
3. Akses melalui browser:
   - Portal Pengguna: `http://localhost/peroni_portal/`
   - Panel Admin: `http://localhost/peroni_portal/admin.html`
4. Kata sandi default administrator lokal: `admin123`.

### 2. Konfigurasi Kredensial Produksi

Untuk mengubah kata sandi administrator pada server tanpa memodifikasi kode inti yang dilacak Git:
1. Salin `config.local.example.php` menjadi `config.local.php`:
   ```bash
   cp config.local.example.php config.local.php
   ```
2. Buka `config.local.php` dan tentukan kata sandi baru:
   ```php
   define('CUSTOM_ADMIN_PASSWORD', 'KataSandiKuatAnda');
   ```
   Atau menggunakan hash bcrypt:
   ```php
   define('CUSTOM_ADMIN_HASH', '$2y$10$...');
   ```
   File `config.local.php` secara otomatis diabaikan oleh Git via `.gitignore`.

### 3. Deployment ke Server Linux Internal

1. Salin folder proyek ke direktori web server (misal `/var/www/html/peroni_portal`).
2. Berikan izin kepemilikan dan hak tulis pada folder `data/`:
   ```bash
   sudo chown -R www-data:www-data /var/www/html/peroni_portal
   sudo find /var/www/html/peroni_portal -type d -exec chmod 755 {} \;
   sudo find /var/www/html/peroni_portal -type f -exec chmod 644 {} \;
   sudo chmod -R 775 /var/www/html/peroni_portal/data
   ```
3. Saat pertama kali diakses, sistem akan secara otomatis menginisialisasi `data/apps.json` dari `data/apps.example.json` jika belum tersedia.

---

## Lisensi & Hak Cipta

&copy; PT Peroni Karya Sentra. Seluruh hak cipta dilindungi undang-undang.
