import test from 'node:test';
import assert from 'node:assert/strict';
import {planeProjection,projectPoint,solveHomography,validateQuad,tileAt} from '../../assets/js/lrf-photo-studio/geometry.mjs';
import {createMask,fillContour,brushStroke,resampleMask,MaskHistory} from '../../assets/js/lrf-photo-studio/mask.mjs';
import {fitSize,importPhoto} from '../../assets/js/lrf-photo-studio/import.mjs';
import {renderFloor} from '../../assets/js/lrf-photo-studio/renderer.mjs';

const quad=[{x:.25,y:.2},{x:.75,y:.2},{x:1,y:1},{x:0,y:1}];
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);

test('perspective maps four floor corners to physical millimetres and round-trips interior points',()=>{
 const plane=[{x:0,y:0},{x:3600,y:0},{x:3600,y:3000},{x:0,y:3000}],h=planeProjection(quad,3600,3000),back=solveHomography(plane,quad);
 for(let i=0;i<4;i++){const p=projectPoint(h,quad[i]);near(p.x,plane[i].x);near(p.y,plane[i].y);}
 for(const p of [{x:.5,y:.3},{x:.7,y:.8},{x:.15,y:.9}]){const q=projectPoint(back,projectPoint(h,p));near(q.x,p.x);near(q.y,p.y);}
});

test('invalid crossed, degenerate, non-finite and missing corners are rejected before projection',()=>{
 for(const q of [null,[null,null,null,null],[quad[0],quad[2],quad[1],quad[3]],Array(4).fill({x:0,y:0}),quad.map((p,i)=>i? p:{x:NaN,y:0})])assert.equal(validateQuad(q),false);
 assert.throws(()=>planeProjection([quad[0],quad[2],quad[1],quad[3]]));
 assert.throws(()=>planeProjection(quad,0,3000));
});

test('square and rectangular tile addressing uses real formats, millimetre grout and 90 degree rotation',()=>{
 const square={widthMm:600,heightMm:600},rectangle={widthMm:600,heightMm:1200};
 assert.equal(tileAt(599,100,square,{groutMm:2}).column,0);
 assert.equal(tileAt(601,100,square,{groutMm:2}).grout,true);
 assert.equal(tileAt(603,100,square,{groutMm:2}).column,1);
 assert.equal(tileAt(100,900,square,{groutMm:2}).row,1);
 assert.equal(tileAt(100,900,rectangle,{groutMm:2}).row,0);
 const turned=tileAt(100,900,rectangle,{rotation:90,groutMm:2});
 assert.equal(turned.column,1);assert.equal(turned.row,-1);
 const third=tileAt(500,1205,square,{layout:'third',groutMm:2});assert.equal(third.row,2);assert.equal(third.column,1);
});

test('contour, subtract brush, undo and redo preserve a protected foreground region at photo coordinates',()=>{
 const mask=createMask(100,80);fillContour(mask,[{x:0,y:20},{x:100,y:20},{x:100,y:80},{x:0,y:80}]);
 const history=new MaskHistory();history.push(mask);brushStroke(mask,{x:50,y:50},{x:50,y:60},10,'remove');
 assert.equal(mask.data[55*100+50],0);assert.equal(mask.data[75*100+5],255);assert.equal(mask.data[10*100+50],0);
 const corrected=new Uint8ClampedArray(mask.data);assert.equal(history.undo(mask),true);assert.equal(mask.data[55*100+50],255);
 assert.equal(history.redo(mask),true);assert.deepEqual(mask.data,corrected);
 const full=resampleMask(mask,300,240);assert.equal(full.data[166*300+151],0);assert.equal(full.data[226*300+16],255);
});

test('photo dimensions are bounded without enlarging low-resolution sources and invalid imports fail usefully',async()=>{
 assert.deepEqual(fitSize(4000,3000,2600),{width:2600,height:1950});
 assert.deepEqual(fitSize(600,800,2600),{width:600,height:800});
 await assert.rejects(importPhoto({size:100,type:'image/heic',name:'camera.HEIC'}),/HEIC/);
 await assert.rejects(importPhoto({size:100,type:'application/pdf'}),/Format non pris en charge/);
 await assert.rejects(importPhoto({size:50*1024*1024,type:'image/jpeg'}),/40 Mo/);
 const signal=AbortSignal.abort();await assert.rejects(importPhoto({size:100,type:'image/jpeg'},{signal}),{name:'AbortError'});
});

// These tests run the actual CPU renderer with an in-memory canvas surface.
// They check pixels/projection, not browser decoding, CORS or downloaded files.
function image(width,height,rgba=[11,22,33,255]){const data=new Uint8ClampedArray(width*height*4);for(let i=0;i<data.length;i+=4)data.set(rgba,i);return {width,height,data};}
const product={photoStudioEligible:true,widthMm:600,heightMm:1200},faces=[{...image(2,2,[200,100,50,255])},{...image(2,2,[50,150,200,255])}];
function installCanvas(){const oldDocument=globalThis.document,oldImageData=globalThis.ImageData;globalThis.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};globalThis.document={createElement:()=>{const canvas={width:0,height:0};canvas.getContext=()=>({putImageData:value=>{canvas.pixels=value;}});return canvas;}};return()=>{globalThis.document=oldDocument;globalThis.ImageData=oldImageData;};}

test('rendered foreground pixels remain byte-for-byte original while the confirmed floor changes',async()=>{
 const restore=installCanvas();try{const photo=image(33,33),mask=createMask(33,33,new Uint8ClampedArray(33*33).fill(255));mask.data[25*33+16]=0;
 const result=await renderFloor({photo,mask,product,faces,quad,settings:{lighting:0}});
 assert.deepEqual([...result.pixels.data.slice((25*33+16)*4,(25*33+17)*4)],[11,22,33,255]);
 assert.notDeepEqual([...result.pixels.data.slice((26*33+16)*4,(26*33+17)*4)],[11,22,33,255]);
 }finally{restore();}
});

test('preview and larger export choose identical faces and protected zones at matching photo positions',async()=>{
 const restore=installCanvas();try{const mask=createMask(33,33,new Uint8ClampedArray(33*33).fill(255));brushStroke(mask,{x:15,y:20},{x:20,y:23},3,'remove');
 const options={mask,product,faces,quad,settings:{lighting:0,groutMm:0,layout:'third',rotation:90,seed:27}};
 const preview=await renderFloor({...options,photo:image(33,33)}),exported=await renderFloor({...options,photo:image(99,99)});
 for(let y=0;y<33;y++)for(let x=0;x<33;x++){const p=(y*33+x)*4,e=((y*3+1)*99+x*3+1)*4;assert.deepEqual(exported.pixels.data.slice(e,e+4),preview.pixels.data.slice(p,p+4),`${x},${y}`);}
 }finally{restore();}
});

test('render cancellation stops before producing a replacement image',async()=>{
 const restore=installCanvas();try{const controller=new AbortController(),photo=image(65,65),mask=createMask(65,65,new Uint8ClampedArray(65*65).fill(255));
 await assert.rejects(renderFloor({photo,mask,product,faces,quad,settings:{lighting:0},signal:controller.signal,onProgress:()=>controller.abort()}),{name:'AbortError'});
 }finally{restore();}
});
