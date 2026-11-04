import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {parse} from 'acorn';
import vm from 'node:vm';
import * as T from 'three';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
import {draftProject,initialDraft} from '../functions/neobath-anima/studio-adapter/commerce/guided.js';
import {standalonePlanSettings} from '../functions/neobath-anima/studio-adapter/standalone-worktop-data.js';
import {validateProject,encodeProject,decodeProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
import {normalizeCabinetRoles} from '../functions/neobath-anima/studio-adapter/cabinet-role.js';
const root=resolve('.'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');mkdirSync('node_modules/.cache',{recursive:true});const dir=mkdtempSync(join(root,'node_modules/.cache/anima-tap-runtime-'));
const aliases=new Map(['configuration','basins','mirrors','column','tops','finishes'].map(name=>[join(studio,name+'.js'),join(adapter,name+'.js')]));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'tap-automation-runtime.js'))};export * from ${JSON.stringify(join(adapter,'tap-compatibility-runtime.js'))};export {Composition,itemDimensions} from ${JSON.stringify(join(studio,'composition.js'))};export {makeRoom} from ${JSON.stringify(join(studio,'room.js'))};export {makeStandaloneWorktop} from ${JSON.stringify(join(adapter,'standalone-worktop.js'))};export {makeModel} from ${JSON.stringify(join(adapter,'model.js'))};export {makeEquipment} from ${JSON.stringify(join(studio,'equipment.js'))};export {AQUAHOME} from ${JSON.stringify(join(studio,'taps.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'runtime.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'anima-tap-native-runtime',setup(b){b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));b.onResolve({filter:/^@anima-adapter\//},a=>({path:join(adapter,a.path.slice('@anima-adapter/'.length))}));b.onResolve({filter:/^\./},a=>{const target=aliases.get(resolve(a.resolveDir,a.path));return target?{path:target}:undefined;});b.onLoad({filter:/\.(js|mjs)$/},a=>{if(a.path===join(studio,'composition.js'))return {contents:transformCommonStudioSource(readFileSync(a.path,'utf8'),'composition.js'),loader:'js',resolveDir:dirname(a.path)};if(a.path===join(studio,'model.js'))return {contents:transformOriginalModel(readFileSync(a.path,'utf8')),loader:'js',resolveDir:dirname(a.path)};});}}]});
const M=await import(pathToFileURL(join(dir,'runtime.mjs')).href);after(()=>rmSync(dir,{recursive:true,force:true}));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-7,label+': '+a+' vs '+b);
function disposeRoot(root){const gs=new Set(),ms=new Set();root.traverse(n=>{if(n.isMesh){if(n.geometry)gs.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])if(m)ms.add(m);}});for(const g of gs)g.dispose();for(const m of ms)m.dispose();}
function fixture({width=100,basin='eclisse116-countertop-basin',plan='tfx1-linear-top',wall=0,type='worktop'}={}){
 const data=draftProject(initialDraft()),room=M.makeRoom(data.room,0),composition=new M.Composition(room);
 let settings=standalonePlanSettings({width},plan,basin);assert.ok(settings,basin);
 if(type==='cabinet')settings={...settings,format:'two',width,finish:'rovere-alba',drawers:[0,0]};
 const asset=type==='cabinet'?M.makeModel({width:width/100,format:'two',includeMirror:false,basinTop:settings.top,...settings,width:width/100}):M.makeStandaloneWorktop(settings);
 const added=composition.add(type,asset,settings,{wall,u:170,height:type==='cabinet'?30:82,offset:0});assert.ok(added.item,added.error);const host=added.item;
 const snapshot=()=>({...data,items:composition.snapshot()});
 function apply(project){for(const raw of project.items){const live=composition.items.find(i=>i.id===raw.id);if(!live||!['cabinet','worktop'].includes(live.type))continue;live.settings=raw.settings;if(live.type==='worktop')assert.equal(live.asset.setSettings(raw.settings),true);else assert.equal(live.asset.setTop(raw.settings.top,raw.settings),true);composition.sync(live);}return project;}
 const normalize=()=>apply(M.normalizeAnimaLiveTaps(snapshot(),composition.items));
 function addWall(product=M.AQUAHOME.find(p=>p.use==='basin-wall'),target=host){const s={use:product.use,tap:product.reference,metal:product.finish},asset=M.makeEquipment('tap',s),proposal=M.animaWallTapProposal(snapshot(),target,product,asset);assert.ok(proposal,product.reference+' must reach this basin');const added=composition.add('tap',asset,s,proposal.placement);assert.ok(added.item,added.error);for(const key of ['wall','u','height','offset'])near(added.item.placement[key]||0,proposal.placement[key]||0,'native placement '+key);return added.item;}
 function release(){for(const item of composition.items){if(item.asset.dispose)item.asset.dispose();else disposeRoot(item.root);}room.dispose();}
 return {data,room,composition,host,snapshot,normalize,apply,addWall,release};
}
const mfr=project=>quoteProject(project).rows.filter(row=>row.ref==='MFR');
const rayAtHole=(asset,hole)=>{asset.root.updateWorldMatrix(true,true);const point=asset.root.localToWorld(new T.Vector3(hole.x,asset.tops.root.userData.animaTop.topSurface,hole.z));return new T.Raycaster(point.clone().add(new T.Vector3(0,3,0)),new T.Vector3(0,-1,0)).intersectObjects(asset.tops.surfaceMeshes,false);};
const source=transformCommonStudioSource(readFileSync(join(studio,'app.js'),'utf8'),'app.js'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),functions=new Map(ast.body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));

test('native independent worktop automatically chooses a genuinely compatible XL mixer for a raised vessel',()=>{
 const f=fixture();try{const normalized=f.normalize(),product=M.AQUAHOME.find(p=>p.reference===f.host.settings.tap);assert.ok(product);assert.equal(product.use,'basin-xl');assert.equal(M.planTapCompatibility(f.host.asset,product).compatible,true);assert.equal(normalized.items[0].settings.tapMode,'auto');assert.equal(f.host.asset.getTapPositions().length,1);assert.equal(M.normalizeAnimaLiveTaps(f.snapshot(),f.composition.items).items[0].settings.tap,product.reference);}finally{f.release();}
});

test('native recessed/integrated settings prefer a standard compatible mixer and keep a valid manual finish',()=>{
 const f=fixture({basin:'vasca-a50'});try{f.normalize();const standard=M.AQUAHOME.find(p=>p.reference===f.host.settings.tap);assert.equal(standard.use,'basin');const manual=M.animaCompatibleTapProducts(f.host).find(p=>p.finish==='Noir mat')||M.animaCompatibleTapProducts(f.host).at(-1);Object.assign(f.host.settings,{tap:manual.reference,tapPreferredRef:manual.reference,tapMode:'manual'});f.normalize();assert.equal(f.host.settings.tap,manual.reference);assert.equal(f.host.settings.tapMode,'manual');}finally{f.release();}
});

test('real wall aerator suppresses only the served custom drilling, with native rotated-wall coordinates',()=>{
 for(const wall of [0,1]){const f=fixture({wall});try{f.normalize();const hole={...f.host.asset.getTapPositions()[0]},tap=f.addWall();f.normalize();assert.equal(f.host.settings.tap,null);assert.deepEqual(f.host.settings.tapWallIds,[tap.id]);assert.equal(f.host.asset.getTapPositions().length,0);assert.ok(rayAtHole(f.host.asset,hole).length,'real former passage is solid');assert.equal(mfr(f.snapshot()).length,0);const outlet=M.animaWallTapContext(tap,tap).outlet,context=M.animaPlanTapContext(f.host),well=context.top.wells[0];near(outlet.x,context.origin.u+well.x+context.topOffset,'aerator centres actual bowl X');assert.ok(outlet.y>context.origin.y+context.top.topSurface+well.rimRise+.02);}finally{f.release();}}
});

test('moving or deleting the actual wall fixture restores the previous deck reference and MFR exactly once',()=>{
 for(const operation of ['move','delete']){const f=fixture();try{f.normalize();const initial=f.host.settings.tap,tap=f.addWall();f.normalize();assert.equal(f.host.settings.tap,null);assert.equal(f.host.settings.tapPreferredRef,initial);if(operation==='move'){const result=f.composition.move(tap.id,{u:tap.placement.u+100});assert.equal(result.error,undefined);}else f.composition.remove(tap.id);f.normalize();assert.equal(f.host.settings.tap,initial);assert.deepEqual(f.host.settings.tapWallIds,[null]);assert.equal(f.host.asset.getTapPositions().length,1);assert.equal(mfr(f.snapshot()).length,1);}finally{f.release();}}
});

test('a real double-basin composition permits one mural and one automatically chosen deck mixer',()=>{
 const f=fixture({width:180,basin:'tpgea12-b855-2-basin',plan:'tpgea12-linear-top'});try{f.normalize();const tap=f.addWall();f.normalize();assert.deepEqual(f.host.settings.tapWallIds,[tap.id,null]);assert.ok(f.host.settings.tap);const holes=f.host.asset.getTapPositions();assert.equal(holes.length,1);assert.equal(holes[0].wellIndex,1);assert.equal(mfr(f.snapshot()).length,1);assert.equal(M.planTapCompatibility(f.host.asset,M.AQUAHOME.find(p=>p.reference===f.host.settings.tap)).placements[0].wellIndex,1);}finally{f.release();}
});

test('explicit no-mixer survives real wall fixture movement and restoration',()=>{
 const f=fixture();try{f.normalize();const tap=f.addWall();f.normalize();f.host.settings.tapMode='none';f.host.settings.tap=null;f.normalize();f.composition.remove(tap.id);f.normalize();assert.equal(f.host.settings.tap,null);assert.equal(f.host.settings.tapMode,'none');assert.equal(f.host.asset.getTapPositions().length,0);const restored=decodeProject(encodeProject(validateProject(f.snapshot())));assert.equal(restored.items[0].settings.tapMode,'none');assert.equal(mfr(restored).length,0);}finally{f.release();}
});

test('a genuine factory predrilled top removes its mixer but keeps the source factory hole constraint',()=>{
 const f=fixture({basin:null,plan:'tk100-integrated-top'});try{f.normalize();const tap=f.addWall();f.normalize();assert.deepEqual(f.host.settings.tapWallIds,[tap.id]);assert.equal(f.host.settings.tap,null);assert.equal(f.host.asset.getTapPositions().length,0);assert.equal(f.host.asset.tops.root.userData.animaTop.retainedFactoryTapHoles.length,1);assert.equal(mfr(f.snapshot()).length,0);}finally{f.release();}
});

function runtimeContext(f){
 const events=[],context={composition:f.composition,projectWorkspace:{locked:false},restoring:false,roomConfig:f.data.room,cloneRoom:structuredClone,__animaSyncingTaps:false,__animaNormalizeLiveTaps:M.normalizeAnimaLiveTaps,__animaPlanTapContext:M.animaPlanTapContext,__animaWallTapProposal:M.animaWallTapProposal,__animaProspectiveTapCheck:M.animaProspectiveTapCheck,isItemPositionLocked:(_c,item)=>!!item?.locked,placementStatus:text=>events.push(['status',text]),selectItem:id=>{f.composition.selectedId=id;events.push(['select',id]);},disposeObject:disposeRoot};
 context.__animaCommitCabinetProject=(project,options)=>{events.push(['commit',options?.checkpoint]);f.apply(project);return true;};
 context.prepareProductAddition=(_type,_wall,settings)=>({settings,asset:M.makeEquipment('tap',settings)});
 context.addItem=(type,wall,options)=>{const asset=M.makeEquipment(type,options),result=f.composition.add(type,asset,options,options.placement||{wall:wall||0,u:170,height:100,offset:0});if(!result.item){disposeRoot(asset.root);return false;}events.push(['add',result.item.id]);return result.item;};
 const names=['__animaTapSnapshot','__animaSyncTapInstallations','__animaCommitTapSettings','__animaSetAutomaticTap','__animaChooseTapProduct','setCabinetTap'];vm.createContext(context);vm.runInContext(names.map(name=>{assert.ok(functions.has(name),name);return functions.get(name);}).join('\n'),context);return {context,events};
}

test('actual production synchronizer commits automatic settings once and honours read-only state',()=>{
 const f=fixture();try{const {context,events}=runtimeContext(f);context.__animaSyncTapInstallations();assert.ok(f.host.settings.tap);context.__animaSyncTapInstallations();assert.equal(events.filter(e=>e[0]==='commit').length,1);assert.equal(events.find(e=>e[0]==='commit')[1],false);Object.assign(f.host.settings,{tap:null,tapMode:'auto'});context.projectWorkspace.locked=true;context.__animaSyncTapInstallations();assert.equal(f.host.settings.tap,null);assert.equal(events.filter(e=>e[0]==='commit').length,1);}finally{f.release();}
});

test('actual catalogue callback creates one correctly placed mural and the production synchronizer removes the attached mixer',()=>{
 const f=fixture();try{f.normalize();const {context,events}=runtimeContext(f),wall=M.AQUAHOME.find(p=>p.use==='basin-wall');assert.ok(context.__animaChooseTapProduct(wall));context.__animaSyncTapInstallations();assert.equal(events.filter(e=>e[0]==='add').length,1);assert.equal(f.composition.items.filter(i=>i.type==='tap').length,1);assert.equal(f.host.settings.tap,null);assert.equal(f.host.asset.getTapPositions().length,0);}finally{f.release();}
});

test('actual catalogue callback chooses a compatible manual deck reference without a free floating fixture',()=>{
 const f=fixture();try{f.normalize();const {context,events}=runtimeContext(f),manual=M.animaCompatibleTapProducts(f.host).at(-1);assert.equal(context.__animaChooseTapProduct(manual),true);assert.equal(f.host.settings.tap,manual.reference);assert.equal(f.host.settings.tapMode,'manual');assert.equal(f.composition.items.length,1);assert.equal(events.some(e=>e[0]==='add'),false);}finally{f.release();}
});

test('a native continuous cabinet top uses its actual lateral offset for automatic and mural mixers',()=>{
 const f=fixture({type:'cabinet',wall:1});try{
  const settings={...initialDraft(),format:'pura-base-door',width:40,drawers:[0]},asset=M.makeModel({...settings,width:.4,includeMirror:false,basinTop:'bare'}),support=f.composition.add('cabinet',asset,settings,{wall:1,u:240,height:30,offset:0});assert.ok(support.item,support.error);
  Object.assign(f.host.settings,{topSpan:140,topLength:140,topOffset:20});f.normalize();
  assert.ok(f.host.settings.tap);assert.equal(M.planTapCompatibility(f.host.asset,M.AQUAHOME.find(p=>p.reference===f.host.settings.tap)).compatible,true);
  const context=M.animaPlanTapContext(f.host),hole={...f.host.asset.getTapPositions()[0]};near(context.topOffset,.2,'continuous top offset');near(context.holes[0].x,hole.x,'pure and real mixer mounting X');
  const tap=f.addWall();f.normalize();assert.deepEqual(f.host.settings.tapWallIds,[tap.id]);assert.equal(f.host.asset.getTapPositions().length,0);assert.ok(rayAtHole(f.host.asset,hole).length);assert.equal(support.item.settings.tap,undefined);assert.equal(mfr(f.snapshot()).length,0);
 }finally{f.release();}
});

test('native move and drag preview cannot detach a mural mixer from a position-locked basin',()=>{
 for(const method of ['move','previewMove']){const f=fixture();try{
  f.normalize();const tap=f.addWall();f.normalize();f.host.locked=true;const before={...tap.placement},point=tap.root.position.clone(),result=f.composition[method](tap.id,{u:tap.placement.u+90});
  assert.match(result.error||'',/Déverrouillez/);assert.deepEqual(tap.placement,before);assert.ok(tap.root.position.equals(point));f.normalize();assert.deepEqual(f.host.settings.tapWallIds,[tap.id]);assert.equal(f.host.asset.getTapPositions().length,0);
 }finally{f.release();}}
});

test('the actual atomic project commit rolls back settings and native drilled geometry if a later worktop rejects its update',()=>{
 const f=fixture();try{
  f.normalize();const settings=structuredClone(f.host.settings),second=f.composition.add('worktop',M.makeStandaloneWorktop(settings),settings,{wall:1,u:170,height:82,offset:0});assert.ok(second.item,second.error);f.normalize();
  const old=f.snapshot(),hole={...f.host.asset.getTapPositions()[0]},previous=JSON.stringify(old.items.map(i=>i.settings));assert.equal(rayAtHole(f.host.asset,hole).length,0);
  const update=second.item.asset.setSettings;let rejectionCount=0;second.item.asset.setSettings=(settings,...args)=>{if(settings.tapMode==='none'){rejectionCount++;return false;}return update(settings,...args);};
  const {context,events}=runtimeContext(f);Object.assign(context,{__animaNormalizeRoles:normalizeCabinetRoles,validateProject,itemDimensions:M.itemDimensions,paintAsset:()=>{},__animaSyncContinuousTops:()=>{},__animaRefreshRoleSelection:()=>{},renderComposition:()=>{},refreshWidthUI:()=>{},refreshBasinUI:()=>{},refreshInspector:()=>{},invalidate:()=>{},scheduleProjectCheckpoint:()=>events.push(['checkpoint'])});
  vm.runInContext(functions.get('__animaCommitCabinetProject'),context);
  const candidate={...old,items:old.items.map(item=>({...item,settings:{...item.settings,tapMode:'none',tap:null}}))};assert.equal(context.__animaCommitCabinetProject(candidate),false);assert.equal(rejectionCount,1);assert.equal(JSON.stringify(f.snapshot().items.map(i=>i.settings)),previous);assert.equal(f.host.asset.getTapPositions().length,1);assert.equal(rayAtHole(f.host.asset,hole).length,0);assert.equal(events.some(e=>e[0]==='checkpoint'),false);assert.ok(events.some(e=>e[0]==='status'&&/assemblée/.test(e[1])));
 }finally{f.release();}
});

test('a fully served basin rejects another mural proposal without duplicating the existing physical fixture',()=>{
 const f=fixture();let candidate;try{
  f.normalize();const first=f.addWall();f.normalize();const before=JSON.stringify(f.snapshot()),product=M.AQUAHOME.find(p=>p.use==='basin-wall');candidate=M.makeEquipment('tap',{use:product.use,tap:product.reference,metal:product.finish});
  assert.equal(M.animaWallTapProposal(f.snapshot(),f.host,product,candidate),null);assert.equal(JSON.stringify(f.snapshot()),before);assert.deepEqual(f.host.settings.tapWallIds,[first.id]);
  f.composition.selectedId=f.host.id;const {context,events}=runtimeContext(f);assert.equal(context.__animaChooseTapProduct(product),false);assert.equal(f.composition.items.filter(item=>item.type==='tap').length,1);assert.equal(events.some(event=>event[0]==='add'),false);
 }finally{if(candidate)disposeRoot(candidate.root);f.release();}
});

test('a second mural proposal on a double basin serves only its free bowl and preserves the first installation',()=>{
 const f=fixture({width:180,basin:'tpgea12-b855-2-basin',plan:'tpgea12-linear-top'});let candidate;try{
  f.normalize();const first=f.addWall();f.normalize();const before={...first.placement},product=M.AQUAHOME.find(p=>p.use==='basin-wall');candidate=M.makeEquipment('tap',{use:product.use,tap:product.reference,metal:product.finish});
  const proposal=M.animaWallTapProposal(f.snapshot(),f.host,product,candidate);assert.ok(proposal);assert.equal(proposal.wellIndex,1);assert.deepEqual(f.host.settings.tapWallIds,[first.id,null]);
  const second=f.addWall(product);f.normalize();assert.deepEqual(f.host.settings.tapWallIds,[first.id,second.id]);assert.deepEqual(first.placement,before);assert.equal(f.composition.items.filter(item=>item.type==='tap').length,2);assert.equal(f.host.settings.tap,null);assert.equal(f.host.asset.getTapPositions().length,0);assert.equal(mfr(f.snapshot()).length,0);
 }finally{if(candidate)disposeRoot(candidate.root);f.release();}
});
