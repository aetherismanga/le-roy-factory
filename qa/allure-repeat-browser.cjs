const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const published=process.env.STUDIO_TEST_PUBLIC==='1',local=published?null:await import('./preview-server.mjs');
 const browser=await chromium.launch({executablePath:process.env.STUDIO_CHROMIUM,headless:true,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}:undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const folder='reports/allure-repeat-20261023';fs.mkdirSync(folder,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,ignoreHTTPSErrors:published}),errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(published?'https://leroyfactory.fr/studio-one-configurateur.html?page=atelier.html':'http://127.0.0.1:4173/atelier.html');
  let app=page;
  if(published){await page.frameLocator('iframe').locator('.walk-toggle').waitFor({timeout:60000});app=page.frames().find(f=>f.url().startsWith('https://studio-one-beta-test-v2.vercel.app'));assert(app);}
  await app.waitForFunction(()=>window.studioOnePrototype,null,{timeout:60000});
  await app.locator('button[data-workspace=finishes]').click();
  let picker=app.locator('#wall-surface-library');
  await picker.locator('[data-surface-brand=ELIOS]').click();
  await picker.locator('[data-surface-field=collection]').selectOption('Allure');
  assert.equal(await picker.locator('[data-surface-color]').count(),9);
  for(const color of ['fenix-juniper','fenix-blueberry','safari','eden']){
   if(!await picker.isVisible())await app.locator('button[data-workspace=finishes]').click();
   await picker.locator(`[data-surface-color="${color}"]`).click();
   assert((await picker.locator('.surface-picker-note').innerText()).includes('raccord continu'));
   await app.evaluate(()=>window.studioOnePrototype.waitForTextures());
   for(const direction of ['horizontal','vertical']){
    await app.locator('#wall-direction').evaluate((select,value)=>{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));},direction);
    const layout=await app.evaluate(()=>({layout:window.studioOnePrototype.exportProject().layouts.walls[0],patterns:[...document.querySelector('#wall-pattern').options].map(o=>o.value)}));
    assert.equal(layout.layout.direction,direction);assert.equal(layout.layout.pattern,'straight');assert.deepEqual(layout.patterns,['straight']);
    await app.evaluate(()=>window.studioOnePrototype.waitForTextures());
    const texture=await app.evaluate(id=>window.studioOnePrototype.getDiagnostics().textures.surfaces.find(t=>t.collection==='Allure'&&t.id===id),color);
    assert(texture&&texture.url.includes('-panel-'),'The real WebGL material decodes the full panel');assert.equal(texture.height,texture.width*2);
    checks.push({color,direction,profile:texture.profile,width:texture.width,height:texture.height,url:texture.url});
    await app.evaluate(()=>window.studioOnePrototype.setView('front',true));
    if(await app.locator('#atelier.mobile-sheet-open').count())await app.locator('#settings-toggle').click();
    if(color==='fenix-juniper'||direction==='vertical'){
     await page.waitForTimeout(220);await page.screenshot({path:`${folder}/${published?'published-':''}${color}-${direction}-390.png`});
    }
   }
  }
  // Save/restore an old staggered project and ensure its layout is repaired.
  assert(await app.evaluate(()=>{const api=window.studioOnePrototype,p=api.exportProject();p.layouts.walls[0].pattern='offset';p.layouts.walls[0].x=-13;return api.restoreProject(p);}));
  await app.evaluate(()=>window.studioOnePrototype.waitForTextures());
  assert.equal(await app.evaluate(()=>window.studioOnePrototype.exportProject().layouts.walls[0].pattern),'straight');
  assert.equal(await app.evaluate(()=>window.studioOnePrototype.exportProject().layouts.walls[0].x),-13);
  // All working qualities use the same complete graphic and orientation.
  for(const mode of ['balanced','max','fluid']){
   await app.evaluate(mode=>window.studioOnePrototype.setQualityMode(mode),mode);await app.evaluate(()=>window.studioOnePrototype.waitForTextures());
   const texture=await app.evaluate(()=>window.studioOnePrototype.getDiagnostics().textures.surfaces.find(t=>t.collection==='Allure'&&t.id==='eden'));
   assert.equal(texture.height,texture.width*2);assert(texture.url.includes('-panel-'));checks.push({color:'eden',mode,texture});
  }
  await app.evaluate(()=>window.studioOnePrototype.setSurface('wall','snow'));
  assert.deepEqual(await app.locator('#wall-pattern').evaluate(s=>[...s.options].map(o=>o.value)),['straight','offset'],'Plain finishes keep their layout choices');
  for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});await page.waitForTimeout(120);
   assert(await app.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile horizontal overflow');
   assert.equal(await app.getByText(/Joystick/).count(),0);
  }
  assert.deepEqual(errors,[]);
  const report={passed:true,published,realWebGL2:true,checks,legacyStaggerRepaired:true,mobileWidths:[320,390,430],limitations:'Software GPU and touch emulation; no physical smartphone benchmark.'};
  fs.writeFileSync(`${folder}/${published?'published':'local'}-browser.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();local?.server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
