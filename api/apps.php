<?php
/**
 * Peroni Application Terminal - Applications Management API
 * PT Peroni Karya Sentra
 */

require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Helper validasi URL aman
function validate_url(string $url): bool {
    $url = trim($url);
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        // Cek fallback pola LAN / IP dengan port seperti http://10.88.8.46:6002
        if (preg_match('/^https?:\/\/[a-zA-Z0-9\.\-_]+(:[0-9]{1,5})?(\/.*)?$/', $url)) {
            return true;
        }
        return false;
    }
    // Pastikan skema http atau https
    $scheme = parse_url($url, PHP_URL_SCHEME);
    return in_array(strtolower($scheme), ['http', 'https'], true);
}

// Helper sanitasi path icon untuk mencegah path traversal
function sanitize_icon_path(string $path): string {
    $path = trim(str_replace('\\', '/', $path));
    // Cegah path traversal
    if (strpos($path, '..') !== false || strpos($path, ':') !== false) {
        return 'assets/icons/default-app.svg';
    }
    // Pastikan berada di folder assets/icons/ atau data/uploads/
    if (!preg_match('/^(assets\/icons\/|data\/uploads\/)[a-zA-Z0-9_\-\.]+$/', $path)) {
        return 'assets/icons/default-app.svg';
    }
    return $path;
}

// -------------------------------------------------------------
// GET: Mengambil daftar aplikasi dan departemen
// -------------------------------------------------------------
if ($method === 'GET') {
    $data = get_apps_data();

    // Urutkan aplikasi berdasarkan urutan ('order') lalu 'name'
    if (isset($data['apps']) && is_array($data['apps'])) {
        usort($data['apps'], function ($a, $b) {
            $orderA = isset($a['order']) ? (int)$a['order'] : 999;
            $orderB = isset($b['order']) ? (int)$b['order'] : 999;
            if ($orderA === $orderB) {
                return strcasecmp($a['name'] ?? '', $b['name'] ?? '');
            }
            return $orderA <=> $orderB;
        });
    }

    json_response([
        'status' => 'success',
        'data' => $data
    ]);
}

// -------------------------------------------------------------
// POST / PUT / DELETE: Memerlukan Autentikasi Admin
// -------------------------------------------------------------
require_admin_auth();

// Ambil input JSON atau POST payload
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
if (!is_array($input)) {
    $input = $_POST;
}

$action = $input['action'] ?? $_GET['action'] ?? '';
$data = get_apps_data();
if (!isset($data['apps'])) {
    $data['apps'] = [];
}

// -------------------------------------------------------------
// Action: CREATE / TAMBAH APLIKASI
// -------------------------------------------------------------
if ($action === 'create' || ($method === 'POST' && empty($action))) {
    $name = trim($input['name'] ?? '');
    $url = trim($input['url'] ?? '');
    $department = trim($input['department'] ?? 'Aplikasi Bersama');
    $icon = sanitize_icon_path($input['icon'] ?? 'assets/icons/default-app.svg');
    $order = isset($input['order']) ? (int)$input['order'] : count($data['apps']) + 1;
    $description = trim($input['description'] ?? '');

    if (empty($name)) {
        json_response(['status' => 'error', 'message' => 'Nama aplikasi wajib diisi.'], 422);
    }

    if (empty($url) || !validate_url($url)) {
        json_response(['status' => 'error', 'message' => 'Format URL tidak valid. Harus diawali dengan http:// atau https:// (contoh: http://10.88.8.46:6002)'], 422);
    }

    // Generate unique ID
    $newId = 'app-' . time() . '-' . mt_rand(100, 999);

    $newApp = [
        'id' => $newId,
        'name' => $name,
        'url' => $url,
        'department' => $department,
        'icon' => $icon,
        'order' => $order,
        'description' => $description
    ];

    $data['apps'][] = $newApp;

    // Pastikan departemen baru juga masuk dalam daftar master departemen jika belum ada
    if (!in_array($department, $data['departments'], true)) {
        $data['departments'][] = $department;
    }

    if (save_apps_data($data)) {
        json_response([
            'status' => 'success',
            'message' => 'Aplikasi "' . htmlspecialchars($name) . '" berhasil ditambahkan.',
            'app' => $newApp
        ], 201);
    } else {
        json_response(['status' => 'error', 'message' => 'Gagal menyimpan konfigurasi ke server. Periksa hak akses file data/apps.json.'], 500);
    }
}

// -------------------------------------------------------------
// Action: UPDATE / EDIT APLIKASI
// -------------------------------------------------------------
if ($action === 'update' || $method === 'PUT') {
    $id = trim($input['id'] ?? '');
    if (empty($id)) {
        json_response(['status' => 'error', 'message' => 'ID aplikasi tidak ditemukan.'], 422);
    }

    $foundIndex = -1;
    foreach ($data['apps'] as $index => $app) {
        if ($app['id'] === $id) {
            $foundIndex = $index;
            break;
        }
    }

    if ($foundIndex === -1) {
        json_response(['status' => 'error', 'message' => 'Aplikasi dengan ID tersebut tidak ditemukan.'], 404);
    }

    $name = trim($input['name'] ?? $data['apps'][$foundIndex]['name']);
    $url = trim($input['url'] ?? $data['apps'][$foundIndex]['url']);
    $department = trim($input['department'] ?? $data['apps'][$foundIndex]['department']);
    $icon = isset($input['icon']) ? sanitize_icon_path($input['icon']) : $data['apps'][$foundIndex]['icon'];
    $order = isset($input['order']) ? (int)$input['order'] : ($data['apps'][$foundIndex]['order'] ?? 1);
    $description = isset($input['description']) ? trim($input['description']) : ($data['apps'][$foundIndex]['description'] ?? '');

    if (empty($name)) {
        json_response(['status' => 'error', 'message' => 'Nama aplikasi tidak boleh kosong.'], 422);
    }

    if (empty($url) || !validate_url($url)) {
        json_response(['status' => 'error', 'message' => 'Format URL tidak valid.'], 422);
    }

    $data['apps'][$foundIndex] = [
        'id' => $id,
        'name' => $name,
        'url' => $url,
        'department' => $department,
        'icon' => $icon,
        'order' => $order,
        'description' => $description
    ];

    if (!in_array($department, $data['departments'], true)) {
        $data['departments'][] = $department;
    }

    if (save_apps_data($data)) {
        json_response([
            'status' => 'success',
            'message' => 'Aplikasi "' . htmlspecialchars($name) . '" berhasil diperbarui.',
            'app' => $data['apps'][$foundIndex]
        ]);
    } else {
        json_response(['status' => 'error', 'message' => 'Gagal memperbarui file data/apps.json di server.'], 500);
    }
}

// -------------------------------------------------------------
// Action: DELETE / HAPUS APLIKASI
// -------------------------------------------------------------
if ($action === 'delete' || $method === 'DELETE') {
    $id = trim($input['id'] ?? $_GET['id'] ?? '');
    if (empty($id)) {
        json_response(['status' => 'error', 'message' => 'ID aplikasi untuk dihapus tidak diberikan.'], 422);
    }

    $foundIndex = -1;
    $appName = '';
    $iconPath = '';
    foreach ($data['apps'] as $index => $app) {
        if ($app['id'] === $id) {
            $foundIndex = $index;
            $appName = $app['name'];
            $iconPath = $app['icon'] ?? '';
            break;
        }
    }

    if ($foundIndex === -1) {
        json_response(['status' => 'error', 'message' => 'Aplikasi tidak ditemukan.'], 404);
    }

    // Hapus dari daftar
    array_splice($data['apps'], $foundIndex, 1);

    // Jika ikon tersimpan di folder uploads, kita dapat membersihkannya jika tidak dipakai lagi
    if (!empty($iconPath) && strpos($iconPath, 'data/uploads/') === 0) {
        $fullIconPath = BASE_DIR . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $iconPath);
        // Cek apakah ada app lain yang pakai icon ini
        $usedElsewhere = false;
        foreach ($data['apps'] as $otherApp) {
            if (($otherApp['icon'] ?? '') === $iconPath) {
                $usedElsewhere = true;
                break;
            }
        }
        if (!$usedElsewhere && file_exists($fullIconPath)) {
            @unlink($fullIconPath);
        }
    }

    if (save_apps_data($data)) {
        json_response([
            'status' => 'success',
            'message' => 'Aplikasi "' . htmlspecialchars($appName) . '" berhasil dihapus.'
        ]);
    } else {
        json_response(['status' => 'error', 'message' => 'Gagal menyimpan perubahan ke server.'], 500);
    }
}

// -------------------------------------------------------------
// Action: REORDER / URUTKAN SEMUA APLIKASI
// -------------------------------------------------------------
if ($action === 'reorder') {
    $orderMap = $input['orders'] ?? []; // Format: [ { "id": "app-1", "order": 1 }, ... ]
    if (!is_array($orderMap)) {
        json_response(['status' => 'error', 'message' => 'Format data urutan tidak valid.'], 422);
    }

    $idToOrder = [];
    foreach ($orderMap as $item) {
        if (isset($item['id']) && isset($item['order'])) {
            $idToOrder[$item['id']] = (int)$item['order'];
        }
    }

    foreach ($data['apps'] as &$app) {
        if (isset($idToOrder[$app['id']])) {
            $app['order'] = $idToOrder[$app['id']];
        }
    }
    unset($app);

    if (save_apps_data($data)) {
        json_response([
            'status' => 'success',
            'message' => 'Urutan aplikasi berhasil diperbarui.'
        ]);
    } else {
        json_response(['status' => 'error', 'message' => 'Gagal menyimpan urutan baru.'], 500);
    }
}

json_response(['status' => 'error', 'message' => 'Aksi tidak dikenali.'], 400);
