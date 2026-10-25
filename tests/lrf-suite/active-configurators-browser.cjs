const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),output=path.resolve(process.env.LRF_QA_OUTPUT||path.join(root,'reports/lrf-suite/active-configurators'));
const roots={studio:path.resolve(process.env.LRF_STUDIO_DIST||path.join(root,'studio-one/dist')),general:path.resolve(process.env.LRF_GENERAL_DIST||path.join(root,'randal-general/dist'))};
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.hdr':'application/octet-stream','.glb':'model/gltf-binary'};
const checks=[],errors=[],network=[],blocked=new Set();let browser,server,page,activeKind='studio';
function pass(message){checks.push(message);console.log('PASS',message);}
function readWithin(dir,relative){const file=path.resolve(dir,'.'+relative);if(!file.startsWith(dir+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return null;return {file,body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'};}
(async()=>{
 fs.mkdirSync(output,{recursive:true});for(const dir of Object.values(roots))assert(fs.existsSync(path.join(dir,'app.js'))&&fs.existsSync(path.join(dir,'atelier.html')),'Build both active ateliers before running this regression: '+dir);
 const core=await import(pathToFileURL(path.join(root,'assets/js/lrf-plan-pose/core.mjs')).href);
 const {surfaceSeries}=await import(pathToFileURL(path.join(root,'shared/lrf-3d/surface-picker.js')).href);
 const expectedCollections=surfaceSeries('ELIOS','floor').map(([name])=>name);
 const products=JSON.parse(fs.readFileSync(path.join(root,'assets/js/lrf-plan-pose/catalogue.json'))).products;
 const product=products.find(p=>p.collection==='Creta'&&p.colorId==='caramello'&&p.format==='60x120');assert(product,'Official Creta Caramello reference must exist');
 const project=core.newProject(),room=core.newRoom([[0,0],[500,0],[500,300],[320,300],[320,400],[0,400]],'Pièce de contrôle');
 room.confirmed=true;room.plinths.enabled=false;room.tile={...room.tile,...product,color:product.colorId};
 room.partitions=[{id:'qa-partition',a:[200,0],b:[200,100],thickness:10,height:260}];
 room.openings=[{id:'qa-door',type:'door',kind:'door',wall:0,start:30,width:83,height:204,sill:0,color:'white',ral:'9016'},{id:'qa-window',type:'window',kind:'window',wall:1,start:70,width:100,height:100,sill:100,color:'white',ral:'9016'}];
 project.rooms=[room];const expected=core.quantity(room,1,project.loss);assert.equal(expected.error,'');
 server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),kind=pathname.split('/')[1];
  if(pathname.includes('/api/')){res.writeHead(401,{'Content-Type':'application/json'});return res.end(JSON.stringify({success:false,error:'Guest test: authentication required'}));}
  const asset=roots[kind]?readWithin(roots[kind],pathname.slice(kind.length+1)||'/atelier.html'):pathname.startsWith('/assets/')?readWithin(roots[activeKind],pathname):null;
  if(!asset){res.writeHead(404);return res.end('Missing local QA asset');}res.setHeader('Content-Type',asset.contentType);res.end(asset.body);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.LRF_BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const kind of ['studio','general']){
  activeKind=kind;const context=await browser.newContext({viewport:{width:1365,height:930},reducedMotion:'reduce'});
  await context.addInitScript(()=>{localStorage.setItem('studio-one-render-quality','fluid');localStorage.setItem('randal-general-render-quality','fluid');});
  // Reuse exact published local bytes for the apps' existing cross-origin asset URLs.
  // No synthetic or downsampled image is substituted, and no remote account is contacted.
  // Non-active remote thumbnails are blocked and reported; this is not an online media inventory.
  await context.route(/^https:\/\//,async route=>{
   const u=new URL(route.request().url());let dir,relative;
   if(u.hostname==='leroyfactory.fr'&&u.pathname.startsWith('/review-studio/assets/')){dir=roots.studio;relative=u.pathname.slice('/review-studio'.length);}
   else if(u.hostname==='leroyfactory.fr'&&u.pathname.startsWith('/assets/img/lrf-plan-pose/faces/')){dir=root;relative=u.pathname;}
   else if(u.hostname==='studio-one-beta-test-v2.vercel.app'){dir=roots.studio;relative=u.pathname;}
   else if(u.hostname==='randal-catalogue-general-3d.vercel.app'){dir=roots.general;relative=u.pathname;}
   const asset=dir&&readWithin(dir,decodeURIComponent(relative));
   if(asset)return route.fulfill({body:asset.body,contentType:asset.contentType,headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});
   blocked.add(u.hostname+u.pathname);return route.abort();
  });
  page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',error=>{errors.push(kind+': '+error.message);console.error('PAGEERROR',kind,error.message);});page.on('requestfailed',request=>{const u=new URL(request.url());network.push({kind,url:u.hostname+u.pathname,error:request.failure()?.errorText});});page.on('response',response=>{if(response.status()>=400){const u=new URL(response.url());network.push({kind,url:u.hostname+u.pathname,status:response.status()});}});
  const webgl=await page.evaluate(()=>{const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');if(!gl)return null;const info={renderer:gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)};gl.getExtension('WEBGL_lose_context')?.loseContext();return info;});
  assert(webgl,'WebGL2 is required. This job must fail, not skip, if the browser cannot create a real context.');
  const data=core.nativeProject(project,room,kind),hash=Buffer.from(JSON.stringify(data)).toString('base64url');
  await page.goto(origin+'/'+kind+'/atelier.html#projet='+hash,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready||!document.querySelector('#error')?.hidden,null,{timeout:90000});
  const startup=await page.evaluate(()=>({ready:!!window.studioOnePrototype?.getState().ready,error:document.querySelector('#error-text')?.textContent}));
  assert(startup.ready,kind+': active atelier startup failed: '+startup.error);
  await page.evaluate(()=>studioOnePrototype.waitForTextures());
  await page.waitForFunction(()=>studioOnePrototype.getDiagnostics().triangles>0,null,{timeout:30000});
  const state=await page.evaluate(()=>({project:studioOnePrototype.exportProject(),report:studioOnePrototype.quantityReport(),diagnostics:studioOnePrototype.getDiagnostics(),collections:[...document.querySelector('#floor-collection').options].map(o=>o.value)}));
  assert.equal(String(state.diagnostics.three),'180');assert(state.diagnostics.drawCalls>0);
  assert.deepEqual(state.collections,expectedCollections,kind+': available collections diverged from the shared source');
  assert.deepEqual(state.project.room.points,data.room.points);assert.deepEqual(state.project.room.partitions,data.room.partitions);
  assert.equal(state.project.floor.catalogueKey,product.key);assert.equal(state.project.floor.color,'caramello');
  assert.equal(state.project.items.filter(i=>i.type==='door').length,1);assert.equal(state.project.items.filter(i=>i.type==='window').length,1);
  for(const opening of data.items){const actual=state.project.items.find(i=>i.type===opening.type);assert.deepEqual(actual.placement,opening.placement);assert.equal(actual.settings.width,opening.settings.width);assert.equal(actual.settings.height,opening.settings.height);}
  assert(Math.abs(state.report.rows[0].area-expected.area)<1e-6,kind+': imported net floor area changed');
  assert.equal(state.report.rows[0].tileCount,expected.tileCount);
  pass(kind+': real WebGL2 atelier, shared ELIOS collections and PLAN & POSE contour/partition/openings/SKU/quantities');
  const decoded=await page.evaluate(async base=>{const results=[];for(const file of ['assets/creta-caramello.webp','assets/finishes/20261022/roble-fluid.webp']){const img=new Image();img.crossOrigin='anonymous';img.src=base+'/'+file;await img.decode();const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;canvas.getContext('2d').drawImage(img,0,0,1,1);canvas.getContext('2d').getImageData(0,0,1,1);results.push({file,width:img.naturalWidth,height:img.naturalHeight});}return results;},origin+'/studio');
  assert(decoded.every(image=>image.width>0&&image.height>0));const surfaceInfo=state.diagnostics.textures.surfaces,loadedSurfaces=Array.isArray(surfaceInfo)?surfaceInfo:Object.values(surfaceInfo).flatMap(group=>Object.entries(group).map(([id,data])=>({...data,id})));assert(loadedSurfaces.some(t=>t.id.includes('caramello')&&t.width>0));
  pass(kind+': official local Creta and RANDAL images decode and remain readable by canvas');
  const capture=await page.evaluate(async()=>{
   const app=studioOnePrototype,before=JSON.stringify(app.exportProject()),stage=document.querySelector('#viewer'),height=Math.round(1920*stage.clientHeight/stage.clientWidth);
   await app.waitForTextures();const image=new Image(),data=await Promise.race([app.captureHD({width:1920}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Native HD capture exceeded 90 seconds')),90000))]);
   if(!data.startsWith('data:image/png;base64,'))throw Error('Native HD capture did not return a PNG');
   image.src=data;await image.decode();const diagnostics=app.getDiagnostics();
   return {before,after:JSON.stringify(app.exportProject()),width:image.naturalWidth,height:image.naturalHeight,expectedHeight:height,quality:diagnostics.qualityProfile,mode:diagnostics.qualityMode,inert:document.body.inert};
  });
  assert.equal(capture.width,1920);assert.equal(capture.height,capture.expectedHeight);assert.equal(capture.before,capture.after);assert.equal(capture.quality,'fluid');assert.equal(capture.mode,'fluid');assert.equal(capture.inert,false);
  pass(kind+': native 1920px PNG capture restores fluid quality and preserves the complete project');

  await page.locator('button[data-workspace=finishes]').click();
  // Exercise the new reviewed catalogue, real local image bytes, selected
  // finishing SKU, reconstructed wood and physical 2x2 decor panel in WebGL.
  for(const surface of [
   {collection:'Yosemite',color:'honey',format:'23.4x95.7'},
   {collection:'Stone Icon',color:'campaspero',format:'60x60'},
   {collection:'Terraforma',color:'flora',format:'30x30'},
   {collection:'Dynasty',color:'crown-green',format:'30x30'}
  ]){
   await page.evaluate(async spec=>{const app=studioOnePrototype;app.setSurfaceCollection('floor',spec.collection);app.setSurface('floor',spec.color);if(!app.setTileFormat('floor',spec.format))throw Error('New format unavailable: '+JSON.stringify(spec));await app.waitForTextures();},surface);
   const actual=await page.evaluate(()=>{const diagnostics=studioOnePrototype.getDiagnostics(),loaded=diagnostics.textures.surfaces;const textures=Array.isArray(loaded)?loaded:Object.entries(loaded).flatMap(([collection,entries])=>Object.entries(entries).map(([key,data])=>({collection,id:JSON.parse(key)[1],...data})));return {floor:studioOnePrototype.exportProject().floor,drawCalls:diagnostics.drawCalls,textures};});
   assert.equal(actual.floor.collection,surface.collection);assert.equal(actual.floor.color,surface.color);assert.equal(actual.floor.format,surface.format);assert(actual.drawCalls>0);
   assert(actual.textures.some(texture=>texture.collection===surface.collection&&texture.id===surface.color&&texture.width>32&&texture.height>32),kind+': selected '+surface.collection+' image must be decoded and loaded');
   if(surface.collection==='Stone Icon'){
    const chosen=products.find(p=>p.collection==='Stone Icon'&&p.colorId==='campaspero'&&p.format==='60x60'&&p.finish.includes('Tumbled Grip'));assert(chosen);
    await page.locator('#floor-commercial select').selectOption(chosen.key);
    const saved=await page.evaluate(()=>studioOnePrototype.exportProject());assert.equal(saved.floor.catalogueKey,chosen.key);assert.equal(saved.floor.finish,chosen.finish);assert.equal(saved.floor.reference,chosen.reference);
    assert.equal(await page.evaluate(data=>studioOnePrototype.restoreProject(data),saved),true);await page.evaluate(()=>studioOnePrototype.waitForTextures());
    assert.equal(await page.evaluate(()=>studioOnePrototype.exportProject().floor.catalogueKey),chosen.key);
   }
   pass(kind+': '+surface.collection+' real texture loading, compatible format'+(surface.collection==='Stone Icon'?', exact Grip SKU and restored finish':''));
  }
  const decorCapture=await page.evaluate(async()=>{await studioOnePrototype.waitForTextures();const data=await studioOnePrototype.captureHD({width:1920});const image=new Image();image.src=data;await image.decode();return {width:image.naturalWidth,quality:studioOnePrototype.getDiagnostics().qualityProfile};});
  assert.equal(decorCapture.width,1920);assert.equal(decorCapture.quality,'fluid');
  pass(kind+': native HD capture with the new Dynasty panel restores working quality');

  await page.locator('button[data-workspace=room]').click();await page.locator('#room-open').click();await page.locator('#room-height').fill('270');await page.locator('#room-apply').click();
  await page.waitForFunction(()=>!document.querySelector('#room-editor').open);assert.equal(await page.evaluate(()=>studioOnePrototype.exportProject().room.height),270);
  await page.setViewportSize({width:390,height:844});await page.locator('button[data-workspace=room]').click();await page.locator('#room-open').click();
  assert(await page.locator('#room-editor').evaluate(e=>e.getBoundingClientRect().width<=innerWidth+2));
  await page.locator('#room-height').fill('280');await page.locator('#room-apply').click();await page.waitForFunction(()=>!document.querySelector('#room-editor').open);
  assert.equal(await page.evaluate(()=>studioOnePrototype.exportProject().room.height),280);
  await page.screenshot({path:path.join(output,kind+'-mobile.png')});
  pass(kind+': room editor applies dimensions on desktop and 390px viewport');
  await context.close();page=null;
 }
 assert.equal(errors.length,0,errors.join('\n'));
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,checks,errors,network,blockedRemoteRequests:[...blocked]},null,2));
 console.log('ACTIVE ATELIERS CHECKS',checks.length);
})().catch(async error=>{
 const state=page?await page.evaluate(()=>({url:location.pathname,loading:document.querySelector('#loading')?.textContent,loadingClass:document.querySelector('#loading')?.className,error:document.querySelector('#error-text')?.textContent,status:document.querySelector('#placement-status')?.textContent,ready:window.studioOnePrototype?.getState().ready})).catch(()=>null):null;console.error('FAILURE STATE',JSON.stringify(state));console.error('NETWORK',JSON.stringify(network));fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:false,error:error.stack,state,checks,errors,network,blockedRemoteRequests:[...blocked]},null,2));
 if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
 console.error(error);process.exitCode=1;
}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});

