import test from 'node:test';
import assert from 'node:assert/strict';
const capture=new Map();
const oldAdd=globalThis.addEventListener;
globalThis.addEventListener=(name,listener)=>capture.set(name,listener);
const {bindGallerySwipe}=await import('../assets/js/gallery-swipe.mjs');
if(oldAdd)globalThis.addEventListener=oldAdd;else delete globalThis.addEventListener;

class Surface {
  dataset={};listeners=new Map();
  addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(fn);}
  removeEventListener(name,fn){this.listeners.set(name,(this.listeners.get(name)||[]).filter(item=>item!==fn));}
  contains(node){return node===this||node?.surface===this;}
  fire(name,fields={}){const e={target:this,touches:[],changedTouches:[],cancelable:true,detail:1,preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){this.stopped=true},...fields};if(name==='touchstart')capture.get(name)?.(e);for(const fn of this.listeners.get(name)||[])fn(e);return e;}
}
const point=(x,y=20,id=1)=>({clientX:x,clientY:y,identifier:id});
function swipe(surface,from,to,{middle,fields}={}){
  surface.fire('touchstart',{touches:[point(...from)],...fields});
  const move=surface.fire('touchmove',{touches:[point(...(middle||to))],...fields});
  const end=surface.fire('touchend',{changedTouches:[point(...to)],...fields});
  return {move,end};
}

test('left and right swipes advance once and preserve vertical scrolling',()=>{
  const surface=new Surface(),moves=[];bindGallerySwipe(surface,{onSwipe:delta=>moves.push(delta)});
  assert.equal(swipe(surface,[150,20],[35,25]).move.defaultPrevented,true);
  swipe(surface,[35,20],[150,25]);
  const vertical=swipe(surface,[100,20],[110,150]);
  assert.equal(vertical.move.defaultPrevented,undefined);assert.deepEqual(moves,[1,-1]);
  swipe(surface,[100,20],[80,20]);assert.deepEqual(moves,[1,-1]);
});
test('vertical scroll cannot become a photo change partway through the same gesture',()=>{
  const surface=new Surface(),moves=[];bindGallerySwipe(surface,{onSwipe:delta=>moves.push(delta)});
  swipe(surface,[100,20],[10,25],{middle:[101,75]});assert.deepEqual(moves,[]);
});
test('pinch, remaining finger, touchcancel and changed touch identities never navigate',()=>{
  const surface=new Surface(),moves=[];bindGallerySwipe(surface,{onSwipe:delta=>moves.push(delta)});
  surface.fire('touchstart',{touches:[point(150),point(70,50,2)]});
  surface.fire('touchend',{touches:[point(70,50,2)],changedTouches:[point(10)]});
  surface.fire('touchend',{changedTouches:[point(0,50,2)]});
  surface.fire('touchstart',{touches:[point(150)]});surface.fire('touchmove',{touches:[point(100),point(60,50,2)]});surface.fire('touchend',{changedTouches:[point(10)]});
  surface.fire('touchstart',{touches:[point(150)]});surface.fire('touchcancel');surface.fire('touchend',{changedTouches:[point(10)]});
  surface.fire('touchstart',{touches:[point(150)]});surface.fire('touchend',{changedTouches:[point(10,20,2)]});
  assert.deepEqual(moves,[]);
});
test('zoom state and a single-photo guard leave dragging and pinch unblocked',()=>{
  const surface=new Surface(),moves=[];let enabled=false;
  bindGallerySwipe(surface,{onSwipe:delta=>moves.push(delta),isEnabled:()=>enabled});
  assert.equal(swipe(surface,[150,20],[20,20]).move.defaultPrevented,undefined);
  enabled=true;surface.fire('touchstart',{touches:[point(150)]});enabled=false;
  surface.fire('touchend',{changedTouches:[point(10)]});assert.deepEqual(moves,[]);
});
test('a swipe cannot open the photo through an element or a document capture click',()=>{
  const surface=new Surface();bindGallerySwipe(surface,{onSwipe(){}});
  swipe(surface,[150,20],[20,20]);
  const event={target:surface,clientX:20,clientY:20,detail:1,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};
  capture.get('click')(event);assert.equal(event.prevented,true);assert.equal(event.stopped,true);
  swipe(surface,[150,20],[20,20]);assert.equal(surface.fire('click').stopped,true);
  // A deliberate second tap is a new gesture and remains a normal click.
  surface.fire('touchstart',{touches:[point(20)]});surface.fire('touchend',{changedTouches:[point(20)]});
  assert.equal(surface.fire('click').stopped,undefined);
});
test('controls stay clickable and re-binding never doubles the photo movement',()=>{
  const surface=new Surface(),moves=[];
  bindGallerySwipe(surface,{onSwipe:()=>moves.push('old')});
  const dispose=bindGallerySwipe(surface,{onSwipe:delta=>moves.push(delta)});
  const control={surface,querySelector:()=>null};const target={surface,closest:selector=>selector.startsWith('button')?control:null};
  swipe(surface,[150,20],[20,20],{fields:{target}});assert.deepEqual(moves,[]);
  swipe(surface,[150,20],[20,20]);assert.deepEqual(moves,[1]);
  dispose();swipe(surface,[150,20],[20,20]);assert.deepEqual(moves,[1]);assert.equal(surface.dataset.lrfPhotoSwipe,undefined);
});
test('a photo inside an enlargement button remains swipeable',()=>{
  const surface=new Surface(),moves=[];bindGallerySwipe(surface,{onSwipe:delta=>moves.push(delta)});
  const photoButton={surface,querySelector:()=>({})};const target={surface,closest:selector=>selector.startsWith('button')?photoButton:null};
  swipe(surface,[150,20],[20,20],{fields:{target}});assert.deepEqual(moves,[1]);
});
test('native browser zoom disables image navigation until the viewport is restored',()=>{
  const surface=new Surface(),moves=[];bindGallerySwipe(surface,{onSwipe:delta=>moves.push(delta)});
  globalThis.visualViewport={scale:2};swipe(surface,[150,20],[20,20]);assert.deepEqual(moves,[]);
  globalThis.visualViewport={scale:1};swipe(surface,[150,20],[20,20]);assert.deepEqual(moves,[1]);delete globalThis.visualViewport;
});
