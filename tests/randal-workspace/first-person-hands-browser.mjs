import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

// Real application source, furniture, input dispatch, collision controller,
// renderer and rig. The suffix below exists only in this read-only test build.
// Scheduling is stepped deterministically so software-GPU timing cannot miss
// the sub-second reach or queue hundreds of Ultra frames during a screenshot.
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const output=process.env.QA_HANDS_OUTPUT||'/tmp/randal-first-person-hands';fs.mkdirSync(output,{recursive:true});
const variants=(process.env.QA_HANDS_VARIANTS||'general').split(',');
const origins={general:'https://randal-catalogue-general-3d.vercel.app',studio:'https://studio-one-beta-test-v2.vercel.app'};
const directories={general:'randal-general',studio:'studio-one'};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.hdr':'application/octet-stream','.svg':'image/svg+xml'};
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRFsAAAAASUVORK5CYII=','base64');
const checks=[],measurements=[],errors=[],missing=new Set();
const suffix=`
window.__firstPersonHandsQA={T,
 get avatar(){return visitorAvatar},get walk(){return walkMode},get camera(){return camera},get scene(){return scene},get composition(){return composition},
 step(seconds){for(let i=0;i<Math.round(seconds*60);i++){const dt=1/60;walkMode.tick(dt);advanceVisitOpenings(composition.items,dt,{reduced:false,visitor:visitorAvatar,drawerTravel});visitorAvatar.tick(dt);}return visitorAvatar.diagnostics()},
 renderWithoutArms(){const group=scene.getObjectByName('Jerome_bras_vue_visite'),before=group?.visible;if(group)group.visible=false;this.render();if(group)group.visible=before},
 render(){scene.updateMatrixWorld(true);renderer.shadowMap.needsUpdate=true;if(ultraPipeline)ultraPipeline.render(1/60);else renderer.render(scene,camera);renderer.getContext().finish();},
 project(object){const p=(object.isVector3?object.clone():new T.Box3().setFromObject(object).getCenter(new T.Vector3())).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,ndc:p.toArray()}},
 place(item,part){item.root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(item.root),centre=bounds.getCenter(new T.Vector3()),grip=part.isVector3?part.clone():new T.Box3().setFromObject(part).getCenter(new T.Vector3());walkMode.position.set(grip.x,1.55,bounds.max.z+.32);walkMode.setView('first');camera.position.copy(walkMode.position);camera.updateMatrixWorld(true);visitorAvatar.tick(.05);return {pitch:Math.atan2(grip.y-1.55,Math.hypot(grip.x-walkMode.position.x,grip.z-walkMode.position.z)),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},grip:grip.toArray(),position:walkMode.position.toArray()}},
 handProjection(){const p=visitorAvatar.diagnostics().interaction.contact;return p?this.project(new T.Vector3(...p)):null},
 mechanisms(){const item=window.__qaItem;return {door:item.motion.door,drawers:[...item.motion.drawers]}},
 meshes(){const primary=[];scene.traverseVisible(o=>{if(o.isSkinnedMesh)primary.push({name:o.name,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,visible:o.visible})});return primary}
};`;
function save(passed,extra={}){fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed,checks,measurements,errors,missingMedia:[...missing],...extra},null,2));}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let activePage;
try{
 for(const variant of variants){
  const sourcePath=path.join(root,directories[variant],'src/app.js');
  // Keep the manually rendered frame available between static screenshots.
  const source=fs.readFileSync(sourcePath,'utf8').replace('new T.WebGLRenderer({canvas,','new T.WebGLRenderer({preserveDrawingBuffer:true,canvas,');
  const result=await build({stdin:{contents:source+suffix,resolveDir:path.dirname(sourcePath),sourcefile:'app.js'},bundle:true,format:'esm',target:['es2020'],minify:true,write:false});
  const app=result.outputFiles[0].contents,dist=path.join(root,directories[variant],'dist');
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,ignoreHTTPSErrors:true,reducedMotion:'no-preference'});
  await context.addInitScript(()=>{window.__LRF_STANDALONE_PREVIEW__=true;localStorage.setItem('studio-one-render-quality','balanced');localStorage.setItem('randal-general-render-quality','balanced');window.__qaRAF=[];window.requestAnimationFrame=cb=>{window.__qaRAF.push(cb);return 0;};});
  await context.route('**/*',route=>{
   const request=route.request(),u=new URL(request.url());
   if(u.pathname.startsWith('/api/'))return route.fulfill({json:u.pathname==='/api/projects'?{success:true,projects:[]}:{client:null,proHT:null,proRows:[],randalAllowed:false}});
   if(!['GET','HEAD'].includes(request.method()))return route.fulfill({status:405,body:'Read-only QA'});
   if(u.pathname==='/app.js')return route.fulfill({body:Buffer.from(app),contentType:'text/javascript'});
   const relative=decodeURIComponent(u.pathname==='/'?'index.html':u.pathname).replace(/^\//,'');
   const candidates=[path.join(dist,relative),path.join(root,relative),path.join(root,'studio-one/dist',relative),path.join(root,'randal-general/dist',relative)];
   const file=candidates.find(file=>fs.existsSync(file)&&fs.statSync(file).isFile());
   if(file)return route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
   if(!u.pathname.includes('/avatar/')&&/\.(webp|png|jpe?g)$/i.test(u.pathname)){missing.add(u.href);return route.fulfill({body:pixel,contentType:'image/png'});}
   return route.fulfill({status:404,body:'Missing read-only QA asset '+u.pathname});
  });
  const page=await context.newPage();activePage=page;page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push({variant,message:e.message}));
  await page.goto(origins[variant]+'/atelier.html?standalone=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.studioOnePrototype&&window.__firstPersonHandsQA&&document.querySelector('#scene')?.getAttribute('aria-busy')==='false',null,{timeout:120000,polling:100});
  console.log('READY',variant);
  for(const kind of ['cabinet','door']){
   const setup=await page.evaluate(kind=>{
    const api=studioOnePrototype,qa=__firstPersonHandsQA;if(qa.walk.active)api.exitVisit();
    for(const item of [...qa.composition.items])api.removeItem(item.id);
    const added=api.addItem(kind,0,{...(kind==='cabinet'&&location.hostname.startsWith('randal-')?{format:'luce-single'}:{}),width:kind==='cabinet'?80:83,placement:{wall:0,u:225,height:kind==='cabinet'?28:0}});if(!added)throw Error('Could not place '+kind);
    const item=qa.composition.items.find(i=>i.type===kind);api.selectItem(item.id);api.setView('front',true);api.setQualityMode('max');api.enterVisit();qa.avatar.sync();
    return {itemId:item.id};
   },kind);
   await page.waitForFunction(()=>studioOnePrototype.getDiagnostics().avatar.loaded||studioOnePrototype.getDiagnostics().avatar.failure,null,{timeout:120000,polling:100});
   assert.equal(await page.evaluate(()=>studioOnePrototype.getDiagnostics().avatar.failure),'');
   const fixture=await page.evaluate(({itemId,kind})=>{
    const qa=__firstPersonHandsQA,T=qa.T,item=qa.composition.items.find(i=>i.id===itemId),part=kind==='cabinet'?item.asset.drawers[0]:(item.asset.doors?.[0]||item.asset.door);let grip;
    part.traverse(o=>{if(!grip&&o.isMesh&&/Poign[eé]e|Bequille/i.test(o.name)&&!/_tige|Rosace/.test(o.name))grip=o;});if(!grip&&kind==='cabinet')part.traverse(o=>{if(!grip&&o.isMesh&&/^Facade/i.test(o.name))grip=o;});if(!grip)throw Error('No real grip '+kind);
    const gripBox=new T.Box3().setFromObject(grip),gripPoint=gripBox.getCenter(qa.walk.position.clone());if(/^Facade/i.test(grip.name)){gripPoint.y=gripBox.max.y-.008;gripPoint.z=gripBox.max.z+.003;}
    window.__qaItem=item;window.__qaGrip=gripPoint;window.__qaTapPoint=gripBox.getCenter(new T.Vector3());if(/^Facade/i.test(grip.name)){__qaTapPoint.x+=Math.min(.12,(gripBox.max.x-gripBox.min.x)*.3);__qaTapPoint.z=gripBox.max.z+.001;}
    const fixture=qa.place(item,gripPoint);qa.step(.2);return {...fixture,...qa.project(gripPoint),name:grip.name};
   },{...setup,kind});
   const rect=await page.locator('#scene').boundingBox(),cdp=await context.newCDPSession(page);
   const x=rect.x+rect.width*.84,y=rect.y+rect.height*.32,dy=-fixture.pitch/.004;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+dy,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
   Object.assign(fixture,await page.evaluate(()=>{const qa=__firstPersonHandsQA;qa.step(.1);qa.render();return {...qa.project(__qaGrip),tap:qa.project(__qaTapPoint)}}));
   console.log('FIXTURE',variant,kind,JSON.stringify(fixture));
   assert.ok(fixture.ndc[0]>-1&&fixture.ndc[0]<1&&fixture.ndc[1]>-1&&fixture.ndc[1]<1,'Real grip is on screen');
   await page.screenshot({path:path.join(output,variant+'-'+kind+'-before.png'),timeout:90000});
   await page.touchscreen.tap(fixture.tap.x,fixture.tap.y);
   const begun=await page.evaluate(()=>__firstPersonHandsQA.avatar.diagnostics());
   console.log('BEGUN',kind,JSON.stringify(begun.visitAction));assert.equal(begun.visitAction.active,true,'Actual mobile touch starts a reachable avatar gesture');
   let d=await page.evaluate(()=>{const qa=__firstPersonHandsQA;qa.step(.2);qa.render();return qa.avatar.diagnostics()});
   assert.equal(d.firstPersonArms.visible,true,'Actual skinned hand is enabled in primary view during reach');
   measurements.push({variant,kind,phase:'reach',avatar:d,meshes:await page.evaluate(()=>__firstPersonHandsQA.meshes())});
   await page.screenshot({path:path.join(output,variant+'-'+kind+'-reach.png'),timeout:90000});
   for(let i=0;i<8&&!d.visitAction.committed;i++)d=await page.evaluate(()=>{const qa=__firstPersonHandsQA;qa.step(.05);return qa.avatar.diagnostics()});
   assert.equal(d.firstPersonArms.visible,true,'Actual skinned hand remains visible at grip');
   assert.equal(await page.locator('[aria-label="Commandes de visite"]').isHidden(),true,'Help no longer masks the gripping palm');
   assert.equal(d.visitAction.committed,true,'Mechanism commits only after real palm reaches grip');
   await page.evaluate(()=>__firstPersonHandsQA.render());
   const palmProjection=await page.evaluate(()=>__firstPersonHandsQA.handProjection());assert.ok(palmProjection&&Math.abs(palmProjection.ndc[0])<.8&&Math.abs(palmProjection.ndc[1])<.8,'Contact palm is visibly inside primary camera, away from screen border');
   measurements.push({variant,kind,phase:'contact',avatar:d,palmProjection,meshes:await page.evaluate(()=>__firstPersonHandsQA.meshes())});
   await page.screenshot({path:path.join(output,variant+'-'+kind+'-contact.png'),timeout:90000});
   await page.evaluate(()=>__firstPersonHandsQA.renderWithoutArms());await page.screenshot({path:path.join(output,variant+'-'+kind+'-contact-without-arms.png'),timeout:90000});await page.evaluate(()=>__firstPersonHandsQA.render());
   d=await page.evaluate(()=>{const qa=__firstPersonHandsQA;qa.step(.35);qa.render();return qa.avatar.diagnostics()});
   const mechanism=await page.evaluate(()=>__firstPersonHandsQA.mechanisms());assert.ok(kind==='cabinet'?mechanism.drawers[0]>.005:mechanism.door>.005,'Actual mechanism progressively follows the contacted hand');
   measurements.push({variant,kind,phase:'follow',avatar:d,mechanism,meshes:await page.evaluate(()=>__firstPersonHandsQA.meshes())});
   await page.screenshot({path:path.join(output,variant+'-'+kind+'-follow.png'),timeout:90000});
   assert.ok((await page.evaluate(()=>__firstPersonHandsQA.meshes())).every(mesh=>/^Bras_visite_/.test(mesh.name)),'Primary skinned draws contain only the isolated arm');
   assert.equal(d.visible,false,'Full head/body never enters primary view');
   d=await page.evaluate(()=>{const qa=__firstPersonHandsQA;qa.step(2);qa.render();return qa.avatar.diagnostics()});
   measurements.push({variant,kind,phase:'return',avatar:d,meshes:await page.evaluate(()=>__firstPersonHandsQA.meshes())});
   await page.screenshot({path:path.join(output,variant+'-'+kind+'-return.png'),timeout:90000});
   assert.equal(d.visitAction.active,false,'Hand returns after gesture');
   assert.equal(d.firstPersonArms.visible,false,'Direct arm hides again after its return');
   if(variant==='general')assert.equal(await page.locator('[aria-label="Commandes de visite"]').isVisible(),true,'Help returns after gesture');
   checks.push(variant+' mobile '+kind+': actual canvas touch, reachable palm contact, follow and return rendered by app primary camera');console.log('PASS',checks.at(-1));save(false,{inProgress:true});
  }
  await context.close();activePage=null;
 }
 assert.deepEqual(errors,[]);save(true);console.log(JSON.stringify({passed:true,checks:checks.length,output}));
}catch(error){if(activePage){console.log('FAILURE',await activePage.evaluate(()=>({diagnostics:window.studioOnePrototype?.getDiagnostics(),status:document.querySelector('#placement-status')?.textContent})).catch(()=>null));await activePage.screenshot({path:path.join(output,'failure.png'),timeout:90000}).catch(()=>{});}save(false,{failure:String(error)});throw error;}
finally{await browser.close();}
