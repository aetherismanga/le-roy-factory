import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveSurfaceTexture} from '../shared/lrf-3d/surface-texture-selection.js';
import {COLLECTIONS} from '../shared/lrf-3d/surface-catalog.js';
import {surfaceFaceLimit} from '../shared/lrf-3d/texture-budget.js';
import {runTextureTask,textureQueueState} from '../shared/lrf-3d/texture-queue.mjs';
import {loadQueuedTexture} from '../shared/lrf-3d/texture-loader.js';
const catalogue=JSON.parse(readFileSync(new URL('../shared/lrf-3d/manufacturer-surfaces.json',import.meta.url)));
const quercia=catalogue.find(item=>item.name==='Quercia');

test('all exact Quercia identities use a bounded subset of existing working derivatives and complete HD',()=>{
 for(const color of quercia.colors)for(const [reference,definition]of Object.entries(color.textureVariantsByReference)){
  const finish={format:definition.format,catalogueKey:'ELIOS|'+reference};
  for(const [profile,budget]of Object.entries({fluid:4,balanced:6,max:8})){
   const selection=resolveSurfaceTexture('Quercia',color.id,profile,finish,{mobile:true});
   assert(selection.mapped);assert.equal(selection.reference,reference);assert.equal(selection.files.length,budget);
   assert.equal(selection.nativeFaceCount,definition.nativeFaceCount);assert.equal(selection.faceIndices[0],0);
   assert.deepEqual(selection.files,selection.faceIndices.map(index=>definition.textureVariants[profile][index]));
   assert.equal(new Set(selection.files).size,budget);
  }
  const working=resolveSurfaceTexture('Quercia',color.id,'max',finish,{mobile:true}),capture=resolveSurfaceTexture('Quercia',color.id,'max',finish,{mobile:true,export:true});
  assert.equal(capture.files.length,definition.nativeFaceCount);assert.deepEqual(capture.files,definition.textureVariants.max);
  assert.notEqual(working.cacheKey,capture.cacheKey);assert.equal(working.sourceKey,capture.sourceKey);
 }
 assert.equal(surfaceFaceLimit('max',{mobile:true}),8);assert.equal(surfaceFaceLimit('max',{mobile:true,export:true}),40);
 assert.deepEqual(resolveSurfaceTexture('Quercia','not-a-colour','balanced',{format:'24x120'}).files,[]);
 for(const name of ['Corso','Creta']){const color=COLLECTIONS[name]?.colors[0];if(color&&!color.textureVariantsByReference)assert.deepEqual(resolveSurfaceTexture(name,color.id,'fluid').files,color.textureVariants?.fluid||color.faces);}
});

test('a superseded waiting colour is removed before its image task ever starts',async()=>{
 let release;const held=new Promise(resolve=>release=resolve),blockers=Array.from({length:3},()=>runTextureTask(()=>held));
 const controller=new AbortController();let started=0;
 const abandoned=Array.from({length:40},()=>runTextureTask(()=>{started++;},{signal:controller.signal}));
 const abandonedResults=Promise.allSettled(abandoned);assert.equal(textureQueueState().pending,40);
 controller.abort();assert.equal(textureQueueState().pending,0);assert.equal(started,0);
 release();await Promise.all(blockers);
 assert((await abandonedResults).every(result=>result.status==='rejected'&&result.reason.name==='AbortError'));
 assert.equal(textureQueueState().active,0);
});

test('loader timeout aborts the real in-flight request and frees its slot',async()=>{
 const original=globalThis.fetch;let aborted=0;
 globalThis.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted++;reject(signal.reason);},{once:true}));
 try{await assert.rejects(loadQueuedTexture('https://fixture.invalid/stalled.webp',{timeout:10}),error=>error.name==='TimeoutError');assert.equal(aborted,1);assert.equal(textureQueueState().active,0);assert.equal(textureQueueState().pending,0);}
 finally{globalThis.fetch=original;}
});

test('loader forwards supersession to a running request without waiting for timeout',async()=>{
 const original=globalThis.fetch,controller=new AbortController();let begun;const started=new Promise(resolve=>begun=resolve);let aborted=0;
 globalThis.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>{begun();signal.addEventListener('abort',()=>{aborted++;reject(signal.reason);},{once:true});});
 try{const loaded=loadQueuedTexture('https://fixture.invalid/old-choice.webp',{signal:controller.signal});const result=assert.rejects(loaded,error=>error.name==='AbortError');await started;controller.abort();await result;assert.equal(aborted,1);assert.equal(textureQueueState().active,0);}
 finally{globalThis.fetch=original;}
});
