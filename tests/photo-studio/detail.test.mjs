import test from 'node:test';
import assert from 'node:assert/strict';
import {detailPrompts,chooseDetailMask,subtractObject,chooseObjectMask} from '../../assets/js/lrf-photo-studio/segmentation-detail.mjs';

function rectangle(mask,width,x0,y0,x1,y1,value=255){
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)mask[y*width+x]=value;
  return mask;
}
function logits(mask){return Float32Array.from(mask,value=>value>127?4:-4);}
function floorFixture(){
  const width=40,height=40,coarse=rectangle(new Uint8ClampedArray(width*height),width,2,12,38,38);
  return {width,height,coarse,points:[[8,18],[30,32],[8,10],[30,10]],labels:[1,1,0,0]};
}

test('automatic prompts stay inside substantial floor regions and cover separate object holes',()=>{
  const width=80,height=80,mask=rectangle(new Uint8ClampedArray(width*height),width,4,20,76,76);
  rectangle(mask,width,39,4,40,20); // A thin false-positive protrusion is unsafe to seed.
  rectangle(mask,width,14,29,31,48,0); // Chair hole.
  rectangle(mask,width,42,49,68,69,0); // Rug hole.
  const original=new Uint8ClampedArray(mask);
  const result=detailPrompts(mask,width,height,{positiveCount:5,negativeCount:16});
  const positives=result.points.filter((_,i)=>result.labels[i]===1);
  const negatives=result.points.filter((_,i)=>result.labels[i]===0);
  assert.equal(positives.length,5);
  for(const [x,y] of positives){
    assert.ok(y>=20,'thin furniture-boundary protrusions must not receive positive prompts');
    for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]])assert.equal(mask[(y+dy)*width+x+dx],255);
  }
  for(let i=0;i<positives.length;i++)for(let j=i+1;j<positives.length;j++){
    assert.ok(Math.hypot(positives[i][0]-positives[j][0],positives[i][1]-positives[j][1])>=width*.08);
  }
  for(const [x,y] of negatives)assert.equal(mask[y*width+x],0);
  assert.ok(negatives.some(([x,y])=>x>14&&x<30&&y>29&&y<47),'chair needs a negative prompt');
  assert.ok(negatives.some(([x,y])=>x>42&&x<67&&y>49&&y<68),'rug needs its own negative prompt');
  assert.deepEqual(mask,original);
});

test('an empty semantic proposal produces no invented prompts or floor mask',()=>{
  const coarse=new Uint8ClampedArray(1600);
  const prompts=detailPrompts(coarse,40,40);
  assert.deepEqual(prompts,{points:[],labels:[],bounds:null});
  const result=chooseDetailMask({width:40,height:40,coarse,count:1,data:new Float32Array(1600).fill(8),points:[],labels:[],scores:[.99]});
  assert.equal(result.accepted,false);
  assert.equal(result.reason,'no-semantic-floor');
  assert.equal(result.mask.some(Boolean),false);
  assert.notEqual(result.mask,coarse);
  assert.throws(()=>detailPrompts(coarse,39,40),/dimensions/);
});

test('a higher SAM score cannot override a missing positive floor prompt',()=>{
  const fixture=floorFixture(),size=fixture.width*fixture.height;
  const contradictory=logits(fixture.coarse),consistent=logits(fixture.coarse);
  contradictory[18*fixture.width+8]=-4;
  const data=new Float32Array(size*2);data.set(contradictory);data.set(consistent,size);
  const before=new Float32Array(data),coarseBefore=new Uint8ClampedArray(fixture.coarse);
  const pointsBefore=structuredClone(fixture.points),labelsBefore=[...fixture.labels],scores=[.999,.55];
  const result=chooseDetailMask({...fixture,data,count:2,scores});
  assert.equal(result.accepted,true);
  assert.equal(result.candidate,1);
  assert.deepEqual(result.mask,fixture.coarse);
  assert.deepEqual(data,before);
  assert.deepEqual(fixture.coarse,coarseBefore);
  assert.deepEqual(fixture.points,pointsBefore);
  assert.deepEqual(fixture.labels,labelsBefore);
  assert.deepEqual(scores,[.999,.55]);
});

test('contradictory background prompts reject an otherwise almost identical candidate',()=>{
  const fixture=floorFixture(),data=logits(fixture.coarse);
  for(const [x,y] of fixture.points.slice(2))data[y*fixture.width+x]=4;
  const result=chooseDetailMask({...fixture,data,count:1,scores:[1]});
  assert.equal(result.accepted,false);
  assert.equal(result.reason,'detail-disagrees-with-floor');
  assert.deepEqual(result.mask,fixture.coarse);
  result.mask.fill(0);
  assert.ok(fixture.coarse.some(Boolean),'a rejected result must not alias the editable semantic mask');
});

test('a broad hallucinated region and a small object cannot replace the semantic floor',()=>{
  const fixture=floorFixture(),size=fixture.width*fixture.height;
  const smallObject=new Uint8ClampedArray(size);
  rectangle(smallObject,fixture.width,5,15,13,23);
  const distantFloor=new Uint8ClampedArray(size);
  rectangle(distantFloor,fixture.width,4,25,16,34);
  for(const candidate of [smallObject,distantFloor]){
    const result=chooseDetailMask({...fixture,data:logits(candidate),count:1,scores:[.999]});
    assert.equal(result.accepted,false);
    assert.deepEqual(result.mask,fixture.coarse);
  }
  const narrowFloor=rectangle(new Uint8ClampedArray(size),fixture.width,8,20,32,30);
  const tooBroad=new Float32Array(size).fill(5);
  const result=chooseDetailMask({width:fixture.width,height:fixture.height,coarse:narrowFloor,points:[[15,25]],labels:[1],data:tooBroad,count:1,scores:[1]});
  assert.equal(result.accepted,false);
  assert.deepEqual(result.mask,narrowFloor);
});

test('protected rugs stay excluded even when an accepted candidate predicts them as floor',()=>{
  const fixture=floorFixture(),protectedMask=new Uint8Array(fixture.coarse.length);
  rectangle(protectedMask,fixture.width,14,22,26,30,1);
  const coarse=new Uint8ClampedArray(fixture.coarse);
  rectangle(coarse,fixture.width,14,22,26,30,0);
  const originalProtection=new Uint8Array(protectedMask);
  const result=chooseDetailMask({...fixture,coarse,protectedMask,data:logits(fixture.coarse),count:1,scores:[.95]});
  assert.equal(result.accepted,true);
  assert.equal(result.mask[25*fixture.width+20],0);
  assert.equal(result.mask[18*fixture.width+8],255);
  for(let i=0;i<result.mask.length;i++)if(protectedMask[i])assert.equal(result.mask[i],0);
  assert.deepEqual(protectedMask,originalProtection);
  assert.deepEqual(result.mask,coarse);
});

test('non-finite mask logits cannot introduce pixels and malformed outputs are rejected',()=>{
  const fixture=floorFixture(),data=logits(fixture.coarse);
  data[20*fixture.width+20]=NaN;
  data[10*fixture.width+20]=Infinity;
  const result=chooseDetailMask({...fixture,data,count:1,scores:[.9]});
  assert.equal(result.accepted,true);
  assert.equal(result.mask[20*fixture.width+20],0);
  assert.equal(result.mask[10*fixture.width+20],0);
  assert.throws(()=>chooseDetailMask({...fixture,data,count:5}),/Invalid detail-mask output/);
  assert.throws(()=>chooseDetailMask({...fixture,data:data.subarray(1),count:1}),/Invalid detail-mask output/);
});

test('object subtraction preserves every pixel outside the object and never mutates inputs',()=>{
  const mask=Uint8ClampedArray.from([0,64,128,255,220,10]);
  const object=Uint8ClampedArray.from([255,0,128,127,1,255]);
  const result=subtractObject(mask,object);
  assert.deepEqual([...result],[0,64,0,255,220,0]);
  for(let i=0;i<mask.length;i++)if(object[i]<=127)assert.equal(result[i],mask[i]);
  assert.deepEqual([...mask],[0,64,128,255,220,10]);
  assert.deepEqual([...object],[255,0,128,127,1,255]);
  assert.notEqual(result.buffer,mask.buffer);
  assert.notEqual(result.buffer,object.buffer);
  assert.deepEqual(subtractObject(mask,new Uint8ClampedArray(mask.length)),mask);
  assert.throws(()=>subtractObject(mask,new Uint8ClampedArray(2)),/dimensions/);
});

test('object selection accepts the actual object containing the prompt rather than an unrelated higher score',()=>{
  const width=40,height=40,size=width*height;
  const unrelated=rectangle(new Uint8ClampedArray(size),width,2,2,10,10);
  const object=rectangle(new Uint8ClampedArray(size),width,14,14,21,24);
  const data=new Float32Array(size*2);data.set(logits(unrelated));data.set(logits(object),size);
  const original=new Float32Array(data);
  const result=chooseObjectMask({width,height,data,count:2,scores:[.99,.85],point:[17,19]});
  assert.equal(result.candidate,1);
  assert.equal(result.quality,.85);
  assert.equal(result.mask[19*width+17],255);
  assert.deepEqual(result.mask,object);
  assert.deepEqual(data,original);
});

test('a high-scoring whole-scene prediction cannot become a protected object',()=>{
  const width=40,height=40,data=new Float32Array(width*height).fill(5);
  assert.equal(chooseObjectMask({width,height,data,count:1,scores:[.9],point:[18,20]}),null);
});

test('automatic object bounds reject excessive spread and confidence below the protection gate',()=>{
  const width=40,height=40,size=width*height,bounds={minX:14,minY:14,maxX:20,maxY:23},point=[17,19];
  const object=rectangle(new Uint8ClampedArray(size),width,14,14,21,24);
  const base={width,height,count:1,point,bounds,data:logits(object)};
  assert.equal(chooseObjectMask({...base,scores:[.749]}),null);
  assert.ok(chooseObjectMask({...base,scores:[.75]}));
  const overgrown=rectangle(new Uint8ClampedArray(size),width,0,10,30,30);
  assert.equal(chooseObjectMask({...base,data:logits(overgrown),scores:[.99]}),null);
});

test('non-finite object points or mask values cannot create a protection mask',()=>{
  const width=40,height=40,size=width*height,point=[17,19];
  const object=rectangle(new Uint8ClampedArray(size),width,14,14,21,24);
  const base={width,height,data:logits(object),count:1,scores:[.9],point};
  for(const invalid of [NaN,Infinity,-Infinity]){
    assert.throws(()=>chooseObjectMask({...base,point:[invalid,19]}),/Invalid object prediction/);
    assert.equal(chooseObjectMask({...base,data:new Float32Array(size).fill(invalid)}),null);
    const invalidAtPrompt=logits(object);invalidAtPrompt[19*width+17]=invalid;
    assert.ok(chooseObjectMask({...base,data:invalidAtPrompt})===null,'a non-finite prompt pixel must reject the candidate');
  }
});
