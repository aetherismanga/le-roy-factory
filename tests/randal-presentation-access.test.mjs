import test from 'node:test';
import assert from 'node:assert/strict';
import {configuratorAccess,isRandalPresentation} from '../shared/lrf-3d/randal-client-access.js';
import {RANDAL_FLOORS,RANDAL_WALLS,presentationChoice,withPresentationSurface} from '../shared/lrf-3d/randal-presentation-catalog.js';
import * as T from 'three';
import {createRandalPresentationScene} from '../shared/lrf-3d/randal-presentation-scene.js';

test('only the exact verified RANDAL account receives the presentation capability',()=>{
 for(const identity of [null,{client:{codeClient:'LRF-00320',societe:'RANDAL'}},{client:{codeClient:'LRF-003210'}},{client:{codeClient:'LRF-00321'},isAdmin:true}]){
  assert.deepEqual(configuratorAccess(identity),{mode:'standard',allowWorkshop:true});assert.equal(isRandalPresentation(identity),false);
 }
 const verified={client:{codeClient:'LRF-00321'},isAdmin:false};assert.equal(isRandalPresentation(verified),false);
 verified.configuratorAccess=configuratorAccess(verified);assert.equal(isRandalPresentation(verified),true);
});

for(const variant of ['studio-one','randal-general'])test(variant+': presentation drives the real drawers, column doors, LED and tile geometry',async()=>{
 const {buildPreview}=await import('../'+variant+'/src/commerce/preview-model.js');const {initialDraft,draftProject}=await import('../'+variant+'/src/commerce/guided.js');
 const draft=variant==='studio-one'?{...initialDraft(),column:true,mirror:'ilse'}:{...initialDraft('aruba'),column:true,mirror:'ilse'};
 const input=draftProject(draft),unchanged=JSON.stringify(input),preview=buildPreview(input),scene=new T.Scene();scene.add(preview.group);
 const floor=new T.Mesh(),wall=new T.Mesh();scene.add(floor,wall);const callbacks=[];const originals={requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,matchMedia:globalThis.matchMedia,innerWidth:globalThis.innerWidth};
 Object.assign(globalThis,{requestAnimationFrame:callback=>(callbacks.push(callback),callbacks.length),cancelAnimationFrame(){},matchMedia:()=>({matches:true}),innerWidth:1200});
 const presentation=createRandalPresentationScene({scene,renderer:{capabilities:{getMaxAnisotropy:()=>8}},floor,wall,getItems:()=>preview.items,invalidate(){},loadTexture:async()=>new T.Texture({width:256,height:256})});
 try{
  assert.equal(presentation.capabilities().led,true);presentation.setLED(false);for(const mirror of preview.items.filter(i=>i.type==='mirror'))assert.equal(mirror.asset.root.getObjectByName('Eclairage_LED').visible,false);
  presentation.setLED(true);for(const mirror of preview.items.filter(i=>i.type==='mirror'))assert.equal(mirror.asset.root.getObjectByName('Eclairage_LED').visible,true);
  presentation.setOpened(true);callbacks.splice(0).forEach(fn=>fn(performance.now()+300));assert(preview.items.find(i=>i.type==='cabinet').asset.drawers.every(d=>d.position.z>.2));assert(Math.abs(preview.items.find(i=>i.type==='column').asset.door.rotation.y)>1);
  presentation.setOpened(false);callbacks.splice(0).forEach(fn=>fn(performance.now()+300));assert(preview.items.find(i=>i.type==='cabinet').asset.drawers.every(d=>d.position.z===0));
  for(const c of RANDAL_FLOORS)assert.equal(await presentation.setSurface('floor',c.id),true);
  for(const id of ['paint-white','stone-icon-leccese',...RANDAL_WALLS.filter(c=>c.collection==='Allure').map(c=>c.id)])assert.equal(await presentation.setSurface('wall',id),true);
  await presentation.setSurface('floor','yosemite-honey');assert.deepEqual([presentation.diagnostics().layouts.floor.width,presentation.diagnostics().layouts.floor.height,presentation.diagnostics().layouts.floor.pattern],[1.2,.2,'third']);
  await assert.rejects(presentation.setSurface('floor','allure-eden'));assert.equal(JSON.stringify(input),unchanged,'presentation mechanisms never edit the source furniture/project');
 }finally{presentation.dispose();Object.assign(globalThis,originals);}
});

test('floor and wall selections remain separate, bounded and use the requested layouts',()=>{
 assert.equal(RANDAL_FLOORS.length,3);assert.deepEqual(RANDAL_FLOORS.map(x=>[x.collection,x.color,x.width,x.height,x.pattern]),[['Yosemite','honey',1.2,.2,'third'],['Creta','caramello',1.2,.6,'straight'],['Slate','gold',.6,.6,'straight']]);
 assert.equal(RANDAL_WALLS.filter(c=>c.collection==='Allure').length,9);assert.equal(RANDAL_WALLS.filter(c=>c.collection==='Allure'&&c.decor).length,4);
 assert(RANDAL_WALLS.every(c=>['Peinture','Stone Icon','Allure'].includes(c.collection)));
 assert.equal(presentationChoice('floor','allure-eden'),null);assert.equal(presentationChoice('wall','yosemite-honey'),null);
 const project={room:{points:[[0,0],[450,0],[450,450],[0,450]]},items:[{id:'cabinet',settings:{finish:'ROBLE'}}],walls:[{collection:'Creta'}]};
 const next=withPresentationSurface(project,'floor','yosemite-honey');assert.equal(next.layouts.floor.pattern,'third');assert.equal(next.layouts.floor.height,.2);assert.deepEqual(next.items,project.items);assert.equal(project.floor,undefined);
 const walls=withPresentationSurface(next,'wall','allure-eden');assert.equal(walls.walls[0].color,'eden');assert.deepEqual(walls.items,project.items);assert.throws(()=>withPresentationSurface(project,'floor','unknown'));
});

for(const variant of ['studio-one','randal-general'])test(variant+': capability is computed from the upstream account, never from request flags',async()=>{
 const previous=globalThis.fetch;let code='LRF-00321';
 globalThis.fetch=async()=>({ok:true,json:async()=>({success:true,client:{id:'synthetic-presentation',codeClient:code,departement:'46',societe:'Synthetic RANDAL',partenaires:['randal']}})});
 try{
  const {default:handler}=await import('../'+variant+'/api/commercial.js');
  async function request(){let result;await handler({method:'POST',headers:{host:'fixture.vercel.app',authorization:'Bearer synthetic-session-abcdefghijklmnopqrstuvwxyz'},body:{action:'session',codeClient:'LRF-99999',isAdmin:true,configuratorAccess:{mode:'standard',allowWorkshop:true}}},{setHeader(){},status(value){this.code=value;return this;},json(value){result={status:this.code,value};}});return result;}
  const restricted=await request();assert.equal(restricted.status,200);assert.deepEqual(restricted.value.configuratorAccess,{mode:'presentation',allowWorkshop:false});
  code='LRF-00322';const other=await request();assert.deepEqual(other.value.configuratorAccess,{mode:'standard',allowWorkshop:true});
 }finally{globalThis.fetch=previous;}
});
