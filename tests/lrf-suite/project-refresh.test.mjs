import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectRefreshBatch,sameProjectPlacement} from '../../shared/lrf-3d/project-refresh.js';

test('restore batches dependent scene/UI work without deferring logical state',()=>{
 const frames=[],batch=createProjectRefreshBatch({requestFrame:callback=>frames.push(callback)}),calls=[],state={layout:'old'};
 function profiles(){if(batch.defer('profiles',profiles))return;calls.push('profiles:'+state.layout);}
 function quantities(){if(batch.defer('quantities',quantities))return;calls.push('quantities:'+state.layout);}
 function materials(){if(batch.defer('materials',materials))return;calls.push('materials:'+state.layout);profiles();}
 function composition(){if(batch.defer('composition',composition))return;calls.push('composition');profiles();}
 function layouts(){if(batch.defer('layouts',layouts))return;calls.push('layouts:'+state.layout);quantities();}
 batch.begin();for(let i=0;i<5;i++){materials();profiles();layouts();composition();}state.layout='restored';assert.deepEqual(calls,[]);batch.end();
 assert.deepEqual(calls,['materials:restored','composition','layouts:restored','profiles:restored','quantities:restored']);assert.equal(frames.length,0,'Synchronous restore is fully committed before returning');
 for(const count of Object.values(batch.diagnostics().executed))assert.equal(count,1);
});

test('many decoded faces share one frame update and explicit texture-ready flush is synchronous',()=>{
 const frames=[],batch=createProjectRefreshBatch({requestFrame:callback=>frames.push(callback)});let materials=0,layouts=0;
 function renderMaterials(){if(batch.defer('materials',renderMaterials))return;materials++;}
 function renderLayouts(){if(batch.defer('layouts',renderLayouts))return;layouts++;}
 for(let i=0;i<40;i++){batch.schedule('materials',renderMaterials);batch.schedule('layouts',renderLayouts);}
 assert.equal(frames.length,1);assert.equal(materials,0);batch.flush();assert.equal(materials,1);assert.equal(layouts,1);
 frames.shift()();assert.equal(materials,1,'An obsolete frame cannot repeat an explicitly flushed HD update');
 batch.schedule('materials',renderMaterials);frames.shift()();assert.equal(materials,2,'A later real material change still renders');
});

test('cancelled transaction cannot replay work against a rejected candidate room',()=>{
 const frames=[],batch=createProjectRefreshBatch({requestFrame:callback=>frames.push(callback)});let changed=0;
 batch.schedule('materials',()=>changed++);batch.begin();batch.schedule('profiles',()=>changed++);batch.cancel();frames.forEach(run=>run());assert.equal(changed,0);assert.equal(batch.diagnostics().depth,0);
 batch.begin();batch.schedule('materials',()=>changed++);batch.end();assert.equal(changed,1);
});

test('an already exact saved placement skips only a redundant move',()=>{
 assert(sameProjectPlacement({wall:0,u:120,height:28},{wall:0,u:120,height:28,offset:0,rotation:0}));
 for(const patch of [{wall:1},{u:121},{height:29},{offset:1},{rotation:90}])assert(!sameProjectPlacement({wall:0,u:120,height:28},{wall:0,u:120,height:28,...patch}));
 assert(!sameProjectPlacement(null,{wall:0}));assert(!sameProjectPlacement({wall:0,u:120,height:0},{u:120,height:0}));assert(!sameProjectPlacement({wall:0,u:120,height:0},{wall:0,u:120}));
});

test('batched visual redraws preserve every pending user-edit effect in either order',()=>{
 for(const scheduled of [false,true])for(const reverse of [false,true]){
  const frames=[],batch=createProjectRefreshBatch({requestFrame:run=>frames.push(run)}),calls=[];
  function invalidate(shadows=true,changed=true){if(batch.defer('invalidate',invalidate,[shadows,changed]))return;calls.push([shadows,changed]);}
  const effects=reverse?[[false,false],[true,false],[false,true]]:[[false,true],[true,false],[false,false]];
  if(!scheduled)batch.begin();
  for(const flags of effects)if(scheduled)batch.schedule('invalidate',invalidate,flags);else invalidate(...flags);
  if(scheduled)frames.shift()();else batch.end();
  assert.deepEqual(calls,[[true,true]],'A texture redraw must not erase a pending project edit or shadow refresh');
 }
});
