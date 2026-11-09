import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeGardenDecor} from '../shared/lrf-3d/showroom-garden-decor.js';

const garden=()=>({
 bounds:{minX:14,maxX:35,minZ:-30,maxZ:-2},poolBounds:{minX:22,maxX:30,minZ:-21,maxZ:-11},floorY:.012,
 loungers:[19.5,32.3].flatMap(x=>[-13,-16,-19].map(z=>({x,z,rotation:x<22?Math.PI/2:-Math.PI/2}))),
 tables:[19.3,32.4].flatMap(x=>[-14.5,-17.5].map(z=>({x,z,radius:.28}))),
 parasols:[{x:19.4,z:-16,radius:1.2},{x:32.3,z:-16,radius:1.2}],
 pergola:{x:19.7,z:-5.8,width:6.6,depth:4.4,height:2.65,rotation:0},fountain:{x:18.2,z:-26,radius:1.25}
});
const blocked=(decor,x,z,r=.20)=>decor.colliders.some(b=>x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ);

test('outdoor furnishings use bounded native curved geometry, woven fabric and stone instead of image rooms',()=>{
 let wakes=0;const decor=makeGardenDecor({layout:garden(),onReady:()=>wakes++});
 try{
  const info=decor.diagnostics();assert.equal(wakes,1);assert.equal(info.curvedLoungers,6);assert.equal(info.tables,4);assert.equal(info.parasols,2);assert.equal(info.pergolas,1);assert.equal(info.fountains,1);assert.equal(info.waterJets,5);assert(info.drawCalls<=16);assert(info.triangles<70000);
  const all=new T.Box3().setFromObject(decor.root);assert(all.min.x>=14&&all.max.x<=35);assert(all.min.z>=-30&&all.max.z<=-2);assert(all.max.y<3.1);
  decor.root.traverse(o=>{if(!o.isMesh)return;assert.equal(o.userData.visualOnly,true);assert.equal(o.userData.excludeFromProductBounds,true);assert.equal(o.userData.editTarget,undefined);assert([...o.geometry.attributes.position.array].every(Number.isFinite));assert([...o.geometry.attributes.normal.array].every(Number.isFinite));const hits=[];o.raycast({},hits);assert.equal(hits.length,0);if(!o.material.transparent)assert.equal(o.castShadow,true);});
  const cloth=decor.root.getObjectByName('Jardin_Tissu_exterieur_lin');assert(cloth.material.isMeshPhysicalMaterial);assert(cloth.material.bumpMap.isDataTexture);assert.equal(cloth.material.map,null,'fabric has geometric volume and procedural microtexture');
  assert(decor.root.getObjectByName('Jardin_Teck_huile_exterieur').material.bumpMap.isDataTexture);
 }finally{decor.dispose();}
});

test('a chaise cushion has a continuous raised back, low seat and curved foot at real furniture dimensions',()=>{
 const decor=makeGardenDecor({layout:{floorY:0,bounds:{minX:-2,maxX:2,minZ:-2,maxZ:2},loungers:[{x:0,z:0}],tables:[],parasols:[],pergola:null,fountain:null}});
 try{
  const mesh=decor.root.getObjectByName('Jardin_Tissu_exterieur_lin'),box=new T.Box3().setFromObject(mesh),position=mesh.geometry.attributes.position;assert(box.max.x-box.min.x>.72&&box.max.x-box.min.x<.75);assert(box.max.z-box.min.z>1.9&&box.max.z-box.min.z<2.1);
  let back=-Infinity,seat=Infinity,foot=Infinity;const lengthSamples=new Set();for(let i=0;i<position.count;i++){const y=position.getY(i),z=position.getZ(i);lengthSamples.add(z.toFixed(3));if(z<-.85)back=Math.max(back,y);if(Math.abs(z)<.12)seat=Math.min(seat,y);if(z>.9)foot=Math.min(foot,y);}
  assert(back>.80);assert(seat<.30);assert(foot<.23);assert(lengthSamples.size>150,'the recliner uses a swept curved solid with many longitudinal sections');assert.equal(decor.diagnostics().curvedLoungers,1);
 }finally{decor.dispose();}
});

test('pool approaches stay clear and parasol supports are cantilevered away from the middle loungers',()=>{
 const layout=garden(),decor=makeGardenDecor({layout});
 try{
  const p=layout.poolBounds;for(const c of decor.colliders){assert(c.maxX<=p.minX||c.minX>=p.maxX||c.maxZ<=p.minZ||c.minZ>=p.maxZ,`${c.kind} must stay outside the swimming pool`);}
  for(const [x,z]of [[16,-10.7],[21,-16],[30.65,-16],[26,-9.5],[26,-22.5],[33,-27]])assert.equal(blocked(decor,x,z),false,`garden walking route remains open at ${x},${z}`);
  for(const x of [21,30.65])for(let z=-10;z>=-22;z-=.1)assert.equal(blocked(decor,x,z),false,'the full longitudinal pool route is open for a human radius');
  const parasols=decor.diagnostics().placements.filter(p=>p.kind==='parasol');assert(parasols.every(p=>p.cantilever));assert(parasols[0].base.x<18);assert(parasols[1].base.x>33.8);
  for(const base of decor.colliders.filter(c=>c.kind==='garden-parasol-base'))for(const lounger of decor.colliders.filter(c=>c.kind==='garden-lounger'))assert(base.maxX<=lounger.minX||base.minX>=lounger.maxX||base.maxZ<=lounger.minZ||base.minZ>=lounger.maxZ,'a real parasol ballast cannot intersect its lounger');
 }finally{decor.dispose();}
});

test('water animates finitely only while the garden is visible and all owned resources dispose once',()=>{
 const decor=makeGardenDecor({layout:garden()}),surface=decor.root.getObjectByName('Fontaine_eau_surface'),initial=surface.geometry.attributes.position.array.slice();
 assert.equal(decor.update(2),true);assert.notDeepEqual(surface.geometry.attributes.position.array,initial);assert.equal(decor.update(NaN),true);assert([...surface.geometry.attributes.position.array].every(Number.isFinite));
 assert.equal(decor.prepareNear({x:-100,z:100}),false);const hidden=surface.geometry.attributes.position.array.slice();assert.equal(decor.update(5),false);assert.deepEqual(surface.geometry.attributes.position.array,hidden);assert.equal(decor.prepareNear({x:18,z:-10}),true);
 const resources=new Set();decor.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material){resources.add(o.material);for(const slot of ['map','bumpMap'])if(o.material[slot])resources.add(o.material[slot]);}});let releases=0;for(const resource of resources)resource.addEventListener('dispose',()=>releases++);
 decor.dispose();decor.dispose();assert.equal(releases,resources.size);assert.equal(decor.update(8),false);assert.equal(decor.prepareNear({x:18,z:-10}),false);assert.equal(decor.diagnostics().disposed,true);
});
