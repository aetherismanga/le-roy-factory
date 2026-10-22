import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const base=path.resolve(process.env.WORKSPACE_ROOT||'..');
const roots={studio:process.env.STUDIO_SOURCE||path.join(base,'studio-work'),general:path.join(base,'randal-work/randal-general')};
const hosts={studio:'https://studio-one-beta-test-v2.vercel.app',general:'https://randal-catalogue-general-3d.vercel.app'};
const {chromium}=createRequire(path.join(base,'house-source/maison-3d-leroyfactory/package.json'))('playwright');
const checks=[],errors=[],failures=[],httpErrors=[];
const browser=await chromium.launch({headless:true,executablePath:'/root/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell',proxy:{server:process.env.HTTPS_PROXY||process.env.https_proxy},args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pass=s=>{checks.push(s);console.log('PASS',s);};
try{
 for(const kind of (process.env.VARIANTS||'studio,general').split(',')){
  const context=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:true,reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.__LRF_STANDALONE_PREVIEW__=true;localStorage.setItem('studio-one-render-quality','fluid');});
  if(!process.env.LIVE)await context.route('**/*',async route=>{
   const u=new URL(route.request().url());if(!Object.values(hosts).includes(u.origin))return route.continue();
   const variant=Object.keys(hosts).find(k=>hosts[k]===u.origin);
   if(u.pathname.startsWith('/manufacturer-materials/elios/')){const response=await route.fetch({url:'https://eliosceramica.com/'+u.pathname.slice('/manufacturer-materials/elios/'.length)});return route.fulfill({response});}
   const file=path.join(roots[variant],'dist',u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
   if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({body:fs.readFileSync(file),contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});
   return route.continue();
  });
  const p=await context.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(kind+': '+e.message));p.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))failures.push({kind,url:r.url(),error:r.failure()?.errorText});});p.on('response',r=>{if(r.status()>=400)httpErrors.push({kind,url:r.url(),status:r.status()});});
  await p.goto(hosts[kind]+'/atelier.html?standalone=1',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.studioOnePrototype&&document.querySelector('canvas')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
  for(const size of ['mobile','desktop']){
   if(size==='desktop')await p.setViewportSize({width:1365,height:930});
   await p.evaluate(()=>studioOnePrototype.handleObjectTap({editTarget:'wall:0'}));
   const panel=p.locator('#object-editor'),picker=panel.locator('[data-surface-picker=wall]');
   await picker.waitFor({state:'visible'});assert.equal(await picker.locator('[data-surface-brand]').count(),3);
   const before=await p.evaluate(()=>studioOnePrototype.getState().wallCollection);
   await picker.locator('[data-surface-brand=VIEW]').click();assert.equal(await p.evaluate(()=>studioOnePrototype.getState().wallCollection),before);
   const entries=await picker.locator('[data-surface-field=collection] option').evaluateAll(os=>os.map(o=>o.value));
   for(const name of ['OIKOS','LUX','COCO','PHURA'])assert.ok(entries.includes(name),name+' is listed');assert.ok(!entries.includes('Slate'));
   await picker.locator('[data-surface-field=collection]').selectOption('LUX');await picker.locator('[data-surface-color=topazio]').click();
   await picker.locator('[data-surface-field=format]').selectOption('30x120');
   let state=await p.evaluate(()=>studioOnePrototype.getState());assert.equal(state.wallCollection,'LUX');assert.equal(state.wall,'topazio');assert.equal(state.wallFinishes[0].format,'30x120');
   const report=await p.evaluate(()=>studioOnePrototype.quantityReport());assert.ok(report.rows.some(r=>r.brand==='VIEW'&&r.collection==='LUX'&&r.color==='topazio'&&r.format==='30x120'));
   const saved=await p.evaluate(()=>studioOnePrototype.exportProject());
   pass(kind+' '+size+': manufacturer → series → colour → actual size applies to the wall and measured quantities');
   await picker.locator('[data-surface-brand=ELIOS]').click();await picker.locator('[data-surface-field=collection]').selectOption('Slate');await picker.locator('[data-surface-color=river]').click();
   await p.waitForFunction(()=>studioOnePrototype.renovation().getDiagnostics().wallMaterials[0].faces===5,null,{timeout:90000});
   const overflow=await panel.evaluate(el=>({x:el.scrollWidth-el.clientWidth,h:el.clientHeight,screen:innerHeight,bottom:el.getBoundingClientRect().bottom,top:el.getBoundingClientRect().top}));assert.ok(overflow.x<3,JSON.stringify(overflow));if(size==='mobile')assert.ok(overflow.top>=0&&overflow.bottom<=overflow.screen,JSON.stringify(overflow));
   await picker.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode().catch(()=>{}))));await panel.evaluate(el=>el.scrollTop=0);await p.screenshot({path:path.join(base,'randal-qa','surface-picker-'+kind+'-'+size+'.png')});
   pass(kind+' '+size+': extended ELIOS list, authentic multiface Slate rendering and accessible vertical panel');
   const selectedBefore=await p.evaluate(()=>studioOnePrototype.getState().wallCollection);await picker.locator('[data-surface-field=collection]').selectOption('Lithos');
   await picker.locator('.surface-picker-note').waitFor({state:'visible'});assert.equal(await p.evaluate(()=>studioOnePrototype.getState().wallCollection),selectedBefore);assert.ok(await picker.locator('.surface-color:disabled').count());
   await picker.locator('[data-surface-brand=Peinture]').click();assert.equal(await p.evaluate(()=>studioOnePrototype.getState().wallCollection),'Peinture');assert.equal(await picker.locator('[data-surface-field=format]').isVisible(),false);
   await picker.locator('[data-surface-color=white]').click();await picker.locator('input[type=color]').evaluate(el=>{el.value='#aabbcc';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await p.evaluate(()=>studioOnePrototype.exportProject().walls[0].paintHex),'#aabbcc');
   pass(kind+' '+size+': paint remains independent and unavailable manufacturer imagery is never substituted');
   await p.evaluate(saved=>{if(!studioOnePrototype.restoreProject(saved))throw Error('Restore failed');},saved);state=await p.evaluate(()=>studioOnePrototype.getState());assert.equal(state.wallCollection,'LUX');assert.equal(state.wall,'topazio');assert.equal(state.wallFinishes[0].format,'30x120');
   await p.evaluate(()=>studioOnePrototype.handleObjectTap({editTarget:'floor'}));const floor=panel.locator('[data-surface-picker=floor]');assert.equal(await floor.locator('[data-surface-brand=Peinture]').count(),0);
   await floor.locator('[data-surface-brand=VIEW]').click();await floor.locator('[data-surface-field=collection]').selectOption('COCO');await floor.locator('[data-surface-color=light]').click();assert.equal(await floor.locator('[data-surface-field=format]').inputValue(),'40x60');assert.equal(await floor.locator('[data-surface-field=format] option').count(),1);assert.equal(await p.evaluate(()=>studioOnePrototype.exportProject().floor.format),'40x60');
   pass(kind+' '+size+': project restore preserves material and size; floor selection offers only compatible formats');
  }
  await p.locator('#object-editor-close').click();await p.locator('button[data-workspace=finishes]').click();const settings=p.locator('#floor-surface-library');await settings.waitFor({state:'visible'});await settings.locator('[data-surface-brand=ELIOS]').click();await settings.locator('[data-surface-field=collection]').selectOption('Slate');assert.equal(await p.evaluate(()=>studioOnePrototype.getState().floorCollection),'Slate');
  pass(kind+': the Finishes section uses the same complete manufacturer picker as the 3D context panel');
  await p.evaluate(()=>studioOnePrototype.renovation().showZone('wall',0));const zone=p.locator('#renovation-dialog');await zone.locator('[name=brand]').selectOption('ELIOS');await zone.locator('[name=collection]').selectOption('Slate');await zone.locator('[name=color]').selectOption('river');await zone.locator('[name=format]').selectOption('60x120');await zone.locator('[name=x]').fill('100');await zone.locator('[name=y]').fill('0');await zone.locator('[name=width]').fill('80');await zone.locator('[name=height]').fill('100');await p.locator('#apply-tile-zone').click();await zone.waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>studioOnePrototype.exportProject().walls[0].zones[0].collection),'Slate');pass(kind+': decorative wall zones filter series by manufacturer before colour and format');
  await p.evaluate(()=>{const a=studioOnePrototype;a.newBathroomProject();if(!a.addItem('bath',1,{kind:'rect',width:170,depth:75,apron:'tile',apronCollection:'Creta',apronColor:'avena'}))throw Error('Bath rejected');a.handleObjectTap({editTarget:'bath'});});const apron=p.locator('#object-editor [data-surface-picker=wall]');await apron.locator('[data-surface-brand=VIEW]').click();await apron.locator('[data-surface-field=collection]').selectOption('LUX');await apron.locator('[data-surface-color=topazio]').click();await apron.locator('[data-surface-field=format]').selectOption('30x120');const bath=await p.evaluate(()=>studioOnePrototype.getState().items.find(i=>i.type==='bath'));assert.equal(bath.settings.apronFormat,'30x120');assert.equal(bath.settings.apronColor,'topazio');assert.ok((await p.evaluate(()=>studioOnePrototype.quantityReport().rows)).filter(r=>r.label.startsWith('Baignoire')).every(r=>r.collection==='LUX'&&r.format==='30x120'));pass(kind+': tiled bath aprons use the same selection flow and the selected module is measured');
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(httpErrors,[]);
 const result={passed:true,checks,errors,failures,httpErrors,realEmailsSent:0,customerProjectsWritten:0};fs.writeFileSync(path.join(base,'randal-qa',process.env.LIVE?'surface-picker-live-results.json':'surface-picker-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}finally{await browser.close();}
