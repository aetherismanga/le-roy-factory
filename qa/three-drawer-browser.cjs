// Run against the built source, or PRODUCTION=1 for the published deployment.
const {chromium}=require(process.env.STUDIO_PLAYWRIGHT||require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const origin=process.env.STUDIO_URL||'https://studio-one-beta-test-v2.vercel.app',production=process.env.PRODUCTION==='1';
const localRoot=path.resolve('dist'),screens=[],checks=[];
async function reachable(page,selector){assert(await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect(),at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1&&(at===e||e.contains(at));}),selector+' stays accessible');}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.STUDIO_CHROMIUM,headless:true,env:{...process.env,...(process.env.STUDIO_SHADERS?{LD_LIBRARY_PATH:process.env.STUDIO_SHADERS}:{})},proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:568}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<700,hasTouch:viewport.width<700,ignoreHTTPSErrors:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(90000);page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error',e.stack);});
  if(!production)await page.route(origin+'/**',r=>{const u=new URL(r.request().url()),f=path.join(localRoot,u.pathname==='/'?'index.html':u.pathname);if(u.pathname==='/api/commercial')return r.fulfill({json:{client:null,proHT:null,isAdmin:false,proStatus:'anonymous'}});return fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f,contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'}[path.extname(f)]||'application/octet-stream'}):r.continue();});
  await page.goto(origin+'/?new=1&view=configure&step=0',{waitUntil:'domcontentloaded'});
  const card=page.locator('[data-model="three"]');await card.waitFor();await card.click();
  assert.match(await card.innerText(),/3 tiroirs avec pieds/);await card.locator('.model-photo').evaluate(e=>e.decode());assert.equal(await card.locator('.model-photo').evaluate(e=>e.complete&&e.naturalWidth===1695),true);assert.equal(await card.locator('.official-photo').getAttribute('data-photo-ready'),'true');
  assert.match(await card.locator('.cabinet-drawing').getAttribute('aria-label'),/caisson 81 cm et pieds 10 cm/);assert.equal(await card.locator('[data-part="legs"]').count(),1);
  await reachable(page,'#previous');await reachable(page,'#next');
  const selection='qa/three-drawer-'+(production?'production':'local')+'-selection-'+viewport.width+'.png';await page.screenshot({path:selection});screens.push(selection);
  await page.locator('#next').click();await page.waitForFunction(()=>document.querySelector('#preview-status').hidden);
  assert.match(await page.locator('.selection-note').innerText(),/Caisson 81 cm \+ pieds 10 cm · hauteur totale 91 cm/);
  await page.locator('[data-swatch="finish"][data-value="NOGAL"]').click();await page.locator('[data-width="100"]').click();
  await page.waitForFunction(()=>{const d=JSON.parse(document.querySelector('#preview-canvas').dataset.configuration);return d[0].settings.width===100&&d[0].settings.finish==='NOGAL';});
  await page.waitForFunction(()=>document.querySelector('#preview-status').hidden);await reachable(page,'#next');
  const dimensions='qa/three-drawer-'+(production?'production':'local')+'-dimensions-'+viewport.width+'.png';await page.screenshot({path:dimensions});screens.push(dimensions);
  await page.locator('#next').click();await page.locator('[data-choice="bare"]').click();
  assert.match(await page.locator('#estimate-lines').innerText(),/caisson 81 cm \+ pieds 10 cm/);
  for(let i=0;i<3;i++)await page.locator('#next').click();
  await page.locator('#quote-panel').waitFor({state:'visible'});assert.match(await page.locator('#quote-lines').innerText(),/caisson 81 cm \+ pieds 10 cm/);
  await page.locator('#open-3d').click();await page.waitForURL('**/atelier.html?guided=1');await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready);
  let diagnostics=await page.evaluate(()=>window.studioOnePrototype.getDiagnostics());assert.equal(diagnostics.spec.legHeight,.1);assert(Math.abs(diagnostics.spec.height-.81)<1e-8);assert.equal(diagnostics.spec.totalHeight,.91);assert.equal(diagnostics.legBounds.count,4);assert.equal(diagnostics.legBounds.visible,true);assert(Math.abs(diagnostics.legBounds.minY)<1e-6);assert(Math.abs(diagnostics.legBounds.maxY-.1)<1e-6);assert(Math.abs(diagnostics.geometryBounds[1]-.81)<1e-6);
  let state=await page.evaluate(()=>window.studioOnePrototype.getState());const cabinet=state.items.find(i=>i.type==='cabinet');assert.equal(cabinet.placement.height,0);assert.equal(cabinet.settings.width,100);assert.equal(cabinet.settings.top,'bare');assert.equal(cabinet.settings.finish,'NOGAL');
  assert.equal(await page.locator('#error').isVisible(),false);
  await page.evaluate(()=>window.studioOnePrototype.setView('front',true));
  await page.screenshot({path:'qa/three-drawer-'+(production?'production':'local')+'-closed-'+viewport.width+'.png'});
  await page.evaluate(()=>window.studioOnePrototype.setDrawer(2,1));
  await page.waitForFunction(()=>window.studioOnePrototype.getState().drawers[2]===1);
  const workshop='qa/three-drawer-'+(production?'production':'local')+'-workshop-'+viewport.width+'.png';await page.screenshot({path:workshop});screens.push(workshop);
  // A saved composition uses the corrected geometry on restoration as well.
  assert(await page.evaluate(()=>{const p=window.studioOnePrototype.exportProject();return window.studioOnePrototype.restoreProject(p);}));
  assert(Math.abs((await page.evaluate(()=>window.studioOnePrototype.getDiagnostics())).geometryBounds[1]-.81)<1e-6);
  assert(await page.evaluate(()=>window.studioOnePrototype.changeCabinetFormat('two')));assert.equal((await page.evaluate(()=>window.studioOnePrototype.getDiagnostics())).spec.legHeight,0);
  assert(await page.evaluate(()=>window.studioOnePrototype.changeCabinetFormat('three')));diagnostics=await page.evaluate(()=>window.studioOnePrototype.getDiagnostics());assert.equal(diagnostics.spec.legHeight,.1);
  assert.equal((await page.evaluate(()=>window.studioOnePrototype.getState())).items.find(i=>i.type==='cabinet').placement.height,0);
  await page.locator('button[data-workspace="furniture"]').click();await page.locator('#add-cabinet').scrollIntoViewIfNeeded();await page.locator('#add-cabinet').click();const addCard=page.locator('#add-choices .add-card').filter({hasText:'3 tiroirs avec pieds'});await addCard.waitFor();assert.match(await addCard.innerText(),/caisson 81 \+ pieds 10 cm/);assert.match(await addCard.locator('img').getAttribute('src'),/studio-three-photo-hd-v1.webp/);await addCard.locator('img').evaluate(e=>e.decode());await page.locator('#close-add').click();
  assert.deepEqual(errors,[]);checks.push(viewport.width+' × '+viewport.height+': selection, real preview, finish/width, furniture-only quote, workshop, drawers, saved project, format switching');
  console.log(checks.at(-1));await context.close();
 }
 fs.writeFileSync('reports/three-drawer-browser.json',JSON.stringify({passed:true,production,origin,checks,screens},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
