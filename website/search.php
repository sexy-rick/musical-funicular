<?php
require __DIR__ . '/lib/db.php';
$q = trim($_GET['q'] ?? '');
$pdo = db();
$addons = [];
if ($q !== '') {
    $stmt = $pdo->prepare("SELECT * FROM addons WHERE title LIKE :q OR creator LIKE :q ORDER BY updated_at DESC LIMIT 50");
    $stmt->bindValue(':q', '%' . $q . '%');
    $stmt->execute();
    $addons = $stmt->fetchAll();
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Search — Marketplace Trader</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="site"><div class="wrap">
  <a class="brand" href="index.php">Marketplace Trader</a>
  <form action="search.php" method="get" role="search">
    <label for="q" style="position:absolute;left:-9999px">Search add-ons</label>
    <input id="q" name="q" type="search" value="<?= e($q) ?>" placeholder="Search add-ons..." autocomplete="off">
    <button class="btn btn-primary" type="submit">Search</button>
  </form>
</div></header>
<main>
  <h1>Search results<?= $q !== '' ? ' for "' . e($q) . '"' : '' ?></h1>
  <?php if ($q === ''): ?>
    <div class="empty">Type something above to search.</div>
  <?php elseif (empty($addons)): ?>
    <div class="empty">No add-ons found for "<?= e($q) ?>". Try another name.</div>
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
          <div><span class="badge"><?= e($a['category'] ?? 'ADD-ON') ?></span></div>
          <a class="btn btn-primary" href="download.php?uuid=<?= urlencode($a['uuid']) ?>">Download</a>
        </div>
      </article>
    <?php endforeach; ?>
    </div>
  <?php endif; ?>
</main>
<footer class="site">Marketplace Trader · <a href="https://t.me/Mc_addonbot">Telegram Bot</a></footer>
</body>
</html>
