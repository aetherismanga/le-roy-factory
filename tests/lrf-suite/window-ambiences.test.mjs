import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Texture,SRGBColorSpace} from 'three';
import {WINDOW_AMBIENCES,windowAmbience,windowAmbienceURL,createWindowAmbienceLoader} from '../../shared/lrf-3d/window-ambiences.js';

const root=new URL('../../shared/lrf-3d/media/window-ambiences/',import.meta.url);
test('four distinct native views accompany the original garden and have exact lossless runtime assets',()=>{
 assert.equal(WINDOW_AMBIENCES.length,5);assert.equal(new Set(WINDOW_AMBIENCES.map(a=>a.id)).size,5);
 assert.equal(windowAmbience().id,'mediterranean');assert.equal(windowAmbience('unlisted'),null);assert.throws(()=>windowAmbienceURL('https://example.com/private'),/inconnue/);
 const hashes=new Set();
 for(const a of WINDOW_AMBIENCES.slice(1)){
  const original=readFileSync(new URL(a.id+'.png',root)),runtime=readFileSync(new URL(a.id+'.webp',root));
  assert.equal(original.readUInt32BE(16),1536);assert.equal(original.readUInt32BE(20),1024);
  assert.equal(runtime.toString('ascii',8,12),'WEBP');assert.equal(runtime.toString('ascii',12,16),'VP8L','Lossless WebP bitstream');
  assert.equal(runtime[20],0x2f);const bits=runtime.readUInt32LE(21);assert.equal((bits&0x3fff)+1,1536);assert.equal(((bits>>>14)&0x3fff)+1,1024);
  assert.equal(windowAmbienceURL(a.id),'assets/exterior/'+a.id+'.webp');hashes.add(createHash('sha256').update(runtime).digest('hex'));
 }
 assert.equal(hashes.size,4,'Every choice has its own genuine image');
 const provenance=JSON.parse(readFileSync(new URL('provenance.json',root)));assert.match(provenance.runtimeEncoding.pixelParity,/RGBA MD5/);
});

test('views load on demand, share one decoded texture, and reject arbitrary URLs',async()=>{
 const loads=[],registered=[],ready=[],loader=createWindowAmbienceLoader({loadTexture:async url=>{loads.push(url);return new Texture({width:1536,height:1024});},registerTexture:(texture,id)=>registered.push({texture,id}),onReady:(texture,id)=>ready.push(id),maxAnisotropy:16});
 assert.deepEqual(loads,[]);const [a,b]=await Promise.all([loader.load('coast'),loader.load('coast')]);assert.equal(a,b);assert.equal(loads.length,1);assert.equal(a.colorSpace,SRGBColorSpace);assert.equal(a.anisotropy,8);
 await loader.ensureItems([{type:'window',settings:{exteriorAmbience:'coast'}},{type:'window',settings:{exteriorAmbience:'mountains'}},{type:'cabinet',settings:{exteriorAmbience:'forest-lake'}}]);
 assert.equal(loads.length,2);assert.deepEqual(ready,['coast','mountains']);assert.equal(registered.length,2);assert.equal(loader.isReady('forest-lake'),false);
 await assert.rejects(loader.load('https://example.com/private'),/inconnue/);assert.equal(loads.length,2);
});

test('a missing exterior fails an HD preparation and can be retried without a silent substitute',async()=>{
 let attempts=0;const registry=[],loader=createWindowAmbienceLoader({loadTexture:async()=>{if(++attempts===1)throw Error('image unavailable');return new Texture({width:1536,height:1024});},registerTexture:(_,id)=>registry.push(id)}),items=[{type:'window',settings:{exteriorAmbience:'forest-lake'}}];
 await assert.rejects(loader.ensureItems(items),/unavailable/);assert.equal(loader.isReady('forest-lake'),false);assert.deepEqual(registry,[]);
 await loader.ensureItems(items);assert.equal(attempts,2);assert.equal(loader.isReady('forest-lake'),true);assert.deepEqual(registry,['forest-lake']);
});
