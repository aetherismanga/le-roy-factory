import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium,webkit,devices} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const output=process.env.LRF_PHOTO_QA_OUTPUT||'/tmp/lrf-photo-handoff-qa';fs.mkdirSync(output,{recursive:true});
const report={checks:[],failures:[],errors:[],requests:[],physicalDevices:false};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/test.html'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"></head><body><button id="launch">Photo</button></body></html>');}const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
try{
 for(const profile of [{name:'desktop',engine:chromium,options:{viewport:{width:1440,height:1000}}},{name:'android',engine:chromium,options:devices['Pixel 5']},{name:'iphone',engine:webkit,options:devices['iPhone 13']}]){
  const browser=await profile.engine.launch(profile.engine===webkit?{...(process.env.LRF_I18N_WEBKIT_EXECUTABLE?{executablePath:process.env.LRF_I18N_WEBKIT_EXECUTABLE}:{}),env:{...process.env,LIBGL_ALWAYS_SOFTWARE:'1'}}:{args:['--no-sandbox','--disable-dev-shm-usage']});
  try{for(const app of ['studio-one','randal-general'])for(const lang of ['fr','es']){
   const key=app+'-'+profile.name+'-'+lang,context=await browser.newContext(profile.options),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push({key,error:e.message}));page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))report.requests.push({key,url:r.url()});});
   try{
    await page.goto(base+'/test.html?lang='+lang);
    const first=await page.evaluate(async({app,lang})=>{
     const {initI18n,setLocale}=await import('/shared/lrf-3d/i18n/index.js');initI18n({selector:false});setLocale(lang);
     const {createPhotorealExport,buildPhotorealPrompt,buildPhotorealHandoff}=await import('/shared/lrf-3d/photoreal-export.js');
     const words=[],original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){words.push(text);return original.call(this,text,...args);};
     const image=document.createElement('canvas');image.width=1920;image.height=1080;const ctx=image.getContext('2d');ctx.fillStyle='#45a372';ctx.fillRect(0,0,1920,1080);const data=image.toDataURL('image/png');let captures=0;
     const project={client:{name:'PRIVATE_CLIENT_SENTINEL'},purchaseHT:'PRIVATE_PRICE_SENTINEL',room:{height:260,points:[[0,0],[450,0],[450,450],[0,450]]},floor:{collection:'Allure',color:'Safari',format:'60x120',purchaseHT:'PRIVATE_PRICE_SENTINEL'},items:[{type:'cabinet',settings:{width:80,finish:'Nogal Lincoln',reference:'REF-UNCHANGED-998',purchaseHT:'PRIVATE_PRICE_SENTINEL'},placement:{wall:1,u:140}}]};const before=JSON.stringify(project);
     const controller=createPhotorealExport({capture:async()=>{captures++;return data;},getProject:()=>project,getPrompt:p=>buildPhotorealPrompt(p,{name:app}),filename:app});
     window.photoTest={controller,setLocale,project,before,words,captures:()=>captures,buildPhotorealHandoff};
     if(!await controller.open(document.querySelector('#launch')))throw Error('Open failed');
     const link=document.querySelector('[data-photo-action=download]'),blob=await(await fetch(link.href)).blob(),decoded=new Image();decoded.src=URL.createObjectURL(blob);await decoded.decode();
     const check=document.createElement('canvas');check.width=1;check.height=1;check.getContext('2d').drawImage(decoded,0,0);const pixel=[...check.getContext('2d').getImageData(0,0,1,1).data];
     return {width:decoded.naturalWidth,height:decoded.naturalHeight,pixel,mime:blob.type,bytes:blob.size,words,projectUnchanged:JSON.stringify(project)===before,captures,filename:link.download,href:link.href,linkText:link.textContent,body:document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth};
    },{app,lang});
    assert.equal(first.width,1920);assert(first.height>1080);assert.equal(first.mime,'image/png');assert.deepEqual(first.pixel,[69,163,114,255]);assert(first.projectUnchanged);assert.equal(first.captures,1);assert(first.filename.endsWith('-chatgpt.png'));assert(!first.words.join(' ').includes('PRIVATE_'));assert(first.words.join(' ').includes('REF-UNCHANGED-998'));assert(!first.overflow);
    assert(first.words.some(w=>w.includes(lang==='es'?'INSTRUCCIONES PARA CHATGPT':'CONSIGNES POUR CHATGPT')));
    const text=first.words.join(' ');assert(text.includes(lang==='es'?'Crea directamente':'Crée directement'));assert.match(first.linkText,lang==='es'?/Descargar la imagen con las instrucciones/:/Télécharger l’image avec les consignes/);
    const downloadPromise=page.waitForEvent('download');await page.locator('[data-photo-action=download]').click();const download=await downloadPromise;assert.equal(await download.failure(),null);await download.saveAs(path.join(output,key+'-chatgpt.png'));
    const result=await page.evaluate(async lang=>{const test=window.photoTest,link=document.querySelector('[data-photo-action=download]'),old=link.href;test.words.length=0;test.setLocale(lang==='es'?'fr':'es');await new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(link.href!==old&&link.href.startsWith('blob:')){clearInterval(timer);resolve();}else if(Date.now()-start>20000){clearInterval(timer);reject(Error('Locale export not refreshed'));}},20);});return {words:test.words,captures:test.captures(),unchanged:JSON.stringify(test.project)===test.before};},lang);
    assert.equal(result.captures,1);assert(result.unchanged);assert(result.words.some(w=>w.includes(lang==='es'?'CONSIGNES POUR CHATGPT':'INSTRUCCIONES PARA CHATGPT')));
    await page.screenshot({path:path.join(output,key+'.png'),fullPage:true});report.checks.push(key);console.log('PASS',key,first.width+'x'+first.height,first.bytes+' bytes');
   }catch(error){report.failures.push({key,error:error.stack});}finally{await context.close();}
  }}finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
assert.deepEqual(report.failures,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);console.log('All',report.checks.length,'FR/ES PNG handoffs passed.');
