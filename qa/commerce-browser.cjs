const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const local=process.env.BASE_URL?null:await import('./preview-server.mjs');
 const browser=await chromium.launch({executablePath:process.env.STUDIO_CHROMIUM||'/tmp/studio-chromium',headless:true,env:{...process.env,LD_LIBRARY_PATH:'/tmp/studio-shaders'},proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-certificate-errors']});
 const origin=process.env.BASE_URL||'http://localhost:4173';const results={screens:[],errors:[],failed:[]};
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true});const page=await ctx.newPage();
 page.on('pageerror',e=>{results.errors.push(e.message);console.error('Browser:',e.message);});page.on('console',m=>{if(m.type()==='error')console.error('Console:',m.text());});page.on('requestfailed',r=>results.failed.push({url:r.url(),error:r.failure()?.errorText}));
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto(origin,{waitUntil:'networkidle'});await page.waitForSelector('#step-content [data-choice]');
 assert.equal(await page.locator('#summary-total').innerText(),'691,20 €');
 assert(!requests.some(u=>/app\.js|\.hdr|\.glb|assets\/view|assets\/bathroom/.test(u)),'No 3D requested on homepage');
 results.homeResources=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:e.name,bytes:e.transferSize,duration:Math.round(e.duration)})));
 for(const [width,height]of [[1440,1000],[1024,900],[768,1024],[390,844],[320,740]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const measure=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,badImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)}));assert(measure.scroll<=width,'Horizontal overflow '+width);results.screens.push(measure);
  if(width===1440||width===390)await page.screenshot({path:'qa/commerce-home-'+width+'.png',fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-choice="three"]').click();await page.locator('#width').fill('100');await page.locator('#width').dispatchEvent('change');await page.selectOption('#finish','BISC');
 await page.locator('#next').click();await page.locator('[data-choice="tampa"]').click();await page.locator('[data-swatch="basinColor"][data-value="black"]').click();
 await page.locator('#next').click();await page.locator('[data-choice="column"]').click();await page.selectOption('#columnFinish','NOGAL');
 await page.locator('#next').click();await page.locator('[data-choice="ilse"]').click();await page.selectOption('#mirrorSize','2');
 await page.locator('#previous').click();assert.equal(await page.locator('#columnFinish').inputValue(),'NOGAL');await page.locator('#next').click();assert.equal(await page.locator('#mirrorSize').inputValue(),'2');
 await page.locator('#next').click();const publicDisplay=await page.locator('#summary-total').innerText();
 results.guided=await page.evaluate(()=>JSON.parse(localStorage.getItem('studio-one-guided-v1')));results.guidedPublicTTC=publicDisplay;
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#summary-total').innerText(),publicDisplay);await page.waitForSelector('#open-3d');
 const webgl=await page.evaluate(()=>!!document.createElement('canvas').getContext('webgl2'));
 if(!webgl){
  await page.locator('#open-3d').click();await page.waitForURL('**/atelier.html?guided=1');
  const transfer=await page.evaluate(()=>JSON.parse(localStorage.getItem('studio-one-guided-transfer-v1')));
  assert.equal(transfer.items.length,3);assert.equal(transfer.items[0].settings.basinColor,'black');
  results.transferPayload=transfer;results.sceneVisual='NOT RUN: software Chromium cannot create WebGL2 in this execution environment';results.homePassed=true;results.full3DPassed=false;assert.deepEqual(results.errors,[]);
  fs.writeFileSync('reports/commerce-browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify({homePassed:true,full3DPassed:false,screens:results.screens,reason:results.sceneVisual,transferItems:transfer.items.length},null,2));await browser.close();local?.server.close();return;
 }
 await page.locator('#open-3d').click();await page.waitForFunction(()=>window.studioOnePrototype,null,{timeout:90000}).catch(async e=>{console.error(await page.locator('#error-text').innerText(),JSON.stringify(results.failed));throw e;});
 const state=await page.evaluate(()=>window.studioOnePrototype.getState());results.scene=state.items;assert.equal(state.items.length,3);
 const cabinet=state.items.find(i=>i.type==='cabinet');assert.equal(cabinet.settings.format,'three');assert.equal(cabinet.settings.width,100);assert.equal(cabinet.settings.finish,'BISC');assert.equal(cabinet.settings.top,'tampa');assert.equal(cabinet.settings.basinColor,'black');assert.equal(state.items.find(i=>i.type==='column').settings.finish,'NOGAL');assert.equal(state.items.find(i=>i.type==='mirror').settings.mirrorModel,'ilse');
 await page.waitForTimeout(200);assert.equal(await page.locator('.commerce-total').innerText(),publicDisplay);
 await page.evaluate(()=>window.studioOnePrototype.setWidth(90));await page.waitForTimeout(250);assert.notEqual(await page.locator('.commerce-total').innerText(),publicDisplay);results.liveScenePricing=true;
 results.sceneDiagnostics=await page.evaluate(()=>window.studioOnePrototype.getDiagnostics());
 await page.screenshot({path:'qa/commerce-atelier-1440.png'});
 assert.deepEqual(results.errors,[]);results.passed=true;fs.writeFileSync('reports/commerce-browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify({passed:true,screens:results.screens,sceneItems:state.items.length,homeResources:results.homeResources.length,errors:results.errors,failed:results.failed},null,2));await browser.close();local?.server.close();
})().catch(e=>{console.error(e);process.exit(1);});
