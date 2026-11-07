import test from 'node:test';
import assert from 'node:assert/strict';
import {renderVisualChoice,enhanceVisualSelect,openVisualPreview,attachVisualPreview} from '../shared/lrf-3d/visual-choice.js';
import {createVisualChoiceDOM,fire} from './helpers/visual-choice-dom.mjs';

const entries=[
 {value:'sku-a',label:'Albus',detail:'04I1500 · 15 × 15',image:'assets/albus.webp'},
 {value:'sku-b',label:'Bleu céleste',detail:'04I1530 · 15 × 15',image:'assets/coelestis.webp'},
 {value:'sku-disabled',label:'À confirmer',image:'assets/unknown.webp',disabled:true}
];
const listenerCount=target=>[...(target.listeners?.values()||[])].reduce((sum,handlers)=>sum+handlers.length,0);
const tick=()=>new Promise(resolve=>queueMicrotask(resolve));
function setup(t){const dom=createVisualChoiceDOM();t.after(()=>dom.restore());const host=dom.element('div');dom.document.body.append(host);return {...dom,host};}

test('touching a photo previews without applying; clicking the reference applies exactly once after closing',t=>{
 const {document,host}=setup(t),changes=[];
 const choice=renderVisualChoice(host,{entries,value:'sku-a',label:'Référence',onChange:(value,entry)=>{assert.equal(document.querySelector('[data-visual-choice-popup]'),null);changes.push([value,entry.detail]);}});
 assert.equal(choice.value,'sku-a');assert.equal(changes.length,0);
 choice.element.querySelector('[data-visual-choice-preview="current"]').click();
 assert(document.querySelector('[data-visual-preview]'));assert.equal(choice.value,'sku-a');assert.equal(changes.length,0);
 document.querySelector('.lrf-visual-preview-close').click();choice.trigger.click();
 document.querySelector('[data-visual-choice-preview="sku-b"]').click();
 assert(document.querySelector('[data-visual-preview]'));assert.equal(choice.value,'sku-a');assert.equal(changes.length,0);
 document.querySelector('.lrf-visual-preview-close').click();document.querySelector('[data-visual-choice-value="sku-b"]').click();
 assert.deepEqual(changes,[['sku-b','04I1530 · 15 × 15']]);assert.equal(choice.value,'sku-b');assert.equal(choice.trigger.getAttribute('aria-expanded'),'false');
 choice.open();document.querySelector('[data-visual-choice-value="sku-b"]').click();assert.equal(changes.length,1,'Choosing the current exact reference does not apply it twice');
 choice.destroy();
});

test('filtering by a reference or accents, keyboard navigation and disabled entries preserve exact values',t=>{
 const {document,host}=setup(t),changes=[],choice=renderVisualChoice(host,{entries,value:'sku-a',onChange:value=>changes.push(value)});
 choice.open();choice.search.value='04I1530';fire(choice.search,'input');assert.equal(document.querySelectorAll('[data-visual-choice-value]').length,1);assert.equal(document.querySelector('[data-visual-choice-value]').dataset.visualChoiceValue,'sku-b');
 choice.search.value='celeste';fire(choice.search,'input');assert.equal(document.querySelectorAll('[data-visual-choice-value]').length,1);
 fire(choice.search,'keydown',{key:'ArrowDown'});assert.equal(document.activeElement.dataset.visualChoiceValue,'sku-b');
 document.activeElement.click();assert.deepEqual(changes,['sku-b']);
 choice.open();const disabled=document.querySelector('[data-visual-choice-value="sku-disabled"]');disabled.click();assert.equal(choice.value,'sku-b');assert.equal(changes.length,1);
 fire(choice.search,'keydown',{key:'ArrowUp'});assert.equal(document.activeElement.dataset.visualChoiceValue,'sku-b','Disabled values are skipped');
 fire(document.activeElement.parentElement,'keydown',{key:'Home'});assert.equal(document.activeElement.dataset.visualChoiceValue,'sku-a');
 fire(document.activeElement.parentElement,'keydown',{key:'Escape'});assert.equal(document.activeElement,choice.trigger);assert.equal(document.querySelector('[data-visual-choice-popup]'),null);
 choice.value='missing-reference';assert.equal(choice.value,'missing-reference');assert(choice.trigger.textContent.includes('Référence indisponible'));assert.equal(changes.length,1,'Unknown saved references never fall back to the first product');choice.destroy();
});

test('native select adapter retains its callbacks, metadata labels, value, dataset and mutability',t=>{
 const {document,host,element}=setup(t),select=element('select');select.dataset.referencePicker='wall-2';
 for(const entry of entries){const option=element('option');option.value=entry.value;option.textContent=entry.label+' · native count';option.disabled=!!entry.disabled;select.append(option);}select.value='sku-a';host.append(select);
 let calls=0;select.onchange=()=>calls++;
 const choice=enhanceVisualSelect(select,{entries,label:'Référence'});
 assert.equal(select.hidden,true);assert.equal(choice.element.dataset.referencePicker,'wall-2');choice.open();document.querySelector('[data-visual-choice-value="sku-b"]').click();assert.equal(select.value,'sku-b');assert.equal(calls,1);assert(!choice.trigger.textContent.includes('native count'),'sync keeps the explicit label and detail, rather than repeating native counts');
 select.disabled=true;choice.sync();assert.equal(choice.trigger.disabled,true);select.disabled=false;select.value='sku-a';choice.sync();assert.equal(choice.value,'sku-a');assert.equal(choice.trigger.disabled,false);
 choice.update({value:'sku-b'});assert.equal(select.value,'sku-b');assert.equal(calls,1);choice.value='sku-a';assert.equal(select.value,'sku-a');assert.equal(calls,1,'Programmatic refreshes do not apply a product');
 choice.destroy();assert.equal(select.hidden,false);assert.equal(select.getAttribute('aria-hidden'),null);
});

test('portals stay inside a native dialog and preview taps do not close its choice list',t=>{
 const {document,host,element}=setup(t),dialog=element('dialog');document.body.append(dialog);dialog.showModal();dialog.append(host);
 const choice=renderVisualChoice(host,{entries,value:'sku-a',label:'Carreau'});choice.open();const popup=document.querySelector('[data-visual-choice-popup]');assert.equal(popup.parentElement,dialog);
 const preview=document.querySelector('[data-visual-choice-preview="sku-b"]');preview.click();const modal=document.querySelector('[data-visual-preview]');assert.equal(modal.parentElement,dialog);assert.equal(choice.trigger.getAttribute('aria-expanded'),'true');
 fire(modal,'keydown',{key:'Escape'});assert.equal(document.querySelector('[data-visual-preview]'),null);assert.equal(choice.value,'sku-a');assert.equal(document.activeElement,preview);
 choice.destroy();
});

test('hover and focus enlarge the current label and row without applying; all detached portals and global handlers are cleaned',async t=>{
 const {document,host}=setup(t),changes=[],choice=renderVisualChoice(host,{entries,value:'sku-a',onChange:value=>changes.push(value)});
 fire(choice.trigger,'pointerenter',{pointerType:'mouse'});assert(document.querySelector('[data-visual-hover]'));assert.equal(changes.length,0);fire(choice.trigger,'pointerleave');assert.equal(document.querySelector('[data-visual-hover]'),null);
 choice.open();assert(listenerCount(document)>0);assert(listenerCount(document.defaultView)>0);
 const row=document.querySelector('[data-visual-choice-value="sku-b"]').parentElement;fire(row,'pointerenter',{pointerType:'touch'});assert.equal(document.querySelector('[data-visual-hover]'),null);fire(row,'focusin');assert(document.querySelector('[data-visual-hover]'));assert.equal(changes.length,0);
 host.replaceChildren();await tick();await tick();assert.equal(document.querySelector('[data-visual-choice-popup]'),null);assert.equal(document.querySelector('[data-visual-hover]'),null);assert.equal(listenerCount(document),0);assert.equal(listenerCount(document.defaultView),0);choice.destroy();
});

test('outside press and Escape restore ordinary browsing; photo-free filters use the whole trigger width',t=>{
 const {document,host,element}=setup(t),choice=renderVisualChoice(host,{entries:[{value:'',label:'Tous les motifs'},...entries],value:'',label:'Motif'});
 assert(choice.element.classList.contains('lrf-visual-choice-no-preview'));assert.equal(choice.element.querySelector('[data-visual-choice-preview="current"]').hidden,true);
 choice.open();const outside=element('button');document.body.append(outside);fire(document,'pointerdown',{target:outside});assert.equal(choice.trigger.getAttribute('aria-expanded'),'false');assert.equal(listenerCount(document),0);
 choice.setValue('sku-a');assert(!choice.element.classList.contains('lrf-visual-choice-no-preview'));choice.open();fire(choice.search,'keydown',{key:'Escape'});assert.equal(document.querySelector('[data-visual-choice-popup]'),null);choice.destroy();
});

test('independent preview helper closes on opener removal and its hover disposer removes local listeners',async t=>{
 const {document,host,element}=setup(t),button=element('button');host.append(button);const cleanup=attachVisualPreview(button,entries[0]);assert(listenerCount(button)>0);const modal=openVisualPreview(entries[0],{opener:button});assert(modal?.element);assert.equal(document.body.style.overflow,'hidden');button.remove();await tick();assert.equal(document.querySelector('[data-visual-preview]'),null);assert.equal(document.body.style.overflow,undefined);cleanup();assert.equal(listenerCount(button),0);
});

test('Escape on the popup close button closes only the list and retains its native dialog',t=>{
 const {document,host,element}=setup(t),dialog=element('dialog');document.body.append(dialog);dialog.showModal();dialog.append(host);let parentEscapes=0;dialog.onkeydown=event=>{if(event.key==='Escape')parentEscapes++;};
 const choice=renderVisualChoice(host,{entries,value:'sku-a'});choice.open();const close=document.querySelector('.lrf-visual-choice-close');close.focus();fire(close,'keydown',{key:'Escape',bubbles:true});
 assert.equal(document.querySelector('[data-visual-choice-popup]'),null);assert.equal(document.activeElement,choice.trigger);assert.equal(parentEscapes,0);assert.equal(dialog.open,true);assert.equal(listenerCount(document),0);choice.destroy();
});

test('programmatic native dialog close removes connected portals and restores scrolling',async t=>{
 const {document,host,element}=setup(t),dialog=element('dialog');document.body.append(dialog);dialog.showModal();dialog.append(host);
 const choice=renderVisualChoice(host,{entries,value:'sku-a'});choice.open();document.querySelector('[data-visual-choice-preview="sku-b"]').click();assert(document.querySelector('[data-visual-preview]'));assert.equal(document.body.style.overflow,'hidden');dialog.close();await tick();
 assert.equal(choice.element.isConnected,true,'A closed dialog and picker remain in the document');assert.equal(document.querySelector('[data-visual-preview]'),null);assert.equal(document.querySelector('[data-visual-choice-popup]'),null);assert.equal(document.body.style.overflow,undefined);assert.equal(listenerCount(document),0);assert.equal(listenerCount(document.defaultView),0);assert.equal(listenerCount(dialog),0);
 dialog.showModal();fire(choice.trigger,'pointerenter',{pointerType:'mouse'});assert(document.querySelector('[data-visual-hover]'));dialog.removeAttribute('open');await tick();assert.equal(document.querySelector('[data-visual-hover]'),null);assert.equal(listenerCount(dialog),0);choice.destroy();
});

test('incomplete QA DOMs keep their existing select instead of creating two controls',t=>{
 const {document,host,element}=setup(t),select=element('select');host.append(select);select.value='sku-a';let calls=0;select.onchange=()=>calls++;
 const prior=document.defaultView;document.defaultView=undefined;t.after(()=>{document.defaultView=prior;});const choice=enhanceVisualSelect(select,{entries});assert.equal(choice.element,select);assert.equal(select.hidden,false);assert.equal(host.children.length,1);choice.value='sku-b';assert.equal(select.value,'sku-b');assert.equal(calls,0);choice.setValue('sku-a',{emit:true});assert.equal(calls,1);
});
