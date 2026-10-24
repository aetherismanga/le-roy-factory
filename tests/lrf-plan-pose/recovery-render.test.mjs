import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,tileLayout,quantity} from '../../assets/js/lrf-plan-pose/core.mjs';
import {calculateExact} from '../../assets/js/lrf-plan-pose/calculation-worker.mjs';
import {restoreLayout,CalculationQueue} from '../../assets/js/lrf-plan-pose/calculations.mjs';
import {renderTileCells} from '../../assets/js/lrf-plan-pose/viewport.mjs';

const make=(side=1000,size=5)=>{const r=newRoom([[0,0],[side,0],[side,side],[0,side]]);r.tile.width=size;r.tile.height=size;r.plinths.enabled=false;return r;};

test('40 000 tiles are calculated exactly outside the UI budget, with progress and cloneable output',()=>{
 const r=make(),progress=[];
 assert.equal(tileLayout(r,1).code,'layout-budget');
 const result=calculateExact({room:r,scale:1,loss:8},v=>progress.push(v));
 assert.equal(result.layout.count,40000);assert.equal(result.q.area,100);assert.equal(result.q.tileCount,40000);assert.equal(result.q.withLoss,108);
 assert.equal(progress.at(-1),1);assert(progress.length>1);assert.doesNotThrow(()=>structuredClone(result));
 const restored=restoreLayout(result.layout,r,1),expected=quantity(r,1,8,tileLayout(r,1,{limit:250000}));
 assert.deepEqual(quantity(r,1,8,restored),expected);
});

test('worker hydration preserves floor/plinth geometry, rotated origins and exact quantities',()=>{
 const r=make(650,10);r.plinths.enabled=true;r.plinths.height=8;r.layout.rotation=90;r.layout.x=12.7;r.layout.y=-18.2;r.tile.allowOffset=true;r.layout.pattern='third';
 const expected=tileLayout(r,1,{limit:250000}),result=calculateExact({room:r,scale:1,loss:10});
 const layout=restoreLayout(result.layout,r,1);
 for(const point of [[0,0],[137.7,23.1],[650,650]])assert.deepEqual(layout.gridPoint(point),expected.gridPoint(point));
 assert.deepEqual(result.q,quantity(r,1,10,expected));
});

test('dense rendering includes every cell and keeps the DOM small without sampling',()=>{
 const r=make(),layout=restoreLayout(calculateExact({room:r,scale:1,loss:8}).layout,r,1);
 const markup=renderTileCells(layout,layout.cells,c=>c.cut?' data-kind="cut"':' data-kind="full"');
 const counts=[...markup.matchAll(/data-tile-count="(\d+)"/g)].map(m=>Number(m[1]));
 assert.equal(counts.reduce((a,b)=>a+b,0),40000);assert.equal((markup.match(/M/g)||[]).length,40000);assert(counts.length<30);
 assert.equal(layout.count,40000);assert.equal(layout.cells.length,40000);
});

test('background memory limit rejects huge grids explicitly instead of returning approximate quantities',()=>{
 assert.throws(()=>calculateExact({room:make(2000,2.5),scale:1,loss:8}),/250 000/);
});

class FakeWorker{
 constructor(){this.messages=[];this.terminated=false;}
 postMessage(data){this.messages.push(data);}
 terminate(){this.terminated=true;}
 deliver(data){this.onmessage({data});}
}
test('queued work is serial, cancelled versions cannot overwrite a newer result',async()=>{
 const workers=[],queue=new CalculationQueue({workerFactory:()=>{const w=new FakeWorker();workers.push(w);return w;}});
 const first=queue.request('room','v1',{room:{}});const rejected=assert.rejects(first,{name:'AbortError'});
 const second=queue.request('room','v2',{room:{}});await rejected;assert(workers[0].terminated);
 workers[0].deliver({id:1,result:{old:true}});
 workers[1].deliver({id:2,result:{correct:true}});assert.deepEqual(await second,{correct:true});
 assert.equal(queue.jobs.size,0);assert(workers[1].terminated);
});
test('clearing pending calculations rejects every promise and terminates active workers',async()=>{
 const workers=[],queue=new CalculationQueue({workerFactory:()=>{const w=new FakeWorker();workers.push(w);return w;}});
 const results=['a','b','c'].map(key=>assert.rejects(queue.request(key,'v1',{}),{name:'AbortError'}));
 queue.clear();await Promise.all(results);assert.equal(queue.jobs.size,0);assert.equal(queue.active,null);assert(workers.every(w=>w.terminated));
});
