// Prepare an update to the EXISTING dedicated catalog Worker only.
// Reject unexpected bindings to avoid silently replacing unrelated resources.
const fs = require('node:fs'); const path = require('node:path');
const account=process.env.CLOUDFLARE_ACCOUNT_ID || '', token=process.env.CLOUDFLARE_API_TOKEN || '', repo=process.env.REPOSITORY_ID || '';
if (!/^[0-9a-f]{32}$/i.test(account) || !token || !/^\d+$/.test(repo) || !process.env.RUNNER_TEMP || !process.env.GITHUB_WORKSPACE) throw new Error('Missing deployment configuration.');
const name=`mc-catalog-${repo}`, root=`https://api.cloudflare.com/client/v4/accounts/${account}`;
async function get(url) { const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}}); const data=await r.json(); if (!r.ok || !data.success) throw new Error(`Cloudflare settings lookup failed (HTTP ${r.status}).`); return data.result; }
(async()=>{
  const databases=await get(`${root}/d1/database?name=${encodeURIComponent(name)}&per_page=100`);
  const matches=Array.isArray(databases) ? databases.filter(x=>x.name===name) : [];
  if (matches.length!==1 || !/^[0-9a-f-]{36}$/i.test(matches[0].uuid || '')) throw new Error('Expected catalog database not found uniquely.');
  const settings=await get(`${root}/workers/scripts/${name}/settings`);
  if (!settings || !Array.isArray(settings.bindings)) throw new Error('Unable to verify existing Worker bindings.');
  const names=settings.bindings.map(binding=>binding.name);
  if (!names.includes('CATALOG') || !names.includes('SYNC_SECRET') || names.some(n=>!['CATALOG','SYNC_SECRET'].includes(n))) throw new Error('Unexpected Worker bindings. Refusing to redeploy.');
  const config={name,account_id:account,main:path.join(process.env.GITHUB_WORKSPACE,'telegram-catalog-bridge/cloudflare/worker.js'),compatibility_date:'2026-01-01',workers_dev:true,keep_vars:true,d1_databases:[{binding:'CATALOG',database_name:name,database_id:matches[0].uuid}]};
  fs.writeFileSync(path.join(process.env.RUNNER_TEMP,'catalog-cors-wrangler.json'),JSON.stringify(config,null,2));
  console.log('Existing catalog binding and secret confirmed; config ready.');
})().catch(error=>{console.error(error.message);process.exitCode=1});
