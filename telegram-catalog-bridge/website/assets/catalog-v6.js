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
    const use=document.createElementNS('http://www.w3.org/2000/svg','use'); use.setAttribute('href','/assets/icons-v6.svg#'+name); svg.append(use); return svg;
  }
  function shareControls(item) {
    const box=el('div','share-controls'); const button=el('button','share-button','Share'); button.prepend(icon('share')); button.type='button'; button.setAttribute('aria-label','Share '+item.title);
    button.addEventListener('click',()=>openShare(item,button)); box.append(button); return box;
  }
  function openShare(item, origin) {
    const url=new URL(detailUrl(item),location.origin).href;
    const dialog=el('dialog','share-dialog'); dialog.setAttribute('aria-labelledby','share-heading');
    const heading=el('h2','','Share '+item.title); heading.id='share-heading';
    const close=el('button','sheet-close','Close'); close.type='button'; close.prepend(icon('close'));
    const input=el('input','share-url'); input.value=url; input.readOnly=true; input.setAttribute('aria-label','Link to '+item.title);
    const imageStatus=el('p','share-status','Preparing image for More…'); imageStatus.setAttribute('role','status'); const status=el('p','share-status'); status.setAttribute('role','status');
    const choices=el('div','share-choices');
    const external=(name,href,ico)=>{ const a=link(name,href,'share-choice'); a.prepend(icon(ico)); a.target='_blank'; a.rel='noopener noreferrer'; return a; };
    choices.append(external('Telegram','https://t.me/share/url?'+new URLSearchParams({url,text:item.title}),'share'),external('WhatsApp','https://api.whatsapp.com/send?'+new URLSearchParams({text:item.title+' '+url}),'share'));
    const discord=el('button','share-choice','Discord: copy link'); discord.type='button'; discord.prepend(icon('content_copy'));
    const more=el('button','share-choice','More'); more.type='button'; more.prepend(icon('more_horiz'));
    const copy=el('button','share-choice','Copy link'); copy.type='button'; copy.prepend(icon('content_copy')); choices.append(discord,more,copy);
    const note=el('p','sheet-note','Telegram and WhatsApp share a link. For Discord, paste the copied link. More may share an image when supported; apps may omit it.');
    dialog.append(close,heading,note,input,choices,imageStatus,status); document.body.append(dialog);
    let imageFile=null, closed=false; const controller=new AbortController();
    const dismiss=()=>{ if (closed) return; closed=true; controller.abort(); if (dialog.open) dialog.close(); dialog.remove(); origin.focus(); };
    close.addEventListener('click',dismiss); dialog.addEventListener('cancel',e=>{e.preventDefault(); dismiss();}); dialog.addEventListener('click',e=>{if(e.target===dialog) dismiss();});
    const copyLink=async()=>{try {if(!navigator.clipboard || !navigator.clipboard.writeText) throw new Error(); await navigator.clipboard.writeText(url); status.textContent='Link copied.';} catch (_) {input.focus(); input.select(); status.textContent='Select and copy the link above.';}};
    copy.addEventListener('click',copyLink); discord.addEventListener('click',copyLink);
    more.addEventListener('click',async()=>{
      if(typeof navigator.share !== 'function') {status.textContent='Sharing is unavailable here. Copy the link instead.'; return;}
      const data={title:item.title,text:item.title,url};
      if(imageFile && typeof navigator.canShare==='function') {try {if(navigator.canShare({...data,files:[imageFile]})) data.files=[imageFile];} catch (_) {}}
      try {await navigator.share(data); } catch(error) {if(error && error.name==='AbortError') return; status.textContent='Could not open sharing. Copy the link instead.';}
    });
    if(typeof dialog.showModal==='function') dialog.showModal(); else {
      dialog.setAttribute('open',''); close.focus();
      dialog.addEventListener('keydown',event=>{ if(event.key==='Escape') { event.preventDefault(); dismiss(); return; } if(event.key==='Tab') { const focusable=[...dialog.querySelectorAll('button,a,input')]; const first=focusable[0], last=focusable[focusable.length-1]; if(event.shiftKey && document.activeElement===first) {event.preventDefault(); last.focus();} else if(!event.shiftKey && document.activeElement===last) {event.preventDefault(); first.focus();} } });
    }
    const imageUrl=safeUrl(item.thumbnail_url);
    if(!imageUrl) {imageStatus.textContent='Image unavailable. More will share the link only.'; return;}
    const timer=setTimeout(()=>controller.abort(),8000);
    fetch(imageUrl,{mode:'cors',credentials:'omit',signal:controller.signal}).then(async response=>{
      const size=Number(response.headers.get('content-length')); const type=(response.headers.get('content-type')||'').split(';')[0].toLowerCase();
      if(!response.ok || !['image/png','image/jpeg','image/webp'].includes(type) || !size || size>2*1024*1024) throw new Error();
      if(!response.body || !response.body.getReader) throw new Error(); const reader=response.body.getReader(); let total=0; const chunks=[]; while(true) {const part=await reader.read(); if(part.done) break; total+=part.value.byteLength; if(total>2*1024*1024) {await reader.cancel(); throw new Error();} chunks.push(part.value);} if(!total) throw new Error(); const blob=new Blob(chunks,{type});
      imageFile=new File([blob],'thumbnail.'+({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type]),{type});
      if(!closed) imageStatus.textContent='Image ready for supported apps in More. Other choices share a link.';
    }).catch(()=>{if(!closed) imageStatus.textContent='Image unavailable. More will share the link only.';}).finally(()=>clearTimeout(timer));
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
    const actions=el('div','card-actions'); const download=telegram(item,'Download','card-download'); download.setAttribute('aria-label','Download '+item.title+' in Telegram'); actions.append(download,shareControls(item));
    article.append(anchor,actions); return article;
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
      if (pages>1) { const nav=el('nav','pagination'); nav.setAttribute('aria-label','Catalog pages'); const href=p=>'/index.php?'+new URLSearchParams({...(cat ? {cat} : {}),page:String(p)})+'#catalog'; if(page>1) nav.append(link('Previous',href(page-1))); nav.append(el('span','',`Page ${page} of ${pages}`)); if(page<pages) nav.append(link('Next',href(page+1))); target.append(nav); }
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
    const target=document.getElementById('addon-results'); if (!target) return;
    const pretty=location.pathname.match(/^\/[a-z0-9]+(?:-[a-z0-9]+)*-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    const id=pretty ? pretty[1] : (params.get('uuid') || '');
    if(!idPattern.test(id)) { missing(target); return; }
    loading(target,'Loading add-on…');
    try {
      const data=await request('/addons/'+encodeURIComponent(id)); const item=data.item; if(!valid(item) || item.uuid.toLowerCase()!==id.toLowerCase()) throw new Error('Invalid response');
      document.title=item.title+' | Marketplace Trader'; const detail=el('div','detail'); const cover=el('div','detail-image'); image(cover,item,true); const content=el('div','detail-content');
      content.append(el('span','eyebrow',item.category || 'ADD-ON'),el('h1','',item.title),el('p','detail-creator',item.creator ? 'By '+item.creator : 'Creator not listed'));
      const meta=el('div','metadata'); const size=bytes(item.file_size); if(size) meta.append(el('span','',size)); if(item.version) meta.append(el('span','','Version '+item.version)); if(item.file_ext) meta.append(el('span','',String(item.file_ext).toUpperCase())); if(meta.children.length) content.append(meta);
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
