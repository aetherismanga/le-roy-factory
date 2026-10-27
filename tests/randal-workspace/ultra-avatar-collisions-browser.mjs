import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

// Read-only acceptance against actual dist bundles. Getters injected by this
// route are only for measurement; no diagnostic code enters the released app.
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const output=path.resolve(process.env.QA_OUTPUT||path.join(root,'..','qa-ultra-collisions'));
fs.mkdirSync(output,{recursive:true});
const origins={studio:'https://studio-one-beta-test-v2.vercel.app',general:'https://randal-catalogue-general-3d.vercel.app'};
const roots={studio:path.join(root,'studio-one/dist'),general:path.join(root,'randal-general/dist')};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.svg':'image/svg+xml'};
const checks=[],errors=[],avatarFailures=[],modelRequests=[],missingMedia=new Set(),measurements=[];
const pass=message=>{checks.push(message);console.log('PASS',message);};
const onePixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRFsAAAAASUVORK5CYII=','base64');
function instrument(bundle){
 const walk=bundle.match(/enterVisit:\(\)=>([$\w]+)\.setActive\(!0\)/)?.[1];
 const bindings=bundle.match(/getRoom:\(\)=>([$\w]+),getItems:\(\)=>([$\w]+)\?\.items\|\|\[\]/);
 const avatar=bundle.match(/avatar:([$\w]+)\?\.diagnostics\(\),glassReflections:/)?.[1];
 assert.ok(walk&&bindings&&avatar,'Expected visit/composition bindings in built app');
 return bundle+'\nwindow.__avatarCollisionQA={get walk(){return '+walk+'},get room(){return '+bindings[1]+'},get composition(){return '+bindings[2]+'},get avatar(){return '+avatar+'}};\n';
}
function save(passed,extra={}){fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed,checks,measurements,errors,avatarFailures,modelRequests,neutralManufacturerPlaceholders:[...missingMedia],...extra},null,2));}
async function snapshot(page,file){
 await page.evaluate(()=>{const raf=window.requestAnimationFrame,queued=[];window.requestAnimationFrame=cb=>{queued.push(cb);return 0;};window.__resumeCollisionSnapshot=()=>{window.requestAnimationFrame=raf;for(const cb of queued)raf.call(window,cb);delete window.__resumeCollisionSnapshot;};});
 try{await page.screenshot({path:file,timeout:90000});}finally{await page.evaluate(()=>window.__resumeCollisionSnapshot?.());}
}
// Integrate six seconds of held input through real controllers at 20 Hz. This
// makes assertions independent of the software renderer's wall-clock fps.
async function drive(page,seconds=6){return page.evaluate(seconds=>{
 const qa=__avatarCollisionQA,samples=[];
 for(let i=0;i<Math.ceil(seconds/.05);i++){qa.walk.tick(.05);qa.avatar.tick(.05);if(i%10===0)samples.push({position:qa.walk.position.toArray(),moving:qa.walk.moving,...qa.avatar.diagnostics()});}
 qa.walk.setView('first');return {position:qa.walk.position.toArray(),moving:qa.walk.moving,avatar:qa.avatar.diagnostics(),samples};
},seconds);}
async function cabinetBounds(page){return page.evaluate(()=>{
 const item=__avatarCollisionQA.composition.items.find(i=>i.type==='cabinet');if(!item)throw Error('No test cabinet');
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],point=item.root.position.clone();item.root.updateWorldMatrix(true,true);
 function visit(o){
  if(!o.visible||o.userData?.collision===false)return;
  if(o.isMesh&&o.geometry){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;if(b){const corners=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])corners.push(point.set(x,y,z).applyMatrix4(o.matrixWorld).toArray());if(Math.max(...corners.map(p=>p[1]))>.15&&Math.min(...corners.map(p=>p[1]))<1.65)for(const p of corners)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}}}
  for(const child of o.children||[])visit(child);
 }
 visit(item.root);return {id:item.id,min,max,placement:item.placement,dimensions:item.dimensions};
});}
async function resetApproach(page,bounds){
 await page.evaluate(({id,min,max})=>{
  const api=studioOnePrototype;api.exitVisit();api.selectItem(id);api.setView('front',true);api.enterVisit();
  const qa=__avatarCollisionQA;qa.walk.position.set((min[0]+max[0])/2,1.55,max[2]+1.05);qa.walk.setView('first');qa.avatar.tick(.05);
 },bounds);
 await page.waitForFunction(()=>studioOnePrototype.getDiagnostics().avatar.loaded||studioOnePrototype.getDiagnostics().avatar.failure,null,{timeout:120000});
 assert.equal(await page.evaluate(()=>studioOnePrototype.getDiagnostics().avatar.failure),'');
}
function assertStopped(result,bounds,label){
 const clearance=result.position[2]-bounds.max[2];
 assert.ok(clearance>=.29,label+': body must stay outside visible basin and 30 cm body radius: '+clearance);
 assert.ok(clearance<.43,label+': visitor can approach the cabinet: '+clearance);
 assert.equal(result.moving,false,label+': blocked input is not movement');
 assert.ok(result.avatar.locomotionSpeed<.01,label+': blocked input has zero measured speed');
 assert.ok(result.avatar.gaitBlend<.04,label+': walk animation relaxes after reaching obstacle');
 assert.equal(result.avatar.failure,'');
 const last=result.samples.at(-1),prior=result.samples.at(-2);
 assert.ok(Math.hypot(last.position[0]-prior.position[0],last.position[2]-prior.position[2])<.001,label+': held input cannot creep through obstacle');
 return {clearance,position:result.position,avatar:result.avatar};
}
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let activePage;
try{
 for(const variant of (process.env.VARIANTS||'studio,general').split(',')){
  const context=await browser.newContext({viewport:{width:720,height:600},deviceScaleFactor:1,ignoreHTTPSErrors:true,reducedMotion:'reduce',hasTouch:true});
  await context.addInitScript(()=>{window.__LRF_STANDALONE_PREVIEW__=true;localStorage.setItem('studio-one-render-quality','balanced');localStorage.setItem('randal-general-render-quality','balanced');});
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.pathname.startsWith('/api/'))return route.fulfill({json:u.pathname==='/api/projects'?{success:true,projects:[]}:{client:null,proHT:null,proRows:[],randalAllowed:false}});
   if(!['GET','HEAD'].includes(req.method()))return route.fulfill({status:405,body:'Read-only QA'});
   const kind=Object.keys(origins).find(k=>origins[k]===u.origin)||variant,relative=decodeURIComponent(u.pathname==='/'?'index.html':u.pathname).replace(/^\//,'');
   const candidates=[path.join(roots[kind],relative),path.join(root,relative),path.join(roots.studio,relative),path.join(roots.general,relative)],file=candidates.find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
   if(file){
    if(u.pathname==='/app.js')return route.fulfill({body:instrument(fs.readFileSync(file,'utf8')),contentType:'text/javascript'});
    const body=fs.readFileSync(file);if(u.pathname.endsWith('/avatar/jerome-v1/resident.glb'))modelRequests.push({variant,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')});
    return route.fulfill({body,contentType:mime[path.extname(file)]||'application/octet-stream'});
   }
   // Only manufacturer surface media may use a neutral local fixture. The
   // character must always load its exact real GLB and its real atlas maps.
   if(!u.pathname.includes('/avatar/')&&/\.(webp|png|jpe?g)$/i.test(u.pathname)){missingMedia.add(u.href);return route.fulfill({body:onePixel,contentType:'image/png'});}
   return route.fulfill({status:404,body:'Missing local QA file '+u.pathname});
  });
  const page=await context.newPage();activePage=page;page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push({variant,message:e.message}));page.on('response',r=>{if(r.url().includes('/avatar/')&&r.status()>=400)avatarFailures.push({url:r.url(),status:r.status()});});
  console.log('BOOT',variant);
  await page.goto(origins[variant]+'/atelier.html?standalone=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.studioOnePrototype&&window.__avatarCollisionQA&&document.querySelector('#scene')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
  console.log('READY',variant);
  await page.evaluate(()=>{
   const api=studioOnePrototype;for(const item of api.getState().items||[])if(!['window','door'].includes(item.type))api.removeItem(item.id);
   if(!api.addItem('cabinet',0,{width:100,top:'neris',placement:{wall:0,u:225,height:28}}))throw Error('Test cabinet could not be placed');
   if(!api.addItem('mirror',0,{mirrorModel:'metal-rect',width:120,height:80,placement:{wall:0,u:225,height:145}}))throw Error('Test mirror could not be placed');api.setQualityMode('max');api.enterVisit();
  });
  await page.waitForFunction(()=>studioOnePrototype.getDiagnostics().avatar.loaded||studioOnePrototype.getDiagnostics().avatar.failure,null,{timeout:120000});
  console.log('AVATAR',variant,JSON.stringify(modelRequests.at(-1)));
  assert.equal(await page.evaluate(()=>studioOnePrototype.getDiagnostics().avatar.failure),'');
  const bounds=await cabinetBounds(page);await resetApproach(page,bounds);
  console.log('APPROACH',variant,JSON.stringify(bounds));
  await page.keyboard.down('KeyW');let result;try{result=await drive(page,6);}finally{await page.keyboard.up('KeyW');}
  measurements.push({variant,input:'keyboard',...assertStopped(result,bounds,variant+' keyboard'),bounds});
  pass(variant+': six seconds of held forward input stop before real basin/vanity and relax gait');save(false,{inProgress:true});
  if(process.env.QA_CAPTURE==='all')await snapshot(page,path.join(output,variant+'-desktop-safe-mirror.png'));
  await page.setViewportSize({width:390,height:844});await resetApproach(page,bounds);
  const cdp=await context.newCDPSession(page);
  if(variant==='general'){
   const pad=await page.evaluate(()=>[...document.querySelector('#viewer').children].map(el=>({el,rect:el.getBoundingClientRect()})).filter(({el,rect})=>el.tagName==='DIV'&&rect.width>=114&&rect.width<=121&&el.style.borderRadius==='50%'&&!el.hidden).map(({rect})=>({x:rect.x+rect.width/2,y:rect.y+rect.height/2}))[0]);
   assert.ok(pad,'Mobile General visit displays joystick');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pad.x,y:pad.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pad.x,y:pad.y-44,id:1}]});
   try{result=await drive(page,6);}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   measurements.push({variant,input:'mobile joystick',...assertStopped(result,bounds,variant+' joystick'),bounds});pass(variant+': touch joystick preserves same body clearance and stops gait against basin');
  }else{
   const rect=await page.locator('#scene').boundingBox();assert.ok(rect);const x=rect.x+rect.width*.55,y=rect.y+rect.height*.55;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-25,y,id:1},{x:x+25,y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-25,y:y-80,id:1},{x:x+25,y:y-80,id:2}]});
   try{result=await drive(page,6);}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   measurements.push({variant,input:'mobile two-finger',...assertStopped(result,bounds,variant+' touch'),bounds});pass(variant+': two-finger smartphone movement preserves body clearance and stops gait');
  }
  save(false,{inProgress:true});
  const before=await page.evaluate(()=>studioOnePrototype.getDiagnostics().avatar.reflectionRevision);
  await page.waitForFunction(n=>studioOnePrototype.getDiagnostics().avatar.reflectionRevision>n,before,{timeout:60000});pass(variant+': idle animation continues updating reflected character');
  if(process.env.QA_CAPTURE!=='none')await snapshot(page,path.join(output,variant+'-mobile-safe-mirror.png'));
  await page.evaluate(()=>studioOnePrototype.setQualityMode('balanced'));await page.waitForFunction(()=>!studioOnePrototype.getDiagnostics().avatar.enabled);
  assert.equal(await page.evaluate(()=>studioOnePrototype.getDiagnostics().avatar.loaded),false);pass(variant+': leaving Ultra releases character after keyboard/touch use');
  await context.close();activePage=null;
 }
 assert.deepEqual(errors,[]);assert.deepEqual(avatarFailures,[]);save(true);console.log(JSON.stringify({passed:true,checks:checks.length,output,manufacturerPlaceholders:missingMedia.size}));
}catch(error){
 if(activePage){console.log('FAILURE',await activePage.evaluate(()=>({diagnostics:window.studioOnePrototype?.getDiagnostics(),error:document.querySelector('#error-text')?.textContent,status:document.querySelector('#placement-status')?.textContent})).catch(()=>null));if(process.env.QA_CAPTURE!=='none')await snapshot(activePage,path.join(output,'failure.png')).catch(()=>{});}
 save(false,{failure:String(error)});throw error;
}finally{await browser.close();}
