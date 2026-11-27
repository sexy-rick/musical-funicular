// Public metadata only. The user's browser talks to the public catalog; no secrets are sent.
(() => {
  'use strict';
  const API = 'https://mc-catalog-1474006216.aman-nsipai.workers.dev';
  const params = new URLSearchParams(location.search);
  const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };
  const link = (text, href, className) => { const a = el('a', className, text); a.href = href; return a; };
  const safeUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch (_) { return ''; } };
  const bytes = n => { n = Number(n); if (!Number.isFinite(n) || n <= 0) return 'Size unknown'; if (n < 1024) return n + ' B'; if (n < 1048576) return Math.round(n / 102.4) / 10 + ' KB'; if (n < 1073741824) return Math.round(n / 104857.6) / 10 + ' MB'; return Math.round(n / 107374182.4) / 10 + ' GB'; };
  const valid = item => item && typeof item.uuid === 'string' && idPattern.test(item.uuid) && typeof item.title === 'string';
  const detailUrl = id => 'addon.php?uuid=' + encodeURIComponent(id);
  const fail = target => { const wrap = el('div', 'notice'); const icon = el('span', 'notice-icon', '!'); icon.setAttribute('aria-hidden','true'); const text = el('div'); text.append(el('strong', '', 'Catalog is getting ready'), el('p', '', 'We couldn’t load add-ons right now. Please check back soon.')); wrap.append(icon, text); target.replaceChildren(wrap); };
  const empty = (title, msg) => { const box = el('div','empty'); box.append(el('h2','',title),el('p','',msg)); return box; };
  const image = (node, item) => { const url = safeUrl(item.thumbnail_url); if (url) { const img = el('img'); img.src = url; img.alt = ''; img.loading = 'lazy'; node.append(img); } else { const icon = el('span', 'block-icon', '▦'); icon.setAttribute('aria-hidden','true'); node.append(icon); } };
  function card(item) {
    const article = el('article','card'); const cover = link('',detailUrl(item.uuid),'card-image'); cover.setAttribute('aria-label', 'View ' + item.title); image(cover,item);
    const body = el('div','card-body'); body.append(el('span','eyebrow',item.category || 'ADD-ON'));
    const heading = el('h3'); heading.append(link(item.title,detailUrl(item.uuid))); body.append(heading,el('p','card-creator',item.creator || 'Creator not listed'));
    const bottom = el('div','card-bottom'); const arrow = link('↗',detailUrl(item.uuid),'round-link'); arrow.setAttribute('aria-label','View ' + item.title); bottom.append(el('span','',bytes(item.file_size)),arrow); body.append(bottom); article.append(cover,body); return article;
  }
  async function request(path) { const r = await fetch(API + path, {headers:{'Accept':'application/json'}, credentials:'omit'}); if (!r.ok) throw new Error('Catalog unavailable'); const data = await r.json(); if (!data || data.ok !== true) throw new Error('Invalid response'); return data; }
  function showGrid(target, items) { const grid = el('div','grid'); for (const item of items) if (valid(item)) grid.append(card(item)); target.replaceChildren(grid); }
  async function catalog() {
    const target = document.getElementById('catalog-results'); if (!target) return;
    const cat = params.get('cat') || ''; const raw = Number.parseInt(params.get('page') || '1',10); const page = Number.isFinite(raw) ? Math.max(1,Math.min(100000,raw)) : 1;
    try {
      const data = await request('/addons?' + new URLSearchParams({cat,page:String(page)}));
      if (!Array.isArray(data.items) || !Number.isFinite(Number(data.total))) throw new Error('Invalid response');
      const count = document.querySelector('.count'); if (count) count.textContent = Number(data.total) + ' add-ons';
      if (!data.items.length) { target.replaceChildren(empty('Nothing here just yet','Try another category or check back soon.')); return; }
      showGrid(target,data.items); const pages = Math.max(1,Math.ceil(Number(data.total)/24));
      if (pages > 1) { const nav = el('nav','pagination'); nav.setAttribute('aria-label','Catalog pages'); const href = p => 'index.php?' + new URLSearchParams({...(cat ? {cat} : {}),page:String(p)}) + '#catalog'; if (page > 1) nav.append(link('← Previous',href(page-1))); nav.append(el('span','',`Page ${page} of ${pages}`)); if (page < pages) nav.append(link('Next →',href(page+1))); target.append(nav); }
    } catch (_) { fail(target); }
  }
  async function search() {
    const target = document.getElementById('search-results'); if (!target) return; const q=(params.get('q') || '').trim().slice(0,100);
    if (!q) { target.replaceChildren(empty('Looking for something?','Use the search bar above to get started.')); return; }
    try { const data = await request('/addons?' + new URLSearchParams({q})); if (!Array.isArray(data.items)) throw new Error('Invalid response'); if (!data.items.length) target.replaceChildren(empty('No matches found','Try a different search term.')); else { showGrid(target,data.items); if (Number(data.total)>24) target.prepend(el('p','search-note','Showing the first 24 results. Try a more specific search.')); } } catch (_) { fail(target); }
  }
  async function addon() {
    const target=document.getElementById('addon-results'); if (!target) return; const id=params.get('uuid') || '';
    if (!idPattern.test(id)) { target.replaceChildren(empty('Add-on not found','It may no longer be available.')); return; }
    try {
      const data=await request('/addons/'+encodeURIComponent(id)); const item=data.item; if (!valid(item)) throw new Error('Invalid response');
      document.title=item.title+' | Marketplace Trader'; const detail=el('div','detail'); const cover=el('div','detail-image'); image(cover,item); const content=el('div','detail-content');
      content.append(el('span','eyebrow',item.category || 'ADD-ON'),el('h1','',item.title),el('p','detail-creator','By '+(item.creator || 'Creator not listed')));
      const meta=el('div','metadata'); meta.append(el('span','',bytes(item.file_size))); if (item.version) meta.append(el('span','','Version '+item.version)); if (item.file_ext) meta.append(el('span','',String(item.file_ext).toUpperCase())); content.append(meta);
      const actions=el('div','actions'); actions.append(link('Open in Telegram ↗','https://t.me/Mc_addonbot?start='+encodeURIComponent(item.uuid),'btn btn-primary')); content.append(actions);
      const market=safeUrl(item.marketplace_url); if (market) { const p=el('p'); const a=link('View on Marketplace ↗',market,'text-link'); a.target='_blank'; a.rel='noopener noreferrer'; p.append(a); content.append(p); }
      const install=el('div','install'); install.append(el('h2','','How to install')); const list=el('ol'); for (const step of ['Download the file in Telegram.','Open it with Minecraft to import.','Enable the pack in your world settings.']) list.append(el('li','',step)); install.append(list); content.append(install); detail.append(cover,content); target.replaceChildren(detail);
    } catch (_) { fail(target); }
  }
  catalog(); search(); addon();
})();
