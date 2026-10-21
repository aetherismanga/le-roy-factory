import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/viewport.js',import.meta.url),'utf8');
function screen(embedded=false){
 const styles=new Map(),events={},visualEvents={},sent=[];
 const window={innerHeight:844,visualViewport:{height:844,scale:1,addEventListener:(name,fn)=>visualEvents[name]=fn}};
 const parent=embedded?{postMessage:(...args)=>sent.push(args)}:window;
 vm.runInNewContext(source,{__LRF_STANDALONE_PREVIEW__:true,window,parent,URL,document:{referrer:embedded?'https://leroyfactory.fr/randal-configurateur.html':'',documentElement:{style:{setProperty:(name,value)=>styles.set(name,value)}}},addEventListener:(name,fn)=>events[name]=fn,requestAnimationFrame:fn=>fn()});
 return {window,parent,styles,events,visualEvents,sent,height:()=>styles.get('--app-height')};
}
const direct=screen();assert.equal(direct.height(),'844px');
direct.window.visualViewport.height=620;direct.visualEvents.resize();assert.equal(direct.height(),'620px','browser bars reduce the usable height');
direct.window.innerHeight=520;direct.events.resize();assert.equal(direct.height(),'520px');
direct.window.innerHeight=844;direct.window.visualViewport.height=844;direct.events.pageshow();assert.equal(direct.height(),'844px','restored page regains the full height');
direct.window.visualViewport.scale=2;direct.window.visualViewport.height=422;direct.visualEvents.resize();assert.equal(direct.height(),'844px','pinch zoom must not shrink and reflow the application');

const embedded=screen(true),message={type:'randal-general-viewport',height:600,safeBottom:34};
assert.equal(embedded.sent[0][0].type,'randal-general-viewport-ready');assert.equal(embedded.sent[0][1],'https://leroyfactory.fr');
embedded.events.message({source:embedded.parent,origin:'https://untrusted.example',data:message});assert.equal(embedded.height(),'844px');
embedded.events.message({source:{},origin:'https://leroyfactory.fr',data:message});assert.equal(embedded.height(),'844px');
embedded.events.message({source:embedded.parent,origin:'https://leroyfactory.fr',data:message});assert.equal(embedded.height(),'600px');assert.equal(embedded.styles.get('--host-safe-bottom'),'34px');
embedded.events.message({source:embedded.parent,origin:'https://leroyfactory.fr',data:{...message,height:NaN}});assert.equal(embedded.height(),'600px');
embedded.events.message({source:embedded.parent,origin:'https://leroyfactory.fr',data:{...message,height:844,safeBottom:0}});assert.equal(embedded.height(),'844px','host can grow again after browser bars close');
console.log('Visible viewport, iframe origin checks, safe area and pinch zoom: PASS');
