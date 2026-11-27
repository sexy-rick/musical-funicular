// The catalog contains public metadata only. Downloads are handled by Telegram.
(() => {
  'use strict';
  const API = 'https://mc-catalog-1474006216.aman-nsipai.workers.dev';
  const params = new URLSearchParams(location.search);
  const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };
  const link = (text, href, className) => { const a = el('a', className, text); a.href = href; return a; };
  const safeUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch (_) { return ''; } };
  const bytes = n => { n = Number(n); if (!Number.isFinite(n) || n <= 0) return ''; if (n < 1024) return n + ' B'; if (n < 1048576) return Math.round(n / 102.4) / 10 + ' KB'; if (n < 1073741824) return Math.round(n / 104857.6) / 10 + ' MB'; return Math.round(n / 107374182.4) / 10 + ' GB'; };
  const valid = item => item && typeof item.uuid === 'string' && idPattern.test(item.uuid) && typeof item.title === 'string' && item.title.trim();
  const detailUrl = id => 'addon.php?uuid=' + encodeURIComponent(id);
  const finish = target => target.setAttribute('aria-busy', 'false');
  const empty = (title, message) => { const box = el('div','empty'); box.append(el('h2','',title),el('p','',message),link('Browse the collection','index.php#catalog','btn btn-primary')); return box; };
  const noindex = () => { let meta = document.querySelector('meta[name="robots"]'); if (!meta) { meta = el('meta'); meta.name = 'robots'; document.head.append(meta); } meta.content = 'noindex'; };
  const missing = target => { noindex(); target.replaceChildren(empty('Add-on not found','This listing may have moved or is no longer available.')); finish(target); };
  function fail(target, run, status) {
    const wrap = el('div','notice');
    const title = status === 429 ? 'Too many requests' : 'The collection is taking a break';
    const message = status === 429 ? 'Please wait a moment before trying again.' : 'We couldn’t load the catalog right now. Check your connection and try again.';
    const retry = el('button','', 'Try again'); retry.type = 'button'; retry.addEventListener('click', run);
    wrap.append(el('strong','',title),el('p','',message),retry); target.replaceChildren(wrap); finish(target);
  }
  function loading(target, message) { const box=el('div','loading'); box.append(el('p','',message)); target.setAttribute('aria-busy','true'); target.replaceChildren(box); }
  function image(node, item, eager = false) {
    const fallback = () => { const label=el('span','image-fallback','Image unavailable'); label.setAttribute('aria-hidden','true'); node.replaceChildren(label); };
    const url=safeUrl(item.thumbnail_url); if (!url) { fallback(); return; }
    const img=el('img'); img.alt=''; img.width=640; img.height=360; img.loading=eager ? 'eager' : 'lazy'; img.addEventListener('error',fallback,{once:true}); img.src=url; node.append(img);
  }
  function card(item, index) {
    const article=el('article','card'); const anchor=link('',detailUrl(item.uuid),'card-link'); const cover=el('div','card-image');
    const visibleColumns=window.innerWidth>=1024 ? 4 : window.innerWidth>=900 ? 3 : window.innerWidth>=600 ? 2 : 1;
    image(cover,item,index < visibleColumns);
    const body=el('div','card-body'); body.append(el('h3','',item.title));
    const meta=el('p','card-creator'); const creator=typeof item.creator === 'string' && item.creator.trim() ? item.creator : 'Creator not listed'; meta.append(document.createTextNode(creator));
    if (typeof item.category === 'string' && item.category.trim()) meta.append(el('span','card-category',item.category.toLowerCase()));
    body.append(meta); anchor.append(cover,body); article.append(anchor); return article;
  }
  async function request(path) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
    try { const r=await fetch(API+path,{headers:{'Accept':'application/json'},credentials:'omit',signal:controller.signal}); if (!r.ok) { const error=new Error('Catalog unavailable'); error.status=r.status; throw error; } const data=await r.json(); if (!data || data.ok !== true) throw new Error('Invalid response'); return data; }
    finally { clearTimeout(timer); }
  }
  function showGrid(target, items) { const grid=el('div','grid'); items.filter(valid).forEach((item,index) => grid.append(card(item,index))); if (!grid.children.length) throw new Error('Invalid catalog items'); target.replaceChildren(grid); }
  async function catalog() {
    const target=document.getElementById('catalog-results'); if (!target) return;
    const categories=new Set(['ADD-ON','TEXTURE PACK','SKIN PACK','WORLD','MASHUP PACK','TEMPLATE','APPLICATION']);
    const requestedCategory=params.get('cat') || ''; const cat=categories.has(requestedCategory) ? requestedCategory : '';
    const raw=Number.parseInt(params.get('page') || '1',10); const page=Number.isFinite(raw) ? Math.max(1,Math.min(100000,raw)) : 1;
    loading(target,'Loading the collection…');
    try {
      const data=await request('/addons?'+new URLSearchParams({cat,page:String(page)}));
      if (!Array.isArray(data.items) || !Number.isFinite(Number(data.total)) || Number(data.total)<0) throw new Error('Invalid response');
      const count=document.querySelector('.count'); if (count) count.textContent=Number(data.total)+' listed';
      if (!data.items.length) { target.replaceChildren(empty('Nothing here just yet','Try another category or check back soon.')); finish(target); return; }
      showGrid(target,data.items); const pages=Math.max(1,Math.ceil(Number(data.total)/24));
      if (pages>1) { const nav=el('nav','pagination'); nav.setAttribute('aria-label','Catalog pages'); const href=p=>'index.php?'+new URLSearchParams({...(cat ? {cat} : {}),page:String(p)})+'#catalog'; if(page>1) nav.append(link('Previous',href(page-1))); nav.append(el('span','',`Page ${page} of ${pages}`)); if(page<pages) nav.append(link('Next',href(page+1))); target.append(nav); }
      finish(target);
    } catch (error) { const count=document.querySelector('.count'); if (count) count.textContent=''; fail(target,catalog,error.status); }
  }
  async function search() {
    const target=document.getElementById('search-results'); if (!target) return; const q=(params.get('q') || '').trim().slice(0,100);
    if (!q) { target.replaceChildren(empty('Looking for something?','Use the search bar above to get started.')); finish(target); return; }
    loading(target,'Looking through the collection…');
    try { const data=await request('/addons?'+new URLSearchParams({q})); if(!Array.isArray(data.items)) throw new Error('Invalid response'); if(!data.items.length) target.replaceChildren(empty('No matches found','Try a shorter search term or browse the collection.')); else { showGrid(target,data.items); if(Number(data.total)>24) target.prepend(el('p','search-note','Showing the first 24 results. Try a more specific search.')); } finish(target); } catch(error) { fail(target,search,error.status); }
  }
  async function addon() {
    const target=document.getElementById('addon-results'); if (!target) return; const id=params.get('uuid') || '';
    if(!idPattern.test(id)) { missing(target); return; }
    loading(target,'Loading add-on…');
    try {
      const data=await request('/addons/'+encodeURIComponent(id)); const item=data.item; if(!valid(item)) throw new Error('Invalid response');
      document.title=item.title+' | Marketplace Trader'; const detail=el('div','detail'); const cover=el('div','detail-image'); image(cover,item,true); const content=el('div','detail-content');
      content.append(el('span','eyebrow',item.category || 'ADD-ON'),el('h1','',item.title),el('p','detail-creator',item.creator ? 'By '+item.creator : 'Creator not listed'));
      const meta=el('div','metadata'); const size=bytes(item.file_size); if(size) meta.append(el('span','',size)); if(item.version) meta.append(el('span','','Version '+item.version)); if(item.file_ext) meta.append(el('span','',String(item.file_ext).toUpperCase())); if(meta.children.length) content.append(meta);
      const payload=encodeURIComponent(item.uuid);
      const actions=el('div','actions');
      actions.append(link('Open Telegram app','tg://resolve?domain=Mc_addonbot&start='+payload,'btn btn-primary'),link('Open Telegram web link','https://t.me/Mc_addonbot?start='+payload,'text-link'));
      content.append(actions,el('p','action-note','Allow your browser to open Telegram if prompted. In the bot, tap Start if it appears.'));
      const help=el('details','telegram-help'); help.append(el('summary','','Telegram not opening?'));
      help.append(el('p','','Open the Telegram app, search for @Mc_addonbot, and send this message to the bot:'));
      help.append(el('p','manual-command','/start '+item.uuid));
      help.append(el('p','','Then follow the bot’s instructions. The file may not be available for every listing.'));
      content.append(help);
      const market=safeUrl(item.marketplace_url); if(market) { const p=el('p'); const a=link('View on Marketplace',market,'text-link'); a.target='_blank'; a.rel='noopener noreferrer'; p.append(a); content.append(p); }
      const install=el('div','install'); install.append(el('h2','','How to get started')); const list=el('ol'); for(const step of ['Open the bot and follow its instructions.','Download the file in Telegram if it is available.','On supported devices, open a compatible pack with Minecraft and enable it in your world settings.']) list.append(el('li','',step)); install.append(list,link('Need help? Visit the FAQ','faq.php','text-link')); content.append(install); detail.append(cover,content); target.replaceChildren(detail); finish(target);
    } catch(error) { if(error.status===404) missing(target); else fail(target,addon,error.status); }
  }
  catalog(); search(); addon();
})();
