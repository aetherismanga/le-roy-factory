import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {availableSampleFormats,samplePieceStyle} from '../assets/js/elios-samples-core.mjs';
import {exhibitionRoom,exhibitionProject} from '../studio-one/elios-box/box-setup.js';
import {makeRoom,cloneRoom} from '../shared/lrf-3d/room.js';
import {quantityForSurface,summarizeQuantities} from '../shared/lrf-3d/quantities.js';
import {defaultSurfacePattern,normalizeLayout} from '../shared/lrf-3d/surface-catalog.js';
import catalogue from '../assets/data/elios-samples.json' with {type:'json'};
const require=createRequire(import.meta.url),C=require('../functions/elios-samples-core.cjs');
test('sample format choices follow collection and search and never include unavailable samples',()=>{
 assert.deepEqual(availableSampleFormats(catalogue.products,{collection:'Yosemite'}),['7.5x40.7','23.4x119.5']);
 const creta=availableSampleFormats(catalogue.products,{collection:'Creta'});assert(!creta.includes('23.4x119.5'));assert(creta.includes('60x60'));
 assert.deepEqual(availableSampleFormats(catalogue.products,{collection:'Creta',query:'does-not-exist'}),[]);
});
test('chevron shape follows its real SKU, and its preview proportions come from the format',()=>{
 const p=catalogue.products.find(p=>p.collection==='Yosemite'&&p.format==='7.5x40.7');assert.equal(p.shape,'chevron');assert.match(samplePieceStyle(p),/--tile-ratio:5/);
 assert.equal(catalogue.products.find(p=>p.collection==='Yosemite'&&p.format==='23.4x119.5').shape,'rectangle');
});
test('one, two and three exhibition walls survive project roundtrip and only real pans enter quantities',()=>{
 const floor=catalogue.products.find(p=>p.collection==='Creta'&&p.colorId==='caramello'&&p.format==='60x120'),wall=catalogue.products.find(p=>p.collection==='Stone Icon'&&p.colorId==='leccese'&&p.format==='60x90'&&p.finish.startsWith('Tumbled ·'));
 assert(floor&&wall);
 for(const count of [1,2,3]){
  const settings={count,width:240,depth:200,left:180,height1:240,height2:220,height3:200,loss:10},project=exhibitionProject(settings,{floor:floor.key,walls:[wall.key,wall.key,wall.key]});
  assert.deepEqual(cloneRoom(project.room),project.room);const room=makeRoom(project.room,0);room.updateCutaway({clone:()=>({sub:()=>({dot:()=>1})})});
  assert.equal(room.walls.filter(w=>w.expoEnabled).length,count);assert.equal(room.walls.filter(w=>w.group.visible).length,count);
  const rows=room.walls.map((w,i)=>quantityForSurface(w,project.walls[i],project.layouts.walls[i],10,w.expoLabel));
  assert.equal(rows.filter(r=>!r.paint).length,count);const expected=2.4*2.4+(count>1?2*2.2:0)+(count>2?1.8*2:0);
  assert(Math.abs(summarizeQuantities(rows).reduce((n,r)=>n+r.area,0)-expected)<1e-6);room.dispose();
 }
 assert.throws(()=>exhibitionRoom({count:4,width:240,depth:200,height1:240}));
});
test('wood selections default to one third while manufacturer chevrons stay in chevron',()=>{
 assert.equal(defaultSurfacePattern('Yosemite','honey','23.4x119.5'),'third');assert.equal(defaultSurfacePattern('Quercia','honey','24x120'),'third');
 assert.equal(defaultSurfacePattern('Yosemite','honey','7.5x40.7'),'chevron');assert.equal(normalizeLayout({pattern:'straight'},'Yosemite','23.4x119.5','honey').pattern,'straight');
});
test('agent client selection reads the canonical CRM identity and never accepts a missing client',async()=>{
 const db={collection:name=>{assert.equal(name,'clients');return {doc:id=>({get:async()=>({id,data:()=>id==='real'?{societe:'CRM magasin',codeClient:'LRF-99999',email:'test@example.invalid',adresse:'1 rue test'}:null})})};}};
 const account=await C.agentCustomer(db,{uid:'agent',email:'agent@example.invalid'},'real');assert.equal(account.societe,'CRM magasin');assert.equal(account.owner,'agent:agent:client:real');assert.equal(account.contact.email,'test@example.invalid');
 await assert.rejects(()=>C.agentCustomer(db,{uid:'agent'},'missing'));await assert.rejects(()=>C.agentCustomer(db,{uid:'agent'},'bad/id'));
});
