import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {installVisualDOM} from './helpers/visual-choice-dom.mjs';
import {createRandalPresentation} from '../shared/lrf-3d/randal-presentation-ui.js';
import {createPresentationEditing} from '../shared/lrf-3d/randal-presentation-editing.js';
import {CATALOG} from '../studio-one/src/commerce/catalog.js';
import * as adapter from '../studio-one/src/commerce/guided.js';
import {FINISHES} from '../studio-one/src/finishes.js';
import {buildPreview} from '../studio-one/src/commerce/preview-model.js';
import {checkedProject as studioChecked} from '../studio-one/src/commerce/flow.js';
import {checkedProject as generalChecked} from '../randal-general/src/commerce/flow.js';
import * as generalAdapter from '../randal-general/src/commerce/guided.js';
async function fixture({preferences}={}){
 const dom=installVisualDOM(),source=adapter.draftProject({...adapter.initialDraft(),column:true,mirror:'ilse',top:'sella'}),saved=[],scene=new T.Scene();let current,project,disposed=0,renderStatus,photoCapture,starts=0,cancels=0,deferred=null,updateResult=true,surfaceResult=true,updates=0,brightness=100,dimensionsVisible=true;
 if(preferences!==undefined)source.presentation=preferences;
 const editing=createPresentationEditing({scene,controls:{enabled:true},getItems:()=>current?.items||[],getProject:()=>project,invalidate(){}});
 const engine={dimensions:{setVisible(value){dimensionsVisible=!!value;},isVisible:()=>dimensionsVisible},setBrightness(value){brightness=value;},getBrightness:()=>brightness,presentation:{editing,capabilities:()=>({opened:false,openable:true,led:false}),setOpened(){},setLED(){},async setSurface(){return surfaceResult;}},async update(input){updates++;if(deferred){const wait=deferred;deferred=null;await wait;}project=structuredClone(input);if(current)scene.remove(current.group);current=buildPreview(project);scene.add(current.group);return updateResult;},async startPhotoRender(){starts++;renderStatus?.({mode:'preparing',available:true});return true;},cancelPhotoRender(){cancels++;renderStatus?.({mode:'cancelled',available:true});},reset(){},dispose(){disposed++;editing.dispose();}};
 const ui=createRandalPresentation({getIdentity:()=>({known:true,isAdmin:false,client:{codeClient:'LRF-00321'},configuratorAccess:{mode:'presentation',allowWorkshop:false}}),getProject:()=>source,products:{...adapter,catalog:CATALOG,finishes:FINISHES},onChange:p=>saved.push(p),createPreview:async(_host,options)=>{renderStatus=options.onRenderStatus;photoCapture=options.onPhotoCapture;return engine;}});
 assert.equal(await ui.open(),true);
 return {dom,source,saved,engine,editing,ui,renderStatus,photoCapture,get starts(){return starts;},get cancels(){return cancels;},rejectUpdate(value=false){updateResult=value;},rejectSurface(value=false){surfaceResult=value;},get disposed(){return disposed;},get updates(){return updates;},deferNext(promise){deferred=promise;},close(){ui.close();dom.restore();}};
}
test('contextual fullscreen has no distance buttons, movement mode or item dropdown',async()=>{
 const f=await fixture();try{for(const id of ['randal-move-left','randal-move-right','randal-move-up','randal-move-down','randal-move-mode','randal-selected-item'])assert.equal(document.querySelector('#'+id),null);assert.equal(document.querySelector('#randal-product-format'),null);assert.match(document.querySelector('.randal-presentation-products').textContent,/Cliquez sur un meuble/);assert.equal(document.querySelectorAll('#randal-floor-choice').length,1);assert.equal(document.querySelectorAll('#randal-wall-choice').length,1);}finally{f.close();}
});
test('selecting a real column edits only that column and shows its opening control',async()=>{
 const f=await fixture();try{const column=f.source.items.find(i=>i.type==='column');f.editing.selectItem(column.id,'column');assert.equal(document.querySelector('#randal-product-format'),null);const select=document.querySelector('#randal-product-columnFinish');assert.ok(select);assert.equal(document.querySelector('#randal-reverse-hinge').hidden,false);select.value=select.options.find(o=>!o.disabled&&o.value!==select.value).value;await select.onchange();assert.equal(f.saved.length,1);assert.equal(f.saved[0].items.find(i=>i.id===column.id).settings.finish,select.value);assert.deepEqual(f.saved[0].items.filter(i=>i.id!==column.id),f.source.items.filter(i=>i.id!==column.id));}finally{f.close();}
});
test('clicking the basin opens real basin choices without cabinet model or column fields',async()=>{
 const f=await fixture();try{const cabinet=f.source.items.find(i=>i.type==='cabinet');f.editing.selectItem(cabinet.id,'basin');assert.ok(document.querySelector('#randal-product-top'));assert.ok(document.querySelector('#randal-product-basinColor'));assert.equal(document.querySelector('#randal-product-format'),null);assert.equal(document.querySelector('#randal-product-columnModel'),null);assert.equal(document.querySelector('#randal-reverse-hinge').hidden,true);}finally{f.close();}
});
test('the render badge reflects actual engine state independently of transient errors',async()=>{
 const f=await fixture();try{const badge=document.querySelector('.randal-render-quality');f.renderStatus({mode:'preparing'});assert.equal(badge.textContent,'Calcul de la lumière…');f.renderStatus({mode:'photoreal',samples:12,maxSamples:256});assert.match(badge.textContent,/12 \/ 256/);f.renderStatus({mode:'fallback',message:'Unsupported GPU'});assert.equal(badge.textContent,'Aperçu interactif · qualité adaptée');assert.equal(badge.dataset.mode,'fallback');assert.equal(document.querySelector('.randal-presentation-status').textContent,'');}finally{f.close();}
});
test('closing during an asynchronous product change prevents late persistence or reopening',async()=>{
 const f=await fixture();let release;
 try{f.editing.selectItem(f.source.items[0].id,'cabinet');const select=document.querySelector('#randal-product-finish');select.value=select.options.find(o=>o.value!==select.value&&!o.disabled).value;f.deferNext(new Promise(resolve=>release=resolve));const pending=select.onchange();f.ui.close();release();await pending;assert.equal(f.saved.length,0);assert.equal(document.querySelector('#randal-presentation'),null);assert.equal(f.disposed,1);f.renderStatus({mode:'ready'});assert.equal(document.querySelector('.randal-render-quality'),null);}finally{f.close();}
});
test('display controls start with readable dimensions and neutral brightness without saving or rebuilding',async()=>{
 const f=await fixture();try{
  const toggle=document.querySelector('#randal-dimensions-toggle'),slider=document.querySelector('#randal-brightness');
  assert.equal(toggle.textContent,'Cotes');assert.equal(toggle.getAttribute('aria-pressed'),'true');assert.equal(f.engine.dimensions.isVisible(),true);
  assert.equal(slider.type,'range');assert.equal(slider.min,'25');assert.equal(slider.max,'150');assert.equal(slider.value,'100');assert.equal(slider.getAttribute('aria-valuetext'),'100 %');
  assert.equal(document.querySelector('#randal-brightness-value').textContent,'100 %');assert.equal(f.engine.getBrightness(),100);assert.equal(f.saved.length,0);assert.equal(f.updates,1);
  assert.equal(document.querySelector('.randal-presentation-header').textContent.includes('version de test'),false);
 }finally{f.close();}
});
test('brightness changes immediately, persists on completion and preserves unrelated view preferences',async()=>{
 const f=await fixture({preferences:{brightness:84,dimensions:false,custom:'preserved'}});try{
  const slider=document.querySelector('#randal-brightness');assert.equal(slider.value,'84');assert.equal(f.engine.dimensions.isVisible(),false);
  slider.value='125';slider.oninput();assert.equal(f.engine.getBrightness(),125);assert.equal(document.querySelector('#randal-brightness-value').textContent,'125 %');assert.equal(f.saved.length,0);assert.equal(f.updates,1);
  slider.onchange();assert.equal(f.saved.length,1);assert.deepEqual(f.saved[0].presentation,{brightness:125,dimensions:false,custom:'preserved'});assert.deepEqual(f.saved[0].items,f.source.items);assert.equal(f.updates,1);
  slider.value='900';slider.onchange();assert.equal(f.engine.getBrightness(),150);assert.equal(slider.value,'150');assert.equal(f.saved.at(-1).presentation.brightness,150);
  slider.value='invalid';slider.onchange();assert.equal(f.engine.getBrightness(),100);
 }finally{f.close();}
});
test('dimensions toggle persists alongside brightness and restores when opening the saved composition',async()=>{
 const f=await fixture({preferences:{brightness:77,dimensions:true,custom:4}});try{
  const toggle=document.querySelector('#randal-dimensions-toggle');toggle.onclick();assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal(f.engine.dimensions.isVisible(),false);assert.equal(f.updates,1);
  const saved=f.saved.at(-1);assert.deepEqual(saved.presentation,{brightness:77,dimensions:false,custom:4});
  f.ui.close();assert.equal(await f.ui.open(saved),true);assert.equal(document.querySelector('#randal-brightness').value,'77');assert.equal(document.querySelector('#randal-dimensions-toggle').getAttribute('aria-pressed'),'false');assert.equal(f.engine.getBrightness(),77);assert.equal(f.engine.dimensions.isVisible(),false);
 }finally{f.close();}
});
test('detached display controls never mutate a closed presentation',async()=>{
 const f=await fixture();try{
  const slider=document.querySelector('#randal-brightness'),toggle=document.querySelector('#randal-dimensions-toggle');f.ui.close();slider.value='60';slider.oninput();slider.onchange();toggle.onclick();assert.equal(f.saved.length,0);assert.equal(f.engine.getBrightness(),100);assert.equal(f.engine.dimensions.isVisible(),true);
 }finally{f.close();}
});
test('both configurators preserve display preferences through their actual project validator',()=>{
 const fixtures=[[adapter.draftProject(adapter.initialDraft()),studioChecked],[generalAdapter.draftProject(generalAdapter.initialDraft('aruba')),generalChecked]];
 for(const [project,checked]of fixtures){project.presentation={brightness:125,dimensions:false};assert.deepEqual(checked(project).presentation,project.presentation);}
});
test('photo refinement is manual and stays cancellable throughout preparation and processing',async()=>{
 const f=await fixture();try{
  const start=document.querySelector('#randal-photo-render'),cancel=document.querySelector('#randal-photo-cancel');
  assert.equal(f.starts,0);assert.equal(start.disabled,false);assert.equal(cancel.hidden,true);
  const slider=document.querySelector('#randal-brightness');slider.value='90';slider.onchange();
  const floor=document.querySelector('#randal-floor-choice');floor.value=floor.options.find(o=>o.value!==floor.value).value;await floor.onchange();
  f.engine.reset();assert.equal(f.starts,0);
  await start.onclick();assert.equal(f.starts,1);assert.equal(start.disabled,true);assert.equal(cancel.hidden,false);
  f.renderStatus({mode:'requested',available:true});assert.equal(start.disabled,true);assert.equal(cancel.hidden,false);assert.match(document.querySelector('.randal-render-quality').textContent,/Préparation/);
  f.renderStatus({mode:'denoising'});assert.equal(start.disabled,true);assert.equal(cancel.hidden,false);assert.equal(document.querySelector('.randal-render-quality').textContent,'Nettoyage du rendu…');assert.equal(document.querySelector('#randal-photo-download'),null);
  cancel.onclick();assert.equal(f.cancels,1);assert.equal(start.disabled,false);assert.equal(cancel.hidden,true);assert.equal(f.starts,1);
 }finally{f.close();}
});
test('a final PNG is captured automatically and its URLs are released on replacement and close',async()=>{
 const f=await fixture(),create=URL.createObjectURL,revoke=URL.revokeObjectURL,created=[],revoked=[];
 URL.createObjectURL=blob=>{assert.equal(blob.type,'image/png');const url='blob:randal-'+(created.length+1);created.push(url);return url;};URL.revokeObjectURL=url=>revoked.push(url);
 try{
  assert.equal(document.querySelector('#randal-photo-capture').hidden,true);
  f.renderStatus({mode:'ready'});assert.match(document.querySelector('.randal-render-quality').textContent,/capture indisponible/);assert.equal(document.querySelector('#randal-photo-download'),null);
  await document.querySelector('#randal-photo-render').onclick();
  f.renderStatus({mode:'capturing'});assert.equal(document.querySelector('#randal-photo-cancel').hidden,false);
  f.photoCapture({blob:new Blob(['valid backend PNG'],{type:'image/png'}),width:1600,height:900,samples:512});f.renderStatus({mode:'ready'});
  const figure=document.querySelector('#randal-photo-capture'),download=document.querySelector('#randal-photo-download');
  assert.equal(figure.hidden,false);assert.equal(figure.dataset.current,'true');assert.equal(figure.querySelector('img').src,created[0]);assert.equal(download.href,created[0]);assert.equal(download.download,'composition-randal.png');assert.match(figure.textContent,/1600 × 900/);assert.equal(document.querySelector('#randal-photo-render').disabled,false);assert.match(document.querySelector('.randal-render-quality').textContent,/capture prêts/);
  const slider=document.querySelector('#randal-brightness');slider.value='120';slider.onchange();assert.equal(figure.dataset.current,'false');assert.match(figure.textContent,/Capture précédente/);assert.equal(f.starts,1);assert.equal(download.href,created[0]);
  f.photoCapture({blob:new Blob(['new backend PNG'],{type:'image/png'}),width:1200,height:800});assert.deepEqual(revoked,[created[0]]);assert.equal(figure.dataset.current,'true');assert.equal(figure.querySelector('img').src,created[1]);
  f.ui.close();assert.deepEqual(revoked,created);f.photoCapture({blob:new Blob(['late PNG'],{type:'image/png'})});assert.equal(created.length,2);
 }finally{f.close();URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
test('incomplete or unsupported photo render never creates a final image',async()=>{
 const f=await fixture();try{
  await document.querySelector('#randal-photo-render').onclick();f.renderStatus({mode:'incomplete',message:'Le calcul a été interrompu.',available:true});
  assert.equal(document.querySelector('#randal-photo-render').disabled,false);assert.equal(document.querySelector('#randal-photo-download'),null);assert.match(document.querySelector('.randal-render-quality').textContent,/Rendu incomplet/);
  f.photoCapture({blob:new Blob(['invalid'],{type:'image/jpeg'})});assert.equal(document.querySelector('#randal-photo-download'),null);
  f.renderStatus({mode:'fallback',message:'WebGL 2 indisponible.',available:false});assert.equal(document.querySelector('#randal-photo-render').disabled,true);assert.match(document.querySelector('.randal-photo-controls').textContent,/WebGL 2 indisponible/);assert.equal(document.querySelector('#randal-photo-cancel').hidden,true);
 }finally{f.close();}
});
test('changing the view cancels an active photo without restarting it',async()=>{
 const f=await fixture();try{
  await document.querySelector('#randal-photo-render').onclick();const slider=document.querySelector('#randal-brightness');slider.value='80';slider.oninput();
  assert.equal(f.cancels,1);assert.equal(f.starts,1);assert.equal(document.querySelector('#randal-photo-cancel').hidden,true);
  f.renderStatus({mode:'interactive'});assert.equal(document.querySelector('#randal-photo-render').disabled,false);
 }finally{f.close();}
});
test('the exact selected finish image appears immediately and rolls back if the product cannot load',async()=>{
 const f=await fixture();let release;try{
  f.editing.selectItem(f.source.items[0].id,'cabinet');const select=document.querySelector('#randal-product-finish'),figure=select.parentElement.querySelector('.randal-choice-preview'),previous=select.value,expected=id=>'assets/'+FINISHES.find(finish=>finish.id===id).swatch;
  assert.equal(figure.querySelector('img').src,expected(previous));select.value=select.options.find(o=>!o.disabled&&o.value!==previous).value;const next=select.value;
  f.rejectUpdate();f.deferNext(new Promise(resolve=>release=resolve));const pending=select.onchange();assert.equal(figure.querySelector('img').src,expected(next));assert.equal(document.querySelector('#randal-photo-render').disabled,true);
  release();await pending;assert.equal(select.value,previous);assert.equal(figure.querySelector('img').src,expected(previous));assert.equal(f.saved.length,0);assert.equal(document.querySelector('#randal-photo-render').disabled,false);
 }finally{release?.();f.close();}
});
test('selected floor images and paint colors are visible and failed surface choices roll back',async()=>{
 const f=await fixture();try{
  const floor=document.querySelector('#randal-floor-choice'),figure=floor.parentElement.querySelector('.randal-choice-preview'),previous=floor.value,previousImage=figure.querySelector('img').src;
  assert.ok(previousImage);floor.value=floor.options.find(o=>o.value!==previous).value;f.rejectSurface();await floor.onchange();assert.equal(floor.value,previous);assert.equal(figure.querySelector('img').src,previousImage);
  const wall=document.querySelector('#randal-wall-choice'),wallFigure=wall.parentElement.querySelector('.randal-choice-preview');assert.equal(wallFigure.dataset.type,'color');assert.ok(wallFigure.querySelector('.randal-choice-color'));assert.equal(wallFigure.querySelector('img'),null);
  assert.equal(f.starts,0);
 }finally{f.close();}
});
