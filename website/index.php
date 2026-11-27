<?php
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/view.php';
$categories = ['ADD-ON', 'TEXTURE PACK', 'SKIN PACK', 'WORLD', 'MASHUP PACK', 'TEMPLATE', 'APPLICATION'];
$cat = $_GET['cat'] ?? '';
$cat = is_string($cat) && in_array($cat, $categories, true) ? $cat : '';
$pageParam = $_GET['page'] ?? '1';
$page = is_string($pageParam) && ctype_digit($pageParam) ? max(1, min(100000, (int)$pageParam)) : 1;
$addons = []; $total = 0; $available = true; $perPage = 24;
try {
    $pdo = db();
    $where = $cat !== '' ? ' WHERE category = :cat' : '';
    $count = $pdo->prepare('SELECT COUNT(*) FROM addons' . $where);
    if ($cat !== '') $count->bindValue(':cat', $cat);
    $count->execute(); $total = (int)$count->fetchColumn();
    $pages = max(1, (int)ceil($total / $perPage));
    $page = min($page, $pages);
    $stmt = $pdo->prepare('SELECT * FROM addons' . $where . ' ORDER BY updated_at DESC LIMIT :lim OFFSET :off');
    if ($cat !== '') $stmt->bindValue(':cat', $cat);
    $stmt->bindValue(':lim', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':off', ($page - 1) * $perPage, PDO::PARAM_INT);
    $stmt->execute(); $addons = $stmt->fetchAll();
} catch (Throwable $ex) { $available = false; $pages = 1; }
pageHeader('Minecraft add-ons');
?>
<section class="hero"><div class="hero-copy"><span class="hero-label"><span aria-hidden="true">✦</span> FOR MINECRAFT BEDROCK</span><h1>Make your world<br><em>your own.</em></h1><p>Find add-ons, textures and worlds for your next adventure.</p><a class="btn btn-primary" href="#catalog">Explore the collection <span aria-hidden="true">↓</span></a></div><div class="hero-art" aria-hidden="true"><div class="block block-one">✳</div><div class="block block-two">▦</div><div class="block block-three">✺</div></div></section>
<section class="catalog" id="catalog"><div class="section-heading"><div><span class="eyebrow">THE COLLECTION</span><h2>Find something new</h2><p>Browse by category or search for a favourite.</p></div><span class="count"><?= $available ? e($total) . ' add-ons' : 'Bedrock edition' ?></span></div>
<nav class="chips" aria-label="Filter by category"><a href="index.php#catalog" class="<?= $cat === '' ? 'active' : '' ?>" <?= $cat === '' ? 'aria-current="page"' : '' ?>>All</a><?php foreach ($categories as $c): ?><a href="index.php?cat=<?= rawurlencode($c) ?>#catalog" class="<?= $cat === $c ? 'active' : '' ?>" <?= $cat === $c ? 'aria-current="page"' : '' ?>><?= e(ucwords(strtolower($c))) ?></a><?php endforeach; ?></nav>
<?php if (!$available): unavailable(); elseif (!$addons): ?><div class="empty"><span class="empty-icon" aria-hidden="true">▦</span><h3>Nothing here just yet</h3><p>Try another category or check back soon.</p></div><?php else: ?><div class="grid"><?php foreach ($addons as $a) addonCard($a); ?></div><?php if ($pages > 1): ?><nav class="pagination" aria-label="Catalog pages"><?php if ($page > 1): ?><a href="?<?= $cat ? 'cat=' . rawurlencode($cat) . '&amp;' : '' ?>page=<?= $page - 1 ?>#catalog">← Previous</a><?php endif; ?><span>Page <?= $page ?> of <?= $pages ?></span><?php if ($page < $pages): ?><a href="?<?= $cat ? 'cat=' . rawurlencode($cat) . '&amp;' : '' ?>page=<?= $page + 1 ?>#catalog">Next →</a><?php endif; ?></nav><?php endif; endif; ?></section>
<?php pageFooter(); ?>
