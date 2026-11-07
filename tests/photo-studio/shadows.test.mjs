import test from 'node:test';
import assert from 'node:assert/strict';
import {renderFloor,DEFAULT_SETTINGS,illuminationField} from '../../assets/js/lrf-photo-studio/renderer.mjs';

function image(w,h,colourAt){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4,value=colourAt(x,y);data[p]=data[p+1]=data[p+2]=value;data[p+3]=255;}return {width:w,height:h,data};}
function mockCanvas(){const oldDocument=globalThis.document,oldImageData=globalThis.ImageData;globalThis.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};globalThis.document={createElement(){const canvas={width:0,height:0,dataset:{}};canvas.getContext=()=>({putImageData(value){canvas.pixels=value;}});return canvas;}};return()=>{globalThis.document=oldDocument;globalThis.ImageData=oldImageData;};}
const quad=[{x:.18,y:.34},{x:.82,y:.34},{x:.97,y:.94},{x:.03,y:.94}],product={photoStudioEligible:true,widthMm:600,heightMm:1200},faces=[image(2,2,()=>200)];

test('export retains the normalized shadow scale of the working-mask preview',async()=>{
 const restore=mockCanvas();try{
  const mask={width:120,height:120,data:new Uint8ClampedArray(120*120).fill(255)};
  const preview=await renderFloor({photo:image(120,120,x=>x<48?40:140),mask,quad,product,faces,settings:{groutMm:0},backend:'cpu'});
  const exported=await renderFloor({photo:image(360,360,x=>x<144?40:140),mask,quad,product,faces,settings:{groutMm:0},backend:'cpu'});
  for(const x of [24,36,48,60,84])assert.ok(Math.abs(preview.pixels.data[(72*120+x)*4]-exported.pixels.data[(216*360+x*3)*4])<=2,'export must not change the shadow blur footprint');
 }finally{restore();}
});

test('default lighting preserves a broad floor shadow instead of whitening it',async()=>{
 const restore=mockCanvas();try{
  assert.equal(DEFAULT_SETTINGS.lighting,.85);
  const photo=image(120,120,x=>x<40?40:140),mask={width:120,height:120,data:new Uint8ClampedArray(120*120).fill(255)};
  const rendered=await renderFloor({photo,mask,quad,product,faces,settings:{groutMm:0},backend:'cpu'}),shadow=rendered.pixels.data[(65*120+15)*4],lit=rendered.pixels.data[(65*120+90)*4];
  assert.ok(shadow/lit<.5,`shadow/lit=${shadow}/${lit}`);assert.ok(shadow>0&&shadow<105);assert.ok(lit>=190);
 }finally{restore();}
});

test('the finer illumination field still removes the original pixel-scale floor pattern',async()=>{
 const restore=mockCanvas();try{
  const photo=image(120,120,(x,y)=>(x+y)%2?220:20),mask={width:120,height:120,data:new Uint8ClampedArray(120*120).fill(255)};
  const rendered=await renderFloor({photo,mask,quad,product,faces,settings:{groutMm:0},backend:'cpu'});
  for(let y=24;y<96;y++)for(let x=24;x<95;x++)assert.ok(Math.abs(rendered.pixels.data[(y*120+x)*4]-rendered.pixels.data[(y*120+x+1)*4])<=1,'old checker pattern must not leak through');
 }finally{restore();}
});

test('illuminationField retains its three-pass default while allowing a sharper one-pass field',()=>{
 const photo=image(120,120,x=>x<40?40:140),mask={width:120,height:120,data:new Uint8ClampedArray(120*120).fill(255)};
 assert.deepEqual(illuminationField(photo,mask,10,10),illuminationField(photo,mask,10,10,3));
 const sharp=illuminationField(photo,mask,10,10,1),soft=illuminationField(photo,mask,10,10,3);
 assert.ok(sharp.grid[2]<soft.grid[2],'one pass retains the local shadow contrast');
});

test('empty object cells do not whiten a narrow shadowed floor band',async()=>{
 const restore=mockCanvas();try{
  const photo=image(120,120,(x,y)=>x>=63&&x<69&&y>=36&&y<72?20:140),mask={width:120,height:120,data:new Uint8ClampedArray(120*120)};
  // A six-pixel strip of visible shadowed floor between protected objects;
  // distant, brightly lit floor establishes the room median independently.
  for(let y=36;y<72;y++)for(let x=63;x<69;x++)mask.data[y*120+x]=255;
  for(let y=96;y<120;y++)for(let x=0;x<120;x++)mask.data[y*120+x]=255;
  const onePass=illuminationField(photo,mask,10,10,1),twoPass=illuminationField(photo,mask,10,10,2);
  assert.equal(onePass.median,140);assert.equal(onePass.grid[4*10+5],20,'known shadow must be averaged only with supported cells');
  assert.equal(onePass.grid[4*10+3],140,'median is allowed where no neighbour has support yet');
  assert.equal(twoPass.grid[4*10+3],20,'support must propagate so later passes interpolate from the shadow');
  const rendered=await renderFloor({photo,mask,quad,product,faces,settings:{groutMm:0},backend:'cpu'}),shadow=rendered.pixels.data[(52*120+65)*4],lit=rendered.pixels.data[(112*120+90)*4];
  assert.ok(shadow<70,`contact shadow was whitened to ${shadow}`);assert.ok(lit>=190);assert.ok(shadow/lit<.36);
  assert.equal(rendered.pixels.data[(52*120+61)*4],photo.data[(52*120+61)*4],'protected object pixels remain original');
 }finally{restore();}
});
