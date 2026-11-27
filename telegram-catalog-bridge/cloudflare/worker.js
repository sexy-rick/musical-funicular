// Bind D1 as CATALOG and add SYNC_SECRET as a secret (see GUIDE.md).
// This bridge stores public catalog metadata only, NEVER Telegram file IDs or tokens.
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categories = new Set(['ADD-ON','TEXTURE PACK','SKIN PACK','WORLD','MASHUP PACK','TEMPLATE','APPLICATION']);
function response(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'access-control-allow-origin': 'https://marketplacetrader.great-site.net' } });
}
function authorised(req, secret) {
  if (typeof secret !== 'string' || secret.length < 32 || secret === 'CHANGE_ME_RANDOM_32_CHARS') return false;
  const supplied = req.headers.get('x-sync-token') || '';
  if (supplied.length !== secret.length) return false;
  let difference = 0;
  for (let i = 0; i < secret.length; i++) difference |= supplied.charCodeAt(i) ^ secret.charCodeAt(i);
  return difference === 0;
}
// Enforce a byte limit while reading, even without a trustworthy Content-Length.
async function readBounded(request, limit) {
  if (!request.body) return { value: '' };
  const reader = request.body.getReader(); const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { void reader.cancel().catch(() => {}); return { tooLarge: true }; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return { value: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }; }
  catch (_) { return { invalid: true }; }
}
function text(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function https(v) {
  try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password ? u.href.slice(0, 512) : ''; } catch { return ''; }
}
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/health') return response({ok: true, service: 'catalog-bridge'});
      if (request.method === 'GET' && url.pathname === '/addons') {
        const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
        const cat = url.searchParams.get('cat') || '';
        const creator=(url.searchParams.get('creator') || '').trim();
        const updated=url.searchParams.get('updated') || '';
        const sort=url.searchParams.get('sort') || 'updated_desc';
        if (!['updated_desc','updated_asc','relevance'].includes(sort)) return response({error:'Invalid sort'},400);
        const ranges={'7d':7,'30d':30,'1y':365};
        if (creator.length>255 || (updated && !Object.hasOwn(ranges,updated))) return response({error:'Invalid filter'},400);
        if (cat && !categories.has(cat)) return response({error: 'Invalid category'}, 400);
        const page = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1));
        const where = ['deleted = 0']; const args = [];
        if (cat) { where.push('category = ?'); args.push(cat); }
        if (creator) { where.push('creator = ? COLLATE NOCASE'); args.push(creator); }
        if (updated) { where.push('updated_at >= ?'); args.push(Math.floor(Date.now()/1000)-ranges[updated]*86400); }
        const escaped=q.replace(/[\\%_]/g, '\\$&');
        if (q) { where.push("(title LIKE ? ESCAPE '\\' OR creator LIKE ? ESCAPE '\\')"); args.push('%' + escaped + '%', '%' + escaped + '%'); }
        const clause = where.join(' AND ');
        const totalRow = await env.CATALOG.prepare('SELECT COUNT(*) AS total FROM addons WHERE ' + clause).bind(...args).first();
        let order=sort==='updated_asc' ? 'updated_at ASC, uuid ASC' : 'updated_at DESC, uuid ASC'; const orderArgs=[];
        if (sort==='relevance' && q) {
          order="CASE WHEN title = ? COLLATE NOCASE THEN 0 WHEN title LIKE ? ESCAPE '\\' THEN 1 WHEN title LIKE ? ESCAPE '\\' THEN 2 WHEN creator = ? COLLATE NOCASE THEN 3 WHEN creator LIKE ? ESCAPE '\\' THEN 4 ELSE 5 END, updated_at DESC, uuid ASC";
          orderArgs.push(q,escaped+'%','%'+escaped+'%',q,escaped+'%');
        }
        const result = await env.CATALOG.prepare('SELECT uuid,title,creator,category,version,thumbnail_url,marketplace_url,file_size,file_ext,updated_at FROM addons WHERE ' + clause + ' ORDER BY ' + order + ' LIMIT 24 OFFSET ?').bind(...args, ...orderArgs, (page - 1) * 24).all();
        return response({ok: true, items: result.results, total: totalRow.total, page});
      }
      const match = /^\/addons\/([0-9a-f-]+)$/i.exec(url.pathname);
      if (request.method === 'GET' && match && ID.test(match[1])) {
        const item = await env.CATALOG.prepare('SELECT uuid,title,creator,category,version,thumbnail_url,marketplace_url,file_size,file_ext,updated_at FROM addons WHERE uuid = ? AND deleted = 0').bind(match[1].toLowerCase()).first();
        return item ? response({ok: true, item}) : response({error: 'Not found'}, 404);
      }
      if (url.pathname === '/sync' && request.method === 'POST') {
        if (!authorised(request, env.SYNC_SECRET)) return response({error: 'Unauthorized'}, 401);
        if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('content-type') || '')) return response({error: 'Expected JSON'}, 415);
        if (Number(request.headers.get('content-length') || 0) > 32768) return response({error: 'Too large'}, 413);
        const raw = await readBounded(request, 32768);
        if (raw.tooLarge) return response({error: 'Too large'}, 413);
        if (raw.invalid) return response({error: 'Invalid JSON'}, 400);
        let body; try { body = JSON.parse(raw.value); } catch { return response({error: 'Invalid JSON'}, 400); }
        if (!body || !ID.test(body.uuid || '') || !['upsert', 'delete'].includes(body.action)) return response({error: 'Invalid input'}, 400);
        const id = body.uuid.toLowerCase();
        const updated = Number(body.updated_at);
        if (!Number.isSafeInteger(updated) || updated <= 0) return response({error: 'Invalid timestamp'}, 400);
        // Tombstones prevent older backfill events resurrecting deleted items.
        if (body.action === 'delete') {
          await env.CATALOG.prepare("INSERT INTO addons(uuid,title,updated_at,deleted) VALUES(?,'',?,1) ON CONFLICT(uuid) DO UPDATE SET deleted=1,updated_at=excluded.updated_at WHERE excluded.updated_at >= addons.updated_at").bind(id,updated).run();
        } else {
          const title = text(body.title, 255); if (!title) return response({error: 'Title required'}, 400);
          const size = Number(body.file_size);
          await env.CATALOG.prepare('INSERT INTO addons(uuid,title,creator,category,version,thumbnail_url,marketplace_url,file_size,file_ext,updated_at,deleted) VALUES(?,?,?,?,?,?,?,?,?,?,0) ON CONFLICT(uuid) DO UPDATE SET title=excluded.title,creator=excluded.creator,category=excluded.category,version=excluded.version,thumbnail_url=excluded.thumbnail_url,marketplace_url=excluded.marketplace_url,file_size=excluded.file_size,file_ext=excluded.file_ext,updated_at=excluded.updated_at,deleted=0 WHERE excluded.updated_at > addons.updated_at').bind(id,title,text(body.creator,255),text(body.category,64),text(body.version,32),https(body.thumbnail_url),https(body.marketplace_url),Number.isSafeInteger(size)&&size>0?size:0,text(body.file_ext,16),updated).run();
        }
        return response({ok:true});
      }
      return response({error:'Not found'}, 404);
    } catch (_) { return response({error:'Service unavailable'}, 503); }
  }
};
