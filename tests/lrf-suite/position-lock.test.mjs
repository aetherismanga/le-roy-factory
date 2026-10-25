import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeRoom,DEFAULT_ROOM} from '../../shared/lrf-3d/room.js';
import {isItemPositionLocked,setItemPositionLock,setCompositionPositionLock} from '../../shared/lrf-3d/position-lock.js';
import {ProjectJournal,encodeProject,decodeProject} from '../../studio-one/src/projects.js';

for(const name of ['studio-one','randal-general']){
 const {Composition}=await import('../../'+name+'/src/composition.js');
 test(name+': global lock is inherited by new elements and individual unlock permits only their movement',()=>{
  const room=makeRoom(DEFAULT_ROOM,0),comp=new Composition(room),add=(type,u)=>comp.add(type,{root:new T.Group()},{width:80,height:100,format:'two'},{wall:0,u,height:type==='window'?100:28}).item;
  const first=add('window',100);setCompositionPositionLock(comp,true);const second=add('window',300);
  assert(isItemPositionLocked(comp,first));assert(isItemPositionLocked(comp,second),'Elements added after locking inherit the actual lock');
  const before={...second.placement};assert.match(comp.move(second.id,{u:330}).error,/verrouillé/);
  setItemPositionLock(comp,second,false);assert.equal(comp.locked,true,'Room remains protected');assert(!isItemPositionLocked(comp,second));
  assert.equal(comp.move(second.id,{u:330}).error,undefined);assert.equal(second.placement.u,330);assert.equal(first.placement.u,100);
  assert.match(comp.move(first.id,{u:140}).error,/verrouillé/);assert.match(comp.resize(first,{...first.dimensions,width:.9}),/verrouillé/);
  assert.equal(comp.resize(second,{...second.dimensions,width:.9}),'');assert.equal(comp.remove(first.id),null);
  const snapshot=comp.snapshot();assert.equal(snapshot[1].positionUnlocked,true);assert.equal(snapshot[0].positionUnlocked,undefined);
  const data=decodeProject(encodeProject({version:2,room:DEFAULT_ROOM,renovation:{locked:true},items:snapshot}));
  assert.equal(data.items[1].positionUnlocked,true);assert(isItemPositionLocked(data.renovation,data.items[0]));assert(!isItemPositionLocked(data.renovation,data.items[1]));
  const journal=new ProjectJournal();journal.seed(data);setItemPositionLock(comp,second,true);journal.record({...data,items:comp.snapshot()});
  assert.equal(journal.undo().items[1].positionUnlocked,true);assert.equal(journal.redo().items[1].positionUnlocked,undefined);
  setItemPositionLock(comp,second,false);setCompositionPositionLock(comp,false);assert.equal(second.positionUnlocked,undefined);assert(!isItemPositionLocked(comp,second));
  setCompositionPositionLock(comp,true);assert(isItemPositionLocked(comp,second),'Global relock resets individual exceptions');assert.notDeepEqual(second.placement,before);
  const next=makeRoom(DEFAULT_ROOM,0);assert.match(comp.setRoom(next),/composition/);next.dispose();room.dispose();
 });
 test(name+': tray movement respects effective locks of attached screens',()=>{
  const room=makeRoom(DEFAULT_ROOM,0),comp=new Composition(room),tray=comp.add('shower',{root:new T.Group()},{width:140,depth:100},{wall:0,u:200,height:0}).item;
  assert(tray);const screen=comp.add('screen',{root:new T.Group()},{width:80,screen:'fixed',metal:'Chrome brillant',trayId:tray.id,edge:'left'},{}).item;assert(screen);
  setCompositionPositionLock(comp,true);setItemPositionLock(comp,tray,false);assert.match(comp.move(tray.id,{u:250}).error,/verrouillé/);
  setItemPositionLock(comp,screen,false);assert.equal(comp.move(tray.id,{u:250}).error,undefined);assert.equal(tray.placement.u,250);
  const before={...tray.placement};setItemPositionLock(comp,screen,true);assert.match(comp.previewMove(tray.id,{u:280}).error,/verrouillé/);assert.deepEqual(tray.placement,before);
  room.dispose();
 });
}

test('legacy locks remain effective and explicit unlocks never affect the other elements',()=>{
 const legacy={locked:true,items:[{locked:false},{locked:true}]};assert(legacy.items.every(i=>isItemPositionLocked(legacy,i)));
 setItemPositionLock(legacy,legacy.items[0],false);assert(!isItemPositionLocked(legacy,legacy.items[0]));assert(isItemPositionLocked(legacy,legacy.items[1]));
 setCompositionPositionLock(legacy,false);assert(!isItemPositionLocked(legacy,legacy.items[0]));assert(isItemPositionLocked(legacy,legacy.items[1]),'Personal locks survive global unlock');
});
