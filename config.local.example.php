<?php
/**
 * Peroni Application Terminal - Contoh Konfigurasi Lokal / Produksi
 * 
 * Salin file ini menjadi 'config.local.php' pada server deployment.
 * File 'config.local.php' diabaikan oleh Git (.gitignore) sehingga aman dari kebocoran kredensial.
 */

// 1. Ganti kata sandi administrator untuk server produksi di bawah ini:
// define('CUSTOM_ADMIN_PASSWORD', 'GantiDenganKataSandiKuat');

// 2. Atau Anda dapat menggunakan password_hash bcrypt untuk keamanan lebih tinggi:
// define('CUSTOM_ADMIN_HASH', '$2y$10$abcdefghijklmnopqrstuvwxyz1234567890...');

// 3. Waktu kedaluwarsa sesi (dalam detik, default: 86400 / 24 jam)
// define('CUSTOM_SESSION_LIFETIME', 86400);
