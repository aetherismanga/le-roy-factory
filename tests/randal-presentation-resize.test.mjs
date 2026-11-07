import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationProducts} from '../shared/lrf-3d/randal-presentation-products.js';
import * as studio from '../studio-one/src/commerce/guided.js';
import * as general from '../randal-general/src/commerce/guided.js';
import {CATALOG as studioCatalog} from '../studio-one/src/commerce/catalog.js';
import {CATALOG as generalCatalog} from '../randal-general/src/commerce/catalog.js';
import {quoteProject as studioQuote} from '../studio-one/src/commerce/pricing.js';
import {quoteProject as generalQuote} from '../randal-general/src/commerce/pricing.js';
import {checkedProject as studioChecked} from '../studio-one/src/commerce/flow.js';
import {checkedProject as generalChecked} from '../randal-general/src/commerce/flow.js';
import {basinLayouts as studioLayouts} from '../studio-one/src/basins.js';
import {basinLayouts as generalLayouts} from '../randal-general/src/basins.js';

const adapters=[['Studio One',studio,studioCatalog,studioQuote,studioChecked,studioLayouts],['Catalogue Général',general,generalCatalog,generalQuote,generalChecked,generalLayouts]];
const selected=(project,part='cabinet')=>({itemId:project.items.find(i=>i.type==='cabinet').id,part});
const field=(products,project,key,part='cabinet')=>products.fields(project,selected(project,part)).groups.flatMap(g=>g.fields).find(f=>f.key===key);
for(const [name,adapter,C,quote,checked,basinLayouts] of adapters){
 const products=createPresentationProducts({...adapter,catalog:C});
 test(name+': a centred 100 cm Sella changes to a genuine 120 cm double basin without losing its furniture identity',()=>{
  const source=adapter.draftProject({...adapter.initialDraft(),width:100,top:'sella',basinLayout:'center',column:true,mirror:'zen'}),context=selected(source),before=structuredClone(source),cabinet=source.items.find(i=>i.type==='cabinet');
  cabinet.settings.tap='existing-catalogue-tap';cabinet.settings.drawers=[1,0];const original=structuredClone(source);
  const width=field(products,source,'width');assert.ok(width.choices.find(c=>c.value==='120'&&!c.disabled));assert.equal(products.apply(source,{width:120},{...context,validateOnly:true}),true);assert.deepEqual(source,original);
  const next=products.apply(source,{width:120},context),updated=next.items.find(i=>i.id===cabinet.id);
  assert.equal(updated.settings.width,120);assert.equal(updated.settings.top,'sella');assert.equal(updated.settings.basinLayout,'double');assert.equal(updated.settings.finish,cabinet.settings.finish);assert.equal(updated.settings.tap,cabinet.settings.tap);assert.deepEqual(updated.settings.drawers,[1,0]);
  assert.deepEqual(next.items.filter(i=>i.id!==cabinet.id),source.items.filter(i=>i.id!==cabinet.id));assert.deepEqual(next.room,source.room);assert.deepEqual(next.floor,source.floor);assert.deepEqual(next.walls,source.walls);assert.deepEqual(next.layouts,source.layouts);assert.deepEqual(source,original);
  assert.doesNotThrow(()=>checked(next));const priced=quote(next);assert.equal(priced.missing.length,0);assert.ok(priced.rows.some(r=>r.ref==='2809'),'the real 120 cm double Sella is quoted');assert.ok(!priced.rows.some(r=>r.ref==='3279'),'the 100 cm basin is replaced');
  const layout=field(products,next,'basinLayout','basin');assert.deepEqual(layout.choices.map(c=>c.value),basinLayouts('sella',120,updated.settings.format,'gloss').map(o=>o.layout));assert.deepEqual(layout.choices.map(c=>c.value),['offset','double']);
  const left=products.apply(next,{basinLayout:'offset'},selected(next,'basin'));assert.ok(quote(left).rows.some(r=>r.ref==='6389'));assert.equal(quote(left).missing.length,0);
  assert.throws(()=>products.apply(next,{basinLayout:'offset-right'},selected(next,'basin')),'there is no invented integrated right-offset ceramic reference');
  assert.equal(before.items[0].settings.width,100);
 });
 test(name+': compatible basin placement survives a resize and incompatible double placement resolves on shrinking',()=>{
  const left=adapter.draftProject({...adapter.initialDraft(),width:100,top:'sella',basinLayout:'offset'}),wider=products.apply(left,{width:120},selected(left));assert.equal(wider.items[0].settings.basinLayout,'offset');assert.equal(quote(wider).missing.length,0);
  const double=products.apply(wider,{basinLayout:'double'},selected(wider,'basin')),smaller=products.apply(double,{width:100},selected(double));assert.equal(smaller.items[0].settings.width,100);assert.equal(smaller.items[0].settings.basinLayout,'center');assert.ok(quote(smaller).rows.some(r=>r.ref==='3279'));assert.doesNotThrow(()=>checked(smaller));
  assert.throws(()=>products.apply(left,{width:120,basinLayout:'center'},selected(left)),'an explicitly requested impossible combination is rejected');
 });
 test(name+': real vessel layouts at 120 cm include centred, left and right options',()=>{
  for(const top of ['neris','torne']){
   const source=adapter.draftProject({...adapter.initialDraft(),width:100,top,basinLayout:'center'}),next=products.apply(source,{width:120},selected(source));
   assert.equal(next.items[0].settings.width,120);assert.equal(next.items[0].settings.basinLayout,'center');const layout=field(products,next,'basinLayout','basin');assert.deepEqual(layout.choices.map(c=>c.value),['center','vessel-left','offset-right']);
   for(const choice of layout.choices){const placed=products.apply(next,{basinLayout:choice.value},selected(next,'basin'));assert.doesNotThrow(()=>checked(placed));assert.equal(quote(placed).missing.length,0);assert.equal(placed.items[0].settings.width,120);}
  }
 });
 test(name+': a resize can slide only the selected cabinet past a close column and refuses a genuinely full wall',()=>{
  const source=adapter.draftProject({...adapter.initialDraft(),width:100,top:'sella',basinLayout:'center',column:true}),cabinet=source.items.find(i=>i.type==='cabinet'),column=source.items.find(i=>i.type==='column');column.placement.u=125+50+(C.column?.width||C.columns.find(c=>c.id===column.settings.columnModel).width)/2+2;
  const before=structuredClone(source),resized=products.apply(source,{width:120},selected(source)),changed=resized.items.find(i=>i.id===cabinet.id);assert.ok(changed.placement.u<cabinet.placement.u);assert.deepEqual(resized.items.find(i=>i.id===column.id),column);assert.deepEqual(source,before);assert.doesNotThrow(()=>checked(resized));assert.equal(quote(resized).missing.length,0);
  const tight=structuredClone(source);tight.room.points=[[0,0],[160,0],[160,300],[0,300]];tight.items=tight.items.filter(i=>['cabinet','column'].includes(i.type));tight.items.find(i=>i.type==='cabinet').placement.u=55;tight.items.find(i=>i.type==='column').placement.u=129;
  const unchanged=structuredClone(tight);assert.throws(()=>products.apply(tight,{width:120},selected(tight)),/place nécessaire/);assert.throws(()=>products.apply(tight,{width:120},{...selected(tight),validateOnly:true}),/place nécessaire/);assert.deepEqual(tight,unchanged);assert.ok(!field(products,tight,'width').choices.some(c=>c.value==='120'&&!c.disabled));
 });
}

test('Studio and compatible General collections retain genuine centred 120 cm Tampa choices',()=>{
 for(const [adapter,C,quote,checked,collection] of [[studio,studioCatalog,studioQuote,studioChecked,undefined],[general,generalCatalog,generalQuote,generalChecked,'amat']]){
  const products=createPresentationProducts({...adapter,catalog:C}),source=adapter.draftProject({...adapter.initialDraft(collection),width:100,top:'tampa',basinLayout:'center'}),next=products.apply(source,{width:120},selected(source));assert.equal(next.items[0].settings.basinLayout,'center');assert.equal(next.items[0].settings.width,120);assert.ok(quote(next).rows.some(r=>r.ref==='6232'));assert.doesNotThrow(()=>checked(next));
  const layouts=field(products,next,'basinLayout','basin');assert.deepEqual(layouts.choices.map(c=>c.value),['center','offset','double']);for(const choice of layouts.choices){const placed=products.apply(next,{basinLayout:choice.value},selected(next,'basin'));assert.equal(quote(placed).missing.length,0);}
 }
});

test('fixed-width native collections never acquire an invented 120 cm size',()=>{
 const products=createPresentationProducts({...general,catalog:generalCatalog}),source=general.draftProject(general.initialDraft('less'));assert.deepEqual(field(products,source,'width').choices.map(c=>c.value),['40']);assert.throws(()=>products.apply(source,{width:120},selected(source)));assert.equal(source.items[0].settings.width,40);
});
