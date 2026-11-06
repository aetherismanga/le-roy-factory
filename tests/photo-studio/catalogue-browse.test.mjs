import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterCatalogue,filterProducts} from '../../assets/js/lrf-photo-studio/catalogue.mjs';

const catalogue=JSON.parse(readFileSync(new URL('../../assets/js/lrf-photo-studio/catalogue.json',import.meta.url),'utf8'));

test('full exact Elios/View catalogue remains browseable without false simulation',()=>{
 assert.equal(catalogue.schema,'lrf-photo-studio-catalogue');
 assert.ok(catalogue.browseProducts.length>=1306);
 const elios=catalogue.browseProducts.filter(row=>row.manufacturer==='ELIOS');
 const view=catalogue.browseProducts.filter(row=>row.manufacturer==='VIEW');
 assert.ok(elios.length>=916);
 assert.ok(view.length>=390);
 assert.ok(new Set(elios.map(row=>row.collection)).size>=52);
 assert.ok(catalogue.products.every(row=>row.photoStudioEligible&&row.textureFaces.length));
 assert.ok(catalogue.browseProducts.some(row=>!row.photoStudioEligible&&row.ineligibleReason));
 for(const row of catalogue.browseProducts){
  assert.ok(!Object.keys(row).some(key=>/prix|tarif|price|cost|purchase/i.test(key)));
 }
});
test('browse filtering includes non-simulable Elios collections but simulation filter excludes them',()=>{
 const elios=filterCatalogue(catalogue.browseProducts,{manufacturer:'ELIOS'});
 const eligible=filterProducts(catalogue.browseProducts,{manufacturer:'ELIOS'});
 assert.equal(elios.length,catalogue.browseProducts.filter(p=>p.manufacturer==='ELIOS').length);
 assert.ok(eligible.length>0);
 assert.ok(eligible.length<elios.length);
 assert.equal(filterCatalogue(catalogue.browseProducts,{manufacturer:'ELIOS',collection:'Stone Icon'}).length>0,true);
 const byReference=filterCatalogue(catalogue.browseProducts,{query:'00Y2C00'});
 assert.equal(byReference.length,1);
 assert.equal(byReference[0].reference,'00Y2C00');
});
