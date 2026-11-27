const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'); const {join}=require('node:path'); const {JSDOM}=require('jsdom');
const version=process.env.CATALOG_VERSION||'v13';
const script=readFileSync(join(__dirname,`../website/assets/catalog-${version}.js`),'utf8');
const url='https://t.me/MARKETPLACE_TRADER_HELPER_BOT?start=suggest';
const item={uuid:'99eaa0fe-792a-4038-b588-e9ac2f02ce32',title:'Pack',category:'WORLD'};
async function run(path,first){const w=new JSDOM('<div id="search-results"></div>',{url:'https://marketplacetrader.great-site.net'+path,runScripts:'outside-only'}).window;let n=0;w.fetch=async()=>{n++;if(first==='error')throw Error('offline');return {ok:true,json:async()=>n===1?first:{ok:true,total:1,items:[item]}};};w.eval(script);await new Promise(r=>setTimeout(r,80));return w;}
(async()=>{
 let w=await run('/search.php?q=gibberish',{ok:true,total:0,items:[]});let a=w.document.querySelector('.request-telegram');assert.ok(a,'request button on search no results');assert.equal(a.href,url);assert.match(a.textContent,/request.*telegram/i);assert.match(w.document.body.textContent,/You might like this/);assert.equal(w.document.querySelectorAll('.card').length,1);w.close();
 w=await run('/search.php?q=foo&cat=WORLD',{ok:true,total:0,items:[]});assert.ok(w.document.querySelector('.request-telegram'));w.close();
 w=await run('/search.php?q=found',{ok:true,total:1,items:[item]});assert.equal(w.document.querySelector('.request-telegram'),null);w.close();
 w=await run('/search.php?q=foo&page=9',{ok:true,total:1,items:[]});assert.equal(w.document.querySelector('.request-telegram'),null);w.close();
 w=await run('/search.php?q=foo','error');assert.equal(w.document.querySelector('.request-telegram'),null);w.close();
 w=await run('/search.php',{ok:true,total:0,items:[]});assert.equal(w.document.querySelector('.request-telegram'),null);w.close();
 w=await run('/search.php?cat=WORLD',{ok:true,total:0,items:[]});assert.equal(w.document.querySelector('.request-telegram'),null);w.close();
 console.log('v13 no-result Telegram request link and state checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
