<?php
require __DIR__ . '/lib/db.php'; require __DIR__ . '/lib/view.php';
pageHeader('Add-on');
?>
<section class="inner-page"><a class="back" href="index.php">← Back to collection</a>
<div id="addon-results" aria-live="polite"><div class="empty"><p>Loading add-on…</p></div></div>
<script src="assets/catalog.js" defer></script></section>
<?php pageFooter(); ?>
