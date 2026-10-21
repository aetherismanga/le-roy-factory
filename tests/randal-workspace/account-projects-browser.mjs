import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const base=path.resolve(process.env.WORKSPACE_ROOT||'..'),studio=path.join(base,'studio-work'),general=path.join(base,'randal-work/randal-general'),site=path.join(base,'randal-work');
const {chromium}=createRequire(path.join(base,'house-source/maison-3d-leroyfactory/package.json'))('playwright');
const hosts={studio:'https://studio-one-beta-test-v2.vercel.app',general:'https://randal-catalogue-general-3d.vercel.app',site:'https://leroyfactory.fr'};
const handlers={studio:(await import(pathToFileURL(path.join(studio,'api/commercial.js')))).default,general:(await import(pathToFileURL(path.join(general,'api/commercial.js')))).default};
const guideds={studio:await import(pathToFileURL(path.join(studio,'src/commerce/guided.js'))),general:await import(pathToFileURL(path.join(general,'src/commerce/guided.js')))};
const token='synthetic-site-session-'+('a'.repeat(64)),client={id:'synthetic-customer',codeClient:'LRF-00003',departement:'05',societe:'Magasin de test LRF',partenaires:['randal-pro']};
const cloud=new Map(),requests=[],checks=[],errors=[];let diagnostic;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{const name=new URL(url).pathname.split('/').at(-1),body=JSON.parse(options?.body||'{}');if(name==='validateProSession'){await new Promise(r=>setTimeout(r,250));return{status:body.sessionToken===token?200:401,ok:body.sessionToken===token,json:async()=>body.sessionToken===token?{success:true,client}:{success:false}};}if(name==='getAccountClientPrefill')return{status:200,ok:true,json:async()=>({success:true,client})};throw Error('Unexpected synthetic upstream '+name);};
const browser=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell',headless:true,...(process.env.https_proxy||process.env.HTTPS_PROXY?{proxy:{server:process.env.https_proxy||process.env.HTTPS_PROXY}}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pass=s=>{checks.push(s);console.log('PASS',s);};
const decodedImage=async locator=>{await locator.scrollIntoViewIfNeeded();return locator.evaluate(async img=>{await img.decode();return img.naturalWidth>100;});};
try{
 const context=await browser.newContext({viewport:{width:1365,height:900},ignoreHTTPSErrors:true,reducedMotion:'reduce'});
 await context.addInitScript(({token,client})=>{localStorage.setItem('studio-one-render-quality','fluid');if(location.origin==='https://leroyfactory.fr'){window.__LRF_FIREBASE_ADMIN_WATCH__=true;sessionStorage.setItem('lrfProSessionToken',token);sessionStorage.setItem('lrfProSession',JSON.stringify({...client,sessionToken:token,verifiedAt:Date.now()}));}else if(location.origin==='https://studio-one-beta-test-v2.vercel.app')sessionStorage.setItem('studio-one-auth-manual','1');else if(location.origin==='https://randal-catalogue-general-3d.vercel.app')sessionStorage.setItem('randal-general-auth-manual','1');},{token,client});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),kind=u.origin===hosts.studio?'studio':u.origin===hosts.general?'general':null;
  if(kind&&u.pathname==='/api/commercial'){
   const body=req.postDataJSON();requests.push({kind,action:body.action});const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
   await handlers[kind]({method:'POST',headers:{...req.headers(),host:u.host},body},res);if(body.action==='session'&&!req.headers().authorization)await new Promise(r=>setTimeout(r,400));
   // Deliberately omit Set-Cookie: embedded sessions must work with cookies blocked.
   return route.fulfill({status:res.code||200,json:res.body});
  }
  if(kind&&u.pathname==='/api/projects'){
   const b=req.postDataJSON();if(req.headers().authorization!=='Bearer '+token)return route.fulfill({status:401,json:{error:'Compte requis'}});
   if(b.action==='list')return route.fulfill({json:{projects:[...cloud.values()].filter(r=>r.variant===kind),deletedIds:[]}});
   if(b.action==='save'){const old=cloud.get(b.record.id),r={...b.record,variant:kind,number:old?.number||'LRF-2026-000'+(cloud.size+1),status:'draft',revision:(old?.revision||0)+1,updatedAt:new Date().toISOString(),date:new Date().toISOString()};cloud.set(r.id,r);return route.fulfill({json:{record:r,success:true}});}
   return route.fulfill({json:{success:true}});
  }
  if(u.hostname==='us-central1-le-roy-factory.cloudfunctions.net')return route.fulfill({json:{success:true,client}});
  let root=kind?path.join(kind==='studio'?studio:general,'dist'):u.origin===hosts.site?site:null;
  if(root&&!u.pathname.startsWith('/api/')){const f=path.join(root,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'})[path.extname(f)]||'application/octet-stream'});}
  return route.continue();
 });
 const p=await context.newPage();diagnostic=p;p.setDefaultTimeout(45000);p.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
 for(const kind of ['studio','general']){
  // Old direct bookmarks now enter the existing first-party site wrapper.
  await p.goto(hosts[kind]+'/',{waitUntil:'domcontentloaded'});await p.waitForURL('https://leroyfactory.fr/*');
  let frame=p.frames().find(f=>f.url().startsWith(hosts[kind]));if(!frame)frame=await p.waitForEvent('framenavigated',{predicate:f=>f.url().startsWith(hosts[kind])});
  await frame.locator('#new-project').click();if(kind==='general')await frame.locator('[data-collection=harmony]').click();await frame.locator('[data-model="'+(kind==='studio'?'two':'harmony-three')+'"]').click();await frame.locator('#next').click();await frame.locator('#next').click();await frame.locator('[data-choice="'+(kind==='studio'?'bare':'none')+'"]').click();for(let i=0;i<3;i++)await frame.locator('#next').click();
  await frame.waitForFunction(()=>document.querySelector('#quote-private .pro-reference')?.textContent.startsWith('LRF-00003')&&!document.querySelector('#quote-private').textContent.includes('Vérification'),null,{timeout:60000});
  const reference=await frame.locator('#quote-private .pro-reference').textContent();assert.equal(reference,kind==='studio'?'LRF-00003-220-00':'LRF-00003');if(kind==='general')assert.match(await frame.locator('#quote-private').textContent(),/sur demande/);
  assert.ok(requests.filter(r=>r.kind===kind&&r.action==='exchange').length<=2);
  pass(kind+': direct link reuses the real site bridge, overrides a stale local logout and shows only the verified purchase reference');
  await frame.locator('.account-details summary').click();await frame.locator('#account-open').click();assert.equal(await frame.locator('#account-form').isVisible(),false);assert.equal(await frame.locator('#account-connected').isVisible(),true);assert.equal(await frame.locator('[name=departement]').getAttribute('placeholder'),null);assert.equal(await frame.locator('[name=departement]').inputValue(),'');await frame.locator('#account-close').click();
  pass(kind+': connected account opens verified information, without the login form or 34');
  await frame.waitForFunction(()=>document.querySelector('#preview-status').hidden,null,{timeout:180000});await frame.locator('#save-composition').click();await frame.locator('#lrf-project-workspace [name=title]').fill('Dossier '+kind);await frame.locator('#lrf-project-workspace [name=name]').fill('Client témoin');await frame.locator('#lrf-project-workspace button[type=submit]').click();await frame.waitForFunction(()=>!document.querySelector('#lrf-project-workspace').open);
  const saved=await frame.evaluate(key=>JSON.parse(localStorage.getItem(key)).find(r=>r.title.startsWith('Dossier ')),kind==='studio'?'studio-one-projects':'randal-general-projects');assert.match(saved.thumbnail,/^data:image\/webp;base64,/);assert.equal(saved.remote,true);assert.equal(cloud.get(saved.id).thumbnail,saved.thumbnail);
  cloud.set('project-history-'+kind,{...saved,id:'project-history-'+kind,title:'Ancienne commande '+kind,status:'validated',thumbnail:null,variant:kind});
  await frame.locator('#brand-home').click();await frame.locator('#saved-projects').click();const row=frame.locator('.lrf-project-row').filter({hasText:'Dossier '+kind});await row.waitFor();assert.match(await row.innerText(),/Devis en cours/);assert.match(await row.innerText(),/TTC/);assert.ok(await decodedImage(row.locator('img')));assert.equal(await frame.locator('.lrf-project-row.validated').count(),1);assert.match(await frame.locator('.lrf-project-row.validated').innerText(),/Commande validée/);assert.match(await frame.locator('.lrf-project-row.validated img').getAttribute('src'),/^data:image\/svg/);
  await p.setViewportSize({width:390,height:844});assert.ok(await frame.evaluate(()=>document.querySelector('#lrf-project-workspace').scrollWidth<=document.querySelector('#lrf-project-workspace').clientWidth+2));await p.screenshot({path:path.join(base,'randal-qa','account-projects-'+kind+'-mobile.png')});
  pass(kind+': projects show their actual thumbnail, TTC amount and quote/order status; old projects receive their own plan preview');
  await frame.locator('#lrf-project-workspace .lrf-project-close').click();await p.setViewportSize({width:1365,height:900});
  if(kind==='studio'){
   await frame.locator('#resume-project').click();await frame.locator('#open-3d').click();await frame.waitForFunction(()=>document.querySelector('canvas')?.getAttribute('aria-busy')==='false',null,{timeout:180000});await frame.waitForFunction(()=>document.querySelector('.studio-commerce .pro-reference')?.textContent==='LRF-00003-220-00',null,{timeout:60000});
   await frame.locator('#project-menu summary').click();await frame.locator('#save-project').click();await frame.locator('#lrf-project-workspace button[type=submit]').click();await frame.waitForFunction(()=>!document.querySelector('#lrf-project-workspace').open);await frame.locator('#project-menu summary').click();await frame.locator('#open-projects').click();const r=frame.locator('.lrf-project-row').filter({hasText:'Dossier studio'});await r.waitFor();assert.ok(await decodedImage(r.locator('img')));pass('Studio purchase code and actual 3D thumbnail survive guided selection → workshop → saved projects');await frame.locator('#lrf-project-workspace .lrf-project-close').click();
  }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(base,'randal-qa','account-projects-results.json'),JSON.stringify({checks,requests,errors},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,errors}));
}catch(e){console.log('FAIL',e.message);if(diagnostic)await diagnostic.screenshot({path:path.join(base,'randal-qa','account-projects-failure.png')}).catch(()=>{});throw e;}finally{globalThis.fetch=originalFetch;await browser.close();}
