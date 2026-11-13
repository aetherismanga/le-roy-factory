import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {availableSampleFormats,samplePieceStyle,readSampleSelection,selectionStorageKey,boxDraftKey,boxBridgeMatches} from '../assets/js/elios-samples-core.mjs';
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
test('Yosemite sample cards use named material faces and never collection room photographs',()=>{
 for(const p of catalogue.products.filter(p=>p.collection==='Yosemite')){
  assert.match(p.image,/(?:YOSEMITE_[a-z]+_zoom\.jpg|media\/showroom\/yosemite-[a-z]+-03h2d\d+-\d+\.jpg)$/i);
  assert.equal(p.reconstructed,false);
  assert(!p.thumbnail.includes('/assets/img/elios/yosemite/'));
 }
});
test('one, two and three exhibition walls survive project roundtrip and only real pans enter quantities',()=>{
 const floor=catalogue.products.find(p=>p.collection==='Creta'&&p.colorId==='caramello'&&p.format==='60x120'),wall=catalogue.products.find(p=>p.collection==='Stone Icon'&&p.colorId==='leccese'&&p.format==='60x90'&&p.finish.startsWith('Tumbled ·'));
 assert(floor&&wall);
 for(const count of [1,2,3]){
  const settings={count,width:240,depth:200,left:180,height1:240,height2:220,height3:200,loss:10},project=exhibitionProject(settings,{floor:floor.key,walls:[wall.key,wall.key,wall.key]});
  assert.deepEqual(cloneRoom(project.room),project.room);const room=makeRoom(project.room,0);room.updateCutaway({clone:()=>({sub:()=>({dot:()=>1})})});
  assert.equal(project.plinths.enabled,false);assert.equal(project.plinths.walls['boundary-2'],false);assert.equal(room.walls.filter(w=>w.expoEnabled).length,count);assert.equal(room.walls.filter(w=>w.group.visible).length,count);
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
test('changing box dimensions preserves niches, rugs, tiled columns, grout and manual layouts',()=>{
 const floor=catalogue.products.find(p=>p.collection==='Yosemite'&&p.colorId==='honey'&&p.format==='23.4x119.5'),wall=catalogue.products.find(p=>p.collection==='Stone Icon'&&p.colorId==='leccese'&&p.format==='60x90'&&p.finish.startsWith('Tumbled ·'));
 const settings={count:3,width:240,depth:200,left:200,height1:240,height2:240,height3:240,loss:10},selection={floor:floor.key,walls:[wall.key,wall.key,wall.key]};
 const base=exhibitionProject(settings,selection);base.room.niches=[{id:'saved-niche',wallKey:'boundary-0',u:120,width:60,bottom:90,height:30,depth:8}];
 base.room.partitions=[{id:'saved-column',a:[20,70],b:[20,120],height:200,thickness:20}];base.floor.zones=[{id:'saved-rug',shape:'rectangle'}];base.walls[0].zones=[{id:'saved-wall-rug'}];
 base.floor.groutColor='Gris';base.walls[0].groutColor='Ivoire';base.layouts.floor={...base.layouts.floor,pattern:'herringbone',direction:'vertical',x:.17,y:.08,groutWidth:3};
 base.layouts.walls[0]={...base.layouts.walls[0],direction:'vertical',x:.11};base.room.expoComplete=true;
 const before=JSON.stringify(base),next=exhibitionProject({...settings,width:260},selection,base);
 assert.deepEqual(next.room.niches,base.room.niches);assert.deepEqual(next.room.partitions,base.room.partitions);assert.deepEqual(next.floor.zones,base.floor.zones);assert.deepEqual(next.walls[0].zones,base.walls[0].zones);
 assert.equal(next.floor.groutColor,'Gris');assert.equal(next.walls[0].groutColor,'Ivoire');assert.deepEqual(next.layouts.floor,normalizeLayout(base.layouts.floor,floor.collection,floor.format,floor.colorId));assert.deepEqual(next.layouts.walls[0],base.layouts.walls[0]);
 assert.equal(next.room.points[1][0],260);assert.notEqual(next.room.expoComplete,true);assert.equal(JSON.stringify(base),before,'Editing the base must not mutate the saved source project');
 assert.throws(()=>exhibitionProject({...settings,loss:NaN},selection,base));
});
test('legacy selections recover only into the verified own account and never overwrite a current selection',()=>{
 const own={items:[{type:'vrac',key:'old-sample',quantity:1}],boxId:'old-box'},modern={items:[],boxId:null};
 const records=new Map([[selectionStorageKey('LRF-00001'),JSON.stringify(own)],[selectionStorageKey('agent-agent@example.invalid'),JSON.stringify(own)]]),storage={getItem:key=>records.get(key)??null};
 const client={owner:'client:canonical-id',customer:{codeClient:'LRF-00001'}};
 assert.deepEqual(readSampleSelection(storage,client).selection,own);assert.equal(records.size,2,'Historical storage is preserved');
 records.set(selectionStorageKey(client.owner),JSON.stringify(modern));assert.deepEqual(readSampleSelection(storage,client),{selection:modern,legacyKey:null});
 assert.deepEqual(readSampleSelection(storage,{owner:'agent:uid',isAgent:true,customer:{email:'agent@example.invalid'}}).selection,own);
 assert.deepEqual(readSampleSelection(storage,{owner:'agent:uid:client:canonical-id',isAgent:true,targetClientId:'canonical-id',customer:{codeClient:'LRF-00001',email:'agent@example.invalid'}}),{selection:null,legacyKey:null});
});
test('drafts and delayed iframe saves stay attached to their exact client and opening session',()=>{
 const a='agent:uid:client:a',b='agent:uid:client:b',session={owner:a,bridgeId:'opening-a'};
 assert.notEqual(boxDraftKey(a),boxDraftKey(b));assert(boxBridgeMatches({bridgeId:'opening-a'},session,a));
 assert(!boxBridgeMatches({bridgeId:'opening-a'},session,b));assert(!boxBridgeMatches({bridgeId:'old-opening'},session,a));assert(!boxBridgeMatches({},session,a));assert(!boxBridgeMatches({bridgeId:'opening-a'},null,a));
});
