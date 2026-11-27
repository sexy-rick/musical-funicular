// Runs on the GitHub runner. All values are repository variables, not secrets.
const fs = require('node:fs');
const path = require('node:path');
const account = process.env.ACCOUNT_ID || '';
const d1 = process.env.D1_ID || '';
const name = process.env.WORKER_NAME || '';
if (!/^[a-f0-9]{32}$/i.test(account)) throw new Error('Set CLOUDFLARE_ACCOUNT_ID to the 32-character Cloudflare account ID.');
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d1)) throw new Error('Set CLOUDFLARE_D1_DATABASE_ID to the ID of your NEW D1 database.');
if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(name)) throw new Error('Set CLOUDFLARE_CATALOG_WORKER_NAME to the name of a NEW Worker (lowercase letters, digits and hyphens).');
if (!process.env.RUNNER_TEMP || !process.env.GITHUB_WORKSPACE) throw new Error('This script requires a GitHub Actions runner.');
const config = {
  name,
  main: path.join(process.env.GITHUB_WORKSPACE, 'telegram-catalog-bridge/cloudflare/worker.js'),
  account_id: account,
  compatibility_date: '2026-01-01',
  workers_dev: true,
  d1_databases: [{binding: 'CATALOG', database_name: 'catalog', database_id: d1}]
};
fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'catalog-wrangler.json'), JSON.stringify(config, null, 2));
console.log('Configuration validated. The workflow does not create a database or apply SQL.');
