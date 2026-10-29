// Real native mouse/scrollbar events against the two built ateliers. No live
// account, commercial credentials or user project is used.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const root=path.resolve(__dirname,'../..'),output=process.env.LRF_QA_OUTPUT||path.join(os.tmpdir(),'lrf-panel-scroll-qa');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.hdr':'application/octet-stream'};
let activeApp='studio-one',server,browser;const errors=[],checks=[];
function localAsset(app,pathname){const base=path.join(root,app,'dist'),file=path.resolve(base,'.'+decodeURIComponent(pathname));return file.startsWith(base+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?file:null;}
function pass(message){checks.push(message);console.log('PASS',message);}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({client:null,proHT:null,proStatus:'unauthenticated',projects:[]}));}const file=localAsset(activeApp,url.pathname==='/'?'/atelier.html':url.pathname);if(!file){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.LRF_BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const app of ['studio-one','randal-general']){
  activeApp=app;const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await context.addInitScript(()=>{localStorage.setItem('studio-one-render-quality','fluid');localStorage.setItem('randal-general-render-quality','fluid');});
  await context.route(/^https:\/\//,route=>{const url=new URL(route.request().url()),name=url.hostname==='studio-one-beta-test-v2.vercel.app'?'studio-one':url.hostname==='randal-catalogue-general-3d.vercel.app'?'randal-general':url.hostname==='leroyfactory.fr'&&url.pathname.startsWith('/review-studio/assets/')?'studio-one':null,file=name&&localAsset(name,url.pathname.replace(/^\/review-studio/,''));return file?route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'}):route.abort();});
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(app+': '+error.message));
  await page.goto(origin+'/atelier.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready,null,{timeout:90000});
  await page.evaluate(()=>{studioOnePrototype.setSurfaceCollection('wall','Creta');studioOnePrototype.handleObjectTap({editTarget:'wall:0'});});
  const inspector=page.locator('#object-editor');await inspector.waitFor({state:'visible'});
  // A stable classic scrollbar makes the native thumb test repeatable on
  // platforms that otherwise hide their overlay scrollbar until hovered.
  await page.addStyleTag({content:'#settings{scrollbar-gutter:stable;scrollbar-width:auto!important}#settings::-webkit-scrollbar{width:16px}#settings::-webkit-scrollbar-thumb{background:#8b9585;border:3px solid #f9f9f5;border-radius:8px}'});
  const before=await page.evaluate(()=>{window.__scrollSceneEvents=[];for(const type of ['pointerdown','pointermove','pointerup','wheel'])document.querySelector('#scene').addEventListener(type,event=>window.__scrollSceneEvents.push(type));return {title:document.querySelector('#object-editor-title').textContent,wall:studioOnePrototype.getState().selectedWall,project:JSON.stringify(studioOnePrototype.exportProject())};});
  const geometry=await page.locator('#settings').evaluate(element=>{element.scrollTop=0;const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,client:element.clientHeight,height:element.scrollHeight,gutter:element.offsetWidth-element.clientWidth};});
  assert(geometry.height>geometry.client+80,app+': natural wall inspector must have scrollable content');assert(geometry.gutter>=12,app+': native scrollbar gutter must exist '+JSON.stringify(geometry));
  const x=geometry.right-7,startY=geometry.top+25,endY=Math.min(geometry.bottom-30,startY+300);
  await page.mouse.move(x,startY);await page.mouse.down();await page.mouse.move(x,endY,{steps:12});await page.mouse.up();
  // CDP in headless Chromium does not consistently move the native thumb;
  // assert the real gutter gesture is harmless, then verify actual scrolling
  // with a trusted wheel event on the same rail below.
  const afterDrag=await page.evaluate(()=>({hidden:document.querySelector('#object-editor').hidden,title:document.querySelector('#object-editor-title').textContent,wall:studioOnePrototype.getState().selectedWall,scroll:document.querySelector('#settings').scrollTop,events:window.__scrollSceneEvents,project:JSON.stringify(studioOnePrototype.exportProject())}));
  assert.equal(afterDrag.hidden,false);assert.equal(afterDrag.title,before.title);assert.equal(afterDrag.wall,before.wall);assert.equal(afterDrag.project,before.project);assert.deepEqual(afterDrag.events,[]);
  pass(app+': native right scrollbar gutter drag/release keeps the wall inspector open without selecting the scene or changing the project');
  await page.locator('#settings').evaluate(element=>{element.scrollTop=0;});await page.mouse.move(geometry.right-35,geometry.top+150);await page.mouse.wheel(0,420);await page.waitForFunction(()=>document.querySelector('#settings').scrollTop>100);
  assert.equal(await inspector.isVisible(),true);assert.equal(await page.locator('#object-editor-title').innerText(),before.title);assert.deepEqual(await page.evaluate(()=>window.__scrollSceneEvents),[]);
  // Editing a real inspector control remains possible after gutter scrolling.
  const grout=page.getByLabel('Largeur des joints en millimètres');await grout.scrollIntoViewIfNeeded();await grout.click();await page.keyboard.press('End');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#object-editor select[aria-label="Largeur des joints en millimètres"]')?.value==='3');
  assert.equal(await inspector.isVisible(),true);assert.equal(await page.evaluate(()=>studioOnePrototype.exportProject().layouts.walls[0].groutWidth),3);
  pass(app+': wheel scrolling stays in the rail and an actual inspector select still applies its change');
  await page.screenshot({path:path.join(output,app+'-wall-scroll.png'),fullPage:true});
  const bounds=await page.locator('#scene').boundingBox(),cx=bounds.x+bounds.width*.5,cy=bounds.y+bounds.height*.45;
  await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+65,cy+25,{steps:8});await page.mouse.up();assert.equal(await inspector.isVisible(),false,'Real canvas orbit must keep its normal inspector dismissal');
  await page.evaluate(()=>studioOnePrototype.setView('front',true,true));await page.mouse.click(cx,cy);
  await inspector.waitFor({state:'visible'});const genuineTitle=await page.locator('#object-editor-title').innerText();assert.match(genuineTitle,/Mur|Sol|Cloison|miroir|Meuble|vasque|colonne|fenêtre|porte/i);
  const events=await page.evaluate(()=>window.__scrollSceneEvents);assert(events.includes('pointerdown')&&events.includes('pointerup'));
  pass(app+': genuine canvas orbit and object/surface selection still work after the scrollbar gesture');
  await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,errors}));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
