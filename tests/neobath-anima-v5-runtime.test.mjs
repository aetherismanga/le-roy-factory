import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import * as T from 'three';
import vm from 'node:vm';
import {parse} from 'acorn';
import {PRODUCT_BY_ID,topSelection} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {cabinetFormat,CABINET_FORMATS,animaCabinetDimensions} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {normalizeCabinetRoles,cabinetSettingsForRole} from '../functions/neobath-anima/studio-adapter/cabinet-role.js';
import {validateProject,encodeProject,decodeProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {prepareAnimaBasinProduct,resolveAnimaBasinDrop} from '../functions/neobath-anima/studio-adapter/basin-interaction.js';
import {basinColors} from '../functions/neobath-anima/studio-adapter/basins.js';
import {planSettings,premiumBasinChoices} from '../functions/neobath-anima/studio-adapter/premium-controls.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
import {puraCabinetModels,cabinetChoiceModel} from '../functions/neobath-anima/studio-adapter/cabinet-controls.js';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';

// Independent checks run the actual adapted factory and serialized project
// contracts. They make no claim about GPU/PBR image fidelity.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});const dir=mkdtempSync(join(root,'node_modules/.cache/anima-v5-runtime-'));
const aliases=new Map(['model','configuration','finishes','tops','basins','column','mirrors'].map(name=>[join(studio,name+'.js'),join(adapter,name+'.js')]));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'model.js'))};export {vesselGeometry} from ${JSON.stringify(join(adapter,'tops.js'))};export * from ${JSON.stringify(join(studio,'commerce/preview-model.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'model.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'anima-v5-real-factory',setup(b){
 b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));
 b.onResolve({filter:/^@anima-adapter\//},a=>({path:join(adapter,a.path.slice('@anima-adapter/'.length))}));
 b.onResolve({filter:/^\./},a=>{const path=aliases.get(resolve(a.resolveDir,a.path));return path?{path}:undefined;});
 b.onLoad({filter:/studio-one\/src\/.*\.js$/},a=>{const name=a.path.slice(studio.length+1).replaceAll('\\','/');let source=readFileSync(a.path,'utf8');if(name==='model.js')source=transformOriginalModel(source);return {contents:transformCommonStudioSource(source,name),loader:'js',resolveDir:dirname(a.path)};});
}}]});
const M=await import(pathToFileURL(join(dir,'model.mjs')).href);after(()=>rmSync(dir,{recursive:true,force:true}));
const priorLoad=T.TextureLoader.prototype.load,priorDocument=globalThis.document;T.TextureLoader.prototype.load=function(url,onLoad){const tx=new T.Texture({src:url,width:32,height:32});queueMicrotask(()=>onLoad?.(tx));return tx;};globalThis.document={};after(()=>{T.TextureLoader.prototype.load=priorLoad;if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;});
const close=(a,b,label='value')=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} vs ${b}`);
function cabinet(id,u=150,settings={}){return {id,type:'cabinet',settings:{format:'pura-base-two',width:80,finish:'rovere-alba',top:'bare',topDrawer:'full',drawers:[0,0],...settings},placement:{wall:0,u,height:30}};}
function project(items){return {version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[500,0],[500,400],[0,400]]},items};}
function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.removeFromParent();}

test('the cabinet choice contains five photographed stock shapes and maps vanity records onto their base choice',()=>{
 const choices=puraCabinetModels();assert.equal(choices.length,5);assert.ok(choices.every(form=>form.subtype!=='vanity'));
 for(const form of CABINET_FORMATS.filter(form=>form.subtype==='vanity')){const choice=cabinetChoiceModel(form);assert.ok(choice);assert.equal(choice.subtype,'base');for(const key of ['height','depth','trueDrawers','doors'])assert.equal(choice[key],form[key],key);}
});

test('real stock cabinet roles and prices switch both ways with basin addition/removal without changing dimensions or placement',()=>{
 for(const form of CABINET_FORMATS.filter(form=>form.subtype==='base'&&(form.trueDrawers||form.doors===2))){
  const width=form.allowedWidths.includes(80)?80:form.allowedWidths[0],item=cabinet(form.id,150,{format:form.id,width,drawers:Array(form.drawers).fill(0)}),source=project([item]),before=structuredClone(source);
  const settings=planSettings(source,item,'tfx1-linear-top',{span:width,offset:0,ids:[item.id]},'vasca-a50');assert.ok(settings,form.id+' basin available');
  const withBasin=normalizeCabinetRoles(project([{...item,settings}])),actual=withBasin.items[0],vanity=cabinetFormat(actual.settings.format);assert.equal(vanity.subtype,'vanity');assert.equal(actual.settings.topDrawer,'siphon');assert.equal(vanity.facade,form.facade);assert.equal(actual.settings.width,width);assert.equal(actual.settings.finish,'rovere-alba');assert.deepEqual(actual.placement,item.placement);assert.ok(vanity.productsByWidth[width]?.ref);assert.doesNotThrow(()=>validateProject(withBasin));
  const removed=planSettings(withBasin,actual,'tfx1-linear-top',{span:width,offset:0,ids:[item.id]});assert.ok(removed);const without=normalizeCabinetRoles(project([{...actual,settings:removed}]));assert.equal(without.items[0].settings.format,form.id);assert.equal(without.items[0].settings.topDrawer,'full');assert.deepEqual(decodeProject(encodeProject(without)),without);assert.equal(quoteProject(without).rows[0].productId,form.productsByWidth[width].id);assert.deepEqual(source,before,'normalization may not mutate the saved source project');
 }
 const narrow=cabinet('narrow',150,{format:'pura-base-door',width:40,drawers:[0]});assert.throws(()=>cabinetSettingsForRole(narrow.settings,true),'no fictional 40 cm vanity SKU');
});

test('a basin on a continuous top converts the real supporting cabinet rather than blindly converting the top owner',()=>{
 const host=cabinet('host',150,{width:100,top:'vasca-a50',topPlanId:'tfx1-linear-top',topSpan:180,topOffset:40,topLength:180,basinLayout:'right',basinColor:'standard'}),other=cabinet('other',240),source=project([host,other]);
 const right=normalizeCabinetRoles(source);assert.equal(cabinetFormat(right.items[0].settings.format).subtype,'base');assert.equal(cabinetFormat(right.items[1].settings.format).subtype,'vanity');assert.equal(right.items[1].settings.top,'bare');assert.doesNotThrow(()=>validateProject(right));
 const left=normalizeCabinetRoles({...right,items:right.items.map(item=>item.id===host.id?{...item,settings:{...item.settings,basinLayout:'left'}}:item)});assert.equal(cabinetFormat(left.items[0].settings.format).subtype,'vanity');assert.equal(cabinetFormat(left.items[1].settings.format).subtype,'base');assert.deepEqual(left.items.map(item=>item.placement),source.items.map(item=>item.placement));assert.doesNotThrow(()=>validateProject(left));
});

test('the photographed Ocritech oval is a soft rectangle with distinct rounded corners, not a pure ellipse or sharp box',()=>{
 const product=PRODUCT_BY_ID.get('pf149380a-countertop-basin'),geometry=M.vesselGeometry(product),positions=geometry.attributes.position;geometry.computeBoundingBox();const box=geometry.boundingBox;close(box.max.x-box.min.x,product.width/100);close(box.max.z-box.min.z,product.depth/100);
 let maximum=0;for(let i=0;i<positions.count;i++){const x=positions.getX(i)/(product.width/200),z=positions.getZ(i)/(product.depth/200);maximum=Math.max(maximum,x*x+z*z);}assert.ok(maximum>1.15&&maximum<1.75,'the manufacturer photo shows four short sides with strongly rounded corners');geometry.dispose();
});

test('changing real basin families leaves one mounted assembly and detaches every obsolete bowl',()=>{
 const asset=M.makeModel({width:1.2,format:'two',basinTop:'bare',includeMirror:false}),oldRoots=[];
 try{for(const top of ['tk120-integrated-top','eclisse116-countertop-basin','pic12146dx-integrated-top','eclisse115-s-semi-recessed-basin','vasca-a50','eclisse114-countertop-basin','bare']){
   const settings={top,topSpan:120,topLength:120,topOffset:0,topShift:0,basinLayout:'center',basinOffsetX:0,basinOffsetZ:0,topPlanId:top==='vasca-a50'?'tfx1-linear-top':''};
   const previous=asset.tops.root;assert.equal(asset.setTop(top,settings),true,top);oldRoots.push(previous);asset.root.updateMatrixWorld(true);
   const active=[];asset.root.traverseVisible(o=>{if(o.name==='NEOBATH_ANIMA_PLAN')active.push(o);});assert.equal(active.length,1,top+' must have one mounted plan');for(const old of oldRoots)if(old!==asset.tops.root)assert.equal(old.parent,null,top+' obsolete root detached');
   const selection=topSelection(top,120,'two','center',120,settings.topPlanId,120,settings);assert.ok(selection);assert.equal(asset.tops.root.userData.animaTop?.wells?.length||0,selection.positions.length);const attachedBowls=[];asset.root.traverseVisible(o=>{if(o.isMesh&&o.userData.animaSurfaceRole==='bowl')attachedBowls.push(o);});assert.equal(attachedBowls.length,top==='bare'?0:selection.positions.length,top+' no duplicate bowl surfaces');
   const demo=[];asset.root.traverseVisible(o=>{if(/Vasque_(SELLA|TAMPA)|^Vasque_(NERIS|TORNE)/.test(o.name))demo.push(o.name);});assert.deepEqual(demo,[]);
  }
 }finally{dispose(asset.root);}
});


function atelierFixture(){
 const input=cabinet('live'),settings=input.settings,asset=M.makeModel({...settings,width:settings.width/100,basinTop:settings.top,includeMirror:false}),rootGroup=new T.Group();rootGroup.add(asset.root);
 const item={...input,asset,root:rootGroup,dimensions:animaCabinetDimensions(settings),decor:[],motion:{drawers:[0,0]}};
 const source=transformCommonStudioSource(readFileSync(join(studio,'app.js'),'utf8'),'app.js'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),functions=new Map(ast.body.filter(node=>node.type==='FunctionDeclaration').map(node=>[node.id.name,source.slice(node.start,node.end)]));
 const keyNode=ast.body.flatMap(node=>node.type==='VariableDeclaration'?node.declarations:[]).find(node=>node.id.name==='CABINET_KEYS'),keys=vm.runInNewContext(source.slice(keyNode.init.start,keyNode.init.end)),events=[],allocated=[];
 const composition={items:[item],selectedId:item.id,locked:false,validate:()=>'',sync:()=>{},get selected(){return this.items.find(candidate=>candidate.id===this.selectedId);}};
 const context={T,composition,CABINET_KEYS:keys,state:{...settings,drawers:[0,0]},model:asset,currentDrawers:[0,0],counterDecor:[],projectWorkspace:{locked:false},__animaNormalizeRoles:normalizeCabinetRoles,validateProject,itemDimensions:(_type,value)=>animaCabinetDimensions(value),isItemPositionLocked:(composition,item)=>composition.locked||item.locked,
  makeSceneAsset:(_type,value)=>{const next=M.makeModel({...value,width:value.width/100,basinTop:value.top,includeMirror:false});allocated.push(next);events.push(['create',next.format.subtype]);return next;},
  paintAsset:current=>{events.push(['paint',current.settings.format]);if(context.failPaint){context.failPaint=false;throw Error('paint failure');}},__animaSyncContinuousTops:()=>events.push('siphons'),disposeObject:object=>{events.push(['dispose',object]);dispose(object);},renderComposition:()=>{},refreshWidthUI:()=>{},refreshBasinUI:()=>{},refreshInspector:()=>{},invalidate:()=>{},scheduleProjectCheckpoint:()=>events.push('checkpoint'),placementStatus:message=>events.push(['status',message])};
 vm.createContext(context);for(const name of ['__animaRefreshRoleSelection','__animaCommitCabinetProject']){assert.ok(functions.has(name),name+' present in production bundle source');vm.runInContext(functions.get(name),context);}
 return {context,item,events,allocated,cleanup(){dispose(item.root);for(const other of allocated)if(other!==item.asset&&other.root.parent)dispose(other.root);}};
}

test('the actual atelier transaction rebuilds a base carcass into a vanity and back, keeping only the replacement assembly',()=>{
 const fixture=atelierFixture(),{item,context,events}=fixture,old=item.asset;
 try{item.settings.drawers=[1,0];item.motion.drawers=[.123,0];old.drawers[0].position.z=.123;const input=project([{id:item.id,type:item.type,settings:{...item.settings,top:'vasca-a50',topPlanId:'tfx1-linear-top',basinColor:'standard',topSpan:80,topLength:80},placement:{...item.placement}}]);assert.equal(context.__animaCommitCabinetProject(input),true);assert.notEqual(item.asset,old);assert.equal(item.asset.format.subtype,'vanity');assert.equal(item.asset.carcassTop,undefined);assert.equal(old.root.parent,null);assert.equal(item.root.children.length,1);assert.equal(item.settings.topDrawer,'siphon');close(item.motion.drawers[0],.123,'open drawer animation stays in metres');close(item.asset.drawers[0].position.z,.123,'the replacement retains its opening without a one metre jump');assert.equal(events.filter(event=>event==='checkpoint').length,1);assert.ok(item.asset.tops.root.userData.animaTop.wells.length===1);
  const current=item.asset,without=project([{id:item.id,type:item.type,settings:{...item.settings,top:'bare',topPlanId:'',topSurfaceId:'',topPriceKey:'',basinPriceKey:'',basinBottom:'none',basinSupport:false},placement:{...item.placement}}]);assert.equal(context.__animaCommitCabinetProject(without),true);assert.notEqual(item.asset,current);assert.equal(item.asset.format.subtype,'base');assert.ok(item.asset.carcassTop);assert.equal(item.settings.topDrawer,'full');assert.equal(current.root.parent,null);assert.equal(item.root.children.length,1);assert.equal(events.filter(event=>event==='checkpoint').length,2);
 }finally{fixture.cleanup();}
});

test('a failed or locked actual atelier transaction keeps the original cabinet, plan and saved settings intact',()=>{
 for(const failure of ['paint','locked','readonly']){const fixture=atelierFixture(),{item,context,events}=fixture,old=item.asset,before=structuredClone(item.settings);
  try{if(failure==='paint')context.failPaint=true;else if(failure==='locked')item.locked=true;else context.projectWorkspace.locked=true;
   const input=project([{id:item.id,type:item.type,settings:{...item.settings,top:'vasca-a50',topPlanId:'tfx1-linear-top',basinColor:'standard',topSpan:80,topLength:80},placement:{...item.placement}}]);assert.equal(context.__animaCommitCabinetProject(input),false,failure);assert.equal(item.asset,old,failure);assert.deepEqual(item.settings,before,failure);assert.equal(item.root.children.length,1);assert.equal(old.root.parent,item.root);assert.equal(events.filter(event=>event==='checkpoint').length,0);assert.equal(old.format.subtype,'base');assert.ok(old.carcassTop);if(failure!=='paint')assert.equal(events.filter(event=>Array.isArray(event)&&event[0]==='create').length,0,'locks reject before geometry allocation');
  }finally{fixture.cleanup();}
 }
});


test('every smoked Eclisse keeps its sealed bowl with separately priced removable bottom and support options',()=>{
 for(const id of ['eclisse116-countertop-basin','eclisse115-countertop-basin','eclisse114-countertop-basin','eclisse116-s-semi-recessed-basin','eclisse115-s-semi-recessed-basin','eclisse114-s-semi-recessed-basin']){
  const host=cabinet(id),source=project([host]),selected=planSettings(source,host,'tfx1-linear-top',{span:80,offset:0,ids:[id]},id);assert.ok(selected,id);Object.assign(selected,{basinColor:'fume-matte',basinPriceKey:'fume-matte',basinBottom:'none',basinSupport:false});
  const none=normalizeCabinetRoles(project([{...host,settings:selected}])),baseQuote=quoteProject(none),ref=PRODUCT_BY_ID.get(id).ref.match(/(114|115|116)/)[1];assert.doesNotThrow(()=>validateProject(none));assert.equal(baseQuote.rows.filter(row=>/^TVL|^SUP/.test(row.ref)).length,0);
  const withOptions=normalizeCabinetRoles({...none,items:none.items.map(item=>({...item,settings:{...item.settings,basinBottom:'tvl',basinSupport:true,accessoryId:'sup'+ref+'-accessory'}}))}),restored=decodeProject(encodeProject(withOptions)),quote=quoteProject(restored);assert.equal(restored.items[0].settings.basinBottom,'tvl');assert.equal(restored.items[0].settings.basinSupport,true);assert.equal(quote.rows.filter(row=>row.ref==='TVL'+ref).length,1);assert.equal(quote.rows.filter(row=>row.ref==='SUP'+ref).length,1,'the separate generic accessory field may not double-charge the same support');assert.equal(quote.publicTTC-baseQuote.publicTTC,22560+12600);
  const s=restored.items[0].settings,asset=M.makeModel({...s,width:s.width/100,basinTop:s.top,includeMirror:false});try{asset.setBasinAppearance(basinColors(s.top,s.width,s.format,s.basinLayout,s.topSpan,s.topPlanId,s.topLength,s).find(color=>color.id==='fume-matte'));const meta=asset.tops.root.userData.animaTop;assert.equal(meta.wells.length,1);assert.deepEqual(meta.accessories.map(value=>value.ref).sort(),['SUP'+ref,'TVL'+ref]);const shell=asset.tops.bowlMeshes[0];assert.ok(shell,'a sealed vessel shell remains beneath the removable insert');assert.ok(asset.ceramic.transmission>0);assert.equal(shell.material,asset.ceramic);}finally{dispose(asset.root);}
  const invalid=structuredClone(restored);Object.assign(invalid.items[0].settings,{basinColor:'white-matte',basinPriceKey:'white-matte'});assert.throws(()=>validateProject(invalid),'smoked-only accessories do not silently survive an incompatible colour');
 }
});

test('the actual continuous-top synchronizer follows basin X and depth into the second cabinet without resetting Z',()=>{
 const raw=project([cabinet('owner',150,{width:100,top:'vasca-a50',topPlanId:'tfx1-linear-top',topSpan:180,topOffset:40,topLength:180,basinLayout:'right',basinColor:'standard',topDepth:60,basinOffsetX:2,basinOffsetZ:-5}),cabinet('support',240)]),normalized=normalizeCabinetRoles(raw);assert.doesNotThrow(()=>validateProject(normalized));
 const items=normalized.items.map(raw=>{const asset=M.makeModel({...raw.settings,width:raw.settings.width/100,basinTop:raw.settings.top,includeMirror:false}),root=new T.Group();root.add(asset.root);return {...raw,asset,root};}),host=items[0],support=items[1];
 try{const source=transformCommonStudioSource(readFileSync(join(studio,'app.js'),'utf8'),'app.js'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='__animaSyncContinuousTops'),composition={items,selectedId:host.id};let calls=0;const set=support.asset.setBasinCenters;support.asset.setBasinCenters=(...args)=>{calls++;return set(...args);};
  const context={composition,cabinetFormat,__animaTopSelection:topSelection,__animaValidPlan:()=>true,itemDimensions:(_type,s)=>animaCabinetDimensions(s),state:{},installCabinetTap:()=>{}};vm.createContext(context);vm.runInContext(source.slice(node.start,node.end),context);context.__animaSyncContinuousTops();
  const point=host.asset.getBasinPositions()[0],actual=support.asset.getPlumbingPositions()[0];assert.ok(actual);close(actual.x,point.x+(host.placement.u-support.placement.u)/100,'siphon X');close(actual.z,point.z,'siphon depth');assert.notEqual(actual.z,.020);assert.equal(support.asset.getTopDrawer(),'siphon');assert.equal(calls,1);context.__animaSyncContinuousTops();assert.equal(calls,1,'identical layouts do not rebuild the drawer repeatedly');
  host.settings.basinOffsetZ=-4;assert.equal(host.asset.setTop(host.settings.top,host.settings),true);context.__animaSyncContinuousTops();close(support.asset.getPlumbingPositions()[0].z,host.asset.getBasinPositions()[0].z);assert.equal(calls,2);
 }finally{for(const item of items)dispose(item.root);}
});

test('dropping a configured smoked basin onto another real cabinet preserves its colour and bottom options',()=>{
 const source=cabinet('source',100),target=cabinet('target',250),data=project([source,target]),selected=planSettings(data,source,'tfx1-linear-top',{span:80,offset:0,ids:[source.id]},'eclisse116-countertop-basin');Object.assign(selected,{basinColor:'fume-matte',basinPriceKey:'fume-matte',basinBottom:'tvl',basinSupport:true});const product=prepareAnimaBasinProduct('eclisse116-countertop-basin',selected,data);
 const items=data.items.map(raw=>{const asset=M.makeModel({...raw.settings,width:raw.settings.width/100,basinTop:raw.settings.top,includeMirror:false}),root=new T.Group();root.position.x=raw.placement.u/100;root.add(asset.root);return {...raw,asset,root};});
 try{const ray=new T.Ray(new T.Vector3(2.5,2,.0155),new T.Vector3(0,-1,0)),drop=resolveAnimaBasinDrop({ray,composition:{items},product});assert.equal(drop.error,'');assert.equal(drop.options.basinTargetId,target.id);for(const key of ['basinColor','basinPriceKey','basinBottom','basinSupport'])assert.equal(drop.options.basinSettings[key],selected[key],key);const normalized=normalizeCabinetRoles({...data,items:data.items.map(item=>item.id===target.id?{...item,settings:drop.options.basinSettings}:item)});assert.doesNotThrow(()=>validateProject(normalized));assert.equal(quoteProject(normalized).rows.filter(row=>row.ref==='TVL116').length,1);assert.equal(data.items[0].settings.top,'bare','a drag does not mutate the source project');
 }finally{for(const item of items)dispose(item.root);}
});
