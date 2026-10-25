import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeRoom,cloneRoom,DEFAULT_ROOM,createSurface} from '../../shared/lrf-3d/room.js';
import {normalizeLayout} from '../../shared/lrf-3d/surface-catalog.js';
import {quantityForSurface} from '../../shared/lrf-3d/quantities.js';
import {makeTiledShowerTray,tiledShowerTrayError,tiledShowerTrayDimensions,applyTrayCladding,withTrayFloorQuantities,withTrayZoneQuantities,trayFootprintInFloor,collectTrayFinishes} from '../../shared/lrf-3d/tiled-shower-tray.js';
import commercial from '../../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};

const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,message||`${a} != ${b}`);
const floorFinish={collection:'Creta',color:'avena',format:'60x120'};
const raised={trayType:'tile',trayInstallation:'raised',trayHeight:12,width:120,depth:90,trayProfile:true,trayProfileColor:'Argent'};
function dispose(root){const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.isMesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
function makeSetup(Composition,settings=raised,placement={wall:0,u:160,height:0,offset:0,rotation:0}){
 const room=makeRoom(cloneRoom(DEFAULT_ROOM),0),comp=new Composition(room);
 room.floor.setLayout(normalizeLayout({x:17,y:23,planAxes:true,direction:'horizontal',groutWidth:3},floorFinish.collection,floorFinish.format,floorFinish.color));
 const result=comp.add('shower',makeTiledShowerTray(settings),settings,placement);assert.equal(result.error,undefined);
 return {room,comp,item:result.item,cleanup(){dispose(result.item.root);room.dispose();}};
}
const applications=await Promise.all(['studio-one','randal-general'].map(async name=>({name,...await import('../../'+name+'/src/composition.js'),fixtures:await import('../../'+name+'/src/fixtures.js')})));
const paint=(face)=>face.setPaint(false);

for(const app of applications){
 test(app.name+': tiled trays delegate through fixtures while existing resin geometry is preserved',()=>{
  close(app.fixtures.fixtureDimensions('shower',{width:120,depth:90,trayColor:'white'}).height,.035);
  assert.deepEqual(app.fixtures.fixtureDimensions('shower',raised),tiledShowerTrayDimensions(raised));
  assert.equal(app.fixtures.fixtureError('shower',raised),'');
  const tiled=app.fixtures.makeFixture('shower',raised),resin=app.fixtures.makeFixture('shower',{width:120,depth:90,trayColor:'white'});
  try{assert.equal(tiled.root.name,'Receveur_a_carreler');assert.equal(tiled.traySurfaces.length,5);assert.equal(tiled.root.userData.editTarget,'shower');assert(resin.root.getObjectByName('Receveur_resine'));assert.equal(resin.traySurfaces,undefined);}finally{dispose(tiled.root);dispose(resin.root);}
 });

 test(app.name+': flush and raised tops share exact floor joints after movement and arbitrary rotation',()=>{
  for(const installation of ['flush','raised']){
   const setup=makeSetup(app.Composition,{...raised,trayInstallation:installation}),{room,comp,item}=setup;
   try{for(const p of [{wall:0,u:160,offset:0,rotation:0},{wall:0,u:250,offset:90,rotation:37},{wall:2,u:170,offset:90,rotation:90},{wall:3,u:200,offset:90,rotation:180}]){
    const result=comp.move(item.id,p);assert.equal(result.error,undefined,JSON.stringify(p));
    const rows=applyTrayCladding(item,room.floor,floorFinish,paint,{walls:room.walls}),top=rows.find(r=>r.surface.trayPart==='top').surface;
    top.group.updateWorldMatrix(true,false);
    const normal=new T.Vector3(0,0,1).transformDirection(top.group.matrixWorld);close(normal.y,1);close(normal.x,0);close(normal.z,0);
    const worldHeight=top.group.localToWorld(new T.Vector3(0,0,0)).y;close(worldHeight,installation==='raised'?.12:.0015);
    assert.deepEqual(top.trayFloorPolygon,trayFootprintInFloor(item,room.floor).map(p=>p.map(n=>Math.round(n*1e8)/1e8)));
    const floorCells=new Map(room.floor.tiles.geometry.userData.cells.map(c=>[c.key,c]));assert(top.tiles.geometry.userData.cells.length>0);
    for(const cell of top.tiles.geometry.userData.cells){const same=floorCells.get(cell.key);assert(same,'A tray cell uses the floor joint grid');close(cell.center[0],same.center[0]);close(cell.center[1],same.center[1]);}
    close(top.layout.x,17);close(top.layout.y,23);assert.equal(top.layout.planAxes,true);assert.equal(top.layout.groutWidth,3);
    close(quantityForSurface(top,floorFinish,top.layout).area,1.08-.044*(.74+.016));
   }}finally{setup.cleanup();}
  }
 });

 test(app.name+': only exposed risers and profiles count, and floor under the tray is subtracted once',()=>{
  for(const installation of ['raised','flush']){
   const setup=makeSetup(app.Composition,{...raised,trayInstallation:installation},{wall:0,u:60,height:0,offset:0,rotation:0}),{room,item}=setup;
   try{
    const rows=applyTrayCladding(item,room.floor,floorFinish,paint,{walls:room.walls});
    assert.deepEqual(rows.map(r=>r.surface.trayPart),installation==='raised'?['top','front','right']:['top']);
    close(item.asset.trayProfileMetres,2.1,'Back and left edges touch existing walls and receive no extra profiles');
    const beforeGeometry=room.floor.tiles.geometry,beforeHoles=structuredClone(room.floor.holes),floorArea=quantityForSurface(room.floor,floorFinish,room.floor.layout).area;
    const report=withTrayFloorQuantities(room.floor,[item],surface=>quantityForSurface(surface,floorFinish,surface.layout));close(report.area,floorArea-1.08);
    assert.equal(room.floor.tiles.geometry,beforeGeometry);assert.deepEqual(room.floor.holes,beforeHoles,'Reporting leaves the live floor intact');
    assert.throws(()=>withTrayFloorQuantities(room.floor,[item],()=>{throw Error('quantity failed');}),/quantity failed/);
    const faces=item.asset.traySurfaces.map(f=>f.tiles.geometry);let count=0;const apply=()=>count++;
    applyTrayCladding(item,room.floor,floorFinish,apply,{walls:room.walls});const saved=count;applyTrayCladding(item,room.floor,floorFinish,apply,{walls:room.walls});assert.equal(count,saved);
    assert.deepEqual(item.asset.traySurfaces.map(f=>f.tiles.geometry),faces,'Sidebar refresh reuses physical faces');
    applyTrayCladding(item,room.floor,floorFinish,apply,{force:true,walls:room.walls});assert.equal(count,saved+item.asset.traySurfaces.length,'HD texture refresh repaints every existing face');
   }finally{setup.cleanup();}
  }
 });
}

test('tray settings reject invalid heights, profiles and false commercial identities',()=>{
 for(const patch of [{width:79},{depth:201},{trayHeight:2},{trayHeight:41},{trayHeight:NaN},{trayInstallation:'floating'},{trayProfile:'yes'},{trayProfileColor:'unknown'}])assert(tiledShowerTrayError({...raised,...patch}),JSON.stringify(patch));
 const product=commercial.products.find(p=>p.collection==='Creta'&&p.colorId==='avena'&&p.format==='60x120');assert(product);
 const top={...floorFinish,catalogueKey:product.key,reference:product.reference,finish:product.finish},reveal={collection:'Creta',color:'caramello',format:'60x60'};
 const settings={...raised,trayCovering:{mode:'split',top,reveal}};assert.equal(tiledShowerTrayError(settings),'');
 const saved=JSON.parse(JSON.stringify({type:'shower',settings}));assert.deepEqual(collectTrayFinishes([saved]),[top,reveal]);
 assert(tiledShowerTrayError({...raised,trayCovering:{mode:'all',top:{...top,catalogueKey:'unknown-key'}}}));
 assert(tiledShowerTrayError({...raised,trayCovering:{mode:'all',top:{...top,reference:'not-a-real-reference'}}}));
 assert(tiledShowerTrayError({...raised,trayCovering:{mode:'all',top:{...top,color:'caramello'}}}));
 assert(tiledShowerTrayError({...raised,trayCovering:{mode:'all',top:{collection:'Peinture',color:'blanc',format:'60x120'}}}));
 assert.deepEqual(collectTrayFinishes([{type:'shower',settings:{...raised,trayCovering:{mode:'inherit'}}}]),[]);
});

test('an inherited tray follows a new floor selection while custom top and risers remain independent',()=>{
 const setup=makeSetup(applications[0].Composition),{item,room}=setup,top={collection:'Creta',color:'caramello',format:'60x60'},reveal={...floorFinish};
 try{
  const before=JSON.stringify(item.settings),seen=[];applyTrayCladding(item,room.floor,floorFinish,(face,finish)=>seen.push(finish));applyTrayCladding(item,room.floor,{...floorFinish,color:'caramello'},(face,finish)=>seen.push(finish));assert(seen.some(f=>f.color==='caramello'));assert.equal(JSON.stringify(item.settings),before);
  item.settings.trayCovering={mode:'split',top,reveal};applyTrayCladding(item,room.floor,{...floorFinish,color:'zucchero'},paint,{walls:room.walls});
  assert.deepEqual(item.asset.traySurfaces[0].trayFinish,top);assert.deepEqual(item.asset.traySurfaces[1].trayFinish,reveal);
 }finally{setup.cleanup();}
});

test('tray footprints intersect decorative zones without changing material areas or subtracting holes twice',()=>{
 for(const [x,y,w,h,overlap,offset=0]of [[-1.5,-1,2,1,1.08],[-.5,-1,2,1,.405],[-1,-.7,.4,.4,.16],[-1.0,-1.45,.7,1.2,.63,40]]){
  const setup=makeSetup(applications[0].Composition,raised,{wall:0,u:160,height:0,offset,rotation:0}),{room,item}=setup,zone=createSurface([[0,0],[w,0],[w,h],[0,h]],'Decorative_floor_zone'),zonePolygon=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  zone.group.position.set(x,y,.001);room.floor.group.add(zone.group);room.floor.setExtraHoles([zonePolygon]);
  const beforeFloorGeometry=room.floor.tiles.geometry,beforeFloorHoles=structuredClone(room.floor.holes),beforeZoneGeometry=zone.tiles.geometry,beforeZonePolygon=structuredClone(zone.polygon);
  try{
   const floorRow=withTrayFloorQuantities(room.floor,[item],surface=>quantityForSurface(surface,floorFinish,surface.layout));
   const zoneRow=withTrayZoneQuantities(zone,room.floor,[item],surface=>quantityForSurface(surface,{...floorFinish,color:'caramello'},surface.layout));
   close(floorRow.area,20.25-w*h-(1.08-overlap));close(zoneRow.area,w*h-overlap);close(floorRow.area+zoneRow.area,20.25-1.08);
   assert.equal(room.floor.tiles.geometry,beforeFloorGeometry);assert.deepEqual(room.floor.holes,beforeFloorHoles);assert.equal(zone.tiles.geometry,beforeZoneGeometry);assert.deepEqual(zone.polygon,beforeZonePolygon);
   let disposed=false;withTrayZoneQuantities(zone,room.floor,[item],surface=>{surface.tiles.geometry.addEventListener('dispose',()=>disposed=true);});assert.equal(disposed,true,'Temporary merged quantity geometry is disposed after reporting');
   let throwDisposed=false;assert.throws(()=>withTrayZoneQuantities(zone,room.floor,[item],surface=>{surface.tiles.geometry.addEventListener('dispose',()=>throwDisposed=true);throw Error('report interrupted');}),/report interrupted/);assert.equal(throwDisposed,true,'Temporary quantity geometry is disposed on an interrupted report');
   const wall=room.walls[0];let received;withTrayZoneQuantities(wall,room.floor,[item],surface=>received=surface);assert.equal(received,wall,'Vertical zones retain their original quantity geometry');
   zone.group.position.z=.8;withTrayZoneQuantities(zone,room.floor,[item],surface=>received=surface);assert.equal(received,zone,'A horizontal niche lining above floor level is never subtracted by a tray');
  }finally{setup.cleanup();}
 }
});
