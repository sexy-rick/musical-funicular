const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
const root=path.join(__dirname,'../website');
for(const [name,size] of [['favicon-16x16.png',16],['favicon-32x32.png',32],['apple-touch-icon.png',180],['android-chrome-192x192.png',192],['android-chrome-512x512.png',512]]) {
 const data=fs.readFileSync(path.join(root,name)); assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a'); assert.equal(data.readUInt32BE(16),size); assert.equal(data.readUInt32BE(20),size);
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'site.webmanifest'))); assert.equal(manifest.theme_color,'#c88828'); assert.equal(manifest.start_url,'/home'); assert.equal(manifest.id,'/home'); assert.equal(manifest.scope,'/'); assert.equal(manifest.display,'standalone'); for(const icon of manifest.icons) assert.ok(fs.existsSync(path.join(root,icon.src)));
const jpg=fs.readFileSync(path.join(root,'assets/brand-logo-v8.jpg')); assert.equal(jpg.subarray(0,2).toString('hex'),'ffd8');
for(const file of ['lib/view.php',...fs.readdirSync(path.join(root,'errors')).map(x=>'errors/'+x)]) {const html=fs.readFileSync(path.join(root,file),'utf8'); for(const part of ['brand-logo-v8.jpg','favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png','site.webmanifest','site-v16.css']) assert.ok(html.includes(part),file+' missing '+part);}
function luminance(hex){const rgb=hex.match(/../g).map(n=>parseInt(n,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4); return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];}
function contrast(a,b){const values=[luminance(a),luminance(b)].sort((a,b)=>a-b);return (values[1]+.05)/(values[0]+.05);}
assert.ok(contrast('c88828','211600')>=4.5); assert.ok(contrast('80500f','fff9f1')>=4.5); assert.ok(contrast('f2be70','18140f')>=4.5);
console.log('Brand images, favicon metadata, manifest and key color contrast passed.');
