import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/elios-pose-official-previews-v1.js',import.meta.url),'utf8');
const block=source.slice(source.indexOf('  async function paintLarge(){'),source.indexOf('  window.LRF_ELIOS_POSE_OFFICIAL_PREVIEW='));
function fixture(){
 const current={dataset:{pattern:'29'}},badge={textContent:''},box={dataset:{poseOrigin:'official'},image:null,replacements:0,classList:{add(){},remove(){}},querySelector(){return this.image;},replaceChildren(image){this.image=image;this.replacements++;}};
 let sourceJob=()=>Promise.resolve('sample.webp'),decode=()=>Promise.resolve(),creates=0;
 const context=vm.createContext({window:{},document:{querySelector:()=>current,getElementById:id=>id==='ep-preview'?box:id==='ep-preview-badge'?badge:{textContent:'Schéma 29'}},C:{'29':true},srcFor:()=>sourceJob(),officialImg:src=>{creates++;return {src,complete:true,naturalWidth:200,decode:()=>decode()};},console});
 vm.runInContext(block+';this.paint=paintLarge;',context);
 return {box,badge,paint:()=>context.paint(),source:fn=>sourceJob=fn,decode:fn=>decode=fn,creates:()=>creates};
}
test('official PDF preview waits for decoding and reuses its ready image during printing',async()=>{
 const f=fixture();let resolve;f.decode(()=>new Promise(r=>resolve=r));const paint=f.paint();await new Promise(r=>setImmediate(r));assert.equal(f.box.replacements,0);resolve();await paint;
 assert.equal(f.box.replacements,1);assert.equal(f.badge.textContent,'ELIOS 2026 · OFFICIEL');await f.paint();assert.equal(f.box.replacements,1);assert.equal(f.creates(),1);
});
test('an official crop cannot overwrite a creative colour preview before or after an asynchronous lookup',async()=>{
 const f=fixture();f.box.dataset.poseOrigin='lrf';await f.paint();assert.equal(f.creates(),0);
 f.box.dataset.poseOrigin='official';let resolve;f.source(()=>new Promise(r=>resolve=r));const paint=f.paint();f.box.dataset.poseOrigin='lrf';resolve('sample.webp');await paint;assert.equal(f.box.replacements,0);
});
