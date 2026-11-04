import {test} from 'node:test';
import assert from 'node:assert/strict';
import data from '../shared/lrf-3d/commercial-surfaces.json' with {type:'json'};
import {surfaceReferencePreview,renderSurfaceReferenceSelection} from '../shared/lrf-3d/surface-reference-picker.js';
import {renderCommercialSelection as renderStudio} from '../studio-one/src/surface-commerce.js';
import {renderCommercialSelection as renderGeneral} from '../randal-general/src/surface-commerce.js';

class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.hidden=false;this._text='';}
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
 setAttribute(key,value){this.attributes[key]=String(value);}
 append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
 replaceChildren(...children){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...children);}
}
const find=(root,predicate)=>predicate(root)?root:root.children.map(child=>find(child,predicate)).find(Boolean);
function withDocument(run){
 const previous=globalThis.document,head=new Element('head');
 globalThis.document={head,createElement:tag=>new Element(tag),getElementById:id=>find(head,element=>element.id===id)};
 try{return run(new Element('div'),head);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
const product=reference=>data.products.find(product=>product.reference===reference);

test('thumbnail uses the same verified reference face as 3D, never the neighbouring finish HD map',()=>{
 const campaspero=surfaceReferencePreview(product('04S6901')),francese=surfaceReferencePreview(product('04S6902'));
 assert.match(campaspero,/campaspero/);
 assert.doesNotMatch(campaspero,/04S6902/);
 assert.match(francese,/04S6902/);
 assert.notEqual(campaspero,francese);
 assert.equal(surfaceReferencePreview(null),'');
});

test('native reference selection keeps the selected tile image visible and updates exact keys before applying',()=>withDocument((host,head)=>{
 const choices=[product('04S6901'),product('04S6902')],calls=[];
 const controls=renderSurfaceReferenceSelection(host,{choices,selected:choices[0],onChange:key=>calls.push(key)});
 const first=find(host,element=>element.tagName==='IMG');
 assert.equal(first.src,surfaceReferencePreview(choices[0]));
 assert.match(first.alt,/04S6901/);assert.equal(first.loading,'lazy');assert.equal(first.width,72);assert.equal(first.height,72);
 assert.equal(controls.select.attributes['aria-label'],'Référence & finition');
 assert.deepEqual(controls.select.children.map(option=>option.value),choices.map(product=>product.key));
 controls.select.value=choices[1].key;controls.select.onchange();
 const second=find(host,element=>element.tagName==='IMG');
 assert.notEqual(first,second);assert.equal(second.src,surfaceReferencePreview(choices[1]));assert.match(second.alt,/04S6902/);
 assert.deepEqual(calls,[choices[1].key]);assert.equal(find(host,element=>element.className==='surface-reference-unavailable').hidden,true);
 first.onerror(); // A late failure from the removed selection stays detached.
 assert.equal(second.hidden,false);assert.equal(find(host,element=>element.className==='surface-reference-unavailable').hidden,true);
 assert.equal(head.children.length,1);
}));

test('missing and failed tile imagery show a clear placeholder without substituting another product',()=>withDocument(host=>{
 const missing={key:'unreviewed|exact',collection:'Unreviewed',colorId:'unreviewed',color:'Unknown',format:'20x20',reference:'KEEP-EXACT',finish:'Original'};
 const controls=renderSurfaceReferenceSelection(host,{choices:[missing],selected:missing,onChange:()=>assert.fail('rendering cannot mutate selection')});
 assert.equal(controls.select.value,missing.key);
 const image=find(host,element=>element.tagName==='IMG');assert.equal(image.src,undefined);assert.equal(image.hidden,true);
 const fallback=find(host,element=>element.className==='surface-reference-unavailable');assert.equal(fallback.hidden,false);
 renderSurfaceReferenceSelection(host,{choices:[product('0892080')],selected:product('0892080')});
 const real=find(host,element=>element.tagName==='IMG');real.onerror();
 assert.equal(real.hidden,true);assert.equal(find(host,element=>element.className==='surface-reference-unavailable').hidden,false);
}));

for(const [name,render]of [['Studio One / Neobath',renderStudio],['Catalogue Général',renderGeneral]]){
 test(name+': actual commercial selector shows its exact product and preserves the native reference choices',()=>withDocument(host=>{
  const p=product('04S6902'),finish={collection:p.collection,color:p.colorId,format:p.format,catalogueKey:p.key,reference:p.reference,finish:p.finish};
  const calls=[];render(host,finish,key=>calls.push(key));
  const select=find(host,element=>element.tagName==='SELECT'),image=find(host,element=>element.tagName==='IMG');
  assert.equal(select.value,p.key);assert.equal(image.src,surfaceReferencePreview(p));assert.match(image.alt,/04S6902/);
  assert.equal(calls.length,0);
  assert.ok(select.children.length>0);select.onchange();assert.deepEqual(calls,[p.key]);
  assert.doesNotMatch(host.textContent,/Achat HT|purchaseHT|unitPriceHT/);
 }));
}
