import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function selection(search = '') {
  const nodes = new Map(), events = new Map();
  let session = null;
  function node(selector) {
    if (nodes.has(selector)) return nodes.get(selector);
    const handlers = new Map(), classes = new Set();
    const element = {innerHTML:'', textContent:'', value:'', dataset:{}, style:{},
      setAttribute(){}, scrollIntoView(){}, querySelector(){return null;},
      addEventListener(type, handler){handlers.set(type, handler);},
      classList:{add(v){classes.add(v);},remove(v){classes.delete(v);},contains(v){return classes.has(v);},toggle(v){classes.has(v)?classes.delete(v):classes.add(v);}},
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
  const document = {querySelector:node,getElementById:id=>node('#'+id),body:{style:{}}};
  vm.runInNewContext(readFileSync(new URL('../assets/js/inspirations-v2.js',import.meta.url),'utf8'), {
    window,document,location:{search},sessionStorage:{getItem:()=>null},URLSearchParams
  });
  return {node, choose:id=>node('#insp-categories').clickAs('data-cat',id),
    partner:name=>node('#partner-grid').clickAs('data-partner',name),
    event:type=>events.get(type)?.forEach(handler=>handler({})), setSession:s=>{session=s;}};
}

test('outillage stays Bilt after late stone, tariff and session updates', () => {
  const h=selection();
  h.choose('parement');
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

test('sanitary manufacturers remain distinct and pool category keeps its state on refresh', () => {
  const h=selection();
  h.choose('sanitaire');h.partner('UPTREND');
  h.event('lrf-pro-session-changed');
  assert.equal(h.node('#workspace-title').textContent,'UPTREND');
  h.partner("Petracer's");h.event('lrf-agent-tariffs-ready');
  assert.equal(h.node('#workspace-title').textContent,"Petracer's");
  h.choose('piscine');h.event('lrf-pro-session-changed');
  assert.equal(h.node('#partner-workspace').dataset.category,'piscine');
  assert.match(h.node('#partner-products').innerHTML,/pool-abyss/);
  assert.doesNotMatch(h.node('#partner-products').innerHTML,/data-id="elios-stone"/);
  assert.match(h.node('#insp-categories').innerHTML,/aria-pressed="true" class="category-card active" data-cat="piscine"/);
  h.choose('outillages');h.event('lrf-agent-tariffs-ready');
  assert.equal(h.node('#workspace-title').textContent,'Bilt');
});
