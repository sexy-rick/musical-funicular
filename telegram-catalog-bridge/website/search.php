<?php
require __DIR__ . '/lib/db.php'; require __DIR__ . '/lib/view.php';
$q = $_GET['q'] ?? ''; $q = is_string($q) ? trim(substr($q, 0, 100)) : '';
pageHeader('Search', $q);
?>
<section class="inner-page"><a class="back" href="/index.php#catalog">Back to collection</a><div class="section-heading page-heading"><div><span class="eyebrow">THE COLLECTION</span><h1>Search results<span class="heading-accent">.</span></h1><p><?= $q !== '' ? 'Results for “' . e($q) . '”' : 'Search by add-on name or creator.' ?></p></div></div>
<noscript><div class="notice"><strong>JavaScript is needed to search the collection.</strong><p>Please enable it to see results.</p></div></noscript><div id="search-results" aria-live="polite" aria-busy="true"><div class="loading"><p>Looking through the collection…</p></div></div><script src="/assets/catalog-v6.js" defer></script></section>
<?php pageFooter(); ?>
