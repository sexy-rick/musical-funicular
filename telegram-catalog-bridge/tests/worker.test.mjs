import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
const code = await readFile(new URL('../cloudflare/worker.js', import.meta.url), 'utf8');
const { default: worker } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const db = new DatabaseSync(':memory:');
db.exec(await readFile(new URL('../cloudflare/schema.sql', import.meta.url), 'utf8'));
const env = {SYNC_SECRET:'a'.repeat(64), CATALOG:{prepare(sql){return {bind(...params){const s=db.prepare(sql);return {async first(){return s.get(...params) || null},async all(){return {results:s.all(...params)}},async run(){return s.run(...params)}}}}}}};
async function req(path, opts={}) { const res = await worker.fetch(new Request('https://example.workers.dev'+path,opts),env); return [res.status, await res.json()]; }
const uuid='99eaa0fe-792a-4038-b588-e9ac2f02ce32';
const payload={action:'upsert',uuid,title:'Test pack',creator:'Player',category:'ADD-ON',file_size:1024,updated_at:100};
function post(body, token=env.SYNC_SECRET) {return req('/sync',{method:'POST',headers:{'x-sync-token':token,'content-type':'application/json'},body:JSON.stringify(body)});}
const syncHeaders={'x-sync-token':env.SYNC_SECRET,'content-type':'application/json'};
assert.equal((await req('/sync',{method:'POST',headers:{'x-sync-token':env.SYNC_SECRET},body:'{}'}))[0],415);
assert.equal((await req('/sync',{method:'POST',headers:syncHeaders,body:'x'.repeat(32769)}))[0],413);
assert.equal((await req('/sync',{method:'POST',headers:syncHeaders,body:'é'.repeat(16385)}))[0],413);
assert.equal((await req('/sync',{method:'POST',headers:{...syncHeaders,'content-length':'1'},body:'x'.repeat(32769)}))[0],413);
assert.equal((await req('/sync',{method:'POST',headers:syncHeaders,body:'not json'}))[0],400);
assert.equal((await req('/health'))[0],200);
assert.equal((await post(payload,'wrong'))[0],401);
assert.equal((await post(payload))[0],200);
assert.equal((await req('/addons'))[1].total,1);
assert.equal((await req('/addons?q=Player'))[1].items[0].uuid,uuid);
assert.equal((await req('/addons?cat=WORLD'))[1].total,0);
assert.equal((await req('/addons/'+uuid))[1].item.title,'Test pack');
assert.equal((await post({action:'delete',uuid,updated_at:101}))[0],200);
assert.equal((await req('/addons/'+uuid))[0],404);
await post(payload); assert.equal((await req('/addons'))[1].total,0); // older backfill cannot restore deleted record
await post({...payload,updated_at:102,title:'New version'}); assert.equal((await req('/addons'))[1].items[0].title,'New version');
assert.equal((await post({...payload,uuid:'not-valid'}))[0],400);
assert.equal((await post({...payload,updated_at:0}))[0],400);
assert.equal((await req('/addons?cat=OTHER'))[0],400);
// Filters apply before pagination, without changing the old endpoint or exposing secrets.
const now=Math.floor(Date.now()/1000);
for(let i=0;i<30;i++) {const id=`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`; await post({...payload,uuid:id,creator:'Same Studio',category:i<25?'WORLD':'ADD-ON',title:`Studio pack ${i}`,updated_at:now-3600});}
await post({...payload,uuid:'11111111-1111-4111-8111-111111111111',creator:'Same Studio extra',category:'WORLD',title:'Other studio',updated_at:now-3600});
await post({...payload,uuid:'22222222-2222-4222-8222-222222222222',creator:'Same Studio',category:'WORLD',title:'Old pack',updated_at:1});
let filtered=await req('/addons?creator=Same%20Studio&cat=WORLD&updated=7d&page=1'); assert.equal(filtered[1].total,25); assert.equal(filtered[1].items.length,24);
filtered=await req('/addons?creator=same%20studio&cat=WORLD&updated=7d&page=2'); assert.equal(filtered[1].items.length,1);
filtered=await req('/addons?creator=Same%20Studio&q=Studio%20pack%202&cat=WORLD&updated=30d'); assert.equal(filtered[1].total,6);
assert.equal((await req('/addons?creator=Same%20Studio&updated=bad'))[0],400); assert.equal((await req('/addons?creator='+('a'.repeat(256))))[0],400);
assert.equal((await req('/addons?creator=%25'))[1].total,0);
const headers=await worker.fetch(new Request('https://example.workers.dev/addons?creator=Same%20Studio'),env); assert.equal(headers.headers.get('cache-control'),'no-store'); assert.equal(headers.headers.get('access-control-allow-origin'),'https://marketplacetrader.great-site.net');
console.log('Worker tests passed');
