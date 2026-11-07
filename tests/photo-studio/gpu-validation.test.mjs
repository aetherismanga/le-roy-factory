import test from 'node:test';
import assert from 'node:assert/strict';
import {floorValidationPoints,validateFloorSamplePixels,getFloorWebGLStatus} from '../../assets/js/lrf-photo-studio/renderer-webgl.mjs';
import {renderFloor,DEFAULT_SETTINGS,illuminationField,sampleFloorReference} from '../../assets/js/lrf-photo-studio/renderer.mjs';
import {planeProjection} from '../../assets/js/lrf-photo-studio/geometry.mjs';

function image(width,height){const data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4;data[p]=(x*31+y*13)%256;data[p+1]=(x*11+y*29)%256;data[p+2]=(x*23+y*7)%256;data[p+3]=255;}return {width,height,data};}

test('GPU validation picks at most 128 unique spatial and mask-stratified samples',()=>{
 const width=180,height=240,data=new Uint8ClampedArray(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)data[y*width+x]=y<90?0:x<24?128:255;
 const mask={width,height,data},points=floorValidationPoints(mask);
 assert.ok(points.length>64&&points.length<=128);assert.equal(new Set(points).size,points.length);
 assert.ok([...points].every(i=>i>=0&&i<data.length));
 for(const alpha of [0,128,255])assert.ok([...points].some(i=>data[i]===alpha));
 assert.deepEqual(points,floorValidationPoints(mask));
 assert.deepEqual([...floorValidationPoints({width:1,height:1,data:new Uint8ClampedArray([255])})],[0]);
 assert.throws(()=>floorValidationPoints({width:0,height:0,data:[]}));
});

test('sample comparison tolerates four floor levels but rejects changed protected pixels and alpha',()=>{
 const original=image(4,1),mask={width:4,height:1,data:new Uint8ClampedArray([255,0,0,0])},points=Uint32Array.from([0,1,2,3]);
 original.data[11]=0;original.data[12]=100;original.data[13]=100;original.data[14]=100;original.data[15]=128;
 const run=pixels=>validateFloorSamplePixels({pixels,original,mask,points,sampleReference:(x,y)=>original.data.slice((y*4+x)*4,(y*4+x)*4+4)});
 const copy=()=>({...original,data:new Uint8ClampedArray(original.data)});
 let pixels=copy();pixels.data[0]+=4;assert.equal(run(pixels).passed,true);
 pixels=copy();pixels.data[0]+=5;assert.equal(run(pixels).passed,false);assert.equal(run(pixels).maxError,5);
 pixels=copy();pixels.data[4]+=1;assert.equal(run(pixels).passed,false);assert.equal(run(pixels).outsideMismatches,1);
 pixels=copy();pixels.data[8]=255;pixels.data[9]=0;assert.equal(run(pixels).passed,true,'hidden RGB in fully transparent source is irrelevant');
 pixels=copy();pixels.data[11]=1;assert.equal(run(pixels).passed,false);assert.equal(run(pixels).alphaMismatches,1);
 pixels=copy();pixels.data[12]=99;assert.equal(run(pixels).passed,true,'identical visible premultiplied colour is preserved');
 pixels=copy();pixels.data[12]=96;assert.equal(run(pixels).passed,false);
 const status=getFloorWebGLStatus();assert.ok(status.validation);assert.equal('pixels' in status.validation,false);
});

test('independent CPU reference samples match the optimized full renderer exactly',async()=>{
 const oldDocument=globalThis.document,oldImageData=globalThis.ImageData;
 globalThis.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};
 globalThis.document={createElement(){const canvas={width:0,height:0,dataset:{}};canvas.getContext=()=>({putImageData(value){canvas.pixels=value;}});return canvas;}};
 try{
  const original=image(47,65),mask={width:47,height:65,data:new Uint8ClampedArray(47*65)};
  for(let y=0;y<65;y++)for(let x=0;x<47;x++)mask.data[y*47+x]=y<20||x<3||x>43?0:(x+y)%7===0?128:255;
  const quad=[{x:.18,y:.34},{x:.82,y:.34},{x:.97,y:.94},{x:.03,y:.94}],faces=[image(7,11),image(9,13),image(11,15)];
  for(let n=0;n<6;n++){
   const product={photoStudioEligible:true,widthMm:600,heightMm:1200,textureRotation:[0,90,180,270][n%4]},cfg={...DEFAULT_SETTINGS,alignLongEdge:false,rotation:n%2?90:0,layout:n%3?'third':'straight',groutMm:[0,2,20][n%3],scale:[.35,1,2.8][n%3],groutColor:'#b5a781',lighting:n%2?.6:0,seed:-91+n};
   const light=cfg.lighting?illuminationField(original,mask,Math.min(96,Math.ceil(47/12)),Math.min(96,Math.ceil(65/12)),1):null;
   const context={original,mask,product,faces,homo:planeProjection(quad,cfg.planeWidthMm,cfg.planeHeightMm),cfg,grout:[181,167,129],light,lighting:cfg.lighting};
   const rendered=await renderFloor({photo:original,mask,quad,product,faces,settings:cfg,backend:'cpu'});
   for(let y=0;y<65;y++)for(let x=0;x<47;x++){
    const expected=sampleFloorReference(context,x,y),p=(y*47+x)*4;
    assert.deepEqual(rendered.pixels.data.slice(p,p+4),expected,`scenario ${n}, pixel ${x},${y}`);
   }
  }
 }finally{globalThis.document=oldDocument;globalThis.ImageData=oldImageData;}
});
