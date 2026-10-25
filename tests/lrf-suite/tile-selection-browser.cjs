const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),roots={studio:path.join(root,'studio-one/dist'),general:path.join(root,'randal-general/dist')};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const errors=[],checks=[];let browser,server,page,activeKind='studio';
const read=(dir,relative)=>{const file=path.resolve(dir,'.'+relative);return file.startsWith(dir+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}:null;};
const pass=message=>{checks.push(message);console.log('PASS',message);};
(async()=>{
 server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),kind=pathname.split('/')[1];
  if(pathname.includes('/api/')){res.writeHead(401,{'Content-Type':'application/json'});return res.end('{"success":false}');}
  const asset=roots[kind]?read(roots[kind],pathname.slice(kind.length+1)):pathname.startsWith('/assets/')?read(roots[activeKind],pathname):null;
  if(!asset){res.writeHead(404);return res.end('Missing QA asset');}res.setHeader('Content-Type',asset.contentType);res.end(asset.body);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.LRF_BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const kind of ['studio','general'])for(const mobile of [false,true]){
  activeKind=kind;const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:930},hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.__LRF_STANDALONE_PREVIEW__=true;localStorage.setItem('studio-one-render-quality','fluid');localStorage.setItem('randal-general-render-quality','fluid');});
  await context.route(/^https:\/\//,route=>{
   const u=new URL(route.request().url());let asset;
   if(u.hostname==='studio-one-beta-test-v2.vercel.app')asset=read(roots.studio,u.pathname);
   else if(u.hostname==='randal-catalogue-general-3d.vercel.app')asset=read(roots.general,u.pathname);
   else if(u.hostname==='leroyfactory.fr'&&u.pathname.startsWith('/review-studio/'))asset=read(roots.studio,u.pathname.slice('/review-studio'.length));
   return asset?route.fulfill({...asset,headers:{'Access-Control-Allow-Origin':'*'}}):route.abort();
  });
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(kind+': '+error.message));
  await page.goto(origin+'/'+kind+'/atelier.html?standalone=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready||!document.querySelector('#error')?.hidden,null,{timeout:90000});
  assert(await page.evaluate(()=>!!window.studioOnePrototype?.getState().ready),await page.locator('#error-text').textContent());
  await page.evaluate(()=>{const app=studioOnePrototype,p=app.exportProject();p.items=[];p.room={height:260,points:[[0,0],[450,0],[450,450],[0,450]]};p.walls=[0,1,2,3].map(()=>({collection:'Allure',color:'eden'}));p.layouts={walls:[0,1,2,3].map(()=>({direction:'horizontal'}))};p.renovation={locked:false};if(!app.restoreProject(p))throw Error('QA project restore failed');app.setView('front',true);app.handleObjectTap({editTarget:'wall:0'});});
  const panel=page.locator('#object-editor'),scope=id=>panel.locator('[data-tile-selection-mode='+id+']');
  const press=async locator=>mobile?locator.tap():locator.click();
  const activate=async id=>press(scope(id));
  const pick=async()=>{const r=await page.locator('#scene').boundingBox(),x=r.x+r.width*.57,y=r.y+r.height*.2;if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);};
  for(const id of ['single','horizontal','vertical']){
   await activate(id);
   assert.equal(await scope(id).getAttribute('aria-pressed'),'true');
   const buttons=await scope(id).evaluate(e=>({height:e.getBoundingClientRect().height,bg:getComputedStyle(e).backgroundColor,other:getComputedStyle(e.parentElement.querySelector('button[aria-pressed=false]')).backgroundColor}));
   assert(buttons.height>=44);assert.notEqual(buttons.bg,buttons.other);
   assert.equal(await page.evaluate(()=>studioOnePrototype.getDiagnostics().tileSelection.active),true);
   await pick();
   const selection=await page.evaluate(()=>studioOnePrototype.getDiagnostics().tileSelection);
   assert.equal(selection.mode,id);assert(selection.selected,'real '+(mobile?'touch':'mouse')+' tap selects tile');
   assert(id==='single'?selection.selected.keys.length===1:selection.selected.keys.length>1);
   assert.match(await panel.locator('#object-editor-title').textContent(),/carreau/i);
   await press(panel.locator('.object-choice').filter({hasText:'Fenix Juniper'}));
   const painted=await page.evaluate(()=>({tiles:studioOnePrototype.exportProject().walls[0].tiles,selection:studioOnePrototype.getDiagnostics().tileSelection.selected}));
   assert(painted.selection.keys.every(key=>painted.tiles[key]==='fenix-juniper'));
   await press(panel.getByRole('button',{name:'Reprendre la couleur du mur',exact:true}));
   const restored=await page.evaluate(()=>({tiles:studioOnePrototype.exportProject().walls[0].tiles,selection:studioOnePrototype.getDiagnostics().tileSelection.selected}));
   assert(restored.selection.keys.every(key=>!Object.hasOwn(restored.tiles,key)));
  }
  pass(kind+' '+(mobile?'390px touch':'desktop mouse')+': scope activates, visible pressed state, real tile picking and single/row/column recolouring');
  await press(panel.getByRole('button',{name:'Terminer les carreaux',exact:true}));
  assert.equal(await page.evaluate(()=>studioOnePrototype.getDiagnostics().tileSelection.active),false);
  await press(panel.getByRole('button',{name:'Modifier les carreaux',exact:true}));assert.equal(await panel.isVisible(),false);await pick();assert(await scope('vertical').isVisible());
  await press(panel.getByRole('button',{name:'Terminer les carreaux',exact:true}));
  await page.evaluate(()=>{const app=studioOnePrototype,p=app.exportProject();p.layouts.walls[0].direction='vertical';if(!app.restoreProject(p))throw Error('Restore failed');app.setView('front',true);app.handleObjectTap({editTarget:'wall:0'});});
  await activate('horizontal');await press(panel.getByRole('button',{name:/Choisir un autre carreau|Modifier les carreaux/}));await pick();
  assert((await page.evaluate(()=>studioOnePrototype.getDiagnostics().tileSelection.selected.keys.length))>1);
  pass(kind+' '+(mobile?'390px touch':'desktop mouse')+': finish/restart and rotated layout keep selection usable');
  await context.close();page=null;
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:checks.length,errors}));
})().catch(async error=>{if(page)console.error('STATE',await page.evaluate(()=>({error:document.querySelector('#error-text')?.textContent,title:document.querySelector('#object-editor-title')?.textContent,selection:window.studioOnePrototype?.getDiagnostics().tileSelection})).catch(()=>null));console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
