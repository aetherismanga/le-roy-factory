import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {parse} from 'acorn';
import * as T from 'three';
import {prepareAnimaBasinProduct,resolveAnimaBasinDrop,animaBasinPreviewTransform} from '../functions/neobath-anima/studio-adapter/basin-interaction.js';
import {planSettings} from '../functions/neobath-anima/studio-adapter/premium-controls.js';
import {cabinetFormat} from '../functions/neobath-anima/studio-adapter/configuration.js';
import {validateProject} from '../functions/neobath-anima/studio-adapter/projects.js';
import {transformAnimaBasinDragAtelier,transformAnimaBasinDragShared} from '../functions/neobath-anima/studio-adapter/basin-drag-transform.mjs';
import {transformCommonStudioSource} from '../functions/neobath-anima/studio-adapter/studio-source-transform.mjs';
import {transformOriginalModel} from '../functions/neobath-anima/studio-adapter/model-transform.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),adapter=join(root,'functions/neobath-anima/studio-adapter'),studio=join(root,'studio-one/src');
const cabinet=(id='a',u=100,width=80)=>({id,type:'cabinet',settings:{format:'pura-base-two',width,finish:'rovere-alba',top:'bare',topDrawer:'full',drawers:[0,0]},placement:{wall:0,u,height:30}});
const project=items=>({version:2,manufacturer:'neobath-anima',room:{points:[[0,0],[500,0],[500,400],[0,400]]},items:items||[cabinet()]});
function live(data){const items=data.items.map(raw=>{const root=new T.Group();root.position.set(raw.placement.u/100,0,0);return {...raw,root,asset:{root}};});return {items,room:{},locked:false};}
function product(data,id='vasca-a50',plan='tfx1-linear-top'){const host=data.items[0],settings=planSettings(data,host,plan,{span:host.settings.topSpan||host.settings.width,offset:host.settings.topOffset||0,ids:[host.id]},id);assert.ok(settings);return prepareAnimaBasinProduct(id,settings,data);}
const ray=(x,z=.02)=>new T.Ray(new T.Vector3(x,2,z),new T.Vector3(0,-1,0));
const close=(a,b)=>assert.ok(Math.abs(a-b)<.0001,`${a} != ${b}`);

test('basin drop converts only the actual stock support and replaces its setting atomically',()=>{
 const data=project([cabinet('a'),cabinet('b',250)]),before=structuredClone(data),prepared=product(data),composition=live(data),drop=resolveAnimaBasinDrop({ray:ray(1.1,.03),composition,product:prepared});
 assert.equal(drop.error,'');assert.equal(drop.options.basinTargetId,'a');assert.equal(drop.options.basinSettings.format,'two');assert.equal(drop.options.basinSettings.top,'vasca-a50');close(drop.options.basinSettings.basinOffsetX,10);close(drop.options.basinSettings.basinOffsetZ,1);
 assert.deepEqual(data,before);assert.equal(composition.items.length,2);assert.equal(composition.items[0].settings.format,'pura-base-two');const preview=animaBasinPreviewTransform(drop.placement);close(preview.position.x,1.1);close(preview.position.z,.03);close(preview.position.y,.83);
});

test('a drop preserves an existing bespoke plan and its source material and manufacturing dimensions',()=>{
 const data=project(),host=data.items[0];host.settings=planSettings(data,host,'thpl1-linear-top',{span:80,offset:0,ids:[host.id]});Object.assign(host.settings,{topLength:100,topDepth:55,topShift:2,topSurfaceId:'hpl-terrazzo'});
 const composition=live(data),prepared=product(data,'vasca-a50','tfx1-linear-top'),drop=resolveAnimaBasinDrop({ray:ray(1),composition,product:prepared});assert.equal(drop.error,'');
 for(const key of ['topPlanId','topLength','topDepth','topShift','topSurfaceId'])assert.equal(drop.options.basinSettings[key],host.settings[key],key);
 assert.equal(drop.options.basinSettings.top,'vasca-a50');assert.equal(drop.options.basinSettings.width,80);
});

test('a drop onto a bare companion reuses its continuous plan owner and moves the vanity role to the real bowl support',()=>{
 const data=project([cabinet('a',100),cabinet('b',180)]),host=data.items[0];host.settings=planSettings(data,host,'tfx1-linear-top',{span:160,offset:40,ids:['a','b']});assert.ok(host.settings);
 const settings=planSettings(data,host,'tfx1-linear-top',{span:160,offset:40,ids:['a','b']},'vasca-a50');assert.ok(settings);
 const prepared=prepareAnimaBasinProduct('vasca-a50',settings,data),drop=resolveAnimaBasinDrop({ray:ray(1.8),composition:live(data),product:prepared});assert.equal(drop.error,'');assert.equal(drop.options.basinTargetId,'a');assert.equal(drop.options.basinSettings.topSpan,160);assert.equal(drop.options.basinSettings.topPlanId,'tfx1-linear-top');assert.equal(drop.options.basinSettings.format,'pura-base-two');close(drop.options.basinSettings.basinOffsetX,75.2);assert.equal(data.items[1].settings.top,'bare');
});

test('a dragged fumé Eclisse retains the selected bottom insert and its independent support',()=>{
 const data=project(),prepared=product(data,'eclisse116-countertop-basin');Object.assign(prepared.sourceSettings,{basinColor:'fume-matte',basinPriceKey:'fume-matte',basinBottom:'tvl',basinSupport:true});
 const drop=resolveAnimaBasinDrop({ray:ray(1),composition:live(data),product:prepared});assert.equal(drop.error,'');for(const [key,value]of Object.entries({basinColor:'fume-matte',basinPriceKey:'fume-matte',basinBottom:'tvl',basinSupport:true}))assert.equal(drop.options.basinSettings[key],value,key);
});

test('fixed complete plan-basins keep their manufactured position and only fit genuine compatible stock widths',()=>{
 const data=project(),settings=planSettings(data,data.items[0],'tk80-integrated-top',{span:80,offset:0,ids:['a']});assert.ok(settings);
 const prepared=prepareAnimaBasinProduct('tk80-integrated-top',settings,data),drop=resolveAnimaBasinDrop({ray:ray(1.2),composition:live(data),product:prepared});assert.equal(drop.error,'');assert.equal(drop.options.basinSettings.top,'tk80-integrated-top');assert.equal(drop.options.basinSettings.basinOffsetX||0,0);
 const wrong=project([cabinet('a',100,60)]);prepared.project=wrong;assert.ok(resolveAnimaBasinDrop({ray:ray(1),composition:live(wrong),product:prepared}).error);
});

test('invalid, locked or unrelated targets leave the source project and existing basin intact',()=>{
 const data=project(),prepared=product(data),before=structuredClone(data),composition=live(data);assert.ok(resolveAnimaBasinDrop({ray:ray(4),composition,product:prepared}).error);
 composition.items[0].locked=true;assert.match(resolveAnimaBasinDrop({ray:ray(1),composition,product:prepared}).error,/Déverrouillez/);delete composition.items[0].locked;
 const settings=planSettings(data,data.items[0],'tk80-integrated-top',{span:80,offset:0,ids:['a']});data.items[0].settings=settings;prepared.project=structuredClone(data);assert.match(resolveAnimaBasinDrop({ray:ray(1),composition:live(data),product:prepared}).error,/référence complète/);
 assert.deepEqual(before.items[0].settings.top,'bare');assert.equal(data.items[0].settings.top,'tk80-integrated-top');
});

test('production source reuses the original placement controller and binds both basin and fixed plan-basin cards',()=>{
 const source=transformAnimaBasinDragAtelier(transformCommonStudioSource(readFileSync(join(studio,'app.js'),'utf8'),'app.js'));
 parse(source,{ecmaVersion:'latest',sourceType:'module'});assert.match(source,/onBasinCard:__animaBindBasinCard/);assert.match(source,/invalidate:\(\)=>invalidate\(false,false\)\}\);\s*__animaPremiumSidebar\(\);/,'startup cards are rebound after the controller exists');assert.match(source,/type==='basin'\?__animaCommitBasinDrop/);assert.match(source,/prepareAnimaBasinProduct as/);
 assert.equal(transformAnimaBasinDragAtelier(source),source);
 const original=readFileSync(join(root,'shared/lrf-3d/product-placement-drag.js'),'utf8'),shared=transformAnimaBasinDragShared(original);parse(shared,{ecmaVersion:'latest',sourceType:'module'});assert.match(shared,/lostpointercapture/);assert.match(shared,/__animaBasinGhost\(product\)/);assert.equal(transformAnimaBasinDragShared(shared),shared);
});

// Bundle the real shared controller with its Anima extension. A regular source
// card click remains a click; a left drag commits exactly one setting patch.
mkdirSync(join(root,'node_modules/.cache'),{recursive:true});const dir=mkdtempSync(join(root,'node_modules/.cache/anima-basin-drag-'));
await build({stdin:{contents:`export * from ${JSON.stringify(join(root,'shared/lrf-3d/product-placement-drag.js'))};`,resolveDir:root,loader:'js'},outfile:join(dir,'drag.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'basin-drag-runtime',setup(b){
 b.onResolve({filter:/^@anima-adapter\//},a=>({path:join(adapter,a.path.slice('@anima-adapter/'.length))}));b.onResolve({filter:/^@studio-one-original\//},a=>({path:join(studio,a.path.slice('@studio-one-original/'.length))}));
 b.onLoad({filter:/product-placement-drag\.js$/},a=>({contents:transformAnimaBasinDragShared(readFileSync(a.path,'utf8')),loader:'js',resolveDir:dirname(a.path)}));
 b.onLoad({filter:/studio-one\/src\/model\.js$/},a=>({contents:transformOriginalModel(readFileSync(a.path,'utf8')),loader:'js',resolveDir:dirname(a.path)}));
}}]});const M=await import(pathToFileURL(join(dir,'drag.mjs')).href);
function dom(){const listeners=new Map(),classes=new Set();const doc={body:{classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}},defaultView:{addEventListener(){},removeEventListener(){}},addEventListener(name,fn){const list=listeners.get(name)||[];list.push(fn);listeners.set(name,list);},removeEventListener(name,fn){listeners.set(name,(listeners.get(name)||[]).filter(v=>v!==fn));},fire(name,fields={}){const event={button:0,pointerId:1,pointerType:'mouse',isPrimary:true,clientX:50,clientY:50,detail:1,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...fields};for(const fn of listeners.get(name)||[]){fn(event);if(event.stopped)break;}return event;}};const button={dataset:{},setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}};return {doc,button,classes};}
function runtimeFixture(){const {doc,button,classes}=dom(),data=project(),composition=live(data),scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.1,10),controls={enabled:true},events=[];camera.position.set(1,2,0);camera.up.set(0,0,-1);camera.lookAt(1,.82,0);camera.updateMatrixWorld(true);const canvas={ownerDocument:doc,getBoundingClientRect:()=>({left:0,top:0,right:100,bottom:100,width:100,height:100})};let readonly=false;
 const controller=M.mountProductPlacementDrag({canvas,scene,camera,controls,getComposition:()=>composition,readonly:()=>readonly,prepareProduct:()=>product(data),commitProduct:value=>{events.push(value);return true;},onStatus:()=>{},document:doc});controller.bind(button,{type:'basin',options:{basinProductId:'vasca-a50'}});const fire=(name,extra={})=>doc.fire(name,{target:button,composedPath:()=>[button],...extra});return {doc,button,classes,data,composition,scene,camera,controls,events,controller,fire,setReadonly:value=>readonly=value};}

test('real left-button drag previews a real basin shape and commits once without adding a second scene product',()=>{
 const f=runtimeFixture();f.fire('pointerdown',{clientX:10});f.fire('pointermove',{clientX:50});assert.equal(f.controls.enabled,false);assert.ok(f.scene.getObjectByName('Apercu_vasque_catalogue_Anima'));assert.equal(f.events.length,0);f.fire('pointerup',{clientX:50});assert.equal(f.controls.enabled,true);assert.equal(f.events.length,1);assert.equal(f.events[0].type,'basin');assert.equal(f.events[0].options.basinTargetId,'a');assert.equal(f.composition.items.length,1);assert.equal(f.scene.children.length,0);assert.ok(f.fire('click').prevented,'released drag may not also run the source card click');f.controller.destroy();
});

test('readonly, invalid pointer-up, cancellation and lost capture never install a basin',()=>{
 for(const mode of ['invalid','readonly','cancel','lost','escape','second-touch']){
  const f=runtimeFixture();f.fire('pointerdown',{clientX:10});f.fire('pointermove',{clientX:50});if(mode==='readonly')f.setReadonly(true);
  if(mode==='cancel')f.fire('pointercancel');else if(mode==='lost')f.fire('lostpointercapture');else if(mode==='escape')f.fire('keydown',{key:'Escape'});else if(mode==='second-touch')f.fire('pointerdown',{pointerId:2,pointerType:'touch',isPrimary:false});else f.fire('pointerup',{clientX:mode==='invalid'?150:50});
  assert.equal(f.events.length,0,mode);assert.equal(f.controls.enabled,true,mode);assert.equal(f.scene.children.length,0,mode);f.controller.destroy();
 }
});
rmSync(dir,{recursive:true,force:true});
