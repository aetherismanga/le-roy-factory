import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';
import * as T from 'three';
import {AQUAHOME,tapsFor,tapProduct} from '../../shared/lrf-3d/taps.js';
import {AQUAHOME_BATHROOM_ADDITIONS} from '../../shared/lrf-3d/aquahome-bathroom-catalog.js';
import {AQUAHOME_INSTALLATIONS,isFloorTapUse,isShowerTapUse,tapModelKey,tapModelLabel,tapMixerObject,tapDefaultPlacementHeight} from '../../shared/lrf-3d/aquahome-installation.js';
import {makeEquipment,equipmentError,isAccessory,isFloorAccessory} from '../../shared/lrf-3d/equipment.js';
import {makeRoom,DEFAULT_ROOM,cloneRoom} from '../../shared/lrf-3d/room.js';

function declaration(source,name,deps,locals=''){
 const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);
 assert(node,'Actual application declaration '+name);
 return Function(...Object.keys(deps),locals+';return ('+source.slice(node.start,node.end)+');')(...Object.values(deps));
}
const noop=()=>{};
const document={createElement:()=>({children:[],append(...nodes){this.children.push(...nodes);}})};
function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}

test('only reconstructed standalone categories are offered; reference and usage mismatches are rejected',()=>{
 assert.equal(AQUAHOME.length,208);
 for(const choice of AQUAHOME_INSTALLATIONS)assert(tapsFor(choice.id).length,'Renderable category '+choice.id);
 for(const use of ['hygiene','accessible','kitchen','unknown'])assert.match(equipmentError('tap',{use}),/inconnu/);
 for(const p of AQUAHOME_BATHROOM_ADDITIONS){
  assert.equal(equipmentError('tap',{use:p.use,tap:p.reference}),'');
  assert.match(equipmentError('tap',{use:p.use,tap:'missing'}),/Référence/);
  const other=AQUAHOME.find(x=>x.use!==p.use);assert.match(equipmentError('tap',{use:p.use,tap:other.reference}),/incompatible/);
 }
 assert.equal(isFloorAccessory('tap',{use:'basin-floor'}),true);
 assert.equal(isFloorAccessory('tap',{use:'basin-wall'}),false);
});

for(const variant of ['studio-one','randal-general']){
 const source=readFileSync(new URL('../../'+variant+'/src/app.js',import.meta.url),'utf8');
 const {Composition,itemDimensions}=await import('../../'+variant+'/src/composition.js');
 const {encodeProject,decodeProject}=await import('../../'+variant+'/src/projects.js');
 const {quoteProject}=await import('../../'+variant+'/src/commerce/pricing.js');

 test(variant+': real tap chooser keeps distinct assemblies and changes the exact selected SKU',()=>{
  for(const use of new Set(AQUAHOME_BATHROOM_ADDITIONS.map(p=>p.use))){
   const selected=tapsFor(use)[0],fields=[],updates=[];
   const choose=declaration(source,'renderTapChooser',{tapsFor,tapProduct,tapModelKey,tapModelLabel,document,field:(parent,label,value,options,onchange)=>fields.push({label,value,options,onchange}),updateFixture:p=>updates.push(p),setCabinetTap:noop,renderAquahomeProductPreview:noop,renderAquahomeModelChoices:noop});
   choose({append:noop},{type:'tap',settings:{use,tap:selected.reference}});
   const model=fields.find(f=>f.label==='Modèle'),finish=fields.find(f=>f.label==='Finition');
   assert.equal(model.options.length,new Set(tapsFor(use).map(tapModelKey)).size);
   assert.equal(finish.value,selected.reference);
   for(const option of model.options){model.onchange(option.id);const changed=updates.at(-1),p=tapsFor(use).find(p=>p.reference===changed.tap);assert.equal(tapModelKey(p),option.id);assert.equal(changed.metal,p.finish);}
  }
 });

 test(variant+': additions can be placed, saved, reopened and moved with exact references and explicit unpriced quote entries',()=>{
  const room=makeRoom(DEFAULT_ROOM,0);
  try{for(const p of AQUAHOME_BATHROOM_ADDITIONS){
   const settings={use:p.use,tap:p.reference,metal:p.finish},asset=makeEquipment('tap',settings),comp=new Composition(room),height=tapDefaultPlacementHeight(p.use,asset);
   try{
    const result=comp.add('tap',asset,settings,{wall:0,u:220,height,offset:10,rotation:isFloorTapUse(p.use)?90:0});
    assert(result.item,p.reference+': '+result.error);assert.equal(result.item.settings.tap,p.reference);
    assert.equal(comp.validate(result.item),'');
    if(isFloorTapUse(p.use))assert.equal(result.item.placement.height,0);
    if(['basin-wall','shower-mixer','shower-concealed','shower-kit'].includes(p.use)){
     const mixer=tapMixerObject(result.item.root,p.use),y=mixer.getWorldPosition(new T.Vector3()).y*100;
     assert(Math.abs(y-(p.use==='basin-wall'?100:105))<1e-5,p.reference+' actual installed command height '+y);
    }
    const project={version:2,room:cloneRoom(DEFAULT_ROOM),items:comp.snapshot()},restored=decodeProject(encodeProject(project));
    assert.equal(restored.items[0].settings.tap,p.reference);assert.equal(restored.items[0].settings.use,p.use);
    assert.equal(equipmentError('tap',restored.items[0].settings),'');assert.deepEqual(restored.items[0].placement,result.item.placement);
    const quote=quoteProject(restored);assert.equal(quote.rows.length,0);assert.equal(quote.excluded[0].reference,p.reference);
    assert.equal(quote.excluded[0].type,'tap');
    assert.equal(comp.move(result.item.id,{wall:1,u:150}).error,undefined);
   }finally{dispose(asset.root);}
  }}finally{room.dispose();}
 });

 test(variant+': the actual add flow records the default SKU and uses installation heights',()=>{
  const room=makeRoom(DEFAULT_ROOM,0),composition={selected:null,items:[],room};
  const prepare=declaration(source,'prepareProductAddition',{composition,state:{finish:'ROBLE'},isFixture:()=>false,isOpening:()=>false,makeSceneAsset:(type,s)=>makeEquipment(type,s),tapProduct,itemDimensions,tapDefaultPlacementHeight,isFloorTapUse,isShowerTapUse});
  try{for(const choice of AQUAHOME_INSTALLATIONS){const added=prepare('tap',0,{use:choice.id});try{assert.equal(added.settings.tap,tapsFor(choice.id)[0].reference);assert.equal(added.preferred.height,tapDefaultPlacementHeight(choice.id,added.asset));}finally{dispose(added.asset.root);}}}finally{room.dispose();}
 });

 test(variant+': the room adds no fixed countertop accessories that could duplicate or float above movable furniture',()=>{
  const scene=new T.Scene(),counterDecor=[];
  const build=declaration(source,'buildRoom',{T,scene,counterDecor,roomConfig:DEFAULT_ROOM,applyRoom:noop,noiseTexture:()=>new T.Texture()},'let roomGroup,pendantLight,windowGlow');
  build();assert.equal(counterDecor.length,0);assert.equal(scene.children.filter(o=>o.isMesh).length,0);
 });
}
