<?php
// Database connection (server-side only, never output to browser)
function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $configPath = __DIR__ . '/../config.php';
    if (!file_exists($configPath)) {
        throw new RuntimeException('Database not configured. Copy config.example.php to config.php on the server.');
    }
    $cfg = require $configPath;
    $dsn = 'mysql:host=' . $cfg['db_host'] . ';dbname=' . $cfg['db_name'] . ';charset=utf8mb4';
    $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function e($value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function formatBytes($bytes): string {
    $bytes = (int)$bytes;
    if ($bytes <= 0) return 'Unknown';
    if ($bytes < 1024) return $bytes . ' B';
    if ($bytes < 1024 * 1024) return round($bytes / 1024, 2) . ' KB';
    if ($bytes < 1024 * 1024 * 1024) return round($bytes / (1024 * 1024), 2) . ' MB';
    return round($bytes / (1024 * 1024 * 1024), 2) . ' GB';
}
