import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLLECTIONS} from '../src/surface-catalog.js';
import {commercialProduct,commercialOptions} from '../src/surface-commerce.js';
import {resolveSurfaceTexture,finishForSurface} from '../src/surface-texture-selection.js';

const mapping=Object.fromEntries(Object.entries(JSON.parse(readFileSync(new URL('../../reports/elios-hd/reference-mapping.json',import.meta.url))).cretaVerified).filter(([,v])=>v.nativeTextureAssignmentAllowed&&v.kind==='base'));
const required=process.argv.includes('--require-active'),actual=COLLECTIONS.Creta.colors.flatMap(c=>Object.keys(c.textureVariantsByReference||{}));
assert.equal(Object.keys(mapping).length,8);
if(required)assert.equal(actual.length,8,'Publication must supply exactly eight native base Creta references.');
const fixture=actual.length===0,collections=fixture?structuredClone(COLLECTIONS):COLLECTIONS;
if(fixture)for(const [reference,item]of Object.entries(mapping)){
 const color=collections.Creta.colors.find(c=>c.id===item.colorId);color.textureVariantsByReference??={};
 color.textureVariantsByReference[reference]={verified:true,reference,colorId:item.colorId,format:item.sourceFormat,textureRotation:0,textureVariants:Object.fromEntries(['fluid','balanced','max'].map(t=>[t,item.portalFaces.map((_,i)=>`https://example.test/creta/${reference}/${t}/face-${i}.webp`)]))};
}
const context={collections},native=[];
for(const [reference,item]of Object.entries(mapping)){
 const finish={collection:'Creta',color:item.colorId,format:'60x120'},options=commercialOptions(finish),exact=commercialProduct({...finish,catalogueKey:'ELIOS|'+reference});
 assert.equal(exact.reference,reference);assert.match(exact.finish,/R9/);assert.ok(!/R10/.test(exact.finish));
 for(const profile of ['fluid','balanced','max']){const selected=resolveSurfaceTexture('Creta',item.colorId,profile,{...finish,catalogueKey:exact.key},context);assert.equal(selected.mapped,true);assert.equal(selected.reference,reference);assert.equal(selected.format,'60x120');assert.equal(selected.rotation,0);assert.equal(selected.nativeFaceCount,item.portalFaces.length);assert.equal(selected.files.length,Math.min(item.portalFaces.length,profile==='fluid'?4:profile==='balanced'?6:40));assert.deepEqual(selected.files,selected.faceIndices.map(index=>selected.choice.textureVariantsByReference[reference].textureVariants[profile][index]));native.push(profile+'|'+reference);}
 const physical=finishForSurface('Creta',item.colorId,{width:1.2,height:.6},{...finish,catalogueKey:exact.key},collections);assert.equal(physical.format,'60x120');
 for(const outdoor of options.filter(p=>/R10/.test(p.finish))){const chosen=commercialProduct({...finish,catalogueKey:outdoor.key});assert.equal(chosen.reference,outdoor.reference);assert.match(chosen.finish,/R10/);assert.equal(resolveSurfaceTexture('Creta',item.colorId,'max',{...finish,catalogueKey:outdoor.key},context).mapped,false,'R10 must not silently borrow an R9 face.');}
 for(const format of ['60x60','120x120','opus'])assert.equal(resolveSurfaceTexture('Creta',item.colorId,'max',{format},context).mapped,false,'Native rectangles must not map to square or Opus geometry.');
}
assert.equal(native.length,24);
assert.equal(Object.values(mapping).reduce((n,item)=>n+item.portalFaces.length,0),53);
assert.equal(resolveSurfaceTexture('Creta','coccio','max',{format:'60x120'},context).mapped,false,'Decor must remain distinct from base faces.');
if(!fixture){
 const catalogue=JSON.parse(readFileSync(new URL('../../assets/js/lrf-plan-pose/catalogue.json',import.meta.url))),creta=catalogue.products.filter(p=>p.brand==='ELIOS'&&p.collection==='Creta'),expected=new Set(Object.keys(mapping));
 assert.equal(creta.filter(p=>p.textureVariants).length,8);
 for(const product of creta){const item=mapping[product.reference];if(!expected.has(product.reference)){assert.equal(product.textureVariants,undefined);continue;}assert.equal(product.colorId,item.colorId);assert.equal(product.format,'60x120');assert.equal(product.textureReference,product.reference);assert.equal(product.nativeFaces,true);assert.equal(product.textureRotation,0);for(const tier of ['fluid','balanced','max'])assert.equal(product.textureVariants[tier].length,item.portalFaces.length);}
}
console.log(JSON.stringify({passed:true,fixture,collection:'Creta',colors:8,references:8,formats:1,nativeFaces:53,checks:'Exact R9 SKU, R10/square/Opus/decor isolation, landscape geometry, all tiers and LRF native product exports'}));
