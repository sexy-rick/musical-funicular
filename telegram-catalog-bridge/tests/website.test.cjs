// Run with jsdom installed outside the deployed site, e.g. NODE_PATH=/tmp/catalog-js-test/node_modules node .../website.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
const script = readFileSync(join(__dirname, '../website/assets/catalog.js'), 'utf8');
const id='99eaa0fe-792a-4038-b588-e9ac2f02ce32';
const item={uuid:id,title:'<img src=x onerror=evil()>',creator:'Maker',category:'ADD-ON',file_size:2048,thumbnail_url:'https://example.com/image.jpg'};
async function page(target, query, response) {
  const dom=new JSDOM('<!doctype html><html><head></head><body><span class="count"></span><div id="'+target+'"></div></body></html>',{url:'https://marketplacetrader.great-site.net/'+query,runScripts:'outside-only'});
  dom.window.fetch=typeof response === 'function' ? response : async()=>response;
  dom.window.eval(script); await new Promise(r=>setTimeout(r,20)); return dom;
}
const ok = data => ({ok:true,status:200,json:async()=>data});
(async()=>{
  const home=await page('catalog-results','index.php?cat=ADD-ON',ok({ok:true,total:25,items:[item]}));
  let doc=home.window.document;
  assert.equal(doc.querySelector('.count').textContent,'25 listed');
  assert.equal(doc.querySelector('.card h3').textContent,item.title);
  assert.equal(doc.querySelector('h3 img'),null);
  assert.equal(doc.querySelectorAll('.card a').length,1);
  assert.equal(doc.querySelector('.card img').loading,'eager');
  assert.match(doc.querySelector('.pagination a').href,/cat=ADD-ON/);
  doc.querySelector('.card img').dispatchEvent(new home.window.Event('error'));
  assert.ok(doc.querySelector('.card-image .block-icon'));
  const search=await page('search-results','search.php?q=chair',ok({ok:true,total:25,items:[item]}));
  assert.match(search.window.document.querySelector('.search-note').textContent,/first 24/);
  const detail=await page('addon-results','addon.php?uuid='+id,ok({ok:true,item:{...item,marketplace_url:'javascript:alert(1)'}}));
  doc=detail.window.document;
  assert.equal(doc.querySelector('h1').textContent,item.title);
  assert.equal(doc.querySelector('.actions a').href,'https://t.me/Mc_addonbot?start='+id);
  assert.equal([...doc.querySelectorAll('a')].some(a=>a.href.startsWith('javascript:')),false);
  const missing=await page('addon-results','addon.php?uuid='+id,{ok:false,status:404});
  assert.match(missing.window.document.body.textContent,/Add-on not found/);
  assert.equal(missing.window.document.querySelector('meta[name="robots"]').content,'noindex');
  const down=await page('addon-results','addon.php?uuid='+id,{ok:false,status:503});
  assert.match(down.window.document.body.textContent,/taking a break/);
  assert.equal(down.window.document.querySelector('meta[name="robots"]'),null);
  let calls=0;
  const retry=await page('catalog-results','index.php',async()=>++calls===1?{ok:false,status:429}:ok({ok:true,total:1,items:[item]}));
  assert.match(retry.window.document.body.textContent,/Too many requests/);
  retry.window.document.querySelector('button').click(); await new Promise(r=>setTimeout(r,20));
  assert.equal(retry.window.document.querySelectorAll('.card').length,1);
  assert.equal(retry.window.document.querySelector('#catalog-results').getAttribute('aria-busy'),'false');
  console.log('Website client tests passed: listing, XSS, fallback, pagination, search, detail, missing, outage and retry');
})().catch(error=>{console.error(error);process.exitCode=1});
