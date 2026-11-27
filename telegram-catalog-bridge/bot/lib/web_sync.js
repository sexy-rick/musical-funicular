// Optional catalog sync. Private config lives ONLY in BotFather library web_sync_private.
import { db, api, fetch } from 'sdk';
import { asc, gt } from 'sdk/db';
import { files } from 'schema';
import { CONFIG } from 'lib/config';
import { WEB_SYNC_URL, WEB_SYNC_SECRET } from 'lib/web_sync_private';

const VALID_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function metadata(row) {
  const item = Array.isArray(row.items) && row.items[0] && typeof row.items[0] === 'object' ? row.items[0] : {};
  const name = String(row.name || item.name || '');
  const ext = /\.([a-z0-9]{1,16})$/i.exec(name);
  return { action: 'upsert', uuid: row.uuid, title: String(row.title || row.name || 'Untitled'), creator: row.creator || '', category: row.category || '', version: row.version || '', thumbnail_url: row.thumbnailUrl || '', marketplace_url: row.marketplaceUrl || '', file_size: Number(item.size) || 0, file_ext: ext ? ext[1].toLowerCase() : '', updated_at: Number(row.updatedAt) || 1 };
}
async function send(body) {
  if (!VALID_ID.test(body.uuid || '')) return false;
  if (!/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/i.test(WEB_SYNC_URL) || !/^[a-f0-9]{64}$/.test(WEB_SYNC_SECRET)) return false;
  try {
    const result = await fetch(WEB_SYNC_URL + '/sync', { method:'POST', headers:{'content-type':'application/json','x-sync-token': WEB_SYNC_SECRET}, body: JSON.stringify(body) });
    return result.status >= 200 && result.status < 300;
  } catch (_) { return false; }
}
export async function syncWebsite(row) { try { return await send(metadata(row)); } catch (_) { return false; } }
export async function deleteWebsite(uuid) { try { return await send({ action:'delete', uuid, updated_at:Math.floor(Date.now()/1000) }); } catch (_) { return false; } }
// Owner-only, bounded pages. Run /websync then follow the displayed command.
export async function handleWebSync(message) {
  const text = String(message.text || '').trim();
  const match = /^\/websync(?:@\w+)?(?:\s+([A-Za-z0-9_-]{1,64}))?$/i.exec(text);
  if (!match || !message.from || message.from.id !== CONFIG.ADMIN_ID || message.chat.type !== 'private') return false;
  const cursor = match[1] || '';
  if (cursor && !/^[A-Za-z0-9_-]{1,64}$/.test(cursor)) { await api.sendMessage({chat_id:message.chat.id,text:'Invalid cursor.'}); return true; }
  const query = db.select().from(files);
  const rows = await (cursor ? query.where(gt(files.uuid, cursor)) : query).orderBy(asc(files.uuid)).limit(20).all();
  let synced = 0, skipped = 0, failed = 0;
  for (const row of rows) {
    if (!VALID_ID.test(row.uuid || '')) { skipped++; continue; }
    if (await syncWebsite(row)) synced++; else failed++;
  }
  let report = `Website sync batch: ${synced} sent, ${skipped} unsupported, ${failed} failed.`;
  if (failed) report += '\nSome failed: check the bridge and rerun this same command.';
  else if (rows.length === 20) report += '\nNext batch: /websync ' + rows[rows.length-1].uuid;
  else report += '\nFinished.';
  await api.sendMessage({chat_id:message.chat.id,text:report});
  return true;
}
