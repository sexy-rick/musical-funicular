const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'); const {join}=require('node:path'); const {JSDOM}=require('jsdom');
const script=readFileSync(join(__dirname,'../website/assets/search-v7.js'),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const dom=new JSDOM('<form class="search"><input id="search"><ul id="search-suggestions" hidden></ul><span id="suggestions-status"></span></form>',{url:'https://example.org/',runScripts:'outside-only'});
 const w=dom.window, input=w.document.getElementById('search'), list=w.document.getElementById('search-suggestions'); w.HTMLElement.prototype.scrollIntoView=function(){}; input.focus();
 const requests=[]; w.fetch=url=>new Promise(resolve=>requests.push({url,resolve})); w.eval(script);
 const type=value=>{input.value=value; input.dispatchEvent(new w.Event('input',{bubbles:true}));};
 type('f'); type('fu'); await wait(150); type('fur'); await wait(350); assert.equal(requests.length,0); await wait(180); assert.equal(requests.length,1);
 type('furn'); await wait(550); assert.equal(requests.length,2);
 requests[1].resolve({ok:true,json:async()=>({ok:true,items:[{title:'Furniture Pack',creator:'Maker'},{title:'<img src=x> Furniture',creator:'Maker'}]})}); await wait(10);
 assert.equal(list.children.length,2); assert.equal(list.querySelector('img'),null); assert.equal(input.getAttribute('aria-expanded'),'true');
 requests[0].resolve({ok:true,json:async()=>({ok:true,items:[{title:'Fur old',creator:'Old'}]})}); await wait(10); assert.equal(list.children[0].textContent,'Furniture Pack');
 input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})); assert.equal(list.children[0].getAttribute('aria-selected'),'true');
 input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true})); assert.equal(list.hidden,true);
 type('x'); await wait(550); assert.equal(requests.length,2); console.log('Suggestion debounce, stale response, keyboard, and text safety tests passed.');
 dom.window.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
