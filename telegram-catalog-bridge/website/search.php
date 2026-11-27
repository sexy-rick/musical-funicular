<?php
require __DIR__ . '/lib/db.php'; require __DIR__ . '/lib/view.php';
$q = $_GET['q'] ?? ''; $q = is_string($q) ? trim(substr($q, 0, 100)) : '';
pageHeader('Search', $q);
?>
<section class="inner-page"><a class="back" href="index.php">← Back to collection</a><div class="section-heading"><div><span class="eyebrow">THE COLLECTION</span><h1>Search results</h1><p><?= $q !== '' ? 'Results for “' . e($q) . '”' : 'Search by add-on name or creator.' ?></p></div></div>
<div id="search-results" aria-live="polite"><div class="empty"><p>Loading search results…</p></div></div>
<script src="assets/catalog.js" defer></script></section>
<?php pageFooter(); ?>
