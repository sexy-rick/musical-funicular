<?php
function pageHeader(string $title, string $query = '', bool $prefetchSearch = false): void {
    // Refresh HTML so it can refer to the current versioned assets after updates.
    header('Cache-Control: no-cache, must-revalidate');
    ?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://mc-catalog-1474006216.aman-nsipai.workers.dev" crossorigin>
<?php if ($prefetchSearch): ?><script>
(()=>{const q=(new URLSearchParams(location.search).get('q')||'').trim().slice(0,100);if(!q)return;const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);const p=fetch('https://mc-catalog-1474006216.aman-nsipai.workers.dev/addons?'+new URLSearchParams({q}),{headers:{Accept:'application/json'},credentials:'omit',signal:c.signal}).then(async r=>{if(!r.ok){const e=new Error('Catalog unavailable');e.status=r.status;throw e;}const data=await r.json();if(!data||data.ok!==true)throw new Error('Invalid response');return data;}).finally(()=>clearTimeout(t));p.catch(()=>{});window.__earlySearch={q,promise:p};})();
</script><?php endif; ?>
<title><?= e($title) ?> | Marketplace Trader</title><meta name="theme-color" content="#18140f"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=8"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=8"><link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=8"><link rel="manifest" href="/site.webmanifest?v=8"><script src="/assets/theme-v8.js"></script><link rel="stylesheet" href="/assets/site-v8.css"></head>
<body><a class="skip-link" href="#main-content">Skip to content</a><header class="site"><div class="header-inner">
<a class="brand" href="/home" aria-label="Marketplace Trader home"><img class="brand-logo" src="/assets/brand-logo-v8.jpg" alt="" width="48" height="48"><span>Marketplace <strong>Trader</strong></span></a>
<form class="search" action="/search.php" method="get" role="search"><label class="sr-only" for="search">Search add-ons and creators</label><input id="search" name="q" type="search" value="<?= e($query) ?>" placeholder="Search add-ons or creators" maxlength="100" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="search-suggestions"><button type="submit"><svg class="icon" aria-hidden="true"><use href="/assets/icons-v6.svg#search"></use></svg> Search</button><ul id="search-suggestions" class="search-suggestions" role="listbox" aria-label="Search suggestions" hidden></ul><span class="sr-only" id="suggestions-status" role="status"></span></form>
<nav class="main-nav" aria-label="Main navigation"><a href="/index.php#catalog">Browse</a><a href="/faq.php">Help</a><a class="nav-telegram" href="https://t.me/Minecraft_addon_free_download">Main channel</a><label class="theme-label" for="theme-choice">Theme</label><select id="theme-choice" aria-label="Theme"><option value="auto">Auto</option><option value="light">Light</option><option value="dark">Dark</option></select></nav>
</div></header><main id="main-content" tabindex="-1">
<?php }
function pageFooter(): void { ?>
</main><script src="/assets/search-v7.js" defer></script><footer class="site-footer"><div class="footer-main"><div><a class="footer-brand" href="/home">Marketplace Trader</a><p>Explore community content for Minecraft Bedrock.</p></div><nav class="footer-nav" aria-label="Footer navigation"><a href="/index.php#catalog">Browse</a><a href="/faq.php">Help &amp; FAQ</a><a href="/about.php">About</a><a href="https://t.me/Minecraft_addon_free_download">Main channel</a><a href="https://t.me/minecraft_group_chat_friends">Community chat</a><a href="https://t.me/alchemisst">Contact support</a></nav></div><div class="footer-bottom"><span>Minecraft Bedrock community catalog</span><span>Not affiliated with Mojang or Microsoft.</span></div></footer></body></html>
<?php }
