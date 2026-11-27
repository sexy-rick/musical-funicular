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
        if (cat && !categories.has(cat)) return response({error: 'Invalid category'}, 400);
        const page = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1));
        const where = ['deleted = 0']; const args = [];
        if (cat) { where.push('category = ?'); args.push(cat); }
        if (q) { where.push('(title LIKE ? OR creator LIKE ?)'); args.push('%' + q + '%', '%' + q + '%'); }
        const clause = where.join(' AND ');
        const totalRow = await env.CATALOG.prepare('SELECT COUNT(*) AS total FROM addons WHERE ' + clause).bind(...args).first();
        const result = await env.CATALOG.prepare('SELECT uuid,title,creator,category,version,thumbnail_url,marketplace_url,file_size,file_ext,updated_at FROM addons WHERE ' + clause + ' ORDER BY updated_at DESC, uuid ASC LIMIT 24 OFFSET ?').bind(...args, (page - 1) * 24).all();
        return response({ok: true, items: result.results, total: totalRow.total, page});
      }
      const match = /^\/addons\/([0-9a-f-]+)$/i.exec(url.pathname);
      if (request.method === 'GET' && match && ID.test(match[1])) {
        const item = await env.CATALOG.prepare('SELECT uuid,title,creator,category,version,thumbnail_url,marketplace_url,file_size,file_ext,updated_at FROM addons WHERE uuid = ? AND deleted = 0').bind(match[1].toLowerCase()).first();
        return item ? response({ok: true, item}) : response({error: 'Not found'}, 404);
      }
      if (url.pathname === '/sync' && request.method === 'POST') {
        if (!authorised(request, env.SYNC_SECRET)) return response({error: 'Unauthorized'}, 401);
        if (Number(request.headers.get('content-length') || 0) > 32768) return response({error: 'Too large'}, 413);
        const raw = await request.text();
        if (raw.length > 32768) return response({error: 'Too large'}, 413);
        let body; try { body = JSON.parse(raw); } catch { return response({error: 'Invalid JSON'}, 400); }
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
