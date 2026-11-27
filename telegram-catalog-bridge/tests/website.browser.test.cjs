// Development only: NODE_PATH=<directory containing playwright-core and @sparticuz/chromium> node this-file
// Requires @php-wasm/cli available through npx; serves rendered PHP fixtures locally and mocks the catalog.
const { execFileSync }=require('node:child_process');
const http=require('node:http'); const { readFileSync }=require('node:fs'); const { join }=require('node:path');
const assert=require('node:assert/strict'); const { chromium }=require('playwright-core'); const chrome=require('@sparticuz/chromium').default;
const root=join(__dirname,'../website');
const render=file=>execFileSync('npx',['--yes','@php-wasm/cli',join(root,file)],{encoding:'utf8'});
const html={ '/index.php':render('index.php'), '/faq.php':render('faq.php'), '/addon.php':render('addon.php'), '/search.php':render('search.php'), '/about.php':render('about.php') };
html['/errors/404.html']=readFileSync(join(root,'errors/404.html'),'utf8'); html['/']=html['/index.php']; html['/home']=html['/index.php'];
// Mimic the intended Apache rewrite for browser interaction tests; this is not an Apache test.
const prettyRoute=/^\/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id='99eaa0fe-792a-4038-b588-e9ac2f02ce32';
const item={uuid:id,title:'A very long add-on name '.repeat(5),creator:'Maker',category:'ADD-ON',thumbnail_url:'https://example.com/image.jpg'};
// Simulate a returning visitor whose browser holds the old, unversioned assets.
const oldCss=execFileSync('git',['show','e4d3499:telegram-catalog-bridge/website/assets/style.css']);
const oldJs=execFileSync('git',['show','e4d3499:telegram-catalog-bridge/website/assets/catalog.js']);
const server=http.createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname; if(html[path] || prettyRoute.test(path)){res.setHeader('Content-Type','text/html');res.end(html[path] || html['/addon.php']);return;} if(path==='/assets/style.css'||path==='/assets/catalog.js'){res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'application/javascript');res.end(path.endsWith('.css')?oldCss:oldJs);return;} if(['/assets/site-v8.css','/assets/catalog-v8.js','/assets/search-v7.js','/assets/theme-v8.js','/assets/icons-v6.svg','/assets/brand-logo-v8.jpg'].includes(path)){res.setHeader('Content-Type',path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.jpg')?'image/jpeg':'application/javascript');res.end(readFileSync(join(root,path)));return;}res.statusCode=404;res.end();});
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
   assert.equal(await page.locator('.card .share-button').count(),8);
   if(process.env.CATALOG_SCREENSHOTS && (width===375 || width===1440)) await page.screenshot({path:`/tmp/catalog-${width}.png`,fullPage:true});
   console.log(`${width}px: ${result.columns} columns, no overflow, reduced motion`);
  }
  await page.setViewportSize({width:375,height:800});
  const base=`http://127.0.0.1:${server.address().port}`;
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
  const ordering=[]; const record=response=>{if(response.url().includes('workers.dev/addons?q=early')) ordering.push('search'); if(response.url().endsWith('/assets/catalog-v8.js')) ordering.push('script');}; page.on('response',record);
  await page.route('**/assets/catalog-v8.js',async route=>{await new Promise(resolve=>setTimeout(resolve,600)); await route.fulfill({path:join(root,'assets/catalog-v8.js'),contentType:'application/javascript'});});
  await page.goto(`${base}/search.php?q=early`); await page.waitForSelector('.card'); assert.ok(ordering.indexOf('search')>=0 && ordering.indexOf('search')<ordering.indexOf('script'), 'search starts while the client script loads');
  await page.unroute('**/assets/catalog-v8.js'); page.off('response',record);
  await page.goto(`${base}/addon.php?uuid=${id}`); await page.waitForSelector('.detail'); assert.equal(await page.locator('.back').getAttribute('href'),'/index.php#catalog');
  assert.equal((await page.goto(`${base}/home?i=1`)).status(),200); await page.waitForSelector('.card');
  assert.equal(await page.locator('.brand img').getAttribute('src'),'/assets/brand-logo-v8.jpg'); assert.equal(await page.locator('link[rel="manifest"]').count(),1);
  await page.setViewportSize({width:1440,height:800}); assert.equal(await page.locator('.hero-explore').isVisible(),true); assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()),'#c88828'); await page.setViewportSize({width:375,height:800});

  await page.evaluate(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});});
  await page.locator('.card .share-button').first().click();
  const sharedUrl=await page.locator('.card .share-url').first().inputValue();
  assert.match(sharedUrl,new RegExp('^http://127\\.0\\.0\\.1:[0-9]+/[a-z0-9-]+-'+id+'$'));
  assert.equal(await page.locator('.card .share-fallback').first().isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'share fallback overflow');
  await page.selectOption('#theme-choice','light'); assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.reload(); assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.selectOption('#theme-choice','dark'); assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.goto(`${base}/errors/404.html`); assert.equal(await page.locator('html').getAttribute('data-theme'),'dark'); await page.selectOption('#theme-choice','light'); assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.goto(`${base}/home`); await page.waitForSelector('.card'); await page.selectOption('#theme-choice','auto');
  assert.equal(await page.locator('a[href="https://t.me/Minecraft_addon_free_download"]').count(),2);
  assert.equal(await page.locator('a[href="https://t.me/minecraft_group_chat_friends"]').count(),1); assert.equal(await page.locator('a[href="https://t.me/alchemisst"]').count(),1);

  await page.unroute('https://example.com/**');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X3ioAAAAASUVORK5CYII=','base64');
  await page.route('https://example.com/**',route=>route.fulfill({status:200,headers:{'content-type':'image/png','access-control-allow-origin':'*'},body:png}));
  await page.addInitScript(()=>{window.sharedData=null; Object.defineProperty(navigator,'canShare',{value:d=>!!d.files,configurable:true}); Object.defineProperty(navigator,'share',{value:async d=>{window.sharedData={url:d.url,files:d.files&&d.files.map(f=>({name:f.name,type:f.type,size:f.size}))};},configurable:true});});
  await page.reload(); await page.waitForSelector('.card'); await page.locator('.card .share-button').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); await page.locator('.card .share-button').first().click();
  if(!(await page.evaluate(()=>window.sharedData))) {await page.waitForTimeout(500); await page.locator('.card .share-button').first().click();}
  const share=await page.evaluate(()=>window.sharedData); assert.equal(share.url,sharedUrl); assert.equal(share.files[0].type,'image/png'); assert.equal(share.files[0].size,png.length);
  // A blocked thumbnail fetch falls back to link-only sharing.
  await page.unroute('https://example.com/**'); item.thumbnail_url='https://example.com/blocked.png'; await page.route('https://example.com/**',route=>route.abort('failed'));
  await page.reload(); await page.waitForSelector('.card'); await page.locator('.card .share-button').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  await page.locator('.card .share-button').first().click(); if(!(await page.evaluate(()=>window.sharedData))) {await page.waitForTimeout(500); await page.locator('.card .share-button').first().click();}
  assert.equal((await page.evaluate(()=>window.sharedData)).files,undefined); assert.match(await page.locator('.card .share-status').first().textContent(),/link only/);
  // Search is debounced and suggests actual catalog titles, not third-party searches.
  const before=listRequests; await page.locator('#search').fill('lo'); await page.waitForTimeout(200); await page.locator('#search').fill('long'); await page.waitForTimeout(300); assert.equal(listRequests,before);
  await page.locator('#search-suggestions li').first().waitFor(); assert.equal(listRequests,before+1); assert.match(await page.locator('#search-suggestions li').first().textContent(),/long/);
  await page.locator('#search').press('ArrowDown'); assert.equal(await page.locator('#search-suggestions li').first().getAttribute('aria-selected'),'true'); await page.locator('#search').press('Escape'); assert.equal(await page.locator('#search-suggestions').isVisible(),false);
  await page.locator('.card-download').first().click(); await page.waitForSelector('.detail'); assert.match(page.url(),/addon.php\?uuid=/); await page.locator('.back').click(); await page.waitForSelector('.card');
  await page.goto(sharedUrl+'?i=1&uuid=00000000-0000-0000-0000-000000000000'); await page.waitForSelector('.actions a');
  assert.equal(await page.locator('.actions a').first().getAttribute('href'),'https://t.me/Mc_addonbot?start='+id);
  assert.equal((await page.goto(`${base}/missing-slug-not-a-uuid`)).status(),404);
  await page.goto(`${base}/faq.php`); await page.locator('summary').first().click(); assert.equal(await page.locator('details').first().evaluate(x=>x.open),true);
  await page.keyboard.press('Tab'); assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
  await page.goto(`http://127.0.0.1:${server.address().port}/addon.php?uuid=${id}`); await page.waitForSelector('.actions a');
  const primary=page.locator('.actions a').nth(0);
  assert.equal(await primary.getAttribute('href'),'https://t.me/Mc_addonbot?start='+id);
  assert.equal(await primary.getAttribute('target'),'_blank');
  assert.match(await primary.getAttribute('rel'),/noopener/);
  assert.equal(await page.locator('.actions a').nth(1).getAttribute('href'),'tg://resolve?domain=Mc_addonbot&start='+id);
  await page.context().route('https://t.me/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>Telegram test</title>'}));
  const popupPromise=page.waitForEvent('popup'); await primary.click(); const popup=await popupPromise;
  await popup.waitForLoadState(); assert.equal(popup.url(),'https://t.me/Mc_addonbot?start='+id); await popup.close();
  await page.locator('.telegram-help summary').click(); assert.equal(await page.locator('.manual-command').innerText(),'/start '+id);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'detail overflow');
  console.log('Browser FAQ, keyboard focus and Telegram app, web and manual fallbacks passed (mock catalog).');
 } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
