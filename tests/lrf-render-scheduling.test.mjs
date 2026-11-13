import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import {parse} from 'acorn';
import {RenderActivity} from '../shared/lrf-3d/render-activity.js';

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
  const counts={commerce:0,checkpoint:0,raf:0,render:0,lights:0,pause:0};const phases=[];
  const context=vm.createContext({unrealRender:null,
   sceneUpdates:{defer:()=>false},refreshCommerce:()=>counts.commerce++,scheduleProjectCheckpoint:()=>counts.checkpoint++,
   fitCompositionLights:()=>counts.lights++,applyArchitecturalGlass(){},lightweightMaterials:{apply(){}},
   performance:{now:()=>1000},requestAnimationFrame:()=>counts.raf++,
   renderActivity:new RenderActivity(),applyRenderPhase:()=>phases.push('phase'),renderProfile:()=>context.quality.profile,dragController:null,partitionDragController:null,productDragController:null,isMobile:false,
   state:{ready:true,orbit:false},quality:{profile:{id:'fluid'},sample:()=>false,pause:()=>counts.pause++},
   running:false,captureBusy:false,document:{hidden:false},lastTime:0,lastMove:0,frames:0,
   shadowsDirty:false,sceneRevision:0,scene:{},camera:{position:{z:1}},roomGroup:{},roomScene:null,showroomLighting:null,wall:{},
   composition:{items:[]},viewTween:null,controls:{update:()=>false},walkMode:{active:true,tick:()=>false},
   visitorAvatar:{tick:()=>false},renderDimensions(){},ultraPipeline:null,renderer:{render:()=>counts.render++}
  });
  vm.runInContext(bodies,context);
  return {context,counts,phases,run:code=>vm.runInContext(code,context)};
 }
 test(app+': camera changes draw without refreshing commerce',()=>{
  const f=fixture();f.run('invalidate(false,false)');
  assert.deepEqual(f.counts,{commerce:0,checkpoint:0,raf:1,render:0,lights:0,pause:0});
  f.run('invalidate(true,false)');assert.equal(f.counts.commerce,1);assert.equal(f.counts.checkpoint,0);
  f.run('invalidate(false,true)');assert.equal(f.counts.commerce,2);assert.equal(f.counts.checkpoint,1);
 });
 test(app+': async material completion notifies Unreal without changing native shadows or commerce',()=>{
  const f=fixture();let signals=0;f.context.unrealRender={invalidate:()=>signals++};
  f.run('invalidate(false,false)');assert.equal(signals,1);
  assert.equal(f.context.sceneRevision,0);assert.equal(f.context.shadowsDirty,false);
  assert.equal(f.counts.commerce,0);assert.equal(f.counts.checkpoint,0);
  f.context.sceneUpdates.defer=()=>true;f.run('invalidate(false,false)');assert.equal(signals,1,'deferred batches do not signal unfinished materials');
 });
 test(app+': stationary first person visit sleeps and movement wakes it',()=>{
  const f=fixture();f.run('running=true;animate(1000)');
  assert.equal(f.counts.render,1);assert.equal(f.counts.raf,0);assert.equal(f.context.running,false);
  f.run('walkMode.tick=()=>true;invalidate(false,false);animate(1100)');
  assert.equal(f.counts.render,2);assert.equal(f.counts.raf,2);assert.equal(f.counts.commerce,0);
 });
 for(const mode of ['editing orbit','first-person walking'])test(app+': '+mode+' keeps one final settled frame then sleeps without perpetual rendering',()=>{
  const f=fixture();
  // Orbit motion belongs to the editor. A visit owns its camera and reports
  // movement through tick(), while disabled OrbitControls stay untouched.
  f.run(mode==='editing orbit'?'walkMode.active=false;controls.update=()=>true':'walkMode.tick=()=>true');
  f.run('running=true;animate(1000)');
  assert.equal(f.context.renderActivity.active,true);assert.equal(f.phases.length,1);assert.equal(f.counts.raf,1);
  f.run('controls.update=()=>false;walkMode.tick=()=>false;animate(1179)');assert.equal(f.context.renderActivity.active,true);assert.equal(f.counts.raf,2);
  f.run('animate(1180)');assert.equal(f.context.renderActivity.active,false);assert.equal(f.phases.length,2,'one transition refreshes final optical detail');assert.equal(f.counts.render,3);assert.equal(f.counts.raf,2,'the final settled frame schedules no more work');assert.equal(f.context.running,false);assert.equal(f.counts.commerce,0);assert.equal(f.counts.checkpoint,0);
 });
 test(app+': avatar animation and orbit keep drawing',()=>{
  const f=fixture();f.run('visitorAvatar.tick=()=>true;animate(1000)');assert.equal(f.counts.raf,1);
  f.run('visitorAvatar.tick=()=>false;state.orbit=true;animate(1100)');assert.equal(f.counts.raf,2);
 });
 test(app+': background tab pauses all drawing',()=>{
  const f=fixture();f.run('document.hidden=true;running=true;animate(1000)');
  assert.equal(f.counts.render,0);assert.equal(f.counts.raf,0);assert.equal(f.context.running,false);assert.equal(f.counts.pause,1);
 });
 test(app+': dimension overlay only replaces changed SVG markup',()=>{
  const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='renderDimensions');
  let replacements=0,serialized='';
  const svg={setAttribute(){},get innerHTML(){return serialized;},set innerHTML(value){replacements++;serialized=value.replace('/>','></path>');}};
  const context=vm.createContext({unrealRender:null,$:selector=>selector==='#dimension-svg'?svg:{hidden:false},
   state:{dimensions:true},selectedDimensions:false,lastDimensionMarkup:null,stage:{clientWidth:800,clientHeight:600},
   composition:{},camera:{},dimensionSegments:()=>[],projectDimensions:()=>[],dimensionMarkup:()=>'<path d="M0 0"/>'});
  vm.runInContext(source.slice(node.start,node.end),context);
  vm.runInContext('renderDimensions();renderDimensions();',context);
  assert.equal(replacements,1,'SVG browser serialization must not defeat the markup cache');
  context.dimensionMarkup=()=>'<path d="M1 1"/>';vm.runInContext('renderDimensions()',context);assert.equal(replacements,2);
 });
}
