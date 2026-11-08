import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeShowroomFixtures} from '../shared/lrf-3d/showroom-fixtures.js';
import {SHOWROOM_MANUFACTURERS} from '../shared/lrf-3d/showroom-catalog.js';
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
  await fixtures.prepareNear(new T.Vector3(0,1.58,-2));assert(fixtures.diagnostics().visibleBatches<25,'the arrival view does not submit hundreds of product material calls');
  const first=fixtures.stations[0];assert.equal(first.overview.visible,true);assert.equal(first.detail.visible,false);
  const snapshots=JSON.stringify(fixtures.colliders);await fixtures.prepareNear(new T.Vector3(-5.5,1.58,first.back+1.4));assert.equal(first.detail.visible,true);assert.equal(first.overview.visible,false);assert(fixtures.diagnostics().visibleBatches<125);
  await fixtures.prepareNear(new T.Vector3(0,1.58,-52));assert.equal(first.group.visible,false);assert.equal(JSON.stringify(fixtures.colliders),snapshots,'LOD never changes the physical navigation envelope');
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
