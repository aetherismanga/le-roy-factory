import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import {parse} from 'acorn';

const source=name=>readFileSync(new URL('../assets/js/'+name,import.meta.url),'utf8');
const turn=()=>new Promise(resolve=>setImmediate(resolve));

test('public entry points and their scripts parse without disabling search or catalogues',()=>{
 for(const page of ['index.html','univers.html','catalogues.html']){
  const html=readFileSync(new URL('../'+page,import.meta.url),'utf8');
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   if(match[1].includes('ld+json'))continue;
   const path=match[1].match(/src=["']([^"'?]+)/)?.[1];
   const code=path?readFileSync(new URL('../'+path,import.meta.url),'utf8'):match[2];
   assert.doesNotThrow(()=>parse(code,{ecmaVersion:'latest',sourceType:match[1].includes('module')?'module':'script'}),page+' '+(path||'inline'));
  }
 }
});

test('the selection page provides its pricing bridge before the product controller',()=>{
 const html=readFileSync(new URL('../univers.html',import.meta.url),'utf8');
 const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
 const pricing=scripts.findIndex(match=>match[1].split('?')[0]==='assets/js/inspirations-elios-pricing.js');
 const controller=scripts.findIndex(match=>match[1].split('?')[0]==='assets/js/inspirations-v2.js');
 assert(pricing>=0&&pricing<controller,'First-click authorized prices must not depend on downloading the HD gallery group');
 assert.match(scripts[pricing][0],/\bdefer\b/,'The early bridge must preserve deferred execution order');
});

test('desktop scrollbar groups event bursts into one paint and keeps drag/click positioning',()=>{
 const nodes=new Map(),events=new Map(),frames=[];let styleWrites=0,mutation,resize;
 function element(){
  const target={style:new Proxy({}, {set(object,key,value){styleWrites++;object[key]=value;return true;}}),children:[],clientHeight:600,
   classList:{add(){},remove(){}},setAttribute(){},setPointerCapture(){},getBoundingClientRect:()=>({top:0}),
   appendChild(child){this.children.push(child);if(child.id)nodes.set(child.id,child);},addEventListener(type,fn){events.set((this.id||'element')+':'+type,fn);}};
  return target;
 }
 const body=element(),html=element();body.scrollHeight=html.scrollHeight=1200;html.scrollTop=body.scrollTop=0;
 const document={body,documentElement:html,scrollingElement:html,head:element(),getElementById:id=>nodes.get(id),createElement:element,
  addEventListener:(name,fn)=>events.set('document:'+name,fn)};
 const window={innerHeight:600,matchMedia:()=>({matches:true}),addEventListener:(name,fn)=>events.set('window:'+name,fn)};
 class ResizeObserver{constructor(fn){resize=fn;}observe(){}}
 const context=vm.createContext({window,document,requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},setTimeout(){},ResizeObserver,
  MutationObserver:class{constructor(fn){mutation=fn;}observe(){}}});
 window.ResizeObserver=ResizeObserver;
 vm.runInContext(source('public-scrollbar.js'),context);
 assert.equal(frames.length,1);frames.shift()();
 const thumb=nodes.get('lrf-desktop-scrollbar-thumb'),track=nodes.get('lrf-desktop-scrollbar');
 assert.equal(thumb.style.height,'300px');assert.equal(track.style.display,'block');const before=styleWrites;
 for(let i=0;i<50;i++){events.get('window:scroll')();events.get('document:scroll')();events.get('window:wheel')();mutation();resize();}
 assert.equal(frames.length,1,'Scroll, wheel, mutation and resize share one pending frame');frames.shift()();
 assert.equal(styleWrites,before,'Unchanged dimensions/position do not rewrite inline styles');
 html.scrollTop=300;events.get('window:scroll')();frames.shift()();assert.equal(thumb.style.transform,'translate3d(0,150px,0)');
 events.get('lrf-desktop-scrollbar-thumb:pointerdown')({clientY:0,pointerId:1,preventDefault(){},stopPropagation(){}});
 events.get('window:pointermove')({clientY:150,preventDefault(){}});assert.equal(html.scrollTop,600,'Dragging still maps thumb travel to the full document');
 events.get('window:pointerup')();
 events.get('lrf-desktop-scrollbar:pointerdown')({target:track,clientY:150});assert.equal(html.scrollTop,0,'Clicking the track still centers the thumb');
});

function selectionFixture({router=false}={}){
 const handlers=new Map(),scripts=[{src:'assets/js/inspirations-elios-pricing.js?v=early'}],requested=[],dispatched=[];let lexiconChecks=0;
 const workspace={textContent:'Elios Ceramica'},search={value:'Golden',events:[],dispatchEvent(event){this.events.push(event.type);}};
 const on=(type,fn)=>{if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn);};
 const document={readyState:'loading',scripts,addEventListener:on,
  getElementById:id=>{if(id==='lrf-product-lexicon-btn'){lexiconChecks++;return {};}return id==='workspace-title'?workspace:id==='v2-search'?search:null;},
  createElement:()=>({dataset:{},remove(){}}),body:{appendChild(script){if(script.src){scripts.push(script);requested.push(script);}}}};
 document.head=document.body;
 const window={addEventListener:on,dispatchEvent:event=>dispatched.push(event.type)};
 const immediate=fn=>{queueMicrotask(fn);return 1;};
 const context=vm.createContext({window,document,Map,Promise,CustomEvent:class{constructor(type){this.type=type;}},
  requestAnimationFrame:immediate,setTimeout:immediate,setInterval:()=>1,clearInterval(){}});
 context.location={pathname:'/univers.html'};context.console=console;context.Event=class{constructor(type){this.type=type;}};
 if(router)vm.runInContext(source('global-search-router.js'),context);
 vm.runInContext(source('selections-lazy-enhancements.js'),context);
 const fire=(type,target={closest:()=>null})=>{for(const fn of handlers.get(type)||[])fn({target});};
 return {handlers,requested,dispatched,fire,workspace,search,get lexiconChecks(){return lexiconChecks;}};
}

test('selection startup installs essential UI before window.load without requesting HD galleries',async()=>{
 const fixture=selectionFixture();fixture.fire('DOMContentLoaded');await turn();
 assert.equal(fixture.lexiconChecks,1,'The lexicon is initialized when the DOM is ready');
 assert.equal(fixture.requested.length,0,'Windows startup must not download every ELIOS gallery');
 assert.equal(fixture.handlers.has('load'),false,'Essential UI does not wait for remote images to finish');
});

test('keyboard-only VIEW manufacturer activation retains its dependency order',async()=>{
 const fixture=selectionFixture(),partner={dataset:{partner:'View Ceramica'}};
 fixture.fire('click',{closest:selector=>selector==='[data-partner]'?partner:null});await turn();
 assert.match(fixture.requested[0].src,/inspirations-view-data\.js/);
 for(let index=0;index<12;index++){
  assert.equal(fixture.requested.length,index+1);fixture.requested[index].onload();await turn();
 }
 assert.match(fixture.requested.at(-1).src,/inspirations-view-order-email-recap-fix/);
 assert.deepEqual(fixture.dispatched,['lrf-selections-view-ready']);
});

test('keyboard click and pointer activation share one ordered ELIOS gallery request',async()=>{
 const fixture=selectionFixture(),partner={dataset:{partner:'Elios Ceramica'}};
 const target={closest:selector=>selector==='[data-partner]'?partner:null};
 fixture.fire('click',target);fixture.fire('pointerdown',target);await turn();
 assert.equal(fixture.requested.length,1,'Two input events must not create parallel group loads');
 assert.match(fixture.requested[0].src,/inspirations-elios-pool-integrated/,'The already-loaded pricing bridge stays first, followed by pool integration');
 const paths=[];
 for(let index=0;index<15;index++){
  assert.equal(fixture.requested.length,index+1,'The next dependency waits for the previous script');
  const script=fixture.requested[index];paths.push(script.src);script.onload();await turn();
 }
 assert.match(paths.at(-1),/inspirations-elios-gallery-v2/,'The gallery controller starts after its data/extensions');
 assert.deepEqual(fixture.dispatched,['lrf-selections-elios-ready']);
 fixture.fire('click',target);await turn();assert.equal(fixture.requested.length,15,'Returning to the manufacturer reuses its completed load');
});

test('product activation and the carrelage category can demand ELIOS galleries',async()=>{
 for(const selector of ['.product-card-v2','[data-cat="carrelage"]']){
  const fixture=selectionFixture();fixture.fire('click',{closest:value=>value===selector?{}:null});await turn();
  assert.equal(fixture.requested.length,1,selector+' triggers its dependencies through keyboard-compatible click');
 }
});

test('the router defers Biopietra until category or keyboard activation and preserves its module order',async()=>{
 const fixture=selectionFixture({router:true});
 assert.match(fixture.requested[0].src,/reviglass-search-index/,'Only the small search bridge is essential at startup');
 fixture.requested[0].onload();await turn();fixture.requested[1].onload();await turn();
 assert.equal(fixture.requested.length,2,'No manufacturer chain is fetched just by opening Selections');
 const partner={dataset:{partner:'Biopietra'}},target={closest:selector=>selector==='[data-partner]'?partner:null};
 fixture.fire('click',target);fixture.fire('pointerdown',target);await turn();
 assert.match(fixture.requested[2].src,/inspirations-biopietra-2026/);
 for(let index=2;index<13;index++){
  assert.equal(fixture.requested.length,index+1);fixture.requested[index].onload();await turn();
 }
 assert.match(fixture.requested[12].src,/biopietra-stability-hotfix/);
 assert(fixture.dispatched.includes('lrf-biopietra-bootstrap-ready'));
 fixture.fire('click',{closest:selector=>selector==='[data-cat="parement"]'?{}:null});await turn();
 assert.equal(fixture.requested.length,13,'The parement category reuses its completed manufacturer chain');
});

test('the router and selection loader share in-flight VIEW scripts and refresh the current query once ready',async()=>{
 const fixture=selectionFixture({router:true});fixture.requested[0].onload();await turn();fixture.requested[1].onload();await turn();
 fixture.workspace.textContent='View Ceramica';const partner={dataset:{partner:'View Ceramica'}};
 fixture.fire('click',{closest:selector=>selector==='[data-partner]'?partner:null});await turn();
 assert.equal(fixture.requested.length,3,'Both consumers share the first in-flight module');
 for(let index=2;index<15;index++){
  assert(fixture.requested[index],'Expected the next VIEW dependency');fixture.requested[index].onload();await turn();
 }
 const paths=fixture.requested.map(script=>script.src.split('?')[0]);
 assert.equal(new Set(paths).size,paths.length,'No duplicate network execution from competing manufacturer loaders');
 assert(fixture.dispatched.includes('lrf-view-bootstrap-ready'));assert(fixture.dispatched.includes('lrf-selections-view-ready'));
 assert.equal(fixture.search.value,'Golden','First-use refresh preserves the current query');assert.deepEqual(fixture.search.events,['input']);
});
