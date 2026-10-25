import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionCandidates} from '../../shared/lrf-3d/partition-presets.js';
import {validateRoom,roomPreset} from '../../shared/lrf-3d/room.js';
import {partitionUpdate} from '../../shared/lrf-3d/partition-editing.js';
test('ready-made partitions fit rectangular, L and clockwise plans without changing boundaries',()=>{
 for(const room of [roomPreset('rectangle'),roomPreset('l'),{...roomPreset('rectangle'),points:[[0,0],[0,450],[450,450],[450,0]]}])for(const id of ['full','low']){
 const before=JSON.stringify(room),draft=partitionCandidates(room,id).find(c=>!validateRoom(c,0));assert(draft);assert.equal(JSON.stringify(room),before);const p=draft.partitions.at(-1);assert.equal(p.thickness,8);assert.equal(Math.round(Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1])),120);assert.equal(p.height,id==='full'?260:120);assert.equal(p.fullHeight,id==='full');if(id==='low')assert.deepEqual(p.profileEdges,{a:'Argent',b:'Argent',top:'Argent'});
 }
});
test('quarter-turn keeps the partition centre, dimensions and independent profiles',()=>{
 const room=partitionCandidates(roomPreset('rectangle'),'low').find(c=>!validateRoom(c,0)),p=room.partitions[0],next=partitionUpdate(room,0,{rotate:true}).partitions[0];assert.equal(next.a[0]+next.b[0],p.a[0]+p.b[0]);assert.equal(next.a[1]+next.b[1],p.a[1]+p.b[1]);assert.equal(Math.hypot(next.b[0]-next.a[0],next.b[1]-next.a[1]),120);assert.deepEqual(next.profileEdges,p.profileEdges);
});
