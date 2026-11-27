<?php
function pageHeader(string $title, string $query = ''): void {
    // Refresh HTML so it can refer to the current versioned assets after updates.
    header('Cache-Control: no-cache, must-revalidate');
    ?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?> | Marketplace Trader</title><meta name="theme-color" content="#151b17"><script src="/assets/theme-v6.js"></script><link rel="stylesheet" href="/assets/site-v6.css"></head>
<body><a class="skip-link" href="#main-content">Skip to content</a><header class="site"><div class="header-inner">
<a class="brand" href="/home" aria-label="Marketplace Trader home"><span class="brand-mark" aria-hidden="true">M</span><span>Marketplace <strong>Trader</strong></span></a>
<form class="search" action="/search.php" method="get" role="search"><label class="sr-only" for="search">Search add-ons and creators</label><input id="search" name="q" type="search" value="<?= e($query) ?>" placeholder="Search add-ons or creators" maxlength="100"><button type="submit"><svg class="icon" aria-hidden="true"><use href="/assets/icons-v6.svg#search"></use></svg> Search</button></form>
<nav class="main-nav" aria-label="Main navigation"><a href="/index.php#catalog">Browse</a><a href="/faq.php">Help</a><a class="nav-telegram" href="https://t.me/Minecraft_addon_free_download">Main channel</a><label class="theme-label" for="theme-choice">Theme</label><select id="theme-choice" aria-label="Theme"><option value="auto">Auto</option><option value="light">Light</option><option value="dark">Dark</option></select></nav>
</div></header><main id="main-content" tabindex="-1">
<?php }
function pageFooter(): void { ?>
</main><footer class="site-footer"><div class="footer-main"><div><a class="footer-brand" href="/home">Marketplace Trader</a><p>Explore community content for Minecraft Bedrock.</p></div><nav class="footer-nav" aria-label="Footer navigation"><a href="/index.php#catalog">Browse</a><a href="/faq.php">Help &amp; FAQ</a><a href="/about.php">About</a><a href="https://t.me/Minecraft_addon_free_download">Main channel</a><a href="https://t.me/minecraft_group_chat_friends">Community chat</a><a href="https://t.me/alchemisst">Contact support</a></nav></div><div class="footer-bottom"><span>Minecraft Bedrock community catalog</span><span>Not affiliated with Mojang or Microsoft.</span></div></footer></body></html>
<?php }
