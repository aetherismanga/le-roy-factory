import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import * as T from 'three';
import {makeOpening,WINDOW_TYPES,windowType,OPENING_COLORS} from '../../shared/lrf-3d/openings.js';
import {WINDOW_AMBIENCES,windowAmbience} from '../../shared/lrf-3d/window-ambiences.js';
import {AQUAHOME} from '../../shared/lrf-3d/taps.js';
import {buildPhotorealPrompt} from '../../shared/lrf-3d/photoreal-export.js';
import {createHDCapture} from '../../shared/lrf-3d/hd-capture.js';

const functions=['windowOpenTarget','updateWindowMotion','syncWindowVisual','syncWindowStates','windowMotionSnapshot','restoreWindowMotion','updateWindowAppearance','setWindowType','setWindowAmbience','windowActionLabel','toggleRoomWindow','renderWindowAppearance','mountWindowLongPressMenu','getNicheMetalFinish','itemInspectorTarget','itemContextActions','handleObjectTap'];
function host(app){
 const source=readFileSync(new URL(`../../${app}/src/app.js`,import.meta.url),'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const bundle=ast.body.filter(node=>node.type==='FunctionDeclaration'&&functions.includes(node.id.name)).map(node=>source.slice(node.start,node.end)).join('\n');
 const asset=makeOpening('window',{width:120,height:100,color:'anthracite',windowType:'sliding',windowOpen:false,exteriorAmbience:'mediterranean'}),root=new T.Group();root.add(asset.root);
 const item={id:'window-1',type:'window',root,asset,settings:{width:120,height:100,color:'anthracite',windowType:'sliding',windowOpen:false,exteriorAmbience:'mediterranean'},placement:{wall:1,u:170,height:100},motion:{window:0}};
 let current=item,timerId=0;const timers=new Map(),listeners=new Map(),requested=[],fields=[],calls={sync:0,invalidate:0,cancelDrag:0,menu:0,inspector:null};
 const canvas={getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),addEventListener(name,callback){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(callback);}};
 const composition={items:[item],room:{walls:[{key:'wall-0'},{key:'wall-1'}]},get selected(){return current;},sync(){calls.sync++;}};
 const context=vm.createContext({T,WINDOW_TYPES,windowType,WINDOW_AMBIENCES,windowAmbience,OPENING_COLORS,AQUAHOME,makeOpening,composition,quality:{profile:{id:'balanced'}},projectWorkspace:null,captureBusy:false,reduced:false,canvas,scene:{},camera:{},walkMode:null,dragController:{cancel(){calls.cancelDrag++;}},workspaceUI:{showMenu(_event,_title,actions){calls.menu++;calls.actions=actions;}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),pickSelection:()=>({itemId:item.id,editTarget:'window'}),requestWindowAmbience:id=>{requested.push(id);return Promise.resolve();},disposeObject(){},renderComposition(){},refreshInspector(){},placementStatus(){},invalidate(){calls.invalidate++;},closeInspector(){calls.inspector=null;},openInspector:target=>{calls.inspector=target;},selectItem:id=>{current=composition.items.find(item=>item.id===id);},setQualityMode:id=>{context.quality.profile.id=id;return true;},isItemPositionLocked:()=>false,selectedDimensions:false,duplicateSelected(){},removeItem(){},toggleItemDimensions(){},renovation:{tap:()=>false},tileEditing:false,selectedTile:null,highlightIndividualTile(){},document:{createElement:()=>({})},field(_parent,label,value,options,onchange){fields.push({label,value,options,onchange});}});
 vm.runInContext(bundle,context);
 return {context,item,composition,calls,requested,fields,timers,emit:(name,event)=>{for(const callback of listeners.get(name)||[])callback(event);},flush:()=>{for(const [id,callback]of [...timers]){timers.delete(id);callback();}}};
}
for(const app of ['studio-one','randal-general']){
 test(`${app}: context appearance changes preserve size, placement, colour and saved open intent`,()=>{
  const h=host(app),{context:c,item}=h,before=JSON.stringify({placement:item.placement,width:item.settings.width,height:item.settings.height,color:item.settings.color});
  c.quality.profile.id='max';item.settings.windowOpen=true;item.motion.window=.45;item.asset.setOpenProgress(.45);
  assert(c.setWindowType('casement'));assert.equal(item.asset.windowType,'casement');assert.equal(item.asset.getOpenProgress(),.45);
  assert(c.setWindowAmbience('forest-lake'));assert.equal(item.asset.getExteriorAmbience(),'forest-lake');assert(h.requested.includes('forest-lake'));
  assert.equal(JSON.stringify({placement:item.placement,width:item.settings.width,height:item.settings.height,color:item.settings.color}),before);
  const prior=JSON.stringify(item.settings);assert.equal(c.setWindowAmbience('unknown'),false);assert.equal(c.setWindowType('unknown'),false);assert.equal(JSON.stringify(item.settings),prior);
  c.projectWorkspace={locked:true};assert.equal(c.setWindowType('sliding'),false);assert.equal(c.toggleRoomWindow(),false);assert.equal(c.setWindowAmbience('coast'),false);
 });
 test(`${app}: left selection stays closed and context/long press exposes all window appearance`,()=>{
  const h=host(app),c=h.context;c.handleObjectTap({itemId:h.item.id,editTarget:'window'});assert.equal(h.calls.inspector,null);
  const actions=c.itemContextActions(h.item);assert(actions.some(action=>action.id==='appearance'));assert(actions.some(action=>action.id==='window-open'));
  actions.find(action=>action.id==='appearance').run();assert.equal(h.calls.inspector,'window');
  c.renderWindowAppearance({append(){}},h.item);assert.deepEqual(Array.from(h.fields[0].options,choice=>choice.id),['sliding','casement']);assert.equal(h.fields[1].options.length,5);
  c.mountWindowLongPressMenu();const event={pointerType:'touch',button:0,pointerId:1,clientX:50,clientY:50};h.emit('pointerdown',event);h.flush();assert.equal(h.calls.menu,1);assert.equal(h.calls.cancelDrag,1);
  h.emit('pointerup',event);h.emit('pointerdown',event);h.emit('pointermove',{...event,clientX:65});h.flush();assert.equal(h.calls.menu,1,'Dragging keeps moving rather than opening a context menu');
  h.emit('pointerup',event);h.emit('pointerdown',event);h.emit('pointerdown',{...event,pointerId:2});h.flush();assert.equal(h.calls.menu,1,'Pinch gestures never open the window context menu');
 });
 test(`${app}: opening explicitly activates Ultra HD; low quality preserves intent and HD capture restores preview`,async()=>{
  const {context:c,item}=host(app);assert.equal(c.windowActionLabel(item),'Ouvrir en Ultra HD');assert(c.toggleRoomWindow());assert.equal(c.quality.profile.id,'max');assert.equal(item.settings.windowOpen,true);
  assert(c.updateWindowMotion(item,.05));assert(item.asset.getOpenProgress()>0&&item.asset.getOpenProgress()<1);
  c.quality.profile.id='fluid';c.syncWindowStates(true);assert.equal(item.asset.getOpenProgress(),0);assert.equal(item.settings.windowOpen,true);
  const capture=createHDCapture({snapshot:()=>({mode:c.quality.profile.id,windows:c.windowMotionSnapshot()}),prepare:()=>{c.quality.profile.id='max';c.syncWindowStates(true);},render:()=>{assert.equal(item.asset.getOpenProgress(),1);return 'HD';},restore:previous=>{c.quality.profile.id=previous.mode;c.syncWindowStates(true);c.restoreWindowMotion(previous.windows);}});
  assert.equal(await capture(),'HD');assert.equal(item.asset.getOpenProgress(),0);assert.equal(item.settings.windowOpen,true);assert.equal(c.quality.profile.id,'fluid');
  c.quality.profile.id='max';item.motion.window=.42;item.asset.setOpenProgress(.42);const snapshot=c.windowMotionSnapshot();c.syncWindowStates(true);c.restoreWindowMotion(snapshot);assert.equal(item.asset.getOpenProgress(),.42);
 });
 test(`${app}: niche profiles use the nearest actual AquaHome finish on the same wall`,()=>{
  const {context:c,composition}=host(app),pick=(finish,use='basin')=>AQUAHOME.find(p=>p.finish===finish&&p.use===use).reference;
  composition.items.push({id:'far-cabinet',type:'cabinet',settings:{tap:pick('Or brossé')},placement:{wall:1,u:100},asset:{getBasinCenters:()=>[-.25,.25]}},{id:'near-tap',type:'tap',settings:{tap:pick('Noir mat','shower')},placement:{wall:1,u:200}},{id:'other-wall',type:'tap',settings:{tap:pick('Cuivre','shower')},placement:{wall:0,u:120}});
  assert.equal(c.getNicheMetalFinish({wallKey:'wall-1',niche:{u:122}}),'Or brossé','Actual basin centre takes priority by distance');
  assert.equal(c.getNicheMetalFinish({wallKey:'wall-1',niche:{u:199}}),'Noir mat');
  composition.items=[];assert.equal(c.getNicheMetalFinish({wallKey:'wall-2',niche:{u:100}}),'Chrome brillant');
 });
}

test('the private-data-free photoreal brief retains window type, desired opening and exterior ambience',()=>{
 const prompt=buildPhotorealPrompt({room:{height:260,points:[]},items:[{type:'window',settings:{windowType:'casement',windowOpen:true,exteriorAmbience:'coast',purchaseHT:'PRIVATE_WINDOW_PRICE'},placement:{wall:0,u:100,height:100}}]});
 assert(prompt.includes('"windowType": "casement"'));assert(prompt.includes('"windowOpen": true'));assert(prompt.includes('"exteriorAmbience": "coast"'));assert(!prompt.includes('PRIVATE_WINDOW_PRICE'));
});

for(const app of ['studio-one','randal-general'])test(`${app}: window choices survive actual composition snapshot and encoded project recovery`,async()=>{
 const {Composition}=await import(`../../${app}/src/composition.js`),{makeRoom,DEFAULT_ROOM,cloneRoom}=await import(`../../${app}/src/room.js`),{encodeProject,decodeProject}=await import(`../../${app}/src/projects.js`);
 const room=makeRoom(DEFAULT_ROOM,0),composition=new Composition(room),settings={width:120,height:100,color:'anthracite',windowType:'casement',windowOpen:true,exteriorAmbience:'mountains'};
 const added=composition.add('window',makeOpening('window',settings),settings,{wall:1,u:200,height:100});assert(added.item,added.error);
 const data=decodeProject(encodeProject({version:2,room:cloneRoom(DEFAULT_ROOM),items:composition.snapshot()})),restored=new Composition(room),raw=data.items[0],result=restored.add(raw.type,makeOpening(raw.type,raw.settings),raw.settings,raw.placement);
 assert(result.item,result.error);assert.equal(result.item.settings.windowType,'casement');assert.equal(result.item.settings.windowOpen,true);assert.equal(result.item.settings.exteriorAmbience,'mountains');assert.equal(result.item.motion.window,1);assert.equal(result.item.asset.getOpenProgress(),1);assert.deepEqual(result.item.placement,raw.placement);
 room.dispose();
});
