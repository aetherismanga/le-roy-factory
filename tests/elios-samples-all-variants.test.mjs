import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {sampleTileMatches,sampleFacetValues,sampleVariantValue} from '../assets/js/elios-samples-options.mjs';
const require=createRequire(import.meta.url),C=require('../functions/elios-samples-core.cjs');
const catalogue=JSON.parse(readFileSync(new URL('../assets/data/elios-samples.json',import.meta.url)));
test('every identified current variant in every collection can be requested in vrac without invented references',()=>{
 const eligible=catalogue.products.filter(p=>p.vrac);assert.equal(eligible.length,820);
 for(const product of catalogue.products){assert.equal(product.vrac,Boolean((product.reference||product.sampleReferencePending)&&!product.legacy));if(!product.vrac)continue;
  assert(sampleTileMatches(product,{mode:'vrac',collection:product.collection,format:product.format,color:product.color,finish:product.finish,slip:sampleVariantValue(product,'slip'),thickness:sampleVariantValue(product,'thickness')}));
  for(const quantity of [1,2]){const q=C.buildQuote([{type:'vrac',key:product.key,quantity}],catalogue);assert.equal(q.rows[0].reference,product.reference);assert.equal(q.rows[0].quantity,quantity);}
 }
 assert.deepEqual(JSON.parse(readFileSync(new URL('../functions/elios-samples-catalogue.json',import.meta.url))),catalogue);
});
test('Brooklyn separates R10, thin R11 and 20 mm R11 in their real colours',()=>{
 const select=filters=>catalogue.products.filter(p=>sampleTileMatches(p,{mode:'vrac',collection:'Brooklyn',...filters}));
 assert.equal(select({format:'100x100',slip:'R10',thickness:'8,5 mm'}).length,7);
 assert.deepEqual(select({format:'100x100',slip:'R11',thickness:'20 mm'}).map(p=>p.reference).sort(),['00K1210','00K1240','00K1250','00K1260','00K1280','00K1290']);
 assert.deepEqual(select({format:'100x100',slip:'R11',thickness:'8,5 mm'}).map(p=>p.reference).sort(),['00K1X41','00K1X61']);
 assert.equal(select({format:'60x60',slip:'R11'}).length,0);
 assert.deepEqual(sampleFacetValues(catalogue.products,{mode:'vrac',collection:'Brooklyn',format:'100x100',slip:'R11',thickness:'20 mm'},'slip'),['R10','R11']);
});
test('60x60 R11 with standard thickness stays selectable where it exists, with no fabricated 10 mm option',()=>{
 for(const collection of ['Shell','Stone Icon']){
  const filters={mode:'vrac',collection,format:'60x60',slip:'R11',thickness:'8,5 mm'};
  assert.equal(catalogue.products.filter(p=>sampleTileMatches(p,filters)).length,3);
  assert(sampleFacetValues(catalogue.products,{...filters,thickness:''},'thickness').includes('8,5 mm'));
  assert.equal(catalogue.products.filter(p=>sampleTileMatches(p,{...filters,thickness:'10 mm'})).length,0);
 }
});
test('requesting an extra finish never forges factory approval or changes the supplier sample conditions',()=>{
 const p=catalogue.products.find(p=>p.reference==='00K1280');assert.equal(p.sampleOffer,'factory-confirmation');
 const q=C.buildQuote([{type:'vrac',key:p.key,quantity:1,sampleOffer:'offered',factoryApproved:true}],catalogue);
 assert.equal(q.rows[0].sampleOffer,'factory-confirmation');assert.equal(q.rows[0].factoryApprovalRequired,true);assert.equal(q.rows[0].factoryApproved,undefined);
 assert.throws(()=>C.buildQuote([{type:'vrac',key:p.key,quantity:3}],catalogue));
});
