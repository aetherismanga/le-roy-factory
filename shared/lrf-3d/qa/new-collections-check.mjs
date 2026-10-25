import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {COLLECTIONS,formatsForColor} from '../surface-catalog.js';
import {availableColors} from '../surface-picker.js';
import {canonicalSurfaceIdentity} from '../surface-identity.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const catalogue=JSON.parse(readFileSync(new URL('../commercial-surfaces.json',import.meta.url)));
const products=name=>catalogue.products.filter(p=>p.collection===name);
const product=reference=>{const matches=catalogue.products.filter(p=>p.reference===reference);assert.equal(matches.length,1,'One commercial product for '+reference);return matches[0];};
const privateKey=/^(?:purchase|publicPriceHT|unitPriceHT|totalPurchaseHT|proHT)/i;
function assertPublic(value){if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){assert(!privateKey.test(key),'No purchasing field in public collection: '+key);assertPublic(item);}}

// Read WebP container dimensions without an image/browser dependency. This
// checks the actual shipped pixels, not only a declaration in catalogue JSON.
function imageDimensions(file){
 const bytes=readFileSync(file);assert(bytes.length>20,'Nonempty WebP asset: '+file);assert.equal(bytes.toString('ascii',0,4),'RIFF','RIFF header: '+file);assert.equal(bytes.toString('ascii',8,12),'WEBP','WebP header: '+file);
 for(let offset=12;offset+8<=bytes.length;){const type=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4),at=offset+8;
  if(type==='VP8X')return [bytes.readUIntLE(at+4,3)+1,bytes.readUIntLE(at+7,3)+1];
  if(type==='VP8L'){assert.equal(bytes[at],0x2f);const bits=bytes.readUInt32LE(at+1);return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];}
  if(type==='VP8 '){assert.equal(bytes.toString('hex',at+3,at+6),'9d012a');return [bytes.readUInt16LE(at+6)&0x3fff,bytes.readUInt16LE(at+8)&0x3fff];}
  offset=at+length+(length%2);
 }
 throw Error('WebP dimensions missing: '+file);
}
const files=new Set();
function asset(url){
 const parsed=new URL(url);assert.equal(parsed.origin,'https://leroyfactory.fr');assert(parsed.pathname.startsWith('/assets/img/lrf-plan-pose/faces/elios-20261024/'));
 const relative=decodeURIComponent(parsed.pathname.slice(1)),file=resolve(root,relative);assert(file.startsWith(resolve(root,'assets')+sep));assert(!relative.includes('..'));assert(existsSync(file),'Published asset exists: '+relative);files.add(relative);return {file,size:imageDimensions(file)};
}
function identity(collection,color,format,reference){return canonicalSurfaceIdentity({collection,color,format,...(reference?{reference}: {})});}

for(const [name,count]of [['Stone Icon',3],['Terraforma',8],['Yosemite',4]]){assert(COLLECTIONS[name]);assert.equal(availableColors(name).length,count,name+' reviewed colours are selectable');}
const stone=COLLECTIONS['Stone Icon'],terra=COLLECTIONS.Terraforma,yosemite=COLLECTIONS.Yosemite;
assert.deepEqual(new Set(stone.colors.map(c=>c.id)),new Set(['campaspero','francese','leccese']));
assert.equal(products('Stone Icon').length,47);assert.equal(products('Terraforma').length,12);assert.equal(products('Yosemite').length,18);
assert.equal(catalogue.plinths.filter(p=>p.collection==='Stone Icon').length,6);assert.equal(catalogue.plinths.filter(p=>p.collection==='Yosemite').length,8);
for(const color of ['francese','leccese'])assert(!formatsForColor('Stone Icon',color).some(f=>f.id==='120x120'));
assert(formatsForColor('Stone Icon','campaspero').some(f=>f.id==='120x120'));
for(const [reference,format,finish,pieces,area]of [
 ['04S6031','60x60','R9',4,1.44],['04S6021','60x60','R10 B',4,1.44],['04S6001','60x60','Tumbled · R10 B',4,1.44],['04S6011','60x60','Tumbled Grip · R11 C',4,1.44],
 ['04S1131','120x120','R9',2,2.88],['04S1121','120x120','R10 B',2,2.88],['04S1211','100x100','Outdoor · R11 C',1,1],
 ['04S3301','30x30','Tumbled · R10 B',11,.99],['04S3601','30x60','Tumbled · R10 B',7,1.26],['04S6901','60x90','Tumbled · R10 B',2,1.08],
 ['04SH131','30x30','Mosaico · R9',6,.55]
]){const p=product(reference);assert.equal(p.format,format);assert(p.finish.startsWith(finish));assert.equal(p.packPieces,pieces);assert.equal(p.packArea,area);assert.equal(p.packVerified,true);assert.equal(p.priceTTC,null);}
assert.equal(product('04S1211').thicknessMm,20);
for(const color of stone.colors){
 assert.equal(color.faces.length,4);assert.equal(color.nativeFaces,false);assert.equal(color.definitionLimited,true);assert.equal(color.textureProvenance.kind,'manufacturer-catalogue-sample');assert.equal(color.textureProvenance.referenceAssignmentVerified,false);
 assert.equal(identity('Stone Icon',color.id,color.formats[0]).fidelity,'catalogue-preview');
 color.faces.forEach((url,index)=>{const {size}=asset(url),native=color.textureProvenance.faces[index];assert.deepEqual(size,[native.width,native.height],'Native PDF sample dimensions are preserved');assert(Math.max(...size)<=514);assert.equal(color.textureProvenance.generated,false);assert.equal(color.textureProvenance.hd,false);});
}

const terraBases=['limo','mattone','sabbia','siena'],terraDecors=['flora','marna','petra','duna'];
for(const [i,id]of terraBases.entries()){
 const c=terra.colors.find(c=>c.id===id);assert(c);assert.equal(c.faces.length,12);assert.equal(product('04T590'+(i+1)).format,'5x30');assert.equal(product('04T330'+(i+1)).colorId,id);
 assert.equal(product('04T590'+(i+1)).packPieces,34);assert.equal(product('04T590'+(i+1)).packArea,.51);assert.equal(product('04T330'+(i+1)).packPieces,11);assert.equal(product('04T330'+(i+1)).packArea,.99);
}
assert.match(terra.formats.find(f=>f.id==='5x30').note,/5,2/);
for(const [i,id]of terraDecors.entries()){
 const c=terra.colors.find(c=>c.id===id);assert(c);assert.deepEqual(c.formats,['30x30']);assert.equal(c.continuousDecor,true);assert.equal(c.textureRotation,0);assert.equal(product('04T33D'+(i+1)).colorId,id);
}
for(const c of terra.colors){assert.equal(identity('Terraforma',c.id,c.formats[0]).fidelity,'catalogue-preview');assert.equal(c.nativeFaces,false);assert.equal(c.textureProvenance.generated,false);assert.equal(c.textureProvenance.hd,false);c.faces.forEach((url,index)=>{const {size}=asset(url),native=c.textureProvenance.faces[index];assert.deepEqual(size,[native.width,native.height]);assert(Math.max(...size)<=(c.kind==='decor'?222:131),'No native sample is upscaled');});}

const dyn=COLLECTIONS.Dynasty,decorRefs=['04N3D01','04N3D02','04N3D03','04N3D04','04N3D05','04N3D06','04N3D07'];
for(const ref of decorRefs){const p=product(ref),color=dyn.colors.find(c=>c.id===p.colorId);assert(color);assert(availableColors('Dynasty').some(c=>c.id===color.id));assert.equal(p.format,'30x30');assert(p.finish.startsWith('3D Honed'));assert.equal(p.packPieces,11);assert.equal(p.packArea,.99);assert.deepEqual(color.decorRepeat,{columns:2,rows:2});assert.equal(color.continuousDecor,true);assert.equal(color.nativeFaces,false);assert(color.nativePerTileResolution.every(n=>n>=370&&n<=375));assert.equal(identity('Dynasty',color.id,'30x30',ref).fidelity,'catalogue-preview');const actual=asset(color.file).size;assert.deepEqual(actual,color.resolution);assert(actual.every(n=>n>=740&&n<=751));assert.deepEqual(color.nativePerTileResolution,actual.map(n=>Math.floor(n/2)));}

const yosemitePacks={'23.4x148':[3,1.04],'23.4x119.5':[4,1.12],'23.4x95.7':[4,.9],'15x85':[8,1.02],'7.5x40.7':[28,.88]};
for(const p of products('Yosemite')){assert.deepEqual([p.packPieces,p.packArea],yosemitePacks[p.format]);assert.equal(p.nativeFaces,false);assert.equal(p.textureProvenance.kind,'ai-reconstruction');assert.equal(identity('Yosemite',p.colorId,p.format,p.reference).fidelity,'ai-reconstruction');}
for(const id of ['white','natural'])assert(!formatsForColor('Yosemite',id).some(f=>f.id==='15x85'));
assert.equal(yosemite.formats.find(f=>f.id==='7.5x40.7').chevronAngle,30);
for(const id of ['23.4x95.7','15x85'])assert.equal(yosemite.formats.find(f=>f.id===id).chevronAngle,45);
for(const c of yosemite.colors){assert.equal(c.faces.length,8);assert.equal(c.nativeFaces,false);assert.equal(c.textureProvenance.kind,'ai-reconstruction');assert.equal(c.textureProvenance.userAuthorized,true);assert.equal(c.textureProvenance.manufacturerOriginal,false);assert.deepEqual(c.texturePhysicalSize,[1.48,.234]);assert.equal(c.textureVariantsByReference,undefined);const unique=new Set();for(const [tier,cap]of [['fluid',512],['balanced',1024],['max',1122]]){assert.equal(c.textureVariants[tier].length,8);for(const url of c.textureVariants[tier]){const {file,size}=asset(url);assert(Math.max(...size)<=cap);assert(size[0]/size[1]>6&&size[0]/size[1]<7);if(tier==='max')unique.add(createHash('sha256').update(readFileSync(file)).digest('hex'));}}assert.equal(unique.size,8,'Eight different reconstructed faces, not duplicated originals');}
for(const name of ['Stone Icon','Terraforma','Yosemite'])for(const p of products(name)){assert(p.reference);assert.equal(p.priceTTC,null);assertPublic(p);}
for(const ref of decorRefs)assertPublic(product(ref));
for(const collection of [stone,terra,yosemite]){assertPublic(collection.catalogueProducts);assertPublic(collection.cataloguePlinths);for(const row of collection.catalogueProducts||[])assert.equal(row.priceTTC,null);for(const row of collection.cataloguePlinths||[])assert.equal(row.priceTTC,null);}
for(const colorSuffix of ['40','70','60','00']){
 const long=catalogue.plinths.find(p=>p.collection==='Yosemite'&&p.reference==='03HBS'+colorSuffix);assert(long);assert.equal(long.length,119.5);assert.equal(long.packPieces,8);assert.equal(long.packMetres,9.56);
 const ref='00YB6'+colorSuffix,shared=catalogue.plinths.filter(p=>p.collection==='Yosemite'&&p.reference===ref);assert.equal(shared.length,1);assert.equal(shared[0].key,'ELIOS|plinth|Yosemite|'+ref);assert.equal(shared[0].packPieces,16);assert.equal(shared[0].packMetres,9.6);assert(catalogue.plinths.some(p=>p.collection==='Quercia'&&p.key==='ELIOS|plinth|'+ref),'Original shared Quercia reference remains available');
}
const planCatalogue=JSON.parse(readFileSync(resolve(root,'assets/js/lrf-plan-pose/catalogue.json')));
for(const row of [...planCatalogue.products,...planCatalogue.plinths])for(const key of ['purchaseHT','purchasePaletteHT','publicPriceHT'])assert.equal(row[key],null,'Legacy unknown-price slots remain explicitly null');
function noPrivateValues(value){if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(privateKey.test(key))assert.equal(item,null,'No private purchase value is published');else noPrivateValues(item);}}
noPrivateValues(planCatalogue);
console.log(JSON.stringify({passed:true,verifiedAssetFiles:files.size,checks:['three Stone Icon colours, exact per-format finishes and manufacturer packaging','Terraforma bases, four continuous decors and nominal-size discrepancy','seven Dynasty Honed decors preserve their 2x2 physical repeat','all reviewed colours selectable with honest catalogue-preview provenance','18 Yosemite SKUs, real compatible chevrons and four eight-face reconstructions','native WebP dimensions preserve manufacturer samples without upscaling','all public prices remain null and no private purchasing fields exist']},null,2));
