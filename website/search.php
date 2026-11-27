<?php
require __DIR__ . '/lib/db.php'; require __DIR__ . '/lib/view.php';
$q = $_GET['q'] ?? ''; $q = is_string($q) ? trim(substr($q, 0, 100)) : '';
$addons = []; $available = true;
if ($q !== '') {
    try {
        $stmt = db()->prepare('SELECT * FROM addons WHERE title LIKE :title OR creator LIKE :creator ORDER BY updated_at DESC LIMIT 50');
        $stmt->execute(['title' => '%' . $q . '%', 'creator' => '%' . $q . '%']);
        $addons = $stmt->fetchAll();
    } catch (Throwable $ex) { $available = false; }
}
pageHeader('Search', $q);
?>
<section class="inner-page"><a class="back" href="index.php">← Back to collection</a><div class="section-heading"><div><span class="eyebrow">THE COLLECTION</span><h1>Search results</h1><p><?= $q !== '' ? 'Results for “' . e($q) . '”' : 'Search by add-on name or creator.' ?></p></div></div>
<?php if (!$available): unavailable(); elseif ($q === ''): ?><div class="empty"><h2>Looking for something?</h2><p>Use the search bar above to get started.</p></div><?php elseif (!$addons): ?><div class="empty"><h2>No matches found</h2><p>Try a different search term.</p></div><?php else: ?><div class="grid"><?php foreach ($addons as $a) addonCard($a); ?></div><?php endif; ?></section>
<?php pageFooter(); ?>
