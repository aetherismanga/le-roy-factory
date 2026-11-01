import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../assets/js/inspirations-fenice.js',import.meta.url),'utf8');
function harness({access=true,loadPrices=async()=>{},swatches=[],product={}}={}) {
  const listeners=new Map(), elements=[];
  const state={access,prices:false};
  const source={id:'fenice-sample',slug:'sample',name:'Sample',formats:['30x60','60x60'],images:[],swatches,...product};
  let focused=null;
  function node() {
    return {textContent:'',hidden:false,disabled:false,style:{},classList:{add(){},remove(){},toggle(){return false},contains(){return false}},
      setAttribute(){},addEventListener(){},focus(){focused=this},matches(){return false}};
  }
  function element() {
    const nodes=new Map();
    let html='';
    const el={...node(),open:false,scrollTop:0,
      set innerHTML(value){html=value},get innerHTML(){return html},
      querySelector(selector){
        if(selector==='.fenice-tariffs')return {set outerHTML(value){html=html.replace(/<section class="fenice-tariffs"[\s\S]*?<\/section>/,value)},replaceChildren(){html=html.replace(/<section class="fenice-tariffs"[\s\S]*?<\/section>/,'')}};
        if(!nodes.has(selector))nodes.set(selector,node());
        return nodes.get(selector);
      },querySelectorAll(){return []},
      showModal(){this.open=true},close(){this.open=false}
    };
    elements.push(el);return el;
  }
  const document={activeElement:null,body:{style:{},appendChild(){}},querySelector(){return null},createElement:element,addEventListener(){}};
  const window={FENICE_CATALOGUE:[source],LRF_FENICE_ACCESS:{canAccess:()=>state.access,loadPrices:async()=>{await loadPrices();state.prices=true},getPrice:(_p,f)=>state.prices?{label:f==='30x60'?'12,34 €/m² HT':'Sur demande'}:{locked:true}},
    addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},
    dispatchEvent(e){for(const fn of listeners.get(e.type)||[])fn(e)}
  };
  vm.runInNewContext(script,{window,document,requestAnimationFrame(){},MutationObserver:class{observe(){}},CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail}}});
  window.LRF_FENICE_SELECTION.openCollection(source.id);
  const dialog=elements[0];
  function click(action){dialog.onclick({target:{closest(selector){return selector===action?{dataset:{feniceSwatch:'0'}}:null}}});}
  return {window,state,dialog,elements,click,emit(type,detail){window.dispatchEvent({type,detail})},focused:()=>focused};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('a collection offers only its latest catalogue at the series PDF page',()=>{
  const h=harness({product:{
    primaryCatalogueSource:{label:'Catalogue général 2026/2027',url:'https://example.com/general.pdf',page:148,printedPage:146},
    sources:[{label:'Ancien catalogue',url:'https://example.com/old.pdf',page:26}],
    pdf:'https://example.com/brochure.pdf',sourceUrl:'https://example.com/collection/'
  }});
  assert.equal((h.dialog.innerHTML.match(/class="fenice-source-link"/g)||[]).length,1);
  assert.match(h.dialog.innerHTML,/href="https:\/\/example.com\/general.pdf#page=148"/);
  assert.match(h.dialog.innerHTML,/Catalogue général 2026\/2027 · p. 146/);
  assert.doesNotMatch(h.dialog.innerHTML,/old\.pdf|brochure\.pdf|Fiche technique du fabricant|https:\/\/example.com\/collection\//);
});

test('Voir fetches amounts only on request; Cacher removes them from the HTML',async()=>{
  let calls=0;
  const h=harness({loadPrices:async()=>{calls++}});
  assert.equal(calls,0);assert.doesNotMatch(h.dialog.innerHTML,/12,34/);
  assert.match(h.dialog.innerHTML,/data-lrf-tariff-controlled="fenice"/);
  assert.match(h.dialog.innerHTML,/data-lrf-tariff-toggle="1"/);
  h.click('[data-fenice-price-toggle]');await settle();
  assert.equal(calls,1);assert.match(h.dialog.innerHTML,/12,34 €/);assert.match(h.dialog.innerHTML,/Sur demande/);
  h.click('[data-fenice-price-toggle]');
  assert.doesNotMatch(h.dialog.innerHTML,/12,34/);assert.match(h.dialog.innerHTML,/>Voir</);
});

test('logout purges visible amounts and prevents a late authenticated response from reopening them',async()=>{
  let done;
  const h=harness({loadPrices:()=>new Promise(resolve=>done=resolve)});
  h.click('[data-fenice-price-toggle]');
  h.state.access=false;h.emit('lrf-pro-session-changed');
  done();await settle();
  assert.doesNotMatch(h.dialog.innerHTML,/12,34/);assert.doesNotMatch(h.dialog.innerHTML,/data-fenice-price-toggle/);
  assert.match(h.dialog.innerHTML,/Se connecter/);
});

test('expiration removes amounts from an already open collection',async()=>{
  const h=harness();h.click('[data-fenice-price-toggle]');await settle();
  assert.match(h.dialog.innerHTML,/12,34/);
  h.emit('lrf-fenice-prices-changed',{state:'idle'});
  assert.doesNotMatch(h.dialog.innerHTML,/12,34/);
});

test('a failed request stays masked and offers a retry',async()=>{
  let calls=0;
  const h=harness({loadPrices:async()=>{if(++calls===1)throw Error('Accès momentanément indisponible')}});
  h.click('[data-fenice-price-toggle]');await settle();
  assert.match(h.dialog.innerHTML,/Accès momentanément indisponible/);assert.doesNotMatch(h.dialog.innerHTML,/12,34/);
  h.click('[data-fenice-price-toggle]');await settle();
  assert.equal(calls,2);assert.match(h.dialog.innerHTML,/12,34/);
});

test('named color thumbnails open their own HD original without replacing the ambience gallery',()=>{
  const h=harness({swatches:[{name:'White',image:'assets/white-thumb.webp',original:'https://example.com/white-hd.jpg',alt:'Sample White'}]});
  assert.match(h.dialog.innerHTML,/assets\/white-thumb.webp/);assert.match(h.dialog.innerHTML,/>White</);
  h.click('[data-fenice-swatch]');
  const lightbox=h.elements[1];
  assert.equal(lightbox.open,true);assert.equal(lightbox.querySelector('.fenice-lightbox-stage img').src,'https://example.com/white-hd.jpg');
  assert.equal(lightbox.querySelector('.fenice-lightbox-stage img').alt,'Sample White');
});
