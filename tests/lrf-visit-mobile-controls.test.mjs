import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisitPadState,mountVisitMobileControls,requestVisitLandscape} from '../shared/lrf-3d/visit-mobile-controls.js';

test('direction pad preserves multiple held fingers and cancels opposing motion',()=>{
 const inputs=[],pad=createVisitPadState(value=>inputs.push(value));
 assert.equal(pad.press(1,'forward'),true);pad.press(2,'right');
 assert.deepEqual(inputs.at(-1),{forward:1,strafe:1});
 pad.press(3,'back');assert.deepEqual(inputs.at(-1),{forward:0,strafe:1});
 pad.release(3);pad.release(2);assert.deepEqual(inputs.at(-1),{forward:1,strafe:0});
 pad.reset();assert.deepEqual(inputs.at(-1),{forward:0,strafe:0});assert.equal(pad.size,0);
 assert.equal(pad.press(4,'unknown'),false);assert.equal(pad.size,0);
});

test('native fullscreen never locks physical phone orientation',async()=>{
 const events=[],doc={fullscreenElement:null},stage={async requestFullscreen(){events.push('fullscreen');doc.fullscreenElement=stage;}};
 const result=await requestVisitLandscape({stage,document:doc,screen:{orientation:{async lock(value){events.push(value);}}}});
 assert.deepEqual(events,['fullscreen']);assert.deepEqual(result,{fullscreen:true,locked:false});
});

test('unsupported orientation and fullscreen leave normal device rotation available',async()=>{
 let called=false;
 const result=await requestVisitLandscape({stage:{async requestFullscreen(){throw Error('unsupported');}},document:{},screen:{orientation:{async lock(){called=true;}}}});
 assert.deepEqual(result,{fullscreen:false,locked:false});assert.equal(called,false);
 const stage={},doc={fullscreenElement:stage};
 assert.deepEqual(await requestVisitLandscape({stage,document:doc,screen:{orientation:{async lock(){throw Error('denied');}}}}),{fullscreen:true,locked:false});
});

class Element{
 constructor(doc){this.ownerDocument=doc;this.children=[];this.listeners=new Map();this.attrs={};this.dataset={};this.style={};const classes=new Set();this.classList={add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name)),contains:name=>classes.has(name)};}
 append(...children){for(const child of children){child.remove();child.parentNode=this;this.children.push(child);}}
 insertBefore(child,before){child.remove();child.parentNode=this;const index=this.children.indexOf(before);this.children.splice(index<0?this.children.length:index,0,child);}
 setAttribute(name,value){this.attrs[name]=value;}
 addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(handler);}
 removeEventListener(name,handler){this.listeners.set(name,(this.listeners.get(name)||[]).filter(value=>value!==handler));}
 async emit(type,values={}){const event={type,preventDefault(){},stopPropagation(){},...values};for(const handler of this.listeners.get(type)||[])await handler(event);}
 dispatchEvent(event){for(const handler of this.listeners.get(event.type)||[])handler(event);}
 setPointerCapture(){}
 remove(){this.removed=true;if(this.parentNode){const siblings=this.parentNode.children,index=siblings.indexOf(this);if(index>=0)siblings.splice(index,1);this.parentNode=null;}}
}
function environment(){
 const doc=new Element();doc.head=new Element(doc);doc.body=new Element(doc);doc.body.style.overflow='auto';doc.createElement=()=>new Element(doc);doc.getElementById=()=>null;
 const win=new Element(doc);win.innerWidth=400;win.innerHeight=800;const timers=new Map();let timerId=0;win.setTimeout=fn=>{timers.set(++timerId,fn);return timerId;};win.clearTimeout=id=>timers.delete(id);win.screen={};doc.defaultView=win;
 const editor=new Element(doc),stage=new Element(doc),after=new Element(doc);doc.body.append(editor);editor.append(stage,after);
 return {doc,win,stage,editor,after,timers};
}

test('mounted pad releases cancelled pointers, lost capture, blur, visibility and visit exit',async()=>{
 const {doc,win,stage}=environment(),inputs=[];
 const ui=mountVisitMobileControls({stage,onInput:value=>inputs.push(value)}),root=stage.children[0],pad=root.children[0];
 const forward=pad.children[0],right=pad.children[2];ui.setActive(true);assert.equal(root.hidden,false);
 await forward.emit('pointerdown',{pointerId:1,button:0});await right.emit('pointerdown',{pointerId:2,button:0});
 assert.deepEqual(inputs.at(-1),{forward:1,strafe:1});
 await right.emit('pointercancel',{pointerId:2});assert.deepEqual(inputs.at(-1),{forward:1,strafe:0});
 await forward.emit('lostpointercapture',{pointerId:1});assert.deepEqual(inputs.at(-1),{forward:0,strafe:0});
 for(const exit of [()=>win.emit('blur'),()=>{doc.hidden=true;return doc.emit('visibilitychange');},()=>ui.setActive(false)]){
  await forward.emit('pointerdown',{pointerId:3,button:0});await exit();assert.deepEqual(inputs.at(-1),{forward:0,strafe:0});
 }
 assert.equal(root.hidden,true);ui.dispose();assert.equal(root.removed,true);assert.equal(doc.body.style.overflow,'auto');
});

test('rotating a visit enters and leaves immersive layout without a manual orientation control',async()=>{
 const {doc,win,stage,editor}=environment();win.navigator={maxTouchPoints:5};win.matchMedia=()=>({matches:true});
 const ui=mountVisitMobileControls({stage});ui.setActive(true);const root=stage.children[0];
 assert.equal(root.children.length,1,'the only control group is the directional cross');assert.equal(root.children[0].children.length,5,'four directions and the centre hold target');
 assert.equal(ui.immersive,false);assert.equal(stage.parentNode,editor);
 win.innerWidth=900;win.innerHeight=420;await win.emit('orientationchange');
 assert.equal(ui.immersive,true);assert.equal(stage.parentNode,doc.body);assert.equal(doc.body.style.overflow,'hidden');
 win.innerWidth=420;win.innerHeight=900;await win.emit('orientationchange');
 assert.equal(ui.immersive,false);assert.equal(stage.parentNode,editor);assert.equal(doc.body.style.overflow,'auto');ui.dispose();
});

test('touch landscape above desktop breakpoints fills the visual viewport and escapes clipped editor ancestors',async()=>{
 const {doc,win,stage,editor,after}=environment();win.innerWidth=1536;win.innerHeight=709;win.navigator={maxTouchPoints:5};win.matchMedia=()=>({matches:true});
 const viewport=new Element(doc);Object.assign(viewport,{width:1374,height:438,offsetLeft:0,offsetTop:0});win.visualViewport=viewport;
 let invalidations=0;const ui=mountVisitMobileControls({stage,onInvalidate:()=>invalidations++});ui.setActive(true);
 assert.equal(ui.immersive,true);assert.equal(stage.parentNode,doc.body,'stage leaves the grid and every clipping/transform ancestor');
 assert.equal(stage.style['--lrf-visit-width'],'1374px');assert.equal(stage.style['--lrf-visit-height'],'438px');assert.equal(doc.body.style.overflow,'hidden');assert(doc.body.classList.contains('lrf-visit-viewport'));
 assert(stage.classList.contains('lrf-visit-immersive'));
 viewport.width=1440;viewport.height=492;await viewport.emit('resize');assert.equal(stage.style['--lrf-visit-width'],'1440px');assert.equal(stage.style['--lrf-visit-height'],'492px');assert(invalidations>=2);
 viewport.width=438;viewport.height=1374;await viewport.emit('resize');
 assert.equal(ui.immersive,false);assert.equal(stage.parentNode,editor);assert.deepEqual(editor.children,[stage,after],'portrait restores original sibling order');assert.equal(doc.body.style.overflow,'auto');ui.dispose();
});

test('desktop landscape retains the original editor and native fullscreen back exits the mobile visit',async()=>{
 const desktop=environment();desktop.win.innerWidth=1536;desktop.win.innerHeight=709;desktop.win.navigator={maxTouchPoints:10};desktop.win.matchMedia=()=>({matches:false});
 const desktopUI=mountVisitMobileControls({stage:desktop.stage});desktopUI.setActive(true);assert.equal(desktopUI.immersive,false);assert.equal(desktop.stage.parentNode,desktop.editor);assert.equal(desktop.doc.body.style.overflow,'auto');desktopUI.dispose();
 const {doc,win,stage,editor}=environment();win.innerWidth=900;win.innerHeight=420;win.navigator={maxTouchPoints:1};win.matchMedia=()=>({matches:true});
 let exits=0,locks=0;stage.requestFullscreen=async()=>{doc.fullscreenElement=stage;};win.screen.orientation={lock:async()=>locks++};
 const ui=mountVisitMobileControls({stage,onExitRequest(){exits++;ui.setActive(false);}});ui.setActive(true);await Promise.resolve();await Promise.resolve();
 assert.equal(doc.fullscreenElement,stage);assert.equal(locks,0,'automatic landscape leaves physical rotation available');doc.fullscreenElement=null;await doc.emit('fullscreenchange');
 assert.equal(exits,1);assert.equal(stage.parentNode,editor);assert.equal(doc.body.style.overflow,'auto');ui.dispose();
});

test('pad centre hold provides an exit while a short touch cannot accidentally leave the visit',async()=>{
 const {stage,timers}=environment();let exits=0;const ui=mountVisitMobileControls({stage,onExitRequest:()=>exits++});ui.setActive(true);const exit=stage.children[0].children[0].children[4];
 await exit.emit('pointerdown',{pointerId:1});assert.equal(timers.size,1);await exit.emit('pointerup',{pointerId:1});assert.equal(timers.size,0);assert.equal(exits,0);
 await exit.emit('pointerdown',{pointerId:2});for(const fn of timers.values())fn();assert.equal(exits,1);ui.dispose();
});


test('rotation notifies only the validated RANDAL portal and restores it on exit',async()=>{
 const {doc,win,stage}=environment(),sent=[];win.innerWidth=1536;win.innerHeight=709;win.navigator={maxTouchPoints:1};win.matchMedia=()=>({matches:true});win.location={href:'https://randal-catalogue-general-3d.vercel.app/atelier.html?entry=randal&standalone=1'};win.parent={postMessage:(...args)=>sent.push(args)};doc.referrer='https://studio-one-beta-test-v2.vercel.app/randal.html';
 const ui=mountVisitMobileControls({stage});ui.setActive(true);await win.emit('resize');await win.emit('resize');
 assert.deepEqual(sent,[[{type:'lrf-portal-presentation',open:true},'https://studio-one-beta-test-v2.vercel.app']],'one transition expands the parent, even without native fullscreen');
 win.innerWidth=400;win.innerHeight=800;await win.emit('orientationchange');assert.equal(sent.at(-1)[0].open,false,'portrait restores the parent header');
 win.innerWidth=900;win.innerHeight=420;await win.emit('orientationchange');assert.equal(sent.at(-1)[0].open,true,'turning the phone back expands its parent again');
 ui.setActive(false);assert.equal(sent.at(-1)[0].open,false,'leaving the visit restores normal parent navigation');ui.dispose();assert.equal(sent.length,4);
 const foreign=environment(),rejected=[];foreign.win.innerWidth=900;foreign.win.innerHeight=420;foreign.win.matchMedia=()=>({matches:true});foreign.win.location=win.location;foreign.win.parent={postMessage:(...args)=>rejected.push(args)};foreign.doc.referrer='https://untrusted.example/';const foreignUI=mountVisitMobileControls({stage:foreign.stage});foreignUI.setActive(true);foreignUI.setActive(false);foreignUI.dispose();assert.deepEqual(rejected,[],'a foreign parent never receives presentation messages');
});

test('disposing a phone visit immediately releases its parent presentation state',()=>{
 const {doc,win,stage}=environment(),sent=[];win.innerWidth=900;win.innerHeight=420;win.matchMedia=()=>({matches:true});win.location={href:'https://studio-one-beta-test-v2.vercel.app/atelier.html?entry=randal&standalone=1'};win.parent={postMessage:data=>sent.push(data)};doc.referrer='https://studio-one-beta-test-v2.vercel.app/randal.html';
 const ui=mountVisitMobileControls({stage});ui.setActive(true);ui.dispose();assert.deepEqual(sent,[{type:'lrf-portal-presentation',open:true},{type:'lrf-portal-presentation',open:false}]);
});
