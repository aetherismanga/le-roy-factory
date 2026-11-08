import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeShowroomHall} from '../shared/lrf-3d/showroom-hall.js';

const suppliers=(count=17,collections=35)=>Array.from({length:count},(_,i)=>({id:`supplier-${i}`,name:`Fournisseur ${i}`,category:'Carrelage',href:'https://leroyfactory.fr/selections.html',collections:Array.from({length:collections},(_,j)=>({id:`collection-${j}`,name:`Collection ${j}`,image:`https://leroyfactory.fr/collection-${i}-${j}.webp`,href:`https://leroyfactory.fr/collection-${j}.html`}))}));
const blocked=(hall,x,z,r=.2)=>hall.colliders.some(b=>x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ);

test('hall contains one real stand per supplier, a clear central aisle and colliding booth partitions',()=>{
 const hall=makeShowroomHall({manufacturers:suppliers()});
 assert.equal(hall.root.visible,false);assert.equal(hall.stands.length,17);assert.equal(hall.interactions.length,51);
 assert.equal(hall.dimensions.width,22);assert.equal(hall.dimensions.height,3.8);assert.equal(hall.dimensions.wallHeight,2.3);
 for(let z=-.4;z>-hall.dimensions.depth+.5;z-=.1)assert.equal(blocked(hall,0,z),false,`central aisle ${z}`);
 assert.equal(blocked(hall,-5.7,-2.1),true,'reception counter');
 // Low booth walls remain solid while the front gives access to the samples
 // and the inner passage, including the furnished bathroom scenes.
 for(const stand of hall.stands){
  const {minX,maxX}=stand.bounds,side=minX<0?-1:1;
  assert.equal(blocked(hall,minX,(stand.front+stand.back)/2),true);
  assert.equal(blocked(hall,maxX,(stand.front+stand.back)/2),true);
  assert.equal(blocked(hall,(minX+maxX)/2,stand.back),true);
  assert.equal(blocked(hall,side*3,stand.front-.35),false);
  assert.equal(blocked(hall,(minX+maxX)/2,stand.front-.35),false);
 }
 hall.root.traverse(object=>{if(object.isMesh){assert.equal(object.userData.visualOnly,true);const hits=[];object.raycast({},hits);assert.equal(hits.length,0,'editing picker must ignore every showroom mesh');}});
 hall.dispose();
});

test('physical panel pagination exposes every collection with correct metadata and wraps both ways',()=>{
 const manufacturer=suppliers(1,35)[0],hall=makeShowroomHall({manufacturers:[manufacturer]}),stand=hall.stands[0];
 const seen=new Set();
 assert.equal(stand.pageSize,4);const pages=Math.ceil(manufacturer.collections.length/stand.pageSize);
 for(let page=0;page<pages;page++){
  for(const panel of stand.panels.filter(p=>!p.floor&&p.collection)){seen.add(panel.collection.id);assert.equal(panel.mesh.userData.showroomCollection.collection,panel.collection);}
  assert.equal(hall.activateAction({kind:'page',manufacturerId:manufacturer.id,direction:1}),true);
 }
 assert.equal(seen.size,35);assert.equal(stand.page,0);
 hall.activateAction({kind:'page',manufacturerId:manufacturer.id,direction:-1});assert.equal(stand.page,pages-1);
 assert.equal(hall.activateAction({kind:'catalogue',manufacturerId:manufacturer.id}),false);
 hall.dispose();
});

test('nearby authentic images are bounded and release texture resources after moving or changing page',async()=>{
 let loads=0,disposed=0;const textureRequests=[];
 const hall=makeShowroomHall({manufacturers:suppliers(8,35),maxTextures:8,textureSize:384,loadTexture:async(url,options)=>{
  textureRequests.push({url,options});loads++;
  const texture=new T.Texture({width:900,height:450});texture.addEventListener('dispose',()=>disposed++);return texture;
 }});
 hall.root.visible=true;await hall.prepareNear(new T.Vector3(-8,1.58,-12));
 assert.equal(hall.diagnostics().loaded,8);assert.equal(loads,8);assert.ok(textureRequests.every(r=>r.options.maxDimension===384));
 const panel=hall.panels.find(p=>p.texture);assert.equal(panel.mesh.scale.x/panel.mesh.scale.y,2,'authentic image aspect remains intact');
 await hall.prepareNear(new T.Vector3(0,1.58,-hall.dimensions.depth+1));assert.ok(disposed>=8,'far maps freed');assert.ok(hall.diagnostics().loaded<=8);
 await hall.prepareNear(new T.Vector3(-8,1.58,-12));hall.activateAction({kind:'page',manufacturerId:'supplier-0',direction:1});
 hall.dispose();await new Promise(resolve=>setImmediate(resolve));assert.equal(disposed,loads,'all downloaded image textures disposed');
});

test('late image completions after disposal are discarded',async()=>{
 const resolvers=[];let disposed=0;
 const hall=makeShowroomHall({manufacturers:suppliers(1,2),maxTextures:2,loadTexture:()=>new Promise(resolve=>resolvers.push(resolve))});
 const ready=hall.prepareNear(new T.Vector3(-8,1,-12));hall.dispose();
 for(const resolve of resolvers){const texture=new T.Texture({width:10,height:10});texture.addEventListener('dispose',()=>disposed++);resolve(texture);}
 await ready;assert.equal(disposed,2);assert.equal(hall.diagnostics().loaded,0);
});

test('distance culling reduces live detail meshes and restores stands and pages on approach',async()=>{
 const hall=makeShowroomHall({manufacturers:suppliers()});hall.root.visible=true;
 const collisionSnapshot=JSON.stringify(hall.colliders),last=hall.stands.at(-1);
 await hall.prepareNear(new T.Vector3(0,1.58,-1));
 assert.equal(last.group.visible,false);assert.ok(last.panels.every(p=>!p.mount.visible));
 let allMeshes=0,visibleMeshes=0;for(const stand of hall.stands){stand.group.traverse(o=>{if(o.isMesh)allMeshes++;});stand.group.traverseVisible(o=>{if(o.isMesh)visibleMeshes++;});}
 assert.ok(visibleMeshes<allMeshes/2,'most stand detail remains outside the live draw list at the entrance');
 assert.ok(hall.diagnostics().visibleStands<=Math.ceil(hall.stands.length/2),'nearby room-scale stands alone are active');
 assert.ok(hall.diagnostics().architectureBatches>0,'static architecture shares material batches');
 const near=new T.Vector3((last.bounds.minX+last.bounds.maxX)/2,1.58,last.bounds.maxZ-4);
 await hall.prepareNear(near);assert.equal(last.group.visible,true);
 assert.ok(last.panels.filter(p=>p.collection).every(p=>p.mount.visible));
 hall.activateAction({kind:'page',manufacturerId:last.manufacturer.id,direction:1});
 assert.equal(last.panels[0].collection.id,'collection-4');
 await hall.prepareNear(new T.Vector3(0,1.58,-1));assert.equal(last.group.visible,false);
 await hall.prepareNear(near);assert.equal(last.group.visible,true);assert.equal(last.panels[0].mount.visible,true);
 assert.equal(last.panels[0].mesh.userData.showroomCollection.collection.id,'collection-4');
 assert.equal(JSON.stringify(hall.colliders),collisionSnapshot,'render culling never changes physical boundaries');
 hall.dispose();
});
