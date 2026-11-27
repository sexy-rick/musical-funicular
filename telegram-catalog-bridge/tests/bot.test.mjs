import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const id='99eaa0fe-792a-4038-b588-e9ac2f02ce32';
const calls=[]; const messages=[];
let ok=true;
const row={uuid:id,title:'Test add-on',name:'test.mcaddon',items:[{name:'test.mcaddon',size:42,fileId:'SECRET_FILE_ID'}],updatedAt:100,category:'ADD-ON'};
const query={from(){return this},where(){return this},orderBy(){return this},limit(){return this},async all(){return [row]}};
const deps={
  sdk:{db:{select(){return query}},api:{async sendMessage(m){messages.push(m)}},async fetch(url,opts){calls.push({url,opts}); if(!ok) throw Error('offline');return {status:200}}},
  'sdk/db':{asc:(v)=>v,gt:(a,b)=>[a,b]},
  schema:{files:{uuid:'uuid'}},
  'lib/config':{CONFIG:{ADMIN_ID:1}},
  'lib/web_sync_private':{WEB_SYNC_URL:'https://catalog.owner.workers.dev',WEB_SYNC_SECRET:'a'.repeat(64)}
};
const source=await readFile(new URL('../bot/lib/web_sync.js',import.meta.url),'utf8');
const mod=new vm.SourceTextModule(source);
await mod.link(async spec=>{const d=deps[spec]; if(!d) throw Error(spec);return new vm.SyntheticModule(Object.keys(d), function(){for(const k of Object.keys(d))this.setExport(k,d[k])});});
await mod.evaluate();
assert.equal(await mod.namespace.syncWebsite(row),true);
const body=JSON.parse(calls[0].opts.body);
assert.equal(body.uuid,id); assert.equal(body.file_size,42); assert.equal(body.file_ext,'mcaddon');
assert.equal(JSON.stringify(body).includes('SECRET_FILE_ID'),false);
assert.equal(await mod.namespace.handleWebSync({text:'/websync',chat:{id:1,type:'private'},from:{id:2}}),false);
assert.equal(await mod.namespace.handleWebSync({text:'/websync',chat:{id:1,type:'private'},from:{id:1}}),true);
assert.match(messages.at(-1).text,/1 sent/);
ok=false; assert.equal(await mod.namespace.syncWebsite(row),false);
assert.equal(await mod.namespace.deleteWebsite(id),false);
console.log('Bot sync tests passed');
