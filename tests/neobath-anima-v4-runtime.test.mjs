import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {parse} from 'acorn';
import {build} from 'esbuild';
import * as T from 'three';
import {pickSelection} from '../shared/lrf-3d/picking.js';
import {topSelection,PRODUCTS} from '../functions/neobath-anima/studio-adapter/anima-data.js';
import {CABINET_FORMATS,cabinetFormat,animaCabinetDimensions} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {validateProject,encodeProject,decodeProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {quoteProject} from '../functions/neobath-anima/studio-adapter/commerce/pricing.js';
import {planSettings} from '../functions/neobath-anima/studio-adapter/premium-controls.js';
import {renderAnimaCabinetGallery,renderAnimaCabinetControls,matchingCabinetFacade} from '../functions/neobath-anima/studio-adapter/cabinet-controls.js';
import {animaMirrorFamilies,animaMirrorSelection,renderAnimaMirrorChooser} from '../functions/neobath-anima/studio-adapter/mirror-controls.js';
import {normalizeCabinetRoles} from '../functions/neobath-anima/studio-adapter/cabinet-role.js';
import {transferPlan,findWorktopSnap,setupWorktopDragging} from '../functions/neobath-anima/studio-adapter/worktop-interaction.js';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {transformAnimaCabinetUI} from '../functions/neobath-anima/studio-adapter/cabinet-ui-transform.mjs';

// Independent CPU integration tests: real source functions, ray intersections,
// drilled meshes and pointer listeners. These do not assert GPU image quality.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),studio=join(root,'studio-one/src'),adapter=join(root,'functions/neobath-anima/studio-adapter');
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});
const dir=mkdtempSync(join(root,'node_modules/.cache/anima-v4-runtime-'));
const aliases=new Map(['model','configuration','finishes','tops','basins','column','mirrors'].map(name=>[join(studio,name+'.js'),join(adapter,name+'.js')]));
await build({stdin:{contents:`export * from ${JSON.stringify(join(adapter,'model.js'))};export * from ${JSON.stringify(join(studio,'commerce/preview-model.js'))};export * from ${JSON.stringify(join(studio,'cabinet-combinations.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'model.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'anima-v4-real-model',setup(b){
 b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));
 b.onResolve({filter:/^@anima-adapter\//},a=>({path:join(adapter,a.path.slice('@anima-adapter/'.length))}));
 b.onResolve({filter:/^\./},a=>{const path=aliases.get(resolve(a.resolveDir,a.path));return path?{path}:undefined;});
 b.onLoad({filter:/studio-one[\\/]src[\\/].*\.js$/},a=>{const name=a.path.slice(studio.length+1).replaceAll('\\','/');let source=readFileSync(a.path,'utf8');if(name==='model.js')source=transformOriginalModel(source);return {contents:transformCommonStudioSource(source,name),loader:'js',resolveDir:dirname(a.path)};});
}}]});
const M=await import(pathToFileURL(join(dir,'model.mjs')).href);after(()=>rmSync(dir,{recursive:true,force:true}));
const priorLoad=T.TextureLoader.prototype.load,priorDocument=globalThis.document;
T.TextureLoader.prototype.load=function(url,onLoad){const texture=new T.Texture({src:url,width:32,height:32});queueMicrotask(()=>onLoad?.(texture));return texture;};globalThis.document={};
after(()=>{T.TextureLoader.prototype.load=priorLoad;if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;});
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-6,`${message||'value'}: ${actual} versus ${expected}`);
function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();root.removeFromParent();}
function cabinet(id,u=100,settings={}){return {id,type:'cabinet',settings:{format:'two',facadeMode:'overlay',width:80,finish:'rovere-alba',top:'bare',topDrawer:'siphon',drawers:[0,0],...settings},placement:{wall:0,u,height:30}};}
function project(items=[cabinet('source'),cabinet('target',220)]){return {version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[500,0],[500,400],[0,400]]},items};}
function planned({basin=false,depth=false}={}){const value=project(),host=value.items[0];host.settings=planSettings(value,host,'tfx1-linear-top',{span:80,offset:0,ids:[host.id]},basin?'vasca-a50':null);assert.ok(host.settings);Object.assign(host.settings,{topLength:100,topShift:2,topSurfaceId:'fenix-blu-shaba',...(depth?{topDepth:60,basinOffsetX:3,basinOffsetZ:-5}:{})});Object.assign(value,normalizeCabinetRoles(value));validateProject(value);return value;}
class Element {
 constructor(document,tag){this.ownerDocument=document;this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={};this.textContent='';this.hidden=false;this.listeners=new Map();}
 append(...children){this.children.push(...children);for(const child of children)if(child&&typeof child==='object')child.parentNode=this;}
 replaceChildren(...children){this.children=[];this.append(...children);}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(name,fn){this.listeners.set(name,fn);}
 fire(name){this.listeners.get(name)?.({target:this});}
}
const all=node=>[node,...(node.children||[]).flatMap(child=>child&&typeof child==='object'?all(child):[])];
function documentFixture(){const document={createElement:tag=>new Element(document,tag),createTextNode:text=>({textContent:text}),getElementById:id=>all(document.head).find(el=>el.id===id)||null};document.head=new Element(document,'head');document.body=new Element(document,'body');return document;}
class Canvas {
 constructor(){this.listeners=new Map();this.captured=new Set();}
 addEventListener(name,fn){const list=this.listeners.get(name)||[];list.push(fn);this.listeners.set(name,list);}
 removeEventListener(name,fn){this.listeners.set(name,(this.listeners.get(name)||[]).filter(value=>value!==fn));}
 setPointerCapture(id){this.captured.add(id);}hasPointerCapture(id){return this.captured.has(id);}releasePointerCapture(id){this.captured.delete(id);}
 fire(name,values={}){let stopped=false;const event={pointerId:1,button:0,pointerType:'mouse',clientX:0,clientY:0,timeStamp:0,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){stopped=true;},...values};for(const fn of this.listeners.get(name)||[]){fn(event);if(stopped)break;}return event;}
}

test('initial cabinet chooser shows photographed Pura shapes; Ribelle preserves the exact opening and stock widths',()=>{
 const document=documentFixture(),selected=[],gallery=renderAnimaCabinetGallery(document.body,{onChoose:id=>selected.push(id)}),cards=all(gallery).filter(node=>node.dataset?.animaCabinetModel);
 assert.equal(cards.length,5);assert.equal(cards.length,CABINET_FORMATS.filter(form=>form.facade==='PURA'&&form.subtype!=='vanity').length);
 for(const card of cards){const form=cabinetFormat(card.dataset.animaCabinetModel);assert.equal(form.facade,'PURA');assert.ok(all(card).some(node=>node.tagName==='IMG'&&node.src));card.onclick();assert.equal(selected.at(-1),form.id);
  const ribelle=matchingCabinetFacade(form,'RIBELLE');assert.ok(ribelle);for(const field of ['subtype','height','depth','trueDrawers','doors','opening'])assert.equal(ribelle[field],form[field],field);assert.deepEqual(ribelle.allowedWidths,form.allowedWidths);
 }
 const controls=renderAnimaCabinetControls(document.body,{settings:{format:'two',width:80},onWidth:width=>selected.push(width)}),widths=all(controls).filter(node=>node.dataset?.animaCabinetWidth);
 assert.deepEqual(widths.map(node=>Number(node.dataset.animaCabinetWidth)),cabinetFormat('two').allowedWidths);assert.ok(!widths.some(node=>node.dataset.animaCabinetWidth==='180'));
});

test('the reused Studio One combination engine proposes several 180 cm assemblies using real stock references',()=>{
 const combinations=M.cabinetCombinations(180);assert.ok(combinations.length>=2);assert.ok(combinations.some(widths=>widths.join('+')==='100+80'));assert.ok(combinations.some(widths=>widths.join('+')==='120+60'));
 for(const widths of combinations){assert.equal(widths.reduce((sum,width)=>sum+width,0),180);assert.ok(widths.length>1);const items=widths.map((width,index)=>cabinet('stock-'+index,100+widths.slice(0,index).reduce((sum,value)=>sum+value,0)+width/2,{width}));validateProject(project(items));for(const item of items)assert.ok(cabinetFormat(item.settings.format).productsByWidth[item.settings.width]?.ref);}
});

test('mirror chooser groups source models before displaying their exact catalogue formats',()=>{
 const families=animaMirrorFamilies(),mirrors=PRODUCTS.filter(product=>product.category==='mirror');
 assert.ok(families.length<mirrors.length);assert.deepEqual(families.flatMap(family=>family.products.map(product=>product.id)).sort(),mirrors.map(product=>product.id).sort());
 for(const family of families)for(const product of family.products){const settings=animaMirrorSelection(family.id,product.id);assert.equal(settings.mirrorModel,product.id);assert.equal(settings.width,product.width);assert.equal(settings.height,product.height);validateProject(project([{id:product.id,type:'mirror',settings,placement:{wall:0,u:100,height:150}}]));}
 const document=documentFixture(),added=[],chooser=renderAnimaMirrorChooser(document.body,{onAdd:value=>added.push(value)}),cards=all(chooser).filter(node=>node.dataset?.animaMirrorModel);assert.equal(cards.length,families.length);assert.equal(all(chooser).filter(node=>node.tagName==='SELECT').length,0);
 cards[0].fire('click');const select=all(chooser).find(node=>node.tagName==='SELECT');assert.ok(select);const family=families[0];assert.equal(select.children.length,family.products.length);select.value=family.products.at(-1).id;select.fire('change');all(chooser).find(node=>node.className==='anima-mirror-add').fire('click');assert.equal(added[0].mirrorModel,family.products.at(-1).id);
});

test('real transformed top click opens the plans inspector before renovation can consume it',()=>{
 let source=transformCommonStudioSource(readFileSync(join(studio,'app.js'),'utf8'),'app.js');if(!source.includes('function __animaOpenCabinetChooser('))source=transformAnimaCabinetUI(source);
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='handleObjectTap'),events=[];
 const context={composition:{items:[{id:'a',type:'cabinet'}]},highlightIndividualTile:()=>{},renovation:{tap:()=>{events.push('renovation');return true;}},selectItem:id=>events.push(['select',id]),openInspector:target=>events.push(['open',target])};vm.createContext(context);vm.runInContext(source.slice(node.start,node.end),context);context.handleObjectTap({editTarget:'basin',itemId:'a'});assert.deepEqual(events,[['select','a'],['open','basin']]);
 const inspector=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='refreshInspector'),body=source.slice(inspector.start,inspector.end);assert.ok(!body.includes("['furniture','basin'].includes(editTarget)"));assert.match(body,/editTarget==='furniture'[^;]+renderCabinetSizeControls/);
});

test('bare cabinet has an invisible horizontal plans target and mounted top rays keep the same inspector identity',()=>{
 for(const top of ['bare','tfx1-linear-top']){const asset=M.makeModel({width:.8,format:'two',basinTop:top,includeMirror:false}),scene=new T.Scene(),item=new T.Group();item.userData.itemId='real-cabinet';item.add(asset.root);scene.add(item);
  try{const camera=new T.PerspectiveCamera(40,1,.01,10);camera.position.set(.1,3,.05);camera.lookAt(.1,.82,.05);camera.updateProjectionMatrix();const hit=pickSelection(scene,camera,new T.Vector2());assert.ok(hit,top+' top can be selected');assert.equal(hit.itemId,'real-cabinet');assert.equal(hit.editTarget,'basin');
   if(top==='bare'){assert.equal(hit.object.material.transparent,true);assert.equal(hit.object.material.opacity,0);assert.equal(hit.object.material.colorWrite,false);assert.equal(hit.object.material.depthWrite,false);}
  }finally{dispose(item);}
 }
});

test('custom depth and bowl X/Z offsets change the real drilled geometry and survive preview and restore',()=>{
 const data=planned({basin:true,depth:true}),settings=data.items[0].settings,selection=topSelection(settings.top,80,'two',settings.basinLayout,80,settings.topPlanId,settings.topLength,settings);
 assert.equal(selection.previewDepth,60);close(selection.positions[0],.03);close(selection.positionsZ[0],-.03);
 const restored=decodeProject(encodeProject(data));assert.deepEqual(restored,data);close(animaCabinetDimensions(settings).depth,.60,'item collision depth');
 const asset=M.makeModel({...settings,width:.8,basinTop:settings.top,includeMirror:false});
 try{const description=asset.tops.root.userData.animaTop;assert.ok(description);close(description.depth,.6,'actual plan depth');close(description.width,1,'actual manufacturing length');assert.equal(description.wells.length,1);
  const well=description.wells[0];close(well.x,.03,'actual bowl X');close(well.z,description.zOffset-.03,'actual bowl Z');
  const plate=asset.tops.root.getObjectByName('Plan_lavabo_TFX1');assert.ok(plate);plate.geometry.computeBoundingBox();close(plate.geometry.boundingBox.max.z-plate.geometry.boundingBox.min.z,.6,'drilled plate mesh depth');
  asset.root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(well.x+asset.tops.root.position.x,2,well.z),new T.Vector3(0,-1,0)),meshes=[];asset.tops.root.traverseVisible(node=>{if(node.isMesh)meshes.push(node);});const hits=ray.intersectObjects(meshes,false);assert.ok(hits.length);assert.ok(hits[0].point.y<description.topSurface-.05,'bowl centre must be a real opening in the deck');
  const changed={...settings,topDepth:54,basinOffsetX:-2,basinOffsetZ:-2};assert.equal(asset.setTop(settings.top,changed),true);const newTop=asset.tops.root.userData.animaTop;close(newTop.depth,.54);close(newTop.wells[0].x,-.02);close(newTop.wells[0].z,newTop.zOffset,'changed bowl Z');
  const preview=M.buildPreview(restored);try{M.applyPreviewSettings(preview,restored);const actual=preview.items[0].asset.tops.root.userData.animaTop;close(actual.depth,.6);close(actual.wells[0].x,.03);close(actual.wells[0].z,actual.zOffset-.03);}finally{dispose(preview.group);}
 }finally{dispose(asset.root);}
});

test('reattaching a custom worktop preserves stock cabinets, materials, manufacturing dimensions and exact quote',()=>{
 const data=planned(),before=structuredClone(data),quote=quoteProject(data),result=transferPlan(data,'source','target');assert.deepEqual(data,before,'pure preview never mutates live project');
 assert.equal(result.project.items[0].settings.top,'bare');assert.equal(result.project.items[1].settings.top,'tfx1-linear-top');assert.deepEqual(result.project.items.map(item=>item.placement),before.items.map(item=>item.placement));assert.deepEqual(result.project.items.map(item=>item.settings.width),[80,80]);
 for(const key of ['topLength','topDepth','basinOffsetX','basinOffsetZ','topSurfaceId','topPriceKey'])assert.equal(result.project.items[1].settings[key],before.items[0].settings[key],key);
 assert.equal(quoteProject(result.project).publicTTC,quote.publicTTC);assert.equal(quoteProject(result.project).rows.filter(row=>row.ref==='TFX1').length,1);assert.deepEqual(decodeProject(encodeProject(result.project)),result.project);
 for(const mutate of [value=>value.items[1].locked=true,value=>value.locked=true,value=>value.items[1].settings.top='tpc80-cover',value=>value.items[1].placement.height=50]){const invalid=structuredClone(data);mutate(invalid);if(invalid.items[1].placement.height===50){assert.equal(findWorktopSnap(invalid,'source',{x:2.2,y:.82,z:0},{frames:[{id:'target',center:{x:2.2,y:1.02,z:0},tangent:{x:1,z:0}}],maxHeight:.1}),null);}else assert.throws(()=>transferPlan(invalid,'source','target'));}
});

test('pointer plan drag intercepts the cabinet handler, commits once on snap and rolls back invalid/readonly drops',()=>{
 for(const kind of ['valid','invalid','readonly','cancel']){let data=planned(),enabled=true;const original=structuredClone(data),events=[],canvas=new Canvas(),controls={enabled:true},hit={itemId:'source',editTarget:'basin',object:{userData:{animaWorktopTarget:true}}},centre={x:1,y:.82,z:0};
  const controller=setupWorktopDragging({canvas,controls,enabled:()=>enabled,getProject:()=>data,getItem:id=>data.items.find(item=>item.id===id),pick:()=>hit,pointOnPlane:event=>({x:event.clientX/100,y:.82,z:0}),getFrames:()=>[{id:'source',center:centre,tangent:{x:1,z:0}},{id:'target',center:{x:2.2,y:.82,z:0},tangent:{x:1,z:0}}],getCentre:()=>centre,onStart:()=>events.push('start'),onPreview:value=>{events.push(['preview',value.snapped]);assert.deepEqual(data,original,'a drag preview cannot move stock cabinets or commit settings');},onRestore:()=>events.push('restore'),onTap:()=>events.push('tap'),onCommit:snap=>{data=snap.project;events.push('checkpoint');},onEnd:value=>events.push(['end',value.cancelled])});
  let cabinetEvents=0;for(const name of ['pointerdown','pointermove','pointerup'])canvas.addEventListener(name,()=>cabinetEvents++);
  canvas.fire('pointerdown');assert.equal(controls.enabled,false);canvas.fire('pointermove',{clientX:kind==='invalid'?400:120,timeStamp:30});if(kind==='readonly')enabled=false;canvas.fire(kind==='cancel'?'pointercancel':'pointerup',{clientX:kind==='invalid'?400:120,timeStamp:60});assert.equal(controls.enabled,true);assert.equal(cabinetEvents,0);assert.equal(events.filter(event=>event==='checkpoint').length,kind==='valid'?1:0);assert.deepEqual(events.at(-1),['end',kind!=='valid']);if(kind!=='valid')assert.deepEqual(data,original);controller.dispose();
 }
});

test('short top tap selects plans without dragging, and a second touch cannot leak into cabinet dragging',()=>{
 const data=planned(),canvas=new Canvas(),controls={enabled:true},events=[];let cabinetEvents=0;
 const controller=setupWorktopDragging({canvas,controls,getProject:()=>data,getItem:id=>data.items.find(item=>item.id===id),pick:()=>({itemId:'source',object:{userData:{animaTop:{}}}}),pointOnPlane:()=>({x:0,y:.82,z:0}),getFrames:()=>[],getCentre:()=>({x:1,y:.82,z:0}),onTap:hit=>events.push(hit.editTarget),onCommit:()=>events.push('commit')});
 canvas.addEventListener('pointerdown',()=>cabinetEvents++);canvas.addEventListener('pointerup',()=>cabinetEvents++);
 canvas.fire('pointerdown');canvas.fire('pointerup',{timeStamp:40});assert.deepEqual(events,['basin']);assert.equal(cabinetEvents,0);
 canvas.fire('pointerdown',{pointerId:1,pointerType:'touch',timeStamp:100});canvas.fire('pointerdown',{pointerId:2,pointerType:'touch',timeStamp:110});canvas.fire('pointerup',{pointerId:2,pointerType:'touch',timeStamp:130});canvas.fire('pointerup',{pointerId:1,pointerType:'touch',timeStamp:140});assert.equal(cabinetEvents,0,'both touch pointers remain consumed after cancellation');assert.equal(controls.enabled,true);assert.deepEqual(events,['basin']);controller.dispose();
});
