import {nicheWallFinish} from '../../shared/lrf-3d/niches.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import vm from 'node:vm';
import {NICHE_PROFILE_FINISHES,nicheProfileEdges,nicheProfilesEnabled,nicheMetalFinish,withDefaultNicheProfiles,nicheNeedsProfileDefaults,nichePerimeterFinish,withNichePerimeterProfiles} from '../../shared/lrf-3d/niche-profile-options.js';

// Execute the real nested form function with DOM and room adapters. The test
// exercises the input handlers and Apply button without depending on WebGL.
const source=readFileSync(new URL('../../shared/lrf-3d/renovation.js',import.meta.url),'utf8');
const tree=parse(source,{ecmaVersion:'latest',sourceType:'module'});
let form;
const visit=node=>{if(!node||typeof node!=='object')return;if(node.type==='FunctionDeclaration'&&node.id?.name==='showNiche')form=source.slice(node.start,node.end);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);};visit(tree);assert(form);

function fixture({legacy=false,emptyEdges=false,removed=false,profileSettings={}}={}){
 const controls=new Map(),requests=[],saved=[];
 class Element{
  constructor(){this.style={};this.open=true;this.children=[];}
  append(...children){this.children.push(...children);}after(){}setAttribute(){}scrollIntoView(){}focus(){}
  querySelector(selector){return controls.get(selector.slice(1));}close(){this.open=false;}
 }
 const dialog=new Element(),status=new Element(),base={id:'niche-form',wallKey:'boundary-0',u:100,bottom:90,width:60,height:40,depth:6,profileEnabled:true,profileFinish:'Or brossé',profileEdges:{left:'Or brossé',right:'Or brossé',top:'Or brossé',bottom:'Or brossé'}},taps=[{u:100,finish:'Or brossé'},{u:300,finish:'Chrome brillant'}];
 if(legacy){delete base.profileEnabled;delete base.profileFinish;delete base.profileEdges;if(emptyEdges)base.profileEdges={};}
 if(removed){base.profileEnabled=false;base.profileEdges={left:'none',right:'none',top:'none',bottom:'none'};}
 const config={niches:[base]},wall={key:'boundary-0',length:4.5,height:2.6};
 const context={nicheWallFinish,NICHE_PROFILE_FINISHES,nicheProfileEdges,nicheProfilesEnabled,nicheMetalFinish,withDefaultNicheProfiles,nicheNeedsProfileDefaults,nichePerimeterFinish,withNichePerimeterProfiles,
  api:{getProfileSettings:()=>profileSettings,getRoomConfig:()=>config,getSelectedWall:()=>0,getWallFinish:()=>({}),readonly:()=>false,getNicheMetalFinish({wallKey,niche}){requests.push({wallKey,niche:{...niche}});return [...taps].sort((a,b)=>Math.abs(a.u-niche.u)-Math.abs(b.u-niche.u))[0].finish;}},
  room:()=>({walls:[wall]}),comp:()=>({locked:false}),isItemPositionLocked:()=>false,modal:()=>({dialog,status}),document:{createElement:()=>new Element()},finishEditor:()=>({value:()=>({collection:'Creta',color:'avena',format:'60x120'})}),
  field(parent,label,value,type,name){const control={value:String(value)};controls.set(name,control);return control;},
  select(parent,label,options,value,name){const control={value};controls.set(name,control);return control;},
  button(parent,label,callback,id){const control=new Element();control.onclick=callback;if(id)controls.set(id,control);return control;},
  saveNiche:value=>saved.push(value),setNicheEditing(){},toggleNicheLock(){},removeNiche(){},nicheEditorRefresh:null};
 vm.createContext(context);vm.runInContext(form+'\nshowNiche("niche-form");',context);
 const change=(name,value)=>{const control=controls.get(name);assert(control,name);control.value=String(value);control.onchange?.();};
 return {controls,requests,saved,taps,dialog,change,config,apply:()=>controls.get('apply-niche').onclick()};
}

test('matching uses the current niche centre and dimensions before Apply, with one control for all sides',()=>{
 const f=fixture();f.change('niche-profile-finish','match');
 for(const edge of ['left','right','top','bottom'])assert.equal(f.controls.has('niche-profile-'+edge),false);
 for(const [field,value]of Object.entries({u:300,bottom:110,width:80,height:50,depth:7}))f.change(field,value);
 f.apply();assert.equal(f.saved.length,1);const value=f.saved[0];
 assert.equal(value.profileFinish,'Chrome brillant');assert.deepEqual(Object.values(value.profileEdges),Array(4).fill('Chrome brillant'));
 const latest=f.requests.at(-1);assert.equal(latest.wallKey,'boundary-0');
 for(const [field,expected]of Object.entries({u:300,bottom:110,width:80,height:50,depth:7}))assert.equal(latest.niche[field],expected);
 assert.equal(f.dialog.open,false);
});

test('Apply rechecks changed tap finishes and applies the same finish on the complete perimeter',()=>{
 const f=fixture();f.change('niche-profile-finish','match');f.change('u',300);f.taps[1].finish='Gris canon';f.apply();assert.equal(f.saved.length,1);
 const value=f.saved[0];assert.equal(value.profileFinish,'Gris canon');assert.deepEqual(Object.values(value.profileEdges),Array(4).fill('Gris canon'));
});

test('an explicit unique finish remains fixed when the niche moves',()=>{
 const f=fixture();f.change('niche-profile-finish','Inox brossé');f.change('u',300);f.apply();assert.equal(f.saved.length,1);
 const value=f.saved[0];assert.equal(value.profileFinish,'Inox brossé');assert.deepEqual(Object.values(value.profileEdges),Array(4).fill('Inox brossé'));
});

test('the first validation of an untouched inherited niche adds matched trims; opening and cancelling leave the source unchanged',()=>{
 for(const emptyEdges of [false,true]){
  const f=fixture({legacy:true,emptyEdges});const original=JSON.stringify(f.config);
  assert.equal(f.controls.get('niche-profiles-enabled').value,'on');assert.equal(f.controls.get('niche-profile-finish').value,'match');
  assert.equal(f.config.niches[0].profileEnabled,undefined);assert.equal(f.saved.length,0);assert.equal(JSON.stringify(f.config),original);
  f.dialog.close();assert.equal(f.saved.length,0);assert.equal(JSON.stringify(f.config),original);
  const validated=fixture({legacy:true,emptyEdges});validated.change('u',300);validated.apply();assert.equal(validated.saved.length,1);
  assert.equal(validated.saved[0].profileEnabled,true);assert.equal(validated.saved[0].profileFinish,'Chrome brillant');assert.deepEqual(Object.values(validated.saved[0].profileEdges),Array(4).fill('Chrome brillant'));
 }
});

test('the whole perimeter can be removed, and an explicitly removed inherited perimeter remains removed',()=>{
 for(const removed of [false,true]){
  const f=fixture({removed});f.change('niche-profiles-enabled','off');f.change('u',300);f.apply();assert.equal(f.saved.length,1);
  assert.equal(f.saved[0].profileEnabled,false);assert.deepEqual(Object.values(f.saved[0].profileEdges),Array(4).fill('none'));
 }
});

test('legacy global edge choices remain untouched on open and become four matching sides only on explicit validation',()=>{
 const overrides={
  'niche-niche-form|niche_left|0.700,0.900,0.000|0.700,1.300,0.000':{enabled:false,color:'Argent'},
  'niche-niche-form|niche_right|1.300,0.900,0.000|1.300,1.300,0.000':{enabled:true,color:'Noir'}
 };
 const f=fixture({legacy:true,profileSettings:{overrides}}),original=JSON.stringify(f.config),settings=JSON.stringify(overrides);
 assert.equal(f.config.niches[0].profileEdges,undefined);assert.equal(f.controls.get('niche-profiles-enabled').value,'on');assert.equal(JSON.stringify(f.config),original);assert.equal(JSON.stringify(overrides),settings);
 f.change('niche-profile-finish','Cuivre');f.change('u',300);f.apply();assert.equal(f.saved.length,1);assert.equal(f.saved[0].profileEnabled,true);
 assert.deepEqual(Object.values(f.saved[0].profileEdges),Array(4).fill('Cuivre'));assert.equal(JSON.stringify(overrides),settings);
});
