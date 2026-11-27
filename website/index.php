<?php
require __DIR__ . '/lib/db.php';
$pdo = db();
$categories = ['ADD-ON','TEXTURE PACK','SKIN PACK','WORLD','MASHUP PACK','TEMPLATE','APPLICATION'];
$activeCat = isset($_GET['cat']) ? strtoupper(trim($_GET['cat'])) : '';
if (!in_array($activeCat, $categories, true)) $activeCat = '';
$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = 24;
$offset = ($page - 1) * $perPage;

if ($activeCat !== '') {
    $stmt = $pdo->prepare('SELECT * FROM addons WHERE category = :cat ORDER BY updated_at DESC LIMIT :lim OFFSET :off');
    $stmt->bindValue(':cat', $activeCat);
} else {
    $stmt = $pdo->prepare('SELECT * FROM addons ORDER BY updated_at DESC LIMIT :lim OFFSET :off');
}
$stmt->bindValue(':lim', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':off', $offset, PDO::PARAM_INT);
$stmt->execute();
$addons = $stmt->fetchAll();

$countStmt = $activeCat !== ''
    ? $pdo->prepare('SELECT COUNT(*) AS c FROM addons WHERE category = :cat')
    : $pdo->query('SELECT COUNT(*) AS c FROM addons');
if ($activeCat !== '') $countStmt->bindValue(':cat', $activeCat);
$countStmt->execute();
$total = (int)$countStmt->fetch()['c'];
$pages = max(1, (int)ceil($total / $perPage));
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Marketplace Trader — Minecraft Add-ons</title>
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
  <h1>Minecraft Add-ons</h1>
  <nav class="chips" aria-label="Categories">
    <a href="index.php" class="<?= $activeCat === '' ? 'active' : '' ?>">All</a>
    <?php foreach ($categories as $c): ?>
      <a href="index.php?cat=<?= urlencode($c) ?>" class="<?= $activeCat === $c ? 'active' : '' ?>"><?= e($c) ?></a>
    <?php endforeach; ?>
  </nav>

  <?php if (empty($addons)): ?>
    <div class="empty">No add-ons found yet. Check back soon!</div>
  <?php else: ?>
    <div class="grid">
    <?php foreach ($addons as $a): ?>
      <article class="card">
        <?php if (!empty($a['thumbnail_url'])): ?>
          <img src="<?= e($a['thumbnail_url']) ?>" alt="<?= e($a['title']) ?>" loading="lazy">
        <?php endif; ?>
        <div class="body">
          <h2><a href="addon.php?uuid=<?= urlencode($a['uuid']) ?>" style="color:inherit;text-decoration:none"><?= e($a['title']) ?></a></h2>
          <div class="meta"><?= e($a['creator'] ?? '') ?></div>
          <div><span class="badge"><?= e($a['category'] ?? 'ADD-ON') ?></span>
          <?php if (!empty($a['version'])): ?><span class="badge">v<?= e($a['version']) ?></span><?php endif; ?></div>
          <div class="meta"><?= e($a['file_ext'] ?? '') ?> · <?= e(formatBytes($a['file_size'] ?? 0)) ?></div>
          <a class="btn btn-primary" href="download.php?uuid=<?= urlencode($a['uuid']) ?>">Download</a>
        </div>
      </article>
    <?php endforeach; ?>
    </div>
    <?php if ($pages > 1): ?>
      <p style="margin-top:20px">
        <?php if ($page > 1): ?><a href="index.php?<?= $activeCat ? 'cat=' . urlencode($activeCat) . '&' : '' ?>page=<?= $page - 1 ?>">← Prev</a><?php endif; ?>
        Page <?= $page ?> of <?= $pages ?>
        <?php if ($page < $pages): ?><a href="index.php?<?= $activeCat ? 'cat=' . urlencode($activeCat) . '&' : '' ?>page=<?= $page + 1 ?>">Next →</a><?php endif; ?>
      </p>
    <?php endif; ?>
  <?php endif; ?>
</main>
<footer class="site">Marketplace Trader · <a href="https://t.me/Mc_addonbot">Telegram Bot</a></footer>
</body>
</html>
