// Development only: NODE_PATH=<directory containing playwright-core and @sparticuz/chromium> node this-file
// Requires @php-wasm/cli available through npx; serves rendered PHP fixtures locally and mocks the catalog.
const { execFileSync }=require('node:child_process');
const http=require('node:http'); const { readFileSync }=require('node:fs'); const { join }=require('node:path');
const assert=require('node:assert/strict'); const { chromium }=require('playwright-core'); const chromiumPackage=require('@sparticuz/chromium'); const chrome=chromiumPackage.default || chromiumPackage;
const root=join(__dirname,'../website');
const render=file=>process.env.PHP_WASM_CLI ? execFileSync(process.env.PHP_WASM_CLI,[join(root,file)],{encoding:'utf8'}) : execFileSync('npx',['--yes','@php-wasm/cli',join(root,file)],{encoding:'utf8'});
const html={ '/index.php':render('index.php'), '/faq.php':render('faq.php'), '/addon.php':render('addon.php'), '/search.php':render('search.php'), '/about.php':render('about.php'), '/alium.php':render('alium.php') };
html['/errors/404.html']=readFileSync(join(root,'errors/404.html'),'utf8'); html['/']=html['/index.php']; html['/home']=html['/index.php'];
// Mimic the intended Apache rewrite for browser interaction tests; this is not an Apache test.
const prettyRoute=/^\/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id='99eaa0fe-792a-4038-b588-e9ac2f02ce32';
const item={uuid:id,title:'A very long add-on name '.repeat(5),creator:'Maker',category:'ADD-ON',thumbnail_url:'https://example.com/image.jpg'};
// Simulate a returning visitor whose browser holds the old, unversioned assets.
const oldCss=execFileSync('git',['show','e4d3499:telegram-catalog-bridge/website/assets/style.css']);
const oldJs=execFileSync('git',['show','e4d3499:telegram-catalog-bridge/website/assets/catalog.js']);
const server=http.createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname; if(html[path] || prettyRoute.test(path)){res.setHeader('Content-Type','text/html');res.end(html[path] || html['/addon.php']);return;} if(path==='/assets/style.css'||path==='/assets/catalog.js'){res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'application/javascript');res.end(path.endsWith('.css')?oldCss:oldJs);return;} if(['/site.webmanifest','/sw-v16.js','/android-chrome-192x192.png','/android-chrome-512x512.png','/assets/site-v16.css','/assets/catalog-v14.js','/assets/search-v10.js','/assets/filters-v11.js','/assets/theme-v10.js','/assets/icons-v10.svg','/assets/icons-v12.svg','/assets/brand-logo-v8.jpg','/assets/alium-icon.png','/assets/install-v15.js','/assets/pwa-v16.js'].includes(path)){res.setHeader('Content-Type',path.endsWith('.webmanifest')?'application/manifest+json':path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.jpg')?'image/jpeg':path.endsWith('.png')?'image/png':'application/javascript');res.end(readFileSync(join(root,path)));return;}res.statusCode=404;res.end();});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:await chrome.executablePath(),args:chrome.args.filter(arg=>arg!=='--disable-web-security'),headless:true});
 try {
  const page=await browser.newPage({viewport:{width:320,height:800},reducedMotion:'reduce'});
  await page.route('https://mc-catalog-1474006216.aman-nsipai.workers.dev/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({ok:true,total:8,items:Array(8).fill(item),item})}));
  await page.route('https://example.com/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#526c51"/></svg>'}));
  for(const [width,cols] of [[320,1],[375,1],[599,1],[600,2],[768,2],[900,3],[1024,4],[1440,4]]){
   await page.setViewportSize({width,height:800}); await page.goto(`http://127.0.0.1:${server.address().port}/index.php`); await page.waitForSelector('.card');
   const result=await page.evaluate(()=>{const cards=[...document.querySelectorAll('.card')]; const firstTop=cards[0].getBoundingClientRect().top; return {columns:cards.filter(c=>Math.abs(c.getBoundingClientRect().top-firstTop)<1).length,overflow:document.documentElement.scrollWidth>innerWidth, reduced:getComputedStyle(document.querySelector('.card img')).transitionDuration,loads:cards.map(c=>c.querySelector('img').loading)};});
   if(result.overflow) console.log('Overflow elements:', await page.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.className,Math.round(e.getBoundingClientRect().right)]).slice(0,20)));
   assert.equal(result.columns,cols,`columns at ${width}`); assert.equal(result.overflow,false,`horizontal overflow at ${width}`); assert.equal(result.reduced,'0s',`reduced motion at ${width}`); assert.ok(result.loads.slice(0,cols).every(x=>x==='eager')); assert.equal(result.loads[cols],'lazy');
   assert.equal(await page.locator('.main-nav').evaluate(e=>getComputedStyle(e).display),'flex');
   assert.ok(await page.locator('.footer-nav').evaluate(e=>parseFloat(getComputedStyle(e).gap)>0));
   assert.doesNotMatch(await page.locator('body').innerText(),/[✦✳✺▦↗↘↓←→⌕]/);
   assert.equal(await page.locator('.card').first().locator('a button').count(),0);
   assert.equal(await page.locator('.card-download').first().getAttribute('href'),'/addon.php?uuid='+id);
   assert.equal(await page.locator('.card .card-category').first().getAttribute('href'),'/index.php?cat=ADD-ON#catalog'); assert.equal(await page.locator('.card-link .card-category').count(),0);
   const row=await page.locator('.card').first().evaluate(e=>{const c=e.querySelector('.card-category').getBoundingClientRect(),s=e.querySelector('.share-button').getBoundingClientRect(),d=e.querySelector('.card-download').getBoundingClientRect();return {order:c.right<=s.left+1&&s.right<=d.left+1,aligned:Math.abs((c.top+c.bottom)/2-(s.top+s.bottom)/2)<2&&Math.abs((s.top+s.bottom)/2-(d.top+d.bottom)/2)<2,shareWidth:s.width,downloadHeight:d.height}});assert.ok(row.order&&row.aligned,`card action alignment at ${width}`);assert.ok(row.shareWidth>=44&&row.downloadHeight>=44);
   const alignment=await page.locator('.theme-control').evaluate(e=>{const box=e.querySelector('select').getBoundingClientRect(), icon=e.querySelector('.theme-icon').getBoundingClientRect();return icon.left>=box.left && icon.right<=box.right && icon.top>=box.top && icon.bottom<=box.bottom}); assert.equal(alignment,true,'theme icon inside control');
   assert.equal(await page.locator('.card .share-button').count(),8); assert.equal(await page.locator('.card .share-button').first().innerText(),'');
   if(process.env.CATALOG_SCREENSHOTS && (width===375 || width===1440)) await page.screenshot({path:`/tmp/catalog-${width}.png`,fullPage:true});
   console.log(`${width}px: ${result.columns} columns, no overflow, reduced motion`);
  }
  await page.setViewportSize({width:1024,height:800}); item.category='An unexpectedly long unbroken category '.repeat(5); await page.goto(`http://127.0.0.1:${server.address().port}/index.php`); await page.waitForSelector('.card'); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'long category overflow'); assert.equal(await page.locator('.card-category').first().evaluate(e=>e.tagName),'SPAN'); item.category=''; await page.reload(); await page.waitForSelector('.card'); assert.equal(await page.locator('.card .share-button').count(),8,'missing category keeps actions'); item.category='ADD-ON';
  const appUrl=`http://127.0.0.1:${server.address().port}/alium.php`;
  for(const width of [320,375,600,900,1440]) for(const theme of ['light','dark']) {
   await page.setViewportSize({width,height:900}); await page.goto(appUrl);
   await page.locator('#theme-choice').selectOption(theme);
   await page.addStyleTag({content:'html {font-size: 125%}'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Alium overflow ${width} ${theme}`);
   assert.equal(await page.locator('.alium-download').getAttribute('href'),'https://github.com/Alchemiisst/Alium/releases/download/v0.1.0/app-release.apk');
   assert.equal(await page.locator('.alium-icon').evaluate(e=>e.complete && e.naturalWidth>0),true);
   assert.ok((await page.locator('.alium-download').boundingBox()).height>=44);
  }
  await page.goto(`http://127.0.0.1:${server.address().port}/index.php`);
  assert.equal(await page.locator('.hero-actions a').nth(0).getAttribute('href'),'#catalog');
  assert.equal(await page.locator('.hero-actions a').nth(1).getAttribute('href'),'/alium.php');
  assert.equal(await page.locator('.hero-actions a').count(),2);
  assert.equal(await page.locator('.hero-app-button').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(135, 79, 158)');
  assert.equal(await page.locator('.hero-app-button').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
  await page.goto(appUrl);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  const cdp=await page.context().newCDPSession(page);
  const manifest=await cdp.send('Page.getAppManifest');
  assert.deepEqual(manifest.errors,[],'Chrome manifest parsing');
  const installability=await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installability.installabilityErrors,[],'Chrome installability with locally served manifest, icons and service worker');
  await cdp.detach();
  // The event below is mocked; Chrome's actual prompt remains a device test.
  await page.reload();
  assert.equal(await page.locator('#web-install-button').isHidden(),true);
  await page.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true}); e.prompt=async()=>{window.__promptCalled=true;}; e.userChoice=Promise.resolve({outcome:'dismissed'}); window.dispatchEvent(e);});
  assert.equal(await page.locator('#web-install-button').isVisible(),true);
  await page.locator('#web-install-button').click();
  assert.equal(await page.evaluate(()=>window.__promptCalled),true);
  assert.match(await page.locator('#web-install-status').innerText(),/dismissed/i);
  assert.equal(await page.locator('#web-install-button').isHidden(),true);
  await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
  assert.match(await page.locator('#web-install-status').innerText(),/installed/i);
  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:800}}); const noJsPage=await noJs.newPage(); await noJsPage.goto(appUrl);
  assert.equal(await noJsPage.locator('.alium-download').getAttribute('href'),'https://github.com/Alchemiisst/Alium/releases/download/v0.1.0/app-release.apk');
  assert.match(await noJsPage.locator('.web-install-instructions').innerText(),/Chrome on Android/); assert.equal(await noJsPage.locator('#web-install-button').isHidden(),true);
  assert.equal(await noJsPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false); await noJs.close();
  // Search without matches offers the real helper bot, while suggestions stay available.
  await page.route('**/addons?**',async route=>{const u=new URL(route.request().url()); if(u.searchParams.get('q')==='nothing123') return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({ok:true,total:0,items:[]})}); return route.fallback();});
  for(const width of [320,375,600,1024,1440]) {await page.setViewportSize({width,height:800}); await page.goto(`http://127.0.0.1:${server.address().port}/search.php?q=nothing123`); await page.waitForSelector('.request-telegram'); assert.equal(await page.locator('.request-telegram').getAttribute('href'),'https://t.me/MARKETPLACE_TRADER_HELPER_BOT?start=suggest'); assert.equal(await page.locator('.request-telegram').getAttribute('target'),'_blank'); assert.match(await page.locator('.request-telegram').getAttribute('rel'),/noopener/); await page.waitForSelector('.recommendations .card'); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`request section overflow at ${width}`); assert.ok((await page.locator('.request-telegram').boundingBox()).height>=44);}
  await page.context().route('https://t.me/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>Request bot test</title>'}));
  const requestPopupPromise=page.waitForEvent('popup'); await page.locator('.request-telegram').click(); const requestPopup=await requestPopupPromise; await requestPopup.waitForLoadState(); assert.equal(requestPopup.url(),'https://t.me/MARKETPLACE_TRADER_HELPER_BOT?start=suggest'); await requestPopup.close(); await page.context().unroute('https://t.me/**');
  await page.unroute('**/addons?**');
  await page.setViewportSize({width:375,height:800});
  const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(`${base}/index.php`); await page.locator('.search-submit').click(); assert.match(page.url(),/index.php/); assert.equal(await page.locator('#search').evaluate(e=>document.activeElement===e),true); assert.equal(await page.locator('#suggestions-status').textContent(),'Enter a search term.'); const order=await page.locator('form.search').evaluate(e=>[...e.children].filter(x=>['search-submit','filter-open'].some(c=>x.classList.contains(c)) || x.id==='search').map(x=>x.id||x.className)); assert.deepEqual(order,['search','search-submit','filter-open']);
  let listRequests=0; page.on('request',request=>{if(request.url().includes('workers.dev/addons?')) listRequests++;});
  await page.goto(`${base}/index.php?cat=ADD-ON&page=2#catalog`); await page.waitForSelector('.card');
  await page.locator('.card-link').first().click(); await page.waitForSelector('.detail');
  assert.match(await page.locator('.back').getAttribute('href'),/cat=ADD-ON&page=2#catalog/);
  await page.locator('.back').click(); await page.waitForSelector('.card');
  assert.match(page.url(),/cat=ADD-ON&page=2#catalog/);
  console.log('Explicit return list requests:',listRequests,'(BFCache availability depends on browser)');
  const beforeSearch=listRequests; await page.goto(`${base}/search.php?q=chair`); await page.waitForSelector('.card'); assert.equal(listRequests-beforeSearch,1,'early search uses a single request'); await page.locator('.card-link').first().click(); await page.waitForSelector('.detail');
  assert.match(await page.locator('.back').getAttribute('href'),/search.php\?q=chair/); await page.locator('.back').click(); await page.waitForSelector('.card'); assert.match(page.url(),/search.php\?q=chair/);
  // Delay the client script: early search must finish while that script is still loading.
  const ordering=[]; const record=response=>{if(response.url().includes('workers.dev/addons?q=early')) ordering.push('search'); if(response.url().endsWith('/assets/catalog-v14.js')) ordering.push('script');}; page.on('response',record);
  await page.route('**/assets/catalog-v14.js',async route=>{await new Promise(resolve=>setTimeout(resolve,600)); await route.fulfill({path:join(root,'assets/catalog-v14.js'),contentType:'application/javascript'});});
  await page.goto(`${base}/search.php?q=early`); await page.waitForSelector('.card'); assert.ok(ordering.indexOf('search')>=0 && ordering.indexOf('search')<ordering.indexOf('script'), 'search starts while the client script loads');
  await page.unroute('**/assets/catalog-v14.js'); page.off('response',record);
  await page.goto(`${base}/addon.php?uuid=${id}`); await page.waitForSelector('.detail'); assert.equal(await page.locator('.back').getAttribute('href'),'/index.php#catalog');
  assert.equal(await page.locator('.pack-details dt').count(),6); assert.match(await page.locator('.pack-details').innerText(),/Marketplace price[\s\S]*Not available/);
  assert.match(await page.locator('.pack-details a').nth(1).getAttribute('href'),/cat=ADD-ON/); assert.match(await page.locator('.pack-details a').first().getAttribute('href'),/creator=Maker/); await page.locator('.pack-details a').first().click(); await page.waitForSelector('.card'); assert.match(page.url(),/creator=Maker/); assert.match(await page.locator('.filter-note').innerText(),/Studio: Maker/);

  assert.equal((await page.goto(`${base}/home?i=1`)).status(),200); await page.waitForSelector('.card');
  assert.equal(await page.locator('.brand img').getAttribute('src'),'/assets/brand-logo-v8.jpg'); assert.equal(await page.locator('link[rel="manifest"]').count(),1);
  await page.setViewportSize({width:1440,height:800}); assert.equal(await page.locator('.hero-explore').isVisible(),true); assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()),'#c88828'); await page.setViewportSize({width:375,height:800});

  await page.evaluate(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});});
  const fallbackButton=page.locator('.card .share-button').first(); await fallbackButton.scrollIntoViewIfNeeded(); const fallbackBefore=await fallbackButton.boundingBox(); const downloadBefore=await page.locator('.card-download').first().boundingBox(); await fallbackButton.click(); const fallbackAfter=await fallbackButton.boundingBox(); const downloadAfter=await page.locator('.card-download').first().boundingBox(); assert.equal(fallbackBefore.y,fallbackAfter.y,'copy fallback must not move share'); assert.equal(downloadBefore.y,downloadAfter.y,'copy fallback must not move download');
  const sharedUrl=await page.locator('.card .share-url').first().inputValue();
  assert.match(sharedUrl,new RegExp('^http://127\\.0\\.0\\.1:[0-9]+/[a-z0-9-]+-'+id+'$'));
  assert.equal(await page.locator('.card .share-fallback').first().isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'share fallback overflow');
  await page.selectOption('#theme-choice','light'); assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.reload(); assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.selectOption('#theme-choice','dark'); assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.goto(`${base}/errors/404.html`); assert.equal(await page.locator('html').getAttribute('data-theme'),'dark'); await page.selectOption('#theme-choice','light'); assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.goto(`${base}/home`); await page.waitForSelector('.card'); await page.selectOption('#theme-choice','auto');
  assert.equal(await page.locator('a[href="https://t.me/Minecraft_addon_free_download"]').count(),3);
  assert.equal(await page.locator('a[href="https://t.me/minecraft_group_chat_friends"]').count(),1); assert.equal(await page.locator('a[href="https://t.me/alchemisst"]').count(),1);

  // Link-only native share must not fetch images or move the button.
  let imageFetches=0; page.on('request',req=>{if(req.url().startsWith('https://example.com/') && req.resourceType()==='fetch') imageFetches++;});
  await page.addInitScript(()=>{window.sharedData=null; Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true}); Object.defineProperty(navigator,'share',{value:async d=>{window.sharedData={url:d.url,text:d.text,files:d.files};},configurable:true});});
  await page.reload(); await page.waitForSelector('.card');
  const button=page.locator('.card .share-button').first(); await button.scrollIntoViewIfNeeded(); const beforePos=await button.boundingBox(); await button.click(); const afterPos=await button.boundingBox();
  const share=await page.evaluate(()=>window.sharedData); assert.equal(share.url,sharedUrl); assert.equal(share.files,undefined); assert.match(share.text,/Discover/); assert.equal(imageFetches,0); assert.equal(beforePos.y,afterPos.y);
  // Search is debounced and suggests actual catalog titles, not third-party searches.
  const before=listRequests; await page.locator('#search').fill('lo'); await page.waitForTimeout(200); await page.locator('#search').fill('long'); await page.waitForTimeout(300); assert.equal(listRequests,before);
  await page.locator('#search-suggestions li').first().waitFor(); assert.equal(listRequests,before+1); assert.match(await page.locator('#search-suggestions li').first().textContent(),/long/);
  await page.locator('#search').press('ArrowDown'); assert.equal(await page.locator('#search-suggestions li').first().getAttribute('aria-selected'),'true'); await page.locator('#search').press('Escape'); assert.equal(await page.locator('#search-suggestions').isVisible(),false);
  await page.locator('.filter-open').click(); assert.deepEqual(await page.locator('#filter-form select').evaluateAll(es=>es.map(e=>e.id)),['filter-category','filter-updated','filter-sort']); assert.doesNotMatch(await page.locator('#filter-form').innerText(),/Dates reflect catalog updates|Relevance ranks matches/); await page.selectOption('#filter-category','WORLD'); await page.locator('#filter-close').click(); await page.locator('.filter-open').click(); assert.equal(await page.locator('#filter-category').inputValue(),''); assert.equal(await page.locator('#filter-dialog').evaluate(e=>e.open),true); await page.selectOption('#filter-category','WORLD'); await page.selectOption('#filter-updated','30d'); await page.selectOption('#filter-sort','updated_asc'); await page.locator('#filter-form button[type=submit]').click(); await page.waitForSelector('.card'); assert.match(page.url(),/cat=WORLD/); assert.match(page.url(),/updated=30d/); assert.match(page.url(),/q=long/); assert.match(page.url(),/sort=updated_asc/); assert.equal(await page.locator('#filter-sort').inputValue(),'updated_asc');
  assert.equal(await page.locator('.filter-open').getAttribute('aria-label'),'Filters, active'); await page.locator('.filter-open').click(); await page.locator('#filter-clear').click(); await page.locator('#filter-form button[type=submit]').click(); await page.waitForSelector('.card'); assert.doesNotMatch(page.url(),/cat=WORLD|updated=30d|sort=updated_asc/);
  await page.locator('.card-download').first().click(); await page.waitForSelector('.detail'); assert.match(page.url(),/addon.php\?uuid=/); await page.locator('.back').click(); await page.waitForSelector('.card');
  await page.goto(sharedUrl+'?i=1&uuid=00000000-0000-0000-0000-000000000000'); await page.waitForSelector('.actions a');
  assert.equal(await page.locator('.actions a').first().getAttribute('href'),'https://t.me/Mc_addonbot?start='+id);
  assert.equal((await page.goto(`${base}/missing-slug-not-a-uuid`)).status(),404);
  await page.goto(`${base}/faq.php`); await page.locator('summary').first().click(); assert.equal(await page.locator('details').first().evaluate(x=>x.open),true);
  await page.keyboard.press('Tab'); assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
  await page.goto(`http://127.0.0.1:${server.address().port}/addon.php?uuid=${id}`); await page.waitForSelector('.actions a');
  const primary=page.locator('.actions a').nth(0);
  assert.equal((await primary.innerText()).trim(),'Download'); assert.match(await primary.getAttribute('aria-label'),/in Telegram$/);
  assert.equal(await primary.getAttribute('href'),'https://t.me/Mc_addonbot?start='+id);
  assert.equal(await primary.getAttribute('target'),'_blank');
  assert.match(await primary.getAttribute('rel'),/noopener/);
  assert.equal(await page.locator('.actions a').nth(1).getAttribute('href'),'tg://resolve?domain=Mc_addonbot&start='+id);
  await page.context().route('https://t.me/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>Telegram test</title>'}));
  const popupPromise=page.waitForEvent('popup'); await primary.click(); const popup=await popupPromise;
  await popup.waitForLoadState(); assert.equal(popup.url(),'https://t.me/Mc_addonbot?start='+id); await popup.close();
  await page.locator('.telegram-help summary').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('.telegram-help').evaluate(e=>e.open),true); assert.equal(await page.locator('.telegram-help summary svg use').getAttribute('href'),'/assets/icons-v12.svg#expand_more'); assert.equal(await page.locator('.manual-command').innerText(),'/start '+id); assert.doesNotMatch(await page.locator('.telegram-help').innerText(),/and send this message to the bot/);
  await page.evaluate(()=>{window.copiedCommand='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.copiedCommand=t}}})}); await page.locator('.command-copy').click(); assert.equal(await page.evaluate(()=>window.copiedCommand),'/start '+id); assert.match(await page.locator('.command-status').innerText(),/Copied/);
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}})}); await page.locator('.command-copy').click(); assert.match(await page.locator('.command-status').innerText(),/Select and copy/); assert.equal(await page.evaluate(()=>window.getSelection().toString()),'/start '+id);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'detail overflow');
  console.log('Browser FAQ, keyboard focus and Telegram app, web and manual fallbacks passed (mock catalog).');
 } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
