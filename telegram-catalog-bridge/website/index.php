<?php
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/view.php';
require __DIR__ . '/lib/catalog.php';
$categories = ['ADD-ON', 'TEXTURE PACK', 'SKIN PACK', 'WORLD', 'MASHUP PACK', 'TEMPLATE', 'APPLICATION'];
$cat = $_GET['cat'] ?? '';
$cat = is_string($cat) && in_array($cat, $categories, true) ? $cat : '';
$pageParam = $_GET['page'] ?? '1';
$page = is_string($pageParam) && ctype_digit($pageParam) ? max(1, min(100000, (int)$pageParam)) : 1;
pageHeader('Minecraft add-ons');
?>
<section class="hero"><div class="hero-copy"><span class="hero-label"><span aria-hidden="true">✦</span> FOR MINECRAFT BEDROCK</span><h1>Make your world<br><em>your own.</em></h1><p>Find add-ons, textures and worlds for your next adventure.</p><a class="btn btn-primary" href="#catalog">Explore the collection <span aria-hidden="true">↓</span></a></div><div class="hero-art" aria-hidden="true"><div class="block block-one">✳</div><div class="block block-two">▦</div><div class="block block-three">✺</div></div></section>
<section class="catalog" id="catalog"><div class="section-heading"><div><span class="eyebrow">THE COLLECTION</span><h2>Find something new</h2><p>Browse by category or search for a favourite.</p></div><span class="count">Loading…</span></div>
<nav class="chips" aria-label="Filter by category"><a href="index.php#catalog" class="<?= $cat === '' ? 'active' : '' ?>" <?= $cat === '' ? 'aria-current="page"' : '' ?>>All</a><?php foreach ($categories as $c): ?><a href="index.php?cat=<?= rawurlencode($c) ?>#catalog" class="<?= $cat === $c ? 'active' : '' ?>" <?= $cat === $c ? 'aria-current="page"' : '' ?>><?= e(ucwords(strtolower($c))) ?></a><?php endforeach; ?></nav>
<div id="catalog-results" aria-live="polite"><div class="empty"><p>Loading the collection…</p></div></div>
<script src="assets/catalog.js" defer></script>
</section>
<?php pageFooter(); ?>
