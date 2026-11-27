<?php
require __DIR__ . '/lib/db.php';
$uuid = trim($_GET['uuid'] ?? '');
if ($uuid === '') { http_response_code(400); exit('Missing add-on.'); }
$pdo = db();
$stmt = $pdo->prepare('SELECT file_url FROM addons WHERE uuid = :uuid LIMIT 1');
$stmt->bindValue(':uuid', $uuid);
$stmt->execute();
$row = $stmt->fetch();
if (!$row || empty($row['file_url'])) { http_response_code(404); exit('File not found.'); }
// 302 redirect to the warehouse file (GitHub Releases now, R2 later)
header('Location: ' . $row['file_url'], true, 302);
exit;
