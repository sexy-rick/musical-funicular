<?php
require __DIR__ . '/lib/db.php'; require __DIR__ . '/lib/view.php';
pageHeader('Add-on');
?>
<section class="inner-page"><a class="back" href="/index.php#catalog">Back to collection</a><noscript><div class="notice"><strong>JavaScript is needed to load this add-on.</strong><p>Enable it and try again, or visit our <a href="/faq.php">Help page</a>.</p></div></noscript>
<div id="addon-results" aria-live="polite" aria-busy="true"><div class="loading"><p>Loading add-on…</p></div></div><script src="/assets/catalog-v5.js" defer></script></section>
<?php pageFooter(); ?>
