import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function selection(search = '', {bulbo = false} = {}) {
  const nodes = new Map(), events = new Map();
  const openedBulbo=[];
  let session = null;
  function node(selector) {
    if (nodes.has(selector)) return nodes.get(selector);
    const handlers = new Map(), classes = new Set();
    const element = {innerHTML:'', textContent:'', value:'', dataset:{}, style:{},
      setAttribute(){}, scrollIntoView(){}, querySelector(selector){return selector==='[data-saxso-selection]' && this.innerHTML.includes('data-saxso-selection') ? node('saxso-target') : null;},
      addEventListener(type, handler){handlers.set(type, handler);},
      classList:{add(v){classes.add(v);},remove(v){classes.delete(v);},contains(v){return classes.has(v);},toggle(v){classes.has(v)?classes.delete(v):classes.add(v);}},
      click(){handlers.get('click')?.({target:this});},
      clickAs(attribute, value) {
        const target = {closest(selector){return selector === '[' + attribute + ']' ? {dataset:{[attribute === 'data-cat' ? 'cat' : 'partner']:value}} : null;}};
        handlers.get('click')?.({target});
      }
    };
    nodes.set(selector, element); return element;
  }
  const product = (slug, category='Carrelage') => ({id:slug,slug,name:slug,category,formats:[],colors:[],images:[]});
  const window = {
    ELIOS_CATALOGUE:[product('stone'),product('pool-abyss','Piscine')],
    LRF_ELIOS_SELECTION_MODEL:{isPool:p=>p.category==='Piscine',groupPools:p=>p},
    LRF_PRO_SESSION:{read:()=>session},
    LRF_BIOPIETRA_SELECTION:{normaliseProducts:()=>[product('biopietra')],renderCards:()=>'<article>Biopietra</article>',refreshChrome(){}},
    LRF_PETRACER_SELECTION:{setCategory(){},matches:()=>true,normaliseProducts:()=>[product('petracer')],renderCards:()=>'<article>Petracer</article>',refreshChrome(){}},
    addEventListener(type, handler){if(!events.has(type))events.set(type,[]);events.get(type).push(handler);}
  };
  node('#partner-count').parentElement = {querySelector:()=>node('hint')};
  let currentUrl = new URL('https://leroyfactory.fr/univers.html'+search);
  const location = {get href(){return currentUrl.href;},get search(){return currentUrl.search;}};
  const history = {state:null,pushState(state,unused,url){this.state=state;currentUrl=new URL(url,currentUrl);},replaceState(state,unused,url){this.state=state;currentUrl=new URL(url,currentUrl);}};
  const document = {documentElement:{dataset:{}},querySelector:node,getElementById:id=>node('#'+id),body:{style:{}},addEventListener(){}};
  window.dispatchEvent = event => events.get(event.type)?.forEach(handler=>handler(event));
  class CustomEvent {constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  const context={
    window,document,location,history,loadSaxso:()=>new Promise(()=>{}),sessionStorage:{getItem:()=>null},URL,URLSearchParams,CustomEvent
  };
  if(bulbo){
    window.BULBO_CATALOGUE=JSON.parse(readFileSync(new URL('../assets/data/bulbo-catalogue.json',import.meta.url),'utf8')).collections;
    // Exercise real catalogue scoping and cards; this harness isolates the
    // controller's event handling from the module's separate DOM chrome.
    const listen=window.addEventListener;window.addEventListener=()=>{};
    vm.runInNewContext(readFileSync(new URL('../assets/js/inspirations-bulbo.js',import.meta.url),'utf8'),context);
    window.addEventListener=listen;
    const api=window.LRF_BULBO_SELECTION;
    window.LRF_BULBO_SELECTION={...api,refreshChrome(){},openCollection(id){
      const found=api.normaliseProducts().some(product=>product.id===id||product.slug===id);
      openedBulbo.push({id,found,category:node('#partner-workspace').dataset.category});return found;
    }};
  }
  const controller=readFileSync(new URL('../assets/js/inspirations-v2.js',import.meta.url),'utf8').replace(/import\('\.\/saxso-catalogue\.js\?[^']+'\)/,'loadSaxso()');
  vm.runInNewContext(controller,context);
  return {node, choose:id=>node('#insp-categories').clickAs('data-cat',id),
    partner:name=>node('#partner-grid').clickAs('data-partner',name),
    event:type=>events.get(type)?.forEach(handler=>handler({})), setSession:s=>{session=s;},openedBulbo};
}

test('outillage stays Bilt after late stone, tariff and session updates', () => {
  const h=selection();
  h.choose('parement');
  assert.equal(h.node('#workspace-title').textContent,'SAXSO');
  h.partner('Biopietra');
  assert.equal(h.node('#workspace-title').textContent,'Biopietra');
  h.choose('outillages');
  for(const event of ['lrf-biopietra-data-ready','lrf-biopietra-data-error','lrf-agent-tariffs-ready','lrf-pro-session-changed','pageshow']){
    h.event(event);
    assert.equal(h.node('#workspace-title').textContent,'Bilt',event);
    assert.equal(h.node('#partner-workspace').dataset.category,'outillages',event);
    assert.equal(h.node('#partner-panel-title').textContent,'Outillages / divers',event);
    assert.match(h.node('#partner-products').innerHTML,/bilt-selection-space/,event);
    assert.doesNotMatch(h.node('#partner-products').innerHTML,/<article>Biopietra/);
  }
  h.choose('parement');h.choose('outillages');
  assert.match(h.node('#partner-products').innerHTML,/bilt-selection-space/,'returning to Bilt renders its actual content');
});

test('Bilt login and logout refresh only Bilt and keep its catalogue routes', () => {
  const h=selection('?partner=bilt');
  assert.equal(h.node('#workspace-title').textContent,'Bilt');
  assert.match(h.node('#partner-products').innerHTML,/Accès PRO BILT/);
  h.setSession({isAdmin:true});h.event('lrf-pro-session-changed');
  assert.match(h.node('#partner-products').innerHTML,/commande-bilt.html/);
  assert.equal(h.node('#workspace-pro-link').href,'commande-bilt.html');
  h.setSession(null);h.event('lrf-pro-session-changed');
  assert.doesNotMatch(h.node('#partner-products').innerHTML,/commande-bilt.html/);
  h.partner('Biopietra');h.choose('unknown');
  assert.equal(h.node('#workspace-title').textContent,'Bilt','stale controls cannot choose a foreign partner or invalid category');
});

test('sanitary manufacturers stay distinct and the Elios pool section keeps its state on refresh', () => {
  const h=selection();
  h.choose('sanitaire');h.partner('UPTREND');
  h.event('lrf-pro-session-changed');
  assert.equal(h.node('#workspace-title').textContent,'UPTREND');
  h.partner("Petracer's");h.event('lrf-agent-tariffs-ready');
  assert.equal(h.node('#workspace-title').textContent,"Petracer's");
  h.choose('carrelage');h.node('#elios-pool-collections').click();h.event('lrf-pro-session-changed');
  assert.equal(h.node('#partner-workspace').dataset.category,'carrelage');
  assert.equal(h.node('#elios-pool-nav').hidden,false);
  assert.match(h.node('#partner-products').innerHTML,/pool-abyss/);
  assert.doesNotMatch(h.node('#partner-products').innerHTML,/data-id="elios-stone"/);
  assert.doesNotMatch(h.node('#insp-categories').innerHTML,/data-cat="piscine"/);
  h.node('#elios-all-collections').click();assert.match(h.node('#partner-products').innerHTML,/elios-stone/);
  h.choose('outillages');h.event('lrf-agent-tariffs-ready');
  assert.equal(h.node('#workspace-title').textContent,'Bilt');
  assert.equal(h.node('#elios-pool-nav').hidden,true);
});


test('old pool links open inside Elios without a main universe button',()=>{
  const h=selection('?partner=Elios%20Ceramica&category=piscine');
  assert.equal(h.node('#partner-workspace').dataset.category,'carrelage');
  assert.equal(h.node('#workspace-title').textContent,'Elios Ceramica');
  assert.equal(h.node('#elios-pool-nav').hidden,false);
  assert.match(h.node('#partner-products').innerHTML,/pool-abyss/);
  assert.doesNotMatch(h.node('#insp-categories').innerHTML,/data-cat="piscine"/);
});

test('BULBO furniture links, late data and session refresh keep all four furniture models',()=>{
  const h=selection('?partner=bulbo&category=meubles&collection=mivar',{bulbo:true});
  const verify=()=>{
    assert.equal(h.node('#partner-workspace').dataset.category,'meubles');
    assert.equal(h.node('#workspace-title').textContent,'Bulbo');
    assert.equal(h.node('#partner-count').textContent,'4 meubles BULBO');
    assert.equal(h.node('#v2-filters').style.display,'','furniture dimensions remain filterable');
    for(const slug of ['bulbino','mivar','monolith','twix'])assert.ok(h.node('#partner-products').innerHTML.includes('data-id="bulbo-'+slug+'"'),slug);
    assert.doesNotMatch(h.node('#partner-products').innerHTML,/data-id="bulbo-bamboom"/);
  };
  verify();
  assert.match(h.node('#partner-grid').innerHTML,/data-partner="Bulbo"/);
  assert.deepEqual(h.openedBulbo,[{id:'mivar',found:true,category:'meubles'}],'requested collection opens after the controller sets furniture scope');
  h.setSession({isAdmin:true});
  for(const event of ['lrf-bulbo-data-ready','lrf-agent-tariffs-ready','lrf-pro-session-changed','pageshow']){h.event(event);verify();}
  assert.equal(h.openedBulbo.length,1,'late events do not repeatedly open the product');
  h.choose('exception');h.partner('Bulbo');
  assert.equal(h.node('#partner-workspace').dataset.category,'exception');
  assert.match(h.node('#partner-products').innerHTML,/data-id="bulbo-bamboom"/,'existing surface selection remains available');
  h.choose('meubles');h.partner('Bulbo');verify();
});

test('existing BULBO links keep exception while furniture surface deep links are refused',()=>{
  const legacy=selection('?partner=bulbo',{bulbo:true});
  assert.equal(legacy.node('#partner-workspace').dataset.category,'exception');
  assert.match(legacy.node('#partner-products').innerHTML,/data-id="bulbo-bamboom"/);
  const scoped=selection('?partner=bulbo&category=meubles&collection=bamboom',{bulbo:true});
  assert.deepEqual(scoped.openedBulbo,[{id:'bamboom',found:false,category:'meubles'}]);
  assert.equal(scoped.node('#partner-count').textContent,'4 meubles BULBO');
});


test('the exterior selection is a native catalogue link between Elios and La Fenice without supplier access', () => {
  const h=selection();
  const html=h.node('#partner-grid').innerHTML;
  const elios=html.indexOf('data-partner="Elios Ceramica"');
  const catalogue=html.indexOf('data-r11-catalogue-link');
  const fenice=html.indexOf('data-partner="La Fenice"');
  assert.ok(elios>=0&&catalogue>elios&&fenice>catalogue);
  const link=html.match(/<a[^>]*data-r11-catalogue-link[\s\S]*?<\/a>/)?.[0];
  assert.match(link,/href="catalogue-exterieur-r11\.html"/);
  assert.match(link,/assets\/img\/logo03lrf\.png/);
  assert.match(link,/Toutes collections/);
  assert.doesNotMatch(link,/data-partner|Tarif PRO|locked/);
  h.event('lrf-pro-session-changed');
  assert.equal((h.node('#partner-grid').innerHTML.match(/data-r11-catalogue-link/g)||[]).length,1);
  h.choose('meubles');assert.doesNotMatch(h.node('#partner-grid').innerHTML,/data-r11-catalogue-link/);
  h.choose('carrelage');assert.match(h.node('#partner-grid').innerHTML,/data-r11-catalogue-link/);
  h.partner('La Fenice');assert.equal(h.node('#workspace-title').textContent,'La Fenice');
});
