// Local acceptance: never submits a prompt or image to a real ChatGPT account.
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
(async()=>{
 const {draftProject,initialDraft}=await import(path.resolve('src/commerce/guided.js'));
 const {QUOTE_KEY,QUOTE_CONTEXT,CURRENT_KEY}=await import(path.resolve('src/commerce/flow.js'));
 const server=spawn('python3',['-m','http.server','4197','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
 const browser=await chromium.launch({executablePath:process.env.STUDIO_CHROMIUM||'/tmp/chromium',headless:true,args:['--no-sandbox','--enable-webgl','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results={passed:false,devices:[],checks:['actual final quote to full-room atelier handoff','one-time route consumed','native HD capture and working quality restored','project unchanged by export','explicit prompt copy and manual fallback','image download and trusted ChatGPT link','failure dialog, retry and no blank download']};
 const out=path.resolve('../tmp/studio-photoreal');fs.mkdirSync(out,{recursive:true});
 try{
  for(const [device,viewport,mobile]of [['desktop',{width:1440,height:900},false],['mobile',{width:390,height:844},true]]){
   const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
   await context.route('**/api/commercial',r=>r.fulfill({json:{client:null,isAdmin:false,proHT:null}}));
   await context.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>ChatGPT handoff test</title>'}));
   const project=draftProject({...initialDraft(),format:'two-xl',width:100,finish:'AZUL',column:true,columnFinish:'NOGAL',top:'plain'});
   project.room={height:270,points:[[0,0],[510,0],[510,420],[0,420]]};project.client={email:'PRIVE-TEST-NOT-EXPORTED'};project.comment='PRIVE-TEST-NOT-EXPORTED';
   await context.addInitScript(({project,QUOTE_KEY,QUOTE_CONTEXT,CURRENT_KEY})=>{
    localStorage.setItem(QUOTE_KEY,JSON.stringify(project));localStorage.setItem(CURRENT_KEY,JSON.stringify(project));localStorage.setItem(QUOTE_CONTEXT,JSON.stringify({mode:'scene'}));
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});
   },{project,QUOTE_KEY,QUOTE_CONTEXT,CURRENT_KEY});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4197/index.html?view=quote',{waitUntil:'domcontentloaded',timeout:60000});
   await page.locator('#quote-photoreal').click();
   await page.waitForFunction(()=>document.querySelector('#photoreal-dialog [data-photo-content]')?.hidden===false,null,{timeout:90000});
   assert(new URL(page.url()).pathname.endsWith('/atelier.html'));assert(!page.url().includes('guided='));assert(!page.url().includes('photoreal='));
   const prepared=await page.evaluate(()=>{const d=document.querySelector('#photoreal-dialog');return {width:d.querySelector('img').naturalWidth,height:d.querySelector('img').naturalHeight,prompt:d.querySelector('textarea').value,copy:window.__copied,overflow:d.scrollWidth>d.clientWidth+1};});
   assert.equal(prepared.width,1920);assert(prepared.prompt.includes('510'));assert(prepared.prompt.includes('420'));assert(prepared.prompt.includes('Azul Acero'));assert(prepared.prompt.includes('Nogal Valentina'));assert(!prepared.prompt.includes('PRIVE-TEST'));assert.equal(prepared.copy,undefined);assert.equal(prepared.overflow,false);
   const dialog=page.locator('#photoreal-dialog');await dialog.screenshot({path:path.join(out,device+'-dialog.png')});
   await page.locator('[data-photo-action="copy"]').click();assert.equal(await page.evaluate(()=>window.__copied),prepared.prompt);
   await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('denied');};});await page.locator('[data-photo-action="copy"]').click();
   const fallback=await page.evaluate(()=>{const a=document.querySelector('#photoreal-dialog textarea');return {start:a.selectionStart,end:a.selectionEnd,length:a.value.length,status:document.querySelector('.rf-photo-status').textContent};});
   assert.equal(fallback.start,0);assert.equal(fallback.end,fallback.length);assert(fallback.status.includes('indisponible'));
   const downloadP=page.waitForEvent('download');await page.locator('[data-photo-action="download"]').click();const download=await downloadP;assert.equal(download.suggestedFilename(),'randal-studio-one-photorealisme.png');
   const link=page.locator('[data-photo-action="chatgpt"]');assert.equal(await link.getAttribute('href'),'https://chatgpt.com/');assert.equal(await link.getAttribute('target'),'_blank');assert((await link.getAttribute('rel')).includes('noopener'));
   await link.scrollIntoViewIfNeeded();const closeBox=await page.locator('.rf-photo-close').boundingBox();assert(closeBox&&closeBox.y>=0&&closeBox.y+closeBox.height<=viewport.height,'Close remains accessible after scrolling the steps');
   const popupP=context.waitForEvent('page');await link.click();const popup=await popupP;await popup.waitForLoadState();assert(popup.url().startsWith('https://chatgpt.com/'));await popup.close();
   await page.locator('.rf-photo-close').click();
   await page.evaluate(async()=>{const a=window.studioOnePrototype;a.setQualityMode('fluid');await a.waitForTextures();});
   const before=await page.evaluate(()=>window.studioOnePrototype.exportProject());
   if(mobile)await page.locator('button[data-workspace="presentation"]').click();
   await page.locator('#photo-chatgpt').click();await page.waitForFunction(()=>document.querySelector('#photoreal-dialog [data-photo-content]')?.hidden===false,null,{timeout:60000});
   const after=await page.evaluate(()=>({project:window.studioOnePrototype.exportProject(),diagnostics:window.studioOnePrototype.getDiagnostics(),inert:document.body.inert}));
   assert.deepEqual(after.project,before);assert.equal(after.diagnostics.qualityProfile,'fluid');assert.equal(after.diagnostics.capture.last.width,1920);assert.equal(after.diagnostics.capture.last.profile,'max');assert.equal(after.inert,false);
   assert.deepEqual(errors,[]);results.devices.push({device,capture:[prepared.width,prepared.height],workingQualityRestored:'fluid',projectUnchanged:true,errors});
   await context.close();console.log('PASS '+device+': quote/full-room HD, copy/fallback, download, ChatGPT handoff, state restoration');
  }
  const context=await browser.newContext();await context.route('**/__photo-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><button id="begin">Préparer</button>'}));
  await context.route('**/__photo-module.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.resolve(__dirname,'../../shared/lrf-3d/photoreal-export.js'),'utf8')}));
  const page=await context.newPage();await page.goto('http://127.0.0.1:4197/__photo-fixture.html');
  assert.equal(await page.evaluate(async()=>{const {createPhotorealExport}=await import('/__photo-module.js');window.fail=true;window.photo=createPhotorealExport({getProject:()=>({room:{height:260,points:[[0,0],[450,0],[450,450]]},items:[]}),capture:async()=>{if(window.fail)throw Error('Texture HD indisponible');const c=document.createElement('canvas');c.width=1920;c.height=1080;return c.toDataURL('image/png');}});return window.photo.open(document.querySelector('#begin'));}),false);
  assert(await page.locator('[data-photo-action="retry"]').isVisible());assert.equal(await page.locator('[data-photo-action="download"]').getAttribute('href'),null);assert(await page.locator('[data-photo-content]').isHidden());
  await page.evaluate(()=>{window.fail=false;});await page.locator('[data-photo-action="retry"]').click();await page.waitForFunction(()=>document.querySelector('[data-photo-content]').hidden===false);await context.close();
  results.passed=true;fs.writeFileSync('reports/photoreal-export-browser-20261024.json',JSON.stringify(results,null,2)+'\n');console.log('PASS failure/retry has no empty download or external action');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
