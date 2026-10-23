import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLLECTIONS} from '../src/surface-catalog.js';
import {commercialProduct} from '../src/surface-commerce.js';
import {resolveSurfaceTexture,finishForSurface} from '../src/surface-texture-selection.js';

const mapping=JSON.parse(readFileSync(new URL('../../reports/elios-hd/mysterium-reference-mapping.json',import.meta.url))).mysteriumVerified;
const required=process.argv.includes('--require-active'),actual=COLLECTIONS.Mysterium.colors.flatMap(c=>Object.keys(c.textureVariantsByReference||{}));
assert.equal(Object.keys(mapping).length,6);
if(required)assert.equal(actual.length,6,'Publication must supply exactly six native slab references.');
const fixture=actual.length===0,collections=fixture?structuredClone(COLLECTIONS):COLLECTIONS;
if(fixture)for(const [reference,item]of Object.entries(mapping)){
 const color=collections.Mysterium.colors.find(c=>c.id===item.colorId);color.textureVariantsByReference??={};
 color.textureVariantsByReference[reference]={verified:true,reference,colorId:item.colorId,format:item.sourceFormat,textureRotation:0,textureVariants:Object.fromEntries(['fluid','balanced','max'].map(t=>[t,item.portalFaces.map((_,i)=>`https://example.test/mysterium/${reference}/${t}/face-${i}.webp`)]))};
}
const context={collections},selectedRefs=[];
for(const [reference,item]of Object.entries(mapping)){
 const finish={collection:'Mysterium',color:item.colorId,format:'120x278',catalogueKey:'ELIOS|'+reference},exact=commercialProduct(finish);
 assert.equal(exact.reference,reference);assert.match(exact.finish,/Poli/);assert.match(exact.finish,/6,5 mm/);
 for(const profile of ['fluid','balanced','max']){const selected=resolveSurfaceTexture('Mysterium',item.colorId,profile,finish,context);assert.equal(selected.mapped,true);assert.equal(selected.reference,reference);assert.equal(selected.format,'120x278');assert.equal(selected.rotation,0);assert.equal(selected.files.length,4);selectedRefs.push(profile+'|'+reference);}
 const physical=finishForSurface('Mysterium',item.colorId,{width:2.78,height:1.2},finish,collections);assert.equal(physical.format,'120x278');
 const smallRef='03U6A'+reference.slice(-2),small={...finish,format:'60x120',catalogueKey:'ELIOS|'+smallRef},smallProduct=commercialProduct(small);
 assert.equal(smallProduct.reference,smallRef);assert.match(smallProduct.finish,/8,5 mm/);assert.equal(resolveSurfaceTexture('Mysterium',item.colorId,'max',small,context).mapped,false,'60x120 must not silently borrow a 120x278 slab.');
 assert.equal(resolveSurfaceTexture('Mysterium',item.colorId,'max',{...finish,format:'60x60'},context).mapped,false);
}
assert.equal(selectedRefs.length,18);
if(!fixture){
 const catalogue=JSON.parse(readFileSync(new URL('../../assets/js/lrf-plan-pose/catalogue.json',import.meta.url))),products=catalogue.products.filter(p=>p.brand==='ELIOS'&&p.collection==='Mysterium'),expected=new Set(Object.keys(mapping));
 assert.equal(products.filter(p=>p.textureVariants).length,6);
 for(const product of products){if(!expected.has(product.reference)){assert.equal(product.textureVariants,undefined);continue;}const item=mapping[product.reference];assert.equal(product.colorId,item.colorId);assert.equal(product.format,'120x278');assert.equal(product.textureReference,product.reference);assert.equal(product.nativeFaces,true);assert.equal(product.textureRotation,0);for(const tier of ['fluid','balanced','max'])assert.equal(product.textureVariants[tier].length,4);}
}
console.log(JSON.stringify({passed:true,fixture,collection:'Mysterium',colors:6,references:6,formats:1,nativeFaces:24,checks:'Exact polished 6.5mm slab SKU, independent 60x120 references, real geometry, all tiers and LRF native product exports'}));
