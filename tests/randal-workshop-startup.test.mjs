import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountRandalWorkshopAccess} from '../shared/lrf-3d/randal-workshop-access.js';

test('workshop consumes its commerce identity without opening a second session or flashing a modal',()=>{
 const names=['window','parent','document','location','addEventListener','setTimeout','clearTimeout'],before=Object.fromEntries(names.map(n=>[n,globalThis[n]]));
 const events=new Map(),timers=new Map(),inputs=new Map();let sequence=0,factories=0,dialogs=0,removed=0,redirect='';
 const dialog={open:false,setAttribute(){},addEventListener(){},contains(){return false;},append(){},showModal(){this.open=true;dialogs++;},close(){this.open=false;},remove(){removed++;}};
 try{
  Object.assign(globalThis,{window:{},parent:{},location:{replace:url=>redirect=url},document:{createElement:()=>dialog,body:{append(){}},addEventListener:(n,fn)=>inputs.set(n,fn),removeEventListener:n=>inputs.delete(n)},addEventListener:(n,fn)=>events.set(n,fn),setTimeout:fn=>{timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id)});
  const controller=mountRandalWorkshopAccess(()=>{factories++;throw Error('duplicate identity');});
  let blocked=false;inputs.get('click')({preventDefault(){blocked=true;},stopImmediatePropagation(){}});assert(blocked);
  events.get('lrf-identity')({detail:{known:true,pending:false,client:{codeClient:'LRF-99998'}}});
  assert.equal(factories,0);assert.equal(dialogs,0);assert.equal(removed,1);assert.equal(timers.size,0);
  inputs.get('click')({preventDefault(){throw Error('verified input must pass');}});
  events.get('lrf-identity')({detail:{known:true,error:'later quote unavailable'}});assert.equal(dialogs,0);
  events.get('lrf-identity')({detail:{known:true,client:{codeClient:'LRF-00321'},configuratorAccess:{mode:'presentation',allowWorkshop:false}}});assert.equal(redirect,'index.html?view=quote');controller.dispose();
 }finally{for(const n of names){if(before[n]===undefined)delete globalThis[n];else globalThis[n]=before[n];}}
});
