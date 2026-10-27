import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

// Uses the actual built applications and renderer. All commercial/project APIs
// are intercepted: this acceptance run never writes a customer's remote data.
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const output=path.resolve(process.env.QA_OUTPUT||path.join(root,'..','qa-ultra-avatar'));
fs.mkdirSync(output,{recursive:true});
const origins={studio:'https://studio-one-beta-test-v2.vercel.app',general:'https://randal-catalogue-general-3d.vercel.app'};
const roots={studio:path.join(root,'studio-one/dist'),general:path.join(root,'randal-general/dist')};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.svg':'image/svg+xml'};
const checks=[],errors=[],assetErrors=[],requests=[];
const pass=message=>{checks.push(message);console.log('PASS',message);};
async function snapshot(page,file){
 // Freeze only scheduling after a real Ultra frame. SwiftShader otherwise
 // continuously queues mirror + glazing captures while Chromium reads pixels.
 await page.evaluate(()=>{
  const original=window.requestAnimationFrame,queued=[];
  window.requestAnimationFrame=callback=>{queued.push(callback);return 0;};
  window.__resumeAvatarQASnapshot=()=>{window.requestAnimationFrame=original;for(const callback of queued)original.call(window,callback);delete window.__resumeAvatarQASnapshot;};
 });
 try{await page.screenshot({path:file,timeout:90000});}
 finally{await page.evaluate(()=>window.__resumeAvatarQASnapshot?.());}
}
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),...(process.env.HTTPS_PROXY||process.env.https_proxy?{proxy:{server:process.env.HTTPS_PROXY||process.env.https_proxy}}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let activePage;
try{
 for(const variant of (process.env.VARIANTS||'studio,general').split(',')){
  const context=await browser.newContext({viewport:{width:720,height:540},deviceScaleFactor:1,ignoreHTTPSErrors:true,reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   window.__LRF_STANDALONE_PREVIEW__=true;
   localStorage.setItem('studio-one-render-quality','balanced');
   localStorage.setItem('randal-general-render-quality','balanced');
  });
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.pathname.startsWith('/api/'))return route.fulfill({json:u.pathname==='/api/projects'?{success:true,projects:[]}:{client:null,proHT:null,proRows:[],randalAllowed:false}});
   if(!['GET','HEAD'].includes(req.method()))return route.fulfill({status:405,body:'Read-only QA'});
   const kind=Object.keys(origins).find(k=>origins[k]===u.origin);
   if(!kind)return route.continue();
   if(u.pathname.includes('/avatar/'))requests.push({variant,url:u.href});
   const normal=path.join(roots[kind],decodeURIComponent(u.pathname==='/'?'index.html':u.pathname));
   const candidates=[normal];
   if(u.pathname.startsWith('/shared/avatar/'))candidates.push(path.join(root,'shared/avatar',u.pathname.slice('/shared/avatar/'.length)));
   const file=candidates.find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
   if(file)return route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
   // Texture proxies are read-only. Use the configured deployment for media
   // absent from the checkout, as production does for manufacturer originals.
   if(/\.(webp|png|jpg|jpeg|hdr)$/.test(u.pathname)||u.pathname.startsWith('/manufacturer-materials/'))return route.continue();
   return route.fulfill({status:404,body:'Missing QA file '+u.pathname});
  });
  const page=await context.newPage();activePage=page;
  page.on('pageerror',error=>errors.push({variant,message:error.message}));
  page.on('response',response=>{if(response.url().includes('/avatar/')&&response.status()>=400)assetErrors.push({variant,url:response.url(),status:response.status()});});
  page.setDefaultTimeout(45000);
  await page.goto(origins[variant]+'/atelier.html?standalone=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.studioOnePrototype&&document.querySelector('#scene')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
  await page.evaluate(()=>{
   const api=studioOnePrototype;
   const item=api.addItem('mirror',0,{mirrorModel:'zen',width:120,height:80,led:true,placement:{wall:0,u:225,height:145}});
   if(!item)throw Error('Acceptance mirror could not be placed');
   api.setView('front',true);
  });
  const before=requests.length;
  assert.equal(await page.locator('.visitor-avatar-button').count(),0,'No obsolete avatar chooser overlays the visit');
  let diagnostics=await page.evaluate(()=>studioOnePrototype.getDiagnostics());
  assert.equal(diagnostics.qualityMode,'balanced');
  assert.equal(diagnostics.avatar.loaded,false);
  assert.equal(diagnostics.avatar.enabled,false);
  assert.equal(requests.length,before);
  pass(variant+': ordinary editing has no avatar request or obsolete Avatar control');

  await page.evaluate(()=>studioOnePrototype.setQualityMode('max'));
  await page.waitForFunction(()=>studioOnePrototype.getDiagnostics().qualityMode==='max');
  await page.waitForTimeout(500);
  assert.equal(requests.length,before,'Ultra editing must not fetch the character');
  assert.equal(await page.evaluate(()=>studioOnePrototype.getDiagnostics().avatar.enabled),false);
  pass(variant+': Ultra alone does not load the character outside a visit');

  await page.evaluate(()=>{studioOnePrototype.setQualityMode('auto');studioOnePrototype.setView('front',true);});
  await page.locator('.walk-toggle').click({force:true});
  await page.waitForFunction(()=>studioOnePrototype.getDiagnostics().walk.active);
  await page.waitForTimeout(500);
  assert.equal(requests.length,before,'Automatic profile must never opt into the avatar');
  assert.equal(await page.evaluate(()=>studioOnePrototype.getDiagnostics().avatar.enabled),false);
  pass(variant+': visiting in Automatic keeps the character disabled');
  await page.locator('.walk-toggle').click({force:true});

  await page.evaluate(()=>{studioOnePrototype.setView('front',true);studioOnePrototype.setQualityMode('max');});
  await page.locator('.walk-toggle').click({force:true});
  await page.waitForFunction(()=>studioOnePrototype.getDiagnostics().avatar.loaded||studioOnePrototype.getDiagnostics().avatar.failure,null,{timeout:120000});
  diagnostics=await page.evaluate(()=>studioOnePrototype.getDiagnostics());
  assert.equal(diagnostics.avatar.failure,'');
  assert.equal(diagnostics.avatar.loaded,true);
  assert.equal(diagnostics.avatar.enabled,true);
  assert.equal(diagnostics.avatar.visible,false,'The first-person camera must not see the inside of its own head');
  assert.equal(diagnostics.avatar.bodyReflectionOnly,true);
  assert.equal(diagnostics.avatar.firstPersonArms.visible,false,'Arms remain at rest until a handle is reached');
  assert.ok(diagnostics.avatar.bones>40,'A rigged body, not a flat image, is loaded');
  assert.ok(requests.length>before,'The real character assets were requested');
  await page.waitForFunction(()=>studioOnePrototype.getDiagnostics().avatar.captureCount>0,null,{timeout:60000});
  diagnostics=await page.evaluate(()=>studioOnePrototype.getDiagnostics());
  assert.equal(diagnostics.glassReflections.failure,'');
  assert.ok(diagnostics.glassReflections.targets<=2,'Glazing must respect its GPU target budget');
  assert.ok(diagnostics.glassReflections.captures>0,'The existing visible glazing captures the real reflected scene');
  await snapshot(page,path.join(output,variant+'-ultra-mirror.png'));
  pass(variant+': Ultra visit keeps the rigged body in reflections and the direct-view arms at rest');

  const start=await page.evaluate(()=>studioOnePrototype.getDiagnostics().avatar);
  await page.keyboard.down('KeyW');
  try{await page.waitForFunction(position=>{
   const next=studioOnePrototype.getDiagnostics().avatar.position;
   return Math.hypot(next[0]-position[0],next[2]-position[2])>.06;
  },start.position,{timeout:30000});}finally{await page.keyboard.up('KeyW');}
  const moved=await page.evaluate(()=>studioOnePrototype.getDiagnostics());
  assert.ok(Math.abs(moved.avatar.position[0]-moved.walk.position[0])<.3);
  assert.ok(Math.abs(moved.avatar.position[2]-moved.walk.position[2])<.3);
  assert.ok(moved.avatar.reflectionRevision>start.reflectionRevision);
  const captures=moved.avatar.captureCount;
  await page.waitForFunction(c=>studioOnePrototype.getDiagnostics().avatar.captureCount>c,captures,{timeout:30000});
  pass(variant+': movement follows the actual visitor and idle animation refreshes mirror capture');

  await page.evaluate(()=>studioOnePrototype.setQualityMode('balanced'));
  await page.waitForFunction(()=>!studioOnePrototype.getDiagnostics().avatar.enabled);
  diagnostics=await page.evaluate(()=>studioOnePrototype.getDiagnostics());
  assert.equal(diagnostics.avatar.visible,false);
  assert.equal(diagnostics.glassReflections.enabled,false);
  assert.equal(diagnostics.glassReflections.targets,0);
  pass(variant+': returning to Standard hides the character and releases active glass reflections');
  await page.evaluate(()=>studioOnePrototype.setQualityMode('max'));
  await page.waitForFunction(()=>studioOnePrototype.getDiagnostics().avatar.enabled);
  await page.locator('.walk-toggle').click({force:true});
  await page.waitForFunction(()=>!studioOnePrototype.getDiagnostics().walk.active&&!studioOnePrototype.getDiagnostics().avatar.enabled);
  diagnostics=await page.evaluate(()=>studioOnePrototype.getDiagnostics());
  assert.equal(diagnostics.avatar.visible,false);
  assert.equal(diagnostics.glassReflections.targets,0);
  pass(variant+': leaving the visit clears character visibility and glass render targets');

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>studioOnePrototype.setQualityMode('auto'));
  await page.locator('.walk-toggle').click({force:true});
  await page.waitForFunction(()=>studioOnePrototype.getDiagnostics().walk.active);
  diagnostics=await page.evaluate(()=>studioOnePrototype.getDiagnostics());
  assert.equal(diagnostics.avatar.enabled,false);
  assert.equal(diagnostics.glassReflections.targets,0);
  await page.locator('.walk-toggle').click({force:true});
  pass(variant+': smartphone viewport retains visit controls and Automatic keeps the Ultra-only character off');
  await context.close();activePage=null;
 }
 assert.deepEqual(errors,[]);
 assert.deepEqual(assetErrors,[]);
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,checks,errors,assetErrors,requests},null,2));
 console.log(JSON.stringify({passed:true,checks:checks.length,output}));
}catch(error){
 if(activePage){
  console.log('FAILURE',await activePage.evaluate(()=>({diagnostics:window.studioOnePrototype?.getDiagnostics(),error:document.querySelector('#error-text')?.textContent,status:document.querySelector('#placement-status')?.textContent})).catch(()=>null));
  await snapshot(activePage,path.join(output,'failure.png')).catch(()=>{});
 }
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,checks,errors,assetErrors,requests,failure:String(error)},null,2));
 throw error;
}finally{await browser.close();}
