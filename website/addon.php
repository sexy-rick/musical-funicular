<?php
require __DIR__ . '/lib/db.php';
$uuid = trim($_GET['uuid'] ?? '');
if ($uuid === '') { http_response_code(400); exit('Missing add-on.'); }
$pdo = db();
$stmt = $pdo->prepare('SELECT * FROM addons WHERE uuid = :uuid LIMIT 1');
$stmt->bindValue(':uuid', $uuid);
$stmt->execute();
$a = $stmt->fetch();
if (!$a) { http_response_code(404); exit('Add-on not found.'); }
$cfg = require __DIR__ . '/config.php';
$botUser = $cfg['bot_username'] ?? 'Mc_addonbot';
$tgLink = 'https://t.me/' . $botUser . '?start=' . urlencode($a['uuid']);
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($a['title']) ?> — Marketplace Trader</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="site"><div class="wrap">
  <a class="brand" href="index.php">Marketplace Trader</a>
  <form action="search.php" method="get" role="search">
    <label for="q" style="position:absolute;left:-9999px">Search add-ons</label>
    <input id="q" name="q" type="search" placeholder="Search add-ons..." autocomplete="off">
    <button class="btn btn-primary" type="submit">Search</button>
  </form>
</div></header>
<main>
  <p><a href="index.php">← All add-ons</a></p>
  <div class="detail">
    <div>
      <?php if (!empty($a['thumbnail_url'])): ?>
        <img class="hero" src="<?= e($a['thumbnail_url']) ?>" alt="<?= e($a['title']) ?>">
      <?php endif; ?>
    </div>
    <div>
      <h1><?= e($a['title']) ?></h1>
      <p class="meta" style="color:var(--ink-muted)">
        by <?= e($a['creator'] ?? 'Unknown') ?> ·
        <span class="badge"><?= e($a['category'] ?? 'ADD-ON') ?></span>
        <?php if (!empty($a['version'])): ?><span class="badge">v<?= e($a['version']) ?></span><?php endif; ?>
      </p>
      <p><?= e($a['file_ext'] ?? '') ?> · <?= e(formatBytes($a['file_size'] ?? 0)) ?></p>
      <div class="actions">
        <a class="btn btn-primary" href="download.php?uuid=<?= urlencode($a['uuid']) ?>">Download <?= e(strtoupper($a['file_ext'] ?? 'file')) ?></a>
        <a class="btn btn-secondary" href="<?= e($tgLink) ?>">Download via Telegram</a>
      </div>
      <?php if (!empty($a['marketplace_url'])): ?>
        <p><a href="<?= e($a['marketplace_url']) ?>" target="_blank" rel="noopener">View on Marketplace</a></p>
      <?php endif; ?>
      <h2>How to install</h2>
      <ol>
        <li>Download the file above.</li>
        <li>Tap / double-click the file — Minecraft opens and imports it.</li>
        <li>Enable the pack in your world settings.</li>
      </ol>
    </div>
  </div>
</main>
<footer class="site">Marketplace Trader · <a href="https://t.me/Mc_addonbot">Telegram Bot</a></footer>
</body>
</html>
