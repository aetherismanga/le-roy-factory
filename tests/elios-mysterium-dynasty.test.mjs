import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {COLLECTIONS} from '../shared/lrf-3d/surface-catalog.js';
import {availableColors,surfaceSeries,surfacePreviewNote} from '../shared/lrf-3d/surface-picker.js';
import {surfaceColorIssue} from '../shared/lrf-3d/surface-quality.js';
import {resolveSurfaceTexture} from '../shared/lrf-3d/surface-texture-selection.js';
import {commercialSurfaceOptions,commercialSurfaceProduct} from '../shared/lrf-3d/surface-identity.mjs';
const require=createRequire(import.meta.url),{buildQuote}=require('../functions/elios-samples-core.cjs');
const root=new URL('../',import.meta.url),read=file=>JSON.parse(readFileSync(new URL(file,root)));
const commercial=read('shared/lrf-3d/commercial-surfaces.json').products;
const samples=read('assets/data/elios-samples.json'),inventory=read('reports/elios-hd/mysterium-native-inventory-20261113.json');

test('All six Mysterium colours are offered for floors and walls with exact HD slab faces',()=>{
 assert.equal(availableColors('Mysterium').length,6);
 for(const kind of ['floor','wall'])assert(surfaceSeries('ELIOS',kind).some(([name])=>name==='Mysterium'));
 const files=new Set();
 for(const color of COLLECTIONS.Mysterium.colors){
  const reference=Object.keys(color.textureVariantsByReference)[0];
  assert.match(surfacePreviewNote(color),/HD en 120 × 278/);
  for(const profile of ['fluid','balanced','max']){
   const selected=resolveSurfaceTexture('Mysterium',color.id,profile,{format:'120x278',catalogueKey:'ELIOS|'+reference});
   assert.equal(selected.mapped,true);assert.equal(selected.files.length,4);assert.equal(selected.rotation,0);
   for(const file of selected.files){
    const relative=new URL(file).pathname.slice(1),bytes=readFileSync(new URL(relative,root));
    const entry=inventory.entries.find(e=>Object.values(e.variants).some(v=>relative.endsWith(v.file)));
    assert(entry);assert.equal(bytes.subarray(0,4).toString(),'RIFF');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.variants[profile].sha256);
    assert.equal(entry.sourceICCsha256.length,64);assert.equal(entry.upscaled,false);files.add(file);
   }
  }
  const small=resolveSurfaceTexture('Mysterium',color.id,'max',{format:'60x120',catalogueKey:'ELIOS|03U6A'+reference.slice(-2)});
  assert.equal(small.mapped,false);assert(small.files.every(file=>!file.includes('elios-mysterium-20261113')));
  const invalid=structuredClone(color);delete invalid.textureVariantsByReference;
  assert.equal(surfaceColorIssue('Mysterium',invalid),'insufficient-source-definition');
 }
 assert.equal(files.size,72);
 assert.equal(inventory.entries.length,24);
});

test('Dynasty 60x120 exposes seven R10 samples and seven independent Honed SKUs with actual boxes',()=>{
 const colors=['alpi','lepanto','marfil','monet','saint-laurent','calacatta-viola','bianco-aurora'];
 const rows=samples.products.filter(p=>p.collection==='Dynasty'&&p.format==='60x120'&&!p.legacy);
 assert.equal(rows.length,14);assert.equal(rows.filter(p=>p.vrac).length,7);
 assert.equal(samples.products.filter(p=>p.collection==='Dynasty'&&p.format==='30x30'&&p.vrac).length,7);
 for(const [index,color] of colors.entries()){
  const options=commercialSurfaceOptions({collection:'Dynasty',color,format:'60x120'},commercial);
  assert.equal(options.length,2);assert(options.every(p=>p.reference&&p.packPieces===2&&p.packArea===1.44));
  const reference='04N6A'+(index+10),r10=rows.find(p=>p.reference===reference),honed=rows.find(p=>p.reference==='04N6A0'+index);
  assert(r10&&honed);assert.equal(r10.colorId,color);assert.equal(r10.vrac,true);assert.equal(honed.vrac,false);
  assert.match(r10.finish,/R10 B/);assert.match(honed.finish,/3D Honed/);assert(r10.image&&r10.thumbnail);
  const old=commercialSurfaceProduct({collection:'Dynasty',color,format:'60x120',catalogueKey:'ELIOS|Dynasty|'+color+'|60x120'},commercial);
  assert.equal(old.reference,reference,'A historical visual key resolves to the reviewed standard finish');
  const free=buildQuote([{type:'vrac',key:r10.key,quantity:1}],samples,{});
  assert.equal(free.totalHT,0);assert.equal(free.rows[0].reference,reference);assert(free.rows[0].label);
  const quote=buildQuote([{type:'box',key:r10.key,quantity:2}],samples,{[r10.key]:{purchaseHT:30}});
  assert.equal(quote.rows[0].boxes,2);assert.equal(quote.rows[0].quantity,2.88);assert.equal(quote.totalHT,45.22);
 }
 assert.deepEqual(samples,read('functions/elios-samples-catalogue.json'));
});
