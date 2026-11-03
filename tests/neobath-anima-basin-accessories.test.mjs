import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BASIN_PRODUCTS,topSelection} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {resolveBasinAccessories,eclisseBottomOptions} from '../functions/neobath-anima/studio-adapter/basin-accessories.js';
import {validateProject,encodeProject,decodeProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
const eclisse=BASIN_PRODUCTS.filter(product=>/^ECLISSE/.test(product.ref||''));
function fixture(product,patch={}){return {version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[400,0],[400,300],[0,300]]},items:[{id:'test-basin-host',type:'cabinet',placement:{wall:0,u:150,height:30},settings:{format:'two',width:100,finish:'rovere-alba',drawers:[0,0],topDrawer:'siphon',top:product.id,topPlanId:'tpgea12-linear-top',topSpan:100,topOffset:0,topLength:100,basinColor:'fume-matte',basinPriceKey:'fume-matte',...patch}}]};}
const select=s=>topSelection(s.top,s.width,s.format,s.basinLayout,s.topSpan,s.topPlanId,s.topLength,s);
test('all six Eclisse references resolve their exact optional bottom and independent support SKUs',()=>{
 assert.equal(eclisse.length,6);
 for(const product of eclisse)for(const colour of ['fume-matte','bronze-matte']){
  const state={basinColor:colour},suffix=/\d{3}/.exec(product.ref)[0];
  const none=resolveBasinAccessories(product,state);assert.equal(none.available,true);assert.equal(none.products.length,0);
  const tvl=resolveBasinAccessories(product,{...state,basinBottom:'tvl'});assert.equal(tvl.bottomProduct.ref,'TVL'+suffix);assert.equal(tvl.bottomProduct.pricePublicHT,188);assert.equal(tvl.supportProduct,null);
  const support=resolveBasinAccessories(product,{...state,basinSupport:true});assert.equal(support.bottomProduct,null);assert.equal(support.supportProduct.ref,'SUP'+suffix);assert.equal(support.supportProduct.pricePublicHT,105);
  assert.deepEqual(eclisseBottomOptions(product,state).map(option=>option.id),['none','tvl']);
 }
});
test('bottom and support variants roundtrip and are each billed once with exact source prices',()=>{
 for(const product of eclisse)for(const patch of [{basinBottom:'tvl'},{basinSupport:true},{basinBottom:'tvl',basinSupport:true}]){
  const p=fixture(product,patch),before=quoteProject(fixture(product)),valid=decodeProject(encodeProject(p)),selection=select(valid.items[0].settings),q=quoteProject(valid),suffix=/\d{3}/.exec(product.ref)[0];
  assert.ok(selection);assert.equal(selection.basinBottom,patch.basinBottom||'none');assert.equal(selection.basinSupport,patch.basinSupport||false);
  assert.equal(q.publicTTC-before.publicTTC,(patch.basinBottom?22560:0)+(patch.basinSupport?12600:0));
  for(const kind of ['TVL','SUP'])assert.equal(q.rows.filter(row=>row.ref===kind+suffix).length,kind==='TVL'?Number(!!patch.basinBottom):Number(!!patch.basinSupport));
 }
 const p=fixture(eclisse[0],{basinBottom:'tvl',accessoryId:'tvl116-accessory'});assert.equal(quoteProject(p).rows.filter(row=>row.ref==='TVL116').length,1);
});
test('unknown types, white bowls and incompatible models cannot silently acquire smoked basin accessories',()=>{
 for(const patch of [{basinBottom:'open'},{basinBottom:'tvl115-accessory'},{basinBottom:null},{basinSupport:'yes'},{basinSupport:1},{basinSupport:null},{basinColor:'white-matte',basinPriceKey:'white-matte',basinBottom:'tvl'},{basinColor:'white-matte',basinPriceKey:'white-matte',basinSupport:true}]){
  const p=fixture(eclisse[0],patch);assert.equal(select(p.items[0].settings),null,JSON.stringify(patch));assert.throws(()=>validateProject(p));assert.equal(quoteProject(p).publicTTC,null);
 }
 for(const top of ['bare','tfx1-linear-top','fo01-countertop-basin']){
  const p=fixture(eclisse[0],{top,basinBottom:'tvl'});assert.equal(select(p.items[0].settings),null);assert.throws(()=>validateProject(p));
  assert.equal(quoteProject(p).publicTTC,null,'an invalid insert without a compatible bowl must never produce a firm quote');
 }
 const s=fixture(eclisse[0],{basinColor:'white-matte',basinPriceKey:'fume-matte',basinBottom:'tvl'}).items[0].settings;
 assert.ok(select(s),'explicit priced basin colour wins over a legacy body colour, as in the source quote');
});
