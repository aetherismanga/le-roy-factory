import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisitTapGesture,createVisitInteractions,visitOpeningTarget} from '../../shared/lrf-3d/visit-interactions.js';
import {makeModel as makeStudio} from '../../studio-one/src/model.js';
import {makeModel as makeGeneral} from '../../randal-general/src/model.js';
import {makeOpening} from '../../shared/lrf-3d/openings.js';
import {makeSanitary} from '../../shared/lrf-3d/sanitaries.js';
import {disposeObject} from '../../studio-one/src/composition.js';
import * as T from 'three';
const event=(id,x=100,y=100,time=0,extra={})=>({pointerId:id,clientX:x,clientY:y,timeStamp:time,button:0,...extra});

test('visit click/tap requires a stationary primary short gesture and excludes look, multitouch, long hold, cancellation and navigation',()=>{
 const taps=createVisitTapGesture();
 taps.down(event(1));assert(taps.up(event(1,101,102,100)));
 taps.down(event(2));taps.move(event(2,108,100,30));assert.equal(taps.up(event(2,100,100,100)),false,'Dragging out and back remains a look gesture');
 taps.down(event(3));taps.down(event(4));assert.equal(taps.up(event(4,100,100,100)),false);assert.equal(taps.up(event(3,100,100,100)),false);
 taps.down(event(5));assert.equal(taps.up(event(5,100,100,800)),false);
 taps.down(event(6));taps.cancel();assert.equal(taps.up(event(6,100,100,100)),false);
 taps.down(event(7,100,100,0,{button:2}));assert.equal(taps.up(event(7,100,100,100)),false);
 taps.down(event(8));taps.reset();assert.equal(taps.up(event(8,100,100,100)),false);
});
for(const [name,makeModel] of [['Studio',makeStudio],['General',makeGeneral]])test(name+': a clicked real drawer alone opens, structural locks and placement remain unchanged',()=>{
 const asset=makeModel({includeMirror:false}),item={id:'cabinet',type:'cabinet',asset,root:new T.Group(),settings:{drawers:[0,0],locked:true},placement:{wall:0,u:125,height:28}};item.root.add(asset.root);let count=0;
 const controller=createVisitInteractions({getItems:()=>[item],onChange:()=>count++}),before={...item.placement};
 try{
  const object=asset.drawers[0].children[0];assert.deepEqual(visitOpeningTarget(item,{object}),{kind:'drawer',index:0});
  assert(controller.tap({itemId:'cabinet',object}));assert.deepEqual(item.settings.drawers,[1,0]);assert(controller.tap({itemId:'cabinet',object}));assert.deepEqual(item.settings.drawers,[0,0]);
  assert.equal(controller.tap({itemId:'cabinet',object:asset.cabinet}),false,'Body does not unexpectedly toggle every drawer');assert.equal(count,2);assert.deepEqual(item.placement,before);assert.equal(item.settings.locked,true);
 }finally{disposeObject(item.root);}
});
test('doors, column doors and WC lid can be demonstrated and read-only preview restores original opening state',()=>{
 const doorAsset=makeOpening('door',{width:83,height:204,color:'white'}),wcAsset=makeSanitary('toilet',{reference:'TR2217R'}),items=[{id:'door',type:'door',settings:{doorOpen:false,locked:true},asset:doorAsset},{id:'column',type:'column',settings:{locked:true},asset:{root:new T.Group()}},{id:'wc',type:'toilet',settings:{lidOpen:false,locked:true},asset:wcAsset}];
 const baseline=JSON.stringify(items.map(i=>i.settings));let restored=false;
 const controller=createVisitInteractions({getItems:()=>items,onChange:e=>{if(e.restored)restored=true;}});
 try{
  controller.begin({transient:true});for(const item of items)assert(controller.tap({itemId:item.id,object:item.asset.root}));assert.equal(items[0].settings.doorOpen,true);assert.equal(items[1].settings.doorOpen,true);assert.equal(items[2].settings.lidOpen,true);assert.equal(wcAsset.root.getObjectByName('Abattant').rotation.x,-Math.PI*.48);
  controller.end();assert(restored);assert.equal(JSON.stringify(items.map(i=>i.settings)),baseline);assert.equal(wcAsset.root.getObjectByName('Abattant').rotation.x,0);
 }finally{items.forEach(i=>disposeObject(i.asset.root));}
});
test('ending a preview never restores stale opening fields onto a newly restored item with the same id',()=>{
 const original={id:'door',type:'door',settings:{doorOpen:false}},replacement={id:'door',type:'door',settings:{doorOpen:true}};let items=[original];const controller=createVisitInteractions({getItems:()=>items});controller.begin({transient:true});controller.tap({itemId:'door'});items=[replacement];controller.end();assert.equal(replacement.settings.doorOpen,true);
});
