import test from 'node:test';
import assert from 'node:assert/strict';
import {visitJoystickInput,mountVisitMobileControls,requestVisitLandscape} from '../shared/lrf-3d/visit-mobile-controls.js';

const zero={forward:0,strafe:0,speed:0};
test('analog deflection preserves progressive strength with a faster outer upper sector',()=>{
 assert.deepEqual(visitJoystickInput(0,0),zero);assert.deepEqual(visitJoystickInput(.05,-.05),zero);assert.deepEqual(visitJoystickInput(NaN,1),zero);
 const values=[.15,.25,.5,.7,.85,1].map(value=>visitJoystickInput(0,-value));
 for(let index=1;index<values.length;index++)assert(values[index].speed>values[index-1].speed,'farther forward never slows the walker');
 assert.equal(values[0].forward,1);assert.equal(values[0].strafe,0);assert(values[0].speed<.05);assert(Math.abs(values.at(-1).speed-2.1)<1e-9);
 assert.equal(visitJoystickInput(1,0).speed,1,'full sideways remains normal walking speed');assert.equal(visitJoystickInput(0,1).speed,.75,'backwards stays controllable');
 assert.deepEqual(visitJoystickInput(0,-3),visitJoystickInput(0,-1),'outside the ring clamps rather than accelerating indefinitely');
 const diagonal=visitJoystickInput(.7,-.7);assert(diagonal.forward>0&&diagonal.strafe>0);assert(Math.abs(Math.hypot(diagonal.forward,diagonal.strafe)-1)<1e-9);assert(diagonal.speed>1&&diagonal.speed<2.1);
});

test('native fullscreen is optional and never locks physical phone orientation',async()=>{
 const events=[],doc={fullscreenElement:null},stage={async requestFullscreen(){events.push('fullscreen');doc.fullscreenElement=stage;}};
 const result=await requestVisitLandscape({stage,document:doc,screen:{orientation:{async lock(){events.push('lock');}}}});
 assert.deepEqual(events,['fullscreen']);assert.deepEqual(result,{fullscreen:true,locked:false});
 assert.deepEqual(await requestVisitLandscape({stage:{async requestFullscreen(){throw Error('unsupported');}},document:{}}),{fullscreen:false,locked:false});
});

class Element{
 constructor(doc){this.ownerDocument=doc;this.children=[];this.listeners=new Map();this.attrs={};this.dataset={};this.style={};this.rect={left:0,top:0,width:104,height:104};const classes=new Set();this.classList={add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name)),contains:name=>classes.has(name)};}
 append(...children){for(const child of children){child.remove();child.parentNode=this;this.children.push(child);}}
 insertBefore(child,before){child.remove();child.parentNode=this;const index=this.children.indexOf(before);this.children.splice(index<0?this.children.length:index,0,child);}
 setAttribute(name,value){this.attrs[name]=String(value);}
 addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(handler);}
 removeEventListener(name,handler){this.listeners.set(name,(this.listeners.get(name)||[]).filter(value=>value!==handler));}
 async emit(type,values={}){const event={type,preventDefault(){},stopPropagation(){},...values};for(const handler of this.listeners.get(type)||[])await handler(event);}
 dispatchEvent(event){for(const handler of this.listeners.get(event.type)||[])handler(event);}
 setPointerCapture(id){this.captured=id;}
 getBoundingClientRect(){return this.rect;}
 remove(){this.removed=true;if(this.parentNode){const siblings=this.parentNode.children,index=siblings.indexOf(this);if(index>=0)siblings.splice(index,1);this.parentNode=null;}}
}
function environment({width=400,height=800,touch=true}={}){
 const doc=new Element();doc.head=new Element(doc);doc.body=new Element(doc);doc.body.style.overflow='auto';doc.createElement=()=>new Element(doc);doc.getElementById=()=>null;
 const win=new Element(doc);Object.assign(win,{innerWidth:width,innerHeight:height,coarse:touch,hoverNone:touch,navigator:{maxTouchPoints:touch?5:10,userAgent:touch?'Android Mobile':'Desktop Chrome',userAgentData:{mobile:touch}}});
 const timers=new Map();let timerId=0;win.setTimeout=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;};win.clearTimeout=id=>timers.delete(id);
 const queries=new Map();win.matchMedia=query=>{if(!queries.has(query)){const mql=new Element(doc);Object.defineProperty(mql,'matches',{get:()=>query.includes('orientation:')?win.innerWidth>win.innerHeight:query.includes('pointer:')?win.coarse:win.hoverNone});queries.set(query,mql);}return queries.get(query);};
 const orientation=new Element(doc);orientation.type=width>height?'landscape-primary':'portrait-primary';win.screen={orientation};doc.defaultView=win;
 const editor=new Element(doc),stage=new Element(doc),after=new Element(doc);doc.body.append(editor);editor.append(stage,after);
 const flushTimers=()=>{for(const [id,entry]of [...timers.entries()].sort((a,b)=>a[1].delay-b[1].delay)){if(!timers.has(id))continue;timers.delete(id);entry.fn();}};
 return {doc,win,stage,editor,after,timers,orientation,queries,flushTimers};
}
const at=(pointerId,clientX=52,clientY=52)=>({pointerId,clientX,clientY,button:0});

test('the compact joystick retains analog movement and stops on cancellation, lost capture, blur and exit',async()=>{
 const {doc,win,stage}=environment(),inputs=[],ui=mountVisitMobileControls({stage,onInput:value=>inputs.push(value)}),joystick=ui.joystick;ui.setActive(true);
 assert.equal(stage.children[0].children.length,1,'only one joystick control, no directional or orientation buttons');
 await joystick.emit('pointerdown',at(1));await joystick.emit('pointermove',at(1,52,35));const slow=inputs.at(-1);assert(slow.speed>0&&slow.speed<1);assert.equal(slow.forward,1);
 await joystick.emit('pointermove',at(1,52,18));assert(inputs.at(-1).speed>slow.speed);assert.equal(joystick.dataset.fast,'true');assert.equal(joystick.dataset.speed,'2.100');
 await joystick.emit('pointerdown',at(2,86,52));await joystick.emit('pointercancel',at(2));assert.equal(inputs.at(-1).forward,1,'second finger cannot steal or cancel the owner');
 await joystick.emit('pointercancel',at(1));assert.deepEqual(inputs.at(-1),zero);assert.equal(joystick.style['--lrf-stick-x'],'0px');assert.equal(joystick.style['--lrf-stick-y'],'0px');
 for(const stop of [()=>joystick.emit('pointerup',at(3)),()=>joystick.emit('lostpointercapture',at(3)),()=>win.emit('blur'),()=>{doc.hidden=true;return doc.emit('visibilitychange');},()=>ui.setActive(false)]){
  await joystick.emit('pointerdown',at(3,86,52));assert(inputs.at(-1).speed>0);await stop();assert.deepEqual(inputs.at(-1),zero);
 }
 ui.dispose();assert.equal(joystick.parentNode?.parentNode,null);assert.equal(doc.body.style.overflow,'auto');
});

test('holding the centre exits safely while moving or cancelling clears that hold',async()=>{
 const {stage,timers,flushTimers}=environment();let exits=0;const ui=mountVisitMobileControls({stage,onExitRequest:()=>exits++});ui.setActive(true);const joystick=ui.joystick;
 await joystick.emit('pointerdown',at(1));assert.equal(timers.size,1);await joystick.emit('pointerup',at(1));flushTimers();assert.equal(exits,0);
 await joystick.emit('pointerdown',at(2));await joystick.emit('pointermove',at(2,52,18));assert.equal(timers.size,0);flushTimers();assert.equal(exits,0);
 await joystick.emit('pointercancel',at(2));await joystick.emit('pointerdown',at(3));flushTimers();assert.equal(exits,1);ui.dispose();
});

test('phone rotation alone expands the viewport and restores its original parent in portrait',async()=>{
 const {doc,win,stage,editor,after,orientation}=environment(),ui=mountVisitMobileControls({stage});ui.setActive(true);assert.equal(ui.immersive,false);assert.equal(stage.parentNode,editor);
 win.innerWidth=1536;win.innerHeight=709;orientation.type='landscape-primary';await win.emit('orientationchange');
 assert.equal(ui.immersive,true);assert.equal(stage.parentNode,doc.body);assert.equal(stage.style['--lrf-visit-width'],'1536px');assert.equal(doc.body.style.overflow,'hidden');
 win.innerWidth=420;win.innerHeight=900;orientation.type='portrait-primary';await orientation.emit('change');
 assert.equal(ui.immersive,false);assert.equal(stage.parentNode,editor);assert.deepEqual(editor.children,[stage,after]);assert.equal(doc.body.style.overflow,'auto');ui.dispose();
});

test('Android screen.orientation uses the rotated layout viewport while visualViewport is stale',async()=>{
 const {doc,win,stage,orientation,flushTimers}=environment(),visual=new Element(doc);Object.assign(visual,{width:400,height:800,offsetLeft:0,offsetTop:0});win.visualViewport=visual;
 const ui=mountVisitMobileControls({stage});ui.setActive(true);
 win.innerWidth=900;win.innerHeight=420;orientation.type='landscape-primary';await orientation.emit('change');
 assert.equal(ui.immersive,true);assert.equal(stage.parentNode,doc.body);assert.equal(stage.style['--lrf-visit-width'],'900px');assert.equal(stage.style['--lrf-visit-height'],'420px','stale portrait visualViewport cannot leave a narrow canvas');
 visual.width=900;visual.height=390;flushTimers();assert.equal(stage.style['--lrf-visit-height'],'390px','settling reconciles browser bars without a second tap');ui.dispose();
});

test('delayed Android viewport dimensions are reconciled even without a later resize event',async()=>{
 const {win,stage,orientation,flushTimers}=environment(),ui=mountVisitMobileControls({stage});ui.setActive(true);
 orientation.type='landscape-primary';await orientation.emit('change');assert.equal(ui.immersive,false,'geometry is still portrait during the early screen event');
 win.innerWidth=900;win.innerHeight=420;flushTimers();assert.equal(stage.style['--lrf-visit-width'],'900px');assert.equal(stage.style['--lrf-visit-height'],'420px');ui.dispose();
});

test('orientation media queries work without the screen orientation API',async()=>{
 const {doc,win,stage,queries}=environment();delete win.screen.orientation;const ui=mountVisitMobileControls({stage});ui.setActive(true);
 win.innerWidth=950;win.innerHeight=430;await queries.get('(orientation: landscape)').emit('change');assert.equal(ui.immersive,true);assert.equal(stage.parentNode,doc.body);
 win.innerWidth=430;win.innerHeight=950;await queries.get('(orientation: landscape)').emit('change');assert.equal(ui.immersive,false);ui.dispose();
});

test('desktop touch hardware with fine mouse input retains the editor; native fullscreen back exits a phone visit',async()=>{
 const desktop=environment({width:1536,height:709,touch:false}),desktopUI=mountVisitMobileControls({stage:desktop.stage});desktopUI.setActive(true);assert.equal(desktopUI.immersive,false);assert.equal(desktop.stage.parentNode,desktop.editor);desktopUI.dispose();
 const {doc,stage,orientation,editor}=environment({width:900,height:420});let exits=0,locks=0;stage.requestFullscreen=async()=>{doc.fullscreenElement=stage;};orientation.lock=async()=>locks++;
 const ui=mountVisitMobileControls({stage,onExitRequest(){exits++;ui.setActive(false);}});ui.setActive(true);await Promise.resolve();await Promise.resolve();
 assert.equal(doc.fullscreenElement,stage);assert.equal(locks,0);doc.fullscreenElement=null;await doc.emit('fullscreenchange');assert.equal(exits,1);assert.equal(stage.parentNode,editor);ui.dispose();
});

test('only the validated RANDAL portal is expanded and repeated rotations leave no timers or listeners',async()=>{
 const {doc,win,stage,orientation,queries,timers}=environment({width:1536,height:709}),sent=[];win.location={href:'https://randal-catalogue-general-3d.vercel.app/atelier.html?entry=randal&standalone=1'};win.parent={postMessage:(...args)=>sent.push(args)};doc.referrer='https://studio-one-beta-test-v2.vercel.app/randal.html';
 const ui=mountVisitMobileControls({stage});ui.setActive(true);await win.emit('resize');await win.emit('resize');assert.deepEqual(sent,[[{type:'lrf-portal-presentation',open:true},'https://studio-one-beta-test-v2.vercel.app']]);
 win.innerWidth=400;win.innerHeight=800;orientation.type='portrait-primary';await orientation.emit('change');assert.equal(sent.at(-1)[0].open,false);
 win.innerWidth=900;win.innerHeight=420;orientation.type='landscape-primary';await orientation.emit('change');assert.equal(sent.at(-1)[0].open,true);assert(timers.size>0);
 ui.dispose();assert.equal(sent.at(-1)[0].open,false);assert.equal(timers.size,0);assert.equal(orientation.listeners.get('change').length,0);assert.equal(queries.get('(orientation: landscape)').listeners.get('change').length,0);
 const foreign=environment({width:900,height:420}),rejected=[];foreign.win.location=win.location;foreign.win.parent={postMessage:(...args)=>rejected.push(args)};foreign.doc.referrer='https://untrusted.example/';const foreignUI=mountVisitMobileControls({stage:foreign.stage});foreignUI.setActive(true);foreignUI.dispose();assert.deepEqual(rejected,[]);
});


test('consistent viewport and media geometry override stale screen.type in both rotation directions',async()=>{
 const {doc,win,stage,editor,orientation}=environment(),visual=new Element(doc);Object.assign(visual,{width:400,height:800,offsetLeft:0,offsetTop:0});win.visualViewport=visual;
 const ui=mountVisitMobileControls({stage});ui.setActive(true);assert.equal(ui.immersive,false);
 win.innerWidth=900;win.innerHeight=420;visual.width=900;visual.height=420;
 assert.equal(orientation.type,'portrait-primary','WebView still reports the previous screen type');await visual.emit('resize');
 assert.equal(ui.immersive,true);assert.equal(stage.parentNode,doc.body);assert.equal(stage.style['--lrf-visit-width'],'900px');
 orientation.type='landscape-primary';win.innerWidth=420;win.innerHeight=900;visual.width=420;visual.height=900;await visual.emit('resize');
 assert.equal(ui.immersive,false,'return to portrait cannot remain stuck behind a stale landscape screen.type');assert.equal(stage.parentNode,editor);assert.equal(doc.body.style.overflow,'auto');ui.dispose();
});

test('a portrait onscreen keyboard does not masquerade as phone rotation',()=>{
 const {doc,win,stage,orientation}=environment({width:400,height:250});orientation.type='portrait-primary';win.screen.width=400;win.screen.height=800;doc.activeElement={closest:()=>({tagName:'INPUT'})};
 const visual=new Element(doc);Object.assign(visual,{width:400,height:250});win.visualViewport=visual;
 const ui=mountVisitMobileControls({stage});ui.setActive(true);assert.equal(ui.immersive,false);ui.dispose();
});
