<?php
/**
 * Peroni Application Terminal - Icon Upload Handler
 * PT Peroni Karya Sentra
 */

require_once __DIR__ . '/../config.php';

// Pastikan hanya admin yang bisa mengunggah
require_admin_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['status' => 'error', 'message' => 'Metode request harus POST.'], 405);
}

if (!isset($_FILES['icon_file']) || $_FILES['icon_file']['error'] !== UPLOAD_ERR_OK) {
    $errCode = $_FILES['icon_file']['error'] ?? -1;
    $errMsg = 'Tidak ada file yang diunggah atau terjadi kesalahan saat upload.';
    if ($errCode === UPLOAD_ERR_INI_SIZE || $errCode === UPLOAD_ERR_FORM_SIZE) {
        $errMsg = 'Ukuran file melebihi batas maksimum (2MB).';
    }
    json_response(['status' => 'error', 'message' => $errMsg], 400);
}

$file = $_FILES['icon_file'];

// 1. Batas ukuran maksimal: 2 MB
$maxSize = 2 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    json_response(['status' => 'error', 'message' => 'Ukuran file terlalu besar. Maksimal 2 MB.'], 422);
}

// 2. Validasi ekstensi
$allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico'];
$originalName = $file['name'];
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if (!in_array($extension, $allowedExtensions, true)) {
    json_response([
        'status' => 'error',
        'message' => 'Tipe file tidak didukung. Harap unggah file gambar berformat PNG, JPG, JPEG, WEBP, SVG, atau ICO.'
    ], 422);
}

// 3. Validasi MIME Type menggunakan finfo
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedMimes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/ico',
    'image/icon',
    'application/ico',
    'application/x-ico',
    'text/xml',      // Sebagian sistem mengidentifikasi SVG sebagai text/xml
    'text/plain'     // atau text/plain untuk SVG text
];

if (!in_array($mimeType, $allowedMimes, true)) {
    json_response([
        'status' => 'error',
        'message' => 'MIME type file tidak valid sebagai gambar: ' . htmlspecialchars($mimeType)
    ], 422);
}

// 4. Validasi isi file mendalam berdasarkan tipe konten (Deep Content Verification)

// 4.1 Validasi khusus format ICO (Windows Icon)
if ($extension === 'ico') {
    if ($file['size'] < 22) {
        json_response([
            'status' => 'error',
            'message' => 'File ICO tidak valid (ukuran file terlalu kecil untuk header ICO).'
        ], 422);
    }

    $handle = fopen($file['tmp_name'], 'rb');
    if (!$handle) {
        json_response(['status' => 'error', 'message' => 'Gagal membaca file ICO untuk verifikasi.'], 422);
    }

    $header = fread($handle, 6);
    fclose($handle);

    // Header ICO: 2 byte reserved (0x0000), 2 byte tipe icon (0x0001), 2 byte jumlah icon (>= 1)
    if (strlen($header) < 6) {
        json_response(['status' => 'error', 'message' => 'Format file ICO tidak lengkap.'], 422);
    }

    $magic = substr($header, 0, 4);
    if ($magic !== "\x00\x00\x01\x00") {
        json_response([
            'status' => 'error',
            'message' => 'Isi file tidak valid sebagai format Windows Icon (.ico). Header binary tidak cocok.'
        ], 422);
    }

    $unpacked = unpack('vcount', substr($header, 4, 2));
    $iconCount = $unpacked['count'] ?? 0;
    if ($iconCount < 1) {
        json_response([
            'status' => 'error',
            'message' => 'File ICO tidak memuat gambar ikon yang valid.'
        ], 422);
    }
}

// 4.2 Validasi khusus gambar raster (PNG, JPG, WEBP)
if (in_array($extension, ['png', 'jpg', 'jpeg', 'webp'], true)) {
    $imgInfo = @getimagesize($file['tmp_name']);
    if ($imgInfo === false) {
        json_response([
            'status' => 'error',
            'message' => 'Isi file gambar tidak valid atau korup.'
        ], 422);
    }
}

// 4.3 Perlindungan khusus untuk SVG (Cegah Stored XSS / Script Injection)
if ($extension === 'svg') {
    $svgContent = file_get_contents($file['tmp_name']);
    if ($svgContent === false) {
        json_response(['status' => 'error', 'message' => 'Gagal membaca konten file SVG.'], 422);
    }

    if (stripos($svgContent, '<svg') === false) {
        json_response(['status' => 'error', 'message' => 'File SVG tidak memiliki tag root <svg> yang valid.'], 422);
    }

    // Periksa pola script berbahaya
    $dangerousPatterns = [
        '/<script\b[^>]*>/i',
        '/onload\s*=/i',
        '/onerror\s*=/i',
        '/onclick\s*=/i',
        '/onmouseover\s*=/i',
        '/javascript\s*:/i',
        '/<iframe\b[^>]*>/i',
        '/<object\b[^>]*>/i',
        '/<embed\b[^>]*>/i'
    ];

    foreach ($dangerousPatterns as $pattern) {
        if (preg_match($pattern, $svgContent)) {
            json_response(['status' => 'error', 'message' => 'File SVG ditolak karena mengandung kode script yang tidak aman.'], 422);
        }
    }
}

// 5. Pastikan folder data/uploads ada
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0775, true);
}

// 6. Generate nama file unik acak (Cegah penimpaan file & path traversal)
$randomHash = bin2hex(random_bytes(8));
$newFileName = 'icon_' . time() . '_' . $randomHash . '.' . $extension;
$destinationPath = UPLOAD_DIR . DIRECTORY_SEPARATOR . $newFileName;

if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
    json_response(['status' => 'error', 'message' => 'Gagal memindahkan file ke folder uploads di server.'], 500);
}

// Set permission aman
@chmod($destinationPath, 0664);

// Return path relatif untuk disimpan ke JSON
$relativePath = 'data/uploads/' . $newFileName;

json_response([
    'status' => 'success',
    'message' => 'Ikon berhasil diunggah.',
    'icon_path' => $relativePath,
    'file_name' => $newFileName
]);
