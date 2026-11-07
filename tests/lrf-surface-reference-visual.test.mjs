import {test} from 'node:test';
import assert from 'node:assert/strict';
import data from '../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};
import {renderSurfaceReferenceSelection,surfaceReferencePreview} from '../shared/lrf-3d/surface-reference-picker.js';
import {createVisualChoiceDOM,descendants,fire} from './helpers/visual-choice-dom.mjs';

for(const mode of ['desktop','touch'])test('exact reference photos: '+mode+' preview leaves the project unchanged until explicit selection',async()=>{
 const env=createVisualChoiceDOM();
 try{
  const choices=['04S6901','04S6902'].map(reference=>data.products.find(product=>product.reference===reference)),calls=[],host=env.element('div');env.document.body.append(host);
  if(mode==='touch')env.document.defaultView.innerWidth=390;
  const controls=renderSurfaceReferenceSelection(host,{choices,selected:choices[0],onChange:key=>calls.push(key)});
  assert.equal(controls.select.hidden,true,'real DOM uses illustrated choices');controls.visual.open();
  const all=()=>descendants(env.document.body),option=all().find(element=>element.dataset?.visualChoiceValue===choices[1].key),row=option.parentElement;
  assert.equal(row.querySelector('img').src,surfaceReferencePreview(choices[1]));
  assert.match(option.getAttribute('aria-label'),/04S6902/);
  if(mode==='desktop'){
   fire(row,'pointerenter',{pointerType:'mouse'});
   const hover=all().find(element=>element.dataset?.visualHover==='true');assert.ok(hover);assert.equal(hover.querySelector('img').src,surfaceReferencePreview(choices[1]));
   fire(row,'pointerleave');
  }
  const preview=row.querySelector('button');preview.click();
  const overlay=all().find(element=>element.dataset?.visualPreview==='true');assert.ok(overlay);assert.equal(overlay.querySelector('img').src,surfaceReferencePreview(choices[1]));
  assert.equal(controls.select.value,choices[0].key);assert.deepEqual(calls,[]);
  overlay.querySelector('button').click();option.click();
  assert.equal(controls.select.value,choices[1].key);assert.deepEqual(calls,[choices[1].key]);
  controls.visual.open();host.replaceChildren();env.document.notifyMutation();await Promise.resolve();
  assert.equal(all().some(element=>element.dataset?.visualChoicePopup==='true'),false,'inspector replacement removes its floating list');
 }finally{env.restore();}
});
