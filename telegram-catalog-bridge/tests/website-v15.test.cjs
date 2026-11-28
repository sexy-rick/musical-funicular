const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {JSDOM} = require('jsdom');
const root = join(__dirname, '../website');
const script=readFileSync(join(root,'assets/install-v15.js'),'utf8');
const source=readFileSync(join(root,'alium.php'),'utf8');
assert.match(source,/Chrome on Android/); assert.match(source,/Chrome on computer/); assert.match(source,/Internet access is required/);
function setup(standalone=false){
 const dom=new JSDOM('<button id="web-install-button" hidden>Install</button><p id="web-install-status"></p>',{url:'https://example.com/alium.php',runScripts:'outside-only'});
 dom.window.matchMedia=()=>({matches:standalone}); dom.window.eval(script); return dom;
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
(async()=>{
 let dom=setup(); let w=dom.window,button=w.document.querySelector('button'),status=w.document.querySelector('p');
 assert.equal(button.hidden,true); let called=0; const e=new w.Event('beforeinstallprompt',{cancelable:true}); e.prompt=async()=>{called++;}; e.userChoice=Promise.resolve({outcome:'dismissed'}); w.dispatchEvent(e);
 assert.equal(e.defaultPrevented,true); assert.equal(button.hidden,false); button.click(); await tick(); assert.equal(called,1); assert.equal(button.hidden,true); assert.match(status.textContent,/dismissed/);
 const error=new w.Event('beforeinstallprompt',{cancelable:true}); error.prompt=async()=>{throw Error('unavailable')}; w.dispatchEvent(error);button.click();await tick();assert.match(status.textContent,/Could not open/);
 const accepted=new w.Event('beforeinstallprompt',{cancelable:true});accepted.prompt=async()=>{};accepted.userChoice=Promise.resolve({outcome:'accepted'});w.dispatchEvent(accepted);button.click(); await tick();assert.match(status.textContent,/Follow Chrome/);
 w.dispatchEvent(new w.Event('appinstalled'));assert.match(status.textContent,/installed/);assert.equal(button.hidden,true);
 const late=new w.Event('beforeinstallprompt',{cancelable:true});w.dispatchEvent(late);assert.equal(button.hidden,true);dom.window.close();
 dom=setup(true);assert.match(dom.window.document.querySelector('p').textContent,/open as an app/);dom.window.close();
 console.log('Chrome install UI, user gesture, fallback and installed states passed');
})().catch(e=>{console.error(e);process.exitCode=1});
