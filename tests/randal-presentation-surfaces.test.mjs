import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRandalPresentationScene} from '../shared/lrf-3d/randal-presentation-scene.js';
import {resolveSurfaceTexture} from '../shared/lrf-3d/surface-texture-selection.js';
import {surfaceAssetURL} from '../shared/lrf-3d/texture-loader.js';
import {presentationChoice} from '../shared/lrf-3d/randal-presentation-catalog.js';
import {makeCatalogueMirror} from '../shared/lrf-3d/mirrors.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({loadTexture=async()=>new T.Texture({width:2048,height:1024}),quality={},items=[]}={}){
 const scene=new T.Scene(),floor=new T.Mesh(),wall=new T.Mesh();scene.add(floor,wall);
 const previousCancel=globalThis.cancelAnimationFrame;globalThis.cancelAnimationFrame=()=>{};
 let current=items;
 const engine=createRandalPresentationScene({scene,floor,wall,renderer:{capabilities:{getMaxAnisotropy:()=>16}},getItems:()=>current,invalidate(){},quality,loadTexture});
 return {scene,engine,setItems(value){current=value;},dispose(){engine.dispose();globalThis.cancelAnimationFrame=previousCancel;}};
}
function trackedTexture(){const texture=new T.Texture({width:2048,height:1024});let disposals=0;texture.addEventListener('dispose',()=>disposals++);return {texture,get disposals(){return disposals;}};}
function deferredLoader(){const requests=[];return {requests,loadTexture(url,options){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});requests.push({url,options,resolve,reject});return promise;}};}

test('Stone Icon Leccese uses every verified 60x90 manufacturer face with deterministic material groups',async()=>{
 const choice=presentationChoice('wall','stone-icon-leccese'),selection=resolveSurfaceTexture(choice.collection,choice.color,'max',choice);
 assert.equal(selection.mapped,true);assert.equal(selection.reference,'04S6903');assert.equal(selection.files.length,4);
 const calls=[],textures=[];const f=fixture({loadTexture:async(url,options)=>{calls.push({url,options});const t=trackedTexture();textures.push(t);return t.texture;}});
 try{
  assert.equal(await f.engine.setSurface('wall',choice.id),true);
  assert.deepEqual(calls.map(c=>c.url),selection.files.map(surfaceAssetURL));
  const tiles=f.scene.getObjectByName('Présentation_wall').children[0],materials=Array.isArray(tiles.material)?tiles.material:[tiles.material];
  assert.equal(materials.length,4);assert.equal(new Set(materials.map(m=>m.map)).size,4);
  assert.equal(tiles.geometry.groups.length,4);assert(tiles.geometry.groups.every(g=>g.count>0));
  assert.equal(f.engine.diagnostics().textureCount,4);assert.deepEqual([f.engine.diagnostics().layouts.wall.width,f.engine.diagnostics().layouts.wall.height],[.9,.6]);
  assert(materials.every(m=>m.bumpMap===null),'catalogue colour images are never invented height fields');
 }finally{f.dispose();}
 await flush();assert(textures.every(t=>t.disposals===1));
});

test('Allure decor retains one uninterrupted real drawing across tile joints and negative grid cells',async()=>{
 const f=fixture();
 try{
  for(const id of ['fenix-juniper','fenix-blueberry','safari','eden']){
   await f.engine.setSurface('wall','allure-'+id);
   const group=f.scene.getObjectByName('Présentation_wall'),tiles=group.children[0],material=Array.isArray(tiles.material)?tiles.material[0]:tiles.material;
   const geometry=tiles.geometry,{position,normal,uv}=geometry.attributes,layout=f.engine.diagnostics().layouts.wall;material.map.updateMatrix();
   let checked=0;assert.equal(geometry.userData.continuousDecor,true);
   for(let i=0;i<position.count;i++){
    if(normal.getZ(i)<.99)continue;
    const point=new T.Vector2(uv.getX(i),uv.getY(i)).applyMatrix3(material.map.matrix),x=position.getX(i),y=position.getY(i),expected=[1-y/layout.height,x/layout.width];
    assert(Math.abs(point.x-expected[0]-Math.round(point.x-expected[0]))<3e-6,'horizontal graphic phase remains continuous');
    assert(Math.abs(point.y-expected[1]-Math.round(point.y-expected[1]))<3e-6,'vertical graphic phase remains continuous');checked++;
   }
   assert(checked>100);assert.equal(material.bumpMap,null);assert.equal(f.engine.diagnostics().textureCount,1);
  }
  await f.engine.setSurface('wall','allure-snow');assert.equal(f.scene.getObjectByName('Présentation_wall').children[0].geometry.userData.continuousDecor,false);
 }finally{f.dispose();}
});

test('limited GPU profile bounds texture dimensions and face count without changing real tile scale',async()=>{
 const calls=[],f=fixture({quality:{textureProfile:'balanced',maxTextureDimension:768,maxSurfaceFaces:1,anisotropy:2},loadTexture:async(url,options)=>{calls.push({url,options});return new T.Texture({width:768,height:512});}});
 try{
  await f.engine.setSurface('wall','stone-icon-leccese');assert.equal(calls.length,1);assert.equal(calls[0].options.maxDimension,768);assert.equal(f.engine.diagnostics().textureCount,1);
  const tiles=f.scene.getObjectByName('Présentation_wall').children[0];assert.equal(Array.isArray(tiles.material),false);assert.equal(tiles.material.map.anisotropy,2);
  assert.deepEqual([f.engine.diagnostics().layouts.wall.width,f.engine.diagnostics().layouts.wall.height],[.9,.6]);
 }finally{f.dispose();}
});

test('closing during an unfinished texture load releases the late texture exactly once',async()=>{
 const loader=deferredLoader(),f=fixture(loader),pending=f.engine.setSurface('floor','slate-beige');assert.equal(loader.requests.length,1);
 const texture=trackedTexture();f.dispose();loader.requests[0].resolve(texture.texture);assert.equal(await pending,false);await flush();assert.equal(texture.disposals,1);assert.equal(f.engine.diagnostics().textureCount,0);
 assert.equal(f.scene.getObjectByName('Présentation_floor'),undefined);
});

test('superseded surface never replaces the latest choice and its resources are released',async()=>{
 const loader=deferredLoader(),f=fixture(loader),old=f.engine.setSurface('floor','slate-beige'),latest=f.engine.setSurface('floor','creta-caramello');
 const stale=trackedTexture(),current=trackedTexture();
 try{
  loader.requests[1].resolve(current.texture);assert.equal(await latest,true);loader.requests[0].resolve(stale.texture);assert.equal(await old,false);await flush();
  assert.equal(f.engine.diagnostics().selected.floor,'creta-caramello');assert.equal(f.engine.diagnostics().textureCount,1);assert.equal(stale.disposals,1);assert.equal(current.disposals,0);
 }finally{f.dispose();}
 await flush();assert.equal(stale.disposals,1);assert.equal(current.disposals,1);
});

test('one failed manufacturer face releases successful and still-pending sibling loads',async()=>{
 const loader=deferredLoader(),f=fixture(loader),pending=f.engine.setSurface('wall','stone-icon-leccese');assert.equal(loader.requests.length,4);
 const loaded=[trackedTexture(),trackedTexture(),trackedTexture()];
 try{
  loader.requests[0].resolve(loaded[0].texture);loader.requests[1].reject(Error('manufacturer unavailable'));await assert.rejects(pending,/manufacturer unavailable/);
  loader.requests[2].resolve(loaded[1].texture);loader.requests[3].resolve(loaded[2].texture);await flush();
  assert.equal(f.engine.diagnostics().textureCount,0);assert.equal(f.scene.getObjectByName('Présentation_wall'),undefined);assert(loaded.every(t=>t.disposals===1));
 }finally{f.dispose();}
 await flush();assert(loaded.every(t=>t.disposals===1));
});

test('replacing an LED mirror by Basic with the same item id removes LED capability',()=>{
 const mirror=settings=>({id:'kept-mirror-id',type:'mirror',settings,asset:makeCatalogueMirror(settings)}),f=fixture({items:[mirror({mirrorModel:'ilse',width:60,height:80,led:true})]});
 try{
  assert.equal(f.engine.capabilities().led,true);assert.equal(f.engine.capabilities().ledOn,true);
  f.setItems([mirror({mirrorModel:'basic',width:60,height:80,led:false})]);assert.equal(f.engine.capabilities().led,false);assert.equal(f.engine.capabilities().ledOn,false);
 }finally{f.dispose();}
});
