import test from 'node:test';
import assert from 'node:assert/strict';
import {cloneRoom,makeRoom,validateRoom} from '../../shared/lrf-3d/room.js';
import {partitionUpdate} from '../../shared/lrf-3d/partition-editing.js';
import {partitionContextActions} from '../../shared/lrf-3d/partition-controls.js';
import {encodeProject,decodeProject} from '../../studio-one/src/projects.js';

const room=()=>({height:260,points:[[0,0],[450,0],[450,450],[0,450]],partitions:[{id:'integrated',a:[100,200],b:[300,200],height:260,thickness:10,fullHeight:true}]});

test('integration survives project export and reopening without changing the room boundary or wall identity',()=>{
 const base=room(),next=partitionUpdate(base,0,{planIntegrated:true}),project={version:2,room:next,items:[],walls:[]};
 assert.equal(base.partitions[0].planIntegrated,undefined);
 assert.deepEqual(next.points,base.points);
 assert.equal(cloneRoom(next).partitions[0].planIntegrated,true);
 assert.equal(decodeProject(encodeProject(project)).room.partitions[0].planIntegrated,true);
 const before=makeRoom(base,0),after=makeRoom(next,0);
 try{assert.deepEqual(after.walls.map(w=>w.key),before.walls.map(w=>w.key));assert.equal(after.walls.length,6);assert.equal(after.walls[4].partitionSide,0);assert.equal(after.walls[5].partitionSide,1);}finally{before.dispose();after.dispose();}
});

test('integrated partitions retain editable dimensions and refuse position changes until explicitly reopened',()=>{
 const base=partitionUpdate(room(),0,{planIntegrated:true}),resized=partitionUpdate(base,0,{length:220,thickness:12,height:240});
 assert.equal(validateRoom(resized,0),'');assert.equal(resized.partitions[0].planIntegrated,true);assert.equal(resized.partitions[0].thickness,12);
 assert.throws(()=>partitionUpdate(base,0,{moveX:10}),/Modifier l’emplacement/);
 assert.throws(()=>partitionUpdate(base,0,{rotate:true}),/Modifier l’emplacement/);
 const moved=partitionUpdate(base,0,{planIntegrated:false,moveX:10});assert.equal(moved.partitions[0].a[0],110);assert.equal(moved.partitions[0].planIntegrated,false);
 assert.throws(()=>partitionUpdate(base,0,{planIntegrated:'yes'}),/invalide/);
 assert(validateRoom({...base,partitions:[{...base.partitions[0],planIntegrated:'yes'}]},0));
});

test('both partition faces accept real openings and keep their attachments through integration and thickness edits in both furniture apps',async()=>{
 for(const app of ['studio-one','randal-general']){
  const {Composition}=await import('../../'+app+'/src/composition.js'),{makeOpening}=await import('../../'+app+'/src/openings.js');
  const base=room(),before=makeRoom(base,0),composition=new Composition(before),settings={width:60,height:60,color:'white'};
  for(const wall of [4,5])assert(composition.add('window',makeOpening('window',settings),settings,{wall,u:wall===4?55:55,height:100}).item);
  const next=partitionUpdate(base,0,{planIntegrated:true,thickness:12}),after=makeRoom(next,0);
  try{assert.equal(composition.setRoom(after),'');assert.deepEqual(composition.items.map(i=>i.placement.wall),[4,5]);after.setOpenings(composition.items);assert.equal(after.walls[4].openings.length,2);assert.equal(after.walls[5].openings.length,2);}finally{before.dispose();after.dispose();}
 }
});

test('right-click offers dimensions, validation, face finishes, layout, niches and openings; integration can be reopened',()=>{
 const calls=[],api={dimensions:()=>calls.push('dimensions'),update:patch=>calls.push(patch),finish(){},layout(){},niche(){},door(){},window(){},remove(){}};
 const first=partitionContextActions(room().partitions[0],api);assert.equal(first.length,8);first[0].run();first[1].run();assert.deepEqual(calls,['dimensions',{planIntegrated:true}]);
 const integrated=partitionContextActions({planIntegrated:true},api);assert.equal(integrated[1].label,'Modifier l’emplacement');integrated[1].run();assert.deepEqual(calls.at(-1),{planIntegrated:false});
 const locked=partitionContextActions({planIntegrated:true},{...api,locked:true,readonly:true});assert(locked[1].disabled);assert(locked.at(-1).disabled);assert.equal(locked[2].disabled,undefined);
});
