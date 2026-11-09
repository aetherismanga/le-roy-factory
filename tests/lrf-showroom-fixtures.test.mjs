import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeShowroomFixtures,resolveShowroomFixtureLayout} from '../shared/lrf-3d/showroom-fixtures.js';
import {SHOWROOM_MANUFACTURERS} from '../shared/lrf-3d/showroom-catalog.js';
import {makeShowroomLayout} from '../shared/lrf-3d/showroom-layout.js';
import {AQUAHOME} from '../shared/lrf-3d/taps.js';
import {makeModel} from '../studio-one/src/model.js';

const bathData=JSON.parse(readFileSync(new URL('../review-studio/assets/bathroom/baths.json',import.meta.url),'utf8'));
const stands=()=>SHOWROOM_MANUFACTURERS.map((manufacturer,index)=>{const side=index%2===0?-1:1,front=-6-Math.floor(index/2)*5.3,back=front-4.6;return {manufacturer,index,front,back,bounds:{minX:side<0?-9.4:1.9,maxX:side<0?-1.9:9.4,minZ:back,maxZ:front}};});
const blocked=(fixtures,x,z,r=.2)=>fixtures.colliders.some(b=>x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ);

test('the first six stands contain complete native bathroom vignettes with collision-safe human routes',async()=>{
 const fixtures=makeShowroomFixtures({stands:stands(),bathData});
 try{
  assert.equal(fixtures.diagnostics().built,0,'exhibition geometry is not constructed until approached');assert.equal(fixtures.stations.filter(s=>s.kind==='bathroom').length,6);
  for(const station of fixtures.stations.filter(s=>s.kind==='bathroom')){
   assert(station.index<6,'bathroom compositions appear in the first three rows');
   for(const x of [-3,3,-8.6,8.6])for(let z=station.front-.2;z>station.back+.25;z-=.1)assert.equal(blocked(fixtures,x,z),false,`approach remains open at ${x},${z}`);
  }
  await fixtures.prepareNear(new T.Vector3(0,1.58,-8));const info=fixtures.diagnostics();assert.equal(info.nativeVanities,6);assert.equal(info.baths,3);assert.equal(info.showers,3);
  const names=[];fixtures.root.traverse(o=>{names.push(o.name);if(o.isMesh){assert.equal(o.userData.visualOnly,true);assert.equal(o.userData.nativeGeometry,true);assert.equal(o.userData.editTarget,undefined);assert([...o.geometry.attributes.position.array].every(Number.isFinite));const hits=[];o.raycast({},hits);assert.equal(hits.length,0,'editing picker ignores staged geometry');}});
  assert(names.some(n=>n.startsWith('RANDAL_STUDIO_ONE_')));assert(names.some(n=>n.includes('Baignoire_ilot_170x80')));assert(names.some(n=>n.includes('Douche_120x90')));
  fixtures.root.traverse(o=>{if(o.isMesh&&!o.material.transparent)assert.equal(o.castShadow,true,'opaque native product parts receive real contact shadows');});
 }finally{fixtures.dispose();}
});

test('distant native silhouettes use material batches while close views restore physical product materials',async()=>{
 const fixtures=makeShowroomFixtures({stands:stands(),bathData});
 try{
  await fixtures.prepareNear(new T.Vector3(0,1.58,-2));assert(fixtures.diagnostics().visibleBatches<70,'arrival retains real grain and polished surfaces without hundreds of product calls');
  const first=fixtures.stations[0];assert.equal(first.overview.visible,true);assert.equal(first.detail.visible,false);
  const distant=[];first.overview.traverse(o=>{if(o.isMesh)distant.push(o);});assert(distant.some(o=>o.material.userData.fixtureFinish),'native wood material stays available across the atrium');assert(distant.some(o=>o.material.isMeshPhysicalMaterial&&o.material.roughness<=.2),'ceramic and mirror highlights are not flattened to a coloured box');
  const snapshots=JSON.stringify(fixtures.colliders);await fixtures.prepareNear(new T.Vector3(-5.5,1.58,first.back+1.4));assert.equal(first.detail.visible,true);assert.equal(first.overview.visible,false);assert(fixtures.diagnostics().visibleBatches<150);
  await fixtures.prepareNear(new T.Vector3(0,1.58,-52));assert.equal(first.group.visible,true);assert.equal(first.overview.visible,true,'authentic native overview stays visible across the whole atrium');assert.equal(first.detail.visible,false);
  await fixtures.prepareNear(new T.Vector3(0,1.58,-100));assert.equal(first.group.visible,false);assert.equal(JSON.stringify(fixtures.colliders),snapshots,'LOD never changes the physical navigation envelope');
  await fixtures.prepareNear(new T.Vector3(-5.5,1.58,first.back+1.4));assert.equal(first.detail.visible,true);
 }finally{fixtures.dispose();}
});

test('the tap bar carries actual AQUA HOME catalogue references and never relabels Randal as another manufacturer',async()=>{
 const fixtures=makeShowroomFixtures({stands:stands(),bathData});
 try{
  const station=fixtures.stations.find(s=>s.kind==='tapbar');await fixtures.prepareNear(new T.Vector3(station.center,1.58,station.back+2));assert.equal(station.references.length,4);
  for(const reference of station.references){assert(AQUAHOME.some(p=>p.reference===reference&&p.use==='basin'));const group=station.detail.getObjectByName('Mitigeur_'+reference);assert(group);assert.equal(group.userData.showroomCollection.manufacturer.id,'aquahome');assert.equal(group.userData.nativeGeometry,true);}
  await fixtures.prepareNear(new T.Vector3(0,1.58,-8));for(const first of fixtures.stations.filter(s=>s.kind==='bathroom')){first.detail.traverse(o=>{if(o.isMesh&&o.name.includes('RANDAL_STUDIO_ONE'))assert.equal(o.userData.showroomCollection.manufacturer.id,'randal-pro');});}
 }finally{fixtures.dispose();}
});

test('late native finish images are aborted and cannot wake a disposed scene',async()=>{
 const pending=[];let wakes=0,disposedMaps=0;
 const fixtures=makeShowroomFixtures({stands:stands(),bathData,onReady:()=>wakes++,loadTexture:(url,options)=>new Promise(resolve=>pending.push({url,options,resolve}))});
 const ready=fixtures.prepareNear(new T.Vector3(0,1.58,-8));await new Promise(resolve=>setImmediate(resolve));assert(pending.length>=2);assert(pending.every(p=>p.options.maxDimension===1024&&p.options.signal instanceof AbortSignal));
 const before=wakes;fixtures.dispose();assert(pending.every(p=>p.options.signal.aborted));for(const p of pending){const texture=new T.Texture();texture.addEventListener('dispose',()=>disposedMaps++);p.resolve(texture);}
 await ready;assert.equal(disposedMaps,pending.length);assert.equal(wakes,before);assert.equal(fixtures.diagnostics().disposed,true);
});

test('removing exhibition models never disposes materials or geometry in the editable native furniture',async()=>{
 const editable=makeModel({width:1,includeMirror:false});let releases=0;const geometries=new Set(),materials=new Set();editable.root.traverse(o=>{if(o.geometry){geometries.add(o.geometry);o.geometry.addEventListener('dispose',()=>releases++);}if(o.material){materials.add(o.material);o.material.addEventListener('dispose',()=>releases++);}});
 const fixtures=makeShowroomFixtures({stands:stands(),bathData});await fixtures.prepareNear(new T.Vector3(0,1.58,-8));fixtures.dispose();assert.equal(releases,0);assert.equal(editable.spec.width,1);assert.equal(editable.getTop(),'sella');for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
});


test('independent island origins and cardinal rotations keep native scenes and collisions inside their real display zones',async()=>{
 const custom=[
  {manufacturer:SHOWROOM_MANUFACTURERS[0],bounds:{minX:-13,maxX:-8,minZ:-9,maxZ:-3},fixtureLayout:{origin:[-13,-6],rotation:Math.PI/2,width:6,depth:5,hand:-1,kind:'bathroom'}},
  {manufacturer:SHOWROOM_MANUFACTURERS[1],bounds:{minX:8,maxX:13,minZ:-9,maxZ:-3},fixtureLayout:{origin:[13,-6],rotation:-Math.PI/2,width:6,depth:5,hand:1,kind:'bathroom'}},
  {manufacturer:SHOWROOM_MANUFACTURERS[2],bounds:{minX:-3,maxX:3,minZ:-18,maxZ:-14.6},fixtureLayout:{origin:[0,-18],rotation:0,width:6,depth:3.4,hand:1,kind:'bathroom'}}
 ];
 const fixtures=makeShowroomFixtures({stands:custom,bathData});
 try{
  await fixtures.prepareNear(new T.Vector3(0,1.58,-6));assert.equal(fixtures.diagnostics().completeVignettes,3);
  for(const station of fixtures.stations){
   const b=station.bounds,objects=new T.Box3().setFromObject(station.detail);
   assert(objects.min.x>=b.minX-.05&&objects.max.x<=b.maxX+.05,'native geometry fits independently placed island X');assert(objects.min.z>=b.minZ-.05&&objects.max.z<=b.maxZ+.05,'native geometry fits independently placed island Z');
   assert.deepEqual(station.group.scale.toArray(),[1,1,1],'real manufacturer sizes are not scaled to fit');
   for(const collider of fixtures.colliders.filter(c=>c.fixtureStation===station.stand.manufacturer.id)){assert(collider.minX>=b.minX&&collider.maxX<=b.maxX);assert(collider.minZ>=b.minZ&&collider.maxZ<=b.maxZ);}
  }
  const left=fixtures.stations[0],right=fixtures.stations[1],leftForward=left.group.localToWorld(new T.Vector3(0,0,1)),rightForward=right.group.localToWorld(new T.Vector3(0,0,1));assert(leftForward.x>left.layout.origin.x,'left room faces the central atrium');assert(rightForward.x<right.layout.origin.x,'right room faces the central atrium');
  await fixtures.prepareNear(new T.Vector3(10.5,1.58,-6));assert.equal(right.detail.visible,true,'near-detail distance uses the rotated display focus');
  for(let z=-1;z>-14;z-=.2)assert.equal(blocked(fixtures,0,z),false,'the arrival atrium stays clear between independently rotated rooms');assert.equal(blocked(fixtures,0,-17.83),true,'rear hero column remains a physical object');
 }finally{fixtures.dispose();}
});

test('bounds-only rotated displays derive their wall baseline and explicit wall-only islands never receive furniture',()=>{
 const b={minX:8,maxX:13,minZ:-9,maxZ:-3},layout=resolveShowroomFixtureLayout({bounds:b,rotation:-Math.PI/2});assert(Math.abs(layout.origin.x-13)<1e-8);assert(Math.abs(layout.origin.z+6)<1e-8);assert(Math.abs(layout.width-6)<1e-8);assert(Math.abs(layout.depth-5)<1e-8);
 const fixtures=makeShowroomFixtures({stands:[{manufacturer:SHOWROOM_MANUFACTURERS[0],bounds:b,fixtureLayout:{kind:'none'}},{manufacturer:SHOWROOM_MANUFACTURERS.find(m=>m.id==='aquahome'),bounds:{minX:-3,maxX:3,minZ:-5,maxZ:-2},fixtureLayout:{origin:[0,-5],width:6,depth:3,kind:'tapbar'}}]});
 try{assert.equal(fixtures.stations.length,1,'no old hard-coded corridor reception bar is added');assert.equal(fixtures.stations[0].kind,'tapbar');}finally{fixtures.dispose();}
});

test('the furnished atrium uses eight independent native displays and keeps every real product within its island',async()=>{
 const layout=makeShowroomLayout(SHOWROOM_MANUFACTURERS),fixtures=makeShowroomFixtures({stands:layout.displays.map(d=>({manufacturer:d.manufacturer,index:d.index,bounds:d.bounds,fixtureLayout:d.fixtureLayout})),bathData});
 try{
  await fixtures.prepareNear(new T.Vector3(layout.arrival.x,1.58,layout.arrival.z));
  assert.equal(fixtures.stations.length,8);assert.equal(fixtures.diagnostics().completeVignettes,6);assert.equal(fixtures.stations.filter(s=>s.kind==='bathroom'&&s.built).length,6,'all six native bathrooms progressively fill their islands from the first arrival');assert(fixtures.diagnostics().visibleBatches<80,'arrival keeps native grain and glossy ceramics inside the fixture rendering budget');
  const hero=fixtures.stations.find(s=>s.stand.manufacturer.id==='view-ceramica');assert(hero.built,'the furnished hero is visible from the arrival');assert(hero.overview.visible);assert(hero.overview.children.some(o=>o.material.userData.fixtureFinish));
  for(const p of [[0,-7],[2.8,-11],[0,-16],[0,-24]]){await fixtures.prepareNear(new T.Vector3(p[0],1.58,p[1]));assert(fixtures.diagnostics().visibleBatches<140,'the open loop retains physically lit fixtures without excessive draw calls');}
  assert.equal(fixtures.diagnostics().nativeVanities,9);assert.equal(fixtures.diagnostics().baths,3);assert.equal(fixtures.diagnostics().showers,3);assert.equal(fixtures.diagnostics().tapBars,1);
  await fixtures.prepareNear(new T.Vector3(layout.arrival.x,1.58,layout.arrival.z));assert(fixtures.stations.every(s=>s.group.visible),'no furnished island vanishes within the compact open atrium');assert(fixtures.diagnostics().visibleBatches<150);assert(fixtures.diagnostics().triangles<600000);
  for(const station of fixtures.stations){
   const b=station.bounds,objects=new T.Box3().setFromObject(station.detail);assert(objects.min.x>=b.minX-.05&&objects.max.x<=b.maxX+.05);assert(objects.min.z>=b.minZ-.05&&objects.max.z<=b.maxZ+.05);
   assert(objects.max.y<2.3,'authentic furniture stays below the low display walls');
   for(const c of fixtures.colliders.filter(c=>c.fixtureStation===station.stand.manufacturer.id)){assert(c.minX>=b.minX&&c.maxX<=b.maxX);assert(c.minZ>=b.minZ&&c.maxZ<=b.maxZ);}
  }
 }finally{fixtures.dispose();}
});
