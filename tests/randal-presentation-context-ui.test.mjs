import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {installVisualDOM} from './helpers/visual-choice-dom.mjs';
import {createRandalPresentation} from '../shared/lrf-3d/randal-presentation-ui.js';
import {createPresentationEditing} from '../shared/lrf-3d/randal-presentation-editing.js';
import {CATALOG} from '../studio-one/src/commerce/catalog.js';
import * as adapter from '../studio-one/src/commerce/guided.js';
import {buildPreview} from '../studio-one/src/commerce/preview-model.js';
async function fixture(){
 const dom=installVisualDOM(),source=adapter.draftProject({...adapter.initialDraft(),column:true,mirror:'ilse',top:'sella'}),saved=[],scene=new T.Scene();let current,project,disposed=0,renderStatus,deferred=null;
 const editing=createPresentationEditing({scene,controls:{enabled:true},getItems:()=>current?.items||[],getProject:()=>project,invalidate(){}});
 const engine={presentation:{editing,capabilities:()=>({opened:false,openable:true,led:false}),setOpened(){},setLED(){},async setSurface(){return true;}},async update(input){if(deferred){const wait=deferred;deferred=null;await wait;}project=structuredClone(input);if(current)scene.remove(current.group);current=buildPreview(project);scene.add(current.group);return true;},reset(){},dispose(){disposed++;editing.dispose();}};
 const ui=createRandalPresentation({getIdentity:()=>({known:true,isAdmin:false,client:{codeClient:'LRF-00321'},configuratorAccess:{mode:'presentation',allowWorkshop:false}}),getProject:()=>source,products:{...adapter,catalog:CATALOG},onChange:p=>saved.push(p),createPreview:async(_host,options)=>{renderStatus=options.onRenderStatus;return engine;}});
 assert.equal(await ui.open(),true);
 return {dom,source,saved,engine,editing,ui,renderStatus,get disposed(){return disposed;},deferNext(promise){deferred=promise;},close(){ui.close();dom.restore();}};
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
