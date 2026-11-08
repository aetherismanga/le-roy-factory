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

test('landscape enters fullscreen before locking orientation',async()=>{
 const events=[],doc={fullscreenElement:null},stage={async requestFullscreen(){events.push('fullscreen');doc.fullscreenElement=stage;}};
 const result=await requestVisitLandscape({stage,document:doc,screen:{orientation:{async lock(value){events.push(value);}}}});
 assert.deepEqual(events,['fullscreen','landscape']);assert.deepEqual(result,{fullscreen:true,locked:true});
});

test('unsupported orientation and fullscreen leave normal device rotation available',async()=>{
 let called=false;
 const result=await requestVisitLandscape({stage:{async requestFullscreen(){throw Error('unsupported');}},document:{},screen:{orientation:{async lock(){called=true;}}}});
 assert.deepEqual(result,{fullscreen:false,locked:false});assert.equal(called,false);
 const stage={},doc={fullscreenElement:stage};
 assert.deepEqual(await requestVisitLandscape({stage,document:doc,screen:{orientation:{async lock(){throw Error('denied');}}}}),{fullscreen:true,locked:false});
});

class Element{
 constructor(doc){this.ownerDocument=doc;this.children=[];this.listeners=new Map();this.attrs={};this.dataset={};this.style={};this.classList={add:()=>{},remove:()=>{}};}
 append(...children){this.children.push(...children);}
 setAttribute(name,value){this.attrs[name]=value;}
 addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(handler);}
 removeEventListener(name,handler){this.listeners.set(name,(this.listeners.get(name)||[]).filter(value=>value!==handler));}
 async emit(type,values={}){const event={type,preventDefault(){},stopPropagation(){},...values};for(const handler of this.listeners.get(type)||[])await handler(event);}
 dispatchEvent(event){for(const handler of this.listeners.get(event.type)||[])handler(event);}
 setPointerCapture(){}
 remove(){this.removed=true;}
}
function environment(){
 const doc=new Element();doc.head=new Element(doc);doc.body=new Element(doc);doc.body.style.overflow='auto';doc.createElement=()=>new Element(doc);doc.getElementById=()=>null;
 const win=new Element(doc);win.innerWidth=400;win.innerHeight=800;win.setTimeout=()=>1;win.screen={};doc.defaultView=win;
 return {doc,win,stage:new Element(doc)};
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

test('mobile landscape fallback expands and restores the same visit stage',async()=>{
 const {doc,stage}=environment(),ui=mountVisitMobileControls({stage});ui.setActive(true);
 const landscape=stage.children[0].children[1];await landscape.emit('click');
 assert.equal(landscape.attrs['aria-pressed'],'true');assert.equal(doc.body.style.overflow,'hidden');
 await landscape.emit('click');assert.equal(landscape.attrs['aria-pressed'],'false');assert.equal(doc.body.style.overflow,'auto');ui.dispose();
});
