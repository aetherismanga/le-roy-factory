import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {parse} from 'acorn';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';

const source=transformCommonStudioSource(readFileSync(new URL('../studio-one/src/app.js',import.meta.url),'utf8'),'app.js');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const bodies=['selectFinish','saveCabinetState'].map(name=>{const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(node);return source.slice(node.start,node.end);}).join('\n');
for(const active of [true,false])test('Anima finish followed by plan: Unreal active='+active,()=>{
 const settings={finish:'old',format:'pura-base-two',drawers:[0,0]},item={type:'cabinet',settings,asset:{}};
 let planChoice={...settings},refreshes=0;const element={replaceChildren(){},append(){},setAttribute(){}};
 const context=vm.createContext({composition:{selected:item},state:{...settings},CABINET_KEYS:['finish','format'],
  FINISHES:[{id:'old',name:'Old',kind:'MAT'},{id:'green',name:'Green',kind:'MAT'}],
  cabinetFormat:()=>({subtype:'vanity'}),applyFurnitureMaterial(){},requestFinishAssets:async()=>{},
  refreshInspector(){},refreshWorkingTextures(){},invalidate(){},placementStatus(){},
  unrealRender:{active},__animaPremiumSidebar(){refreshes++;planChoice={...item.settings};},
  $:()=>element,$$:()=>[],document:{createTextNode:x=>x,createElement:()=>({...element})}});
 vm.runInContext(bodies,context);assert.equal(vm.runInContext("selectFinish('green')",context),true);
 assert.equal(item.settings.finish,'green');assert.equal(refreshes,active?1:0);
 if(active){Object.assign(item.settings,planChoice,{top:'tk80'});assert.equal(item.settings.finish,'green','a plan choice must retain the latest finish');}
});
