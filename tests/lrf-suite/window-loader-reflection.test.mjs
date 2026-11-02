import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import * as T from 'three';
import {makeOpening,setExteriorTexture} from '../../shared/lrf-3d/openings.js';
import {createWindowAmbienceLoader} from '../../shared/lrf-3d/window-ambiences.js';
import {ReflectionSchedule} from '../../shared/lrf-3d/performance.js';
import {AQUAHOME,makeTap} from '../../shared/lrf-3d/taps.js';
import {makeSanitary} from '../../shared/lrf-3d/sanitaries.js';
import {disposeObject} from '../../studio-one/src/composition.js';

function functionSource(app,name){const text=readFileSync(new URL('../../'+app+'/src/app.js',import.meta.url),'utf8'),node=parse(text,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name);assert(node);return text.slice(node.start,node.end);}

for(const app of ['studio-one','randal-general']){
 test(app+': the real exterior-loader callback refreshes cached mirrors exactly once when a displayed view finishes loading',async()=>{
  const first=makeOpening('window',{exteriorAmbience:'coast'}),second=makeOpening('window',{exteriorAmbience:'coast'}),composition={items:[first,second].map(asset=>({type:'window',settings:{exteriorAmbience:'coast'},asset}))},invalidations=[],loads=[];
  class TextureLoader{async loadAsync(url){loads.push(url);return new T.Texture({width:1536,height:1024});}}
  const context=vm.createContext({T:{...T,TextureLoader},composition,renderer:{capabilities:{getMaxAnisotropy:()=>16}},createWindowAmbienceLoader,setExteriorTexture,invalidate:(...args)=>invalidations.push(args)});
  vm.runInContext('let exteriorAmbienceLoader=null;let sceneRevision=41;'+functionSource(app,'windowLoader'),context);
  const revision=()=>vm.runInContext('sceneRevision',context),schedule=new ReflectionSchedule();
  try{
   assert.equal(schedule.shouldCapture(0,revision()+'|camera-stable',30),true,'The mirror captures the initial not-yet-loaded view');
   const loader=context.windowLoader(),texture=await loader.load('coast');
   assert.equal(revision(),42);assert.deepEqual(invalidations,[[false,false]],'Texture readiness refreshes rendering without a checkpoint or shadow update');
   assert.equal(schedule.shouldCapture(100,revision()+'|camera-stable',30),true,'A stationary mirror must capture the completed panorama');
   for(const asset of [first,second])assert.equal(asset.root.getObjectByName('Vue_exterieure_jardin').material.map,texture);
   await loader.load('coast');assert.equal(revision(),42);assert.equal(loads.length,1,'A shared ready view does not retrigger callbacks');
   await loader.load('mountains');assert.equal(revision(),42);assert.equal(invalidations.length,1,'An unused downloaded ambience changes no scene or mirror revision');
  }finally{disposeObject(first.root);disposeObject(second.root);}
 });

 test(app+': niche matching reads the actual modeled tap on a default washstand or cabinet without inventing a fallback finish',()=>{
  const chrome=AQUAHOME.find(product=>product.use==='basin'&&product.finish==='Chrome brillant'),gold=AQUAHOME.find(product=>product.use==='shower'&&product.finish==='Or brossé'),washstand=makeSanitary('washstand',{reference:'TR443',tap:null,metal:'Chrome brillant'}),cabinetTap=makeTap(chrome);
  const far={type:'tap',settings:{tap:gold.reference},placement:{wall:0,u:20}},composition={items:[],room:{walls:[{key:'wall-0'}]},selected:null},getFinish=Function('AQUAHOME','composition','return ('+functionSource(app,'getNicheMetalFinish')+')')(AQUAHOME,composition);
  try{
   const actualWashstand=washstand.root.getObjectByName('Mitigeur_lave_mains').userData.reference;assert.equal(actualWashstand,chrome.reference);
   composition.items=[{type:'washstand',settings:{tap:null},placement:{wall:0,u:200},asset:washstand},far];
   assert.equal(getFinish({wallKey:'wall-0',niche:{u:200}}),'Chrome brillant');
   composition.items=[{type:'cabinet',settings:{tap:null},placement:{wall:0,u:200},asset:{aquaTap:cabinetTap,getBasinCenters:()=>[0]}},far];
   assert.equal(getFinish({wallKey:'wall-0',niche:{u:200}}),'Chrome brillant');
   composition.items[0].asset.aquaTap.userData.reference='unlisted-model';
   assert.equal(getFinish({wallKey:'wall-0',niche:{u:200}}),'Or brossé','An unknown mesh does not silently become the catalogue first finish');
  }finally{disposeObject(washstand.root);disposeObject(cabinetTap);}
 });
}
