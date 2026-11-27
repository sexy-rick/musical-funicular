(() => {
  'use strict';
  const form=document.querySelector('form.search'), input=document.getElementById('search');
  const list=document.getElementById('search-suggestions'), status=document.getElementById('suggestions-status');
  if(!form || !input || !list || !status) return;
  let timer, controller, sequence=0, active=-1, composing=false;
  function close() {list.hidden=true; list.replaceChildren(); input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); active=-1;}
  function invalidate() {clearTimeout(timer); sequence++; if(controller) controller.abort(); controller=null; close(); status.textContent='';}
  function choose(value) {invalidate(); input.value=value; form.requestSubmit();}
  function schedule() {
    invalidate(); const q=input.value.trim(); if(q.length<2 || composing) return;
    const current=sequence;
    timer=setTimeout(async()=>{
      controller=new AbortController(); const requestController=controller; const timeout=setTimeout(()=>requestController.abort(),8000);
      try {
        const response=await fetch('https://mc-catalog-1474006216.aman-nsipai.workers.dev/addons?'+new URLSearchParams({q}),{headers:{Accept:'application/json'},credentials:'omit',signal:requestController.signal});
        if(!response.ok) throw new Error(); const data=await response.json(); if(current!==sequence || input.value.trim()!==q || document.activeElement!==input || !data || data.ok!==true || !Array.isArray(data.items)) return;
        const values=[]; const seen=new Set(); const lower=q.toLocaleLowerCase();
        for(const item of data.items) for(const value of [item.title,item.creator]) {if(typeof value!=='string') continue; const text=value.trim().slice(0,100); const key=text.toLocaleLowerCase(); if(text && key.includes(lower) && !seen.has(key)) {seen.add(key); values.push(text);} if(values.length>=6) break;}
        list.replaceChildren(); values.slice(0,6).forEach((value,index)=>{const option=document.createElement('li'); option.id='suggestion-'+index; option.setAttribute('role','option'); option.setAttribute('aria-selected','false'); option.textContent=value; option.addEventListener('pointerdown',event=>event.preventDefault()); option.addEventListener('click',()=>choose(value)); list.append(option);});
        list.hidden=!list.children.length; input.setAttribute('aria-expanded',String(!list.hidden)); status.textContent=list.hidden?'No suggestions.':'Suggestions available.';
      } catch (_) {if(current===sequence) {close(); status.textContent='';}} finally {clearTimeout(timeout);}
    },500);
  }
  input.addEventListener('input',schedule); input.addEventListener('compositionstart',()=>{composing=true; invalidate();}); input.addEventListener('compositionend',()=>{composing=false; schedule();});
  input.addEventListener('keydown',event=>{
    const options=[...list.children]; if(event.key==='Escape') {invalidate(); return;} if(!options.length || list.hidden) return;
    if(event.key==='ArrowDown' || event.key==='ArrowUp') {event.preventDefault(); active=event.key==='ArrowDown' ? Math.min(active+1,options.length-1) : Math.max(active-1,0); options.forEach((o,i)=>o.setAttribute('aria-selected',String(i===active))); input.setAttribute('aria-activedescendant',options[active].id); options[active].scrollIntoView({block:'nearest'});}
    else if(event.key==='Enter' && active>=0) {event.preventDefault(); choose(options[active].textContent);}
  });
  form.addEventListener('submit',invalidate); document.addEventListener('pointerdown',event=>{if(!form.contains(event.target)) invalidate();});
  input.addEventListener('blur',()=>setTimeout(()=>{if(!form.contains(document.activeElement)) invalidate();},0));
})();
