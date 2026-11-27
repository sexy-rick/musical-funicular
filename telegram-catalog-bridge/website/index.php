<?php
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/view.php';
$categories = ['ADD-ON', 'TEXTURE PACK', 'SKIN PACK', 'WORLD', 'MASHUP PACK', 'TEMPLATE', 'APPLICATION'];
$cat = $_GET['cat'] ?? '';
$cat = is_string($cat) && in_array($cat, $categories, true) ? $cat : '';
pageHeader('Discover Minecraft Bedrock add-ons');
?>
<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><span class="hero-label"><span class="label-dot" aria-hidden="true"></span> FOR MINECRAFT BEDROCK</span><h1 id="hero-title">Your next world<br><em>starts here.</em></h1><p>Discover add-ons, textures and worlds for your next adventure. Find your favorite, then continue in Telegram.</p><div class="hero-actions"><a class="btn btn-primary" href="#catalog">Explore add-ons <span aria-hidden="true">↘</span></a><a class="hero-help" href="faq.php">How it works <span aria-hidden="true">↗</span></a></div></div><div class="hero-art" aria-hidden="true"><span class="art-spark">✳</span><div class="art-tile"><span>▦</span></div><div class="art-small">✦</div><span class="art-label">A WORLD OF<br>POSSIBILITIES</span></div></section>
<section class="catalog" id="catalog" aria-labelledby="catalog-title"><div class="section-heading"><div><span class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span> THE COLLECTION</span><h2 id="catalog-title">Find something new<span class="heading-accent">.</span></h2><p>A little something for every kind of world.</p></div><span class="count" aria-live="polite"></span></div>
<nav class="chips" aria-label="Filter by category"><a href="index.php#catalog" class="<?= $cat === '' ? 'active' : '' ?>" <?= $cat === '' ? 'aria-current="page"' : '' ?>>All</a><?php foreach ($categories as $c): ?><a href="index.php?cat=<?= rawurlencode($c) ?>#catalog" class="<?= $cat === $c ? 'active' : '' ?>" <?= $cat === $c ? 'aria-current="page"' : '' ?>><?= e(ucwords(strtolower($c))) ?></a><?php endforeach; ?></nav>
<noscript><div class="notice"><strong>JavaScript is needed to load the collection.</strong><p>Please enable JavaScript to browse add-ons. You can still visit our <a href="faq.php">Help page</a>.</p></div></noscript><div id="catalog-results" aria-live="polite" aria-busy="true"><div class="loading"><span class="loading-mark" aria-hidden="true">✳</span><p>Loading the collection…</p></div></div><script src="assets/catalog.js" defer></script></section>
<?php pageFooter(); ?>
