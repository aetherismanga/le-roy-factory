import test from 'node:test';
import assert from 'node:assert/strict';
import {createBudgetYearGate} from '../assets/js/elios-expo-budget-state.mjs';

test('a slower old-year response cannot replace a newer selected budget',async()=>{
 let selectedYear=2027,displayed=null;
 const gate=createBudgetYearGate(()=>selectedYear);
 let resolveOld,resolveNew;
 const oldResponse=new Promise(resolve=>{resolveOld=resolve;}),newResponse=new Promise(resolve=>{resolveNew=resolve;});
 async function load(response){const ticket=gate.beginLoad();const value=await response;if(gate.isCurrent(ticket))displayed=value;}
 const oldLoad=load(oldResponse);
 selectedYear=2028;
 const newLoad=load(newResponse);
 resolveNew({year:2028,turnoverHT:200000});await newLoad;
 resolveOld({year:2027,turnoverHT:100000});await oldLoad;
 assert.deepEqual(displayed,{year:2028,turnoverHT:200000});
});

test('a changed selection rejects the old response even before another load starts',()=>{
 let selectedYear=2027;const gate=createBudgetYearGate(()=>selectedYear),ticket=gate.beginLoad();
 selectedYear=2028;
 assert.equal(gate.isCurrent(ticket),false);
 assert.equal(gate.beginWrite({year:2027,turnoverHT:100000}),null);
});

test('a financial write uses the loaded year snapshot and cannot run concurrently',()=>{
 let selectedYear=2027;
 const gate=createBudgetYearGate(()=>selectedYear),displayed={year:2027,turnoverHT:100000};
 const write=gate.beginWrite(displayed);assert.equal(write.year,2027);assert(Object.isFrozen(write));
 selectedYear=2028;
 const payload={action:'save-turnover',year:write.year,turnoverHT:displayed.turnoverHT};
 assert.equal(payload.year,2027,'the mutable selector never changes the target of an in-flight write');
 assert.equal(gate.beginWrite({year:2028}),null,'a second write is blocked until completion');
 gate.finishWrite();
 assert.equal(gate.beginWrite(displayed),null,'stale displayed data cannot be saved under a different selected year');
 assert.equal(gate.beginWrite({year:2028}).year,2028);
});
