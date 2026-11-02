import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parse} from 'acorn';
import {studioBody,transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {validateProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {PRODUCTS} from '../functions/neobath-anima/studio-adapter/anima-data.js';
const file=name=>readFileSync(new URL('../studio-one/src/'+name,import.meta.url),'utf8');

test('the original atelier template presents actual Anima defaults before WebGL initialization',()=>{
 const html=studioBody(file('atelier.html'));
 for(const value of ['80 × 52 × 46 cm','H 52 · P 46 cm','id="finish-counter">6 / 6','Six finitions NEOBATH ANIMA','id="selected-finish">Rovere Alba','id="basin-summary">Meuble seul — sans plan'])assert.ok(html.includes(value),value);
 for(const value of ['Roble Amazona','Sella blanc brillant','Vasque encastrée · miroir rond Ø 60','id="size-summary">80 × 54','aria-label="Huit finitions NEOBATH ANIMA"'])assert.ok(!html.includes(value),value);
});
test('direct atelier initialization creates a source-referenced mirror that survives strict project restore validation',()=>{
 const source=transformCommonStudioSource(file('app.js'),'app.js');
 const fn=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='initializeComposition');
 const mirror=PRODUCTS.find(p=>p.category==='mirror'),settings={format:'two',width:80,top:'bare',finish:'rovere-alba',drawers:[0,0]};
 class Composition{constructor(){this.items=[];}add(type,asset,values,placement={wall:0,u:150,height:30}){const item={id:'object-'+(this.items.length+1),type,asset,settings:{...values},placement,root:{add(){}}};this.items.push(item);return {item};}}
 const context={composition:null,Composition,roomScene:{},model:{mirror:{removeFromParent(){}},root:{removeFromParent(){}}},state:settings,CABINET_KEYS:Object.keys(settings),counterDecor:[],scene:{add(){}},mirror:{},MIRRORS:[{id:mirror.id,sizes:[[mirror.width,mirror.height]],led:mirror.backlit===true}],cabinetContact:null,selectItem(){}};
 runInNewContext(source.slice(fn.start,fn.end)+'\ninitializeComposition();',context);
 const project={version:2,room:{points:[[0,0],[450,0],[450,450],[0,450]]},items:context.composition.items.map(({id,type,settings,placement})=>({id,type,settings,placement}))};
 assert.equal(project.items[1].settings.mirrorModel,mirror.id);assert.equal(project.items[1].settings.width,mirror.width);assert.equal(project.items[1].settings.height,mirror.height);
 assert.equal(validateProject(project).manufacturer,'neobath-anima');
});
