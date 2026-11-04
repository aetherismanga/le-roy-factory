import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {RenderActivity} from '../shared/lrf-3d/render-activity.js';
import {AdaptiveQuality,interactionProfile} from '../shared/lrf-3d/performance.js';

test('render activity holds effects during a gesture, settles once, then stays asleep',()=>{
 const activity=new RenderActivity();assert.equal(activity.update(0,false),false);
 assert.equal(activity.update(10,true),true);assert.equal(activity.update(100,true),false);
 assert.equal(activity.update(279,false),false);assert.equal(activity.active,true);
 assert.equal(activity.update(280,false),true);assert.equal(activity.active,false);
 assert.equal(activity.update(1000,false),false);activity.update(1010,true);activity.reset();assert.equal(activity.active,false);
});
for(const app of ['studio-one','randal-general']){
 const source=readFileSync(new URL('../'+app+'/src/app.js',import.meta.url),'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const body=name=>{const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(node,name);return source.slice(node.start,node.end);};
 function fixture(){
  const quality=new AdaptiveQuality(),renderActivity=new RenderActivity(),events=[];quality.setMode('fluid');
  const context=vm.createContext({quality,renderActivity,interactionProfile,isMobile:false,captureBusy:false,
   renderer:{shadowMap:{enabled:true},transmissionResolutionScale:1},scene:{},shadowsDirty:false,sceneRevision:0,
   composition:{items:[{asset:{reflector:{userData:{reflectionSchedule:{reset:()=>events.push('mirror1')}}}}},{asset:{reflector:{userData:{reflectionSchedule:{reset:()=>events.push('mirror2')}}}}}]},
   applyArchitecturalGlass:(_scene,cheap)=>events.push(['glass',cheap]),fitCompositionLights:()=>events.push(['lighting',quality.profile.id]),
  });
  vm.runInContext(body('renderProfile')+'\n'+body('applyRenderPhase'),context);
  return {context,quality,renderActivity,events};
 }
 test(app+': native phase controller keeps crisp density, bypasses moving shadows and refreshes every mirror once settled',()=>{
  const f=fixture(),p=f.quality.profile;f.renderActivity.update(100,true);f.context.applyRenderPhase();
  assert.equal(f.context.renderer.shadowMap.enabled,false);assert.equal(f.context.renderProfile().pixels,p.pixels);
  assert.equal(f.events.filter(x=>typeof x==='string').length,2);assert.equal(f.context.renderProfile().ao,false);
  f.renderActivity.update(280,false);f.context.applyRenderPhase();assert.equal(f.context.renderer.shadowMap.enabled,true);
  assert.equal(f.context.renderProfile(),p);assert.equal(f.events.filter(x=>typeof x==='string').length,4);
  assert.deepEqual(f.events.filter(Array.isArray).filter(x=>x[0]==='lighting').map(x=>x[1]),['fluid','fluid'],'lighting identity cannot change with the moving effects');
  assert.equal(f.context.shadowsDirty,true);
 });
 test(app+': active gesture cannot simplify the explicit HD capture profile',async()=>{
  const f=fixture();f.renderActivity.update(100,true);f.context.captureBusy=true;f.quality.setMode('max');f.context.applyRenderPhase();
  assert.equal(f.context.renderProfile(),f.quality.profile);assert.equal(f.context.renderProfile().ao,true);
  assert.equal(f.context.renderer.shadowMap.enabled,true);assert.equal(f.context.renderProfile().reflection,2048);
 });
 test(app+': native HD preparation explicitly selects max and reloads max textures from a light editing state',async()=>{
  const declarations=ast.body.filter(n=>n.type==='VariableDeclaration').flatMap(n=>n.declarations),name=app==='studio-one'?'captureHD':'captureTransaction',node=declarations.find(n=>n.id.name===name);assert.ok(node,name);
  const quality=new AdaptiveQuality();quality.setMode('fluid');const calls=[];
  const context=vm.createContext({quality,createHDCapture:options=>options,windowLoader:()=>({ensureItems:async()=>{}}),composition:{items:[]},
   prepareActiveTextures:async profile=>calls.push(profile||'current'),finishTextures:{},surfaceTextures:{floor:{},wall:{}},textureProfileOverride:null,
   applyQuality:()=>calls.push('quality:'+quality.profile.id),syncWindowStates:()=>{},renderer:{shadowMap:{},compileAsync:async()=>{}},scene:{},camera:{},disposeTextures:()=>{}});
  const options=vm.runInContext(source.slice(node.init.start,node.init.end),context);
  await options.prepare({finish:{},finishes:{},surfaces:{floor:{},wall:{}}});
  assert.equal(quality.mode,'max');assert.equal(quality.profile.id,'max');assert.ok(calls.includes('max'));assert.ok(calls.includes('quality:max'));
 });
 test(app+': a window opens without upgrading the whole office scene to Ultra',()=>{
  const item={type:'window',settings:{windowOpen:false}},quality=new AdaptiveQuality();quality.setMode('fluid');let upgraded=false;
  const context=vm.createContext({composition:{selected:item},quality,projectWorkspace:{locked:false},captureBusy:false,setQualityMode:()=>upgraded=true,updateWindowMotion:()=>{},renderComposition:()=>{},refreshInspector:()=>{},invalidate:()=>{}});
  vm.runInContext(body('toggleRoomWindow'),context);assert.equal(context.toggleRoomWindow(),true);assert.equal(item.settings.windowOpen,true);assert.equal(quality.profile.id,'fluid');assert.equal(upgraded,false);
 });
}
