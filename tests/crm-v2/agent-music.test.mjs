import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../../assets/js/crm-v2-agent-music.js', import.meta.url), 'utf8');
const radio = await readFile(new URL('../../assets/js/crm-radio-player.js', import.meta.url), 'utf8');
const jerome = { uid: 'auth-j', email: 'jerome@leroyfactory.fr', name: 'Jérôme Hugol' };
const coryne = { uid: 'auth-c', email: 'coryne@leroyfactory.fr', name: 'Coryne' };

function harness({home=true,mobile=true}={}) {
  const events = new Map(), windowEvents = new Map(), mediaEvents = new Map();
  let document, radioLoads = 0, focused;
  const match = (node, selector) => selector.startsWith('#') ? node.id === selector.slice(1) : selector.startsWith('.') ? node.className.split(' ').includes(selector.slice(1)) : false;
  function node(tag) {
    const n = {tag,children:[],parentNode:null,className:'',dataset:{},attributes:{},listeners:new Map(),hidden:false,
      get isConnected(){return this===document.body || Boolean(this.parentNode?.isConnected);},
      append(...items){for(const item of items){item.remove();this.children.push(item);item.parentNode=this;}},
      remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(item=>item!==this);this.parentNode=null;},
      replaceChildren(...items){this.children.forEach(item=>{item.parentNode=null;});this.children=[];this.append(...items);},
      setAttribute(key,value){this.attributes[key]=value;},
      addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);},
      querySelector(selector){const found=[];function walk(p){for(const item of p.children){if(selector.split(',').some(s=>match(item,s.trim())))found.push(item);walk(item);}}walk(this);return found[0]||null;},
      closest(selector){let p=this;while(p){if(selector.split(',').some(s=>match(p,s.trim())))return p;p=p.parentNode;}return null;},
      click(){for(const fn of this.listeners.get('click')||[])fn({target:this,stopPropagation(){}});},
      focus(){focused=this;}
    };
    n.classList={add(...names){n.className=[...new Set([...n.className.split(' ').filter(Boolean),...names])].join(' ');},toggle(name,force){const set=new Set(n.className.split(' ').filter(Boolean));const add=force??!set.has(name);if(add)set.add(name);else set.delete(name);n.className=[...set].join(' ');return add;}};
    return n;
  }
  document={body:node('body'),readyState:'complete',createElement:node,
    querySelector:s=>document.body.querySelector(s),getElementById:id=>document.body.querySelector('#'+id),
    addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
  const appbar=node('header');appbar.className='crm-v2-appbar';document.body.append(appbar);
  const topbar=node('div');topbar.className='crm-topbar';document.body.append(topbar);
  const homeSlot=node('div');homeSlot.id='v2-agent-portrait-slot';if(home)document.body.append(homeSlot);
  const media={matches:mobile,addEventListener:(name,fn)=>mediaEvents.set(name,fn),removeEventListener:name=>mediaEvents.delete(name)};
  const window={matchMedia:()=>media,addEventListener:(name,fn)=>windowEvents.set(name,fn),removeEventListener:name=>windowEvents.delete(name)};
  const context={document,window,queueMicrotask,console};
  runInNewContext(source.replace(/export (?=(?:async )?function )/g,'')+'\nthis.start=startAgentMusic;this.resolve=agentPortrait;',context);
  async function loadRadio() {
    radioLoads++;
    const trigger=node('button');trigger.id='lrf-radio-btn';
    const panel=node('section');panel.id='lrf-radio-panel';panel.hidden=true;
    const close=node('button');close.className='lrf-radio-close';close.addEventListener('click',()=>{panel.hidden=true;});panel.append(close);
    trigger.addEventListener('click',()=>{panel.hidden=!panel.hidden;trigger.setAttribute('aria-expanded',String(!panel.hidden));});
    document.querySelector('.info-widgets').append(trigger);document.body.append(panel);
  }
  return {...context,events,windowEvents,mediaEvents,media,appbar,topbar,homeSlot,loadRadio,
    loads:()=>radioLoads,focused:()=>focused,flush:async()=>{for(let n=0;n<10;n++)await Promise.resolve();}};
}

test('portrait identity requires authenticated UID and exact account email', () => {
  const h=harness();
  assert.equal(h.resolve(jerome).name,'Jérôme');
  assert.equal(h.resolve(coryne).name,'Coryne');
  assert.equal(h.resolve({...jerome,email:'other@example.test',name:'Jérôme'}),null);
  assert.equal(h.resolve({email:jerome.email}),null);
  assert.equal(h.resolve({uid:'',email:coryne.email}),null);
  assert.equal(h.resolve({...coryne,email:'CORYNE@LEROYFACTORY.FR'}).src,'/assets/img/corynelogo.png');
});

test('home renders original portrait in one native radio button without autoplay', async () => {
  const h=harness();const stop=h.start({getProfile:async()=>jerome,loadRadio:h.loadRadio});await h.flush();
  const button=h.document.getElementById('lrf-radio-btn'),image=h.document.getElementById('lrf-agent-avatar');
  assert.equal(button.tag,'button');assert.equal(button.type,'button');
  assert.equal(button.attributes['aria-haspopup'],'dialog');
  assert.equal(button.attributes['aria-controls'],'lrf-radio-panel');
  assert.equal(image.src,'/assets/img/jeromelogo.png');
  assert.equal(image.alt,'Photo de Jérôme');assert.equal(image.width,64);
  assert.equal(button.parentNode.parentNode,h.homeSlot);
  assert.equal(h.document.getElementById('lrf-radio-panel').hidden,true);
  assert.equal(h.loads(),1);assert.equal(h.document.querySelector('audio'),null);
  stop();
});

test('native button click opens old player; Escape closes and restores focus', async () => {
  const h=harness();const stop=h.start({getProfile:async()=>coryne,loadRadio:h.loadRadio});await h.flush();
  const button=h.document.getElementById('lrf-radio-btn'),panel=h.document.getElementById('lrf-radio-panel');
  // Browsers emit the same click for native button Enter/Space activation.
  h.events.get('click')({target:button});button.click();await h.flush();
  assert.equal(panel.hidden,false);assert.equal(h.focused(),panel.querySelector('.lrf-radio-close'));
  let prevented=false;h.events.get('keydown')({key:'Escape',preventDefault(){prevented=true;}});
  assert.equal(panel.hidden,true);assert.equal(prevented,true);assert.equal(h.focused(),button);stop();
});

test('account changes update exact portrait; stale initial session cannot win', async () => {
  const h=harness();let resolveInitial;
  const stop=h.start({getProfile:()=>new Promise(resolve=>{resolveInitial=resolve;}),loadRadio:h.loadRadio});
  h.windowEvents.get('lrf-agent-auth-ready')({detail:coryne});await h.flush();
  resolveInitial(jerome);await h.flush();
  assert.equal(h.document.getElementById('lrf-agent-avatar').alt,'Photo de Coryne');
  h.windowEvents.get('lrf-agent-auth-ready')({detail:jerome});await h.flush();
  assert.equal(h.document.getElementById('lrf-agent-avatar').alt,'Photo de Jérôme');assert.equal(h.loads(),1);stop();
});

test('non-home portrait moves with responsive shell, and sign-out removes identity', async () => {
  const h=harness({home:false});const stop=h.start({getProfile:async()=>jerome,loadRadio:h.loadRadio});await h.flush();
  const host=h.document.getElementById('lrf-radio-btn').parentNode;
  assert.equal(host.parentNode,h.appbar);
  h.media.matches=false;h.mediaEvents.get('change')();assert.equal(host.parentNode,h.topbar);
  h.windowEvents.get('lrf-agent-auth-ready')({detail:null});await h.flush();
  assert.equal(h.document.getElementById('lrf-agent-avatar'),null);
  h.windowEvents.get('lrf-agent-auth-ready')({detail:coryne});await h.flush();
  assert.equal(h.document.getElementById('lrf-agent-avatar').alt,'Photo de Coryne');stop();
});

test('new integration reuses all five original stations and reads no local profile hints', () => {
  assert.match(source,/import\('\.\/crm-radio-player\.js'\)/);
  assert.doesNotMatch(source,/localStorage|sessionStorage|\.play\(|new Audio|firebaseConfig|cloudfunctions|import\([^)]*(?:weather|clock-tools)/);
  assert.equal((radio.match(/stream:'https:\/\//g)||[]).length,5);
  for(const label of ['BFM Business','Europe 1','Chérie FM','Fun Radio','Rire & Chansons'])assert.ok(radio.includes(label));
  assert.match(radio,/audio\.preload='none'/);
});
