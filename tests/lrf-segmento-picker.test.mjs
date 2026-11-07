import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSurfacePicker} from '../shared/lrf-3d/surface-picker.js';
import {SEGMENTO,segmentoLayout} from '../shared/lrf-3d/segmento.js';

// DOM behaviour needed by the actual shared picker, without a browser or GPU.
class Element {
 constructor(tag){
  this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.dataset={};this.parentElement=null;
  this.style={setProperty:(key,value)=>{this.style[key]=value;}};this.value='';this.hidden=false;this.disabled=false;this._text='';
  this.classList={add:(...names)=>{this.className=[...new Set([...(this.className||'').split(/\s+/),...names])].filter(Boolean).join(' ');},remove:(...names)=>{this.className=(this.className||'').split(/\s+/).filter(name=>!names.includes(name)).join(' ');},contains:name=>(this.className||'').split(/\s+/).includes(name),toggle:(name,on)=>{const next=on??!this.classList.contains(name);this.classList[next?'add':'remove'](name);return next;}};
 }
 append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
 replaceChildren(...children){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...children);}
 setAttribute(name,value){this.attrs[name]=String(value);}
 getAttribute(name){return this.attrs[name]??null;}
 closest(selector){for(let element=this;element;element=element.parentElement)if(selector.startsWith('#')&&element.id===selector.slice(1))return element;return null;}
 get textContent(){return this._text+this.children.map(child=>child.textContent||'').join('');}
 set textContent(value){this._text=String(value??'');this.children=[];}
 addEventListener(name,callback){this['on'+name]=callback;}
}

const flatten=element=>[element,...element.children.flatMap(flatten)];
const visible=element=>!element.hidden&&(!element.parentElement||visible(element.parentElement));
const compositions=root=>flatten(root).filter(element=>element.dataset.segmentoComposition&&visible(element));
const ids=root=>compositions(root).map(element=>element.dataset.segmentoComposition).sort();
const allIds=SEGMENTO.compositions.map(item=>item.id).sort();
const expected=({pattern='',color=''}={})=>SEGMENTO.compositions.filter(item=>(!pattern||item.patternId===pattern)&&(!color||item.tiles.some(tile=>tile.color===color))).map(item=>item.id).sort();

function fixture(composition=null,withPatterns=true,host=null){
 const styles=new Map();
 globalThis.document={createElement:tag=>new Element(tag),getElementById:id=>styles.get(id),head:{append:element=>styles.set(element.id,element)}};
 globalThis.Option=function(label,value){const option=new Element('option');option.textContent=label;option.value=value;return option;};
 const calls=[],parent=host||new Element('div'),root=renderSurfacePicker(parent,{kind:'wall',collection:'Segmento',color:'albus',format:'15x15',urlFor:value=>value,layout:composition?segmentoLayout({},composition):{},onColor:id=>calls.push({type:'color',id}),onFormat:id=>calls.push({type:'format',id}),onSegmento:withPatterns?id=>calls.push({type:'composition',id}):undefined});
 return {root,parent,calls,control:field=>{
  const element=flatten(root).find(element=>element.dataset.segmentoFilter===field);assert(element,'Segmento '+field+' filter is available');return element;
 },reset:()=>{const button=flatten(root).find(element=>Object.hasOwn(element.dataset,'segmentoReset'));assert(button,'Segmento filter reset is available');button.onclick();},count:()=>{
  const status=flatten(root).find(element=>Object.hasOwn(element.dataset,'segmentoCount'));assert(status,'Segmento result count is available');return status;
 }};
}

test('Segmento initially exposes all 48 compositions across the 12 manufacturer patterns',()=>{
 const {root,calls,control,count}=fixture();
 assert.deepEqual(ids(root),allIds);
 const pattern=control('pattern');assert.equal(pattern.children.filter(option=>option.value).length,12);
 assert.deepEqual(new Set(pattern.children.filter(option=>option.value).map(option=>option.value)),new Set(SEGMENTO.patterns.map(item=>item.id)));
 assert.match(count().textContent,/48/);assert.equal(count().getAttribute('role'),'status');
 assert.deepEqual(calls,[],'Opening the library never applies an arbitrary composition');
});

test('browsing every motif exposes all its variants without applying a first variant',()=>{
 const h=fixture('S01-C'),pattern=h.control('pattern');
 for(const item of SEGMENTO.patterns){
  pattern.value=item.id;pattern.onchange();
  assert.deepEqual(ids(h.root),expected({pattern:item.id}),item.label+' exposes every variant');
  assert.match(h.count().textContent,new RegExp(String(expected({pattern:item.id}).length)));
  assert.match(flatten(h.root).find(element=>Object.hasOwn(element.dataset,'segmentoCurrent')).textContent,/Segmento Pattern 01 · Composition C/,'The applied wall remains identified while another motif is browsed');
 }
 const thumbnail=flatten(h.root).find(element=>element.dataset.segmentoPattern==='S02');assert(thumbnail,'The visual pattern shortcut remains available');thumbnail.onclick();
 assert.deepEqual(ids(h.root),expected({pattern:'S02'}),'The visual shortcut browses every variant of the chosen motif');
 assert.deepEqual(h.calls,[],'A motif filter is browsing, and does not replace the applied wall');
 h.reset();assert.deepEqual(ids(h.root),allIds);
 const active=compositions(h.root).filter(element=>element.getAttribute('aria-pressed')==='true');
 assert.deepEqual(active.map(element=>element.dataset.segmentoComposition),['S01-C'],'Resetting filters retains the applied composition');
});

test('colour, manufacturer reference and pattern filters can be combined and cleared',()=>{
 const h=fixture(),color=h.control('color'),search=h.control('search'),pattern=h.control('pattern');
 assert.equal(color.children.filter(option=>option.value).length,16,'Every genuine Segmento colour is searchable');
 color.value='coelestis';color.onchange();
 assert.deepEqual(ids(h.root),['S01-C','S08-A','S11-C','S11-E'],'The blue source colour finds the reviewed four compositions');
 pattern.value='S11';pattern.onchange();assert.deepEqual(ids(h.root),['S11-C','S11-E']);
 h.reset();assert.deepEqual(ids(h.root),allIds);
 search.value='04I15C0';search.oninput();
 assert.deepEqual(ids(h.root),['S01-C','S02-A','S03-C','S05-D','S11-A'],'The exact DuplexC SKU finds compositions that actually use it');
 search.value='04i15c0';search.oninput();assert.deepEqual(ids(h.root),['S01-C','S02-A','S03-C','S05-D','S11-A'],'SKU search ignores letter case');
 search.value='zz-no-segmento-reference';search.oninput();assert.deepEqual(ids(h.root),[]);assert.match(h.count().textContent,/0/);assert.match(h.root.textContent,/Aucune composition ne correspond/);
 h.reset();assert.deepEqual(ids(h.root),allIds);assert.deepEqual(h.calls,[],'Searching and clearing filters never alter the applied room');
});

test('only an explicit composition click applies its precise variant and updates the checked card',()=>{
 const h=fixture(),pattern=h.control('pattern');pattern.value='S11';pattern.onchange();
 const card=compositions(h.root).find(element=>element.dataset.segmentoComposition==='S11-G');assert(card);card.onclick();
 assert.deepEqual(h.calls,[{type:'composition',id:'S11-G'}]);
 assert.deepEqual(compositions(h.root).filter(element=>element.getAttribute('aria-pressed')==='true').map(element=>element.dataset.segmentoComposition),['S11-G']);
 const reference=flatten(h.root).find(element=>Object.hasOwn(element.dataset,'segmentoComposition')&&element.dataset.segmentoComposition==='');assert(reference);reference.onclick();
 assert.deepEqual(h.calls.at(-1),{type:'composition',id:null});assert.equal(reference.getAttribute('aria-pressed'),'true');
 assert(compositions(h.root).every(element=>element.getAttribute('aria-pressed')==='false'));
});

test('choosing an exact single-tile reference clears composition selection and preserves its real colour identity',()=>{
 const h=fixture('S01-C'),reference=flatten(h.root).find(element=>Object.hasOwn(element.dataset,'segmentoReference'));assert(reference);
 assert.equal(reference.children.filter(option=>option.value).length,16);
 for(const color of SEGMENTO.colors){const option=reference.children.find(option=>option.value===color.id);assert(option,color.id);assert(option.textContent.includes(color.ref),color.id+' retains the manufacturer SKU');}
 reference.value='duplex-c';reference.onchange();
 assert.deepEqual(h.calls,[{type:'color',id:'duplex-c'}],'A single reference uses the original colour callback, without inventing a composition');
 assert(compositions(h.root).every(element=>element.getAttribute('aria-pressed')==='false'));
 const single=flatten(h.root).find(element=>Object.hasOwn(element.dataset,'segmentoComposition')&&element.dataset.segmentoComposition==='');assert.equal(single.getAttribute('aria-pressed'),'true');
 assert.match(flatten(h.root).find(element=>Object.hasOwn(element.dataset,'segmentoCurrent')).textContent,/Carreau seul · Duplex C · 04I15C0/);
});

test('secondary Segmento pickers retain usable colours and format when they do not support composition patterns',()=>{
 const h=fixture(null,false),swatches=flatten(h.root).filter(element=>element.dataset.surfaceColor&&visible(element));
 assert.equal(swatches.length,16,'Aprons and zones can still choose every genuine Segmento reference');
 const format=flatten(h.root).find(element=>element.dataset.surfaceField==='format');assert(format);assert(visible(format),'The secondary format chooser remains visible');assert.equal(format.value,'15x15');assert.equal(format.disabled,false);
 const patternSection=flatten(h.root).find(element=>Object.hasOwn(element.dataset,'segmentoPicker'));assert(patternSection);assert.equal(visible(patternSection),false,'A secondary entry point has no inactive motif library');
 swatches.find(element=>element.dataset.surfaceColor==='coelestis').onclick();
 format.onchange();
 assert.deepEqual(h.calls,[{type:'color',id:'coelestis'},{type:'format',id:'15x15'}]);
});

test('app rerenders preserve the searched motif and colour for the same host after a composition is applied',()=>{
 const h=fixture();
 for(const [field,value]of [['pattern','S11'],['color','duplex-d'],['search','04I15D0']]){const control=h.control(field);control.value=value;control[field==='search'?'oninput':'onchange']();}
 assert.deepEqual(ids(h.root),['S11-G']);compositions(h.root)[0].onclick();assert.deepEqual(h.calls,[{type:'composition',id:'S11-G'}]);
 const options={kind:'wall',collection:'Segmento',color:'duplex-d',format:'15x15',urlFor:value=>value,layout:segmentoLayout({},'S11-G'),onColor:id=>h.calls.push({type:'color',id}),onSegmento:id=>h.calls.push({type:'composition',id})};
 const rerendered=renderSurfacePicker(h.parent,options),control=field=>flatten(rerendered).find(element=>element.dataset.segmentoFilter===field);
 assert.equal(control('pattern').value,'S11');assert.equal(control('color').value,'duplex-d');assert.equal(control('search').value,'04I15D0');
 assert.deepEqual(ids(rerendered),['S11-G'],'Applying the composition does not discard the user’s search');
 assert.equal(compositions(rerendered)[0].getAttribute('aria-pressed'),'true');
 assert.match(flatten(rerendered).find(element=>Object.hasOwn(element.dataset,'segmentoCount')).textContent,/1 composition sur 48/);
 const independent=renderSurfacePicker(new Element('div'),options);
 assert.deepEqual(ids(independent),allIds,'A separate surface picker begins with the complete collection');
 assert.deepEqual(h.calls,[{type:'composition',id:'S11-G'}],'Rebuilding either picker does not apply another composition');
});

test('the real inspector can replace picker children while retaining wall filters independently of floor filters',()=>{
 const body=new Element('div');body.id='object-editor-body';const first=new Element('div');body.append(first);
 const h=fixture(null,true,first);
 for(const [field,value]of [['pattern','S11'],['color','duplex-d'],['search','04I15D0']]){const control=h.control(field);control.value=value;control[field==='search'?'oninput':'onchange']();}
 compositions(h.root)[0].onclick();
 const options={kind:'wall',collection:'Segmento',color:'duplex-d',format:'15x15',urlFor:value=>value,layout:segmentoLayout({},'S11-G'),onColor:()=>{},onSegmento:()=>{}};
 const replace=(owner,input)=>{const parent=new Element('div');owner.replaceChildren(parent);return renderSurfacePicker(parent,input);};
 const wall=replace(body,options),filter=(root,field)=>flatten(root).find(element=>element.dataset.segmentoFilter===field);
 assert.deepEqual(ids(wall),['S11-G'],'A new child under the stable inspector keeps the user’s exact search');
 assert.equal(filter(wall,'pattern').value,'S11');assert.equal(filter(wall,'color').value,'duplex-d');assert.equal(filter(wall,'search').value,'04I15D0');
 assert.equal(compositions(wall)[0].getAttribute('aria-pressed'),'true');
 const floor=replace(body,{...options,kind:'floor'});assert.deepEqual(ids(floor),allIds,'The floor does not inherit the wall search');
 filter(floor,'pattern').value='S02';filter(floor,'pattern').onchange();
 assert.deepEqual(ids(floor),expected({pattern:'S02'}));
 const restoredWall=replace(body,options);assert.deepEqual(ids(restoredWall),['S11-G'],'Returning to the wall restores its own filters');
 const otherBody=new Element('div');otherBody.id='object-editor-body';
 assert.deepEqual(ids(replace(otherBody,options)),allIds,'A separate inspector object starts with all compositions');
});
