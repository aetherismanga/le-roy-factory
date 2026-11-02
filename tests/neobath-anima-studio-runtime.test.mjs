import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {TOP_OPTIONS,topSelection,isIntegratedTop,isVesselTop,CATALOGUE} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import * as basins from '../functions/neobath-anima/studio-adapter/basins.js';
import {topAvailable,cabinetFormat,CABINET_FORMATS,animaCabinetDimensions} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {continuousPlanOption} from '../functions/neobath-anima/studio-adapter/continuous-plan-ui.js';
import {validateProject,encodeProject,decodeProject,ProjectJournal,continuousTopContext,continuousTopCompatible} from '../functions/neobath-anima/studio-adapter/projects.js';
import {draftProject,initialDraft} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';

// Execute the actual transformed atelier handlers, without requiring a GPU or
// substituting the guided-page normalizer for the atelier's separate logic.
const source=transformCommonStudioSource(readFileSync(new URL('../studio-one/src/app.js',import.meta.url),'utf8'),'app.js');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const functions=new Map(ast.body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));
const keys=ast.body.flatMap(n=>n.type==='VariableDeclaration'?n.declarations:[]).find(n=>n.id.name==='CABINET_KEYS');
const CABINET_KEYS=vm.runInNewContext(source.slice(keys.init.start,keys.init.end));
const noop=()=>{};
const project=item=>JSON.parse(JSON.stringify({version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[450,0],[450,450],[0,450]]},
  items:[{id:item.id,type:item.type,settings:item.settings,placement:item.placement}]}));

function atelier(width=80,top='bare'){
  const form=cabinetFormat('two'),state={format:'two',facadeMode:'overlay',width,finish:'rovere-alba',top,
    basinColor:'standard',topDrawer:'siphon',topSpan:width,topOffset:0,drawers:[0,0],basinLayout:basins.resolveBasinLayout(top,width,'two')};
  const root={removeFromParent:noop,add:noop};
  const makeModel=settings=>({root,drawers:[{position:{z:0}},{position:{z:0}}],basinLayout:basins.resolveBasinLayout(settings.basinTop,Math.round(settings.width*100),settings.format),
    setTop:()=>true,setTopDrawer:v=>v,ceramic:{color:{set:noop}},frontWood:{},spec:{}});
  const item={id:'runtime-cabinet',type:'cabinet',settings:{...state},placement:{wall:0,u:125,height:form.base*100},asset:makeModel({width:width/100,format:'two',basinTop:top}),root,decor:[],dimensions:animaCabinetDimensions(state)};
  const composition={selected:item,selectedId:item.id,items:[item],resize:(_item,dimensions)=>{item.dimensions=dimensions;return null;}};
  const context={...basins,state,CABINET_KEYS,TOP_OPTIONS,composition,grain:null,currentDrawers:[0,0],counterDecor:[],roomScene:{},
    __animaTopSelection:topSelection,__animaIntegrated:isIntegratedTop,__animaVessel:isVesselTop,__animaPlanOption:continuousPlanOption,
    __animaPremiumContext:continuousTopContext,__animaPremiumCompatible:continuousTopCompatible,
    topAvailable,validWidth:(w,format)=>cabinetFormat(format||state.format).allowedWidths.includes(w),cabinetFormat,
    model:item.asset,makeModel,itemDimensions:(_type,s)=>animaCabinetDimensions(s),selectedCabinet:()=>true,
    $$:()=>[],$:()=>({textContent:''}),installCabinetTap:noop,decorateAsset:noop,refreshWidthUI:noop,refreshBasinUI:noop,
    selectFinish:noop,renderComposition:noop,setView:noop,releaseModel:noop,placementStatus:noop,invalidate:noop,
    normalizeTopDrawer:v=>v};
  // Helpers remain the production implementations when a narrow source
  // transform adds Anima-specific compatibility or color normalization.
  const names=['selectTop','selectBasinColor','saveCabinetState','setWidth','__animaTopContext',
    ...[...functions.keys()].filter(name=>/^__anima/.test(name)&&!/SyncContinuous/.test(name))];
  const unique=[...new Set(names)];
  vm.createContext(context);vm.runInContext(unique.filter(name=>functions.has(name)).map(name=>functions.get(name)).join('\n'),context);
  return {context,item,state};
}

test('all 128 compatible plans selected in the real atelier preserve every source color and exact variant price',()=>{
  const failures=[];let checked=0,variants=0;
  for(const option of TOP_OPTIONS){
    const width=[80,100,120,60].find(w=>topAvailable(option.id,w,'two'));if(!width)continue;
    const {context,item}=atelier(width);
    try{
      assert.equal(context.selectTop(option.id),true,option.id);
      const valid=validateProject(project(item));assert.deepEqual(decodeProject(encodeProject(valid)),valid);
      const selection=topSelection(option.id,width,'two'),product=selection?.product,prices=product?.prices;
      if(prices?.length)assert.ok(prices.some(p=>p.key===item.settings.basinColor),'Source price/color key must be retained');
      for(const price of prices||[]){
        assert.equal(context.selectBasinColor(price.key),true,option.id+' / '+price.key);
        const selected=validateProject(project(item));assert.equal(selected.items[0].settings.basinColor,price.key);
        assert.deepEqual(decodeProject(encodeProject(selected)),selected);
        const row=quoteProject(selected).rows.find(r=>r.productId===product.id);
        const length=selection.billingLength||selection.topWidth||width;
        const multiplier=['cm','cml','linear-cm'].includes(product.unit)?length:['m','ml','linear-metre'].includes(product.unit)?length/100:1;
        const expected=typeof price.price==='number'?Math.round(price.price*multiplier*120):null;
        assert.ok(row,option.id+' / '+price.key+' source tariff row');
        assert.equal(row.publicTTC,expected,option.id+' / '+price.key+' exact public TTC');variants++;
      }
      checked++;
    }catch(error){failures.push({id:option.id,color:item.settings.basinColor,error:error.message});}
  }
  assert.deepEqual(failures,[]);assert.ok(checked>=128,`Only ${checked} source plans checked`);assert.ok(variants>=128,`Only ${variants} color/price variants checked`);
});

test('changing stock width clears an incompatible source plan before the strict checkpoint',()=>{
  const option=TOP_OPTIONS.find(o=>o.id!=='bare'&&topAvailable(o.id,60,'two')&&!topAvailable(o.id,80,'two'));
  assert.ok(option,'A width-specific manufacturer plan is required for this regression');
  const {context,item,state}=atelier(60);
  assert.equal(context.selectTop(option.id),true);
  assert.equal(context.setWidth(80),true);
  assert.equal(state.width,80);assert.equal(state.top,'bare');assert.equal(item.settings.top,'bare');
  validateProject(project(item));
});

test('initial scene and original addition controls produce strict Anima cabinet, column and mirror settings',()=>{
  const stateNode=ast.body.flatMap(n=>n.type==='VariableDeclaration'?n.declarations:[]).find(n=>n.id.name==='state');
  const state=vm.runInNewContext('('+source.slice(stateNode.init.start,stateNode.init.end)+')');
  const MIRRORS=CATALOGUE.products.filter(p=>p.category==='mirror').map(p=>({id:p.id,sizes:[[p.width,p.height,p.ref]],led:!!p.backlit}));
  const context={state,CABINET_KEYS,MIRRORS,cabinetFormat,model:{root:{removeFromParent:noop},mirror:{removeFromParent:noop}},mirror:{},
    counterDecor:[],scene:{add:noop},cabinetContact:null,selectItem:noop,
    isFixture:()=>false,isOpening:()=>false,makeSceneAsset:()=>({}),itemDimensions:()=>({width:.8}),normalizeTopDrawer:v=>v,
    __animaVessel:isVesselTop,resolveBasinLayout:basins.resolveBasinLayout};
  context.Composition=class {constructor(){this.items=[];this.room={walls:[{length:4.5}]};}add(type,asset,settings,placement={wall:0,u:125,height:30}){const item={id:'initial-'+type,type,asset,settings,placement,root:{add:noop}};this.items.push(item);return {item};}};
  context.roomScene={};vm.createContext(context);
  vm.runInContext(functions.get('initializeComposition')+'\n'+functions.get('prepareProductAddition'),context);
  context.initializeComposition();
  validateProject({...project(context.composition.items[0]),items:context.composition.items.map(i=>({id:i.id,type:i.type,settings:i.settings,placement:i.placement}))});
  for(const [type,options] of [
    ...CABINET_FORMATS.map(f=>['cabinet',{format:f.id}]),
    ['column',{}],['column',{columnModel:'ribelle-column'}],['mirror',{}],
    ...MIRRORS.map(m=>['mirror',{mirrorModel:m.id,width:m.sizes[0][0],height:m.sizes[0][1],led:m.led}])
  ]){
    const result=context.prepareProductAddition(type,0,options);
    validateProject(project({id:'added',type,settings:result.settings,placement:result.preferred}));
  }
});

test('the original guided-to-atelier session consumes the private transfer and preserves a valid checkpoint',()=>{
  const input=draftProject(initialDraft()),values=new Map([['neobath-anima-studio-guided-transfer-v1',JSON.stringify(input)]]);
  const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  let restored=null;const window={__ANIMA_ROUTE_URL__:'https://leroyfactory.fr/neobath-anima-configurateur.html?studioView=atelier&guided=1'};
  const context={URL,URLSearchParams,window,localStorage:storage,ProjectJournal,decodeProject,
    __animaHistory:{replaceState:(_state,_title,url)=>{window.__ANIMA_ROUTE_URL__=String(url);}},
    journal:null,projectTimer:null,state:{ready:true},ACTIVE_ID:'neobath-anima-studio-active-project-id-v2',
    collectProject:()=>restored,restoreProject:data=>{restored=validateProject(data);return true;},
    markStudioEntryEdited:noop,placementStatus:noop,setWorkspace:noop,setView:noop,clearTimeout,updateHistoryButtons:noop};
  vm.createContext(context);vm.runInContext(functions.get('__animaLocation')+'\n'+functions.get('initializeProjectSession'),context);
  context.initializeProjectSession();
  assert.ok(restored);validateProject(restored);
  assert.equal(values.has('neobath-anima-studio-guided-transfer-v1'),false);
  const url=new URL(window.__ANIMA_ROUTE_URL__);assert.equal(url.searchParams.get('resume'),'1');assert.equal(url.searchParams.has('guided'),false);
  assert.deepEqual(context.journal.entries[0],JSON.parse(JSON.stringify(restored)));
});
