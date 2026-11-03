import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {build} from 'esbuild';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {applyPlanSurfaceUV,createTopSurfaceController,resolvePlanSurfaceScale} from '../functions/neobath-anima/studio-adapter/surface-materials.js';
import {MANUFACTURER_SURFACES} from '../functions/neobath-anima/studio-adapter/premium-materials.js';
import {topSelection} from '../functions/neobath-anima/studio-adapter/anima-data.js';
const repo=resolve('.'),adapter=join(repo,'functions/neobath-anima/studio-adapter'),studio=join(repo,'studio-one/src');
mkdirSync(join(repo,'node_modules/.cache'),{recursive:true});const tmp=mkdtempSync(join(repo,'node_modules/.cache/anima-surface-v9-'));
await build({stdin:{contents:`export {buildAnimaTop} from ${JSON.stringify(join(adapter,'tops.js'))};`,resolveDir:repo,loader:'js'},outfile:join(tmp,'tops.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'real-top-factory',setup(b){b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));}}]});
const {buildAnimaTop}=await import(pathToFileURL(join(tmp,'tops.mjs')).href);after(()=>rmSync(tmp,{recursive:true,force:true}));
const close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
function material(){const m=new T.MeshPhysicalMaterial();m.userData.animaSurface={family:'hpl',source:{runtimeSize:[1500,1000]}};return m;}
function slab(width=1.2,height=.12,depth=.465,m=material()){
 const root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(width,height,depth),m);mesh.position.y=height/2;root.add(mesh);root.userData.animaTop={width,depth,zOffset:0,topSurface:height,wells:[]};return {root,mesh,material:m};
}
function triangles(mesh){const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,world=mesh.matrix;return Array.from({length:p.count/3},(_,i)=>{const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i*3+j).applyMatrix4(world)),texels=[0,1,2].map(j=>new T.Vector2().fromBufferAttribute(uv,i*3+j)),normal=new T.Vector3().crossVectors(points[1].clone().sub(points[0]),points[2].clone().sub(points[0]));return {points,texels,normal,area:normal.length()/2,uvArea:Math.abs(new T.Vector2().subVectors(texels[1],texels[0]).cross(new T.Vector2().subVectors(texels[2],texels[0])))/2};});}
function dispose(fixture){fixture.mesh.geometry.dispose();fixture.material.dispose();}

test('image aspect determines a fixed preview metric scale independently of the chosen plan size',()=>{
 const landscape=resolvePlanSurfaceScale({source:{runtimeSize:[1500,1000],nativeSize:[1000,1000]}});assert.deepEqual(landscape.size,[1.2000000000000002,.8]);assert.equal(landscape.status,'fixed-preview-reference-from-image-aspect');assert.equal(landscape.approximate,true);
 assert.deepEqual(resolvePlanSurfaceScale({source:{nativeSize:[600,1500]}}).size,[.8,2]);assert.deepEqual(resolvePlanSurfaceScale({}, {width:200,height:1000}).size,[.8,4]);assert.deepEqual(resolvePlanSurfaceScale({physicalSize:[3.2,1.6],source:{nativeSize:[1500,1000]}}).size,[3.2,1.6]);assert.equal(resolvePlanSurfaceScale({physicalSize:[3.2,1.6]}).approximate,undefined);
});

test('HPL1/6/12 slabs keep isotropic density on top, aprons and ends at every enlarged length',()=>{
 for(const height of[.01,.06,.12])for(const width of[.6,1.2,1.8,2.4]){
  const fixture=slab(width,height);try{const geometry=fixture.mesh.geometry;applyPlanSurfaceUV(fixture.root,fixture.material);assert.equal(fixture.mesh.geometry,geometry,'owned geometry identity is preserved');fixture.mesh.updateMatrix();const list=triangles(fixture.mesh);assert.equal(list.length,12);
   for(const triangle of list){assert.ok(triangle.uvArea>1e-8,'a visible vertical panel must have two texture dimensions');close(triangle.uvArea*1.2*.8,triangle.area,2e-7);}
   const p=geometry.attributes.position,uv=geometry.attributes.uv;
   for(const triangle of list.filter(t=>t.normal.y>0))for(let j=0;j<3;j++){const v=triangle.points[j],t=triangle.texels[j];close(t.x,v.x/1.2+.5);close(t.y,(v.z+.2325)/.8);}
   const topVertices=[];for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-height/2)<1e-7)topVertices.push({x:p.getX(i),z:p.getZ(i),u:uv.getX(i),v:uv.getY(i)});
   for(const v of topVertices){close(v.u,v.x/1.2+.5);close(v.v,(v.z+.2325)/.8);}
   assert.deepEqual(fixture.root.userData.animaSurfaceUV.physicalSize,[1.2000000000000002,.8]);
  }finally{dispose(fixture);}
 }
});

test('moving, rotating or snapping a plan does not move its image, including nested chart transforms',()=>{
 const f=slab(),nested=new T.Group();f.root.remove(f.mesh);nested.rotation.y=.21;f.mesh.rotation.y=-.21;nested.add(f.mesh);f.root.add(nested);applyPlanSurfaceUV(f.root,f.material);const before=f.mesh.geometry.attributes.uv.array.slice();
 f.root.position.set(.7,.3,-.4);f.root.rotation.y=.3;applyPlanSurfaceUV(f.root,f.material);for(const [i,value]of f.mesh.geometry.attributes.uv.array.entries())close(value,before[i]);assert.doesNotThrow(()=>JSON.stringify(f.material.userData));dispose(f);
});

test('real matching HPL basin panels have non-collapsed wall UVs and retain the deck field on their rims',()=>{
 const m=material(),wood=new T.MeshPhysicalMaterial(),ceramic=new T.MeshPhysicalMaterial(),chrome=new T.MeshStandardMaterial(),selection=topSelection('vasca-a50',120,'two','center',120,'thpl12-linear-top'),top=buildAnimaTop({selection,wood,ceramic,chrome,planMaterial:m,bowlMaterial:m,surfaceY:0});
 try{
  const ids=new Map();top.root.traverse(mesh=>{if(mesh.isMesh&&mesh.material===m)ids.set(mesh,mesh.geometry);});applyPlanSurfaceUV(top.root,m);const well=top.root.userData.animaTop.wells[0];let walls=0,rim=0;
  top.root.updateWorldMatrix(true,true);for(const [mesh,geometry]of ids){assert.equal(mesh.geometry,geometry);mesh.updateMatrix();const list=triangles(mesh);for(const triangle of list){if(triangle.area>1e-10)assert.ok(triangle.uvArea>1e-12,mesh.name+' has a texture-degenerate triangle');}if(mesh.userData.animaSurfaceRole==='bowl'){
    walls+=geometry.userData.animaSurfaceCharts.basinWall;const p=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrix);if(Math.abs(v.y-.12)<1e-6){close(uv.getX(i),v.x/1.2+.5);close(uv.getY(i),(v.z+.2325)/.8);rim++;}}
   }}
  assert.ok(walls>0);assert.ok(rim>100);assert.equal(well.kind,'integrated');const disposed=new Map([...ids.values()].map(g=>[g,0]));for(const g of disposed.keys())g.addEventListener('dispose',()=>disposed.set(g,disposed.get(g)+1));top.dispose();for(const count of disposed.values())assert.equal(count,1,'top disposal still releases every mapped geometry');
 }finally{m.dispose();wood.dispose();ceramic.dispose();chrome.dispose();}
});

test('a sloped manufactured basin panel develops its actual length instead of stretching the pattern vertically',()=>{
 const m=material(),root=new T.Group(),g=new T.BufferGeometry(),mesh=new T.Mesh(g,m);mesh.userData.animaSurfaceRole='bowl';g.setAttribute('position',new T.Float32BufferAttribute([-.1,0,.15,.1,0,.15,.1,-.12,.10,-.1,0,.15,.1,-.12,.10,-.1,-.12,.10],3));g.computeVertexNormals();root.add(mesh);root.userData.animaTop={width:1.2,depth:.465,zOffset:0,topSurface:0,wells:[{x:0,z:0,width:.5,depth:.3,power:24}]};applyPlanSurfaceUV(root,m);mesh.updateMatrix();
 for(const triangle of triangles(mesh))close(triangle.uvArea*1.2*.8,triangle.area,1e-7);const uv=g.attributes.uv;close(Math.abs(uv.getY(2)-uv.getY(1))*.8,.13);g.dispose();m.dispose();
});

test('async image dimensions remap only the current plan and mirrored wrapping avoids stretched edge pixels',async()=>{
 let resolve;const loader={loadAsync:()=>new Promise(r=>resolve=r)},wood=new T.MeshPhysicalMaterial(),ceramic=new T.MeshPhysicalMaterial(),controller=createTopSurfaceController({wood,ceramic,textureLoader:loader}),surface=MANUFACTURER_SURFACES.find(s=>s.id==='hpl-statuario');controller.apply({topSurfaceId:surface.id},topSelection('thpl12-linear-top',120,'two'));
 controller.material.userData.animaSurface.source={};const first=slab(1.2,.12,.465,controller.material),current=slab(2.4,.12,.465,controller.material);applyPlanSurfaceUV(first.root,controller.material);const before=first.mesh.geometry.attributes.uv.array.slice();applyPlanSurfaceUV(current.root,controller.material);resolve(new T.Texture({width:200,height:1000,src:surface.texture}));await controller.ready();
 assert.deepEqual(current.root.userData.animaSurfaceUV.physicalSize,[.8,4]);assert.deepEqual([...first.mesh.geometry.attributes.uv.array],[...before]);assert.equal(controller.material.map.wrapS,T.MirroredRepeatWrapping);assert.equal(controller.material.map.wrapT,T.MirroredRepeatWrapping);assert.deepEqual(controller.material.map.repeat.toArray(),[1,1]);assert.equal(controller.material.map.userData.animaMapping,'fixed-metric-face-unfold');assert.doesNotThrow(()=>JSON.stringify(controller.material.userData));first.mesh.geometry.dispose();current.mesh.geometry.dispose();controller.dispose();wood.dispose();ceramic.dispose();
});
