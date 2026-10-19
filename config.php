<?php
/**
 * Peroni Application Terminal - Central Configuration & Helpers
 * PT Peroni Karya Sentra
 */

// Path direktori utama
define('BASE_DIR', dirname(__FILE__));
define('DATA_DIR', BASE_DIR . DIRECTORY_SEPARATOR . 'data');
define('DATA_FILE', DATA_DIR . DIRECTORY_SEPARATOR . 'apps.json');
define('DATA_EXAMPLE_FILE', DATA_DIR . DIRECTORY_SEPARATOR . 'apps.example.json');
define('UPLOAD_DIR', DATA_DIR . DIRECTORY_SEPARATOR . 'uploads');

// Muat konfigurasi sensitif lokal jika tersedia (diabaikan oleh Git via .gitignore)
if (file_exists(BASE_DIR . DIRECTORY_SEPARATOR . 'config.local.php')) {
    require_once BASE_DIR . DIRECTORY_SEPARATOR . 'config.local.php';
}

// Konfigurasi Environment & Session
if (session_status() === PHP_SESSION_NONE) {
    $lifetime = defined('CUSTOM_SESSION_LIFETIME') ? (int)CUSTOM_SESSION_LIFETIME : 86400;
    session_set_cookie_params([
        'lifetime' => $lifetime,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// Ambil kredensial admin dari config.local.php atau environment variable server
$envPass = getenv('PERONI_ADMIN_PASSWORD') ?: ($_ENV['PERONI_ADMIN_PASSWORD'] ?? null);
$envHash = getenv('PERONI_ADMIN_HASH') ?: ($_ENV['PERONI_ADMIN_HASH'] ?? null);

if (!defined('ADMIN_PASSWORD_HASH')) {
    define('ADMIN_PASSWORD_HASH', defined('CUSTOM_ADMIN_HASH') ? CUSTOM_ADMIN_HASH : ($envHash ?: ''));
}

if (!defined('ADMIN_DEFAULT_PLAIN_PASS')) {
    // Default fallback lokal untuk Laragon jika config.local.php belum dibuat
    define('ADMIN_DEFAULT_PLAIN_PASS', defined('CUSTOM_ADMIN_PASSWORD') ? CUSTOM_ADMIN_PASSWORD : ($envPass ?: 'admin123'));
}

/**
 * Validasi kata sandi administrator secara aman
 */
function verify_admin_password(string $password): bool {
    $password = trim($password);
    if ($password === '') {
        return false;
    }

    // 1. Verifikasi dengan hash (bcrypt) jika dikonfigurasi
    if (defined('ADMIN_PASSWORD_HASH') && ADMIN_PASSWORD_HASH !== '') {
        if (password_verify($password, ADMIN_PASSWORD_HASH)) {
            return true;
        }
    }

    // 2. Verifikasi dengan plain text password terkonfigurasi (menggunakan hash_equals untuk cegah timing attack)
    if (defined('ADMIN_DEFAULT_PLAIN_PASS') && ADMIN_DEFAULT_PLAIN_PASS !== '') {
        if (hash_equals(ADMIN_DEFAULT_PLAIN_PASS, $password)) {
            return true;
        }
    }

    return false;
}

/**
 * Validasi session admin
 */
function is_admin(): bool {
    return isset($_SESSION['peroni_admin_logged']) && $_SESSION['peroni_admin_logged'] === true;
}

/**
 * Pastikan request berasal dari admin, jika tidak kirim 401/403
 */
function require_admin_auth(): void {
    if (!is_admin()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Sesi admin tidak valid atau telah berakhir. Silakan login kembali.'
        ]);
        exit;
    }
}

/**
 * Kirim response JSON standar
 */
function json_response($data, int $status_code = 200): void {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status_code);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Membaca konfigurasi aplikasi dengan shared lock (LOCK_SH)
 * Otomatis menginisialisasi dari apps.example.json jika apps.json belum ada di server baru
 */
function get_apps_data(): array {
    // Inisialisasi otomatis jika apps.json belum ada pada deployment baru
    if (!file_exists(DATA_FILE) && file_exists(DATA_EXAMPLE_FILE)) {
        if (!is_dir(DATA_DIR)) {
            @mkdir(DATA_DIR, 0775, true);
        }
        @copy(DATA_EXAMPLE_FILE, DATA_FILE);
        @chmod(DATA_FILE, 0664);
    }

    if (!file_exists(DATA_FILE)) {
        return [
            'system_title' => 'PERONI APPLICATION TERMINAL',
            'company_name' => 'PT Peroni Karya Sentra',
            'departments' => [
                'Aplikasi QC',
                'HR-KPI',
                'PPIC',
                'Gudang',
                'Maintenance',
                'Marketing',
                'Aplikasi Bersama'
            ],
            'apps' => []
        ];
    }

    $fp = fopen(DATA_FILE, 'r');
    if (!$fp) {
        return ['departments' => [], 'apps' => []];
    }

    flock($fp, LOCK_SH);
    $content = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    $data = json_decode($content, true);
    if (!is_array($data)) {
        return ['departments' => [], 'apps' => []];
    }

    return $data;
}

/**
 * Menyimpan konfigurasi aplikasi dengan exclusive lock (LOCK_EX)
 * Menjamin keamanan dari penulisan bersamaan (concurrency safe)
 */
function save_apps_data(array $data): bool {
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0775, true);
    }

    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return false;
    }

    $fp = fopen(DATA_FILE, 'c+');
    if (!$fp) {
        return false;
    }

    // Mengunci file secara eksklusif agar tidak terjadi race condition
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);      // Kosongkan file
        rewind($fp);           // Kembali ke awal
        fwrite($fp, $json);     // Tulis data baru
        fflush($fp);           // Pastikan ter-flush ke disk
        flock($fp, LOCK_UN);   // Buka kunci
        fclose($fp);
        return true;
    }

    fclose($fp);
    return false;
}

/**
 * Sanitasi string umum
 */
function sanitize_text(string $text): string {
    return htmlspecialchars(trim($text), ENT_QUOTES, 'UTF-8');
}
