<?php
require __DIR__ . '/lib/db.php'; require __DIR__ . '/lib/view.php';
pageHeader('Add-on');
?>
<section class="inner-page"><a class="back" href="/index.php#catalog">Back to collection</a><noscript><div class="notice"><strong>JavaScript is needed to load this add-on.</strong><p>Enable it and try again, or visit our <a href="/faq.php">Help page</a>.</p></div></noscript>
<div id="addon-results" aria-live="polite" aria-busy="true"><div class="loading"><p>Loading add-on…</p></div></div><div class="discovery-panel"><div><span class="eyebrow">KEEP EXPLORING</span><h2>Find more for your world</h2><p>Discover more add-ons and worlds, or visit our help page for getting started.</p></div><div class="discovery-links"><a href="/index.php#catalog">Browse the collection</a><a href="/faq.php">Help &amp; FAQ</a><a href="https://t.me/Minecraft_addon_free_download">Main channel</a></div></div><script src="/assets/catalog-v8.js" defer></script></section>
<?php pageFooter(); ?>
