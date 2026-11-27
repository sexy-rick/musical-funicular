// The catalog contains public metadata only. Downloads are handled by Telegram.
(() => {
  'use strict';
  const API = 'https://mc-catalog-1474006216.aman-nsipai.workers.dev';
  const params = new URLSearchParams(location.search);
  const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };
  const link = (text, href, className) => { const a = el('a', className, text); a.href = href; return a; };
  const safeUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch (_) { return ''; } };
  const bytes = n => { n = Number(n); if (!Number.isFinite(n) || n <= 0) return ''; if (n < 1024) return n + ' B'; if (n < 1048576) return Math.round(n / 102.4) / 10 + ' KB'; if (n < 1073741824) return (n / 1048576).toFixed(2) + ' MB'; return (n / 1073741824).toFixed(2) + ' GB'; };
  const valid = item => item && typeof item.uuid === 'string' && idPattern.test(item.uuid) && typeof item.title === 'string' && item.title.trim();
  const slugify = text => String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  function detailUrl(item) {
    let title = slugify(item.title).slice(0, 64).replace(/-+$/,'') || 'addon';
    const version = slugify(item.version).replace(/^v(?=\d)/,'').slice(0,24).replace(/-+$/,'');
    if (version && !('-'+title+'-').includes('-'+version+'-') && !('-'+title+'-').includes('-v'+version+'-')) title += '-'+version;
    return '/'+title+'-'+item.uuid.toLowerCase();
  }
  function telegram(item, label, className) {
    const a=link(label,'https://t.me/Mc_addonbot?start='+encodeURIComponent(item.uuid),className); a.prepend(icon('download'));
    a.target='_blank'; a.rel='noopener noreferrer'; return a;
  }
  function icon(name) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','icon'); svg.setAttribute('aria-hidden','true');
    const use=document.createElementNS('http://www.w3.org/2000/svg','use'); use.setAttribute('href','/assets/icons-v9.svg#'+name); svg.append(use); return svg;
  }
  // Prepare only visible catalog thumbnails, bounded in memory and without credentials.
  const images=new Map(); let running=0; const queue=[];
  function prepareImage(item) {
    const src=safeUrl(item.thumbnail_url); if(!src || images.has(src) || typeof navigator.share!=='function' || typeof navigator.canShare!=='function') return;
    const entry={state:'queued',file:null,notify:null}; images.set(src,entry); queue.push({src,entry}); pump();
  }
  function pump() {
    while(running<3 && queue.length) {
      const {src,entry}=queue.shift(); if(images.get(src)!==entry) continue; running++; entry.state='loading';
      const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),8000);
      fetch(src,{mode:'cors',credentials:'omit',signal:controller.signal}).then(async r=>{
        const length=Number(r.headers.get('content-length')); const type=(r.headers.get('content-type')||'').split(';')[0].toLowerCase();
        if(!r.ok || !['image/jpeg','image/png','image/webp'].includes(type) || length>2*1024*1024 || !r.body || !r.body.getReader) throw new Error();
        const reader=r.body.getReader(), chunks=[]; let size=0;
        while(true) {const part=await reader.read(); if(part.done) break; size+=part.value.byteLength; if(size>2*1024*1024) {await reader.cancel(); throw new Error();} chunks.push(part.value);}
        if(!size) throw new Error(); entry.file=new File(chunks,'catalog-image.'+({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type]),{type}); entry.state='ready';
      }).catch(()=>{entry.state='unavailable';}).finally(()=>{clearTimeout(timer); if(entry.notify) {entry.notify(); entry.notify=null;} running--; while(images.size>8) {const oldest=[...images].find(([,v])=>v.state==='ready'||v.state==='unavailable'); if(!oldest) break; images.delete(oldest[0]);} pump();});
    }
  }
  const observer=typeof IntersectionObserver==='function' ? new IntersectionObserver(entries=>{for(const e of entries) if(e.isIntersecting) {prepareImage(e.target._shareItem); observer.unobserve(e.target);}}, {rootMargin:'150px'}) : null;
  function shareControls(item, iconOnly = false) {
    const box=el('div','share-controls'); const button=el('button',iconOnly ? 'share-button icon-only' : 'share-button',iconOnly ? '' : 'Share'); button.prepend(icon('share')); button.type='button'; button.setAttribute('aria-label','Share '+item.title);
    const status=el('p','share-status'); status.setAttribute('role','status'); const fallback=el('div','share-fallback'); fallback.hidden=true;
    const input=el('input','share-url'); input.type='text'; input.readOnly=true; input.setAttribute('aria-label','Link to '+item.title); input.value=new URL(detailUrl(item),location.origin).href;
    const copy=el('button','share-copy','Copy link'); copy.type='button'; fallback.append(input,copy);
    copy.addEventListener('click',async()=>{try {if(!navigator.clipboard || !navigator.clipboard.writeText) throw new Error(); await navigator.clipboard.writeText(input.value); status.textContent='Link copied.';} catch (_) {input.focus(); input.select(); status.textContent='Select and copy the link above.';}});
    button._shareItem=item; if(observer) observer.observe(button); else prepareImage(item);
    button.addEventListener('click',async()=>{
      if(typeof navigator.share!=='function') {fallback.hidden=false; box.classList.add('sharing-fallback-visible'); status.textContent='Sharing is unavailable. Copy the link instead.'; return;}
      const src=safeUrl(item.thumbnail_url); let entry=src && images.get(src);
      if(!entry && src && typeof navigator.canShare==='function') {prepareImage(item); entry=images.get(src);}
      if(entry && (entry.state==='queued'||entry.state==='loading')) {status.textContent='Preparing the catalog image. Please tap Share again in a moment.'; entry.notify=()=>{status.textContent=entry.file ? 'Catalog image ready. Tap Share again.' : 'Catalog image unavailable. Tap Share again to share the link.';}; return;}
      const data={title:item.title,text:item.title,url:input.value};
      if(entry && entry.file) {try {if(navigator.canShare({...data,files:[entry.file]})) data.files=[entry.file];} catch (_) {}}
      status.textContent=data.files ? 'Sharing the catalog image when supported by your chosen app.' : 'The catalog image is unavailable for sharing; sharing the link only.';
      try {await navigator.share(data);} catch(error) {if(error && error.name==='AbortError') return; fallback.hidden=false; box.classList.add('sharing-fallback-visible'); status.textContent='Could not open sharing. Copy the link instead.';}
    });
    box.append(button,status,fallback); return box;
  }
  const finish = target => target.setAttribute('aria-busy', 'false');
  const empty = (title, message) => { const box = el('div','empty'); box.append(el('h2','',title),el('p','',message),link('Browse the collection','/index.php#catalog','btn btn-primary')); return box; };
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
    const article=el('article','card'); const anchor=link('',detailUrl(item),'card-link'); anchor.addEventListener('click',event=>{ if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; try {sessionStorage.setItem('catalog-return',location.href);} catch (_) {} }); const cover=el('div','card-image');
    const visibleColumns=window.innerWidth>=1024 ? 4 : window.innerWidth>=900 ? 3 : window.innerWidth>=600 ? 2 : 1;
    image(cover,item,index < visibleColumns);
    const body=el('div','card-body'); body.append(el('h3','',item.title));
    const meta=el('p','card-creator'); const creator=typeof item.creator === 'string' && item.creator.trim() ? item.creator : 'Creator not listed'; meta.append(document.createTextNode(creator));
    if (typeof item.category === 'string' && item.category.trim()) meta.append(el('span','card-category',item.category.toLowerCase()));
    body.append(meta); anchor.append(cover,body);
    const actions=el('div','card-actions'); const download=link('Download','/addon.php?uuid='+encodeURIComponent(item.uuid),'card-download'); download.prepend(icon('download')); download.setAttribute('aria-label','View download for '+item.title); download.addEventListener('click',event=>{if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; try {sessionStorage.setItem('catalog-return',location.href);} catch (_) {}}); actions.append(download,shareControls(item,true));
    article.append(anchor,actions); return article;
  }
  async function request(path) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
    try { const r=await fetch(API+path,{headers:{'Accept':'application/json'},credentials:'omit',signal:controller.signal}); if (!r.ok) { const error=new Error('Catalog unavailable'); error.status=r.status; throw error; } const data=await r.json(); if (!data || data.ok !== true) throw new Error('Invalid response'); return data; }
    finally { clearTimeout(timer); }
  }
  async function showGrid(target, items) {
    const grid=el('div','grid'), filtered=items.filter(valid); if(!filtered.length) throw new Error('Invalid catalog items');
    target.replaceChildren(grid); let index=0;
    while(index<filtered.length) {if(!grid.isConnected) return; const limit=Math.min(index+4,filtered.length); while(index<limit) {grid.append(card(filtered[index],index)); index++;} if(index<filtered.length) await new Promise(resolve=>setTimeout(resolve,0));}
  }
  function listArgs() {
    const args=new URLSearchParams(),q=(params.get('q')||'').trim().slice(0,100),creator=(params.get('creator')||'').trim().slice(0,255),cat=params.get('cat')||'',updated=params.get('updated')||'';
    if(q)args.set('q',q); if(creator)args.set('creator',creator); if(cat)args.set('cat',cat); if(updated)args.set('updated',updated);
    const raw=Number.parseInt(params.get('page')||'1',10),page=Number.isFinite(raw)?Math.max(1,Math.min(100000,raw)):1; args.set('page',String(page)); return {args,page,q,creator};
  }
  async function listing(target, searchMode) {
    if(!target) return; const {args,page,q,creator}=listArgs();
    if(searchMode && !q && !creator && !args.get('cat') && !args.get('updated')) {target.replaceChildren(empty('Looking for something?','Use the search bar above to get started.'));finish(target);return;}
    const run=()=>listing(target,searchMode); loading(target,searchMode?'Looking through the collection…':'Loading the collection…');
    try {
      const early=window.__earlyCatalog; delete window.__earlyCatalog; const data=early && early.key===args.toString()?await early.promise:await request('/addons?'+args);
      if(!Array.isArray(data.items) || !Number.isFinite(Number(data.total)) || Number(data.total)<0) throw new Error('Invalid response');
      if(!data.items.length) {target.replaceChildren(empty('No matches found','Try another search or filter.'));finish(target);return;}
      await showGrid(target,data.items);
      if(creator) target.prepend(el('p','filter-note','Studio: '+creator));
      const pages=Math.max(1,Math.ceil(Number(data.total)/24));
      if(pages>1) {const nav=el('nav','pagination'); nav.setAttribute('aria-label','Catalog pages'); const href=p=>{const next=new URLSearchParams(args);next.set('page',String(p));return (searchMode?'/search.php?':'/index.php?')+next+(searchMode?'':'#catalog');};if(page>1)nav.append(link('Previous',href(page-1)));nav.append(el('span','',`Page ${page} of ${pages}`));if(page<pages)nav.append(link('Next',href(page+1)));target.append(nav);} finish(target);
    } catch(error) {fail(target,run,error.status);}
  }
  function catalog() {return listing(document.getElementById('catalog-results'),false);}
  function search() {return listing(document.getElementById('search-results'),true);}
  async function addon() {
    const target=document.getElementById('addon-results'); if (!target) return;
    const pretty=location.pathname.match(/^\/[a-z0-9]+(?:-[a-z0-9]+)*-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    const id=pretty ? pretty[1] : (params.get('uuid') || '');
    if(!idPattern.test(id)) { missing(target); return; }
    loading(target,'Loading add-on…');
    try {
      const data=await request('/addons/'+encodeURIComponent(id)); const item=data.item; if(!valid(item) || item.uuid.toLowerCase()!==id.toLowerCase()) throw new Error('Invalid response');
      document.title=item.title+' | Marketplace Trader'; const detail=el('div','detail'); const cover=el('div','detail-image'); image(cover,item,true); const content=el('div','detail-content');
      content.append(el('span','eyebrow',item.category || 'ADD-ON'),el('h1','',item.title));
      const details=el('dl','pack-details'); const row=(label,value)=>{const dt=el('dt','',label),dd=el('dd'); if(value instanceof Node) dd.append(value); else dd.textContent=value || 'Not available'; details.append(dt,dd);};
      row('Name',item.title); const creator=typeof item.creator==='string' && item.creator.trim()?item.creator.trim():''; row('Studio',creator?link(creator,'/index.php?'+new URLSearchParams({creator})+'#catalog','text-link'):'Not available');
      row('Category',item.category || 'Not available'); row('Marketplace price','Not available'); row('File type',item.file_ext ? '.'+String(item.file_ext).replace(/^\./,'') : 'Not available'); row('File size',bytes(item.file_size)||'Not available'); if(item.version)row('Version',String(item.version)); content.append(details);
      const payload=encodeURIComponent(item.uuid);
      const actions=el('div','actions');
      const telegramLink=telegram(item,'Open in Telegram','btn btn-primary');
      actions.append(telegramLink,shareControls(item),link('Try opening the app directly','tg://resolve?domain=Mc_addonbot&start='+payload,'text-link'));
      content.append(actions,el('p','action-note','The Telegram link opens in a new tab or the app. Allow your browser to open Telegram if prompted, then tap Start if it appears.'));
      const help=el('details','telegram-help'); help.append(el('summary','','Telegram not opening?'));
      help.append(el('p','','Open the Telegram app, search for @Mc_addonbot, and send this message to the bot:'));
      help.append(el('p','manual-command','/start '+item.uuid));
      help.append(el('p','','Then follow the bot’s instructions. The file may not be available for every listing.'));
      content.append(help);
      const market=safeUrl(item.marketplace_url); if(market) { const p=el('p'); const a=link('View on Marketplace',market,'text-link'); a.target='_blank'; a.rel='noopener noreferrer'; p.append(a); content.append(p); }
      const install=el('div','install'); install.append(el('h2','','How to get started')); const list=el('ol'); for(const step of ['Open the bot and follow its instructions.','Download the file in Telegram if it is available.','On supported devices, open a compatible pack with Minecraft and enable it in your world settings.']) list.append(el('li','',step)); install.append(list,link('Need help? Visit the FAQ','/faq.php','text-link')); content.append(install); detail.append(cover,content); target.replaceChildren(detail); finish(target);
    } catch(error) { if(error.status===404) missing(target); else fail(target,addon,error.status); }
  }
  const back=document.querySelector('#addon-results') && document.querySelector('.back');
  if(back) { try { const previous=sessionStorage.getItem('catalog-return'); sessionStorage.removeItem('catalog-return'); if(previous && document.referrer && history.length>1 && new URL(previous).origin+new URL(previous).pathname+new URL(previous).search===new URL(document.referrer).origin+new URL(document.referrer).pathname+new URL(document.referrer).search) { const parsed=new URL(previous); if(parsed.origin===location.origin && ['/home','/','/index.php','/search.php'].includes(parsed.pathname)) { back.href=previous; back.addEventListener('click',event=>{if(event.button===0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {event.preventDefault(); history.back();}}); } } } catch (_) {} }
  catalog(); search(); addon();
})();
