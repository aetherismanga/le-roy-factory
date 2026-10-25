import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {resolveProductPlacement,productPreviewTransform} from '../../shared/lrf-3d/product-placement-drag.js';
import {Composition as Studio} from '../../studio-one/src/composition.js';
import {Composition as General} from '../../randal-general/src/composition.js';
const pointing=(from,to)=>new T.Ray(new T.Vector3(...from),new T.Vector3(...to).sub(new T.Vector3(...from)).normalize());
for(const [name,Type] of [['Studio',Studio],['Général',General]]){
 test(name+': direct wall drop targets the finite wall, clamps the whole frame and does not create a product',()=>{
  const room=makeRoom(DEFAULT_ROOM,0),composition=new Type(room),product={type:'window',settings:{width:120,height:100},dimensions:{width:1.2,height:1,depth:.07,base:0},placement:{height:100},isFloor:false};
  try{const result=resolveProductPlacement({ray:pointing([0,1.5,4],[0,1.5,-.23]),composition,product});assert.equal(result.error,'');assert.equal(result.placement.wall,0);assert.equal(result.placement.u,225);assert.equal(result.placement.height,100);assert.equal(composition.items.length,0);const transform=productPreviewTransform(room,product,result.placement);assert.equal(transform.position.x,0);assert.equal(transform.position.y,1.5);assert.equal(transform.rotation,0);
   const edge=resolveProductPlacement({ray:pointing([0,1.5,4],[2.24,1.5,-.23]),composition,product});assert.equal(edge.error,'');assert.equal(edge.placement.u,388);
  }finally{room.dispose();}
 });
 test(name+': direct floor drop accounts for footprint, flush wall snap and outside-room rejection',()=>{
  const room=makeRoom(DEFAULT_ROOM,0),composition=new Type(room),product={type:'shower',settings:{width:120,depth:90},dimensions:{width:1.2,height:.035,depth:.9,base:0},placement:{height:0},isFloor:true};
  try{
   let result=resolveProductPlacement({ray:pointing([0,4,1.8],[0,0,1.8]),composition,product});assert.equal(result.error,'');assert.equal(result.placement.wall,0);assert.equal(result.placement.u,225);assert.equal(result.placement.offset,158);assert.equal(result.placement.height,0);
   result=resolveProductPlacement({ray:pointing([0,4,-.12],[0,0,-.12]),composition,product});assert.equal(result.error,'');assert.equal(result.placement.offset,0);
   result=resolveProductPlacement({ray:pointing([50,4,50],[50,0,50]),composition,product});assert.equal(result.placement,null);assert.match(result.error,/intérieur/);
  }finally{room.dispose();}
 });
 test(name+': preview refuses collisions and impossible dimensions instead of silently moving the requested item',()=>{
  const room=makeRoom(DEFAULT_ROOM,0),composition=new Type(room),settings={width:120,height:100},dimensions={width:1.2,height:1,depth:.07,base:0},asset={root:new T.Group()},added=composition.add('window',asset,settings,{wall:0,u:225,height:100});assert(added.item);
  try{const product={type:'window',settings,dimensions,isFloor:false},result=resolveProductPlacement({ray:pointing([0,1.5,4],[0,1.5,-.23]),composition,product});assert.match(result.error,/occupe/);assert.equal(result.placement.u,225);assert.equal(composition.items.length,1);assert.equal(composition.items[0].placement.u,225);
   const large=resolveProductPlacement({ray:pointing([0,1.5,4],[0,1.5,-.23]),composition,product:{...product,dimensions:{...dimensions,width:5}}});assert.equal(large.placement,null);assert.match(large.error,/grand/);
  }finally{room.dispose();}
 });
 test(name+': shower screens snap to a real tray and preserve the mounting reference in commit options',()=>{
  const room=makeRoom(DEFAULT_ROOM,0),composition=new Type(room),asset={root:new T.Group()},tray=composition.add('shower',asset,{width:120,depth:90},{wall:0,u:225,height:0,offset:30});assert(tray.item);
  try{const screen={type:'screen',settings:{width:80,screen:'fixed'},dimensions:{width:.8,height:1.95,depth:.01,base:0},isFloor:true},result=resolveProductPlacement({ray:pointing([-.5,4,.5],[-.5,0,.5]),composition,product:screen});assert.equal(result.error,'');assert.equal(result.options.trayId,tray.item.id);assert.equal(result.placement.height,3.5);assert(result.options.edge);const missing=resolveProductPlacement({ray:pointing([0,4,1],[0,0,1]),composition:{...composition,room,items:[]},product:screen});assert.match(missing.error,/receveur/);
  }finally{room.dispose();}
 });
}
