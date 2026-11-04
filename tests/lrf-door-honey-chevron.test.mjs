import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeDoorInterior,DOOR_INTERIOR_FLOOR} from '../shared/lrf-3d/door-interior.js';
import {COLLECTIONS} from '../shared/lrf-3d/surface-catalog.js';
import {disposeObject} from '../studio-one/src/composition.js';

const topVertices=mesh=>{
 const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv,result=[];
 for(let i=0;i<p.count;i++)if(n.getY(i)>.99)result.push({x:p.getX(i),y:p.getY(i)+mesh.position.y,z:p.getZ(i),u:uv.getX(i),v:uv.getY(i)});
 return result;
};

test('the adjoining hall uses the real Yosemite Honey 15x85 mitred format and one continuous world grid',()=>{
 assert.deepEqual(DOOR_INTERIOR_FLOOR,{collection:'Yosemite',color:'honey',format:'15x85',reference:'03H1840',pattern:'chevron'});
 const record=COLLECTIONS.Yosemite.colors.find(c=>c.id==='honey'),format=COLLECTIONS.Yosemite.formats.find(f=>f.id==='15x85');
 assert.equal(format.shape,'chevron');assert.equal(format.chevronAngle,45);assert(record.formats.includes(format.id));
 for(const width of [.6,.83,1.4]){
  const hall=makeDoorInterior({width});
  try{
   const floor=hall.root.getObjectByName('Yosemite_Honey_chevron_hall'),passage=hall.root.getObjectByName('Sol_continu_passage');
   assert.equal(floor.material,passage.material,'one source recipe spans the hall and narrow passage');
   assert.equal(hall.root.userData.hallFloor.source,record.manufacturerSample);assert.equal(hall.root.userData.hallFloor.fidelity,'manufacturer-sample');
   assert(!hall.root.userData.hallFloor.source.includes('reconstructed'));
   assert(floor.geometry.userData.tileCount>40);assert(floor.geometry.userData.cells.every(c=>c.width===.85&&c.height===.15));
   const a=topVertices(floor),b=topVertices(passage);assert(a.length&&b.length);for(const v of [...a,...b])assert(Math.abs(v.y-.001)<1e-8,'the chevron face keeps the original finished floor elevation');
   const seamA=a.filter(v=>Math.abs(v.z+.53)<1e-6),seamB=b.filter(v=>Math.abs(v.z+.53)<1e-6);
   let compared=0;for(const v of seamB){const same=seamA.find(w=>Math.abs(v.x-w.x)<1e-6&&Math.abs(v.u-w.u)<1e-6&&Math.abs(v.v-w.v)<1e-6);if(same)compared++;}
   assert(compared>=2,'cut pieces retain identical material coordinates across the passage boundary');
   assert(a.every(v=>v.z<=-.53+1e-6));assert(b.every(v=>v.z>=-.53-1e-6&&v.z<=-.22+1e-6));
   const normals=floor.geometry.attributes.normal;assert([...normals.array].every(Number.isFinite));assert.equal(floor.castShadow,false);assert.equal(floor.receiveShadow,true);
   let count=0,triangles=0;hall.root.traverse(o=>{if(o.isMesh){count++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});assert(count<45);assert(triangles<18000);
   hall.root.updateMatrixWorld(true);assert.equal(new T.Raycaster(new T.Vector3(0,1,-1),new T.Vector3(0,-1,0)).intersectObject(hall.root,true).length,0,'backdrop never steals editing hits');
  }finally{disposeObject(hall.root);}
 }
});

test('the manufacturer bitmap loads once on reveal, wakes the view and is owned by that hall only',async()=>{
 let requests=0,ready=0,disposed=0;const texture=new T.Texture();texture.addEventListener('dispose',()=>disposed++);
 const hall=makeDoorInterior({loadTexture:async(url,options)=>{requests++;assert.match(url,/manufacturer-materials\/elios\/wp-content\/uploads\/2023\/05\/YOSEMITE_honey_zoom\.jpg$/);assert.equal(options.maxDimension,2048);assert(options.signal instanceof AbortSignal);return texture;},onReady:()=>ready++});
 try{
  const floor=hall.root.getObjectByName('Yosemite_Honey_chevron_hall');assert.equal(requests,0);assert.equal(floor.material.map,null);
  hall.setVisible(true);hall.setVisible(true);assert.equal(await hall.prepareFloor(),true);assert.equal(requests,1);assert.equal(ready,1);
  assert.equal(floor.material.map,texture);assert.equal(texture.colorSpace,T.SRGBColorSpace);assert.equal(texture.anisotropy,8);assert.equal(floor.material.color.getHexString(),'ffffff');assert.equal(hall.root.userData.hallFloor.textureState,'ready');
  hall.setVisible(false);hall.setVisible(true);await hall.prepareFloor();assert.equal(requests,1);
 }finally{disposeObject(hall.root);}
 assert.equal(disposed,1);
});

test('a disposed backdrop cannot attach a late texture or wake a destroyed renderer',async()=>{
 let resolveTexture,ready=0,disposed=0,signal;const texture=new T.Texture();texture.addEventListener('dispose',()=>disposed++);
 const pending=new Promise(resolve=>resolveTexture=resolve),hall=makeDoorInterior({loadTexture:(_url,options)=>{signal=options.signal;return pending;},onReady:()=>ready++});
 hall.setVisible(true);const task=hall.prepareFloor();await Promise.resolve();disposeObject(hall.root);assert.equal(signal.aborted,true);resolveTexture(texture);
 assert.equal(await task,false);assert.equal(disposed,1);assert.equal(ready,0);assert.equal(hall.root.getObjectByName('Yosemite_Honey_chevron_hall').material.map,null);
});
