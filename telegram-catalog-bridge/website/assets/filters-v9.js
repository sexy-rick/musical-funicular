(() => {
 'use strict'; const input=document.getElementById('search'), search=document.querySelector('form.search'), dialog=document.getElementById('filter-dialog'), open=document.querySelector('.filter-open'), form=document.getElementById('filter-form'); if(!input||!search||!dialog||!open||!form) return;
 const params=new URLSearchParams(location.search), cat=form.elements.cat, updated=form.elements.updated;
 const currentCat=params.get('cat')||'', currentUpdated=params.get('updated')||'', creator=(params.get('creator')||'').slice(0,255);
 cat.value=currentCat; updated.value=currentUpdated; for(const field of ['cat','updated','creator']) search.elements[field].value=field==='cat'?cat.value:field==='updated'?updated.value:creator;
 if(cat.value||updated.value||creator) {open.classList.add('has-filter'); open.setAttribute('aria-label','Filters, active');}
 const close=()=>{if(dialog.open && typeof dialog.close==='function') dialog.close(); else dialog.removeAttribute('open'); open.focus();};
 open.addEventListener('click',()=>{if(typeof dialog.showModal==='function') dialog.showModal(); else {dialog.setAttribute('open',''); cat.focus();}});
 document.getElementById('filter-close').addEventListener('click',close); document.getElementById('filter-clear').addEventListener('click',()=>{cat.value='';updated.value='';form.elements.creator.value='';});
 dialog.addEventListener('click',event=>{if(event.target===dialog)close();}); dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('keydown',event=>{if(typeof dialog.showModal==='function') return; if(event.key==='Escape'){event.preventDefault();close();} else if(event.key==='Tab'){const controls=[...dialog.querySelectorAll('select,button')],first=controls[0],last=controls[controls.length-1];if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}}});
 form.addEventListener('submit',()=>{form.elements.q.value=input.value.trim();});
 form.elements.creator.value=creator;
})();
