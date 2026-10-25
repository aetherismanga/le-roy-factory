const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');

const zoneState=(page,id)=>page.evaluate(id=>studioOnePrototype.exportProject().walls.flatMap(f=>f.zones||[]).find(z=>z.id===id),id);
const zoneScreen=(page,id)=>page.evaluate(id=>studioOnePrototype.renovation().getDiagnostics().zones.find(z=>z.id===id),id);

async function showRoomView(page){
 const frame=await page.evaluate(()=>{const app=studioOnePrototype,before=app.getDiagnostics().frames;app.setView('room',true);return before;});
 // The orbit gesture used for a locked element may change the camera. Its
 // projection matrices and wall cutaway are committed by the next scene render.
 // Wait for that render before reading projected coordinates for a real click.
 await page.waitForFunction(before=>studioOnePrototype.getDiagnostics().frames>before,frame);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
}

async function stableZoneScreen(page,id){
 return page.evaluate(async id=>{
  const started=performance.now();let previous=null,stable=0,zone=null;
  for(let frame=0;frame<120&&performance.now()-started<12000;frame++){
   await new Promise(resolve=>requestAnimationFrame(resolve));
   zone=studioOnePrototype.renovation().getDiagnostics().zones.find(zone=>zone.id===id);if(!zone)throw Error('Projected zone disappeared: '+id);
   const point=zone.screen;if(previous&&Math.hypot(point.x-previous.x,point.y-previous.y)<.25)stable++;else stable=0;
   if(stable>=2)return zone;previous=point;
  }
  throw Error('Zone projection did not settle after the camera change: '+JSON.stringify(zone));
 },id);
}

async function dragZone(page,id,centimetres=50){
 const diagnostic=await zoneScreen(page,id);assert(diagnostic?.screen&&diagnostic?.moveRight50,'A projected zone centre and50cm axis are required for the real pointer regression');
 const a=diagnostic.screen,b={x:a.x+(diagnostic.moveRight50.x-a.x)*centimetres/50,y:a.y+(diagnostic.moveRight50.y-a.y)*centimetres/50};
 const canvas=await page.locator('#viewer canvas').first().boundingBox();assert(canvas);
 for(const p of [a,b])assert(p.x>canvas.x+2&&p.x<canvas.x+canvas.width-2&&p.y>canvas.y+2&&p.y<canvas.y+canvas.height-2,'Drag must stay on the visible canvas');
 await page.mouse.move(a.x,a.y);await page.mouse.down({button:'left'});
 // Deliberately no long press: a desktop drag starts with this short movement.
 await page.mouse.move(b.x,b.y,{steps:6});await page.mouse.up({button:'left'});
 return {before:diagnostic,after:await zoneState(page,id)};
}

async function contextAction(page,id,label){
 const projection=await stableZoneScreen(page,id),p=projection.screen;await page.mouse.click(p.x,p.y,{button:'right'});
 try{
  const menu=page.locator('.lrf-workspace-menu');await menu.waitFor({state:'visible',timeout:3000});await menu.getByRole('menuitem',{name:label,exact:true}).click({timeout:3000});
 }catch(error){
  const diagnostic=await page.evaluate(id=>({menus:[...document.querySelectorAll('.lrf-workspace-menu')].map(menu=>({hidden:menu.hidden,text:menu.innerText,labels:[...menu.querySelectorAll('button')].map(button=>({text:button.textContent,disabled:button.disabled}))})),zone:studioOnePrototype.exportProject().walls.flatMap(f=>f.zones||[]).find(zone=>zone.id===id),projection:studioOnePrototype.renovation().getDiagnostics().zones.find(zone=>zone.id===id),view:studioOnePrototype.getState().view,frames:studioOnePrototype.getDiagnostics().frames}),id);
  throw Error('Real zone context action '+JSON.stringify(label)+' failed: '+JSON.stringify({clicked:p,diagnostic})+'\n'+error.stack);
 }
}

function emptyRoom(){return {version:2,title:'Contrôle colonne PC',room:{height:260,points:[[0,0],[500,0],[500,400],[0,400]],partitions:[],niches:[]},floor:{collection:'Creta',color:'caramello',format:'60x120',groutColor:'Gris clair'},walls:[{collection:'Creta',color:'caramello',format:'60x120'},...Array.from({length:3},()=>({collection:'Peinture',color:'white'}))],layouts:{floor:{width:1.2,height:.6,direction:'horizontal',pattern:'straight'},walls:Array.from({length:4},()=>({width:1.2,height:.6,direction:'horizontal',pattern:'straight'}))},profiles:{enabled:false,internalCorners:false,color:'Argent',walls:[]},renovation:{locked:false,autoCalepinage:false},items:[],tileLoss:10};}

async function complexRoom(root,kind){
 const variant=kind==='studio'?'studio-one':'randal-general';
 const {bathroomPreset}=await import(pathToFileURL(path.join(root,variant,'src/bathroom-presets.js')).href);
 const complex=bathroomPreset('shower');complex.title='Contrôle reprise projet complexe';complex.items=complex.items.filter(item=>['cabinet','mirror','door','window','toilet'].includes(item.type));assert.equal(complex.items.length,5);
 complex.floor={collection:'Creta',color:'caramello',format:'60x120',groutColor:'Gris clair'};
 complex.walls=[{collection:'Allure',color:'fenix-blueberry',format:'60x120',zones:[{id:'zone-pc-complex',name:'Grande colonne',x:150,y:0,width:120,height:260,collection:'Allure',color:'eden',format:'60x120',pattern:'straight',groutWidth:2}]},{collection:'Allure',color:'eden',format:'60x120'},{collection:'Creta',color:'avena',format:'60x120'},{collection:'Peinture',color:'white'}];
 complex.room.niches=[{id:'niche-pc-complex',wallKey:'boundary-1',u:180,bottom:100,width:40,height:30,depth:6,covering:{mode:'split',back:{collection:'Creta',color:'avena',format:'60x120'},reveal:{collection:'Creta',color:'caramello',format:'60x120'}},profileEdges:{left:'Noir',right:'Noir',top:'Noir',bottom:'Noir'}}];
 complex.layouts={floor:{width:1.2,height:.6,pattern:'straight',direction:'horizontal'},walls:Array.from({length:4},()=>({width:1.2,height:.6,pattern:'straight',direction:'horizontal'}))};complex.renovation={locked:false,autoCalepinage:false};return complex;
}

async function verifyPCColumns({page,kind,root,output,pass,restoration}){
 await page.setViewportSize({width:1910,height:1000});
 await page.evaluate(async project=>{const app=studioOnePrototype;if(!app.restoreProject(project))throw Error('PC column fixture cannot be restored');app.selectWall(0);app.setView('room',true);await app.waitForTextures();},emptyRoom());
 await page.locator('button[data-workspace=finishes]').click();
 await page.evaluate(()=>studioOnePrototype.renovation().showZone('wall',0));
 const panel=page.locator('#tile-zone-editor');await panel.waitFor({state:'visible'});
 const layout=await panel.evaluate(element=>{const box=element.getBoundingClientRect(),rail=document.querySelector('#settings').getBoundingClientRect(),canvas=document.querySelector('#viewer canvas'),scene=canvas.getBoundingClientRect();return {tag:element.tagName,width:box.width,right:box.right,railRight:rail.right,left:box.left,canvasRight:scene.right,docked:!!element.closest('#settings'),inert:document.body.inert||canvas.closest('[inert]')!==null,modal:!!document.querySelector('dialog:modal')};});
 assert.equal(layout.tag,'ASIDE');assert.equal(layout.modal,false);assert.equal(layout.inert,false);assert(layout.width<=420);assert(layout.docked,'PC column controls must replace the existing right rail');assert(Math.abs(layout.railRight-layout.right)<=24);assert(layout.left>=layout.canvasRight-4,'The right panel must leave the3D canvas unobscured');
 assert.equal(await panel.locator('[name=width]').inputValue(),'120','A horizontal60×120 tile starts a120cm-wide band');
 assert.equal(await panel.locator('[name=format]').inputValue(),'60x120');
 assert.equal(await panel.locator('[name=profile-top], [name=profile-bottom]').count(),0,'Wall columns offer only their two vertical profiles');
 assert.equal(await panel.locator('#tile-zone-options').evaluate(element=>element.open),false,'Secondary settings start in the optional section');
 const id=await panel.getAttribute('data-zone-id');assert(id);
 const frames=await page.evaluate(()=>studioOnePrototype.getDiagnostics().frames);await page.locator('#zoom-out').click();
 await page.waitForFunction(before=>studioOnePrototype.getDiagnostics().frames>before,frames);
 assert(await panel.isVisible(),'Scene controls remain usable while the column editor is open');
 await panel.locator('[name=width]').fill('90');await panel.locator('#tile-zone-options > summary').click();await panel.locator('[name=x]').fill('150');
 await panel.locator('[name=color]').selectOption('avena');await panel.locator('[name=profile]').selectOption('Argent');
 await page.waitForFunction(id=>{const z=studioOnePrototype.exportProject().walls[0].zones?.find(z=>z.id===id);return z?.width===90&&z.x===150&&z.color==='avena'&&z.profileEdges?.left==='Argent'&&z.profileEdges?.right==='Argent';},id);
 await page.evaluate(()=>studioOnePrototype.waitForTextures());
 const live=await zoneScreen(page,id);assert.equal(live.width,90);assert.equal(live.x,150);assert(live.tiles>0&&live.faces>0,'Live edits must have visible tiled geometry and a loaded material');
 const liveSaved=await zoneState(page,id);assert.equal(liveSaved.profileEdges.top,'none');assert.equal(liveSaved.profileEdges.bottom,'none');
 await panel.locator('#tile-zone-options > summary').click();await panel.evaluate(element=>{element.scrollTop=0;});
 await page.screenshot({path:path.join(output,kind+'-pc-column-panel.png')});
 pass(kind+': compact nonmodal right panel,120cm default, live dimensions/materials and two vertical profiles; scene stays interactive');
 await panel.locator('#apply-tile-zone').click();await panel.waitFor({state:'detached'});
 // The journal debounces committed edits; let that user-visible checkpoint
 // settle before testing that a single drag can be undone independently.
 await page.waitForTimeout(300);
 const before=await zoneState(page,id),moved=await dragZone(page,id,50);
 assert(Math.abs(moved.after.x-before.x)>5,'A short left-button drag must move the tiled column');
 assert.equal(moved.after.width,before.width);assert.equal(moved.after.height,before.height);assert.equal(moved.after.color,before.color);
 await page.waitForTimeout(300);await page.locator('#undo').click();
 await page.waitForFunction(({id,x})=>studioOnePrototype.exportProject().walls[0].zones?.find(z=>z.id===id)?.x===x,{id,x:before.x});
 await page.locator('#redo').click();await page.waitForFunction(({id,x})=>studioOnePrototype.exportProject().walls[0].zones?.find(z=>z.id===id)?.x===x,{id,x:moved.after.x});
 await contextAction(page,id,'Verrouiller');assert.equal((await zoneState(page,id)).locked,true);
 const locked=await zoneState(page,id);await dragZone(page,id,30);assert.deepEqual(await zoneState(page,id),locked,'A locked column must not move under the same mouse gesture');
 await showRoomView(page);await contextAction(page,id,'Déverrouiller');
 // A second real band supplies an obstacle. Drop toward it and verify that
 // collision adjustment preserves a non-overlapping, in-bounds result.
 await page.evaluate(id=>{const app=studioOnePrototype,z=app.exportProject().walls[0].zones.find(z=>z.id===id);app.renovation().saveZone('wall',0,{...z,id:'zone-pc-obstacle',name:'Obstacle de contrôle',x:300,width:100,locked:false});},id);
 await showRoomView(page);
 const collision=await dragZone(page,id,110),other=await zoneState(page,'zone-pc-obstacle');
 assert(collision.after.x>=0&&collision.after.x+collision.after.width<=500);
 assert(collision.after.x+collision.after.width<=other.x+.01||collision.after.x>=other.x+other.width-.01,'Dropping toward another band must preserve the collision boundary');
 assert.equal(collision.after.width,90);assert.equal(collision.after.color,'avena');
 pass(kind+': immediate desktop pointer drag, undo/redo, right-click lock and collision-safe drop');

 const active=await zoneScreen(page,id),stable=await zoneState(page,id);
 await page.mouse.move(active.screen.x,active.screen.y);await page.mouse.down({button:'left'});await page.mouse.move(active.moveRight50.x,active.moveRight50.y,{steps:4});
 assert.equal(await page.evaluate(()=>{const app=studioOnePrototype;return app.restoreProject(app.exportProject());}),true);
 await page.mouse.up({button:'left'});
 const cancelled=await zoneState(page,id);for(const key of ['x','y','width','height','collection','color','format','locked'])assert.equal(cancelled[key],stable[key],'Restoring during a held drag must preserve '+key);assert.deepEqual(cancelled.profileEdges,stable.profileEdges);
 await showRoomView(page);
 const reopened=(await stableZoneScreen(page,id)).screen;await page.mouse.click(reopened.x,reopened.y);await panel.waitFor({state:'visible'});
 await contextAction(page,id,'Supprimer');await panel.waitFor({state:'detached'});
 assert.equal(await zoneState(page,id),undefined,'Deleting through the scene menu removes the open column');
 assert.equal(await page.locator('#settings').evaluate(element=>element.classList.contains('zone-editor-open')),false,'Deleting the open column restores the normal rail');
 pass(kind+': restore cancels a held pointer gesture; right-click deletion closes the open panel and cannot revive a stale band');

 const complex=await complexRoom(root,kind);
 for(const attempt of ['initial','warm']){
  const measured=await page.evaluate(async({project,attempt})=>{
   const app=studioOnePrototype,start=performance.now(),heartbeat=new Promise(resolve=>setTimeout(()=>resolve(performance.now()-start),0));
   const ok=app.restoreProject(project),synchronousMs=performance.now()-start,firstHeartbeatMs=await heartbeat;
   await app.waitForTextures();await new Promise(resolve=>requestAnimationFrame(resolve));const visualReadyMs=performance.now()-start,diagnostics=app.getDiagnostics(),saved=app.exportProject();
   return {attempt,ok,synchronousMs,firstHeartbeatMs,visualReadyMs,restore:diagnostics.restore||diagnostics.restoration||null,items:saved.items.map(item=>item.type),walls:saved.walls.map(w=>({collection:w.collection,color:w.color,zones:w.zones?.length||0})),niche:saved.room.niches?.[0],mappedWalls:app.renovation().getDiagnostics().wallMaterials,quality:diagnostics.qualityProfile,inert:document.body.inert};
  },{project:complex,attempt});
  restoration.push({kind,...measured});console.log('RESTORATION',JSON.stringify({kind,...measured}));
  assert(measured.ok);assert.equal(measured.items.length,5);assert.equal(measured.walls[0].zones,1);assert(measured.mappedWalls.slice(0,3).every(w=>w.mapped),'The three tiled walls remain mapped after restoring the complete project');assert.equal(measured.niche.profileEdges.top,'Noir');assert.equal(measured.niche.profileEdges.bottom,'Noir');assert.equal(measured.inert,false);assert.equal(measured.quality,'fluid');
  if(attempt==='warm'){assert(measured.synchronousMs<8000,'Warm restoration must not stall the browser for eight seconds');assert(measured.firstHeartbeatMs<10000,'A browser timer must resume after restoration');}
 }
 await showRoomView(page);await page.screenshot({path:path.join(output,kind+'-pc-restored-complex.png')});
 pass(kind+': complete five-item Allure/Creta project, large band and four-edge niche restored; warm CPU/heartbeat/visual timings recorded');
 await page.setViewportSize({width:1365,height:930});
}

module.exports={verifyPCColumns,emptyRoom,complexRoom};
