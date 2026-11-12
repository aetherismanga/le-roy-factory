import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {linesForBox} from '../assets/js/elios-samples-core.mjs';
import {defaultBox} from '../studio-one/elios-box/box.js';
import {makeRoom} from '../studio-one/src/room.js';
import {quantityForSurface} from '../shared/lrf-3d/quantities.js';
const catalogue=JSON.parse(readFileSync(new URL('../assets/data/elios-samples.json',import.meta.url),'utf8'));
const canonical=JSON.parse(readFileSync(new URL('../shared/lrf-3d/commercial-surfaces.json',import.meta.url),'utf8'));
test('all existing Elios SKUs, formats, colors and packaging are preserved without embedded net prices',()=>{
 const elios=canonical.products.filter(p=>p.brand==='ELIOS');assert.equal(catalogue.products.length,elios.length);
 const byKey=new Map(catalogue.products.map(p=>[p.key,p]));assert.equal(byKey.size,elios.length);
 for(const p of elios){const imported=byKey.get(p.key);for(const key of ['reference','collection','color','format','finish','packArea','packPieces'])assert.equal(imported[key],p[key]);assert.equal(imported.purchaseHT,undefined);assert.equal(imported.price,undefined);assert.equal(imported.amount,undefined);}
 assert.deepEqual(JSON.parse(readFileSync(new URL('../functions/elios-samples-catalogue.json',import.meta.url),'utf8')),catalogue);
});
test('free sample eligibility never broadens to outdoor, 20 mm, polished or lapped variants',()=>{
 const free=catalogue.products.filter(p=>p.vrac);assert(free.length>200);
 for(const p of free){assert(!/20\s*mm|poli|lapp/i.test(p.finish),p.reference+' '+p.finish);if(/r11|outdoor/i.test(p.finish))assert(catalogue.rules.some(r=>r.collection.toLowerCase()===p.collection.toLowerCase()&&/r11/i.test(r.finish)),p.reference+' '+p.finish);}
 assert.equal(free.filter(p=>p.collection==='Segmento').length,16);
 assert(!free.some(p=>p.collection==='Harmony'));
});
test('merchandising photos identify the exact reference and are present at both sizes',()=>{
 const pictured=catalogue.merchandising.filter(p=>p.images.length);assert(pictured.length>100);
 for(const p of pictured)for(const image of p.images){assert(existsSync(new URL('../'+image.image,import.meta.url)));assert(existsSync(new URL('../'+image.thumbnail,import.meta.url)));assert(catalogue.documents.some(d=>d.image===image.image&&d.codes.includes(p.reference)));}
});
test('the box default uses native room geometry and exact Elios product identities',()=>{
 const p=defaultBox(),room=makeRoom(p.room,0);try{
  room.floor.setLayout(p.layouts.floor);const floor=quantityForSurface(room.floor,p.floor,p.layouts.floor,10,'Sol');assert(Math.abs(floor.area-4.8)<1e-8);assert(floor.needed>=5.28);assert.equal(p.items.length,0);
  for(const finish of [p.floor,...p.walls.filter(w=>w.collection!=='Peinture')]){const product=canonical.products.find(x=>x.key===finish.catalogueKey);assert(product);assert.equal(product.brand,'ELIOS');assert.equal(product.reference,finish.reference);assert.equal(product.colorId,finish.color);}
 }finally{room.dispose();}
});
test('box surface groups aggregate exact SKUs and reject missing identities or foreign tiles',()=>{
 const row={brand:'ELIOS',catalogueKey:'synthetic',reference:'synthetic',needed:2,packVerified:true};assert.deepEqual(linesForBox({groups:[row,{...row,needed:3}]}),[{type:'box',key:'synthetic',quantity:5}]);
 assert.throws(()=>linesForBox({groups:[{...row,brand:'VIEW'}]}));assert.throws(()=>linesForBox({groups:[{...row,catalogueKey:''}]}));assert.throws(()=>linesForBox({groups:[{...row,customPack:true}]}));
});
