import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {build} from 'esbuild';
import {parse} from 'acorn';
import * as T from 'three';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import * as basins from '../functions/neobath-anima/studio-adapter/basins.js';
import {TOP_OPTIONS,BASIN_PRODUCTS,topSelection,isIntegratedTop,isVesselTop} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {CABINET_FORMATS,cabinetFormat,topAvailable,validWidth,animaCabinetDimensions} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {continuousPlanOption} from '../functions/neobath-anima/studio-adapter/continuous-plan-ui.js';
import {validateProject,encodeProject,decodeProject,continuousTopContext,continuousTopCompatible} from '../functions/neobath-anima/studio-adapter/projects.js';
import {surfaceOptions,normalizeTopSurface} from '../functions/neobath-anima/studio-adapter/premium-materials.js';
import {normalizeCabinetRoles,cabinetSettingsForRole} from '../functions/neobath-anima/studio-adapter/cabinet-role.js';
import {planSettings} from '../functions/neobath-anima/studio-adapter/premium-controls.js';

// This is a CPU integration check of genuine materials and model nodes. The
// image transport is stubbed; GPU rendering and photographic fidelity are not.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');
const adapt=transformCommonStudioSource;
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});
const dir=mkdtempSync(join(root,'node_modules/.cache/anima-premium-runtime-'));
const aliases=new Map(['model','configuration','finishes','tops','basins','column','mirrors'].map(n=>[join(studio,n+'.js'),join(adapter,n+'.js')]));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'model.js'))};export * from ${JSON.stringify(join(studio,'commerce/preview-model.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'model.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'premium-real-studio-one-model',setup(b){
  b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));
  b.onResolve({filter:/^@anima-adapter\//},a=>({path:join(adapter,a.path.slice('@anima-adapter/'.length))}));
  b.onResolve({filter:/^\./},a=>{const target=aliases.get(resolve(a.resolveDir,a.path));return target?{path:target}:undefined;});
  b.onLoad({filter:/studio-one\/src\/.*\.js$/},a=>{const rel=a.path.slice(studio.length+1).replaceAll('\\','/');let text=readFileSync(a.path,'utf8');if(rel==='model.js')text=transformOriginalModel(text);return {contents:adapt(text,rel),loader:'js',resolveDir:dirname(a.path)};});
}}]});
const M=await import(pathToFileURL(join(dir,'model.mjs')).href);
after(()=>rmSync(dir,{recursive:true,force:true}));
const originalTextureLoad=T.TextureLoader.prototype.load;
T.TextureLoader.prototype.load=function(url,onLoad){const texture=new T.Texture({src:url,width:16,height:16});texture.userData.sourceUrl=url;queueMicrotask(()=>onLoad?.(texture));return texture;};
after(()=>{T.TextureLoader.prototype.load=originalTextureLoad;});
const originalDocument=globalThis.document;globalThis.document={};
after(()=>{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;});

const source=adapt(readFileSync(join(studio,'app.js'),'utf8'),'app.js'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const functions=new Map(ast.body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));
const declarations=ast.body.flatMap(n=>n.type==='VariableDeclaration'?n.declarations:[]);
const cabinetKeys=declarations.find(n=>n.id.name==='CABINET_KEYS');
const CABINET_KEYS=vm.runInNewContext(source.slice(cabinetKeys.init.start,cabinetKeys.init.end));
const noop=()=>{};
const snapshot=item=>JSON.parse(JSON.stringify({version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[450,0],[450,450],[0,450]]},items:[{id:item.id,type:item.type,settings:item.settings,placement:item.placement}]}));
function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();}

function atelier(width=120){
  const state={ready:true,format:'pura-base-two',facadeMode:'overlay',width,finish:'rovere-alba',top:'bare',basinColor:'standard',topDrawer:'full',topSpan:width,topOffset:0,drawers:[0,0]};
  const asset=M.makeModel({width:width/100,format:'pura-base-two',basinTop:'bare',includeMirror:false});
  const item={id:'premium-cabinet',type:'cabinet',settings:{...state},asset,root:new T.Group(),decor:[],motion:{drawers:[0,0]},dimensions:animaCabinetDimensions(state),placement:{wall:0,u:150,height:30}};item.root.add(asset.root);
  const composition={selected:item,selectedId:item.id,items:[item],validate:()=>'',sync:noop,resize:(_item,dimensions)=>{item.dimensions=dimensions;return null;}};
  let rebuilds=0;
  const context={...basins,T,state,CABINET_KEYS,TOP_OPTIONS,CABINET_FORMATS,FINISHES:M.FINISHES,composition,model:asset,grain:null,roomScene:{},
    __animaRolePlanSettings:planSettings,__animaNormalizeRoles:normalizeCabinetRoles,__animaCabinetRole:cabinetSettingsForRole,projectWorkspace:{locked:false},isItemPositionLocked:()=>false,disposeObject:dispose,makeSceneAsset:(_type,s)=>M.makeModel({...s,width:s.width/100,basinTop:s.top,includeMirror:false}),
    __animaTopSelection:topSelection,__animaIntegrated:isIntegratedTop,__animaVessel:isVesselTop,__animaPlanOption:continuousPlanOption,
    __animaPremiumContext:continuousTopContext,__animaPremiumCompatible:continuousTopCompatible,validateProject,collectProject:()=>snapshot(item),
    topAvailable,validWidth,cabinetFormat,selectedCabinet:()=>true,itemDimensions:(_type,s)=>animaCabinetDimensions(s),
    $$:()=>[],$:()=>({textContent:'',replaceChildren:noop}),normalizeTopDrawer:v=>v,installCabinetTap:noop,decorateAsset:noop,
    refreshWidthUI:noop,refreshBasinUI:noop,refreshInspector:noop,renderComposition:noop,placementStatus:noop,invalidate:noop,
    makeModel:settings=>{if(++rebuilds>10)throw Error('Repeated atelier rebuild: '+JSON.stringify(settings));return M.makeModel(settings);},currentDrawers:[0,0],counterDecor:[],selectFinish:noop,setView:noop,releaseModel:old=>dispose(old.root),
    requestFinishAssets:async()=>null,finishTextures:{},scheduleProjectCheckpoint:noop};
  const names=['selectTop','selectBasinColor','saveCabinetState','setWidth','paintAsset','applyFurnitureMaterial',...[...functions.keys()].filter(name=>/^__anima/.test(name))];
  vm.createContext(context);vm.runInContext([...new Set(names)].filter(n=>functions.has(n)).map(n=>functions.get(n)).join('\n'),context);
  return {context,item,state};
}

test('real atelier selections update a distinct plan material and preserve strict project data',async()=>{
  const {context,item}=atelier();
  try{
    assert.equal(typeof item.asset.setSurface,'function','The real model needs a surface setter, beyond ceramic-only price state');
    assert.ok(item.asset.planMaterial,'The worktop must own its material');
    assert.notEqual(item.asset.planMaterial,item.asset.ceramic);assert.notEqual(item.asset.planMaterial,item.asset.frontWood);
    const signatures=new Set();
    for(const id of ['tgrs1a-linear-top','thpl1-linear-top','tfx1-linear-top','tpgea12-linear-top','txt12-linear-top']){
      const chosen=planSettings({items:[item]},item,id,{span:120,offset:0,ids:[item.id]});assert.ok(chosen);
      assert.equal(context.__animaPremiumApply(chosen),true);
      const surfaces=surfaceOptions(item.settings);assert.ok(surfaces.length,id+' manufacturer choices');
      for(const surface of surfaces){
        const next={...item.settings,topSurfaceId:surface.id,topSurfaceNcs:surface.customNcs?'S 2010-G10Y':''};
        const normalized=normalizeTopSurface(next);next.topPriceKey=normalized.priceKey;next.basinColor=normalized.priceKey;
        assert.equal(context.__animaPremiumApply(next),true,id+' / '+surface.id);
        await item.asset.prepareSurface();
        const valid=validateProject(snapshot(item));assert.deepEqual(decodeProject(encodeProject(valid)),valid);
        assert.equal(item.asset.spec.topSurfaceId,surface.id);assert.equal(item.settings.topSurfaceId,surface.id);
        if(surface.family==='fenix'&&surface.colorSource==='manufacturer field_background_color'){
          assert.equal(item.asset.planMaterial.map,null,'An officially uniform Fenix color must not inherit photographic lighting');
          assert.equal(item.asset.planMaterial.color.getHexString(),new T.Color(surface.hex).getHexString(),'Fenix uses its exact official manufacturer RGB');
          assert.equal(item.asset.planMaterial.roughness,surface.roughness);
        }else if(surface.texture)assert.equal(item.asset.planMaterial.map?.image?.src,surface.texture,'The chosen manufacturer pixels must reach the real worktop');
      }
      const meshes=[];item.asset.tops.root.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});
      assert.ok(meshes.length);assert.ok(meshes.some(o=>(Array.isArray(o.material)?o.material:[o.material]).includes(item.asset.planMaterial)),id+' actual deck material');
      signatures.add(JSON.stringify({color:item.asset.planMaterial.color.getHexString(),map:item.asset.planMaterial.map?.image?.src||null,roughness:item.asset.planMaterial.roughness,userData:item.asset.planMaterial.userData}));
      const preview=M.buildPreview(snapshot(item));try{M.applyPreviewSettings(preview,snapshot(item));await preview.items[0].asset.prepareSurface();
        assert.equal(preview.items[0].asset.spec.topSurfaceId,item.asset.spec.topSurfaceId);
        assert.equal(preview.items[0].asset.planMaterial.map?.image?.src,item.asset.planMaterial.map?.image?.src);
        assert.equal(preview.items[0].asset.planMaterial.color.getHexString(),item.asset.planMaterial.color.getHexString());
      }finally{dispose(preview.group);}
    }
    assert.equal(signatures.size,5,'The five plan families must retain their own source material identities');
  }finally{dispose(item.root);}
});

test('live selection never leaves a detached or obsolete basin group visible and keeps the chosen source reference',()=>{
  const {context,item}=atelier(),seen=[];
  const attached=object=>{for(let node=object;node;node=node.parent)if(node===item.root)return true;return false;};
  try{
    for(const id of ['tk120-integrated-top','pic12146dx-integrated-top','pic12146sx-integrated-top','tpc120-cover','b578-countertop-basin','bare']){
      const prior=item.asset.tops.root;assert.equal(context.selectTop(id),true,id);seen.push(prior);
      assert.ok(attached(item.asset.tops.root),id+' current top must be attached');
      for(const old of seen)if(old!==item.asset.tops.root)assert.equal(attached(old),false,id+' old top must leave the live scene');
      const selection=topSelection(id,120,'two');assert.equal(item.asset.spec.basinRef,selection?.reference||null);
      const visible=[];item.asset.tops.root.traverseVisible(o=>{if(o.isMesh)visible.push(o);});
      assert.equal(visible.length===0,id==='bare',id+' top has real visible geometry');
      validateProject(snapshot(item));
    }
  }finally{dispose(item.root);}
});

test('real basin color handlers repaint the active bowl, preserve a separate plan and survive restoration',async()=>{
  for(const id of ['pic8146-integrated-top','fo01-countertop-basin',...BASIN_PRODUCTS.filter(p=>/^eclisse/i.test(p.id)).map(p=>p.id)]){
    const {context,item}=atelier(80);
    try{
      assert.equal(context.selectTop(id),true,id);
      const colors=new Set(),variants=basins.basinColors(id,80,'two');
      for(const color of variants){
        assert.equal(context.selectBasinColor(color.id),true,id+' / '+color.id);
        await item.asset.prepareSurface();
        assert.equal(item.asset.ceramic.color.getHexString(),new T.Color(color.hex).getHexString());
        for(const property of ['roughness','clearcoat','transmission','opacity','thickness','ior'])if(color[property]!==undefined)assert.equal(item.asset.ceramic[property],color[property],id+' / '+color.id+' '+property);
        colors.add(item.asset.ceramic.color.getHexString());
        const bowls=[];item.asset.tops.root.traverseVisible(o=>{if(o.isMesh&&/^Vasque_/.test(o.name))bowls.push(o);});
        assert.ok(bowls.length,id+' visible bowl');assert.ok(bowls.every(bowl=>bowl.material===item.asset.ceramic),id+' selected color reaches actual bowl meshes');
        assert.equal(item.settings.basinColor,color.id);
        if(id.startsWith('pic'))assert.equal(item.asset.planMaterial.color.getHexString(),item.asset.ceramic.color.getHexString(),'A monobloc ceramic deck follows its bowl');
        if(id.startsWith('fo')&&color.id==='black-matte')assert.notEqual(item.asset.planMaterial.color.getHexString(),item.asset.ceramic.color.getHexString(),'A separate Geacril plan keeps its selected surface');
        const valid=decodeProject(encodeProject(validateProject(snapshot(item)))),settings=valid.items[0].settings;
        const restored=M.makeModel({...settings,width:settings.width/100,basinTop:settings.top,includeMirror:false});
        try{
          context.paintAsset({...item,asset:restored,root:restored.root,settings});await restored.prepareSurface();
          assert.equal(restored.ceramic.color.getHexString(),item.asset.ceramic.color.getHexString());
          assert.equal(restored.ceramic.transmission,item.asset.ceramic.transmission);
          assert.equal(restored.planMaterial.color.getHexString(),item.asset.planMaterial.color.getHexString());
          const preview=M.buildPreview(valid);try{M.applyPreviewSettings(preview,valid);await preview.items[0].asset.prepareSurface();
            assert.equal(preview.items[0].asset.ceramic.color.getHexString(),item.asset.ceramic.color.getHexString());
            assert.equal(preview.items[0].asset.ceramic.transmission,item.asset.ceramic.transmission);
            assert.equal(preview.items[0].asset.planMaterial.color.getHexString(),item.asset.planMaterial.color.getHexString());
          }finally{dispose(preview.group);}
        }finally{dispose(restored.root);}
      }
      if(/^eclisse/i.test(id)){
        assert.equal(colors.size,variants.length,id+' source finishes must remain visibly distinct');
        assert.equal(context.selectTop('pic8146-integrated-top'),true);assert.equal(item.asset.ceramic.transmission,0,'Returning from Eclisse to ceramic resets glass transmission');
      }
    }finally{dispose(item.root);}
  }
});

test('finish maps bind the same source pixels and coordinate frame to the front color and bump',async()=>{
  const finish=M.FINISHES.find(f=>f.id==='rovere-alba'),finishTextures={};
  const loadTexture=async url=>{const texture=new T.Texture({src:url});texture.colorSpace=T.SRGBColorSpace;texture.userData.sourceUrl=url;return texture;};
  const context={T,FINISHES:M.FINISHES,quality:{profile:{id:'balanced'}},finishTextures,
    loadTexture,tileAssetURL:v=>v,cacheTextures:(_key,load)=>load(),refreshFurnitureMaterials:noop,invalidate:noop,grain:null};
  vm.createContext(context);vm.runInContext(functions.get('requestFinishAssets')+'\n'+functions.get('applyFurnitureMaterial'),context);
  const tx=await context.requestFinishAssets(finish.id);
  assert.equal(tx.front.image.src,finish.frontTexture);
  assert.equal(tx.frontBump.image.src,tx.front.image.src,'The front bump cannot come from the perpendicular side sample');
  assert.deepEqual(tx.frontBump.repeat.toArray(),tx.front.repeat.toArray());assert.equal(tx.frontBump.rotation,tx.front.rotation);
  for(const format of ['two','ribelle-two']){
    const asset=M.makeModel({width:1.2,format,includeMirror:false});
    try{
      context.applyFurnitureMaterial(asset,'cabinet',finish);
      const expected=format==='two'?finish.frontTexture:finish.ribelleFrontTexture;
      assert.equal(asset.frontWood.map.image.src,expected,format+' correct manufacturer front');
      assert.equal(asset.frontWood.bumpMap.image.src,expected,format+' corresponding front bump');
      assert.equal(asset.frontWood.map.colorSpace,T.SRGBColorSpace);assert.equal(asset.frontWood.bumpMap.colorSpace,T.NoColorSpace);
      assert.equal(asset.frontWood.map.minFilter,T.LinearMipmapLinearFilter);assert.ok(asset.frontWood.map.anisotropy>=8);
    }finally{dispose(asset.root);}
  }
});
