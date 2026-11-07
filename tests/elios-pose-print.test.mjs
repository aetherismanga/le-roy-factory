import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/elios-pose-v2-init.js',import.meta.url),'utf8');
function fixture(){
 const elements=new Map();const $=id=>elements.get(id),make=()=>({disabled:false,textContent:'Imprimer',setAttribute(){},after(element){elements.set('#'+element.id,element);}});
 for(const id of ['#ep-surface','#ep-waste','#ep-print','#ep-order'])elements.set(id,make());
 const state={group:'small',last:{pattern:{id:'LRF-1'},rows:[{ref:'one',need:1}]}},S={$, $$:()=>[],state,calculate(){},openOrder(){},renderAll(){}};let prints=0,provider=()=>Promise.resolve();
 const window={LRF_ELIOS_POSE_V2:S,LRF_ELIOS_SMALL_DESIGNS:{whenRendered:()=>provider()},print:()=>prints++};
 vm.runInNewContext(source,{window,document:{createElement:make}});
 return {state,$,prints:()=>prints,provider:fn=>provider=fn};
}
test('printing waits for the current real tile preview, then restores its control',async()=>{
 const f=fixture();let resolve;f.provider(()=>new Promise(r=>resolve=r));const pending=f.$('#ep-print').onclick();
 assert.equal(f.prints(),0);assert.equal(f.$('#ep-print').disabled,true);resolve();await pending;
 assert.equal(f.prints(),1);assert.equal(f.$('#ep-print').disabled,false);assert.equal(f.$('#ep-print').textContent,'Imprimer');
});
test('printing waits for a new palette when it changes during image loading',async()=>{
 const f=fixture(),jobs=[];f.provider(()=>new Promise(r=>jobs.push(r)));const pending=f.$('#ep-print').onclick();f.state.last.rows[0].ref='other';jobs.shift()();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.prints(),0);assert.equal(jobs.length,1);jobs.shift()();await pending;assert.equal(f.prints(),1);
});
test('an unavailable preview gives a readable error and never prints a blank composition',async()=>{
 const f=fixture();f.provider(()=>Promise.reject(Error('Le visuel ne peut pas être chargé.')));await f.$('#ep-print').onclick();
 assert.equal(f.prints(),0);assert.equal(f.$('#ep-print-status').textContent,'Le visuel ne peut pas être chargé.');assert.equal(f.$('#ep-print').disabled,false);
});

test('unavailable Segmento data cannot print a stale or monochrome fallback',async()=>{
 const f=fixture();f.state.group='segmento';await f.$('#ep-print').onclick();
 assert.equal(f.prints(),0);assert.match(f.$('#ep-print-status').textContent,/Segmento est indisponible/);assert.equal(f.$('#ep-print').disabled,false);
});
