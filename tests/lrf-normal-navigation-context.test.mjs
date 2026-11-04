import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import * as T from 'three';
import {translateCameraForKey,navigationInputTarget} from '../shared/lrf-3d/navigation.js';
import {createVisitInteractions,visitOpenState} from '../shared/lrf-3d/visit-interactions.js';
import {WINDOW_AMBIENCES,windowAmbience} from '../shared/lrf-3d/window-ambiences.js';
import {makeOpening} from '../shared/lrf-3d/openings.js';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';

for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])test('normal '+key+' translates the camera and target together without orbiting or changing height',()=>{
 const camera=new T.PerspectiveCamera(),target=new T.Vector3(0,1,0);camera.position.set(0,1,3);let updated=0;
 const controls={target,update(){updated++;}},offset=camera.position.clone().sub(target),before=camera.position.clone();
 assert.equal(translateCameraForKey(camera,controls,key,{step:.2}),true);
 assert.deepEqual(camera.position.clone().sub(target).toArray(),offset.toArray());assert.equal(camera.position.y,1);assert.equal(updated,1);
 const delta=camera.position.clone().sub(before);
 const expected=key==='ArrowLeft'?[-.2,0,0]:key==='ArrowRight'?[.2,0,0]:key==='ArrowUp'?[0,0,-.2]:[0,0,.2];for(const [i,value]of delta.toArray().entries())assert(Math.abs(value-expected[i])<1e-12);
});

test('normal translation follows the current heading and remains finite for a vertical view',()=>{
 const camera=new T.PerspectiveCamera(),controls={target:new T.Vector3(2,1,0),update(){}};camera.position.set(0,1,0);
 translateCameraForKey(camera,controls,'ArrowUp');assert(camera.position.x>0);assert.equal(camera.position.z,0);
 camera.position.set(0,3,0);controls.target.set(0,0,0);camera.lookAt(controls.target);assert(translateCameraForKey(camera,controls,'ArrowLeft'));
 assert(camera.position.toArray().every(Number.isFinite));assert.equal(translateCameraForKey(camera,controls,'Escape'),false);
});

function visitFixture(){
 const settings={width:120,height:100,windowType:'casement',windowOpen:false,exteriorAmbience:'coast'},asset=makeOpening('window',settings);asset.setOpenProgress(.37);
 const window={id:'window',type:'window',settings,asset,motion:{window:.37},placement:{wall:1,u:160,height:90},locked:true};
 const cabinet={id:'cabinet',type:'cabinet',settings:{drawers:[0,0]},asset:{drawers:[new T.Group(),new T.Group()]},placement:{wall:0,u:140,height:28},locked:true};
 const door={id:'door',type:'door',settings:{doorOpen:false},asset:makeOpening('door',{width:83,height:204,color:'white'}),placement:{wall:3,u:120,height:0},locked:true};
 const items=[cabinet,window,door],events=[];
 const visit=createVisitInteractions({getItems:()=>items,onChange:e=>{events.push(e);if(e.item.type==='window')e.item.asset.setExteriorAmbience(windowAmbience(e.item.settings.exteriorAmbience).id);}});
 return {items,window,cabinet,door,visit,events,dispose(){for(const item of items){const geometries=new Set(),materials=new Set();item.asset.root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}}};
}

const original=readFileSync(new URL('../studio-one/src/app.js',import.meta.url),'utf8');
for(const [app,source] of [
 ['Studio One',original],
 ['Catalogue Général',readFileSync(new URL('../randal-general/src/app.js',import.meta.url),'utf8')],
 ['Neobath Anima',transformCommonStudioSource(original,'app.js')]
]){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const names=['itemInspectorTarget','windowActionLabel','contextOpeningAction','contextWindowAmbiences','itemContextActions'];
 const bodies=ast.body.filter(n=>n.type==='FunctionDeclaration'&&names.includes(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n');
 function context(f,{visiting=true,locked=true}={}){
  const composition={items:f.items,selectedId:f.cabinet.id},selected=[];
  const c=vm.createContext({t:x=>x,visitOpenState,WINDOW_AMBIENCES,composition,visitInteractions:f.visit,projectWorkspace:{locked},walkMode:{active:visiting},captureBusy:false,
   selectedDimensions:false,isItemPositionLocked:()=>true,selectItem:id=>selected.push(id),openInspector(){},duplicateSelected(){},removeItem(){},toggleItemDimensions(){},refreshInspector(){},invalidate(){},renovation:{}});
  vm.runInContext(bodies,c);return {c,selected};
 }
 test(app+': locked visit right-click offers opening and exact window ambience choices without selecting or editing layout',()=>{
  const f=visitFixture(),saved=JSON.stringify(f.items.map(i=>({settings:i.settings,placement:i.placement,locked:i.locked})));f.visit.begin({transient:true});
  try{
   const {c,selected}=context(f),actions=c.itemContextActions(f.window,{editTarget:'window'});
   assert.deepEqual(Array.from(actions,a=>a.id),['window-open',...WINDOW_AMBIENCES.map(a=>'window-ambience-'+a.id)]);
   assert(actions.every(a=>!a.disabled));assert(!actions.some(a=>['duplicate','lock','remove','options'].includes(a.id)));
   assert(actions.find(a=>a.id==='window-open').run());assert.equal(f.window.settings.windowOpen,true);
   assert(actions.find(a=>a.id==='window-ambience-mountains').run());assert.equal(f.window.settings.exteriorAmbience,'mountains');assert.equal(f.window.asset.getExteriorAmbience(),'mountains');
   assert.deepEqual(selected,[]);assert.equal(c.composition.selectedId,f.cabinet.id);
   const cabinetAction=c.itemContextActions(f.cabinet)[0];assert.equal(cabinetAction.label,'Ouvrir');assert(cabinetAction.run());assert.deepEqual(f.cabinet.settings.drawers,[1,1]);
   assert.equal(c.itemContextActions(f.cabinet)[0].label,'Fermer');assert(c.itemContextActions(f.door)[0].run());assert.equal(f.door.settings.doorOpen,true);
   f.visit.end();assert.equal(JSON.stringify(f.items.map(i=>({settings:i.settings,placement:i.placement,locked:i.locked}))),saved);assert.equal(f.window.asset.getOpenProgress(),.37);assert.equal(f.window.asset.getExteriorAmbience(),'coast');assert(f.events.every(e=>e.transient));
  }finally{f.dispose();}
 });
 test(app+': normal context actions preserve global read-only protection and reject stale items',()=>{
  const f=visitFixture();try{
   const {c}=context(f,{visiting:false,locked:true}),action=c.itemContextActions(f.window).find(a=>a.id==='window-open');assert(action.disabled);assert.equal(action.run(),false);assert.equal(f.window.settings.windowOpen,false);
   c.projectWorkspace.locked=false;const live=c.itemContextActions(f.window).find(a=>a.id==='window-open');assert(!live.disabled);assert(live.run());assert.equal(f.window.settings.windowOpen,true);
   c.composition.items=c.composition.items.filter(i=>i!==f.window);assert.equal(live.run(),false,'a detached menu cannot mutate a removed object');
   assert.equal(f.visit.setAmbience(f.window.id,'unknown'),false);
  }finally{f.dispose();}
 });
 test(app+': keyboard controller leaves inputs, menus, modifiers and visits alone while retaining wheel-independent zoom keys',()=>{
  const makeUI=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='makeUI');
  const listener=makeUI.body.body.find(n=>n.type==='ExpressionStatement'&&n.expression.type==='CallExpression'&&n.expression.arguments[0]?.value==='keydown'&&source.slice(n.start,n.end).includes('navigationInputTarget'));
  assert(listener,'normal keyboard controller is installed');const fn=listener.expression.arguments[1];
  const canvas={closest:()=>null},camera=new T.PerspectiveCamera(),controls={target:new T.Vector3(0,1,0),update(){}};camera.position.set(0,1,3);
  const calls=[],body={},doc={body,activeElement:canvas},c=vm.createContext({navigationInputTarget,translateCameraForKey,camera,controls,canvas,document:doc,stage:{contains:target=>target===canvas},walkMode:{active:false},$:()=>({open:false}),zoom:v=>calls.push(['zoom',v]),stopOrbit:()=>calls.push(['stop']),viewTween:{},invalidate:(...args)=>calls.push(['invalidate',...args])});
  c.handler=vm.runInContext('('+source.slice(fn.start,fn.end)+')',c);let prevented=0;
  const e={key:'ArrowLeft',target:canvas,preventDefault(){prevented++;}};c.handler(e);assert(camera.position.x<0);assert.deepEqual(calls.at(-1),['invalidate',false,false]);assert.equal(prevented,1);
  const before=camera.position.clone();for(const patch of [{ctrlKey:true},{altKey:true},{metaKey:true},{defaultPrevented:true},{target:{closest:()=>({})}}])c.handler({...e,...patch});assert(camera.position.equals(before));
  c.walkMode.active=true;c.handler(e);assert(camera.position.equals(before));c.walkMode.active=false;c.handler({...e,key:'+'});assert.deepEqual(calls.at(-1),['zoom',.88]);
 });
}

test('shared right-click dispatcher permits only visit actions in locked visits and never selects the item',()=>{
 const source=readFileSync(new URL('../shared/lrf-3d/workspace-ui.js',import.meta.url),'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const mount=ast.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='mountWorkspaceUI').declaration;
 const event=mount.body.body.find(n=>n.type==='ExpressionStatement'&&n.expression.type==='CallExpression'&&n.expression.arguments[0]?.value==='contextmenu').expression.arguments[1];
 const item={id:'window',label:'Fenêtre 1'},canvas={closest:()=>null},actions=[{id:'window-open',label:'Ouvrir la fenêtre'}],calls=[];
 let visiting=true,readonly=true,hit={itemId:item.id};
 const api={mobile:()=>false,readonly:()=>readonly,visiting:()=>visiting,pick:()=>hit,composition:()=>({items:[item]}),select:()=>calls.push('select'),itemActions:()=>actions,contextActions:()=>{calls.push('edit-surface');return [];}};
 const c=vm.createContext({api,canvas,menu:{contains:()=>false},showMenu:(_e,title,list)=>calls.push({title,actions:list})});
 const handler=vm.runInContext('('+source.slice(event.start,event.end)+')',c),e={target:canvas,preventDefault(){},stopImmediatePropagation(){}};
 handler(e);assert.equal(calls.length,1);assert.equal(calls[0].title,'Fenêtre 1');assert.equal(calls[0].actions,actions);
 calls.length=0;visiting=false;handler(e);assert.deepEqual(calls,[],'a locked non-visit design stays protected');
 readonly=false;handler(e);assert.equal(calls[0],'select');
 calls.length=0;visiting=true;hit={editTarget:'wall'};handler(e);assert.deepEqual(calls,[],'visits cannot open a surface editing menu');
});
