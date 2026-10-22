import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const root=path.resolve('.'),base=path.dirname(root),output=path.join(base,'randal-qa');fs.mkdirSync(output,{recursive:true});
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||path.join(base,'house-source/maison-3d-leroyfactory/package.json'))('playwright');
const fixture=path.join(os.tmpdir(),'lrf-start-preview-fixture.js');
await build({stdin:{contents:"export {createPreview} from './src/commerce/live-preview.js';export {draftProject,initialDraft} from './src/commerce/guided.js';",resolveDir:root},bundle:true,format:'esm',target:'es2020',outfile:fixture});
const origin='https://studio-one-beta-test-v2.vercel.app',checks=[],errors=[],failures=[],httpErrors=[],measurements=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/root/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pass=s=>{checks.push(s);console.log('PASS',s);};
async function context(viewport){
 const context=await browser.newContext({viewport,ignoreHTTPSErrors:true,reducedMotion:'reduce'});
 await context.addInitScript(()=>{window.__LRF_STANDALONE_PREVIEW__=true;localStorage.setItem('studio-one-render-quality','fluid');
  window.landingFlashes=0;function observe(){const landing=document.querySelector('#landing');if(new URLSearchParams(location.search).get('view')==='configure'&&document.body?.dataset.view!=='wizard'){if(landing?.getBoundingClientRect().height&&getComputedStyle(landing).display!=='none')window.landingFlashes++;requestAnimationFrame(observe);}}requestAnimationFrame(observe);
 });
 await context.route(origin+'/**',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/__qa_preview.js')return route.fulfill({body:fs.readFileSync(fixture),contentType:'text/javascript'});
  if(u.pathname==='/__qa.html')return route.fulfill({body:'<html><body style="margin:0"><div id="host" style="width:380px;height:360px"></div><script type="module">import{createPreview,draftProject,initialDraft}from"/__qa_preview.js";window.project=draftProject({...initialDraft(),column:true});window.engine=createPreview(document.querySelector("#host"));window.makeProject=draftProject;window.initialDraft=initialDraft;await engine.update(project);window.fixtureReady=true;</script></body></html>',contentType:'text/html'});
  if(process.env.LIVE)return route.continue();
  const file=path.join(root,'dist',u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
  if(fs.existsSync(file)&&fs.statSync(file).isFile()){
   // Deliberately delay the entry module to detect a landing-page flash on direct entry.
   if(u.pathname==='/accueil.js')await new Promise(resolve=>setTimeout(resolve,180));
   return route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});
  }return route.continue();
 });return context;
}
function observe(page){page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))failures.push({url:r.url(),error:r.failure()?.errorText});});page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()});});}
try{
 for(const [size,viewport]of [['mobile',{width:390,height:844}],['desktop',{width:1365,height:930}]]){
  const c=await context(viewport),p=await c.newPage();observe(p);
  await p.goto(origin+'/?new=1&view=configure&step=0&standalone=1',{waitUntil:'domcontentloaded'});await p.locator('[data-model=two]').waitFor();
  assert.equal(await p.evaluate(()=>window.landingFlashes),0);assert.equal(await p.locator('#landing-image').getAttribute('src'),null);
  const selection=await p.evaluate(()=>{const cards=[...document.querySelectorAll('[data-model]')],images=cards.map(c=>c.querySelector('.product-photo')),start=performance.now();for(const id of ['three','two-xl','one-xl','three'])document.querySelector('[data-model="'+id+'"]').click();return {elapsed:performance.now()-start,same:cards.every((c,i)=>c===document.querySelector('[data-model="'+c.dataset.model+'"]')&&images[i]===c.querySelector('.product-photo')),selected:document.querySelector('[data-model][aria-pressed=true]').dataset.model};});
  assert(selection.same);assert.equal(selection.selected,'three');measurements.push({size,modelChoicesMs:selection.elapsed});pass(size+': direct entry never paints the landing page; model selection retains existing photos and elements');
  await p.locator('#next').click();await p.waitForFunction(()=>document.querySelector('#preview-status')?.hidden&&document.querySelector('#preview-canvas canvas'),null,{timeout:120000});
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('studio-one-guided-v1')).top),'bare');
  await p.locator('#next').click();assert.equal(await p.locator('[data-choice=bare]').getAttribute('aria-pressed'),'true');
  await p.locator('[data-choice=neris]').click();await p.waitForFunction(()=>JSON.parse(document.querySelector('#preview-canvas').dataset.configuration)[0].settings.top==='neris');
  await p.locator('[data-choice=bare]').click();await p.waitForFunction(()=>document.querySelector('#preview-status').hidden);pass(size+': new project defaults to bare cabinet and basin choice remains reversible');
  await p.locator('#next').click();await p.locator('#column-thumbnail img').waitFor({timeout:120000});await p.locator('[data-choice=column]').click();
  await p.locator('[data-swatch=columnFinish][data-value=NOGAL]').click();await p.waitForFunction(()=>document.querySelector('#column-thumbnail img')?.alt.includes('Nogal'),null,{timeout:120000});
  await p.locator('#preview-column').click();await p.waitForFunction(()=>document.querySelector('#preview-canvas').dataset.scope==='column');await p.locator('#preview-composition').click();
  await p.screenshot({path:path.join(output,'studio-start-column-'+size+'.png')});pass(size+': authentic column thumbnail, finish, isolated view and composition remain available');
  await p.locator('#next').click();await p.locator('#next').click();await p.locator('#quote-heading').waitFor();
  await p.locator('#open-3d').click();await p.waitForFunction(()=>window.studioOnePrototype&&document.querySelector('#scene')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
  const initial=await p.evaluate(()=>({state:studioOnePrototype.getState(),decor:studioOnePrototype.getDiagnostics().countertopDecoration}));assert.equal(initial.state.top,'bare');assert.deepEqual(initial.decor,[]);
  for(const top of ['neris','plain','sella','bare']){const result=await p.evaluate(top=>({ok:studioOnePrototype.setTop(top),decor:studioOnePrototype.getDiagnostics().countertopDecoration}),top);assert(result.ok);assert.equal(result.decor.length>0,!['plain','bare'].includes(top));}
  const saved=await p.evaluate(()=>{studioOnePrototype.setTop('tampa');return studioOnePrototype.exportProject();});assert(await p.evaluate(data=>studioOnePrototype.restoreProject(data),saved));assert.equal(await p.evaluate(()=>studioOnePrototype.getState().top),'tampa');
  await p.evaluate(()=>studioOnePrototype.setTop('bare'));pass(size+': full workshop hides decoration without a basin, restores it with a basin, and preserves a saved basin');
  if(size==='mobile')for(const width of [320,360,390,430]){await p.setViewportSize({width,height:844});const b=await p.evaluate(()=>{const logo=document.querySelector('header>.brand').getBoundingClientRect(),svg=document.querySelector('header>.brand>.studio-logo').getBoundingClientRect(),quote=document.querySelector('#back-to-quote').getBoundingClientRect();return {logo:{top:logo.top,bottom:logo.bottom},svg:{width:svg.width,height:svg.height},quote:quote.top};});assert(b.logo.top>=0&&b.logo.bottom<=b.quote,'Logo must stay above quote button: '+JSON.stringify(b));assert(b.svg.width>60&&b.svg.height>15);}
  await p.setViewportSize(viewport);await p.screenshot({path:path.join(output,'studio-start-workshop-'+size+'.png')});pass(size+': header logo fits above the recap button; smartphone widths 320–430px stay accessible');await c.close();
 }
 const c=await context({width:390,height:844}),p=await c.newPage();observe(p);await p.goto(origin+'/__qa.html',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.fixtureReady,null,{timeout:120000});
 const reuse=await p.evaluate(async()=>{const before=engine.diagnostics();for(const [finish,top]of [['NOGAL','bare'],['WHITE','plain'],['NOGAL','neris']]){project.items[0].settings.finish=finish;project.items[0].settings.top=top;await engine.update(project);}const after=engine.diagnostics();await engine.update(project);engine.setActive(true);return {before,after,duplicate:engine.diagnostics()};});
 assert.equal(reuse.after.geometryBuilds,reuse.before.geometryBuilds);assert.equal(reuse.duplicate.geometryBuilds,reuse.before.geometryBuilds);pass('WebGL: finish and top changes reuse the actual 3D geometry; identical steps do not rebuild it');
 const thumb=await p.evaluate(async()=>{const canvas=document.querySelector('#host canvas'),before=engine.diagnostics(),sizes=[];const observer=new MutationObserver(records=>sizes.push(...records.map(r=>r.attributeName)));observer.observe(canvas,{attributes:true,attributeFilter:['width','height']});const first=await engine.thumbnail(project),second=await engine.thumbnail(project);await Promise.resolve();observer.disconnect();return {before,after:engine.diagnostics(),same:first===second,sizes,bytes:first.length,png:first};});
 assert.equal(thumb.after.thumbnailRenders-thumb.before.thumbnailRenders,1);assert(thumb.same&&thumb.bytes>3000);assert.deepEqual(thumb.sizes,[]);assert.deepEqual(thumb.before.camera,thumb.after.camera);assert.deepEqual(thumb.before.target,thumb.after.target);assert.deepEqual(thumb.before.size,thumb.after.size);fs.writeFileSync(path.join(output,'studio-column-offscreen.png'),Buffer.from(thumb.png.split(',')[1],'base64'));pass('WebGL: column thumbnail uses an offscreen framebuffer, preserves the live canvas and camera, and is rendered once per finish');
 const race=await p.evaluate(async()=>{const first=structuredClone(project),last=structuredClone(project);first.items[0].settings.finish='ALBA';last.items[0].settings.finish='GREEN';await Promise.all([engine.update(first),engine.update(last)]);return engine.diagnostics();});assert.equal(race.items[0].settings.finish,'GREEN');pass('WebGL: rapid overlapping requests retain the latest selected finish');await c.close();
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(httpErrors,[]);
 fs.writeFileSync(path.join(output,'studio-start-browser-results.json'),JSON.stringify({passed:true,checks,measurements,errors,failures,httpErrors,rendering:'Chromium WebGL via software GPU; responsive viewports, not a physical phone performance benchmark',realEmailsSent:0,customerProjectsWritten:0},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,measurements}));
}finally{await browser.close();}
