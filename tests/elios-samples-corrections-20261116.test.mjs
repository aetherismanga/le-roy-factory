import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {availableSampleFormats,merchandisingBaseChoices,selectMerchandisingWithBase} from '../assets/js/elios-samples-core.mjs';
import {sampleTileMatches} from '../assets/js/elios-samples-options.mjs';
const require=createRequire(import.meta.url),C=require('../functions/elios-samples-core.cjs');
const catalogue=JSON.parse(readFileSync(new URL('../assets/data/elios-samples.json',import.meta.url)));
const server=JSON.parse(readFileSync(new URL('../functions/elios-samples-catalogue.json',import.meta.url)));
test('Brooklyn 100x100 offers all seven standard colours through filtering and server validation',()=>{
 assert.deepEqual(server,catalogue);
 assert(availableSampleFormats(catalogue.products,{collection:'Brooklyn'}).includes('100x100'));
 const rows=catalogue.products.filter(p=>sampleTileMatches(p,{mode:'vrac',collection:'Brooklyn',format:'100x100',slip:'R10',thickness:'8,5 mm'}));
 assert.deepEqual(rows.map(p=>p.reference).sort(),['00K1X00','00K1X10','00K1X40','00K1X50','00K1X60','00K1X80','00K1X90']);
 for(const quantity of [1,2]){
  const q=C.buildQuote(rows.map(p=>({type:'vrac',key:p.key,quantity})),server);
  assert.equal(q.rows.length,7);assert.equal(q.totalHT,0);assert(q.rows.every(row=>row.label&&row.quantity===quantity));
 }
 for(const p of catalogue.products.filter(p=>p.collection==='Brooklyn'&&/Outdoor|20 mm/.test(p.finish))){const q=C.buildQuote([{type:'vrac',key:p.key,quantity:1}],server);assert.equal(q.rows[0].factoryApprovalRequired,true);}
});
test('kit and optional socle stay separate and retain exact server quantities and indicative values',()=>{
 const bases=merchandisingBaseChoices(catalogue);
 assert.equal(bases.length,7);
 for(const code of ['E99106','E99114','E99120','E99127','E99113','E99179'])assert(bases.some(p=>p.reference===code));
 const items=selectMerchandisingWithBase([],'EBRK34',2,catalogue,'E99127',1);
 assert.deepEqual(items,[{type:'merchandising',key:'EBRK34',quantity:2},{type:'merchandising',key:'E99127',quantity:1}]);
 const quote=C.buildQuote(items,server);
 assert.equal(quote.totalHT,0);assert.equal(quote.merchandisingValueHT,388);
 assert.deepEqual(quote.rows.map(r=>[r.reference,r.quantity]),[['EBRK34',2],['E99127',1]]);
 const before=JSON.stringify(items);
 for(const [key,quantity] of [['not-a-socle',1],['E99127',0],['E99127',1.5],['E99127',51]])assert.throws(()=>selectMerchandisingWithBase(items,'EBRK34',3,catalogue,key,quantity));
 assert.equal(JSON.stringify(items),before);
 const full=Array.from({length:199},(_,i)=>({type:'vrac',key:'item-'+i,quantity:1}));
 assert.throws(()=>selectMerchandisingWithBase(full,'EBRK34',1,catalogue,'E99127',1));assert.equal(full.length,199);
});
test('the manufacturer socle with no code or price remains explicitly unconfirmed',()=>{
 const base=merchandisingBaseChoices(catalogue).find(p=>!p.reference);assert(base);assert.equal(base.valueUnitHT,null);assert.equal(base.status,'Code à confirmer');
 const quote=C.buildQuote([{type:'merchandising',key:base.id,quantity:1}],server);
 assert.equal(quote.totalHT,0);assert.equal(quote.merchandisingValueIncomplete,true);assert.equal(quote.rows[0].valueUnitHT,null);
});
