import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AdaptiveQuality,QUALITY_PROFILES,MOBILE_STANDARD,MOBILE_LIGHT,renderPixelRatio,profileSizes,interactionProfile,ReflectionSchedule} from '../shared/lrf-3d/performance.js';
import {TEXTURE_LIMITS,textureLimit,surfaceFaceLimit} from '../shared/lrf-3d/texture-budget.js';
import {AdaptiveQuality as AnimaQuality} from '../functions/neobath-anima/studio-adapter/render-quality.js';

const feed=(quality,start,duration,interval)=>{let now=start;for(;now<start+duration;now+=interval)quality.sample(now);return now;};

test('working views retain native office-screen definition rather than stretching a half-million-pixel image',()=>{
 for(const C of[AdaptiveQuality,AnimaQuality])for(const mode of['fluid','balanced'])for(const[width,height]of[[1280,720],[1600,900],[1920,1080]]){
  const q=new C();q.setMode(mode);const ratio=renderPixelRatio(q.profile,width,height,1);
  assert.ok(ratio>=1,`${C.name} ${mode} ${width}x${height} is not upscaled`);
  assert.ok(width*height*ratio*ratio<=q.profile.pixels+1);
 }
 for(const profile of QUALITY_PROFILES.slice(1))assert.ok(profile.anisotropy>=4,'wood grain retains oblique filtering');
 assert.equal(TEXTURE_LIMITS.fluid,1024);assert.equal(textureLimit('fluid',{capabilities:{maxTextureSize:4096}}),1024);
 assert.equal(textureLimit('fluid',{capabilities:{maxTextureSize:512}}),512,'a hardware limit is always respected');
});

test('phone working views have readable density without desktop Ultra allocations',()=>{
 for(const C of[AdaptiveQuality,AnimaQuality])for(const mode of['fluid','balanced']){
  const q=new C({mobile:true});q.setMode(mode);
  assert.ok(renderPixelRatio(q.profile,390,600,1)>=1.3);
  assert.ok(q.profile.pixels<=1400000);
  assert.ok(q.profile.reflection<=256);
  assert.ok(q.profile.anisotropy>=4);
 }
 assert.equal(profileSizes(MOBILE_STANDARD,true).shadow,1024);
 assert.equal(profileSizes(MOBILE_LIGHT,true).shadow,512);
});

test('auto downshifts expensive effects under sustained load, then recovers only to Standard',()=>{
 for(const C of[AdaptiveQuality,AnimaQuality]){
  const q=new C();q.setMode('auto');let now=feed(q,0,5000,45);
  assert.equal(q.profile.id,'fluid');assert.ok(renderPixelRatio(q.profile,1920,1080,1)>=1);
  now=feed(q,now,25000,16);assert.equal(q.profile.id,'balanced');
  feed(q,now,60000,10);assert.equal(q.profile.id,'balanced','fast frames never silently enable Ultra');
 }
});

test('explicit Ultra and HD texture budgets remain independent of the office-PC economy policy',()=>{
 const max=QUALITY_PROFILES[0];assert.equal(max.id,'max');assert.equal(max.pixelRatio,2.5);assert.equal(max.supersampling,1.5);assert.equal(max.pixels,8300000);assert.equal(max.shadow,4096);assert.equal(max.reflection,2048);assert.equal(max.reflectionSamples,4);assert.equal(max.ao,true);
 assert.equal(TEXTURE_LIMITS.max,4096);assert.equal(surfaceFaceLimit('fluid',{export:true}),40);
 for(const C of[AdaptiveQuality,AnimaQuality]){
  const q=new C();q.setMode('max');feed(q,0,10000,70);assert.equal(q.profile,max,'a deliberate maximum/capture is never rewritten by frame sampling');
 }
});

test('gesture effects reuse a stable profile while retaining furniture definition and texture identities',()=>{
 for(const p of[...QUALITY_PROFILES,MOBILE_STANDARD,MOBILE_LIGHT]){
  const moving=interactionProfile(p);assert.equal(moving,interactionProfile(p),'no per-frame profile churn');assert.notEqual(moving,p);
  for(const key of['id','pixelRatio','pixels','supersampling','anisotropy'])assert.equal(moving[key],p[key],key);
  assert.equal(moving.ao,p.ao);assert.ok(moving.reflectionFps<=24);assert.equal(moving.shadow,p.shadow);assert.equal(moving.transmission,p.transmission,'motion retains the existing transmission buffer');
  for(const[width,height,dpr]of[[1600,900,1],[1920,1080,2],[390,600,3]])assert.equal(renderPixelRatio(moving,width,height,dpr),renderPixelRatio(p,width,height,dpr));
 }
 assert.equal(interactionProfile(QUALITY_PROFILES[2]).shadow,QUALITY_PROFILES[2].shadow);
});

test('settled reflections stop recapturing an unchanged scene and can refresh immediately after a phase reset',()=>{
 const schedule=new ReflectionSchedule();assert.equal(schedule.shouldCapture(0,'camera-a',6),true);assert.equal(schedule.shouldCapture(20,'camera-b',6),false);assert.equal(schedule.shouldCapture(170,'camera-b',6),true);assert.equal(schedule.shouldCapture(1000,'camera-b',6),false);
 schedule.reset();assert.equal(schedule.shouldCapture(1001,'camera-b',12),true);
});


test('Ultra editing bounds persistent mirror targets while capture keeps native full-resolution targets',()=>{
 const p=QUALITY_PROFILES[0];
 assert.equal(profileSizes(p,false,16384,{editing:true}).reflection,1024);
 assert.equal(profileSizes(p,false,16384,{editing:false}).reflection,2048);
 assert.equal(profileSizes(p,false,512,{editing:true}).reflection,512);
 assert.equal(profileSizes(p,false,16384,{editing:true}).shadow,4096);
});
