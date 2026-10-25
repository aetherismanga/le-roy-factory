import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as T from 'three';
import {createProjectRefreshBatch,sameProjectPlacement} from '../../shared/lrf-3d/project-refresh.js';
import {normalizeProjectSurfaceIdentities} from '../../shared/lrf-3d/surface-identity.mjs';
import {COLLECTIONS,normalizeLayout} from '../../studio-one/src/surface-catalog.js';
import {resolveSurfaceTexture} from '../../studio-one/src/surface-texture-selection.js';

// Execute production controllers and asynchronous material publishers. Only the
// room/DOM/renderer are doubles: no network, image decoding, browser or GPU.
function controller(source,name){
 const match=new RegExp('^(?:async )?function '+name+'\\(','m').exec(source);
 assert(match,'Missing production controller '+name);
 const lineEnd=source.indexOf('\n',match.index),line=source.slice(match.index,lineEnd);
 const end=line.endsWith('}')?lineEnd:source.indexOf('\n}',match.index)+2;
 assert(end>match.index,'Controller boundary changed for '+name);
 return source.slice(match.index,end);
}
const plain=value=>JSON.parse(JSON.stringify(value));
const waitCheckpoint=()=>new Promise(resolve=>setTimeout(resolve,270));

for(const app of ['studio-one','randal-general']){
 const {ProjectJournal,validateProject,migrateProject}=await import('../../'+app+'/src/projects.js');
 const source=readFileSync(new URL('../../'+app+'/src/app.js',import.meta.url),'utf8');
 test(app+' journal canonicalization keeps its redo branch and owns the snapshot',()=>{
  const journal=new ProjectJournal(),a={zone:{x:150}},b={zone:{x:200}};
  assert.equal(journal.replaceCurrent(a),false);journal.seed(a);journal.record(b);journal.undo();
  const canonical={...a,identity:{version:1}};
  assert.equal(journal.replaceCurrent(canonical),true);canonical.identity.version=2;
  assert.equal(journal.entries[0].identity.version,1,'The canonical snapshot must be cloned');
  assert(journal.canRedo);assert.equal(journal.record({...a,identity:{version:1}}),false);
  assert.deepEqual(journal.redo(),b);
 });

 test(app+' async surface and finish preparation preserves two Undo/Redo steps and persistence',async()=>{
  const elements=new Map(),storage=new Map(),frames=[],events=[],errors=[],counts={loads:0,materials:0,finishes:0};
  const $=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',disabled:false,replaceChildren(){},append(){}});return elements.get(id);};
  const finish={collection:'Creta',color:'avena',format:'60x60'};
  const selection=resolveSurfaceTexture(finish.collection,finish.color,'balanced',finish);
  const surface=()=>({layout:{},setLayout(layout){this.layout=layout;},group:{},root:{}});
  const makeRoom=()=>({floor:surface(),walls:Array.from({length:4},surface),metrics:{width:400,depth:300},root:{},setOpenings(){},dispose(){}});
  const base={version:2,title:'Historique',room:{points:[[0,0],[400,0],[400,300],[0,300]],height:250},items:[],floor:{collection:'Shell',color:COLLECTIONS.Shell.colors[0].id},walls:[{...finish,zones:[{id:'column',x:150,y:0,width:120,height:230,...finish}]},finish,finish,finish],layouts:{floor:{},walls:Array.from({length:4},()=>({width:.6,height:.6}))}};
  const keys=new Set(['finish|fixture|balanced',selection.cacheKey]);
  const activeTextureKeys=()=>({finishes:['fixture'],surfaces:[[finish.collection,finish.color,finish]],keys});
  const activeMaterialRequests=()=>({finishes:new Set(['fixture']),surfaces:new Map([[selection.sourceKey,[finish.collection,finish.color,finish]]])});
  const context=vm.createContext({
   T,COLLECTIONS,normalizeLayout,resolveSurfaceTexture,normalizeProjectSurfaceIdentities,validateProject,migrateProject,sameProjectPlacement,
   console,performance,AbortController,Event,setTimeout,clearTimeout,URL,URLSearchParams,structuredClone,
   quality:{profile:{id:'balanced'},mobile:false},renderer:{capabilities:{getMaxAnisotropy:()=>8}},captureBusy:false,running:true,
   FINISHES:[{id:'fixture',texture:'fixture.webp',hex:'#ffffff'}],FINISH_VARIANTS:{},finishTextures:{},surfaceTextures:{},textureCache:new Map(),textureFlights:new Map(),tileFlights:new Map(),finishFlights:new Map(),
   sceneUpdates:createProjectRefreshBatch({requestFrame:run=>frames.push(run)}),activeTextureKeys,activeMaterialRequests,
   textureProfile:()=> 'balanced',textureLimit:()=>4096,tileAssetURL:path=>path,finishTextureURL:f=>f.texture,fitTexture:texture=>texture,prepareFinishTexture:texture=>texture,
   loadQueuedTexture:async()=>{counts.loads++;await new Promise(resolve=>setTimeout(resolve,0));return new T.Texture({width:1122,height:175});},
   pruneTextures(){},pruneUnusedTextures(){},cancelStaleSurfaceFlights(){},disposeTextures(){},
   refreshFurnitureMaterials(){counts.finishes++;},repaintFurnitureMaterials(){counts.finishes++;},
   applyAllRoomMaterials(){counts.materials++;},refreshLayouts(){},refreshCommerce(){},fitCompositionLights(){},applyArchitecturalGlass(){},animate(){},requestAnimationFrame:run=>frames.push(run),
   shadowsDirty:false,sceneRevision:0,lastMove:0,lastTime:0,
   projectWorkspace:null,journal:null,restoring:false,projectTimer:null,textureRefresh:null,state:{ready:true},dragController:{getActive:()=>null,cancel(){}},partitionDragController:{getActive:()=>null,cancel(){}},productDragController:{cancel(){}},
   localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},dispatchEvent:event=>events.push(event.type),markStudioEntryEdited:()=>false,
   location:{href:'https://atelier.invalid/atelier.html',search:''},history:{},$,
   document:{createElement:()=>({})},makeRoom,Composition:class{constructor(){this.items=[];}},composition:{items:[]},roomScene:makeRoom(),roomConfig:base.room,
   validateRoom:()=>'',plinthSettingsError:()=>'',plinthSettings:value=>value||{},remapProfileOverrides:value=>value,
   scene:{add(){},remove(){}},disposeObject(){},cloneRoom:structuredClone,cloneRoomData:structuredClone,
   closeElementPanel(){},closeInspector(){},renderSavedViews(){},renderComposition(){},renderSurfacePalettes(){},paintAsset(){},selectItem(){},
   selectLighting(){},setBrightness(){},setTemperature(){},applyQuality(){},placementStatus:message=>errors.push(message),
   choicesFor:collection=>COLLECTIONS[collection]?.colors||[],GROUT_COLORS:{Ivoire:'#eee'},tiledSurfaces:{},floorDesign:{},wallFinishes:[],
   renovation:{restore(){}},initialRenovation:null,lastProjectRestore:null,plinthConfig:{},plinthSignature:'',profileSettings:{},tileLoss:10,savedViews:[],selectedWall:0,wall:null,tileEditing:false,selectedTile:null,
   collectProject(){return {...structuredClone(base),floor:plain({...context.floorDesign,collection:context.state.floorCollection,color:context.state.floor}),walls:plain(context.wallFinishes)};},
  });
  const names=['invalidate','scheduleProjectCheckpoint','persistCurrentProject','updateHistoryButtons','undoProject','redoProject','restoreProject','requestFinishAssets','requestSurfaceAssets','prepareActiveTextures'];
  if(app==='studio-one')names.push('loadTexture','cacheTextures','refreshWorkingTextures');
  vm.runInContext(names.map(name=>controller(source,name)).join('\n'),context);
  async function textures(){await vm.runInContext('prepareActiveTextures()',context);while(frames.length)frames.shift()();await waitCheckpoint();}
  function x(){return context.collectProject().walls[0].zones[0].x;}
  function storedX(){return JSON.parse(storage.get(app+'-current-project')).walls[0].zones[0].x;}
  function snapshot(value){const data=structuredClone(base);data.walls[0].zones[0].x=value;return data;}
  try{
   assert.equal(vm.runInContext('restoreProject',context)(snapshot(150)),true,errors.join(' '));await textures();
   // These raw entries reproduce a column saved before restore enriches its
   // surface identities. Restoring must canonicalize only the current entry.
   context.journal=new ProjectJournal();context.journal.seed(snapshot(150));context.journal.record(snapshot(200));
   assert.equal(vm.runInContext('restoreProject',context)(snapshot(250)),true);await textures();context.journal.record(context.collectProject());
   const oldLoads=counts.loads;
   for(const expected of [200,150]){
    // Force fresh image/finish completion after each Undo, rather than merely
    // exercising already cached materials.
    context.surfaceTextures={};context.finishTextures={};context.textureCache.clear();
    vm.runInContext('undoProject()',context);assert.equal(x(),expected);assert.equal(storedX(),expected);await textures();
    assert(context.journal.canRedo,'An image-ready callback must not erase Redo');assert.equal($('#redo').disabled,false);assert.equal(storedX(),expected);
   }
   for(const expected of [200,250]){
    context.surfaceTextures={};context.finishTextures={};context.textureCache.clear();
    vm.runInContext('redoProject()',context);assert.equal(x(),expected);assert.equal(storedX(),expected);await textures();
   }
   assert(counts.loads>oldLoads,'The test must actually publish new textures and furniture finishes');
   assert(counts.finishes>0&&counts.materials>0);assert.equal(context.journal.entries.length,3,'No phantom history entries after normalized restores');
   assert.equal(context.journal.canRedo,false);assert(events.includes('lrf-project-checkpoint'));

   // Undo before the 220 ms edit checkpoint: its old timer must not run against
   // the restored scene and cut the newly available Redo branch.
   context.wallFinishes[0].zones[0].x=275;vm.runInContext('invalidate()',context);
   assert.notEqual(context.projectTimer,null);vm.runInContext('undoProject()',context);assert.equal(x(),250);await textures();
   assert(context.journal.canRedo);assert.equal($('#redo').disabled,false);assert.equal(storedX(),250);
   vm.runInContext('redoProject()',context);assert.equal(x(),275);await textures();

   // Intermediate partition positions must not create history entries while
   // the drag is still active. The completed change is recorded on release.
   const entriesBeforeDrag=context.journal.entries.length;
   context.partitionDragController.getActive=()=>({dragging:true});
   vm.runInContext('invalidate()',context);await waitCheckpoint();
   assert.equal(context.projectTimer,null);
   assert.equal(context.journal.entries.length,entriesBeforeDrag);
   context.partitionDragController.getActive=()=>null;

   // A genuine new edit is still recorded and discards the abandoned future.
   vm.runInContext('undoProject()',context);context.wallFinishes[0].zones[0].x=290;vm.runInContext('invalidate()',context);await textures();
   assert.equal(context.journal.canRedo,false);assert.equal($('#redo').disabled,true);assert.equal(storedX(),290);

   // Direct restores also cancel an earlier timer, after validating a candidate.
   context.wallFinishes[0].zones[0].x=300;vm.runInContext('invalidate()',context);const timer=context.projectTimer;
   assert.equal(vm.runInContext('restoreProject',context)({...snapshot(150),version:99}),false);assert.equal(context.projectTimer,timer,'Rejected candidates keep the pending valid edit');
   assert.equal(vm.runInContext('restoreProject',context)(snapshot(200)),true);assert.equal(context.projectTimer,null);await textures();assert.equal(context.journal.entries.at(-1).walls[0].zones[0].x,290,'A direct restore must not commit a stale edit timer');
  }finally{clearTimeout(context.projectTimer);}
 });
}
