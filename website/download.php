<?php
require __DIR__ . '/lib/db.php';
$id = addonId();
if ($id === '') { http_response_code(400); exit('Missing or invalid add-on.'); }
try {
    $stmt = db()->prepare('SELECT file_url FROM addons WHERE uuid = :uuid LIMIT 1');
    $stmt->execute(['uuid' => $id]);
    $row = $stmt->fetch();
    $url = httpsUrl($row['file_url'] ?? '');
    if (!$url) { http_response_code(404); exit('File not found.'); }
    header('Location: ' . $url, true, 302); exit;
} catch (Throwable $ex) { http_response_code(503); exit('Downloads are temporarily unavailable. Please try again later.'); }
