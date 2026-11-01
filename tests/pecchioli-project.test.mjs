import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/js/pecchioli-projet.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../pecchioli-projet.html',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const window={};
vm.runInNewContext(source,{window,document:{getElementById(){return null;}}});
const api=window.LRF_PECCHIOLI_PROJECT_UTILS;
const fixture={id:'minimal-c81',slug:'minimal-c81',name:'Minimal C81',productType:'surface',family:'Gres',
  colors:['Blu','Nero'],formats:['30 × 30 cm'],finishes:['Lucido'],
  coverImage:'assets/img/minimal.webp',images:[],
  swatches:[{id:'blu',name:'Blu',label:'Blu'},{id:'nero',name:'Nero',label:'Nero'}],
  variants:[{id:'minimal-blu-30x30',label:'Minimal C81 · Blu · 30 × 30 cm',format:'30 × 30 cm',colorIds:['blu']},
    {id:'minimal-nero-30x30',label:'Minimal C81 · Nero · 30 × 30 cm',format:'30 × 30 cm',colorIds:['nero']}]};

test('Pecchioli exact choices reject unknown or ambiguous values and preserve supplier dimensions',()=>{
  assert.equal(api.exactChoice(['Blu','Nero'],'rosso'),'');
  assert.equal(api.exactChoice(['Néro','Nero'],'nero'),'');
  assert.equal(api.exactChoice(['30 × 30 cm'],'30x30cm'),'30 × 30 cm');
  assert.equal(api.exactChoice(['Blu','Nero'],''),'');
});

test('Pecchioli variants constrain only documented associations without combining global options',()=>{
  const blue=api.variantOptions(fixture,'minimal-blu-30x30');
  assert.deepEqual(clone(blue.colors),['Blu']);
  assert.deepEqual(clone(blue.formats),['30 × 30 cm']);
  assert.deepEqual(clone(blue.finishes),[],'global finish is not linked to this exact variant');
  for(const key of ['colors','formats','finishes'])assert.deepEqual(clone(api.variantOptions(fixture,'unknown')[key]),[]);
  const unlinked=api.variantOptions({...fixture,variants:[]},'');
  assert.equal(unlinked.linked,false);
  assert.deepEqual(clone(unlinked.colors),['Blu','Nero']);
});

test('all catalogue variants resolve exact source colours and formats for the request form',()=>{
  const products=JSON.parse(readFileSync(new URL('../assets/data/pecchioli-catalogue.json',import.meta.url),'utf8')).collections;
  for(const product of products){
    assert.equal(api.unitOf(product),'','an undocumented unit must remain unspecified');
    for(const variant of product.variants||[]){
      const result=api.variantOptions(product,variant.id);
      assert.ok(result.variant,product.slug+' '+variant.id);
      assert.ok(result.formats.every(format=>product.formats.includes(format)),product.slug+' format');
      const expected=(product.swatches||[]).filter(swatch=>(variant.colorIds||[]).includes(swatch.id)).map(swatch=>swatch.name);
      assert.deepEqual(clone(result.colors),expected,product.slug+' '+variant.id+' exact colours');
    }
  }
});

test('unknown units remain open; quantities stay positive and pieces remain whole',()=>{
  assert.equal(api.unitOf(fixture),'');
  assert.equal(api.unitOf({productType:'sanitary'}),'','no arbitrary unit even for undocumented products');
  assert.equal(api.unitOf({unit:'m2'}),'m²');
  assert.deepEqual(clone(api.unitOptions({unit:'boîte'})),['boîte','m²','pièces','ml']);
  assert.equal(api.quantityValue('2,25',false).value,'2.25');
  assert.ok(api.quantityValue('2.25',api.wholeUnits('pièces')).error);
  assert.equal(api.quantityValue('2',api.wholeUnits('pièces')).value,'2');
  assert.ok(api.quantityValue('0').error);
  assert.ok(api.quantityValue('-2').error);
  assert.equal(api.quantityValue('').error,'','interest without a quantified amount remains possible');
});

function formHarness({query='',session=null,products=[fixture]}={}){
  const fields=new Map();
  class Element{
    constructor(id='',tag='div'){this.id=id;this.tag=tag;this.hidden=false;this.disabled=false;this.required=false;this.children=[];this.listeners=new Map();this.attributes={};this.textContent='';this._value='';}
    get options(){return this.children.flatMap(child=>child.tag==='optgroup'?child.children:[child]).filter(child=>child.tag==='option');}
    get value(){return this._value;}
    set value(value){this._value=this.tag==='select'?(this.options.some(option=>option.value===String(value))?String(value):''):String(value);}
    get selectedOptions(){return this.options.filter(option=>option.value===this.value);}
    add(option){this.children.push(option);}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;if(this.tag==='select')this._value=children[0]?.value||'';}
    addEventListener(name,callback){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(callback);}
    async dispatch(name,event={}){for(const listener of this.listeners.get(name)||[])await listener({target:this,preventDefault(){},...event});}
    setAttribute(name,value){this.attributes[name]=value;}
    removeAttribute(name){delete this.attributes[name];delete this[name];}
    focus(){this.focused=true;}
    scrollIntoView(){}
    select(){}
  }
  for(const match of html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*\bid="([^"]+)"[^>]*>/g))fields.set(match[2],new Element(match[2],match[1]));
  for(const name of ['collection','variant','color','format','finish','unit'])fields.get(name).add({tag:'option',value:'',textContent:''});
  fields.get('postcode').required=fields.get('city').required=true;
  const profile={value:'private'},radios=[{disabled:false,addEventListener(){}},{disabled:false,addEventListener(){}}];
  const form=fields.get('pecchioli-project-form');form.elements={profile};form.querySelectorAll=()=>radios;
  form.reportValidity=()=>!['postcode','city'].some(id=>fields.get(id).required&&!fields.get(id).value);
  const calls=[],copied=[],browserWindow={LRF_PRO_SESSION:{read:()=>session},addEventListener(){},matchMedia(){return {matches:true};}};
  const document={getElementById:id=>fields.get(id),querySelectorAll:()=>[],createElement:tag=>new Element('',tag),createTextNode:text=>({textContent:text})};
  class Option extends Element{constructor(label,value){super('','option');this._value=String(value);this.textContent=label;}}
  vm.runInNewContext(source.replace("}catch{$('catalogue-status')","}catch(error){window.initError=error;$('catalogue-status')"),{window:browserWindow,document,Option,URLSearchParams,location:{search:query},
    navigator:{clipboard:{writeText:async value=>copied.push(value)}},fetch:async (...args)=>{calls.push(args);return {ok:true,json:async()=>({collections:products})};}});
  return {fields,form,profile,radios,calls,copied,window:browserWindow,ready:()=>new Promise(resolve=>setImmediate(resolve))};
}

test('query hydration leaves invalid choices open and never selects an arbitrary colour or unit',async()=>{
  const h=formHarness({query:'?collection=minimal-c81&variant=minimal-blu-30x30&color=unknown&unit=ML&quantity=2.25'});await h.ready();
  assert.equal(h.window.initError,undefined,h.window.initError?.stack);
  assert.equal(h.fields.get('variant').value,'minimal-blu-30x30');
  assert.equal(h.fields.get('color').value,'');
  assert.equal(h.fields.get('format').value,'30 × 30 cm','unique specification of the explicit variant');
  assert.equal(h.fields.get('unit').value,'','unit query must exactly match a permitted unit');
  assert.equal(h.fields.get('query-note').hidden,false);
  const open=formHarness({query:'?collection=minimal-c81',products:[{...fixture,variants:[]}]});await open.ready();
  assert.equal(open.fields.get('color').value,'');assert.equal(open.fields.get('unit').value,'');
  assert.equal(open.fields.get('postcode').required,true);assert.equal(open.fields.get('city').required,true);
});

test('connected LRF profile prepares an explicit mailto and copy recap without sending',async()=>{
  const h=formHarness({query:'?collection=minimal-c81&variant=minimal-blu-30x30&quantity=2&unit=pièces&details=Niche',session:{codeClient:'LRF-04242',societe:'Atelier',email:'client@example.com'}});await h.ready();
  assert.equal(h.window.initError,undefined,h.window.initError?.stack);
  assert.equal(h.profile.value,'professional');assert.equal(h.fields.get('profile-choice').hidden,true);
  assert.equal(h.fields.get('postcode').required,false);assert.equal(h.fields.get('city').required,false);
  assert.ok(h.radios.every(radio=>radio.disabled));
  await h.form.dispatch('submit');
  assert.equal(h.fields.get('request-preview').hidden,false);
  assert.match(h.fields.get('request-text').value,/Quantité souhaitée : 2 pièces/);
  assert.match(h.fields.get('request-text').value,/Code client : LRF-04242/);
  assert.match(h.fields.get('request-text').value,/Dimensions \/ précisions sur la création : Niche/);
  assert.match(h.fields.get('open-email').href,/^mailto:jerome@leroyfactory\.fr\?subject=/);
  await h.fields.get('copy-request').dispatch('click');
  assert.equal(h.copied[0],h.fields.get('request-text').value);
  assert.equal(h.calls.length,1,'only the public catalogue is fetched');
  h.fields.get('unit').value='ml';await h.fields.get('unit').dispatch('change');
  assert.equal(h.fields.get('request-preview').hidden,true,'changes invalidate the previously prepared request');
});
