import assert from 'node:assert/strict';
import * as T from 'three';
import {resolveSurfaceTexture,finishForSurface} from '../src/surface-texture-selection.js';
import {COLLECTIONS} from '../src/surface-catalog.js';
import {commercialProduct} from '../src/surface-commerce.js';
import {applyTileColors} from '../src/tile-colors.js';
import {makeRoom} from '../src/room.js';

const tiers=reference=>Object.fromEntries(['fluid','balanced','max'].map(quality=>[quality,Array.from({length:6},(_,i)=>`https://example.test/elios/${reference}/${quality}/face-${i}.webp`)]));
const collections={Test:{brand:'ELIOS',formats:[{id:'60x120',width:1.2,height:.6},{id:'60x60',width:.6,height:.6}],colors:[{id:'avena',file:'legacy-avena.webp',faces:['legacy-avena.webp'],textureVariantsByReference:{RECT:{verified:true,format:'60x120',textureVariants:tiers('RECT'),textureRotation:0},RECT2:{verified:true,format:'60x120',textureVariants:tiers('RECT2'),textureRotation:90},SQUARE:{verified:false,format:'60x60',textureVariants:tiers('SQUARE')}}}]}},
 products=[{brand:'ELIOS',colorId:'avena',reference:'RECT',key:'ELIOS|RECT',format:'60x120'},{brand:'ELIOS',colorId:'avena',reference:'RECT2',key:'ELIOS|RECT2',format:'60x120'},{brand:'ELIOS',colorId:'avena',reference:'SQUARE',key:'ELIOS|SQUARE',format:'60x60'}],
 context={collections,productFor:finish=>{const options=products.filter(p=>p.format===finish.format&&p.colorId===finish.color);return options.find(p=>p.key===finish.catalogueKey)||options[0];}},finish={format:'60x120',catalogueKey:'ELIOS|RECT'};
const rectangle=resolveSurfaceTexture('Test','avena','balanced',finish,context),square=resolveSurfaceTexture('Test','avena','balanced',{format:'60x60',catalogueKey:'ELIOS|RECT'},context);
assert.equal(rectangle.mapped,true);assert.deepEqual(rectangle.files,tiers('RECT').balanced);assert.equal(square.mapped,false);assert.deepEqual(square.files,['legacy-avena.webp']);assert.notEqual(square.sourceKey,rectangle.sourceKey,'Rectangle and square coexist without sharing their new reference-specific faces.');
for(const profile of ['fluid','balanced','max']){const selection=resolveSurfaceTexture('Test','avena',profile,finish,context);assert.deepEqual(selection.files,selection.faceIndices.map(index=>tiers('RECT')[profile][index]));assert.equal(selection.files.length,profile==='fluid'?4:6);assert.equal(selection.sourceKey,rectangle.sourceKey);assert.ok(selection.cacheKey.includes('|'+profile));}
const otherFinish=resolveSurfaceTexture('Test','avena','balanced',{...finish,catalogueKey:'ELIOS|RECT2'},context);assert.equal(otherFinish.rotation,90);assert.notEqual(otherFinish.sourceKey,rectangle.sourceKey);assert.deepEqual(otherFinish.files,tiers('RECT2').balanced);
const corrected=finishForSurface('Test','avena',{width:.6,height:.6},finish,collections);assert.equal(corrected.format,'60x60');assert.equal(resolveSurfaceTexture('Test','avena','max',corrected,context).mapped,false,'Restored geometry wins over an old format/catalogueKey.');
const unknownSize=finishForSurface('Test','avena',{width:.9,height:.9},finish,collections);assert.equal(unknownSize.format,'');assert.equal(resolveSurfaceTexture('Test','avena','balanced',unknownSize,context).mapped,false);
const opus=finishForSurface('Test','avena',{width:1.2,height:.6,pattern:'opus'},finish,collections);assert.equal(resolveSurfaceTexture('Test','avena','balanced',opus,context).mapped,false,'A multiformat opus cannot stretch one rectangular HD reference over its square components.');
collections.Test.colors[0].textureVariantsByReference.RECT.textureVariants.fluid=tiers('RECT').fluid.slice(0,3);for(const profile of ['fluid','balanced','max'])assert.equal(resolveSurfaceTexture('Test','avena',profile,finish,context).files.length,3,'All profiles use the same face index range.');
delete collections.Test.colors[0].textureVariantsByReference.RECT.textureVariants.max;
assert.deepEqual(resolveSurfaceTexture('Test','avena','max',finish,context).files,[],'Missing official HD cannot use the legacy or working image as an HD substitute.');
collections.Test.colors[0].textureVariantsByReference.RECT.format='30x60';assert.equal(resolveSurfaceTexture('Test','avena','balanced',finish,context).mapped,false,'A reference mapping for a different format stays inactive.');
collections.Test.colors[0].textureVariantsByReference.RECT.format='60x120';collections.Test.brand='VIEW';assert.equal(resolveSurfaceTexture('Test','avena','balanced',finish,context).mapped,false);assert.deepEqual(resolveSurfaceTexture('Test','avena','balanced',finish,context).files,['legacy-avena.webp']);

// Exercise actual tile grouping with a real catalogue reference: multiface HD
// must work even when the previous colour only supplied one face.
const color=COLLECTIONS.Creta.colors.find(c=>c.id==='avena'),prior={faces:color.faces,mapping:color.textureVariantsByReference};
const realFinish={collection:'Creta',color:'avena',format:'60x120'},realReference=commercialProduct(realFinish)?.reference;assert.equal(realReference,'03V6A10');
color.faces=['legacy-avena.webp'];color.textureVariantsByReference={[realReference]:{verified:true,format:'60x120',textureVariants:tiers(realReference)}};
const room=makeRoom({points:[[0,0],[600,0],[600,450],[0,450]],height:260},0),surface=room.floor;
try{
 const used=[];surface.setLayout({...surface.layout,width:1.2,height:.6});applyTileColors(surface,realFinish,(_,variant)=>{used.push(variant);return new T.MeshPhysicalMaterial();});assert.ok(used.some(variant=>variant>0));assert.ok(Math.max(...used)<6);
 used.length=0;surface.setLayout({...surface.layout,width:.6,height:.6});applyTileColors(surface,{...realFinish,format:'60x60'},(_,variant)=>{used.push(variant);return new T.MeshPhysicalMaterial();});assert.ok(used.every(variant=>variant===0),'Switching to square never groups the rectangular HD faces into its tiles.');
}finally{color.faces=prior.faces;if(prior.mapping===undefined)delete color.textureVariantsByReference;else color.textureVariantsByReference=prior.mapping;room.dispose();}
console.log('Exact reference/format HD selection, independent profile/cache keys, square fallback, legacy manufacturers and real multiface tile grouping: PASS');
