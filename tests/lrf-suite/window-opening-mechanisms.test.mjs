import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeOpening,setExteriorTexture,WINDOW_TYPES,windowType,OPENING_COLORS} from '../../shared/lrf-3d/openings.js';
import {makeRoom,cloneRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {disposeObject} from '../../studio-one/src/composition.js';

const close=(a,b,epsilon=1e-7)=>assert(Math.abs(a-b)<epsilon,`${a} vs ${b}`);
function visibleSashHit(asset,x){asset.root.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(x,.5,1),new T.Vector3(0,0,-1)).intersectObjects(asset.sashes,true);}

test('legacy windows default to closed sliding sashes; the new casement type has real distinct hardware',()=>{
 assert.deepEqual(WINDOW_TYPES.map(t=>t.id),['sliding','casement']);assert.equal(windowType({}),'sliding');
 const sliding=makeOpening('window',{width:120,height:100}),casement=makeOpening('window',{width:120,height:100,windowType:'casement'});
 try{
  assert.equal(sliding.windowType,'sliding');assert.equal(sliding.getOpenProgress(),0);assert.equal(casement.getOpenProgress(),0);
  assert(sliding.root.getObjectByName('Rail_coulissant'));assert(sliding.root.getObjectByName('Galet_coulissant'));assert(!sliding.root.getObjectByName('Paumelle_fenetre'));
  assert(casement.root.getObjectByName('Paumelle_fenetre'));assert(!casement.root.getObjectByName('Rail_coulissant'));
  for(const asset of [sliding,casement]){
   assert.equal(asset.sashes.length,2);assert(!asset.root.getObjectByName('Montant_central'),'There is no fixed central stile blocking an opened casement');
   let panes=0,triangles=0,meshes=0;
   asset.root.traverse(object=>{if(!object.isMesh)return;meshes++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;assert(Array.from(object.geometry.attributes.position.array).every(Number.isFinite));
    if(object.name==='Double_vitrage'){panes++;assert.equal(object.castShadow,false);assert.equal(object.material.userData.architecturalGlass,true);assert(object.material.transmission>.8);close(object.material.thickness,.004);assert(asset.sashes.includes(object.parent));}
   });
   assert.equal(panes,4,'Two physical glass sheets travel with each sash');assert(meshes<70);assert(triangles<20000,'Detailed hardware remains bounded for ordinary scenes');
   asset.setColor('black');assert.equal(asset.frame.color.getHexString(),OPENING_COLORS.find(color=>color.id==='black').hex.slice(1));
  }
 }finally{disposeObject(sliding.root);disposeObject(casement.root);}
});

test('sliding opening translates a real sash along its rail into the second track with a half-width clear aperture',()=>{
 const asset=makeOpening('window',{width:120,height:100,windowType:'sliding'});
 try{
  const [left,right]=asset.sashes,closedX=left.position.x,rightBefore=right.matrix.clone(),gap=Math.abs(left.position.z-right.position.z),frame=asset.root.getObjectByName('Dormant_vertical'),frameBefore=frame.matrix.clone();
  assert(visibleSashHit(asset,-.3).length,'A closed pane covers the left aperture');
  asset.setOpenProgress(.5);const halfX=left.position.x;asset.setOpenProgress(1);
  close(halfX,(closedX+left.position.x)/2);assert.equal(left.rotation.y,0);assert.equal(right.rotation.y,0);assert(gap>.036,'The 36mm sash profiles pass on different tracks');
  close(left.position.x,right.position.x-.006);assert.equal(visibleSashHit(asset,-.3).length,0,'The opened left half is physically clear');
  assert(visibleSashHit(asset,.3).length,'Both glass leaves overlap on the opposite side');
  assert.deepEqual(right.matrix.elements,rightBefore.elements);assert.deepEqual(frame.matrix.elements,frameBefore.elements);
  asset.setOpenProgress(0);close(left.position.x,closedX);assert(visibleSashHit(asset,-.3).length);
 }finally{disposeObject(asset.root);}
});

test('casement sashes pivot inward on opposite hinges while frame, exterior image and mounting dimensions remain fixed',()=>{
 const asset=makeOpening('window',{width:120,height:100,windowType:'casement'});
 try{
  const [left,right]=asset.sashes,hinges=asset.sashes.map(s=>s.position.clone()),garden=asset.root.getObjectByName('Vue_exterieure_jardin'),gardenBefore=garden.position.clone();
  assert(visibleSashHit(asset,.2).length);asset.setOpenProgress(.5);close(left.rotation.y,-Math.PI/4);close(right.rotation.y,Math.PI/4);
  asset.setOpenProgress(1);close(left.rotation.y,-Math.PI/2);close(right.rotation.y,Math.PI/2);assert.equal(visibleSashHit(asset,.2).length,0);
  for(const [index,sash]of asset.sashes.entries()){
   assert.deepEqual(sash.position.toArray(),hinges[index].toArray());
   const box=new T.Box3().setFromObject(sash);assert(box.max.z>.30,'The full leaf swings toward the room, not through the exterior image');
   const panes=[];sash.traverse(o=>{if(o.name==='Double_vitrage')panes.push(o);});assert.equal(panes.length,2);assert(panes.every(p=>p.parent===sash));
  }
  assert.deepEqual(garden.position.toArray(),gardenBefore.toArray());asset.setOpenProgress(0);close(left.rotation.y,0);close(right.rotation.y,0);
  asset.setOpenProgress(2);assert.equal(asset.getOpenProgress(),1);assert.equal(asset.setOpenProgress(NaN),false);assert.equal(asset.getOpenProgress(),1);
 }finally{disposeObject(asset.root);}
});

test('every permitted window size has positive finite glazing and can open and close without scaling its leaves',()=>{
 for(const windowType of ['sliding','casement'])for(const [width,height]of [[40,40],[40,220],[240,40],[240,220],[120,100]]){
  const asset=makeOpening('window',{windowType,width,height});
  try{for(const progress of [0,.25,.5,1,0]){asset.setOpenProgress(progress);for(const sash of asset.sashes){assert.deepEqual(sash.scale.toArray(),[1,1,1]);const size=new T.Box3().setFromObject(sash).getSize(new T.Vector3());assert(size.toArray().every(n=>Number.isFinite(n)&&n>0));}}}finally{disposeObject(asset.root);}
 }
});

test('each exterior ambience uses its own registered original and cover crop without stretching or rebuilding the window',()=>{
 const wide=new T.Texture({width:1600,height:900}),tall=new T.Texture({width:900,height:1600});setExteriorTexture(wide,'mediterranean');setExteriorTexture(tall,'test-tall');
 const asset=makeOpening('window',{width:120,height:100,windowType:'casement',exteriorAmbience:'mediterranean'});
 try{
  const view=asset.root.getObjectByName('Vue_exterieure_jardin'),before=asset.sashes;
  assert.equal(view.material.map,wide);const wideUV=Array.from(view.geometry.attributes.uv.array);assert(asset.setExteriorAmbience('test-tall'));assert.equal(view.material.map,tall);assert.equal(asset.getExteriorAmbience(),'test-tall');assert.equal(asset.sashes,before);
  const tallUV=Array.from(view.geometry.attributes.uv.array);assert.notDeepEqual(tallUV,wideUV);assert(tallUV.every(n=>n>=0&&n<=1));assert.equal(view.material.toneMapped,false);
  assert.equal(asset.setExteriorAmbience('unregistered'),false);assert.equal(view.material.map,null,'A missing ambience does not display an unrelated photograph');
  asset.setExteriorAmbience('mediterranean');assert.deepEqual(Array.from(view.geometry.attributes.uv.array),wideUV,'Repeated ambience changes always start from the original UVs');
 }finally{disposeObject(asset.root);wide.dispose();tall.dispose();}
});

for(const variant of ['studio-one','randal-general'])test(variant+': window type, open intent and exterior ambience survive project encoding independently of displayed animation progress',async()=>{
 const {Composition,itemDimensions}=await import('../../'+variant+'/src/composition.js'),{encodeProject,decodeProject}=await import('../../'+variant+'/src/projects.js');
 const room=makeRoom(DEFAULT_ROOM,0),composition=new Composition(room),settings={width:120,height:100,color:'white',windowType:'casement',windowOpen:true,exteriorAmbience:'mediterranean'},asset=makeOpening('window',settings);
 try{
  const result=composition.add('window',asset,settings,{wall:0,u:225,height:100});assert(result.item,result.error);assert.equal(asset.getOpenProgress(),1);
  const dimensions=itemDimensions('window',settings);asset.setOpenProgress(0);assert.deepEqual(itemDimensions('window',settings),dimensions,'Low-quality display may close the mesh without changing the window footprint');
  const reopened=decodeProject(encodeProject({version:2,room:cloneRoom(DEFAULT_ROOM),items:composition.snapshot()})),restored=reopened.items[0];assert.equal(restored.settings.windowOpen,true);assert.equal(restored.settings.windowType,'casement');assert.equal(restored.settings.exteriorAmbience,'mediterranean');
  const rebuilt=makeOpening('window',restored.settings);try{assert.equal(rebuilt.getOpenProgress(),1);assert.equal(rebuilt.windowType,'casement');}finally{disposeObject(rebuilt.root);}
 }finally{disposeObject(asset.root);room.dispose();}
});
