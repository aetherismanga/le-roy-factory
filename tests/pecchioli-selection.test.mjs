import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const data=JSON.parse(read('assets/data/pecchioli-catalogue.json'));
const source=read('assets/js/inspirations-pecchioli.js');
const local=path=>existsSync(new URL(path.replace(/^\//,''),root));

test('Pecchioli references retain unique identities, official sources and documented associations',()=>{
  assert.equal(data.collections.length,149);
  assert.equal(new Set(data.collections.map(p=>p.family)).size,7);
  for(const key of ['id','slug'])assert.equal(new Set(data.collections.map(p=>p[key])).size,149);
  for(const p of data.collections){
    assert.ok(p.name&&p.description&&/^https:\/\/www\.pecchiolifirenze\.com\//.test(p.sourceUrl),p.slug);
    assert.ok(['surface','sanitary','furniture'].includes(p.productType));
    for(const v of p.variants||[]){
      assert.ok(v.id&&v.label);
      if(v.imageUrl)assert.ok(p.images.some(image=>image.url===v.imageUrl&&image.originalUrl===v.originalUrl),p.slug+' exact variant photo');
      if(v.format)assert.ok(p.formats.includes(v.format),p.slug+' variant format');
      for(const id of v.colorIds||[])assert.ok(p.swatches.some(s=>s.id===id),p.slug+' variant colour');
    }
  }
});

test('all photos and format plans have local full and thumbnail files and exact source attribution',()=>{
  const unique=new Set();
  for(const p of data.collections){
    assert.ok(local(p.coverImage)&&local(p.thumbnail),p.slug+' cover');
    assert.ok(p.images.length,p.slug+' gallery');
    for(const image of p.images){
      unique.add(image.url);
      assert.ok(local(image.url)&&local(image.thumb),image.url);
      assert.ok(/^https:\/\/www\.pecchiolifirenze\.com\//.test(image.originalUrl));
      assert.ok(image.label&&image.width<=1920&&image.height<=1920);
    }
  }
  assert.equal(unique.size,225);
  for(const family of data.families.filter(f=>f.formatGuide))assert.ok(local(family.formatGuide.url)&&local(family.formatGuide.thumb));
});

test('public data has no prices or purchase fields and catalogue edition is visible',()=>{
  const walk=value=>{if(!value||typeof value!=='object')return;for(const[key,child]of Object.entries(value)){assert.doesNotMatch(key,/^(price|purchasePrice|proPrice|discount|prixAchat|netPrice|tarifHT)$/i);walk(child);}};
  walk(data);assert.doesNotMatch(JSON.stringify(data),/\d\s*(?:€|EUR|euros)/i);
  assert.equal(data.catalogues.length,1);assert.match(data.catalogues[0].label,/2020/);
});

function harness(product){
  const elements=[],bindings=[];
  const node=()=>({style:{},dataset:{},textContent:'',value:'',setAttribute(){},addEventListener(){},focus(){},classList:{add(){},remove(){},contains(){return false},toggle(){return false}}});
  const document={activeElement:null,querySelector(){return null},body:{style:{},appendChild(){}},addEventListener(){},createElement(){
    const nodes=new Map(),el={...node(),open:false,innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector)},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false}};elements.push(el);return el;
  }};
  const window={PECCHIOLI_CATALOGUE:[product],addEventListener(){},LRF_GALLERY_GESTURES:{bind(element,options){bindings.push({element,options})}},LRF_PECCHIOLI_ACCESS:{canAccess:()=>false}};
  vm.runInNewContext(source,{window,document,URLSearchParams});
  return {window,document,elements,bindings,api:window.LRF_PECCHIOLI_SELECTION};
}

test('cards escape supplier content and preserve exact reference identities',()=>{
  const p={...data.collections[0],name:'Test <décor>'};const h=harness(p),products=h.api.normaliseProducts(),card=h.api.renderCards(products);
  assert.match(card,/Test &lt;décor&gt;/);assert.doesNotMatch(card,/Test <décor>|€|selectedColor/);
  assert.match(card,/type="button"/);assert.ok(h.api.matches(products[0]));
  assert.ok(products[0].keywords.includes('10 x 10 cm'));
});

test('detail exposes explicit variants rather than invented combinations and uses shared swipe',()=>{
  const p=data.collections.find(p=>p.slug==='chini-accordi'),h=harness(p);
  assert.equal(h.api.openCollection(p.id),true);
  const dialog=h.elements[0];assert.equal(dialog.open,true);assert.equal(h.document.body.style.overflow,'hidden');
  assert.match(dialog.innerHTML,/pcf-choice-variant/);assert.doesNotMatch(dialog.innerHTML,/pcf-choice-color|pcf-choice-format|selected=|€/);
  assert.match(dialog.innerHTML,/tarif fabricant 2022/);assert.match(dialog.innerHTML,/Validité et conditions à confirmer/);
  assert.equal((dialog.innerHTML.match(/Voir dans le catalogue/g)||[]).length,1);
  assert.match(dialog.innerHTML,/#page=40/);
  assert.equal(h.bindings.length,1);assert.equal(h.bindings[0].options.isEnabled(),true);
  h.bindings[0].options.onSwipe(1);assert.equal(dialog.querySelector('#pcf-image-count').textContent,'2 / 2');
  h.bindings[0].options.onSwipe(-1);assert.equal(dialog.querySelector('#pcf-image-count').textContent,'1 / 2');
  dialog.querySelector('.pcf-main-photo').onclick?.();
});

test('desktop, iOS and home search wire Pecchioli into the exception category and exact deep links',()=>{
  for(const page of ['univers.html','univers-ios.html']){
    const html=read(page);for(const script of ['pecchioli-access.js','inspirations-pecchioli.js'])assert.ok(html.indexOf(script)<html.indexOf('inspirations-v2.js'));
    assert.match(html,/inspirations-pecchioli\.css/);
  }
  assert.match(read('assets/js/inspirations-v2.js'),/state.category='exception';state.partner='Pecchioli Firenze'/);
  assert.match(read('assets/js/site-search-v2.js'),/partner=pecchioli-firenze&collection=/);
  assert.match(read('assets/js/global-search-router.js'),/pecchioli-catalogue\.json/);
});
