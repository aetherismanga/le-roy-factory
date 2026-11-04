import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {resolveSurfaceTexture} from '../shared/lrf-3d/surface-texture-selection.js';
import {COLLECTIONS,formatsForColor} from '../shared/lrf-3d/surface-catalog.js';
import {availableColors} from '../shared/lrf-3d/surface-picker.js';
import {surfaceColorIssue} from '../shared/lrf-3d/surface-quality.js';
import {canonicalSurfaceIdentity} from '../shared/lrf-3d/surface-identity.mjs';
import commercial from '../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};
const root=new URL('../',import.meta.url),rows=collection=>commercial.products.filter(p=>p.collection===collection),provenance=JSON.parse(readFileSync(new URL('assets/img/lrf-plan-pose/faces/elios-20261104/decor-source-provenance.json',root)));
const local=url=>new URL(new URL(url).pathname.slice(1),root);
function webpSize(url){
 const b=readFileSync(local(url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
 for(let p=12;p+8<b.length;){const kind=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4),at=p+8;if(kind==='VP8X')return [b.readUIntLE(at+4,3)+1,b.readUIntLE(at+7,3)+1];if(kind==='VP8 '){assert.equal(b.toString('hex',at+3,at+6),'9d012a');return [b.readUInt16LE(at+6)&0x3fff,b.readUInt16LE(at+8)&0x3fff];}if(kind==='VP8L'){assert.equal(b[at],0x2f);const bits=b.readUInt32LE(at+1);return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];}p=at+n+(n%2);}throw Error('Native WebP dimensions unavailable');
}

test('Deco has17 exact individually selectable manufacturer decor references, not a generic montage',()=>{
 const expected=['089D4A1','089D4B1','089D4C1','089D2A1','089D2B1','089D2C1','089D3B1','089D3B2','089D3C1','089D3C4','089D3D1','089D3D3','089D1A2','089D1A1','089D1B2','089D1B1','089D1C1'];
 for(const reference of expected){const products=rows('Deco').filter(p=>p.reference===reference);assert.equal(products.length,1);const p=products[0],color=COLLECTIONS.Deco.colors.find(c=>c.id===p.colorId);assert(color?.available3d);assert.equal(p.format,'20x20');assert.equal(p.packPieces,30);assert.equal(p.packArea,1.2);assert.equal(color.faces.length,1);assert.equal(color.nativeFaces,false);assert.equal(color.definitionLimited,true);assert.deepEqual(webpSize(p.preview),[250,250]);}
});

test('D_esign Evo exposes16 source subjects and three true multi-face stock mixes',()=>{
 const expected=['079D50E','079D50F','079D50G','079D50B','079D50A','079D50C','079D50D','079D50Z','079D60X','079D60D','079D60Z','079D60B','079D54A','079D54B','079D57A','079D57B','079D500','079D540','079D570'];
 for(const reference of expected){const products=rows('D_esign Evo').filter(p=>p.reference===reference);assert.equal(products.length,1);const p=products[0],color=COLLECTIONS['D_esign Evo'].colors.find(c=>c.id===p.colorId);assert(color?.available3d);assert.equal(p.format,'20x20');assert.equal(p.packArea,1.2);assert.equal(p.packPieces,30);assert.equal(color.nativeFaces,false);assert.equal(color.definitionLimited,true);assert.equal(color.faces.length,reference==='079D500'?14:['079D540','079D570'].includes(reference)?16:1);for(const file of color.faces)assert(Math.max(...webpSize(file))<=250,'a tile never includes the whole printed montage');}
 for(const id of ['bianco','grigio','brown','burro','ciano','tortora','antracite','verde-inglese','terra-di-siena']){assert.deepEqual(formatsForColor('D_esign Evo',id).map(f=>f.id),['20x20']);assert(COLLECTIONS['D_esign Evo'].colors.find(c=>c.id===id).available3d);}
});

test('all local derivatives retain native pixel dimensions and disclose source crops without artificial enlargement',()=>{
 assert(provenance.assets.length>=88);
 for(const a of provenance.assets){assert.match(a.source,/^https:\/\/eliosceramica\.com\/wp-content\/uploads\//);assert.equal(a.generated,false);assert.equal(a.upscaled,false);assert.match(a.sourceSha256,/^[a-f0-9]{64}$/);if(a.crop){const [x,y,r,b]=a.crop;assert(x>=0&&y>=0&&r<=a.sourceSize[0]&&b<=a.sourceSize[1]);assert.deepEqual(a.nativeSize,[r-x,b-y]);}
  for(const [profile,url] of Object.entries(a.variants)){const actual=webpSize(url);assert(actual.every((v,i)=>v<=a.nativeSize[i]),'no source pixel dimensions can be enlarged');if(profile==='max')assert.deepEqual(actual,a.nativeSize);}
 }
});

test('Azuli Mood and Glow use the exact selected stock format with honest swatch-crop provenance',()=>{
 let checked=0;
 for(const name of ['Azuli Mood','Glow'])for(const p of rows(name).filter(p=>p.reference&&p.colorId!=='washington')){
  const color=COLLECTIONS[name].colors.find(c=>c.id===p.colorId),candidate=color.textureVariantsByReference[p.reference];assert(candidate.verified);assert.equal(candidate.format,p.format);assert.equal(candidate.colorId,p.colorId);assert.equal(candidate.nativeFaces,false);assert.equal(candidate.textureProvenance.originalManufacturerTileStamp,false);assert.equal(candidate.textureProvenance.kind,'manufacturer-swatch-crop');
  const size=webpSize(candidate.textureVariants.max[0]),dims=p.format.split('x').map(Number),aspect=Math.max(...dims)/Math.min(...dims);assert(Math.abs(size[0]/size[1]-aspect)<.03,'the material is not squeezed from a broad preview into another tile ratio');
  assert.equal(p.preview,candidate.textureVariants.max[0]);assert.equal(p.nativeFaces,false);assert.equal(p.definitionLimited,true);for(const profile of ['fluid','balanced','max']){const selected=resolveSurfaceTexture(name,p.colorId,profile,{collection:name,color:p.colorId,format:p.format,catalogueKey:p.key,reference:p.reference});assert.equal(selected.mapped,true);assert.deepEqual(selected.files,candidate.textureVariants[profile]);}checked++;
 }
 assert.equal(checked,31);
});

test('reviewed native decor references stay selectable and exportable while unreviewed or blank faces do not',()=>{
 for(const name of ['Deco','D_esign Evo'])for(const p of rows(name).filter(p=>p.textureProvenance?.referenceAssignmentVerified)){
  const color=COLLECTIONS[name].colors.find(c=>c.id===p.colorId);assert(availableColors(name).some(c=>c.id===p.colorId));assert.equal(surfaceColorIssue(name,color),null);
  const identity=canonicalSurfaceIdentity({collection:name,color:p.colorId,format:p.format,catalogueKey:p.key,reference:p.reference},{products:commercial.products,usage:'wall'});assert.equal(identity.reference,p.reference);assert.equal(identity.color,p.colorId);assert.equal(identity.fidelity,'catalogue-preview');
  assert.equal(surfaceColorIssue(name,{...color,previewReviewed:false}),'insufficient-source-definition');assert.equal(surfaceColorIssue(name,{...color,textureProvenance:{...color.textureProvenance,upscaled:true}}),'insufficient-source-definition');
 }
 assert(!availableColors('Glow').some(c=>c.id==='washington'));
 assert.throws(()=>canonicalSurfaceIdentity({collection:'Glow',color:'washington',format:'4.8x45'},{usage:'wall'}),/n’est pas validé/);
});
