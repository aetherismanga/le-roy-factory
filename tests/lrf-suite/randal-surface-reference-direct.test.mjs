import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};
import {renderCommercialSelection as studio} from '../../studio-one/src/surface-commerce.js';
import {renderCommercialSelection as general} from '../../randal-general/src/surface-commerce.js';
import {createVisualChoiceDOM,descendants,isVisible,fire} from '../helpers/visual-choice-dom.mjs';
const find=(root,key,value)=>descendants(root).find(e=>e.dataset?.[key]===value);
for(const [name,render]of [['Studio One',studio],['Catalogue Général',general]])test(name+': exact reference photos are part of the direct selector without enlarged tile previews',()=>{
 const h=createVisualChoiceDOM();
 try{
  const host=h.element('div');h.document.body.append(host);const p=data.products.find(p=>p.reference==='04S6902'),calls=[];
  render(host,{collection:p.collection,color:p.colorId,format:p.format,catalogueKey:p.key,reference:p.reference,finish:p.finish},key=>calls.push(key));
  const trigger=find(host,'visualChoiceTrigger','true');assert(trigger);fire(trigger,'pointerenter',{pointerType:'mouse'});assert.equal(find(h.document.body,'visualHover','true'),undefined);assert.deepEqual(calls,[]);
  assert.equal(descendants(host).filter(e=>e.dataset?.visualChoicePreview&&isVisible(e)).length,0);
  trigger.click();const popup=find(h.document.body,'visualChoicePopup','true');assert(popup);assert.equal(descendants(popup).filter(e=>e.dataset?.visualChoicePreview&&isVisible(e)).length,0);
  const exact=find(popup,'visualChoiceValue',p.key);assert(exact.querySelector('img'));exact.click();assert.deepEqual(calls,[p.key]);
 }finally{h.restore();}
});
