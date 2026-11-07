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
async function fixture({preferences,legacy=false,initialSurfaceResult=true,expectedOpen=true}={}){
 const dom=installVisualDOM(),source=adapter.draftProject({...adapter.initialDraft(),column:true,mirror:'ilse',top:'sella'}),saved=[],scene=new T.Scene();let current,project,disposed=0,previewOptions,starts=0,cancels=0,deferred=null,updateResult=true,surfaceResult=initialSurfaceResult,updates=0,brightness=100,dimensionsVisible=true;
 if(!legacy)source.presentation={defaultsVersion:2,...preferences};else if(preferences!==undefined)source.presentation=preferences;
 const editing=createPresentationEditing({scene,controls:{enabled:true},getItems:()=>current?.items||[],getProject:()=>project,invalidate(){}});
 const engine={dimensions:{setVisible(value){dimensionsVisible=!!value;},isVisible:()=>dimensionsVisible},setBrightness(value){brightness=value;},getBrightness:()=>brightness,presentation:{editing,capabilities:()=>({opened:false,openable:true,led:false}),setOpened(){},setLED(){},async setSurface(){return surfaceResult;}},async update(input){updates++;if(deferred){const wait=deferred;deferred=null;await wait;}project=structuredClone(input);if(current)scene.remove(current.group);current=buildPreview(project);scene.add(current.group);return updateResult;},async startPhotoRender(){starts++;return true;},cancelPhotoRender(){cancels++;},reset(){},dispose(){disposed++;editing.dispose();}};
 const ui=createRandalPresentation({getIdentity:()=>({known:true,isAdmin:false,client:{codeClient:'LRF-00321'},configuratorAccess:{mode:'presentation',allowWorkshop:false}}),getProject:()=>source,products:{...adapter,catalog:CATALOG,finishes:FINISHES},onChange:p=>saved.push(p),createPreview:async(_host,options)=>{previewOptions=options;return engine;}});
 assert.equal(await ui.open(),expectedOpen);
 return {dom,source,saved,engine,editing,ui,get previewOptions(){return previewOptions;},get starts(){return starts;},get cancels(){return cancels;},rejectUpdate(value=false){updateResult=value;},rejectSurface(value=false){surfaceResult=value;},get disposed(){return disposed;},get updates(){return updates;},deferNext(promise){deferred=promise;},close(){ui.close();dom.restore();}};
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
test('restricted fullscreen exposes no photo controls, capture, progress badge or photo callbacks',async()=>{
 const f=await fixture();try{
  for(const id of ['randal-photo-render','randal-photo-cancel','randal-photo-capture','randal-photo-download'])assert.equal(document.querySelector('#'+id),null);
  assert.equal(document.querySelector('.randal-render-quality'),null);assert.equal(document.querySelector('.randal-photo-controls'),null);
  assert.deepEqual(f.previewOptions,{presentation:true});assert.equal(f.starts,0);assert.equal(f.cancels,0);
  assert.equal(document.querySelector('.randal-presentation-status').textContent,'');
  const slider=document.querySelector('#randal-brightness');slider.value='90';slider.onchange();
  document.querySelector('#randal-dimensions-toggle').onclick();document.querySelector('#randal-composition-open').onclick();document.querySelector('#randal-presentation-reset').onclick();
  const floor=document.querySelector('#randal-floor-choice');floor.value=floor.options.find(o=>o.value!==floor.value).value;await floor.onchange();
  assert.equal(f.starts,0);assert.equal(f.cancels,0);assert.equal(document.querySelector('.randal-render-quality'),null);
 }finally{f.close();}
});
test('closing during an asynchronous product change prevents late persistence or reopening',async()=>{
 const f=await fixture();let release;
 try{f.editing.selectItem(f.source.items[0].id,'cabinet');const select=document.querySelector('#randal-product-finish');select.value=select.options.find(o=>o.value!==select.value&&!o.disabled).value;f.deferNext(new Promise(resolve=>release=resolve));const pending=select.onchange();f.ui.close();release();await pending;assert.equal(f.saved.length,0);assert.equal(document.querySelector('#randal-presentation'),null);assert.equal(f.disposed,1);assert.equal(document.querySelector('.randal-render-quality'),null);}finally{f.close();}
});
test('display controls start with dimensions off and neutral brightness without saving or rebuilding',async()=>{
 const f=await fixture();try{
  const toggle=document.querySelector('#randal-dimensions-toggle'),slider=document.querySelector('#randal-brightness');
  assert.equal(toggle.textContent,'Cotes');assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal(f.engine.dimensions.isVisible(),false);
  assert.equal(slider.type,'range');assert.equal(slider.min,'25');assert.equal(slider.max,'150');assert.equal(slider.value,'100');assert.equal(slider.getAttribute('aria-valuetext'),'100 %');
  assert.equal(document.querySelector('#randal-brightness-value').textContent,'100 %');assert.equal(f.engine.getBrightness(),100);assert.equal(f.saved.length,0);assert.equal(f.updates,1);
  assert.equal(document.querySelector('.randal-presentation-header').textContent.includes('version de test'),false);
 }finally{f.close();}
});
test('brightness changes immediately, persists on completion and preserves unrelated view preferences',async()=>{
 const f=await fixture({preferences:{brightness:84,dimensions:false,custom:'preserved'}});try{
  const slider=document.querySelector('#randal-brightness');assert.equal(slider.value,'84');assert.equal(f.engine.dimensions.isVisible(),false);
  slider.value='125';slider.oninput();assert.equal(f.engine.getBrightness(),125);assert.equal(document.querySelector('#randal-brightness-value').textContent,'125 %');assert.equal(f.saved.length,0);assert.equal(f.updates,1);
  slider.onchange();assert.equal(f.saved.length,1);assert.deepEqual(f.saved[0].presentation,{defaultsVersion:2,brightness:125,dimensions:false,custom:'preserved'});assert.deepEqual(f.saved[0].items,f.source.items);assert.equal(f.updates,1);
  slider.value='900';slider.onchange();assert.equal(f.engine.getBrightness(),150);assert.equal(slider.value,'150');assert.equal(f.saved.at(-1).presentation.brightness,150);
  slider.value='invalid';slider.onchange();assert.equal(f.engine.getBrightness(),100);
 }finally{f.close();}
});
test('dimensions toggle persists alongside brightness and restores when opening the saved composition',async()=>{
 const f=await fixture({preferences:{brightness:77,dimensions:true,custom:4}});try{
  const toggle=document.querySelector('#randal-dimensions-toggle');toggle.onclick();assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal(f.engine.dimensions.isVisible(),false);assert.equal(f.updates,1);
  const saved=f.saved.at(-1);assert.deepEqual(saved.presentation,{defaultsVersion:2,brightness:77,dimensions:false,custom:4});
  f.ui.close();assert.equal(await f.ui.open(saved),true);assert.equal(document.querySelector('#randal-brightness').value,'77');assert.equal(document.querySelector('#randal-dimensions-toggle').getAttribute('aria-pressed'),'false');assert.equal(f.engine.getBrightness(),77);assert.equal(f.engine.dimensions.isVisible(),false);
 }finally{f.close();}
});
test('detached display controls never mutate a closed presentation',async()=>{
 const f=await fixture();try{
  const slider=document.querySelector('#randal-brightness'),toggle=document.querySelector('#randal-dimensions-toggle');f.ui.close();slider.value='60';slider.oninput();slider.onchange();toggle.onclick();assert.equal(f.saved.length,0);assert.equal(f.engine.getBrightness(),100);assert.equal(f.engine.dimensions.isVisible(),false);
 }finally{f.close();}
});
test('both configurators preserve display preferences through their actual project validator',()=>{
 const fixtures=[[adapter.draftProject(adapter.initialDraft()),studioChecked],[generalAdapter.draftProject(generalAdapter.initialDraft('aruba')),generalChecked]];
 for(const [project,checked]of fixtures){project.presentation={defaultsVersion:2,brightness:125,dimensions:false};assert.deepEqual(checked(project).presentation,project.presentation);}
});
test('the exact selected finish image appears immediately and rolls back if the product cannot load',async()=>{
 const f=await fixture();let release;try{
  f.editing.selectItem(f.source.items[0].id,'cabinet');const select=document.querySelector('#randal-product-finish'),figure=select.parentElement.querySelector('.randal-choice-preview'),previous=select.value,expected=id=>'assets/'+FINISHES.find(finish=>finish.id===id).swatch;
  assert.equal(figure.querySelector('img').src,expected(previous));select.value=select.options.find(o=>!o.disabled&&o.value!==previous).value;const next=select.value;
  f.rejectUpdate();f.deferNext(new Promise(resolve=>release=resolve));const pending=select.onchange();assert.equal(figure.querySelector('img').src,expected(next));assert.equal(document.querySelector('.randal-presentation-controls').inert,true);
  release();await pending;assert.equal(select.value,previous);assert.equal(figure.querySelector('img').src,expected(previous));assert.equal(f.saved.length,0);assert.equal(document.querySelector('.randal-presentation-controls').inert,false);
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
test('the updated fullscreen migrates its base view once and preserves later choices',async()=>{
 const f=await fixture({legacy:true,preferences:{brightness:77,dimensions:true,custom:'preserved'}});try{
  assert.equal(f.saved.length,1);assert.equal(f.saved[0].presentation.defaultsVersion,2);assert.equal(f.saved[0].presentation.dimensions,false);assert.equal(f.saved[0].presentation.brightness,77);assert.equal(f.saved[0].presentation.custom,'preserved');
  assert.equal(document.querySelector('#randal-floor-choice').value,'yosemite-honey');assert.equal(document.querySelector('#randal-wall-choice').value,'paint-grey');assert.equal(document.querySelector('#randal-dimensions-toggle').getAttribute('aria-pressed'),'false');
  assert.equal(f.saved[0].layouts.floor.pattern,'two-thirds');assert.match(document.querySelector('#randal-floor-choice').textContent,/pose 2\/3/);assert.deepEqual(f.saved[0].items,f.source.items);
  const toggle=document.querySelector('#randal-dimensions-toggle');toggle.onclick();assert.equal(f.saved.at(-1).presentation.dimensions,true);
  const floor=document.querySelector('#randal-floor-choice');floor.value='creta-caramello';await floor.onchange();const saved=f.saved.at(-1),count=f.saved.length;
  f.ui.close();assert.equal(await f.ui.open(saved),true);assert.equal(f.saved.length,count);assert.equal(document.querySelector('#randal-dimensions-toggle').getAttribute('aria-pressed'),'true');assert.equal(document.querySelector('#randal-floor-choice').value,'creta-caramello');assert.equal(document.querySelector('#randal-wall-choice').value,'paint-grey');assert.equal(document.querySelector('#randal-brightness').value,'77');
 }finally{f.close();}
});
test('an unsuccessful initial surface load never persists the defaults migration',async()=>{
 const f=await fixture({legacy:true,initialSurfaceResult:false,expectedOpen:false});try{
  assert.equal(f.saved.length,0);assert.equal(f.disposed,1);assert.match(document.querySelector('.randal-presentation-status').textContent,/revêtement n’a pas pu être chargé/);assert.equal(document.querySelector('#randal-dimensions-toggle'),null);
 }finally{f.close();}
});
