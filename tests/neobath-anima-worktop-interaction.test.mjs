import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import {normalizeCabinetRoles} from '../functions/neobath-anima/studio-adapter/cabinet-role.js';
import {cabinetFormat,cabinetProduct} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {validateProject,ProjectJournal} from '../functions/neobath-anima/studio-adapter/projects.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
import {transferPlan,findWorktopSnap,setupWorktopDragging,isCustomWorktop,isWorktopHit} from '../functions/neobath-anima/studio-adapter/worktop-interaction.js';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {transformWorktopInteraction} from '../functions/neobath-anima/studio-adapter/worktop-transform.mjs';

const cabinet=(id,u,width=80,format='pura-base-two')=>({id,type:'cabinet',settings:{format,width,top:'bare',finish:'rovere-alba',drawers:[0,0],grass:false,tap:'existing-'+id},placement:{wall:0,u,height:30}});
function project(){const source=cabinet('source',100),target=cabinet('target',300);Object.assign(source.settings,{top:'tfx1-linear-top',topSpan:80,topOffset:0,topLength:120,topShift:0,topDepth:55,basinOffsetX:0,basinOffsetZ:0,topSurfaceId:'fenix-blu-shaba',topPriceKey:'fenix'});return validateProject(normalizeCabinetRoles({version:2,room:{points:[[0,0],[450,0],[450,450],[0,450]]},items:[source,target]}));}
const frame=(id,x,y=.82,z=0,rotation=0)=>({id,center:{x,y,z},tangent:{x:Math.cos(rotation),z:-Math.sin(rotation)},rotation});

test('worktop transfers without changing stock cabinet identity or duplicating its tariff',()=>{
 const draft=project(),before=structuredClone(draft),quote=quoteProject(draft),moved=transferPlan(draft,'source','target',{topShift:12});
 assert.deepEqual(draft,before);assert.equal(moved.project.items[0].settings.top,'bare');
 const target=moved.project.items[1];
 for(const key of ['format','width','finish','drawers','grass','tap'])assert.deepEqual(target.settings[key],before.items[1].settings[key]);
 for(const key of ['top','topLength','topDepth','topSurfaceId','topPriceKey','basinOffsetX','basinOffsetZ'])assert.equal(target.settings[key],before.items[0].settings[key]);
 assert.equal(target.settings.topShift,12);assert.deepEqual(target.placement,before.items[1].placement);
 assert.equal(quoteProject(moved.project).publicTTC,quote.publicTTC);assert.equal(quoteProject(moved.project).subtotal,quote.subtotal);assert.ok(moved.project.items.every(item=>cabinetFormat(item.settings.format).subtype==='base'));assert.equal(cabinetProduct(target.settings.format,target.settings.width).ref,'APUR-BA8052');
 assert.equal(quoteProject(moved.project).rows.filter(row=>row.ref==='TFX1').length,1);
 const journal=new ProjectJournal();journal.seed(draft);journal.record(moved.project);assert.deepEqual(journal.undo(),draft);assert.deepEqual(journal.redo(),moved.project);
});

test('a custom deck carries its exact basin, arbitrary offsets, depth and colour prices to its new owner',()=>{
 let draft=project();Object.assign(draft.items[0].settings,{top:'tpgea12-b938-1-basin',topPlanId:'tpgea12-linear-top',basinOffsetX:5,basinOffsetZ:-2,basinColor:'white-matte',basinPriceKey:'white-matte',topPriceKey:'white-matte',topSurfaceId:'geacril-white-matte'});
 draft=normalizeCabinetRoles(draft);validateProject(draft);const before=quoteProject(draft),moved=transferPlan(draft,'source','target');
 const target=moved.project.items[1].settings;
 for(const key of ['top','topPlanId','topLength','topDepth','basinOffsetX','basinOffsetZ','basinColor','basinPriceKey','topPriceKey','topSurfaceId'])assert.equal(target[key],draft.items[0].settings[key],key);
 assert.equal(quoteProject(moved.project).publicTTC,before.publicTTC);assert.equal(quoteProject(moved.project).subtotal,before.subtotal);assert.equal(cabinetFormat(moved.project.items[0].settings.format).subtype,'base');assert.equal(cabinetFormat(target.format).subtype,'vanity');assert.equal(cabinetProduct(target.format,target.width).ref,'APUR-PL8052');
 assert.equal(quoteProject(moved.project).rows.filter(row=>row.ref==='B938').length,1);
 assert.equal(quoteProject(moved.project).rows.filter(row=>row.ref==='TPGEA12').length,1);
});

test('snap rehosts onto genuine adjacent supports and rejects gaps and incompatible levels',()=>{
 const draft=project();draft.items[1].settings.width=60;draft.items[1].placement.u=270;draft.items.push(cabinet('companion',330,60));
 const frames=[frame('source',1),frame('target',2.7),frame('companion',3.3)],snap=findWorktopSnap(draft,'source',{x:3,y:.82,z:.02},{frames});
 assert.ok(snap);assert.equal(snap.context.span,120);assert.deepEqual(snap.context.ids,['target','companion']);assert.equal(snap.position.x,3);
 assert.deepEqual(snap.project.items.map(item=>item.placement),draft.items.map(item=>item.placement));
 draft.items[2].placement.u+=1;
 assert.throws(()=>transferPlan(draft,'source','target',{supportIds:['target','companion']}),/juxtaposés/);
 draft.items[2].placement.u-=1;draft.items[2].placement.height+=1;
 assert.throws(()=>transferPlan(draft,'source','target',{supportIds:['target','companion']}),/juxtaposés/);
 assert.equal(findWorktopSnap(draft,'source',{x:6,y:.82,z:0},{frames}),null);
 assert.equal(findWorktopSnap(draft,'source',{x:3,y:1.4,z:0},{frames}),null);
});

test('occupied and locked supports cannot receive a plan and an invalid drop loses no selection',()=>{
 const draft=project(),original=structuredClone(draft);
 draft.items[1].settings.top='tpc80-cover';assert.throws(()=>transferPlan(draft,'source','target'),/autre plan/);
 draft.items[1].settings.top='bare';draft.items[1].locked=true;assert.throws(()=>transferPlan(draft,'source','target'),/Déverrouillez/);
 delete draft.items[1].locked;draft.locked=true;assert.throws(()=>transferPlan(draft,'source','target'),/Déverrouillez/);
 draft.items.forEach(item=>item.positionUnlocked=true);assert.equal(transferPlan(draft,'source','target').targetId,'target');
 delete draft.locked;draft.items.forEach(item=>delete item.positionUnlocked);assert.deepEqual(draft,original);
 assert.throws(()=>transferPlan(draft,'source','target',{topShift:100}),/couvrir/);
});

test('a bare companion covered by another continuous plan is not overwritten',()=>{
 const draft=project();draft.items[1].placement.u=280;draft.items.push(cabinet('covered',360));
 Object.assign(draft.items[1].settings,{top:'tpgea12-linear-top',topSpan:160,topOffset:40,topLength:160});
 assert.throws(()=>transferPlan(draft,'source','covered'),/autre plan/);
});

function canvasFixture(){
 const handlers=new Map(),captured=new Set();return {handlers,captured,
  addEventListener(name,handler,capture){assert.equal(capture,true);const all=handlers.get(name)||[];all.push(handler);handlers.set(name,all);},
  removeEventListener(name,handler){handlers.set(name,(handlers.get(name)||[]).filter(fn=>fn!==handler));},
  setPointerCapture(id){captured.add(id);},hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),
  emit(name,{x=0,y=0,id=1,time=0,...extra}={}){const event={pointerId:id,button:0,clientX:x,clientY:y,timeStamp:time,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};for(const fn of handlers.get(name)||[]){fn(event);if(event.stopped)break;}return event;}
 };
}
function controllerFixture(){
 const canvas=canvasFixture(),controls={enabled:true},draft=project(),events=[],item=draft.items[0];
 const hit={itemId:item.id,object:{userData:{animaWorktopTarget:true}}};
 const controller=setupWorktopDragging({canvas,controls,getProject:()=>draft,getItem:id=>draft.items.find(item=>item.id===id),pick:()=>hit,
  getCentre:()=>({x:1,y:.82,z:0}),pointOnPlane:event=>({x:event.clientX/100,y:.82,z:event.clientY/100}),getFrames:()=>[frame('source',1),frame('target',3)],
  isLocked:item=>!!item.locked,onSelect:id=>events.push(['select',id]),onTap:hit=>events.push(['tap',hit.editTarget]),onStart:()=>events.push(['start']),onPreview:preview=>events.push(['preview',preview]),onRestore:()=>events.push(['restore']),onCommit:result=>{events.push(['commit',result]);return true;},onEnd:result=>events.push(['end',result]),status:message=>events.push(['status',message])});
 return {canvas,controls,draft,item,events,controller};
}

test('clicking the top opens its menu; dragging moves only its preview and commits once',()=>{
 const fx=controllerFixture();let cabinetEvents=0;fx.canvas.addEventListener('pointerdown',()=>cabinetEvents++,true);
 fx.canvas.emit('pointerdown');fx.canvas.emit('pointerup',{x:2,time:100});assert.ok(fx.events.some(event=>event[0]==='tap'&&event[1]==='basin'));assert.equal(cabinetEvents,0);
 fx.events.length=0;const before=structuredClone(fx.draft);
 fx.canvas.emit('pointerdown');fx.canvas.emit('pointermove',{x:200,time:50});fx.canvas.emit('pointermove',{x:201,time:60});
 assert.equal(fx.controls.enabled,false);assert.deepEqual(fx.draft,before);assert.equal(fx.events.filter(event=>event[0]==='start').length,1);
 fx.canvas.emit('pointerup',{x:201,time:100});
 assert.equal(fx.events.filter(event=>event[0]==='commit').length,1);assert.equal(fx.events.find(event=>event[0]==='commit')[1].targetId,'target');assert.equal(fx.controls.enabled,true);assert.equal(fx.controller.getActive(),null);assert.equal(fx.canvas.captured.size,0);
 assert.ok(fx.events.findIndex(event=>event[0]==='restore')<fx.events.findIndex(event=>event[0]==='commit'));
});

test('invalid placement, lost capture, Escape and a second finger restore the plan without committing',()=>{
 for(const mode of ['outside','cancel','lost','escape','multitouch']){
  const fx=controllerFixture();let cabinetEvents=0;fx.canvas.addEventListener('pointerdown',()=>cabinetEvents++,true);
  fx.canvas.emit('pointerdown');fx.canvas.emit('pointermove',{x:200,time:20});
  if(mode==='outside'){fx.canvas.emit('pointermove',{x:800,time:30});fx.canvas.emit('pointerup',{x:800,time:100});}
  if(mode==='cancel')fx.canvas.emit('pointercancel');if(mode==='lost')fx.canvas.emit('lostpointercapture');if(mode==='escape')fx.controller.cancel();
  if(mode==='multitouch'){fx.canvas.emit('pointerdown',{id:2,time:40});fx.canvas.emit('pointermove',{id:1,x:220});fx.canvas.emit('pointerup',{id:2});fx.canvas.emit('pointerup',{id:1});assert.equal(cabinetEvents,0);}
  assert.equal(fx.events.filter(event=>event[0]==='commit').length,0,mode);assert.equal(fx.controls.enabled,true);assert.equal(fx.controller.getActive(),null);
  assert.ok(fx.events.some(event=>event[0]==='restore'),mode);
 }
});

test('fixed and bare decks remain clickable but do not start a custom worktop drag',()=>{
 const fx=controllerFixture();fx.item.settings.top='tpc80-cover';delete fx.item.settings.topLength;
 assert.equal(isCustomWorktop(fx.item),false);assert.equal(isWorktopHit({object:{userData:{},parent:{userData:{animaTop:{}}}}}),true);
 fx.canvas.emit('pointerdown');fx.canvas.emit('pointermove',{x:20});fx.canvas.emit('pointerup',{x:20,time:100});
 assert.ok(!fx.events.some(event=>event[0]==='start'));fx.controller.dispose();assert.equal(fx.canvas.handlers.get('pointerdown').length,0);
});

test('the production transform installs first, excludes project checkpoints during preview and cancels on restore',()=>{
 const source=transformWorktopInteraction(transformCommonStudioSource(readFileSync('studio-one/src/app.js','utf8'),'app.js'));
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const setup=source.indexOf('function setupPicking(){');assert.ok(source.indexOf('__animaMountWorktopDrag();',setup)<source.indexOf('mountPanelPointerGuard',setup));
 assert.match(source,/function scheduleProjectCheckpoint\(\)\{if\(__animaWorktopDrag\?\.getActive\(\)\?\.dragging\)return;/);
 const restore=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='restoreProject');assert.ok(restore);
 const restoreSource=source.slice(restore.start,restore.end);
 for(const controller of ['__animaWorktopDrag','__animaFurnitureAccessoryPicking'])assert.ok(restoreSource.includes(controller+'?.cancel();'),controller+' must cancel its active gesture before restoring the project');
 const escapeBranches=[];
 const visit=node=>{if(!node||typeof node!=='object')return;if(node.type==='IfStatement'&&node.test.type==='BinaryExpression'&&node.test.right?.value==='Escape')escapeBranches.push(source.slice(node.consequent.start,node.consequent.end));for(const child of Object.values(node))if(Array.isArray(child))child.forEach(visit);else if(child&&typeof child==='object')visit(child);};visit(ast);
 const escape=escapeBranches.find(branch=>branch.includes('__animaWorktopDrag?.cancel();'));assert.ok(escape,'Escape cancels the active worktop gesture');
 assert.ok(escape.includes('__animaFurnitureAccessoryPicking?.cancel();'),'the same Escape branch cancels the active accessory gesture');
 assert.match(source,/onTap:hit=>\{__animaSelectWorktopHost\(hit.itemId\);openInspector\('basin'\)/);
});
