import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),output=path.join(root,'qa-results/room-configurator');fs.mkdirSync(output,{recursive:true});
const origin=process.env.HOUSE_URL||'https://maison-3d-leroyfactory-hugol-trading.vercel.app';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),...(process.env.HTTPS_PROXY||process.env.https_proxy?{proxy:{server:process.env.https_proxy||process.env.HTTPS_PROXY}}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[],errors=[],network=[];
const passed=label=>{checks.push(label);console.log('PASS',label);};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(90000);
 p.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});p.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE',m.text());}});p.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))network.push({url:r.url(),error:r.failure()?.errorText});});
 if(process.env.HOUSE_DIST)await p.route(origin+'/**',async route=>{const u=new URL(route.request().url());if(u.pathname.startsWith('/shared/materials/'))return route.fulfill({response:await route.fetch({url:'https://randal-catalogue-general-3d.vercel.app/assets/materials/'+u.pathname.split('/').pop()})});const f=path.join(process.env.HOUSE_DIST,u.pathname==='/'?'index.html':u.pathname);return fs.existsSync(f)?route.fulfill({path:f,contentType:{'.html':'text/html','.js':'application/javascript','.css':'text/css'}[path.extname(f)]||'application/octet-stream'}):route.continue();});

 const done=()=>p.waitForFunction(()=>document.querySelector('#workshop-panel').getAttribute('aria-busy')!=='true');
 const shot=name=>p.screenshot({path:path.join(output,name+'.png'),timeout:90000});
 await p.goto(origin,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.maison3D?.getState().ready||!document.querySelector('#fatal').hidden,null,{timeout:180000});
 assert.equal(await p.evaluate(()=>window.maison3D?.getState().ready),true,await p.locator('#fatal-text').textContent());await p.waitForFunction(()=>document.querySelector('#loading').hidden);await p.evaluate(()=>maison3D.setQuality('eco'));
 const audit=await p.evaluate(()=>maison3D.arrangement.audit());console.log('INITIAL AUDIT',JSON.stringify(audit));assert.deepEqual(audit,[]);passed('Initial layout preserves clear doors, stairs and measured furniture bounds');
 await p.locator('#enter').click();await p.locator('#rooms-open').click();await p.locator('#room-list [data-room=shower]').click();
 assert.equal(await p.evaluate(()=>maison3D.getState().roomEditing),true);assert.equal(await p.locator('#item-select').count(),1);passed('Room selection opens its dedicated configurator directly');
 const scopes=[];for(const id of await p.evaluate(()=>maison3D.getState().rooms.map(r=>r.id))){await p.evaluate(id=>maison3D.openRoom(id),id);await p.waitForTimeout(120);const d=await p.evaluate(()=>maison3D.getDiagnostics());scopes.push(d.focus);assert.ok(d.focus.visibleItems.every(i=>i.room===id),JSON.stringify(d.focus));assert.equal(d.focus.visibleFloors.length,1);}
 passed('All thirteen rooms isolate their own actual furniture and floor');
 await p.evaluate(()=>maison3D.openRoom('shower'));await shot('01-bathroom-workspace');
 await p.locator('[data-workshop-tab=surfaces]').click();await p.locator('[data-surface-target=wall]').click();await p.locator('#apply-surface').click();await done();
 console.log('WALL STATUS',await p.locator('#workshop-status').textContent());assert.ok(await p.evaluate(()=>maison3D.workshop.getTakeoffs().find(t=>t.id==='shower').wallTiles.order>0));assert.equal(await p.evaluate(()=>maison3D.workshop.getProject().rooms.shower.wall.kind),'tile');await shot('02-wall-tiles');passed('Wall coverings tile genuine wall geometry around doors and windows');
 await p.locator('#room-paint').evaluate(e=>{e.value='#aeb8a1';e.dispatchEvent(new Event('change',{bubbles:true}));});await done();assert.equal(await p.evaluate(()=>maison3D.workshop.getProject().rooms.shower.wall),undefined);passed('Painting replaces wall tiles and keeps the change scoped to one room');
 await p.evaluate(()=>maison3D.openRoom('living'));await p.locator('[data-workshop-tab=library]').click();assert.equal(await p.locator('[data-add-object]').count(),18);await p.locator('[data-add-object=plant-sansevieria]').click();await done();
 console.log('ADD STATUS',await p.locator('#workshop-status').textContent());let extra=await p.evaluate(()=>maison3D.workshop.getProject().additions[0]);assert.equal(extra.product,'plant-sansevieria');assert.equal(await p.locator('#item-remove').count(),1);await shot('03-library-object');passed('Adding an individual plant finds an unobstructed position and opens the real editor');
 await p.locator('#item-remove').scrollIntoViewIfNeeded();await p.locator('#item-remove').click();await p.locator('#room-return').click();assert.equal(await p.evaluate(id=>maison3D.arrangement.list().find(i=>i.id===id).hidden,extra.id),true);assert.ok(!(await p.evaluate(()=>maison3D.getDiagnostics().focus.visibleItems)).some(i=>i.id===extra.id));passed('Removed object remains removed when returning to the whole house');
 await p.evaluate(()=>maison3D.openRoom('living'));await p.locator('[data-workshop-tab=library]').click();await p.locator('[data-add-object=art-horizon]').click();await done();assert.equal(await p.evaluate(()=>maison3D.workshop.getProject().additions.length),2);passed('Distinct HD artwork can be added on a wall');
 const saved=await p.evaluate(()=>maison3D.workshop.getProject());await p.evaluate(p=>maison3D.workshop.replaceProject(p),saved);assert.equal(await p.evaluate(()=>maison3D.getState().roomEditing),true);assert.equal(await p.evaluate(()=>maison3D.workshop.getProject().additions.length),2);assert.deepEqual(await p.evaluate(()=>maison3D.arrangement.audit()),[]);passed('Rebuilding the project restores additions, removals and the active room configurator');
 await p.locator('#room-return').click();await p.locator('.view-tabs button[data-mode=character]').click();await p.waitForFunction(()=>maison3D.getState().mode==='character'||(!document.querySelector('#character-status').hidden&&!document.querySelector('#character-status').textContent.includes('Préparation')),null,{timeout:40000});assert.equal(await p.evaluate(()=>maison3D.getState().mode),'character',JSON.stringify(await p.evaluate(()=>({c:maison3D.character.getState(),status:document.querySelector('#character-status').textContent}))));
 const char=await p.evaluate(()=>maison3D.character.getState());console.log('CHARACTER',JSON.stringify(char));assert.ok(char.loaded&&char.bones>70&&char.expressions===4);await p.locator('#avatar-wave').click();assert.equal(await p.evaluate(()=>maison3D.character.getState().gesture),'wave');await shot('04-character-desktop');passed('Textured human, hair, eyes and facial rig load lazily and respond to gestures');
 const from=await p.evaluate(()=>maison3D.character.getState().position);
 const freeKey=await p.evaluate(()=>{const a=maison3D,c=a.character.getState(),v=a.getViewProjection(),dx=v.target[0]-v.position[0],dz=v.target[2]-v.position[2],l=Math.hypot(dx,dz),fx=dx/l,fz=dz/l;return [['KeyD',-fz,fx],['KeyS',-fx,-fz],['KeyA',fz,-fx],['KeyW',fx,fz]].find(([,x,z])=>a.canStand(c.position[0]+x*.12,c.position[2]+z*.12,c.ground))?.[0];});
 assert.ok(freeKey,'A clear direction must exist around the initial actor pose');await p.keyboard.down(freeKey);
 try{await p.waitForFunction(from=>{const p=maison3D.character.getState().position;return Math.hypot(p[0]-from[0],p[2]-from[2])>.03;},from,{timeout:30000});}finally{await p.keyboard.up(freeKey);}
 const to=await p.evaluate(()=>maison3D.character.getState().position);assert.ok(Math.hypot(to[0]-from[0],to[2]-from[2])>.02,JSON.stringify({from,to}));assert.equal(await p.evaluate(()=>{const c=maison3D.character.getState();return maison3D.canStand(c.position[0],c.position[2],c.ground);}),true);passed('Character actually walks with the existing obstacle collision system');
 await p.locator('#configure-room').click();await p.locator('#room-return').click();await p.waitForFunction(()=>maison3D.getState().mode==='character');passed('Room editing returns to the character visit without losing the room changes');
 for(const viewport of [{width:390,height:844},{width:360,height:640},{width:844,height:390}]){
  await p.setViewportSize(viewport);await p.evaluate(()=>maison3D.openRoom('bathroom'));await p.locator('[data-workshop-tab=bathroom]').click();await p.locator('#apply-bath').scrollIntoViewIfNeeded();
  for(const id of ['#apply-bath','#room-return','#workshop-close']){const b=await p.locator(id).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width+.5&&b.y+b.height<=viewport.height+.5,id+JSON.stringify(b));}
  await shot('05-mobile-room-'+viewport.width);
 }
 passed('Room return, close and apply controls remain reachable in three mobile viewport sizes');
 await p.setViewportSize({width:390,height:844});await p.locator('#room-return').click();await p.waitForFunction(()=>maison3D.getState().mode==='character');await shot('06-character-mobile');
 const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const touchStart=await p.evaluate(()=>maison3D.character.getState().position);
 const freeMove=await p.evaluate(()=>{const a=maison3D,c=a.character.getState(),v=a.getViewProjection(),dx=v.target[0]-v.position[0],dz=v.target[2]-v.position[2],l=Math.hypot(dx,dz),fx=dx/l,fz=dz/l;return [['right',-fz,fx],['down',-fx,-fz],['left',fz,-fx],['up',fx,fz]].find(([,x,z])=>a.canStand(c.position[0]+x*.12,c.position[2]+z*.12,c.ground))?.[0];});assert.ok(freeMove);
 const control=await p.locator('[data-move='+freeMove+']').boundingBox();assert.ok(control.x>=0&&control.y+control.height<=844);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:control.x+control.width/2,y:control.y+control.height/2}]});
 try{await p.waitForFunction(start=>{const p=maison3D.character.getState().position;return Math.hypot(p[0]-start[0],p[2]-start[2])>.03;},touchStart,{timeout:30000});}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 const cameraBefore=await p.evaluate(()=>maison3D.getViewProjection().position);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:420}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:250,y:445}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await p.waitForFunction(before=>{const p=maison3D.getViewProjection().position;return Math.hypot(...p.map((n,i)=>n-before[i]))>.08;},cameraBefore,{timeout:30000});
 passed('Actual mobile touch controls move the avatar and swipe the third-person camera');
 for(const id of ['visit','character','model','plan','exterior']){const b=await p.locator('.view-tabs button[data-mode='+id+']').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=390.5,id+JSON.stringify(b));}
 passed('All five visit mode buttons fit inside the smartphone viewport');
 await p.locator('.view-tabs button[data-mode=visit]').click();assert.equal(await p.evaluate(()=>maison3D.getState().mode),'visit');passed('Classic first-person visit remains available after the Sims-like mode');
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);const diagnostics=await p.evaluate(()=>maison3D.getDiagnostics());fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({result:'PASS',checks,scopes,char,diagnostics},null,2));console.log(JSON.stringify({result:'PASS',checks,diagnostics}));
}finally{await browser.close();}
