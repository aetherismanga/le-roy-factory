import test from 'node:test';
import assert from 'node:assert/strict';
import {configuratorAccess,isRandalPresentation} from '../shared/lrf-3d/randal-client-access.js';
import {RANDAL_FLOORS,RANDAL_WALLS,presentationChoice,withPresentationSurface} from '../shared/lrf-3d/randal-presentation-catalog.js';
import * as T from 'three';
import {createRandalPresentationScene} from '../shared/lrf-3d/randal-presentation-scene.js';
import {configurePresentationCamera,PRESENTATION_MAX_POLAR,createPresentationEditing} from '../shared/lrf-3d/randal-presentation-editing.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

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
  for(const c of RANDAL_WALLS)assert.equal(await presentation.setSurface('wall',c.id),true);
  await presentation.setSurface('floor','slate-beige');const material=scene.getObjectByName('Présentation_floor').children[0].material;assert.equal(material.map.repeat.x,.5,'official rectangular sample is cropped to square, never stretched');assert.equal(material.map.repeat.y,1);assert.equal(material.map.offset.x,.25);
  await presentation.setSurface('floor','yosemite-honey');assert.deepEqual([presentation.diagnostics().layouts.floor.width,presentation.diagnostics().layouts.floor.height,presentation.diagnostics().layouts.floor.pattern],[1.2,.2,'third']);
  await assert.rejects(presentation.setSurface('floor','allure-eden'));assert.equal(JSON.stringify(input),unchanged,'presentation mechanisms never edit the source furniture/project');
 }finally{presentation.dispose();Object.assign(globalThis,originals);}
});

test('floor and wall selections remain separate, bounded and use the requested layouts',()=>{
 assert.equal(RANDAL_FLOORS.length,3);assert.deepEqual(RANDAL_FLOORS.map(x=>[x.collection,x.color,x.width,x.height,x.pattern]),[['Yosemite','honey',1.2,.2,'third'],['Creta','caramello',1.2,.6,'straight'],['Slate','gold',.6,.6,'straight']]);
 assert.deepEqual(RANDAL_WALLS.filter(c=>c.collection==='Peinture').map(c=>c.name),['Blanc cassé','Ivoire','Sable','Sauge','Argile','Gris perle','Anthracite']);
 assert(RANDAL_WALLS.every(c=>['Peinture','Stone Icon','Allure'].includes(c.collection)));
 assert.equal(RANDAL_WALLS.filter(c=>c.collection==='Allure'&&c.decor).length,4);assert.equal(RANDAL_WALLS.filter(c=>c.collection==='Allure'&&!c.decor).length,5);
 assert.equal(presentationChoice('wall','stone-icon-leccese').format,'60x90');
 assert.equal(presentationChoice('floor','allure-eden'),null);assert.equal(presentationChoice('wall','yosemite-honey'),null);
 const project={room:{points:[[0,0],[450,0],[450,450],[0,450]]},items:[{id:'cabinet',settings:{finish:'ROBLE'}}],walls:[{collection:'Creta'}]};
 const next=withPresentationSurface(project,'floor','yosemite-honey');assert.equal(next.layouts.floor.pattern,'third');assert.equal(next.layouts.floor.height,.2);assert.deepEqual(next.items,project.items);assert.equal(project.floor,undefined);
 const walls=withPresentationSurface(next,'wall','paint-sand');assert.equal(walls.walls[0].color,'sand');assert.deepEqual(walls.items,project.items);assert.throws(()=>withPresentationSurface(project,'floor','unknown'));assert.equal(withPresentationSurface(project,'wall','allure-eden').walls[0].color,'eden');
});

test('the Slate Gold sample is the unchanged original identified by Elios',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../shared/lrf-3d/media/randal-presentation/provenance.json',import.meta.url)));
 const sample=readFileSync(new URL('../shared/lrf-3d/media/randal-presentation/slate-gold-elios.jpg',import.meta.url));
 assert.equal(createHash('sha256').update(sample).digest('hex'),provenance.sha256);assert.equal(provenance.source,'https://eliosceramica.com/wp-content/uploads/2023/05/slate_gold_zoom.jpg');
 assert.equal(RANDAL_FLOORS[2].texture.source,provenance.source);
});

test('the presentation orbit never crosses the floor or the back of the display wall',()=>{
 const controls={};configurePresentationCamera(controls);assert.equal(controls.maxPolarAngle,PRESENTATION_MAX_POLAR);assert(controls.maxPolarAngle<Math.PI/2);assert.equal(controls.enablePan,false);
 for(const height of [.3,.8,1.5])for(const distance of [.8,3,6])for(const angle of [controls.minPolarAngle,controls.maxPolarAngle])assert(height+Math.cos(angle)*distance>0);
 assert(controls.minAzimuthAngle>-Math.PI/2&&controls.maxAzimuthAngle<Math.PI/2);
});

for(const variant of ['studio-one','randal-general'])test(variant+': furniture moves on its wall, collisions are refused and hinge reversal survives reopening',async()=>{
 const {buildPreview}=await import('../'+variant+'/src/commerce/preview-model.js');const {initialDraft,draftProject}=await import('../'+variant+'/src/commerce/guided.js');
 const source=draftProject(variant==='studio-one'?{...initialDraft(),column:true,mirror:'ilse'}:{...initialDraft('aruba'),column:true,mirror:'ilse'}),before=JSON.stringify(source),preview=buildPreview(source),scene=new T.Scene();scene.add(preview.group);const edits=[];
 const editing=createPresentationEditing({scene,controls:{enabled:true},getItems:()=>preview.items,getProject:()=>source,invalidate(){}});editing.setListener(e=>edits.push(e));
 try{
  const cabinet=preview.items.find(i=>i.type==='cabinet'),column=preview.items.find(i=>i.type==='column'),x=cabinet.wrapper.position.x;
  assert.equal(editing.nudge(-5,0),true);assert(Math.abs(cabinet.wrapper.position.x-(x-.05))<1e-8);assert.equal(edits.at(-1).kind,'placement');
  const u=cabinet.placement.u;assert.equal(editing.nudge(column.placement.u-u,0),false);assert.equal(cabinet.placement.u,u);
  assert.equal(editing.nudge(-1000,0),true);assert(cabinet.placement.u>=cabinet.asset.spec.width*50);
  editing.selectItem(column.id);assert.equal(editing.state().canReverse,true);column.asset.door.rotation.y=-Math.PI*.55;assert.equal(editing.reverseHinge(),true);assert.equal(column.asset.getHingeSide(),'right');assert(Math.abs(column.asset.door.rotation.y-Math.PI*.55)<1e-8,'an already-open door retains its progress on the new hinge side');
  const saved=structuredClone(source);for(const e of edits){const item=saved.items.find(i=>i.id===e.itemId);if(!item)continue;if(e.kind==='placement')item.placement=e.placement;if(e.kind==='hinge')item.settings.hingeSide=e.hingeSide;}
  const reopened=buildPreview(saved);assert.equal(reopened.items.find(i=>i.id===column.id).asset.getHingeSide(),'right');assert.equal(reopened.items.find(i=>i.id===cabinet.id).placement.u,cabinet.placement.u);assert.equal(JSON.stringify(source),before);
 }finally{editing.dispose();}
});

test('real camera rays drive touch dragging and cancel restores placement and orbit controls',async()=>{
 const {buildPreview}=await import('../studio-one/src/commerce/preview-model.js');const {initialDraft,draftProject}=await import('../studio-one/src/commerce/guided.js');const source=draftProject(initialDraft()),preview=buildPreview(source),scene=new T.Scene();scene.add(preview.group);const cabinet=preview.items[0],bounds=new T.Box3().setFromObject(cabinet.wrapper),centre=bounds.getCenter(new T.Vector3()),camera=new T.PerspectiveCamera(36,4/3,.05,100);camera.position.copy(centre).add(new T.Vector3(0,.1,3));camera.lookAt(centre);camera.updateMatrixWorld();
 const handlers=new Map();let captured=null;const canvas={style:{},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:name=>handlers.delete(name),setPointerCapture:id=>captured=id,hasPointerCapture:id=>captured===id,releasePointerCapture:()=>captured=null},controls={enabled:true};
 const editing=createPresentationEditing({scene,camera,controls,canvas,getItems:()=>preview.items,getProject:()=>source,invalidate(){}}),commits=[];editing.setListener(e=>{if(e.kind==='placement')commits.push(e);});editing.setMoving(true);
 const event=(id,x,y)=>({pointerId:id,button:0,clientX:x,clientY:y,preventDefault(){},stopImmediatePropagation(){}}),original=cabinet.placement.u;
 try{
  handlers.get('pointerdown')(event(1,400,300));assert.equal(controls.enabled,false);handlers.get('pointermove')(event(1,350,300));handlers.get('pointerup')(event(1,350,300));assert(cabinet.placement.u<original);assert.equal(controls.enabled,true);assert.equal(commits.length,1);
  const settled={...cabinet.placement};camera.lookAt(new T.Box3().setFromObject(cabinet.wrapper).getCenter(new T.Vector3()));camera.updateMatrixWorld();handlers.get('pointerdown')(event(2,400,300));handlers.get('pointermove')(event(2,360,300));handlers.get('pointercancel')(event(2,360,300));assert.deepEqual(cabinet.placement,settled);assert.equal(controls.enabled,true);assert.equal(commits.length,1);
 }finally{editing.dispose();assert.equal(handlers.size,0);}
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
