import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {AQUAHOME,makeTap} from '../../shared/lrf-3d/taps.js';

// Reference photographs: AQUAHOME 2026, PDF pages 9/11 (Bel Air/Flip),
// 16/18/19 (Manila/Bora Bora/New Twist) and 26/27 (floor-mounted controls).
// They establish control direction, visible shape and surface treatment;
// photographic head proportions are not certified manufacturer dimensions.
function dispose(root){const materials=new Set();root.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});for(const m of materials)m.dispose();}
const product=reference=>AQUAHOME.find(p=>p.reference===reference);
function rodDirection(mesh){return new T.Vector3(0,1,0).applyQuaternion(mesh.quaternion).normalize();}

test('every Bel Air and Flip basin control points towards the spout in its neutral position',()=>{
 const products=AQUAHOME.filter(p=>['Bel Air','Flip'].includes(p.collection)&&['basin','basin-xl','bidet'].includes(p.use));
 assert.equal(products.length,33);
 for(const p of products){const tap=makeTap(p),lever=tap.getObjectByName('Levier'),direction=rodDirection(lever);assert(direction.dot(new T.Vector3(0,0,1))>.999,p.reference+' forward control');assert(Math.abs(lever.position.x)<1e-9,p.reference+' centred control');dispose(tap);}
});

test('Flip diamond facets face outwards and cover the head in all six actual finishes',()=>{
 for(const p of AQUAHOME.filter(p=>p.collection==='Flip')){
  const tap=makeTap(p),knurl=tap.getObjectByName('Moletage_Flip'),head=tap.getObjectByName('Commande'),positions=knurl.geometry.attributes.position,normals=knurl.geometry.attributes.normal;
  assert(knurl.material.color.equals(head.material.color),'Knurl keeps the selected metal colour, including chrome');
  assert(knurl.material.roughness>=.2);assert(knurl.material.roughness>=head.material.roughness);
  assert.equal(knurl.material.side,T.FrontSide,'Visible relief is correctly wound rather than hidden with double-sided rendering');
  let minRadius=Infinity,maxRadius=0;
  for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),z=positions.getZ(i),radius=Math.hypot(x,z);minRadius=Math.min(minRadius,radius);maxRadius=Math.max(maxRadius,radius);
   assert((normals.getX(i)*x+normals.getZ(i)*z)/radius>.95,'Every knurl facet faces the viewer outside the handle');
  }
  assert(minRadius>.0202&&maxRadius-minRadius>.00015,'Raised facets sit outside the smooth underlying handle');
  const bounds=new T.Box3().setFromObject(knurl),size=bounds.getSize(new T.Vector3()),fullHeight=new T.Box3().setFromObject(tap).max.y;
  assert(size.y/fullHeight>(p.use==='basin-xl'?.16:.23));assert(size.y/fullHeight<(p.use==='basin-xl'?.22:.29));
  // A ray approaching from any side must hit actual raised metal first.
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/6){
   const origin=new T.Vector3(Math.sin(angle)*.04,knurl.position.y-.006,Math.cos(angle)*.04),direction=new T.Vector3(-origin.x,0,-origin.z).normalize();
   const hit=new T.Raycaster(origin,direction).intersectObject(tap,true)[0];assert.equal(hit?.object,knurl,'Knurl is visible at angle '+angle);
  }
  dispose(tap);
 }
});

test('square and swept collections keep their own control shapes instead of a cylindrical cap',()=>{
 for(const ref of ['13240112701','13240212701','10440112701','10440212701']){
  const tap=makeTap(product(ref)),head=tap.getObjectByName('Commande'),pivot=tap.getObjectByName('Axe_levier'),lever=tap.getObjectByName('Levier');
  assert.equal(head.geometry.type,'RoundedBoxGeometry',ref);assert(pivot);
  const axle=new T.Box3().setFromObject(pivot);assert(axle.intersectsBox(new T.Box3().setFromObject(head)),ref+' pivot connected to cartridge');assert(axle.intersectsBox(new T.Box3().setFromObject(lever)),ref+' lever connected to pivot');dispose(tap);
 }
 const bora=makeTap(product('13340112701')),stem=bora.getObjectByName('Commande');
 assert(bora.getObjectByName('Levier_ajoure'));assert(new T.Box3().setFromObject(stem).intersectsBox(new T.Box3().setFromObject(bora.getObjectByName('Levier_ajoure_arriere'))),'The open handle has an actual rear bridge connected to its stem');stem.geometry.computeBoundingBox();assert(stem.geometry.boundingBox.getSize(new T.Vector3()).x<.02,'Open Bora Bora handle sits on a slim cartridge stem');dispose(bora);
});

test('floor-mounted controls preserve their photographed vertical or forward directions',()=>{
 for(const p of AQUAHOME.filter(p=>['basin-floor','island'].includes(p.use))){
  const tap=makeTap(p),lever=tap.getObjectByName('Levier');
  if(/CURVE/.test(p.sourceName)){const frame=tap.getObjectByName('Levier_cadre_vertical');assert(frame);const size=new T.Box3().setFromObject(frame).getSize(new T.Vector3());assert(size.y>size.z&&size.z>size.x);assert(new T.Box3().setFromObject(tap.getObjectByName('Commande')).intersectsBox(new T.Box3().setFromObject(frame.getObjectByName('Levier_cadre_traverse'))),'The vertical frame is attached to its control');}
  else{
   const expected=p.use==='basin-floor'?/STAR/.test(p.sourceName)?[0,0,1]:[0,1,0]:/SQUARE/.test(p.sourceName)?[0,1,0]:[0,-1,0];
   assert(rodDirection(lever).dot(new T.Vector3(...expected))>.999,p.reference+' actual control axis');
  }
  dispose(tap);
 }
});
