import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('assets/js/inspirations-bulbo.js',root),'utf8');
const catalogue=()=>JSON.parse(readFileSync(new URL('assets/data/bulbo-catalogue.json',root),'utf8'));
const localExists=path=>existsSync(new URL(String(path).replace(/^\//,''),root));
const dimension=value=>String(value).toLowerCase().replaceAll('×','x').replace(/\s/g,'');

test('BULBO catalogue has unique collection identities and four distinct AQUERELLE models',()=>{
  const data=catalogue(),products=data.collections;
  assert.ok(products.length>=90,'full official collection index');
  for(const key of ['id','slug'])assert.equal(new Set(products.map(p=>p[key])).size,products.length,key+' must be unique');
  const furniture=products.filter(p=>p.productType==='furniture');
  assert.deepEqual(furniture.map(p=>p.slug).sort(),['bulbino','mivar','monolith','twix']);
  assert.ok(products.some(p=>p.slug==='bamboom'&&p.badge));
  for(const product of products){
    assert.ok(product.name&&product.description&&product.sourceUrl?.startsWith('https://bulbo.it/'),product.slug);
    assert.ok(['surface','furniture'].includes(product.productType),product.slug);
    assert.ok(!product.formats.some(format=>dimension(format).startsWith('60x120')),product.slug+' discontinued 60×120');
    for(const finish of product.finishes||[])if(/crystal/i.test(finish)&&!/^oro\s/i.test(finish))assert.match(finish,/6\s*mm/i,product.slug+' Crystal thickness');
    assert.ok(typeof product.catalogueUrl==='string'&&/^(https:\/\/|\/assets\/|assets\/)/.test(product.catalogueUrl),product.slug+' single current catalogue');
    assert.equal(product.catalogueUrls,undefined,product.slug+' must not expose duplicate catalogues');
  }
});

test('every BULBO collection has a real local image and every referenced derivative exists',()=>{
  for(const product of catalogue().collections){
    assert.ok(product.coverImage&&localExists(product.coverImage),product.slug+' cover');
    assert.ok(product.images?.length,product.slug+' gallery');
    for(const image of [...product.images,...(product.swatches||[])]){
      assert.ok(image.url&&localExists(image.url),product.slug+' image '+image.url);
      if(image.thumb)assert.ok(localExists(image.thumb),product.slug+' thumbnail '+image.thumb);
      assert.ok(/^https:\/\/(?:www\.)?bulbo\.it\//.test(image.originalUrl || ''),product.slug+' official original');
      assert.ok(image.label,product.slug+' descriptive image label');
    }
  }
});

test('public BULBO data never embeds a professional rate or purchase field',()=>{
  const walk=(value,path='catalogue')=>{
    if(!value||typeof value!=='object')return;
    for(const [key,child]of Object.entries(value)){
      assert.ok(!/^(proPrice|purchasePrice|purchaseHT|prixAchat|amount|price|tarifHT|netPrice|discount)$/i.test(key),path+'.'+key);
      walk(child,path+'.'+key);
    }
  };
  walk(catalogue());
  assert.doesNotMatch(JSON.stringify(catalogue()),/\d\s*(?:€|EUR|euros)/i);
});

test('every selectable colour swatch corresponds to an exact supplier choice',()=>{
  for(const product of catalogue().collections){
    for(const image of product.swatches||[])assert.ok(product.colors.includes(image.label),product.slug+' selectable swatch '+image.label);
    if(product.slug==='monolith'){
      assert.equal(product.swatches.length,0);
      assert.equal(product.colors.length,0);
      assert.deepEqual(product.formats,['Sur mesure']);
    }
  }
});

test('BULBO cards escape supplier content, preserve exact choices and never choose a default colour',()=>{
  const fixture={id:'bulbo-example',slug:'example',name:'Test <décor>',description:'Exact source',productType:'surface',family:'Collection',
    formats:['100 × 300 cm'],colors:['Bianco','Nero'],finishes:['Velvet Touch · mat'],images:[{url:'/assets/img/example.webp',label:'Test'}],coverImage:'/assets/img/example.webp'};
  const window={BULBO_CATALOGUE:[fixture],addEventListener(){}};
  vm.runInNewContext(source,{window,document:{addEventListener(){}}});
  const api=window.LRF_BULBO_SELECTION,products=api.normaliseProducts();
  assert.equal(products[0].colors[0],'Bianco');assert.equal(products[0].colors[1],'Nero');
  assert.equal(products[0].effect,'Collection');assert.equal(api.matches(products[0]),true);
  assert.ok(products[0].keywords.replace(/\s/g,'').includes('100x300cm'),'format keyword accepts an x search for a × supplier dimension');
  const card=api.renderCards(products);
  assert.match(card,/Test &lt;décor&gt;/);assert.doesNotMatch(card,/Test <décor>/);
  assert.match(card,/2 coloris/);assert.match(card,/type="button"/);
  assert.doesNotMatch(card,/€|prix|achat|selectedColor/);
});

test('desktop and iOS selections load BULBO before the shared selection controller',()=>{
  for(const page of ['univers.html','univers-ios.html']){
    const html=readFileSync(new URL(page,root),'utf8');
    for(const file of ['bulbo-access.js','inspirations-bulbo.js'])assert.ok(html.indexOf(file)<html.indexOf('inspirations-v2.js'),page+' '+file);
    assert.match(html,/inspirations-bulbo\.css/);
  }
});

function modalHarness(product) {
  const elements=[];
  const node=()=>({style:{},dataset:{},textContent:'',value:'',setAttribute(){},addEventListener(){},focus(){},classList:{add(){},remove(){},toggle(){return false}}});
  const document={activeElement:null,body:{style:{},appendChild(){}},addEventListener(){},createElement(){
    const nodes=new Map(),el={...node(),open:false,innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector)},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false}};elements.push(el);return el;
  }};
  const window={BULBO_CATALOGUE:[product],addEventListener(){},LRF_BULBO_ACCESS:{canAccess:()=>false}};
  vm.runInNewContext(source,{window,document,URLSearchParams});
  assert.equal(window.LRF_BULBO_SELECTION.openCollection(product.id),true);
  return {window,document,dialog:elements[0]};
}

test('collection details keep one current catalogue and a separate original supplier page',()=>{
  const fixture={id:'bulbo-test',slug:'test',name:'Test',description:'A verified decor',productType:'surface',formats:['100 × 300 cm'],colors:['Bianco','Nero'],finishes:['Velvet Touch · mat'],images:[{url:'/assets/img/test.webp',label:'Test Bianco'}],
    catalogueUrl:'https://cdnm.heyzine.com/current.pdf#page=20',sourceUrl:'https://bulbo.it/test/',sources:[{url:'https://example.com/obsolete.pdf'}]};
  const h=modalHarness(fixture);
  assert.equal(h.dialog.open,true);
  assert.equal(h.document.body.style.overflow,'hidden');
  assert.equal((h.dialog.innerHTML.match(/Voir dans le catalogue/g)||[]).length,1);
  assert.ok(h.dialog.innerHTML.includes('https://cdnm.heyzine.com/current.pdf#page=20'));
  assert.ok(h.dialog.innerHTML.includes('https://bulbo.it/test/'));
  assert.doesNotMatch(h.dialog.innerHTML,/obsolete.pdf|selected=|checked=|€/);
  assert.match(h.dialog.innerHTML,/À préciser avec l’agence/);
  assert.match(h.dialog.innerHTML,/Se connecter pour consulter les tarifs/);
});
