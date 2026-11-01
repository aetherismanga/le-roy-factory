/* Browser integration uses synthetic PDFs and mocked identities/services only. */
const {chromium,webkit,expect}=require('@playwright/test');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'reports','secure-pdf-viewer');
fs.mkdirSync(output,{recursive:true});

function samplePdf(){
 const objects=[];
 objects.push('<< /Type /Catalog /Pages 2 0 R >>');
 objects.push('<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R] /Count 3 >>');
 objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 for(let page=1;page<=3;page++){
  const label=['ALPHA','BETA','GAMMA'][page-1];
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 420] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length+2} 0 R >>`);
  const stream=`0.1 0.35 0.6 rg 20 220 260 120 re f\n0 0 0 rg BT /F1 18 Tf 20 380 Td (TARIF TEST PAGE ${page} ${label}) Tj ET\nBT /F1 12 Tf 20 180 Td (Synthetic document - no commercial prices) Tj ET\n`;
  objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`);
 }
 let content='%PDF-1.4\n';const offsets=[0];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(content));content+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const start=Buffer.byteLength(content);content+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
 for(const offset of offsets.slice(1))content+=String(offset).padStart(10,'0')+' 00000 n \n';
 content+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
 return Buffer.from(content);
}
const pdf=samplePdf();
const fixture=`<!doctype html><html lang="fr"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LRF PDF integration fixture</title><body style="margin:0;padding:12px;background:#fbf9f5;font:16px Arial"><h1>Tarifs de test</h1><div id="grid-tarifs"><article class="card-premium"><h3>Fabricant de test</h3><span class="pro-access-badge allowed">Accès de test</span><p><a id="protected" href="assets/pdf/elios2026.pdf">Ouvrir tarif sécurisé</a></p><p><a id="public" href="assets/pdf/RANDAL-STUDIO-ONE-FRANCE-20261022.pdf">Ouvrir tarif public</a></p><p><a id="agent" href="assets/pdf/RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf">Ouvrir document agent</a></p></article></div><script>window.LRF_PRO_SESSION={read:()=>window.__fixtureSession===undefined?{codeClient:'LRF-99998',departement:'34'}:window.__fixtureSession};</script><script defer src="assets/js/secure-tariff-links.js?v=fixture"></script><script type="module" src="assets/js/agent-tariffs.js?v=fixture"></script></body></html>`;

const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/tarifs-pro.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(fixture);}
 if(url.pathname==='/assets/pdf/RANDAL-STUDIO-ONE-FRANCE-20261022.pdf'){res.writeHead(200,{'Content-Type':'application/pdf','Cache-Control':'no-store'});return res.end(pdf);}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
 const type=/\.m?js$/.test(file)?'text/javascript':/\.html$/.test(file)?'text/html':'application/octet-stream';
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
const report={fixture:'Synthetic three-page PDF; Firebase identity and protected HTTP responses mocked; no real tariff/account data',profiles:[],passed:false};
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function setMocks(context,origin,state){
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'private, no-store'};
 await context.route('https://www.gstatic.com/firebasejs/**',route=>{
  const auth=`export function getAuth(){return {currentUser:globalThis.__fixtureAnonymous?null:{uid:'synthetic-agent',email:'jerome@leroyfactory.fr',getIdToken:async()=> 'synthetic-id-token'},authStateReady:async()=>{}};}export function onIdTokenChanged(auth,fn){queueMicrotask(fn);return ()=>{};}`;
  const app=`const app={options:{projectId:'le-roy-factory'}};export function getApps(){return [app];}export function initializeApp(){return app;}`;
  return route.fulfill({status:200,contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:route.request().url().includes('firebase-auth')?auth:app});
 });
 await context.route('https://gettariffpdf-5m3lsyu7bq-uc.a.run.app/**',async route=>{
  const request=route.request();if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  const body=request.postDataJSON();state.protected.push({body,authorization:request.headers().authorization,url:request.url()});
  if(state.delayPdf)await delay(state.delayPdf);
  if(state.refuse)return route.fulfill({status:403,contentType:'application/json',headers,body:JSON.stringify({error:'Accès refusé de test'})});
  return route.fulfill({status:200,contentType:'application/pdf',headers,body:pdf});
 });
 await context.route('https://randal-catalogue-general-3d.vercel.app/api/agent-tariffs',route=>{
  const request=route.request();if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  const body=request.postDataJSON();
  if(body.action==='document'){state.agent.push({body,authorization:request.headers().authorization,url:request.url()});return route.fulfill({status:200,contentType:'application/pdf',headers,body:pdf});}
  return route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify({success:true,version:1,elios:{},view:[],allowedPartners:['elios-ceramica'],expiresAt:Date.now()+60000})});
 });
}
const hostSelector='[data-lrf-secure-pdf-viewer]';
async function ready(page,number=1){
 const host=page.locator(hostSelector),sheet=host.locator(`.pdf-page[data-number="${number}"]`);
 await expect(sheet.locator('canvas').first()).toBeVisible({timeout:20000});
 await expect(host.locator('[data-page]')).toHaveValue(String(number));
 await expect(sheet.locator('canvas').first()).toHaveAttribute('aria-label',new RegExp('Page '+number+' sur 3'));
 await expect(host.locator('[data-total]')).toHaveText('/ 3');
 await expect(host.locator('[data-page-indicator]')).toHaveText(number+' / 3');return host;
}
async function tools(host,open=true){
 const toggle=host.locator('[data-tools-toggle]');
 if((await toggle.getAttribute('aria-expanded'))!==String(open))await toggle.click();
 await expect(toggle).toHaveAttribute('aria-expanded',String(open));
}
async function scrollToPage(host,number){
 await host.locator('.stage').evaluate((stage,number)=>{
  const sheet=stage.querySelector(`.pdf-page[data-number="${number}"]`);
  stage.scrollTop+=sheet.getBoundingClientRect().top-stage.getBoundingClientRect().top;
  stage.dispatchEvent(new Event('scroll'));
 },number);
}
async function backingStats(host){
 return host.locator('.pdf-page canvas').evaluateAll(canvases=>canvases.map(canvas=>({width:canvas.width,height:canvas.height,pixels:canvas.width*canvas.height})));
}
function assertBoundedTiles(tiles){
 assert(tiles.length>0,'The viewport has rendered PDF tiles');
 for(const tile of tiles){assert(tile.pixels<=4000000,'Each tile uses at most four megapixels');assert(tile.width<=4096&&tile.height<=4096,'Tile sides stay inside browser canvas limits');}
}
async function close(page){
 await page.locator(hostSelector).locator('[data-close]').click();await expect(page.locator(hostSelector)).toHaveCount(0);
 await page.waitForFunction(()=>!history.state?.lrfPdfReader);await page.waitForTimeout(30);
}
async function runProfile(browser,name,options,origin){
 const context=await browser.newContext({...options,acceptDownloads:true});
 const state={protected:[],agent:[],refuse:false};await setMocks(context,origin,state);
 const page=await context.newPage(),errors=[],downloads=[],popups=[],dialogs=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('download',download=>downloads.push(download));page.on('popup',popup=>popups.push(popup));page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
 const result={name,checks:[],requests:{},passed:false};report.profiles.push(result);
 try{
  await page.goto(origin+'/tarifs-pro.html');await page.waitForFunction(()=>!!document.querySelector('#protected')?.dataset.secureTariffId);
  await page.locator('#protected').click();let host=await ready(page);
  assert.equal(state.protected.length,1);assert.equal(state.protected[0].authorization,'Bearer synthetic-id-token');
  assert.equal(state.protected[0].body.tariffId,'elios-2026');
  await expect(host.locator('.pdf-page')).toHaveCount(3);
  await expect(host.locator('[data-tools-toggle]')).toHaveAttribute('aria-expanded','false');
  await expect(host.locator('[data-page]')).not.toBeVisible();
  await expect(host.locator('[data-query]')).not.toBeVisible();
  await expect(host.locator('[data-page-indicator]')).toBeVisible();
  const layout=await host.locator('.reader').evaluate(reader=>({
   height:reader.getBoundingClientRect().height,
   stageHeight:reader.querySelector('.stage').getBoundingClientRect().height,
   headerHeight:reader.querySelector('header').getBoundingClientRect().height
  }));
  assert(layout.stageHeight/layout.height>.85,'The document occupies more than 85% of the viewport');
  if(options.viewport.width<=680)assert(layout.headerHeight<=56,'The mobile top bar stays within 56px');
  result.checks.push('continuous page shells, hidden optional tools, compact mobile top bar and document-first viewport');
  const colored=await host.locator('.pdf-page[data-number="1"] canvas').first().evaluate(canvas=>{
   const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let found=0;
   for(let i=0;i<data.length;i+=400)if(data[i]<180&&data[i+2]>data[i]+30)found++;
   return {found,width:canvas.width,height:canvas.height,pixels:canvas.width*canvas.height};
  });
  assert(colored.found>20,'PDF canvas must contain the synthetic colored rectangle');assertBoundedTiles(await backingStats(host));
  result.checks.push('authorized protected POST renders nonblank PDF tiles with bounded backing buffers');
  await scrollToPage(host,2);host=await ready(page,2);
  result.checks.push('natural vertical scrolling advances the current page indicator');
  await tools(host);await host.locator('[data-page]').fill('3');await host.locator('[data-page]').press('Enter');host=await ready(page,3);
  await tools(host);await host.locator('[data-in]').click();await expect(host.locator('[data-zoom]')).toHaveText('125 %');
  await expect(host.locator('[data-page]')).toHaveValue('3');assertBoundedTiles(await backingStats(host));
  await tools(host);await host.locator('[data-fit]').click();await expect(host.locator('[data-zoom]')).toHaveText('100 %');
  await tools(host);await host.locator('[data-query]').fill('BETA');await host.locator('[data-search]').click();await ready(page,2);
  await expect(host.locator('.status')).toContainText('Texte trouvé à la page 2');
  result.checks.push('direct page entry, anchored zoom, fit width and full-document text search remain available on demand');
  await tools(host,false);
  const sheet=host.locator('.pdf-page[data-number="2"]'),beforeZoom=await sheet.evaluate(node=>node.getBoundingClientRect().width);
  await sheet.locator('canvas').first().dblclick();
  await expect.poll(()=>sheet.evaluate(node=>node.getBoundingClientRect().width)).toBeGreaterThan(beforeZoom);
  await expect(sheet.locator('canvas').first()).toBeVisible();assertBoundedTiles(await backingStats(host));
  await tools(host);await host.locator('[data-fit]').click();await expect(host.locator('[data-zoom]')).toHaveText('100 %');await tools(host,false);
  result.checks.push('double-tap zoom enlarges the actual page and rerenders bounded PDF tiles');
  assert.equal(downloads.length,0);assert.equal(popups.length,0);assert.equal(page.url(),origin+'/tarifs-pro.html');
  assert(!/[?&](?:token|codeClient|departement|authorization)=/i.test(page.url()));
  await page.screenshot({path:path.join(output,name+'-reader.png'),fullPage:false});
  if(!await host.locator('[data-download]').isVisible())await tools(host);
  const downloadPromise=page.waitForEvent('download');await host.locator('[data-download]').click();const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'elios-2026.pdf');await download.delete();assert.equal(downloads.length,1);
  result.checks.push('zero automatic downloads/popups; explicit download creates named PDF only on request; URL contains no credentials');
  await close(page);await expect(page.locator('#protected')).toBeFocused();
  result.checks.push('close restores focus, page and history state');
  await page.locator('#protected').click();host=await ready(page);
  await host.locator('[data-page]').evaluate(input=>{input.value='2';input.dispatchEvent(new Event('change'));input.value='3';input.dispatchEvent(new Event('change'));});await ready(page,3);
  await page.goBack();await expect(page.locator(hostSelector)).toHaveCount(0);await expect(page.locator('#protected')).toBeFocused();
  result.checks.push('repeat opening, rapid navigation and browser Back close cleanly');
  await page.locator('#public').click();await ready(page);await close(page);
  result.checks.push('public RANDAL tariff uses embedded reader');
  await page.waitForFunction(()=>!!window.LRF_AGENT_TARIFFS);await page.locator('#agent').click();await ready(page);
  assert.equal(state.agent.length,1);assert.equal(state.agent[0].authorization,'Bearer synthetic-id-token');assert.equal(state.agent[0].body.id,'randal-studio-one-basins');await close(page);
  result.checks.push('agent-only RANDAL document keeps its separate authenticated service');
  state.refuse=true;const refusals=dialogs.length;await page.locator('#protected').click();
  await page.waitForFunction(()=>document.querySelector('#protected')?.getAttribute('aria-busy')!=='true');
  assert.equal(dialogs.length,refusals+1);assert.match(dialogs.at(-1),/Accès refusé/);await expect(page.locator(hostSelector)).toHaveCount(0);
  assert.equal(downloads.length,1);assert.equal(popups.length,0);assert.deepEqual(errors,[]);
  result.checks.push('server refusal never displays a document, navigates or downloads');
  result.requests={protected:state.protected.length,agent:state.agent.length};result.passed=true;
 }catch(error){result.error=error.stack;try{await page.screenshot({path:path.join(output,name+'-failure.png'),fullPage:false});}catch{}throw error;}
 finally{await context.close();}
}
async function interruption(browser,origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const state={protected:[],agent:[]};await setMocks(context,origin,state);
 const page=await context.newPage(),errors=[],downloads=[];page.on('pageerror',error=>errors.push(error.message));page.on('download',d=>downloads.push(d));
 await context.route('**/assets/vendor/lrf-plan-pose/*.gz',async route=>{await delay(500);await route.continue();});
 try{
  await page.goto(origin+'/tarifs-pro.html');await page.locator('#protected').click();await expect(page.locator(hostSelector)).toHaveCount(1);await close(page);await page.waitForTimeout(700);
  assert.deepEqual(errors,[]);assert.equal(downloads.length,0);await expect(page.locator(hostSelector)).toHaveCount(0);
  await page.locator('#protected').click();await ready(page);await close(page);
  report.interruptedLoad={passed:true,checks:['closing during cold PDF.js load cleans the overlay; subsequent opening renders successfully; no download or script exception']};
 }finally{await context.close();}
}
async function historyTransactions(browser,origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const state={protected:[],agent:[]};await setMocks(context,origin,state);
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const results=[];
 try{
  for(const scenario of ['immediate-close-and-reopen','programmatic-replacement']){
   await page.goto(origin+'/tarifs-pro.html');
   const result=await page.evaluate(async({base64,scenario})=>{
    const {showSecurePdf}=await import('./assets/js/secure-pdf-viewer.mjs?v=20261101-compact1');
    const bytes=Uint8Array.from(atob(base64),letter=>letter.charCodeAt(0)),blob=new Blob([bytes],{type:'application/pdf'});
    history.pushState({fixtureBase:scenario},'',location.href);const baseline=history.length;
    const first=await showSecurePdf(blob,{title:'History transaction test',trigger:document.querySelector('#protected')});
    if(scenario==='immediate-close-and-reopen')first.close();
    await showSecurePdf(blob,{title:'Replacement test',trigger:document.querySelector('#protected')});
    await new Promise(resolve=>setTimeout(resolve,150));
    return {baseline,length:history.length,readers:document.querySelectorAll('[data-lrf-secure-pdf-viewer]').length};
   },{base64:pdf.toString('base64'),scenario});
   assert.equal(result.readers,1,scenario+' leaves the replacement open');assert(result.length<=result.baseline+1,scenario+' creates only one reader history entry');
   await ready(page);await page.goBack();await expect(page.locator(hostSelector)).toHaveCount(0);
   assert.equal(await page.evaluate(()=>history.state?.fixtureBase),scenario,scenario+' returns to original page state with one Back action');
   assert.equal(page.url(),origin+'/tarifs-pro.html');results.push(scenario);
  }
  assert.deepEqual(errors,[]);report.historyTransactions={passed:true,checks:results};
 }finally{await context.close();}
}
async function retryRuntime(browser,origin){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),state={protected:[],agent:[]};await setMocks(context,origin,state);
 let fail=true;await context.route('**/assets/vendor/lrf-plan-pose/pdf.min.mjs.gz',route=>fail?route.fulfill({status:503,body:'Unavailable'}):route.continue());
 const page=await context.newPage(),downloads=[],errors=[];page.on('download',d=>downloads.push(d));page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/tarifs-pro.html');await page.locator('#protected').click();const host=page.locator(hostSelector);
  await expect(host.locator('[data-retry]')).toBeVisible();assert.equal(downloads.length,0);fail=false;await host.locator('[data-retry]').click();await ready(page);await close(page);assert.deepEqual(errors,[]);
  report.runtimeFailure={passed:true,checks:['PDF.js load failure shows retry without downloading; retry renders after service recovery']};
 }finally{await context.close();}
}
async function anonymous(browser,origin){
 const context=await browser.newContext();await context.addInitScript(()=>{window.__fixtureAnonymous=true;window.__fixtureSession=null;});const state={protected:[],agent:[]};await setMocks(context,origin,state);
 const page=await context.newPage(),alerts=[];page.on('dialog',async d=>{alerts.push(d.message());await d.accept();});
 try{await page.goto(origin+'/tarifs-pro.html');await page.locator('#protected').click();await page.waitForFunction(()=>document.querySelector('#protected')?.getAttribute('aria-busy')!=='true');assert.equal(state.protected.length,0);assert.equal(alerts.length,1);await expect(page.locator(hostSelector)).toHaveCount(0);report.anonymous={passed:true,checks:['signed-out visitor cannot request or view a tariff']};}finally{await context.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const [name,options] of [['desktop',{viewport:{width:1280,height:900}}],['android-touch',{viewport:{width:412,height:915},isMobile:true,hasTouch:true,deviceScaleFactor:2}],['small-iphone-viewport',{viewport:{width:375,height:667},isMobile:true,hasTouch:true,deviceScaleFactor:3}]])await runProfile(browser,name,options,origin);
  await interruption(browser,origin);await historyTransactions(browser,origin);await retryRuntime(browser,origin);await anonymous(browser,origin);await browser.close();browser=null;
  if(fs.existsSync(webkit.executablePath())){
   try{browser=await webkit.launch({headless:true});}
   catch(error){
    if(process.env.LRF_REQUIRE_WEBKIT==='1'||!/missing dependencies|Missing libraries|error while loading shared libraries/i.test(error.message))throw error;
    report.webkit={status:'skipped',reason:'WebKit system shared libraries unavailable; Chromium mobile viewport coverage is not Safari-engine certification.'};
   }
   if(browser)await runProfile(browser,'webkit-iphone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},origin);
  }else{
   if(process.env.LRF_REQUIRE_WEBKIT==='1')throw Error('WebKit was required but is not installed.');
   report.webkit={status:'skipped',reason:'WebKit not installed; Chromium mobile viewport coverage is not Safari-engine certification.'};
  }
  report.passed=true;
 }catch(error){report.error=error.stack;process.exitCode=1;}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,profiles:report.profiles.map(p=>({name:p.name,passed:p.passed,checks:p.checks.length})),interruptedLoad:report.interruptedLoad?.passed,historyTransactions:report.historyTransactions?.passed,runtimeFailure:report.runtimeFailure?.passed,anonymous:report.anonymous?.passed,error:report.error,report:path.relative(root,path.join(output,'report.json'))}));}
})();
