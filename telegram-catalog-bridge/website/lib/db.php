<?php
function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $path = __DIR__ . '/../config.php';
    if (!is_file($path)) throw new RuntimeException('Configuration missing');
    $cfg = require $path;
    if (!is_array($cfg)) throw new RuntimeException('Configuration invalid');
    $dsn = 'mysql:host=' . $cfg['db_host'] . ';dbname=' . $cfg['db_name'] . ';charset=utf8mb4';
    $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}
function e($value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function httpsUrl($value): string {
    $url = (string)$value;
    return filter_var($url, FILTER_VALIDATE_URL) && strtolower((string)parse_url($url, PHP_URL_SCHEME)) === 'https' ? $url : '';
}
function addonId(): string {
    $id = $_GET['uuid'] ?? '';
    return is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,64}$/D', $id) ? $id : '';
}
function formatBytes($bytes): string {
    $bytes = (int)$bytes;
    if ($bytes <= 0) return 'Size unknown';
    if ($bytes < 1024) return $bytes . ' B';
    if ($bytes < 1048576) return round($bytes / 1024, 1) . ' KB';
    if ($bytes < 1073741824) return round($bytes / 1048576, 1) . ' MB';
    return round($bytes / 1073741824, 1) . ' GB';
}
