<?php
function pageHeader(string $title, string $query = ''): void { ?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?> | Marketplace Trader</title><meta name="theme-color" content="#181d17"><link rel="stylesheet" href="assets/style.css"></head>
<body><header class="site"><div class="header-inner">
<a class="brand" href="index.php" aria-label="Marketplace Trader home"><span class="brand-mark" aria-hidden="true">M</span><span>Marketplace<br><strong>Trader</strong></span></a>
<form class="search" action="search.php" method="get" role="search"><span class="search-icon" aria-hidden="true">⌕</span><label class="sr-only" for="search">Search add-ons</label><input id="search" name="q" type="search" value="<?= e($query) ?>" placeholder="Search add-ons, creators..." maxlength="100"><button type="submit">Search</button></form>
<a class="header-link" href="https://t.me/Mc_addonbot">Telegram <span aria-hidden="true">↗</span></a>
</div></header><main>
<?php }
function pageFooter(): void { ?>
</main><footer class="site-footer"><div><strong>Marketplace Trader</strong><span>Minecraft Bedrock community</span></div><a href="https://t.me/Mc_addonbot">Find us on Telegram ↗</a><p>Not affiliated with Mojang or Microsoft.</p></footer></body></html>
<?php }
function addonCard(array $a): void {
    $image = httpsUrl($a['thumbnail_url'] ?? '');
    $url = 'addon.php?uuid=' . rawurlencode($a['uuid']); ?>
<article class="card"><a class="card-image" href="<?= e($url) ?>" aria-label="View <?= e($a['title']) ?>"><?php if ($image): ?><img src="<?= e($image) ?>" alt="" loading="lazy"><?php else: ?><span class="block-icon" aria-hidden="true">▦</span><?php endif; ?></a>
<div class="card-body"><span class="eyebrow"><?= e($a['category'] ?: 'ADD-ON') ?></span><h3><a href="<?= e($url) ?>"><?= e($a['title']) ?></a></h3><p class="card-creator"><?= e($a['creator'] ?: 'Creator not listed') ?></p><div class="card-bottom"><span><?= e(formatBytes($a['file_size'] ?? 0)) ?></span><a class="round-link" href="<?= e($url) ?>" aria-label="View <?= e($a['title']) ?>">↗</a></div></div></article>
<?php }
function unavailable(): void { ?><div class="notice"><span class="notice-icon" aria-hidden="true">!</span><div><strong>Catalog is getting ready</strong><p>We couldn’t load add-ons right now. Please check back soon.</p></div></div><?php }
