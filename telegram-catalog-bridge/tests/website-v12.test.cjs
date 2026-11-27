const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'); const {join}=require('node:path'); const {JSDOM}=require('jsdom');
const version=process.env.CATALOG_VERSION||'v12';
const script=readFileSync(join(__dirname,`../website/assets/catalog-${version}.js`),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,30));
const id='b22533a2-2d11-44eb-a2fd-38a6dd6a9c2c';
const item={uuid:id,title:'Test',creator:'Maker',category:'WORLD'};
async function make(target,setup=()=>{},record=item) {const w=new JSDOM(`<div id="${target}"></div>`,{url:`https://marketplacetrader.great-site.net/${target==='addon-results'?'addon.php?uuid='+record.uuid:'index.php'}`,runScripts:'outside-only'}).window;w.fetch=async()=>({ok:true,json:async()=>({ok:true,total:1,items:[record],item:record})});setup(w);w.eval(script);await wait();return w;}
(async()=>{
 const w=await make('catalog-results'); const doc=w.document;const row=doc.querySelector('.card-actions');const category=row.querySelector('.card-category');assert.ok(category,'category in card action row');assert.equal(category.getAttribute('href'),'/index.php?cat=WORLD#catalog');assert.equal(row.querySelector('a button'),null);assert.ok(row.querySelector('.share-button'));assert.ok(row.querySelector('.card-download'));w.close();
 let copied='';const d=await make('addon-results',w=>Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{copied=t}}}));const dd=d.document;assert.ok(dd.querySelector('.telegram-help summary svg'));assert.doesNotMatch(dd.querySelector('.telegram-help').textContent,/and send this message to the bot/);dd.querySelector('.command-copy').click();await wait();assert.equal(copied,'/start '+id);assert.match(dd.querySelector('.command-status').textContent,/copied/i);d.close();
 let secondCopy='';const secondId='99eaa0fe-792a-4038-b588-e9ac2f02ce32'; const second=await make('addon-results',w=>Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{secondCopy=t}}}),{...item,uuid:secondId});second.document.querySelector('.command-copy').click();await wait();assert.equal(secondCopy,'/start '+secondId);second.close();
 const fail=await make('addon-results',w=>Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied')}}}));fail.document.querySelector('.command-copy').click();await wait();assert.match(fail.document.querySelector('.command-status').textContent,/select and copy/i);assert.equal(fail.getSelection().toString(),'/start '+id);fail.close();
 const unavailable=await make('addon-results');unavailable.document.querySelector('.command-copy').click();await wait();assert.match(unavailable.document.querySelector('.command-status').textContent,/select and copy/i);unavailable.close();
 console.log('v12 card action row and Telegram command copy/fallback passed');
})().catch(e=>{console.error(e);process.exitCode=1});
