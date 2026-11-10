import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clampPage,swipeStep,fitPageScale,pixelRatio,createBoundedCache} from '../assets/js/neobath-reader-model.mjs';

const approximately=(actual,expected)=>assert(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('page navigation follows the actual document count, including 79 and 81 page editions',()=>{
 for(const total of [79,81]){
  assert.equal(clampPage(1,total),1);
  assert.equal(clampPage(total,total),total);
  assert.equal(clampPage(total+1,total),total);
  assert.equal(clampPage('999',total),total);
  assert.equal(clampPage(-5,total),1);
  assert.equal(clampPage('not-a-page',total),1);
  assert.equal(clampPage(NaN,total),1);
  assert.equal(clampPage(Infinity,total),1);
  assert(Number.isInteger(clampPage(14.6,total)));
 }
 assert.equal(clampPage(20,0),1);
});

test('horizontal swipes navigate once while vertical scrolling, short gestures and pinch zoom do not',()=>{
 const swipe=overrides=>swipeStep({startX:180,startY:200,endX:70,endY:210,...overrides});
 assert.equal(swipe(),1);
 assert.equal(swipe({endX:300}),-1);
 assert.equal(swipe({startX:0,endX:110,endY:200}),-1,'touches beginning at the left edge remain valid');
 assert.equal(swipe({endX:150}),0);
 assert.equal(swipe({endX:140,endY:400}),0);
 assert.equal(swipe({endX:120,endY:330}),0);
 assert.equal(swipe({zoom:1.5}),0);
 assert.equal(swipe({multiTouch:true}),0);
});

test('fit mode contains a portrait page in the smartphone reading area and zoom scales that fit',()=>{
 const input={pageWidth:595,pageHeight:842,frameWidth:360,frameHeight:510};
 const scale=fitPageScale(input);
 assert(scale>0&&scale<=1);
 assert(input.pageWidth*scale<=input.frameWidth-24+1e-9);
 assert(input.pageHeight*scale<=input.frameHeight-24+1e-9);
 approximately(fitPageScale({...input,zoom:2}),scale*2);
 const desktop={pageWidth:595,pageHeight:842,frameWidth:1600,frameHeight:1200};
 assert(fitPageScale(desktop)<=1,'fit mode does not upscale the original page');
 const landscape={pageWidth:842,pageHeight:595,frameWidth:360,frameHeight:510};
 const landscapeScale=fitPageScale(landscape);
 assert(landscape.pageWidth*landscapeScale<=landscape.frameWidth-24+1e-9);
 assert(landscape.pageHeight*landscapeScale<=landscape.frameHeight-24+1e-9);
});

test('render resolution is bounded for high-DPI phones and large zoom canvases',()=>{
 for(const input of [
  {width:360,height:510,dpr:3},
  {width:3000,height:4200,dpr:3},
  {width:100000,height:150000,dpr:2},
  {width:1000000,height:1500000,dpr:2},
  {width:100,height:150,dpr:1},
  {width:2200,height:3200,dpr:2,maxPixels:1000000}
 ]){
  const ratio=pixelRatio(input),limit=input.maxPixels||3000000;
  assert(Number.isFinite(ratio)&&ratio>0);
  assert(ratio<=Math.min(input.dpr,2));
  assert(input.width*input.height*ratio*ratio<=limit+1e-6,JSON.stringify(input));
 }
});

test('page cache promotes recently used entries and releases each evicted canvas',()=>{
 const released=[],cache=createBoundedCache(3,value=>released.push(value));
 cache.set('one',{page:1});cache.set('two',{page:2});cache.set('three',{page:3});
 assert.equal(cache.size,3);
 assert.equal(cache.get('one').page,1);
 cache.set('four',{page:4});
 assert.equal(cache.get('two'),undefined);
 assert.deepEqual(released.map(v=>v.page),[2]);
 assert.equal(cache.get('one').page,1);
 assert.equal(cache.size,3);
 cache.clear();
 assert.equal(cache.size,0);
 assert.deepEqual(released.map(v=>v.page).sort(),[1,2,3,4]);
 cache.clear();assert.equal(released.length,4,'clearing an empty cache never releases twice');
});

test('long page browsing never grows the canvas cache beyond its configured limit',()=>{
 let releases=0;
 const cache=createBoundedCache(3,()=>releases++);
 for(let page=1;page<=81;page++){
  cache.set(page,{page});
  assert(cache.size<=3);
 }
 assert.equal(cache.size,3);assert.equal(releases,78);
 assert.equal(cache.get(79).page,79);assert.equal(cache.get(1),undefined);
 cache.clear();assert.equal(releases,81);
});

test('cache replacement releases the old bitmap but does not release an unchanged one',()=>{
 const released=[],cache=createBoundedCache(1,value=>released.push(value));
 const first={page:1,resolution:1},sharper={page:1,resolution:2};
 cache.set('page-one',first);cache.set('page-one',first);
 assert.equal(released.length,0);
 cache.set('page-one',sharper);
 assert.deepEqual(released,[first]);assert.equal(cache.get('page-one'),sharper);
 cache.clear();assert.deepEqual(released,[first,sharper]);
});
