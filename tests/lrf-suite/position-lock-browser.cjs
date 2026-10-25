// Real built 3D scenes and mouse input. All projects and accounts are local fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),roots={studio:path.join(root,'studio-one/dist'),general:path.join(root,'randal-general/dist')};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const read=(dir,relative)=>{const file=path.resolve(dir,'.'+relative);return file.startsWith(dir+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}:null;};
let browser,server,page,active='studio';const checks=[],errors=[];const evidenceDir=process.env.LRF_LOCK_QA_DIR||'/tmp/lrf-position-lock-qa';fs.mkdirSync(evidenceDir,{recursive:true});
(async()=>{
 server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),kind=pathname.split('/')[1];if(pathname.includes('/api/')){res.writeHead(401,{'Content-Type':'application/json'});return res.end('{"success":false}');}const asset=roots[kind]?read(roots[kind],pathname.slice(kind.length+1)):pathname.startsWith('/assets/')?read(roots[active],pathname):null;if(!asset){res.writeHead(404);return res.end();}res.setHeader('Content-Type',asset.contentType);res.end(asset.body);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const kind of ['studio','general'])for(const mobile of [false,true]){
  active=kind;const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.__LRF_STANDALONE_PREVIEW__=true;localStorage.setItem('studio-one-render-quality','fluid');localStorage.setItem('randal-general-render-quality','fluid');});
  await context.route(/^https:\/\//,route=>{const u=new URL(route.request().url());let asset;if(u.hostname==='studio-one-beta-test-v2.vercel.app')asset=read(roots.studio,u.pathname);else if(u.hostname==='randal-catalogue-general-3d.vercel.app')asset=read(roots.general,u.pathname);else if(u.hostname==='leroyfactory.fr'&&u.pathname.startsWith('/review-studio/'))asset=read(roots.studio,u.pathname.slice('/review-studio'.length));return asset?route.fulfill({...asset,headers:{'Access-Control-Allow-Origin':'*'}}):route.abort();});
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(kind+': '+error.message));
  await page.goto(origin+'/'+kind+'/atelier.html?standalone=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.studioOnePrototype?.getState().ready||!document.querySelector('#error')?.hidden,null,{timeout:90000});assert(await page.evaluate(()=>!!window.studioOnePrototype?.getState().ready));
  const prefix=kind+' '+(mobile?'mobile touch':'desktop mouse');
  const fixture=()=>page.evaluate(()=>{const app=studioOnePrototype,p=app.exportProject();p.items=[];p.room={height:260,points:[[0,0],[450,0],[450,450],[0,450]]};p.walls=[0,1,2,3].map(()=>({collection:'Peinture',color:'white'}));p.renovation={locked:false};if(!app.restoreProject(p))throw Error('Lock fixture restore failed');});
  const press=locator=>mobile?locator.tap():locator.click();
  for(const type of ['window','door']){
   await fixture();
   const ids=await page.evaluate(type=>{const app=studioOnePrototype;
    if(!app.addItem('window',0,{width:80,height:80,placement:{wall:0,u:90,height:120}}))throw Error('Anchor window fixture failed');
    const anchor=app.getState().items.at(-1).id;app.renovation().setLock(true);
    if(!app.addItem(type,0,{width:type==='door'?83:100,height:type==='door'?204:100,placement:{wall:0,u:275,height:type==='door'?0:100}}))throw Error('New locked element fixture failed');
    const id=app.getState().items.at(-1).id;app.selectItem(id);app.setView('front',true);
    return {id,anchor};
   },type);
   const read=()=>page.evaluate(({id,anchor})=>{const app=studioOnePrototype,items=app.exportProject().items,item=items.find(i=>i.id===id);return {item,anchor:items.find(i=>i.id===anchor),global:app.renovation().getState().locked,actions:app.itemContextActions(item).filter(a=>a.id==='lock').map(a=>({label:a.label,pressed:a.pressed}))};},ids);
   let before=await read();assert.equal(before.global,true);assert.deepEqual(before.actions,[{label:'Déverrouiller',pressed:true}]);
   const blocked=await page.evaluate(id=>studioOnePrototype.moveItem(id,{u:320}),ids.id);assert.match(blocked.error,/verrouillé/);
   assert.equal(await page.evaluate(()=>studioOnePrototype.resizeOpening(110,105)),false,'Locked opening size is protected');
   let lock=page.locator('#item-position-lock');if(await lock.count()===0){await page.evaluate(id=>studioOnePrototype.handleObjectTap({itemId:id,editTarget:studioOnePrototype.getState().items.find(i=>i.id===id).type}),ids.id);lock=page.locator('#item-position-lock');}
   if(await lock.count())await press(lock);else{
    await press(page.locator('#object-editor .lrf-mobile-options > summary'));const mobileLock=page.locator('.lrf-mobile-object-actions button').filter({hasText:'Déverrouiller'});assert(await mobileLock.count());await press(mobileLock);
   }
   let unlocked=await read();assert.equal(unlocked.global,true);assert.equal(unlocked.item.positionUnlocked,true);assert.deepEqual(unlocked.actions,[{label:'Verrouiller',pressed:false}]);
   // Leave the editor and draw actual bounds so the pointer lands on the opening.
   await page.evaluate(id=>{document.querySelector('#object-editor-close')?.click();studioOnePrototype.toggleItemDimensions(id);},ids.id);
   await page.waitForFunction(()=>[...document.querySelectorAll('#dimension-svg text')].some(el=>/^H ·/.test(el.textContent)));await page.waitForTimeout(250);
   const point=await page.evaluate(()=>{const groups=[...document.querySelectorAll('#dimension-svg g')],g=groups.find(g=>g.querySelector('text')?.textContent.startsWith('H ·'));const nums=g.querySelector('path').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number),box=document.querySelector('#dimension-svg').getBoundingClientRect();return {x:box.left+box.width/2,y:box.top+(nums[1]+nums[3])/2};});
   if(mobile){const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});await page.waitForTimeout(420);for(let step=1;step<=8;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+step*7,y:point.y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}
   else{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+100,point.y,{steps:12});await page.mouse.up();}
   await page.waitForFunction(({id,u})=>Math.abs(studioOnePrototype.getState().items.find(i=>i.id===id).placement.u-u)>5,{id:ids.id,u:unlocked.item.placement.u},{timeout:7000});
   const after=await read();assert.equal(after.global,true);assert.deepEqual(after.anchor.placement,before.anchor.placement);assert.equal(after.item.positionUnlocked,true);
   assert.match((await page.evaluate(id=>studioOnePrototype.moveItem(id,{u:135}),ids.anchor)).error,/verrouillé/);
   const project=await page.evaluate(()=>studioOnePrototype.exportProject());assert(await page.evaluate(p=>studioOnePrototype.restoreProject(p),project));
   const reopened=await read();assert.equal(reopened.global,true);assert.equal(reopened.item.positionUnlocked,true);assert.deepEqual(reopened.item.placement,after.item.placement);assert.deepEqual(reopened.actions,[{label:'Verrouiller',pressed:false}]);
   if(type==='window'){await page.evaluate(id=>studioOnePrototype.handleObjectTap({itemId:id,editTarget:'window'}),ids.id);await page.screenshot({path:path.join(evidenceDir,kind+'-'+(mobile?'mobile':'desktop')+'.png'),fullPage:true});}
   await page.evaluate(id=>studioOnePrototype.renovation().setLock(true,id),ids.id);assert.match((await page.evaluate(id=>studioOnePrototype.moveItem(id,{u:320}),ids.id)).error,/verrouillé/);
   await page.evaluate(()=>{studioOnePrototype.renovation().setLock(false);studioOnePrototype.renovation().setLock(true);});assert.match((await page.evaluate(id=>studioOnePrototype.moveItem(id,{u:320}),ids.id)).error,/verrouillé/);
   checks.push(prefix+': '+type+' added while globally locked shows actual lock, unlocks alone through UI, moves with real input, preserves other elements and persists on reopen');console.log('PASS',checks.at(-1));
  }
  await context.close();page=null;
 }
 assert.deepEqual(errors,[]);const report={passed:true,checks,errors};fs.writeFileSync(path.join(evidenceDir,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(async error=>{if(page){console.error(await page.evaluate(()=>({items:studioOnePrototype?.getState().items,html:document.querySelector('#object-editor')?.innerText,error:document.querySelector('#error-text')?.textContent,dimensions:document.querySelector('#dimension-svg')?.innerHTML})).catch(()=>null));await page.screenshot({path:'/tmp/lrf-position-lock-failure.png',fullPage:true}).catch(()=>{});}console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
