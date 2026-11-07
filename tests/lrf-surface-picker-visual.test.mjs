import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSurfacePicker} from '../shared/lrf-3d/surface-picker.js';
import {segmentoLayout} from '../shared/lrf-3d/segmento.js';
import {surfaceAssetURL} from '../shared/lrf-3d/texture-loader.js';
import {createVisualChoiceDOM,descendants,isVisible,fire} from './helpers/visual-choice-dom.mjs';

const find=(root,key,value)=>descendants(root).find(element=>element.dataset?.[key]===value);
const compIds=root=>descendants(root).filter(element=>element.tagName==='BUTTON'&&element.dataset.segmentoComposition&&isVisible(element)).map(element=>element.dataset.segmentoComposition).sort();
const asset=file=>'https://leroyfactory.fr/assets/img/elios-segmento-20261107/'+file;

function fixture(options={}){
 const dom=createVisualChoiceDOM(),body=dom.element('div'),parent=dom.element('div'),calls=[];body.id='object-editor-body';body.append(parent);dom.document.body.append(body);
 const input={kind:'wall',collection:'Segmento',color:'duplex-c',format:'15x15',layout:segmentoLayout({},'S01-C'),urlFor:surfaceAssetURL,onCollection:id=>calls.push({type:'collection',id}),onColor:id=>calls.push({type:'color',id}),onFormat:id=>calls.push({type:'format',id}),onSegmento:id=>calls.push({type:'composition',id}),...options};
 const root=renderSurfacePicker(parent,input);
 return {...dom,body,parent,input,root,calls,widget:name=>{const widget=find(root,'surfaceVisualField',name);assert(widget,'Illustrated '+name+' control exists');return widget;},open(widget){find(widget,'visualChoiceTrigger','true').click();const popup=find(dom.document.body,'visualChoicePopup','true');assert(popup);return popup;},cleanup(){dom.restore();}};
}

test('illustrated Segmento motifs preserve native contracts and browse all 12 patterns without applying a composition',()=>{
 const h=fixture();
 try{
  assert.equal(compIds(h.root).length,48);const native=descendants(h.root).find(element=>element.tagName==='SELECT'&&element.dataset.segmentoFilter==='pattern');assert.equal(native.hidden,true);assert.equal(native.options.filter(option=>option.value).length,12);
  const widget=h.widget('pattern'),trigger=find(widget,'visualChoiceTrigger','true');assert.equal(trigger.dataset.surfaceField,'segmento-pattern','Inspector focus can target the visible control');
  const popup=h.open(widget),choices=descendants(popup).filter(element=>element.dataset?.visualChoiceValue);assert.equal(choices.length,12);
  const preview=find(popup,'visualChoicePreview','S11');preview.click();const modal=find(h.document.body,'visualPreview','true');assert.equal(modal.querySelector('img').src,asset('compositions/s11-a.webp'));modal.querySelector('button').click();
  assert.equal(compIds(h.root).length,48);assert.deepEqual(h.calls,[],'Previewing a motif never changes the applied composition or filters');
  find(popup,'visualChoiceValue','S11').click();assert.equal(native.value,'S11');assert.equal(compIds(h.root).length,7);assert.deepEqual(h.calls,[],'Selecting a motif only filters its seven variants');
  assert.match(find(h.root,'segmentoCurrent','true').textContent,/Segmento Pattern 01 · Composition C/);
 }finally{h.cleanup();}
});

test('illustrated colour filtering and exact single-reference selection remain independent actions',()=>{
 const h=fixture();
 try{
  let popup=h.open(h.widget('color'));assert.equal(descendants(popup).filter(element=>element.dataset?.visualChoiceValue).length,16);
  find(popup,'visualChoicePreview','coelestis').click();let modal=find(h.document.body,'visualPreview','true');assert.equal(modal.querySelector('img').src,asset('coelestis.webp'));assert.match(modal.textContent,/04I1530/);modal.querySelector('button').click();
  find(popup,'visualChoiceValue','coelestis').click();assert.deepEqual(compIds(h.root),['S01-C','S08-A','S11-C','S11-E']);assert.deepEqual(h.calls,[]);
  const reference=h.widget('segmento-reference');assert.equal(find(reference,'visualChoiceTrigger','true').dataset.surfaceField,'segmento-reference');popup=h.open(reference);
  const duplex=find(popup,'visualChoiceValue','duplex-c');assert.match(duplex.textContent,/04I15C0/);find(popup,'visualChoicePreview','duplex-c').click();modal=find(h.document.body,'visualPreview','true');assert.equal(modal.querySelector('img').src,asset('duplex-c.webp'));modal.querySelector('button').click();assert.deepEqual(h.calls,[]);
  duplex.click();assert.deepEqual(h.calls,[{type:'color',id:'duplex-c'}]);assert.match(find(h.root,'segmentoCurrent','true').textContent,/Carreau seul · Duplex C · 04I15C0/);
  assert.equal(find(h.root,'segmentoCurrent','true').querySelector('img').src,asset('duplex-c.webp'),'The applied single-tile preview uses the same canonical public asset as the enlarged reference');
 }finally{h.cleanup();}
});

test('composition and secondary colour-card previews never trigger their separate apply buttons',()=>{
 const h=fixture();
 try{
  const preview=find(h.root,'surfacePreview','S01-C'),choice=find(h.root,'segmentoComposition','S01-C');assert(preview);assert(choice);
  fire(choice,'pointerenter',{pointerType:'mouse'});let hover=find(h.document.body,'visualHover','true');assert.equal(hover.querySelector('img').src,asset('compositions/s01-c.webp'));fire(choice,'pointerleave',{pointerType:'mouse'});
  preview.click();let modal=find(h.document.body,'visualPreview','true');assert.equal(modal.querySelector('img').src,asset('compositions/s01-c.webp'));modal.querySelector('button').click();assert.deepEqual(h.calls,[]);
  find(h.root,'segmentoComposition','S01-C').click();assert.deepEqual(h.calls,[{type:'composition',id:'S01-C'}]);
  const parent=h.element('div');h.document.body.append(parent);const colors=[];const secondary=renderSurfacePicker(parent,{kind:'wall',collection:'Segmento',color:'albus',format:'15x15',urlFor:surfaceAssetURL,onColor:id=>colors.push(id)});
  find(secondary,'surfacePreview','coelestis').click();modal=find(h.document.body,'visualPreview','true');assert.equal(modal.querySelector('img').src,asset('coelestis.webp'));modal.querySelector('button').click();assert.deepEqual(colors,[]);
  find(secondary,'surfaceColor','coelestis').click();assert.deepEqual(colors,['coelestis']);
 }finally{h.cleanup();}
});

test('illustrated RAL choices track native search results and apply the selected colour only once',()=>{
 const h=fixture({collection:'Peinture',color:'ral-1000',format:'',layout:{},onSegmento:undefined});
 try{
  const search=descendants(h.root).find(element=>element.tagName==='INPUT'&&element.dataset.surfaceField==='ral-search');search.value='3020';fire(search,'input');
  const widget=h.widget('ral');assert.equal(find(widget,'visualChoiceTrigger','true').dataset.surfaceField,'ral');let popup=h.open(widget);const choices=descendants(popup).filter(element=>element.dataset?.visualChoiceValue);assert.equal(choices.length,1);assert.equal(choices[0].dataset.visualChoiceValue,'ral-3020');
  find(popup,'visualChoicePreview','ral-3020').click();const modal=find(h.document.body,'visualPreview','true');assert(modal);assert.match(modal.textContent,/3020/);modal.querySelector('button').click();assert.deepEqual(h.calls,[]);
  choices[0].click();assert.deepEqual(h.calls,[{type:'color',id:'ral-3020'}]);
  search.value='1000';fire(search,'input');popup=h.open(h.widget('ral'));assert.deepEqual(descendants(popup).filter(element=>element.dataset?.visualChoiceValue).map(element=>element.dataset.visualChoiceValue),['ral-1000'],'A later RAL search replaces the illustrated results');
 }finally{h.cleanup();}
});

test('illustrated collection selection preserves native collection identity and applies only on the explicit label',()=>{
 const h=fixture({collection:'Creta',color:'avena',format:'60x120',layout:{},onSegmento:undefined});
 try{
  const widget=h.widget('collection');assert.equal(find(widget,'visualChoiceTrigger','true').dataset.surfaceField,'collection');const popup=h.open(widget);
  find(popup,'visualChoicePreview','Segmento').click();const modal=find(h.document.body,'visualPreview','true');assert.equal(modal.querySelector('img').src,asset('albus.webp'));modal.querySelector('button').click();assert.deepEqual(h.calls,[]);
  find(popup,'visualChoiceValue','Segmento').click();assert.deepEqual(h.calls,[{type:'collection',id:'Segmento'}]);assert.equal(descendants(h.root).find(element=>element.tagName==='SELECT'&&element.dataset.surfaceField==='collection').value,'Segmento');
 }finally{h.cleanup();}
});

test('real inspector replacement keeps illustrated filters and removes the abandoned popup',async()=>{
 const h=fixture();
 try{
  for(const [field,value]of [['pattern','S11'],['color','duplex-d']])find(h.open(h.widget(field)),'visualChoiceValue',value).click();
  const search=descendants(h.root).find(element=>element.tagName==='INPUT'&&element.dataset.segmentoFilter==='search');search.value='04I15D0';fire(search,'input');
  assert.deepEqual(compIds(h.root),['S11-G']);find(h.root,'segmentoComposition','S11-G').click();assert.deepEqual(h.calls,[{type:'composition',id:'S11-G'}]);
  const abandoned=h.open(h.widget('pattern')),parent=h.element('div');h.body.replaceChildren(parent);
  const current=renderSurfacePicker(parent,{...h.input,color:'duplex-d',layout:segmentoLayout({},'S11-G')});await Promise.resolve();await Promise.resolve();
  assert.equal(abandoned.isConnected,false,'Replacing the inspector removes the old body-level popup');
  assert.deepEqual(compIds(current),['S11-G']);assert.equal(find(current,'segmentoComposition','S11-G').getAttribute('aria-pressed'),'true');
  for(const [field,value]of [['pattern','S11'],['color','duplex-d']]){
   const native=descendants(current).find(element=>element.tagName==='SELECT'&&element.dataset.segmentoFilter===field);assert.equal(native.value,value);assert.equal(native.hidden,true);
   assert.equal(find(find(current,'surfaceVisualField',field),'visualChoiceTrigger','true').dataset.surfaceField,'segmento-'+field);
  }
  assert.equal(descendants(current).find(element=>element.tagName==='INPUT'&&element.dataset.segmentoFilter==='search').value,'04I15D0');
  assert.deepEqual(h.calls,[{type:'composition',id:'S11-G'}],'Refreshing the inspector never reapplies another composition');
 }finally{h.cleanup();}
});
