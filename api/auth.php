<?php
/**
 * Peroni Application Terminal - Authentication Endpoint
 * PT Peroni Karya Sentra
 */

require_once __DIR__ . '/../config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'status') {
        json_response([
            'status' => 'success',
            'is_logged_in' => is_admin(),
            'user' => is_admin() ? 'admin' : null
        ]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Tangani json input atau post form data
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $action = $input['action'] ?? $action;

    if ($action === 'login') {
        $password = trim($input['password'] ?? '');

        // Validasi password terhadap hash atau password konfigurasi lokal
        $isValid = verify_admin_password($password);

        if ($isValid) {
            $_SESSION['peroni_admin_logged'] = true;
            $_SESSION['peroni_admin_time'] = time();

            json_response([
                'status' => 'success',
                'message' => 'Login berhasil. Selamat datang di Panel Administrator Peroni.',
                'is_logged_in' => true
            ]);
        } else {
            json_response([
                'status' => 'error',
                'message' => 'Kata sandi administrator salah. Silakan coba lagi.'
            ], 401);
        }
    }

    if ($action === 'logout') {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }
        session_destroy();

        json_response([
            'status' => 'success',
            'message' => 'Logout berhasil. Sesi telah diakhiri.',
            'is_logged_in' => false
        ]);
    }
}

json_response(['status' => 'error', 'message' => 'Permintaan tidak valid.'], 400);
