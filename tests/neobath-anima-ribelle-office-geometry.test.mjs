import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {animaFacadeGeometry,applyAnimaWoodUV,addAnimaDoor} from '../functions/neobath-anima/studio-adapter/facades.js';

// Frozen probes were raycast from the actual pre-optimization mesh, before
// changing the generator. They test physical surfaces rather than its loops.
const before=JSON.parse(readFileSync(new URL('./fixtures/neobath-anima-facade-before-office-optimization.json',import.meta.url)));
const near=(a,b,epsilon,note)=>assert.ok(Math.abs(a-b)<=epsilon,`${note}: ${a} / ${b}`);
const mesh=geometry=>new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));
const bytes=g=>Object.values(g.attributes).reduce((sum,attribute)=>sum+attribute.array.byteLength,0)+g.index.array.byteLength;
function volume(g){const p=g.attributes.position,ids=g.index.array,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let result=0;for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(p,ids[i]);b.fromBufferAttribute(p,ids[i+1]);c.fromBufferAttribute(p,ids[i+2]);result+=a.dot(b.cross(c))/6;}return result;}

test('Ribelle keeps 198 native relief, grip, mitre, rear and side ray hits with the same normals and metre UV',()=>{
 let compared=0;
 for(const row of before.rows){const m=mesh(animaFacadeGeometry(row.width,row.height,true));m.updateMatrixWorld(true);
  try{for(const probe of row.probes){const hit=new T.Raycaster(new T.Vector3(...probe.origin),new T.Vector3(...probe.direction)).intersectObject(m,false)[0];assert.ok(hit,'source surface remains pickable');for(const [field,epsilon]of[['point',2e-7],['normal',3e-5],['uv',2e-7]])for(const [i,value]of hit[field].toArray().entries())near(value,probe[field][i],epsilon,field+' sample '+compared);compared++;}}
  finally{m.geometry.dispose();m.material.dispose();}
 }
 assert.equal(compared,198);
});

test('the indexed Ribelle solid retains native stock envelopes and volume while cutting triangles by more than half',()=>{
 for(const row of before.rows){const g=animaFacadeGeometry(row.width,row.height,true);try{
  assert.ok(g.index.count/3<row.triangles*.45,'only redundant planar subdivisions are removed');
  assert.ok(g.attributes.position.count<row.vertices*.35,'shared vertices retain separate sharp normals');
  assert.ok(bytes(g)<row.vertices*36*.35,'substantially fewer GPU geometry bytes');
  near(volume(g),row.volume,3e-10,'same physical panel volume');
  const size=g.boundingBox.getSize(new T.Vector3());near(size.x,row.width,1e-7,'stock width');near(size.y,row.height,1e-7,'stock height');near(size.z,.019,1e-8,'stock thickness');
  assert.ok(g.index.array instanceof Uint16Array,'single stock front fits a small indexed buffer');
  for(const value of g.attributes.normal.array)assert.ok(Number.isFinite(value));
 }finally{g.dispose();}}
});

test('real left and right Ribelle doors retain hinge travel, picking target and world-sized grain after the optimization',()=>{
 for(const hingeSide of['left','right']){const parent=new T.Group(),material=new T.MeshBasicMaterial(),set=addAnimaDoor({parent,width:.8,height:.52,bottom:.3,frontZ:.22,wood:material,metal:material,ribelle:true,hingeSide});
  try{const front=set.frontMeshes[0],originalBox=front.geometry.boundingBox.clone();assert.equal(front.userData.editTarget,'furniture');assert.equal(set.proxies.length,1);set.proxies[0].position.z=.315;assert.ok(Math.abs(set.doors[0].rotation.y)>1.7);set.proxies[0].position.z=0;assert.equal(set.doors[0].rotation.y,0);applyAnimaWoodUV(front,{front:true});const p=front.geometry.attributes.position,uv=front.geometry.attributes.uv;for(let i=0;i<p.count;i+=53){near(uv.getX(i),(p.getX(i)+front.position.x)/.8+.5,2e-7,'horizontal metre map');near(uv.getY(i),(p.getY(i)+front.position.y)/.7+.5,2e-7,'vertical metre map');}assert.ok(front.geometry.boundingBox.equals(originalBox),'material mapping never changes panel geometry');}
  finally{for(const front of set.frontMeshes)front.geometry.dispose();parent.traverse(o=>{if(o.isMesh&&o.geometry&&!set.frontMeshes.includes(o))o.geometry.dispose();});material.dispose();}
 }
});
