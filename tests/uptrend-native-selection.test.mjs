import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/js/uptrend-selection.js',import.meta.url),'utf8');
function harness(partner='UPTREND') {
  const nodes=new Map(),events=new Map(),frames=[],observers=[];
  const make=(id)=>{
    const classes=new Set();
    const node={id,dataset:{},style:{},textContent:'',innerHTML:'',hidden:false,
      classList:{add(...names){names.forEach(n=>classes.add(n));},remove(...names){names.forEach(n=>classes.delete(n));},contains(name){return classes.has(name);}},
      querySelector(selector){return selector==='[data-uptrend-doc]'&&this.innerHTML.includes('data-uptrend-doc')?{}:null;}
    };
    nodes.set(id,node);return node;
  };
  for(const id of ['partner-workspace','partner-products','workspace-title','workspace-logo','workspace-sub','workspace-pro-badge','workspace-pro-link','partner-count','partner-grid','partner-panel-title'])make(id);
  nodes.get('partner-workspace').dataset.partner=partner;
  nodes.get('workspace-title').textContent=partner;
  nodes.get('partner-grid').innerHTML='Native manufacturer choices';
  nodes.get('partner-panel-title').textContent='Sanitaire';
  const active={dataset:{partner}};
  const document={readyState:'complete',body:make('body'),head:{appendChild(node){nodes.set(node.id,node);}},
    getElementById(id){return nodes.get(id)||null;},
    querySelector(selector){if(selector==='#partner-grid .partner-card.active[data-partner]')return active;return nodes.get(selector.slice(1))||null;},
    createElement(){return make('created-style');},addEventListener(){}}
  const window={addEventListener(name,fn){events.set(name,fn);}};
  const storage={getItem(){return null;}};
  class MutationObserver{constructor(callback){this.callback=callback;observers.push(this);}observe(){}}
  vm.runInNewContext(source,{window,document,sessionStorage:storage,localStorage:storage,location:{search:'?partner=UPTREND'},MutationObserver,requestAnimationFrame:fn=>frames.push(fn)});
  return {nodes,events,frames,observers,active,api:window.LRF_UPTREND_SELECTION,flush(){while(frames.length)frames.shift()();}};
}

test('UPTREND renders only its native selected manufacturer without replacing category or partner controls',()=>{
  const h=harness();h.flush();
  assert.match(h.nodes.get('partner-products').innerHTML,/data-uptrend-doc/);
  assert.match(h.nodes.get('partner-products').innerHTML,/uptrend-catalogue-interactif\.html/);
  assert.match(h.nodes.get('partner-products').innerHTML,/uptrend-commande\.html/);
  assert.equal(h.nodes.get('partner-grid').innerHTML,'Native manufacturer choices');
  assert.equal(h.nodes.get('partner-panel-title').textContent,'Sanitaire');
  assert.equal(h.nodes.get('body').classList.contains('lrf-uptrend-view'),true);
});

test('a delayed session or observer callback cannot restore UPTREND over another manufacturer',()=>{
  const h=harness();h.flush();
  h.nodes.get('partner-workspace').dataset.partner='Bilt';
  h.active.dataset.partner='Bilt';h.nodes.get('workspace-title').textContent='Bilt';
  h.nodes.get('partner-products').innerHTML='Bilt catalogue';
  h.events.get('lrf-pro-session-changed')();
  h.observers[0].callback();h.flush();
  assert.equal(h.nodes.get('partner-products').innerHTML,'Bilt catalogue');
  assert.equal(h.nodes.get('workspace-title').textContent,'Bilt');
  assert.equal(h.nodes.get('body').classList.contains('lrf-uptrend-view'),false);
});

test('an old deep-link URL never overrides the current manufacturer or an unchanged render cache',()=>{
  const h=harness('Petracer\'s');h.flush();
  assert.equal(h.nodes.get('partner-products').innerHTML,'');
  delete h.nodes.get('partner-workspace').dataset.partner;
  h.nodes.get('workspace-title').textContent='UPTREND';
  h.api.refresh();
  assert.equal(h.nodes.get('partner-products').innerHTML,'','the active native card wins over an old title and URL');
  h.nodes.get('partner-workspace').dataset.partner='UPTREND';h.api.refresh();
  h.nodes.get('partner-products').innerHTML='controller placeholder';h.api.refresh();
  assert.match(h.nodes.get('partner-products').innerHTML,/data-uptrend-doc/,'same signature does not hide replacement of the real content');
});
