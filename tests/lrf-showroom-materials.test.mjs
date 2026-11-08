import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {COLLECTIONS,formatsForColor} from '../shared/lrf-3d/surface-catalog.js';
import {createShowroomMaterials,SHOWROOM_MATERIAL_RECIPES,applyShowroomSurfaceUV} from '../shared/lrf-3d/showroom-materials.js';

test('hall flooring references exact canonical manufacturer material samples and available physical formats',()=>{
 for(const name of ['floor','darkFloor','sageFloor']){
  const spec=SHOWROOM_MATERIAL_RECIPES[name],collection=COLLECTIONS[spec.collection],color=collection.colors.find(value=>value.id===spec.colorId),format=formatsForColor(spec.collection,spec.colorId).find(value=>value.id===spec.format);
  assert(color.nativeFaces);assert.equal(format.width,spec.width);assert.equal(format.height,spec.height);assert.equal(color.source,spec.source);assert(!/living|bagno|ambiance|ambiente|reconstructed/i.test(spec.image));
 }
 assert.equal(SHOWROOM_MATERIAL_RECIPES.floor.collection,'Creta');assert.equal(SHOWROOM_MATERIAL_RECIPES.floor.format,'120x120');
 assert.match(SHOWROOM_MATERIAL_RECIPES.stone.original,/Borgo-Antico_muro/);assert.match(SHOWROOM_MATERIAL_RECIPES.stone.image,/8edbae0fda02fe39a1\.webp$/);
});

test('queued showroom textures load lazily once and crop the native grain without stretching',async()=>{
 const calls=[],maps=[];let ready=0;
 const materials=createShowroomMaterials({onReady:()=>ready++,loadTexture:async(url,options)=>{calls.push({url,options});const map=new T.Texture({width:1400,height:700});maps.push(map);return map;}});
 assert.equal(calls.length,0);assert.equal(materials.materials.floor.map,null);
 await materials.prepareNear(new T.Vector3());await materials.prepareNear(new T.Vector3(10,1,-10));
 assert.equal(calls.length,4);assert.equal(ready,4);assert(calls.every(call=>call.options.signal instanceof AbortSignal));assert.equal(calls.find(call=>call.url===SHOWROOM_MATERIAL_RECIPES.stone.image).options.maxDimension,512);
 const map=materials.materials.floor.map;assert.equal(map.repeat.x,.5);assert.equal(map.repeat.y,1);assert.equal(map.offset.x,.25);assert.equal(map.colorSpace,T.SRGBColorSpace);assert.equal(materials.materials.floor.color.getHexString(),'ffffff');
 assert.equal(materials.materials.sageFloor.map.repeat.x,1);assert.equal(materials.materials.sageFloor.map.repeat.y,1,'60x120 sample retains the native2:1 grain');
 materials.dispose();assert(materials.diagnostics().disposed);
});

test('a disposed hall aborts downloads and rejects every late texture without waking the renderer',async()=>{
 const pending=[];let wakes=0,lateDisposals=0;
 const layer=createShowroomMaterials({onReady:()=>wakes++,loadTexture:(url,options)=>new Promise(resolve=>pending.push({url,options,resolve}))});
 const task=layer.prepareNear(new T.Vector3());assert.equal(pending.length,4);layer.materials.floor.dispose();
 assert(pending.every(entry=>entry.options.signal.aborted));
 for(const entry of pending){const map=new T.Texture();map.addEventListener('dispose',()=>lateDisposals++);entry.resolve(map);}
 assert.equal(await task,false);assert.equal(lateDisposals,4);assert.equal(wakes,0);assert.equal(layer.materials.floor.map,null);assert.equal(layer.diagnostics().textures,0);
});

test('metre-based floor and wall UVs preserve the advertised tile size before static batching',()=>{
 const geometry=new T.PlaneGeometry(2.4,1.2);applyShowroomSurfaceUV(geometry,{plane:'wall',width:1.2,height:.6});
 const uv=geometry.attributes.uv;assert.equal(Math.abs(uv.getX(1)-uv.getX(0)),2);assert.equal(Math.abs(uv.getY(2)-uv.getY(0)),2);
 const floor=new T.PlaneGeometry(2.4,1.2);floor.rotateX(-Math.PI/2);applyShowroomSurfaceUV(floor,{plane:'floor',width:1.2,height:.6});
 assert.equal(Math.abs(floor.attributes.uv.getX(1)-floor.attributes.uv.getX(0)),2);assert.equal(Math.abs(floor.attributes.uv.getY(2)-floor.attributes.uv.getY(0)),2);
 geometry.dispose();floor.dispose();
});
