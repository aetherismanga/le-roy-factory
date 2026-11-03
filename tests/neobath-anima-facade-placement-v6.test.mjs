import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import * as T from 'three';
import vm from 'node:vm';
import {parse} from 'acorn';
import {CABINET_FORMATS,cabinetFormat,animaCabinetDimensions} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {normalizeCabinetRoles} from '../functions/neobath-anima/studio-adapter/cabinet-role.js';
import {validateProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {matchingCabinetFacade} from '../functions/neobath-anima/studio-adapter/cabinet-controls.js';
import {furnitureAccessoryOptions,furnitureAccessoryProposal} from '../functions/neobath-anima/studio-adapter/furniture-accessories.js';
import {updateFurnitureAccessoryGeometry} from '../functions/neobath-anima/studio-adapter/furniture-accessory-geometry.js';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';

// Execute the actual atelier transaction and factory. Only rendering, UI and
// unrelated room collisions are stubbed; placement sync uses the real formula.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});const dir=mkdtempSync(join(root,'node_modules/.cache/anima-facade-placement-v6-'));
const aliases=new Map(['model','configuration','finishes','tops','basins','column','mirrors'].map(name=>[join(studio,name+'.js'),join(adapter,name+'.js')]));
await build({stdin:{contents:`export {makeModel} from ${JSON.stringify(join(adapter,'model.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'model.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'anima-facade-placement-real-factory',setup(b){
 b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));
 b.onResolve({filter:/^@anima-adapter\//},a=>({path:join(adapter,a.path.slice('@anima-adapter/'.length))}));
 b.onResolve({filter:/^\./},a=>{const path=aliases.get(resolve(a.resolveDir,a.path));return path?{path}:undefined;});
 b.onLoad({filter:/studio-one\/src\/.*\.js$/},a=>{const name=a.path.slice(studio.length+1).replaceAll('\\','/');let source=readFileSync(a.path,'utf8');if(name==='model.js')source=transformOriginalModel(source);return {contents:transformCommonStudioSource(source,name),loader:'js',resolveDir:dirname(a.path)};});
}}]});
const M=await import(pathToFileURL(join(dir,'model.mjs')).href);after(()=>rmSync(dir,{recursive:true,force:true}));
const oldLoad=T.TextureLoader.prototype.load;T.TextureLoader.prototype.load=function(url,onLoad){const texture=new T.Texture({src:url,width:16,height:16});queueMicrotask(()=>onLoad?.(texture));return texture;};after(()=>{T.TextureLoader.prototype.load=oldLoad;});
const source=transformCommonStudioSource(readFileSync(join(studio,'app.js'),'utf8'),'app.js'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),functions=new Map(ast.body.filter(node=>node.type==='FunctionDeclaration').map(node=>[node.id.name,source.slice(node.start,node.end)]));
const cabinetKeyNode=ast.body.flatMap(node=>node.type==='VariableDeclaration'?node.declarations:[]).find(node=>node.id.name==='CABINET_KEYS'),keys=vm.runInNewContext(source.slice(cabinetKeyNode.init.start,cabinetKeyNode.init.end));
function dispose(object){const geometry=new Set(),materials=new Set();object.traverse(node=>{if(node.isMesh){geometry.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});geometry.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());object.removeFromParent();}
function fixture(form,{withBasin=false,locked=false,readonly=false}={}){
 const width=form.allowedWidths.includes(80)?80:form.allowedWidths[0],settings={format:form.id,width,finish:'rovere-alba',top:withBasin?'tk80-integrated-top':'bare',topSpan:width,topOffset:0,topLength:width,topDrawer:withBasin?'siphon':'full',drawers:Array(form.drawers).fill(0),basinColor:withBasin?'white-gloss':'standard',tap:null,accessoryState:{towel:{side:'left',finish:'black'},feet:{height:35,finish:'chrome'}}};
 const placement={wall:1,u:178.25,height:form.subtype==='wall'?137:47,offset:13.5,rotation:17};
 const asset=M.makeModel({...settings,width:width/100,basinTop:settings.top,includeMirror:false}),rootGroup=new T.Group();rootGroup.add(asset.root);
 const item={id:'cabinet-to-keep',type:'cabinet',settings,placement,asset,root:rootGroup,decor:[],motion:{drawers:Array(form.drawers).fill(.075)},dimensions:animaCabinetDimensions(settings),locked};
 const wall={start:new T.Vector3(1,0,2),normal:new T.Vector3(Math.sin(.43),0,Math.cos(.43)),group:new T.Group()};wall.group.rotation.y=.43;
 const events=[],allocated=[],camera={position:new T.Vector3(3,2,5),target:new T.Vector3(1,.8,0)};
 const sync=current=>{const tangent=new T.Vector3(Math.cos(wall.group.rotation.y),0,-Math.sin(wall.group.rotation.y));current.root.position.copy(wall.start).addScaledVector(tangent,current.placement.u/100).addScaledVector(wall.normal,.23+(current.placement.offset||0)/100);current.root.position.y=current.placement.height/100-current.dimensions.base;current.root.rotation.y=wall.group.rotation.y;current.root.updateMatrixWorld(true);};sync(item);
 const composition={items:[item],selectedId:item.id,locked:false,get selected(){return this.items[0];},sync,validate:(_item,p,d)=>{events.push(['validate',structuredClone(p),{...d}]);return context.rejectPlacement?'Un autre élément occupe cet emplacement.':'';}};
 const collectProject=()=>({version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[500,0],[500,400],[0,400]]},items:[{id:item.id,type:item.type,settings:structuredClone(item.settings),placement:structuredClone(item.placement),locked:item.locked}]});
 const context={T,CABINET_FORMATS,cabinetFormat,composition,CABINET_KEYS:keys,projectWorkspace:{locked:readonly},state:{...settings},model:asset,currentDrawers:item.motion.drawers,counterDecor:[],collectProject,__animaNormalizeRoles:normalizeCabinetRoles,validateProject,itemDimensions:(_type,s)=>animaCabinetDimensions(s),isItemPositionLocked:(_composition,item)=>!!item.locked,makeSceneAsset:(_type,s)=>{const next=M.makeModel({...s,width:s.width/100,basinTop:s.top,includeMirror:false});allocated.push(next);return next;},paintAsset:()=>{if(context.failPaint){context.failPaint=false;throw Error('paint failure');}},__animaSyncContinuousTops:()=>{},disposeObject:dispose,renderComposition:()=>{},refreshWidthUI:()=>{},refreshBasinUI:()=>{},refreshInspector:()=>{},invalidate:()=>{},scheduleProjectCheckpoint:()=>events.push('checkpoint'),placementStatus:message=>events.push(message),__animaOriginal_changeCabinetFormat:()=>{throw Error('A facade-only change may not enter the old repositioning path.');},camera,controls:{target:camera.target}};
 vm.createContext(context);for(const name of [...new Set(['__animaRefreshRoleSelection','__animaChangeCabinetFacade','__animaCommitCabinetProject','__animaPremiumApply',...[...functions.keys()].filter(name=>/^__anima.*ChangeCabinetFormat$/.test(name)),'changeCabinetFormat'])])vm.runInContext(functions.get(name),context);
 return {item,context,events,camera,allocated,cleanup(){dispose(item.root);}};
}
function matrix(object){object.updateMatrixWorld(true);return object.matrixWorld.elements.slice();}

test('Pura ↔ Ribelle preserves actual placement and world geometry for every source cabinet shape',()=>{
 const models=CABINET_FORMATS.filter(form=>form.facade==='PURA');assert.equal(models.length,8);
 for(const form of models){const fixtureState=fixture(form,{withBasin:form.subtype==='vanity'}),{item,context,camera,events}=fixtureState;
  try{const before={placement:structuredClone(item.placement),dimensions:{...item.dimensions},root:matrix(item.root),asset:matrix(item.asset.root),camera:camera.position.toArray(),target:camera.target.toArray(),settings:structuredClone(item.settings),motion:item.motion.drawers.slice()};
   for(const facade of ['RIBELLE','PURA']){const next=matchingCabinetFacade(item.settings.format,facade);assert.ok(next);const old=item.asset;assert.equal(context.changeCabinetFormat(next.id),true,form.id+' → '+facade+' '+JSON.stringify(events));assert.equal(item.settings.format,next.id);assert.notEqual(item.asset,old);assert.equal(old.root.parent,null);assert.equal(item.root.children.length,1);assert.deepEqual({...item.placement},before.placement);assert.deepEqual(item.dimensions,before.dimensions);assert.deepEqual(matrix(item.root),before.root);assert.deepEqual(matrix(item.asset.root),before.asset);assert.deepEqual(camera.position.toArray(),before.camera);assert.deepEqual(camera.target.toArray(),before.target);assert.equal(item.settings.width,before.settings.width);assert.deepEqual(item.settings.accessoryState,before.settings.accessoryState);assert.equal(item.settings.top,before.settings.top);assert.equal(item.settings.finish,before.settings.finish);assert.deepEqual(item.motion.drawers,before.motion);assert.equal(item.settings.drawers.length,form.drawers);}
   assert.equal(events.filter(event=>event==='checkpoint').length,2);const unchanged=item.asset;assert.equal(context.changeCabinetFormat(item.settings.format),true);assert.equal(item.asset,unchanged,'clicking the already selected facade is a no-op');assert.equal(events.filter(event=>event==='checkpoint').length,2);
  }finally{fixtureState.cleanup();}
 }
});

test('locked and read-only facade changes leave the existing cabinet and accessories untouched',()=>{
 for(const options of [{locked:true},{readonly:true}]){const f=fixture(cabinetFormat('pura-base-two'),options),{item,context}=f;try{const before={placement:structuredClone(item.placement),settings:structuredClone(item.settings),root:matrix(item.root),asset:item.asset},next=matchingCabinetFacade(item.settings.format,'RIBELLE');assert.equal(context.changeCabinetFormat(next.id),false);assert.equal(item.asset,before.asset);assert.deepEqual({...item.placement},before.placement);assert.deepEqual(item.settings,before.settings);assert.deepEqual(matrix(item.root),before.root);assert.equal(f.allocated.length,0);}finally{f.cleanup();}}
});


test('explicit placement options are validated and committed once, while later facade changes keep that requested height',()=>{
 const f=fixture(cabinetFormat('pura-base-two')),{item,context,events,camera}=f;
 try{const originalAsset=item.asset,position=structuredClone(item.placement),view=camera.position.toArray();
  for(const height of [15,35]){assert.equal(context.__animaPremiumApply({...item.settings},{placement:{height}}),true,JSON.stringify(events));assert.equal(item.placement.height,height);for(const key of ['wall','u','offset','rotation'])assert.equal(item.placement[key],position[key]);assert.equal(item.asset,originalAsset,'a placement-only change need not allocate a different caisson');assert.ok(events.some(event=>Array.isArray(event)&&event[0]==='validate'&&event[1].height===height),'validate the proposed placement, not the previous height');}
  assert.equal(events.filter(event=>event==='checkpoint').length,2);const before=matrix(item.root);assert.equal(context.changeCabinetFormat(matchingCabinetFacade(item.settings.format,'RIBELLE').id),true);assert.equal(item.placement.height,35);assert.deepEqual(matrix(item.root),before);assert.deepEqual(camera.position.toArray(),view);
 }finally{f.cleanup();}
});

test('failed explicit placement rolls back the settings and actual world transform',()=>{
 for(const failure of ['collision','paint','invalid']){const f=fixture(cabinetFormat('pura-base-two')),{item,context,events}=f;
  try{const before={placement:structuredClone(item.placement),settings:structuredClone(item.settings),root:matrix(item.root),asset:item.asset};if(failure==='collision')context.rejectPlacement=true;if(failure==='paint')context.failPaint=true;assert.equal(context.__animaPremiumApply({...item.settings},{placement:{height:failure==='invalid'?NaN:15}}),false,failure);assert.deepEqual(item.placement,before.placement,failure);assert.deepEqual(item.settings,before.settings,failure);assert.deepEqual(matrix(item.root),before.root,failure);assert.equal(item.asset,before.asset,failure);assert.equal(events.filter(event=>event==='checkpoint').length,0,failure);
  }finally{f.cleanup();}
 }
});


test('Pura ↔ Ribelle keeps the real SideBar and Bridge settings, dimensions and world positions at both catalogue heights',()=>{
 for(const height of [15,35]){const f=fixture(cabinetFormat('pura-base-two')),{item,context}=f;
  try{context.paintAsset=current=>updateFurnitureAccessoryGeometry(current.asset,current.settings);const support=furnitureAccessoryOptions(item.settings).supports.find(option=>option.height===height);assert.ok(support,'catalogue documents Bridge '+height+' cm');const proposal=furnitureAccessoryProposal(item.settings,{towelSide:height===15?'left':'right',towelFinish:height===15?'chrome':'black-matte',supportId:support.id,supportFinish:'black-matte'},item.placement);assert.equal(context.__animaPremiumApply(proposal.settings,{placement:proposal.placement}),true);const before={placement:structuredClone(item.placement),settings:structuredClone(item.settings),root:matrix(item.root),support:matrix(item.asset.animaFurnitureAccessories.supportRoot),towel:matrix(item.asset.animaFurnitureAccessories.towelRoot)};
   for(const facade of ['RIBELLE','PURA']){assert.equal(context.changeCabinetFormat(matchingCabinetFacade(item.settings.format,facade).id),true);assert.deepEqual({...item.placement},before.placement);assert.deepEqual(matrix(item.root),before.root);for(const key of ['supportId','supportFinish','supportSuspendedHeight','towelSide','towelFinish'])assert.equal(item.settings[key],before.settings[key],key);const geometry=item.asset.animaFurnitureAccessories;assert.ok(geometry.supportRoot);assert.ok(geometry.towelRoot);assert.deepEqual(matrix(geometry.supportRoot),before.support);assert.deepEqual(matrix(geometry.towelRoot),before.towel);assert.equal(geometry.supportRoot.userData.animaAccessory.height,height/100);assert.equal(geometry.towelRoot.userData.animaAccessory.length,.4);}
  }finally{f.cleanup();}
 }
});
