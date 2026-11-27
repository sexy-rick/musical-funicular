// Create one NEW D1 database for this repository. Never print credentials.
const fs = require('node:fs');
const account = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const token = process.env.CLOUDFLARE_API_TOKEN || '';
const repoId = process.env.REPOSITORY_ID || '';
if (!/^[0-9a-f]{32}$/i.test(account) || !token || !/^\d+$/.test(repoId)) throw new Error('Missing account setting or deployment secret.');
const name = `mc-catalog-${repoId}`;
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database`;
async function request(url, method, data) {
  const result = await fetch(url, { method, headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}, ...(data ? {body: JSON.stringify(data)} : {}) });
  let json; try { json = await result.json(); } catch (_) { throw new Error(`Cloudflare returned HTTP ${result.status}.`); }
  if (!result.ok || !json.success) throw new Error(`Cloudflare returned HTTP ${result.status}; D1 access or creation failed.`);
  return json;
}
(async () => {
  const list = await request(`${base}?name=${encodeURIComponent(name)}&per_page=100`, 'GET');
  if ((list.result || []).some(db => db.name === name)) throw new Error(`A database named ${name} already exists. Stopping without modifying it.`);
  const created = await request(base, 'POST', {name});
  const id = created.result && created.result.uuid;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) throw new Error('Database created, but ID was not returned. Check the Cloudflare dashboard.');
  console.log(`Created D1 database ${name} (${id}).`);
  const sql = fs.readFileSync('telegram-catalog-bridge/cloudflare/schema.sql', 'utf8');
  try {
    const initialized = await request(`${base}/${id}/query`, 'POST', {sql});
    if (!Array.isArray(initialized.result) || initialized.result.some(item => item.success === false)) throw new Error('Schema initialization was not confirmed.');
    console.log('Catalog table initialized. Worker binding must be added separately.');
  } catch (error) { console.error('Database exists but initialization failed. Its ID is shown above.'); throw error; }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
