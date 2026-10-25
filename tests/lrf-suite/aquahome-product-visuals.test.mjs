import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {AQUAHOME} from '../../shared/lrf-3d/aquahome-catalog.js';
import {aquahomeProductVisual,aquahomeModelKey,defaultAquahomeProductVisual} from '../../shared/lrf-3d/aquahome-product-visuals.js';
import {productVisual} from '../../shared/lrf-3d/catalogue-product-visuals.js';
const manifest=JSON.parse(readFileSync(new URL('../../shared/lrf-3d/aquahome-product-photos.json',import.meta.url)));
test('every configured AQUAHOME reference uses a real referenced original catalogue photograph',()=>{
 const references=manifest.models.flatMap(model=>model.references);assert.equal(new Set(references).size,AQUAHOME.length);assert.equal(references.length,AQUAHOME.length);
 for(const p of AQUAHOME){const v=aquahomeProductVisual(p);assert(v);assert.equal(v.reference,p.reference);assert.equal(v.kind,'manufacturer-photo');assert(v.alt.includes(v.shownFinish));assert(v.provenance.includes('AQUAHOME 2026'));assert(existsSync(new URL('../../shared/lrf-3d/media/aquahome-2026/'+v.src.split('/').at(-1),import.meta.url)));assert.equal(productVisual('tap',{tap:p.reference}).src,v.src);assert(!Object.keys(v).some(k=>/price|purchase|HT/.test(k)));}
 assert.equal(aquahomeProductVisual('unlisted'),null);assert.equal(productVisual('tap',{tap:'unlisted'}),null);
});
test('unphotographed finish stays explicit; official black, copper and graphite photos use their true finish',()=>{
 const black=aquahomeProductVisual('11340112703');assert.equal(black.finishExact,false);assert.equal(black.shownFinish,'Chrome brillant');assert.match(black.caption,/finition présentée/);
 for(const ref of ['530000016','540000019','530000036'])assert.equal(aquahomeProductVisual(ref).finishExact,true);
 const standard=aquahomeProductVisual('11340112701'),xl=aquahomeProductVisual('11340212701');assert.notEqual(standard.src,xl.src);assert.equal(defaultAquahomeProductVisual('shower').reference,'540000010');
});
test('original Sprinter page24 products remain distinct from Munich without reference changes',()=>{
 for(const ref of ['12040112701','12042112701'])assert.equal(aquahomeModelKey(AQUAHOME.find(p=>p.reference===ref)),'Sprinter');
 assert.equal(aquahomeModelKey(AQUAHOME.find(p=>p.reference==='10340112701')),'Munich');
});
