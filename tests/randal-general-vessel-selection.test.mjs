import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG as C} from '../randal-general/src/commerce/catalog.js';
import {initialDraft,updateDraft,normalizeDraft,draftProject} from '../randal-general/src/commerce/guided.js';
import {basinLayouts} from '../randal-general/src/basins.js';
import {topAvailable} from '../randal-general/src/configuration.js';
import {quoteProject} from '../randal-general/src/commerce/pricing.js';

test('120 cm cabinets switch from integrated double basins to either countertop bowl, including after selecting no top',()=>{
 let checked=0;
 for(const model of C.models.filter(m=>m.widths.includes(120)))for(const integrated of ['sella','tampa']){
  if(!topAvailable(integrated,120,model.id))continue;
  const start=updateDraft(initialDraft(model.collection),{format:model.id,width:120,top:integrated});
  for(const top of ['neris','torne'])for(const intermediate of [start,updateDraft(start,{top:'none'})]){
   if(!topAvailable(top,120,model.id))continue;
   const selected=updateDraft(intermediate,{top,basinColor:'gloss'});
   assert.equal(selected.top,top);assert.equal(selected.basinLayout,'center');
   const restored=JSON.parse(JSON.stringify(draftProject(selected)));
   assert.equal(restored.items[0].settings.basinLayout,'center');
   const quote=quoteProject(restored),row=quote.rows.find(r=>r.name==='Vasque '+(top==='neris'?'Neris':'Torne'));
   assert(row,model.id);assert.equal(row.publicTTC,C.vesselTTC);assert(quote.publicTTC>row.publicTTC);
   checked++;
  }
 }
 assert(checked>20);console.log('120 cm countertop selections and quotes verified: '+checked);
});

test('countertop positions persist when compatible and reset when a narrower cabinet requires it',()=>{
 for(const top of ['neris','torne']){
  const start=updateDraft(initialDraft('aruba'),{width:120,top});
  for(const layout of basinLayouts(top,120,start.format).map(o=>o.layout)){
   const placed=updateDraft(start,{basinLayout:layout});assert.equal(placed.basinLayout,layout);
   assert.equal(updateDraft(placed,{basinColor:'blue'}).basinLayout,layout);
   assert.equal(updateDraft(placed,{width:60}).basinLayout,'center');
  }
  assert.throws(()=>normalizeDraft({...start,basinLayout:'double'}),/incompatible/);
 }
});
