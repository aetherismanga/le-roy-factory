// Built local assets only; no customer project or messaging endpoints are used.
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const localChromium='/root/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
const executablePath=process.env.CHROMIUM_PATH||(fs.existsSync(localChromium)?localChromium:undefined);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const checks=[];
 try{for(const application of ['studio-one','randal-general'].filter(value=>!process.env.DRAWER_APP||value===process.env.DRAWER_APP))for(const width of [1365,390].filter(value=>!process.env.DRAWER_WIDTH||value===Number(process.env.DRAWER_WIDTH))){
  const origin='https://drawer-check.test',dist=path.join(root,application,'dist'),context=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{localStorage.setItem('studio-one-render-quality','fluid');window.__LRF_STANDALONE_PREVIEW__=true;});
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin!==origin&&url.hostname!=='studio-one-beta-test-v2.vercel.app'&&!(url.hostname==='leroyfactory.fr'&&url.pathname.startsWith('/review-studio/assets/')))return route.continue();
   if(url.pathname.startsWith('/api/'))return route.fulfill({json:{client:null,proHT:null,isAdmin:false,proStatus:'anonymous',projects:[]}});
   const file=path.join(url.origin===origin?dist:path.join(root,'studio-one/dist'),url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.replace(/^\/review-studio/,'')));
   return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({path:file,headers:{'access-control-allow-origin':'*'},contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'}[path.extname(file)]||'application/octet-stream'}):route.fulfill({status:404,body:'Local fixture not found'});
  });
  await page.goto(origin+'/?new=1&view=configure&step=2',{waitUntil:'domcontentloaded'});
  await page.locator('[data-choice="plain"]').click();
  const choice=page.locator('#guided-top-drawer');await choice.waitFor({state:'visible'});assert.equal(await choice.isChecked(),false);
  const before=await page.locator('#estimate-total').innerText();await choice.check();
  const draftKey=application==='studio-one'?'studio-one-guided-v1':'randal-general-guided-v1';
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).topDrawer==='full',draftKey);
  assert.equal(await page.locator('#estimate-total').innerText(),before,'No invented price for the drawer option');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#preview-canvas').dataset.configuration)[0].settings.topDrawer==='full');
  for(let n=0;n<3;n++)await page.locator('#next').click();
  await page.locator('#open-3d').click();await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready,null,{timeout:90000}).catch(async error=>{console.error(application,width,await page.evaluate(()=>({url:location.href,loading:document.querySelector('#loading')?.textContent,error:document.querySelector('#error-text')?.textContent})),errors);throw error;});
  assert.equal(await page.evaluate(()=>studioOnePrototype.getState().topDrawer),'full');
  await page.evaluate(()=>{const item=studioOnePrototype.getState().items.find(i=>i.type==='cabinet');studioOnePrototype.handleObjectTap({itemId:item.id,editTarget:'basin'});});
  if(width<760)await page.locator('#object-editor-body .lrf-mobile-options>summary').click();
  const inspectorChoice=page.locator('#object-editor-body [data-top-drawer]');await inspectorChoice.waitFor({state:'visible'});assert.equal(await inspectorChoice.isChecked(),true);
  await inspectorChoice.uncheck();assert.equal(await page.evaluate(()=>studioOnePrototype.getState().topDrawer),'siphon');
  await page.locator('#object-editor-body [data-top-drawer]').check();
  assert.equal(await page.evaluate(()=>studioOnePrototype.duplicateSelected()),true);
  const exported=await page.evaluate(()=>studioOnePrototype.exportProject());assert.equal(exported.items.filter(i=>i.type==='cabinet'&&i.settings.topDrawer==='full').length,2);
  assert.equal(await page.evaluate(data=>studioOnePrototype.restoreProject(data),exported),true);
  assert.equal(await page.evaluate(()=>studioOnePrototype.getState().topDrawer),'full');
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.items.filter(i=>i.type==='cabinet'&&i.settings.topDrawer==='full').length===2,application+'-current-project');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready,null,{timeout:90000}).catch(async error=>{console.error(application,width,await page.evaluate(()=>({url:location.href,loading:document.querySelector('#loading')?.textContent,error:document.querySelector('#error-text')?.textContent})),errors);throw error;});
  assert.equal(await page.evaluate(()=>studioOnePrototype.getState().topDrawer),'full');
  assert.equal(await page.evaluate(()=>studioOnePrototype.setTop('sella')),true);assert.equal(await page.evaluate(()=>studioOnePrototype.getState().topDrawer),'siphon');
  assert.equal(await page.locator('[data-top-drawer]').count(),0,'Integrated basin hides the incompatible choice');
  assert.equal(await page.evaluate(()=>studioOnePrototype.setTop('plain')),true);assert.equal(await page.evaluate(()=>studioOnePrototype.getState().topDrawer),'siphon');
  assert.deepEqual(errors,[]);checks.push(application+' '+width+': guided choice, preview setting, unchanged total, live control, duplicate, export, restore, reload and incompatible-top reset');
  console.log('PASS',checks.at(-1));await context.close();
 }
 console.log(JSON.stringify({passed:true,checks,rendering:'Chromium software WebGL; responsive viewports, no physical device benchmark'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
