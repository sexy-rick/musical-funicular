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
function post(body, token=env.SYNC_SECRET) {return req('/sync',{method:'POST',headers:{'x-sync-token':token},body:JSON.stringify(body)});}
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
console.log('Worker tests passed');
