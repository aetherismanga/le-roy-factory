import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import vm from 'node:vm';
import {NICHE_PROFILE_FINISHES,nicheProfileEdges,nicheProfilesEnabled,nicheMetalFinish,withDefaultNicheProfiles,nicheNeedsProfileDefaults} from '../../shared/lrf-3d/niche-profile-options.js';

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
 const context={NICHE_PROFILE_FINISHES,nicheProfileEdges,nicheProfilesEnabled,nicheMetalFinish,withDefaultNicheProfiles,nicheNeedsProfileDefaults,
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

test('matching uses the current niche centre and dimensions, including a move from a gold tap to chrome before Apply',()=>{
 const f=fixture();f.change('niche-profile-finish','match');assert.equal(f.controls.get('niche-profile-left').value,'Or brossé');
 for(const [field,value]of Object.entries({u:300,bottom:110,width:80,height:50,depth:7}))f.change(field,value);
 f.apply();assert.equal(f.saved.length,1);const value=f.saved[0];
 assert.equal(value.profileFinish,'Chrome brillant');assert.deepEqual(Object.values(value.profileEdges),Array(4).fill('Chrome brillant'));
 const latest=f.requests.at(-1);assert.equal(latest.wallKey,'boundary-0');
 for(const [field,expected]of Object.entries({u:300,bottom:110,width:80,height:50,depth:7}))assert.equal(latest.niche[field],expected);
 assert.equal(f.dialog.open,false);
});

test('Apply rechecks changed tap finishes while respecting manual and disabled angles',()=>{
 const f=fixture();f.change('niche-profile-finish','match');
 f.change('niche-profile-top','none');f.change('niche-profile-right','Cuivre');
 assert.equal(f.controls.get('niche-profile-finish').value,'match','Unchanged angles still follow the tap');
 f.change('u',300);f.taps[1].finish='Gris canon';f.apply();assert.equal(f.saved.length,1);
 const value=f.saved[0];assert.equal(value.profileFinish,'Gris canon');
 assert.equal(value.profileEdges.left,'Gris canon');assert.equal(value.profileEdges.bottom,'Gris canon');assert.equal(value.profileEdges.right,'Cuivre');assert.equal(value.profileEdges.top,'none');
});

test('an explicit overall finish remains fixed when the niche moves and preserves per-angle choices',()=>{
 const f=fixture();f.change('niche-profile-finish','Inox brossé');f.change('niche-profile-top','none');f.change('u',300);f.apply();assert.equal(f.saved.length,1);
 const value=f.saved[0];assert.equal(value.profileFinish,'Inox brossé');assert.equal(value.profileEdges.left,'Inox brossé');assert.equal(value.profileEdges.right,'Inox brossé');assert.equal(value.profileEdges.bottom,'Inox brossé');assert.equal(value.profileEdges.top,'none');
});


test('the first validation of an untouched inherited niche adds matched trims, while opening or cancelling leaves the source unchanged',()=>{
 for(const emptyEdges of [false,true]){
  const f=fixture({legacy:true,emptyEdges});const original=JSON.stringify(f.config);
  assert.equal(f.controls.get('niche-profiles-enabled').value,'on');assert.equal(f.controls.get('niche-profile-finish').value,'match');
  assert.equal(f.config.niches[0].profileEnabled,undefined);assert.equal(f.saved.length,0);assert.equal(JSON.stringify(f.config),original,'Preparing the form does not migrate the project');
  f.dialog.close();assert.equal(f.saved.length,0);assert.equal(JSON.stringify(f.config),original,'Cancelling does not migrate the project');
  const validated=fixture({legacy:true,emptyEdges});validated.change('u',300);validated.apply();assert.equal(validated.saved.length,1);
  assert.equal(validated.saved[0].profileEnabled,true);assert.equal(validated.saved[0].profileFinish,'Chrome brillant');assert.deepEqual(Object.values(validated.saved[0].profileEdges),Array(4).fill('Chrome brillant'));
 }
});

test('validating an explicitly removed inherited perimeter keeps it removed',()=>{
 const f=fixture({removed:true});assert.equal(f.controls.get('niche-profiles-enabled').value,'off');f.change('u',300);f.apply();
 assert.equal(f.saved.length,1);assert.equal(f.saved[0].profileEnabled,false);assert.deepEqual(Object.values(f.saved[0].profileEdges),Array(4).fill('none'));
});

test('applicable legacy global clicked-edge choices survive first validation and a changed niche position',()=>{
 const overrides={
  'niche-niche-form|niche_left|0.700,0.900,0.000|0.700,1.300,0.000':{enabled:false,color:'Argent'},
  'niche-niche-form|niche_right|1.300,0.900,0.000|1.300,1.300,0.000':{enabled:true,color:'Noir'}
 };
 const f=fixture({legacy:true,profileSettings:{overrides}});assert.equal(f.config.niches[0].profileEdges,undefined);assert.equal(f.controls.get('niche-profile-left').value,'none');assert.equal(f.controls.get('niche-profile-right').value,'Noir');
 f.change('u',300);f.apply();assert.equal(f.saved.length,1);assert.equal(f.saved[0].profileEnabled,true);
 assert.equal(f.saved[0].profileEdges.left,'none');assert.equal(f.saved[0].profileEdges.right,'Noir');assert.equal(f.saved[0].profileEdges.top,'none');assert.equal(f.saved[0].profileEdges.bottom,'none');
});
