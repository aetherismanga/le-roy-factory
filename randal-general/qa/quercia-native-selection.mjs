import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLLECTIONS} from '../src/surface-catalog.js';
import {commercialProduct,commercialOptions} from '../src/surface-commerce.js';
import {resolveSurfaceTexture,finishForSurface} from '../src/surface-texture-selection.js';

const mapping=JSON.parse(readFileSync(new URL('../../reports/elios-hd/reference-mapping.json',import.meta.url))).querciaVerified;
const required=process.argv.includes('--require-active'),actual=Object.values(COLLECTIONS.Quercia.colors).flatMap(c=>Object.keys(c.textureVariantsByReference||{}));
assert.equal(Object.keys(mapping).length,8);
if(required)assert.equal(actual.length,8,'Publication must supply exactly eight native Quercia references.');
const fixture=actual.length===0,collections=fixture?structuredClone(COLLECTIONS):COLLECTIONS;
if(fixture)for(const [reference,item]of Object.entries(mapping)){
 const color=collections.Quercia.colors.find(c=>c.id===item.colorId);color.textureVariantsByReference??={};
 color.textureVariantsByReference[reference]={verified:true,reference,colorId:item.colorId,format:item.sourceFormat,textureRotation:0,textureVariants:Object.fromEntries(['fluid','balanced','max'].map(t=>[t,item.portalFaces.map((_,i)=>`https://example.test/quercia/${reference}/${t}/face-${i}.webp`)]))};
}
const context={collections},native=[];
for(const [reference,item]of Object.entries(mapping)){
 const finish={collection:'Quercia',color:item.colorId,format:item.sourceFormat},options=commercialOptions(finish),base=commercialProduct(finish),exact=commercialProduct({...finish,catalogueKey:'ELIOS|'+reference});
 assert.equal(base.reference,reference,'The default Quercia finish must be the exact R10 B reference.');assert.equal(exact.reference,reference);assert.match(exact.finish,/R10/);assert.ok(!/R11|rectifi/i.test(exact.finish));
 for(const profile of ['fluid','balanced','max']){const selected=resolveSurfaceTexture('Quercia',item.colorId,profile,{...finish,catalogueKey:exact.key},context);assert.equal(selected.mapped,true);assert.equal(selected.reference,reference);assert.equal(selected.format,item.sourceFormat);assert.equal(selected.rotation,0);assert.equal(selected.files.length,item.portalFaces.length);native.push(profile+'|'+reference);}
 const physical=finishForSurface('Quercia',item.colorId,{width:item.engineFormatMetres.width,height:item.engineFormatMetres.height},{...finish,catalogueKey:exact.key},collections);assert.equal(physical.format,item.sourceFormat);
 for(const outdoor of options.filter(p=>/R11/.test(p.finish))){const chosen=commercialProduct({...finish,catalogueKey:outdoor.key});assert.equal(chosen.reference,outdoor.reference);assert.match(chosen.finish,/R11/);assert.equal(resolveSurfaceTexture('Quercia',item.colorId,'max',{...finish,catalogueKey:outdoor.key},context).mapped,false,'R11 must not silently borrow an R10 B face.');}
 for(const format of ['23.4x119.5','40x120'])assert.equal(resolveSurfaceTexture('Quercia',item.colorId,'max',{format},context).mapped,false);
}
assert.equal(native.length,24);
if(!fixture){
 const catalogue=JSON.parse(readFileSync(new URL('../../assets/js/lrf-plan-pose/catalogue.json',import.meta.url))),quercia=catalogue.products.filter(p=>p.brand==='ELIOS'&&p.collection==='Quercia'),expected=new Set(Object.keys(mapping));
 assert.equal(quercia.filter(p=>p.textureVariants).length,8);
 for(const product of quercia){const item=mapping[product.reference];if(!expected.has(product.reference)){assert.equal(product.textureVariants,undefined);continue;}assert.equal(product.colorId,item.colorId);assert.equal(product.format,item.sourceFormat);assert.equal(product.textureReference,product.reference);assert.equal(product.nativeFaces,true);assert.equal(product.textureRotation,0);for(const tier of ['fluid','balanced','max'])assert.equal(product.textureVariants[tier].length,item.portalFaces.length);}
}
console.log(JSON.stringify({passed:true,fixture,collection:'Quercia',colors:4,references:8,formats:2,nativeFaces:118,checks:'Exact R10 B SKU, R11/rectified/40x120 isolation, geometry format, all tiers and LRF native product exports'}));
