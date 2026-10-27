import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import {parse} from 'acorn';
import {advanceVisitOpenings} from '../shared/lrf-3d/opening-motion.js';

// Run the actual controller bodies: a camera move must wake drawing without
// collecting/serializing a commercial project or rebuilding its quote.
for(const app of ['studio-one','randal-general']){
 const source=readFileSync(new URL('../'+app+'/src/app.js',import.meta.url),'utf8');
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const bodies=['invalidate','animate'].map(name=>{
  const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);
  assert(node,'Production controller '+name);
  return source.slice(node.start,node.end);
 }).join('\n');
 function fixture(){
  const counts={commerce:0,checkpoint:0,raf:0,render:0,lights:0,pause:0};
  const context=vm.createContext({
   sceneUpdates:{defer:()=>false},refreshCommerce:()=>counts.commerce++,scheduleProjectCheckpoint:()=>counts.checkpoint++,
   fitCompositionLights:()=>counts.lights++,applyArchitecturalGlass(){},lightweightMaterials:{apply(){}},
   performance:{now:()=>1000},requestAnimationFrame:()=>counts.raf++,
   state:{ready:true,orbit:false},quality:{profile:{id:'fluid'},sample:()=>false,pause:()=>counts.pause++},
   running:false,captureBusy:false,document:{hidden:false},lastTime:0,lastMove:0,frames:0,
   shadowsDirty:false,sceneRevision:0,scene:{},camera:{position:{z:1}},roomGroup:{},roomScene:null,wall:{},
   composition:{items:[]},advanceVisitOpenings,reduced:false,drawerTravel:()=>.3,viewTween:null,controls:{update:()=>false},walkMode:{active:true,tick:()=>false},
   visitorAvatar:{tick:()=>false},glassReflections:null,isMobile:false,renderDimensions(){},ultraPipeline:null,renderer:{render:()=>counts.render++}
  });
  vm.runInContext(bodies,context);
  return {context,counts,run:code=>vm.runInContext(code,context)};
 }
 test(app+': camera changes draw without refreshing commerce',()=>{
  const f=fixture();f.run('invalidate(false,false)');
  assert.deepEqual(f.counts,{commerce:0,checkpoint:0,raf:1,render:0,lights:0,pause:0});
  f.run('invalidate(true,false)');assert.equal(f.counts.commerce,1);assert.equal(f.counts.checkpoint,0);
  f.run('invalidate(false,true)');assert.equal(f.counts.commerce,2);assert.equal(f.counts.checkpoint,1);
 });
 test(app+': stationary first person visit sleeps and movement wakes it',()=>{
  const f=fixture();f.run('running=true;animate(1000)');
  assert.equal(f.counts.render,1);assert.equal(f.counts.raf,0);assert.equal(f.context.running,false);
  f.run('walkMode.tick=()=>true;invalidate(false,false);animate(1100)');
  assert.equal(f.counts.render,2);assert.equal(f.counts.raf,2);assert.equal(f.counts.commerce,0);
 });
 test(app+': avatar animation and orbit keep drawing',()=>{
  const f=fixture();f.run('visitorAvatar.tick=()=>true;animate(1000)');assert.equal(f.counts.raf,1);
  f.run('visitorAvatar.tick=()=>false;state.orbit=true;animate(1100)');assert.equal(f.counts.raf,2);
 });
 test(app+': explicit Ultra visitor keeps scheduling between its 30 fps pose updates',()=>{
  const f=fixture();f.run('visitorAvatar.enabled=true;visitorAvatar.tick=()=>false;animate(1000)');
  assert.equal(f.counts.raf,1,'A skipped pose tick must not freeze idle gestures or a pending reach');
  f.run('visitorAvatar.enabled=false;animate(1100)');assert.equal(f.counts.raf,1,'An ordinary stationary visit still sleeps');
 });
 test(app+': background tab pauses all drawing',()=>{
  const f=fixture();f.run('document.hidden=true;running=true;animate(1000)');
  assert.equal(f.counts.render,0);assert.equal(f.counts.raf,0);assert.equal(f.context.running,false);assert.equal(f.counts.pause,1);
 });
 test(app+': dimension overlay only replaces changed SVG markup',()=>{
  const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='renderDimensions');
  let replacements=0,serialized='';
  const svg={setAttribute(){},get innerHTML(){return serialized;},set innerHTML(value){replacements++;serialized=value.replace('/>','></path>');}};
  const context=vm.createContext({$:selector=>selector==='#dimension-svg'?svg:{hidden:false},
   state:{dimensions:true},selectedDimensions:false,lastDimensionMarkup:null,stage:{clientWidth:800,clientHeight:600},
   composition:{},camera:{},dimensionSegments:()=>[],projectDimensions:()=>[],dimensionMarkup:()=>'<path d="M0 0"/>'});
  vm.runInContext(source.slice(node.start,node.end),context);
  vm.runInContext('renderDimensions();renderDimensions();',context);
  assert.equal(replacements,1,'SVG browser serialization must not defeat the markup cache');
  context.dimensionMarkup=()=>'<path d="M1 1"/>';vm.runInContext('renderDimensions()',context);assert.equal(replacements,2);
 });
}
