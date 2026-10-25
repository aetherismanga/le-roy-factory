// Real built 3D scenes and mouse input. All projects and accounts are local fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),roots={studio:path.join(root,'studio-one/dist'),general:path.join(root,'randal-general/dist')};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const read=(dir,relative)=>{const file=path.resolve(dir,'.'+relative);return file.startsWith(dir+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}:null;};
let browser,server,page,active='studio';const checks=[],errors=[];
(async()=>{
 server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),kind=pathname.split('/')[1];if(pathname.includes('/api/')){res.writeHead(401,{'Content-Type':'application/json'});return res.end('{"success":false}');}const asset=roots[kind]?read(roots[kind],pathname.slice(kind.length+1)):pathname.startsWith('/assets/')?read(roots[active],pathname):null;if(!asset){res.writeHead(404);return res.end();}res.setHeader('Content-Type',asset.contentType);res.end(asset.body);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const kind of ['studio','general']){
  active=kind;const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.__LRF_STANDALONE_PREVIEW__=true;localStorage.setItem('studio-one-render-quality','fluid');localStorage.setItem('randal-general-render-quality','fluid');});
  await context.route(/^https:\/\//,route=>{const u=new URL(route.request().url());let asset;if(u.hostname==='studio-one-beta-test-v2.vercel.app')asset=read(roots.studio,u.pathname);else if(u.hostname==='randal-catalogue-general-3d.vercel.app')asset=read(roots.general,u.pathname);else if(u.hostname==='leroyfactory.fr'&&u.pathname.startsWith('/review-studio/'))asset=read(roots.studio,u.pathname.slice('/review-studio'.length));return asset?route.fulfill({...asset,headers:{'Access-Control-Allow-Origin':'*'}}):route.abort();});
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(kind+': '+error.message));
  await page.goto(origin+'/'+kind+'/atelier.html?standalone=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready||!document.querySelector('#error')?.hidden,null,{timeout:90000});assert(await page.evaluate(()=>!!window.studioOnePrototype?.getState().ready));
  const fixture=async(extra={})=>page.evaluate(extra=>{const app=studioOnePrototype,p=app.exportProject();p.items=[];p.room={height:260,points:[[0,0],[450,0],[450,450],[0,450]],...extra};p.renovation={locked:false};if(!app.restoreProject(p))throw Error('WC fixture restore failed');},extra);
  const selected=()=>page.evaluate(()=>studioOnePrototype.getState().items.at(-1));
  const prepare=async(support,u=225)=>{
   await page.evaluate(({support,u})=>{const app=studioOnePrototype;if(!app.addItem('toilet',0,{reference:'TR2217R',support,supportCovering:{mode:'inherit'},placement:{wall:0,u,height:support?0:12}}))throw Error('WC add failed');const id=app.getState().items.at(-1).id;app.selectItem(id);app.setView('front',true);app.toggleItemDimensions(id);},{support,u});
   await page.waitForFunction(()=>[...document.querySelectorAll('#dimension-svg text')].some(el=>/^H ·/.test(el.textContent)));
   await page.waitForTimeout(300);
  };
  const center=async()=>page.evaluate(()=>{
   const groups=[...document.querySelectorAll('#dimension-svg g')],find=prefix=>{const group=groups.find(g=>g.querySelector('text')?.textContent.startsWith(prefix));if(!group)throw Error('No selected WC '+prefix+' dimensions');return group.querySelector('path').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);};
   const height=find('H ·'),box=document.querySelector('#dimension-svg').getBoundingClientRect();return {x:box.left+box.width/2,y:box.top+(height[1]+height[3])/2};
  });
  await fixture();await prepare(true);let before=await selected(),point=await center();
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+100,point.y-45,{steps:12});await page.mouse.up();
  await page.waitForFunction(u=>Math.abs(studioOnePrototype.getState().items.at(-1).placement.u-u)>10,before.placement.u);
  let after=await selected();assert.equal(after.placement.height,0);assert.equal(after.placement.offset,0);assert.equal(after.placement.rotation,0);assert.equal(after.placement.wall,0);
  await page.waitForTimeout(350);await page.evaluate(()=>studioOnePrototype.undoProject());assert.equal((await selected()).placement.u,before.placement.u);await page.evaluate(()=>studioOnePrototype.redoProject());assert.equal((await selected()).placement.u,after.placement.u);
  checks.push(kind+': actual left-mouse frame drag stays flush and level, and undo/redo restore its placement');

  await fixture();await prepare(true,419);before=await selected();point=await center();
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+130,point.y,{steps:16});await page.mouse.up();
  after=await selected();assert.equal(after.placement.wall,1,'A real mouse drag should transfer a WC around the wall corner');assert.equal(after.placement.height,0);assert.equal(after.placement.rotation,0);assert.equal(after.placement.offset,0);
  checks.push(kind+': mouse transfers frame to perpendicular wall with the correct wall-facing orientation');

  await fixture({niches:[{id:'niche-browser-wc',wallKey:'boundary-0',u:225,width:120,bottom:2,height:140,depth:5}]});await prepare(false);before=await selected();assert.equal(before.placement.nicheId,'niche-browser-wc');assert.equal(before.placement.offset,-5);
  point=await center();await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+150,point.y-20,{steps:15});await page.mouse.up();after=await selected();
  assert(Math.abs(after.placement.u-before.placement.u)>10,'Bowl-only WC responds to real mouse dragging');assert.equal(after.placement.rotation,0);
  const project=await page.evaluate(()=>studioOnePrototype.exportProject());await page.evaluate(p=>{if(!studioOnePrototype.restoreProject(p))throw Error('WC project reopen failed');},project);assert.deepEqual((await selected()).placement,after.placement);
  checks.push(kind+': actual large niche-back attachment, bowl mouse drag and complete project reopening');

  await fixture();
  const legacyFixture=await page.evaluate(()=>{
   const app=studioOnePrototype;if(!app.addItem('cabinet',0,{placement:{wall:0,u:225,height:28}}))throw Error('Legacy cabinet fixture failed');
   if(!app.addItem('toilet',0,{reference:'TR2217R',support:true,placement:{wall:0,u:225,height:0}}))throw Error('Legacy WC fixture failed');
   const p=app.exportProject(),wc=p.items.find(i=>i.type==='toilet');wc.placement={wall:0,u:225,height:0,offset:80,rotation:180};return p;
  });
  for(const support of [true,false])for(const wcFirst of [false,true]){
   const legacy=structuredClone(legacyFixture),wc=legacy.items.find(i=>i.type==='toilet'),cabinet=legacy.items.find(i=>i.type==='cabinet');
   wc.settings.support=support;wc.placement.height=support?0:12;legacy.items=wcFirst?[wc,cabinet]:[cabinet,wc];
   const result=await page.evaluate(p=>{const app=studioOnePrototype,unchanged=JSON.stringify(p),ok=app.restoreProject(p);return {ok,unchanged:JSON.stringify(p)===unchanged,items:app.exportProject().items};},legacy);
   assert.equal(result.ok,true,'Old floating/reversed WC reopens in either item ordering');assert.equal(result.unchanged,true,'Compatibility repair does not mutate the supplied legacy project');
   assert.deepEqual(result.items.find(i=>i.type==='cabinet').placement,cabinet.placement,'Reattaching the WC never moves the saved cabinet');
   const repaired=result.items.find(i=>i.type==='toilet');assert.equal(repaired.placement.offset,0);assert.equal(repaired.placement.rotation,0);assert.equal(repaired.placement.height,support?0:12);assert(Math.abs(repaired.placement.u-225)>20,'WC finds a free wall slot instead of overlapping the cabinet');
   const reopen=await page.evaluate(p=>studioOnePrototype.restoreProject(p),{...legacy,items:result.items});assert.equal(reopen,true);
  }
  checks.push(kind+': legacy floating/reversed frame or bowl reopens in either item order, preserves the cabinet and recalculates a valid flush wall slot');
  await context.close();page=null;
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,errors}));
})().catch(async error=>{if(page){console.error(await page.evaluate(()=>({items:studioOnePrototype?.getState().items,error:document.querySelector('#error-text')?.textContent,dimensions:document.querySelector('#dimension-svg')?.innerHTML})).catch(()=>null));await page.screenshot({path:'/tmp/lrf-wc-attachment-failure.png',fullPage:true}).catch(()=>{});}console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
