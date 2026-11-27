<?php
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/view.php';
$categories = ['ADD-ON', 'TEXTURE PACK', 'SKIN PACK', 'WORLD', 'MASHUP PACK', 'TEMPLATE', 'APPLICATION'];
$cat = $_GET['cat'] ?? '';
$cat = is_string($cat) && in_array($cat, $categories, true) ? $cat : '';
pageHeader('Discover Minecraft Bedrock add-ons');
?>
<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><span class="hero-label">MINECRAFT BEDROCK CATALOG</span><h1 id="hero-title">Find more for<br><em>your world.</em></h1><p>Explore add-ons, textures, skins and worlds for Minecraft Bedrock. Open a listing and continue in Telegram.</p><div class="hero-actions"><a class="btn btn-primary" href="#catalog">Browse the collection</a><a class="hero-help" href="faq.php">How it works</a></div></div></section>
<section class="catalog" id="catalog" aria-labelledby="catalog-title"><div class="section-heading"><div><span class="eyebrow">THE COLLECTION</span><h2 id="catalog-title">Explore add-ons</h2><p>Choose a category or search for something specific.</p></div><span class="count" aria-live="polite"></span></div>
<nav class="chips" aria-label="Filter by category"><a href="index.php#catalog" class="<?= $cat === '' ? 'active' : '' ?>" <?= $cat === '' ? 'aria-current="page"' : '' ?>>All</a><?php foreach ($categories as $c): ?><a href="index.php?cat=<?= rawurlencode($c) ?>#catalog" class="<?= $cat === $c ? 'active' : '' ?>" <?= $cat === $c ? 'aria-current="page"' : '' ?>><?= e(ucwords(strtolower($c))) ?></a><?php endforeach; ?></nav>
<noscript><div class="notice"><strong>JavaScript is needed to load the collection.</strong><p>Please enable JavaScript to browse add-ons. You can still visit our <a href="faq.php">Help page</a>.</p></div></noscript><div id="catalog-results" aria-live="polite" aria-busy="true"><div class="loading"><p>Loading the collection…</p></div></div><script src="assets/catalog-v2.js" defer></script></section>
<?php pageFooter(); ?>
