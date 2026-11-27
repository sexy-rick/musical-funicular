<?php
// Bridge mode currently supports Telegram downloads only; direct R2 comes later.
require __DIR__ . '/lib/db.php';
$id = addonId();
if ($id === '') { http_response_code(400); exit('Missing or invalid add-on.'); }
header('Location: addon.php?uuid=' . rawurlencode($id), true, 302);
exit;
