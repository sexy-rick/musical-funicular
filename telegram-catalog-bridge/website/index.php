<?php
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/view.php';
$categories = ['ADD-ON', 'TEXTURE PACK', 'SKIN PACK', 'WORLD', 'MASHUP PACK', 'TEMPLATE', 'APPLICATION'];
$cat = $_GET['cat'] ?? '';
$cat = is_string($cat) && in_array($cat, $categories, true) ? $cat : '';
$query = $_GET['q'] ?? ''; $query = is_string($query) ? trim(substr($query, 0, 100)) : '';
pageHeader('Discover Minecraft Bedrock add-ons', $query, false, true);
?>
<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><span class="hero-label">MINECRAFT BEDROCK CATALOG</span><h1 id="hero-title">Find more for<br><em>your world.</em></h1><p>Explore add-ons, textures, skins and worlds for Minecraft Bedrock. Open a listing and continue in Telegram.</p><div class="hero-actions"><a class="btn btn-primary" href="#catalog">Browse DLCs</a></div></div><aside class="hero-explore"><span class="hero-explore-label">YOUR NEXT ADVENTURE</span><h2>Make your next world your own.</h2><p>Discover community content and learn how to get started.</p><div class="hero-categories"><a href="/faq.php">Help &amp; FAQ</a><a href="https://t.me/Minecraft_addon_free_download">Main channel</a></div></aside></section>
<section class="catalog" id="catalog" aria-labelledby="catalog-title"><h2 class="sr-only" id="catalog-title">Browse DLCs</h2>
<noscript><div class="notice"><strong>JavaScript is needed to load the collection.</strong><p>Please enable JavaScript to browse add-ons. You can still visit our <a href="/faq.php">Help page</a>.</p></div></noscript><div id="catalog-results" aria-live="polite" aria-busy="true"><div class="loading"><p>Loading the collection…</p></div></div><script src="/assets/catalog-v10.js" defer></script></section>
<?php pageFooter(); ?>
