// Development only: NODE_PATH=<directory containing playwright-core and @sparticuz/chromium> node this-file
// Requires @php-wasm/cli available through npx; serves rendered PHP fixtures locally and mocks the catalog.
const { execFileSync }=require('node:child_process');
const http=require('node:http'); const { readFileSync }=require('node:fs'); const { join }=require('node:path');
const assert=require('node:assert/strict'); const { chromium }=require('playwright-core'); const chrome=require('@sparticuz/chromium').default;
const root=join(__dirname,'../website');
const render=file=>execFileSync('npx',['--yes','@php-wasm/cli',join(root,file)],{encoding:'utf8'});
const html={ '/index.php':render('index.php'), '/faq.php':render('faq.php'), '/addon.php':render('addon.php') };
const id='99eaa0fe-792a-4038-b588-e9ac2f02ce32';
const item={uuid:id,title:'A very long add-on name '.repeat(5),creator:'Maker',category:'ADD-ON',thumbnail_url:'https://example.com/image.jpg'};
const server=http.createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname; if(html[path]){res.setHeader('Content-Type','text/html');res.end(html[path]);return;} if(path==='/assets/style.css'||path==='/assets/catalog.js'){res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'application/javascript');res.end(readFileSync(join(root,path)));return;}res.statusCode=404;res.end();});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:await chrome.executablePath(),args:chrome.args,headless:true});
 try {
  const page=await browser.newPage({viewport:{width:320,height:800},reducedMotion:'reduce'});
  await page.route('https://mc-catalog-1474006216.aman-nsipai.workers.dev/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,total:8,items:Array(8).fill(item),item})}));
  await page.route('https://example.com/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#526c51"/></svg>'}));
  for(const [width,cols] of [[320,1],[375,1],[599,1],[600,2],[768,2],[900,3],[1024,4],[1440,4]]){
   await page.setViewportSize({width,height:800}); await page.goto(`http://127.0.0.1:${server.address().port}/index.php`); await page.waitForSelector('.card');
   const result=await page.evaluate(()=>{const cards=[...document.querySelectorAll('.card')]; const firstTop=cards[0].getBoundingClientRect().top; return {columns:cards.filter(c=>Math.abs(c.getBoundingClientRect().top-firstTop)<1).length,overflow:document.documentElement.scrollWidth>innerWidth, reduced:getComputedStyle(document.querySelector('.card img')).transitionDuration,loads:cards.map(c=>c.querySelector('img').loading)};});
   if(result.overflow) console.log('Overflow elements:', await page.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.className,Math.round(e.getBoundingClientRect().right)]).slice(0,20)));
   assert.equal(result.columns,cols,`columns at ${width}`); assert.equal(result.overflow,false,`horizontal overflow at ${width}`); assert.equal(result.reduced,'0s',`reduced motion at ${width}`); assert.ok(result.loads.slice(0,cols).every(x=>x==='eager')); assert.equal(result.loads[cols],'lazy');
   if(process.env.CATALOG_SCREENSHOTS && (width===375 || width===1440)) await page.screenshot({path:`/tmp/catalog-${width}.png`,fullPage:true});
   console.log(`${width}px: ${result.columns} columns, no overflow, reduced motion`);
  }
  await page.setViewportSize({width:375,height:800}); await page.goto(`http://127.0.0.1:${server.address().port}/faq.php`); await page.locator('summary').first().click(); assert.equal(await page.locator('details').first().evaluate(x=>x.open),true);
  await page.keyboard.press('Tab'); assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
  await page.goto(`http://127.0.0.1:${server.address().port}/addon.php?uuid=${id}`); await page.waitForSelector('.actions a'); assert.equal(await page.locator('.actions a').getAttribute('href'),'https://t.me/Mc_addonbot?start='+id);
  console.log('Browser FAQ disclosure, keyboard focus and Telegram link passed (mock catalog).');
 } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
