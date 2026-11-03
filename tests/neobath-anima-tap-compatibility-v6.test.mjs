import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {build} from 'esbuild';
import {parse} from 'acorn';
import * as T from 'three';
import {AQUAHOME} from '../shared/lrf-3d/aquahome-catalog.js';
import {aquahomeProfile} from '../shared/lrf-3d/aquahome-profiles.js';
import {animaTapDimensions,checkAnimaTapCompatibility} from '../functions/neobath-anima/studio-adapter/tap-compatibility.js';
import {transformAnimaTapCompatibility,transformAnimaTapPreview} from '../functions/neobath-anima/studio-adapter/tap-compatibility-transform.mjs';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
import {transformStandaloneSource} from '../functions/neobath-anima/studio-adapter/standalone-transform.mjs';
import {transformFurnitureAccessoryPreview} from '../functions/neobath-anima/studio-adapter/accessories-transform.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');mkdirSync(join(root,'node_modules/.cache'),{recursive:true});
const dir=mkdtempSync(join(root,'node_modules/.cache/anima-v6-taps-')),aliases=new Map(['model','configuration','finishes','tops','basins','column','mirrors'].map(name=>[join(studio,name+'.js'),join(adapter,name+'.js')]));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'model.js'))};export * from ${JSON.stringify(join(adapter,'tap-compatibility-runtime.js'))};export {makeTap} from ${JSON.stringify(join(studio,'taps.js'))};export * from ${JSON.stringify(join(studio,'commerce/preview-model.js'))};export {standalonePlanSettings} from ${JSON.stringify(join(adapter,'standalone-worktop-data.js'))};export {makeStandaloneWorktop} from ${JSON.stringify(join(adapter,'standalone-worktop.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'model.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'anima-v6-tap-real-model',setup(b){
 b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));b.onResolve({filter:/^@anima-adapter\//},a=>({path:join(adapter,a.path.slice('@anima-adapter/'.length))}));b.onResolve({filter:/^\./},a=>{const target=aliases.get(resolve(a.resolveDir,a.path));return target?{path:target}:undefined;});b.onLoad({filter:/studio-one\/src\/.*\.js$/},a=>{const relative=a.path.slice(studio.length+1).replaceAll('\\','/');let source=readFileSync(a.path,'utf8');if(relative==='model.js')source=transformOriginalModel(source);source=transformCommonStudioSource(source,relative);if(relative==='commerce/preview-model.js')source=transformAnimaTapPreview(transformFurnitureAccessoryPreview(transformStandaloneSource(source,relative)));return {contents:source,loader:'js',resolveDir:dirname(a.path)};});
}}]});
const M=await import(pathToFileURL(join(dir,'model.mjs')).href);after(()=>rmSync(dir,{recursive:true,force:true}));
const originalTextureLoad=T.TextureLoader.prototype.load;T.TextureLoader.prototype.load=function(url,onLoad){const texture=new T.Texture({src:url,width:32,height:32});queueMicrotask(()=>onLoad?.(texture));return texture;};after(()=>T.TextureLoader.prototype.load=originalTextureLoad);
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-7,`${message}: ${a} / ${b}`);
function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(node=>{if(node.isMesh){geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();root.removeFromParent();}
const product=(collection,use='basin')=>AQUAHOME.find(product=>product.collection===collection&&product.use===use);
const assetFor=(id,settings={})=>M.makeModel({format:'two',width:.8,includeMirror:false,basinTop:id,...settings});

test('compatibility dimensions agree with the actual AquaHome aerator meshes, including standard/XL and classic shapes',()=>{
 for(const p of AQUAHOME.filter(product=>['basin','basin-xl'].includes(product.use))){const tap=M.makeTap(p);try{tap.updateMatrixWorld(true);const point=tap.getObjectByName('Mousseur').getWorldPosition(new T.Vector3()),dims=animaTapDimensions(p,aquahomeProfile(p));assert.ok(dims,p.reference);close(dims.outletReach,point.z,'source outlet reach '+p.reference);close(dims.outletHeight,point.y+.0024,'source outlet height '+p.reference);}finally{dispose(tap);}}
});
test('raised Eclisse rejects a low standard spout while a compatible XL clears its real rim and pours inside the bowl',()=>{
 const asset=assetFor('eclisse116-countertop-basin');try{const low=M.planTapCompatibility(asset,product('Flip')),high=M.planTapCompatibility(asset,product('Flip','basin-xl'));assert.equal(low.compatible,false);assert.match(low.reason,/trop bas/);assert.equal(high.compatible,true);assert.equal(high.placements.length,1);const well=asset.tops.root.userData.animaTop.wells[0];assert.ok(high.placements[0].outlet.y>=asset.tops.topSurface+well.rimRise+.020);assert.ok(M.compatibleAnimaTaps(asset).every(p=>M.planTapCompatibility(asset,p).compatible));}finally{dispose(asset.root);}
});
test('an inset Eclisse uses its visible rise rather than rejecting every standard tap by the full manufactured basin height',()=>{
 const asset=assetFor('eclisse116-s-semi-recessed-basin');try{const result=M.planTapCompatibility(asset,product('Flip'));assert.equal(result.compatible,true);assert.ok(asset.tops.root.userData.animaTop.wells[0].rimRise<.03);}finally{dispose(asset.root);}
});
test('missing basins, wall mounting, unknown profiles, unreachable cups and flange collisions never pass by fallback',()=>{
 const asset=assetFor('tk80-integrated-top');try{const p=product('Flip'),profile=aquahomeProfile(p),top=asset.tops.root.userData.animaTop,holes=asset.getTapPositions();assert.equal(M.planTapCompatibility(asset,p).compatible,true);for(const context of [{top:{...top,wells:[]},holes},{top:{...top,tapMount:'wall'},holes:[]},{top,holes:[{...holes[0],x:3}]},{top,holes:[{...holes[0],z:top.wells[0].z}]}])assert.equal(checkAnimaTapCompatibility(p,context,profile).compatible,false);assert.equal(checkAnimaTapCompatibility(p,{top,holes},null).compatible,false);assert.equal(M.planTapCompatibility(asset,{reference:'unknown',use:'basin',collection:'unknown'}).compatible,false);}finally{dispose(asset.root);}
 const bare=assetFor('bare');try{assert.deepEqual(M.compatibleAnimaTaps(bare),[]);}finally{dispose(bare.root);}
});

test('a manufactured tap ledge mounts the spout at the basin height and checks its actual inner opening',()=>{
 const p=product('Flip'),profile=aquahomeProfile(p),top={width:.8,depth:.465,topSurface:.838,zOffset:0,wells:[{x:0,z:0,width:.54,depth:.34,power:8,kind:'countertop',rimRise:.12,openingWidth:.46,openingDepth:.22,openingCenterZ:.04}]},hole={x:0,z:-.12,rotationY:0,mount:'basin',surfaceY:.958,wellIndex:0};
 const result=checkAnimaTapCompatibility(p,{top,holes:[hole]},profile);assert.equal(result.compatible,true);close(result.placements[0].y,.958,'basin ledge mounting height');assert.equal(checkAnimaTapCompatibility(p,{top,holes:[{...hole,surfaceY:.838}]},profile).compatible,false,'the same short tap on the lower plan would strike the rim');assert.equal(checkAnimaTapCompatibility(p,{top,holes:[{...hole,z:-.08}]},profile).compatible,false,'the flange may not cross the opening');
});

const baseSource=transformCommonStudioSource(readFileSync(join(studio,'app.js'),'utf8'),'app.js'),source=transformAnimaTapCompatibility(baseSource),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),functions=new Map(ast.body.filter(node=>node.type==='FunctionDeclaration').map(node=>[node.id.name,source.slice(node.start,node.end)]));
function contextFor(asset,tapReference){const item={type:'cabinet',settings:{tap:tapReference},asset},events=[];const context={item,composition:{selected:item},projectWorkspace:{locked:false},__animaExactTap:M.exactAnimaTap,__animaTapCheck:M.planTapCompatibility,makeTap:M.makeTap,disposeObject:object=>{events.push('dispose');dispose(object);},syncCabinetDrain:()=>events.push('drain'),placementStatus:message=>events.push(message),refreshInspector:()=>{},invalidate:()=>{},scheduleProjectCheckpoint:()=>events.push('checkpoint')};vm.createContext(context);for(const name of ['__animaClearAttachedTaps','installCabinetTap','setCabinetTap'])vm.runInContext(functions.get(name),context);return {context,item,events};}
test('actual transformed installation removes an incompatible saved tap and never substitutes a different collection',()=>{
 const asset=assetFor('eclisse116-countertop-basin'),old=M.makeTap(product('Flip'));asset.root.add(old);asset.aquaTap=old;try{const {context,item,events}=contextFor(asset,product('Flip').reference);context.installCabinetTap(item);assert.equal(item.settings.tap,null);assert.equal(asset.aquaTap,null);assert.equal(old.parent,null);assert.ok(events.includes('dispose'));assert.ok(asset.faucets.every(tap=>tap.visible===false));}finally{dispose(asset.root);}
});
test('actual selection rejects an incompatible mixer before mutation and places a compatible one at the drilled side hole',()=>{
 const asset=assetFor('eclisse116-countertop-basin');try{const {context,item,events}=contextFor(asset,null);assert.equal(context.setCabinetTap(product('Flip').reference),false);assert.equal(item.settings.tap,null);assert.equal(asset.aquaTap,undefined);assert.equal(events.includes('checkpoint'),false);const p=product('Flip','basin-xl');assert.equal(context.setCabinetTap(p.reference),true);assert.equal(item.settings.tap,p.reference);const hole=asset.getTapPositions()[0];close(asset.aquaTap.position.x,hole.x,'hole X');close(asset.aquaTap.position.z,hole.z,'hole Z');close(asset.aquaTap.rotation.y,hole.rotationY,'spout rotation');close(asset.aquaTap.position.y,asset.tops.root.userData.animaTop.topSurface,'real mounting height');assert.equal(events.filter(e=>e==='checkpoint').length,1);context.projectWorkspace.locked=true;assert.equal(context.setCabinetTap(''),false);assert.equal(item.settings.tap,p.reference);context.projectWorkspace.locked=false;assert.equal(context.setCabinetTap(''),true);assert.equal(asset.aquaTap,null);}finally{dispose(asset.root);}
});
test('the scoped source filters both standard and XL by the real geometry rather than selecting the first product',()=>{
 assert.match(source,/products=__animaTapChoices\(item.asset\)/);assert.match(functions.get('installCabinetTap'),/__animaExactTap\(item.settings.tap\)/);assert.ok(!functions.get('installCabinetTap').includes('tapProduct('));assert.match(functions.get('renderTapChooser'),/Sans mitigeur/);assert.match(functions.get('renderTapChooser'),/if\(!products.length\)/);
});


test('the actual ECLISSE114/S rear ledge mounts a compatible short mixer on the pierced basin surface',()=>{
 const asset=assetFor('eclisse114-s-semi-recessed-basin');try{const hole=asset.getTapPositions()[0],top=asset.tops.root.userData.animaTop,result=M.planTapCompatibility(asset,product('Flip'));assert.equal(hole.mount,'basin');assert.equal(result.compatible,true,result.reason);close(hole.surfaceY,top.topSurface+.025,'real raised ledge');close(result.placements[0].y,hole.surfaceY,'tap mounted at ledge surface');const {context,item}=contextFor(asset,product('Flip').reference);context.installCabinetTap(item);close(asset.aquaTap.position.y,hole.surfaceY,'installed exact mounting height');}finally{dispose(asset.root);}
});

test('actual quote previews hide generic taps, keep only exact compatible taps and repaint without mutating saved settings',()=>{
 const p=product('Flip'),xl=product('Flip','basin-xl'),settings={format:'two',width:80,finish:'rovere-alba',top:'eclisse116-countertop-basin',topDrawer:'siphon',basinColor:'fume-matte',drawers:[0,0],tap:xl.reference};
 const project={version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[450,0],[450,450],[0,450]]},items:[{id:'cabinet-preview',type:'cabinet',placement:{wall:0,u:150,height:30},settings}]};
 const preview=M.buildPreview(project);try{const asset=preview.items[0].asset;assert.equal(asset.aquaTap.userData.reference,xl.reference);assert.ok(asset.faucets.every(tap=>tap.visible===false));settings.tap=p.reference;const snapshot=JSON.stringify(project);M.applyPreviewSettings(preview,project);assert.equal(asset.aquaTap,null,'incompatible saved standard tap removed');assert.equal(JSON.stringify(project),snapshot,'quote preview cannot rewrite the project');settings.tap=xl.reference;M.applyPreviewSettings(preview,project);assert.equal(asset.aquaTap.userData.reference,xl.reference);settings.tap=null;M.applyPreviewSettings(preview,project);assert.equal(asset.aquaTap,null);assert.ok(asset.faucets.every(tap=>tap.visible===false));}finally{dispose(preview.group);}
});

test('independent worktop previews use the same actual basin ledge and incompatible tap filter',()=>{
 const p=product('Flip'),settings=M.standalonePlanSettings({width:100},'tpgea12-linear-top','eclisse114-s-semi-recessed-basin');assert.ok(settings);settings.tap=p.reference;
 const project={version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[450,0],[450,450],[0,450]]},items:[{id:'plan-preview',type:'worktop',placement:{wall:0,u:150,height:82},settings}]};
 const preview=M.buildPreview(project);try{const asset=preview.items[0].asset,hole=asset.getTapPositions()[0],top=asset.tops.root.userData.animaTop;assert.equal(asset.aquaTap?.userData.reference,p.reference);close(hole.surfaceY,top.topSurface+.025,'standalone basin ledge is preserved');close(asset.aquaTap.position.y,hole.surfaceY,'standalone preview mounting');settings.tap='unknown';const snapshot=JSON.stringify(project);M.applyPreviewSettings(preview,project);assert.equal(asset.aquaTap,null);assert.equal(JSON.stringify(project),snapshot);}finally{dispose(preview.group);}
});


test('the actual installer keeps standalone source plumbing and mounts only at its own drilled basin positions',()=>{
 const p=product('Flip'),settings=M.standalonePlanSettings({width:100},'tpgea12-linear-top','eclisse114-s-semi-recessed-basin'),asset=M.makeStandaloneWorktop(settings);
 try{const {context,item,events}=contextFor(asset,p.reference);item.type='worktop';context.installCabinetTap(item);assert.equal(asset.aquaTap.userData.reference,p.reference);assert.ok(!events.includes('drain'),'cabinet-only plumbing must not overwrite independent source plumbing');const hole=asset.getTapPositions()[0];close(asset.aquaTap.position.y,hole.surfaceY,'actual standalone ledge mounting');item.settings.tap='unknown';context.installCabinetTap(item);assert.equal(item.settings.tap,null);assert.equal(asset.aquaTap,null);}finally{dispose(asset.root);}
});

test('a shifted custom plan keeps the tap, hole and bowl in the same local frame',()=>{
 const asset=assetFor('eclisse116-countertop-basin',{topSpan:80,topLength:120,topShift:10,topDepth:55,basinOffsetX:8});try{const p=product('Flip','basin-xl'),result=M.planTapCompatibility(asset,p);assert.equal(result.compatible,true,result.reason);const hole=asset.getTapPositions()[0],well=asset.tops.root.userData.animaTop.wells[0],offset=asset.tops.root.position.x;assert.ok(offset>.09);close(result.placements[0].x,hole.x,'tap x follows exact displaced hole');assert.ok(Math.abs(result.placements[0].outlet.x-(well.x+offset))<well.width/2,'water remains within displaced basin');}finally{dispose(asset.root);}
});
