import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeSanitary} from '../../shared/lrf-3d/sanitaries.js';
import {createSurface} from '../../shared/lrf-3d/room.js';
import {normalizeLayout} from '../../shared/lrf-3d/surface-catalog.js';
import {applySupportCladding,supportCoveringMode,supportCoveringError,supportSurfaceFinish,collectSupportFinishes} from '../../shared/lrf-3d/sanitary-support.js';

const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,message||`${a} != ${b}`);
function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}

test('supported suspended WC keeps a 48cm seat and exposes four physical tiled faces',()=>{
 for(const reference of ['TR2217R','TR2217R-U18']){
  const asset=makeSanitary('toilet',{reference,support:true});asset.root.updateMatrixWorld(true);
  try{
   assert.deepEqual(asset.supportSurfaces.map(f=>f.supportPart),['front','left','right','top']);
   const bowl=new T.Box3().setFromObject(asset.root.getObjectByName('Cuvette_creuse'));
   close(bowl.min.y,.12);assert(bowl.max.y<.481,'The bowl must not be raised to 76cm by its support');
   const back=new T.Box3().setFromObject(asset.root.getObjectByName('Habillage_bati_support'));
   close(back.min.z,-.23);close(back.max.z,-.03);close(back.min.y,0);close(back.max.y,1.12);
   const normal=new T.Vector3(0,0,1),expected={front:[0,0,1],left:[-1,0,0],right:[1,0,0],top:[0,1,0]};
   for(const face of asset.supportSurfaces){
    assert.equal(face.group.userData.editTarget,'toilet');assert(face.tiles.geometry.userData.cells.length>0);
    const n=normal.clone().transformDirection(face.group.matrixWorld);n.toArray().forEach((value,i)=>close(value,expected[face.supportPart][i]));
   }
   close(asset.supportSurfaces.reduce((sum,face)=>sum+face.length*face.height,0),1.24,'Front, two sides and top have real dimensions');
  }finally{dispose(asset.root);}
 }
});

test('inherited support tiles keep the attached wall grid and update without changing settings',()=>{
 const settings={reference:'TR2217R',support:true,supportColor:'#d6cabb'},asset=makeSanitary('toilet',settings);
 const wall=createSurface([[0,0],[4.5,0],[4.5,2.6],[0,2.6]],'Wall');
 const item={type:'toilet',asset,settings,placement:{wall:0,u:170,height:0}},finish={collection:'Creta',color:'caramello',format:'60x120',catalogueKey:'synthetic-exact-sku',reference:'synthetic-public-ref'};
 wall.setLayout(normalizeLayout({x:13,y:27,direction:'vertical',pattern:'offset',groutWidth:3},finish.collection,finish.format,finish.color));
 const before=JSON.stringify(settings),painted=[],apply=(surface,value)=>{painted.push([surface,value]);surface.setPaint(value.collection==='Peinture');};
 try{
  assert.equal(supportCoveringMode(settings),'inherit');
  const rows=applySupportCladding(item,wall,finish,apply);assert.equal(rows.length,4);
  const front=asset.supportSurfaces[0];close(front.layout.x,-127);close(front.layout.y,27);assert.equal(front.layout.groutWidth,3);
  const geometries=asset.supportSurfaces.map(face=>face.tiles.geometry),applied=painted.length;
  applySupportCladding(item,wall,finish,apply);assert.deepEqual(asset.supportSurfaces.map(face=>face.tiles.geometry),geometries);assert.equal(painted.length,applied,'Repeated sidebar/selection updates reuse physical faces and materials');
  applySupportCladding(item,wall,finish,apply,{force:true});assert.deepEqual(asset.supportSurfaces.map(face=>face.tiles.geometry),geometries);assert.equal(painted.length,applied+4,'A texture/HD-profile refresh repaints the existing physical faces');
  assert.equal(front.supportFinish.catalogueKey,'synthetic-exact-sku');assert.equal(front.supportFinish.reference,'synthetic-public-ref');
  const wallCells=new Map(wall.tiles.geometry.userData.cells.map(cell=>[cell.key,cell]));
  for(const cell of front.tiles.geometry.userData.cells){const same=wallCells.get(cell.key);assert(same);close(cell.center[0]+1.4,same.center[0]);close(cell.center[1],same.center[1]);}
  applySupportCladding(item,wall,{...finish,color:'avena'},apply);assert.equal(front.supportFinish.color,'avena');
  item.placement.u=240;applySupportCladding(item,wall,finish,apply);close(front.layout.x,-197,'The wall grid follows a horizontal move');
  assert.equal(JSON.stringify(settings),before,'Inherited wall finishes are resolved live, never frozen into a saved project');
  assert(painted.length>=12);
 }finally{dispose(asset.root);dispose(wall.group);}
});

test('explicit support finishes and legacy colours survive wall changes and project JSON round trips',()=>{
 const back={collection:'Creta',color:'avena',format:'60x120',reference:'exact-back-ref'},reveal={collection:'Creta',color:'caramello',format:'60x60',reference:'exact-reveal-ref'};
 const item={type:'toilet',settings:{reference:'TR2217R',support:true,supportCovering:{mode:'split',back,reveal}},placement:{wall:2,u:90,height:0}};
 const saved=JSON.parse(JSON.stringify(item));assert.equal(supportCoveringError(saved.settings),'');
 const changedWall={collection:'Peinture',color:'blanc'};
 assert.deepEqual(supportSurfaceFinish(saved.settings,'front',changedWall),back);assert.deepEqual(supportSurfaceFinish(saved.settings,'top',changedWall),reveal);
 assert.deepEqual(collectSupportFinishes([saved]),[back,reveal]);assert.equal(supportCoveringMode({supportColor:'#212426'}),'paint');
 assert.equal(supportCoveringError({...saved.settings,supportCovering:{mode:'all',back:{...back,format:'invalid'}}}),'Choisissez un carrelage et un format disponibles pour le bâti-support.');
 const asset=makeSanitary('toilet',{reference:'TR2217R',support:true,supportColor:'#212426'}),wall=createSurface([[0,0],[3,0],[3,2.6],[0,2.6]],'Wall');
 try{applySupportCladding({type:'toilet',asset,settings:{reference:'TR2217R',support:true,supportColor:'#212426'},placement:{u:150,height:0}},wall,back,()=>{throw Error('Legacy solid paint must not request tile textures');});for(const face of asset.supportSurfaces){assert.equal(face.paint.visible,true);assert.equal(face.material.color.getHexString(),'212426');}}
 finally{dispose(asset.root);dispose(wall.group);}
});
