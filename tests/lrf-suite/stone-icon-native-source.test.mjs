import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {COLLECTIONS} from '../../shared/lrf-3d/surface-catalog.js';
import {resolveSurfaceTexture} from '../../shared/lrf-3d/surface-texture-selection.js';
import {canonicalSurfaceIdentity} from '../../shared/lrf-3d/surface-identity.mjs';
const commercial=JSON.parse(readFileSync(new URL('../../shared/lrf-3d/commercial-surfaces.json',import.meta.url)));
const plan=JSON.parse(readFileSync(new URL('../../assets/js/lrf-plan-pose/catalogue.json',import.meta.url)));

for(const [color,reference]of [['francese','04S6902'],['leccese','04S6903']])test(`${reference}: four native product photos stay confined to the exact 60x90 SKU`,()=>{
 const choice=COLLECTIONS['Stone Icon'].colors.find(value=>value.id===color),mapping=choice.textureVariantsByReference[reference],product=commercial.products.find(value=>value.reference===reference);
 assert.equal(product.format,'60x90');assert.equal(product.colorId,color);assert.match(product.finish,/Tumbled/);
 assert.equal(mapping.textureRotation,90);assert.equal(mapping.textureProvenance.generated,false);assert.equal(mapping.textureProvenance.resizedByAgent,false);assert.equal(mapping.textureProvenance.hd,false);
 const hashes=new Set();
 for(const face of mapping.textureProvenance.faces){
  const file=new URL('../../'+new URL(face.file).pathname.slice(1),import.meta.url),bytes=readFileSync(file),hash=createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash,face.sha256);hashes.add(hash);assert.deepEqual([face.width,face.height],[667,1000]);assert.equal(bytes.readUInt16BE(0),0xffd8);
 }
 assert.equal(hashes.size,4);
 const finish={format:'60x90',reference,catalogueKey:product.key};
 for(const profile of ['fluid','balanced','max']){const resolved=resolveSurfaceTexture('Stone Icon',color,profile,finish);assert.equal(resolved.mapped,true);assert.equal(resolved.rotation,90);assert.deepEqual(resolved.files,mapping.textureVariants.max);}
 const other=commercial.products.find(value=>value.collection==='Stone Icon'&&value.colorId===color&&value.reference!==reference),fallback=resolveSurfaceTexture('Stone Icon',color,'max',{format:other.format,reference:other.reference,catalogueKey:other.key});
 assert.equal(fallback.mapped,false,'Other finishes and formats keep their own reviewed colour source');assert.deepEqual(fallback.files,choice.faces);
 assert.equal(canonicalSurfaceIdentity({collection:'Stone Icon',color,format:'60x90',reference}).fidelity,'product-platform-image');
 assert.equal(canonicalSurfaceIdentity({collection:'Stone Icon',color,format:'60x120',reference}).fidelity,'catalogue-preview','A mismatched size cannot claim verified product imagery');
 const transferred=plan.products.find(value=>value.reference===reference);assert.deepEqual(transferred.textureVariants.max,mapping.textureVariants.max);assert.deepEqual(transferred.textureResolution,[667,1000]);assert.equal(transferred.textureSourceKind,'product-platform-image');assert.equal(transferred.nativeFaces,false);
});
