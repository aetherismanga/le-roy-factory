import test from 'node:test';
import assert from 'node:assert/strict';
import {validateQuad,solveHomography,projectPoint,planeProjection,tileAt,deterministicFace,defaultQuad} from '../assets/js/lrf-photo-studio/geometry.mjs';
import {createMask,brushStroke,fillContour,resampleMask,maskCoverage,MaskHistory} from '../assets/js/lrf-photo-studio/mask.mjs';
import {fitSize,importPhoto} from '../assets/js/lrf-photo-studio/import.mjs';
import {illuminationField,renderFloor} from '../assets/js/lrf-photo-studio/renderer.mjs';
const quad=[{x:.30,y:.40},{x:.70,y:.40},{x:1,y:1},{x:0,y:1}];
test('homography maps all four perspective points to calibrated millimetres',()=>{
  const h=planeProjection(quad,2400,1800),expected=[{x:0,y:0},{x:2400,y:0},{x:2400,y:1800},{x:0,y:1800}];
  quad.forEach((p,i)=>{const q=projectPoint(h,p);assert.ok(Math.abs(q.x-expected[i].x)<1e-6);assert.ok(Math.abs(q.y-expected[i].y)<1e-6);});
  const inverse=solveHomography(expected,quad),mid=projectPoint(inverse,{x:1200,y:900});assert.ok(mid.y>.4&&mid.y<1);assert.ok(Math.abs(mid.x-.5)<1e-6);
});
test('crossed, concave, reversed and collapsed projection quads are rejected',()=>{
  assert.equal(validateQuad(quad),true);
  for(const q of [[quad[0],quad[2],quad[1],quad[3]],[quad[0],quad[1],{x:.5,y:.5},quad[3]],quad.toReversed(),Array(4).fill({x:.5,y:.5})])assert.equal(validateQuad(q),false);
  assert.throws(()=>planeProjection(Array(4).fill({x:0,y:0})),/quatre points/);
});
test('square and rectangle retain true independent axes and physical pitch',()=>{
  const s={groutMm:2,scale:1,layout:'straight'},square={widthMm:600,heightMm:600},rectangle={widthMm:600,heightMm:1200};
  assert.equal(tileAt(610,610,square,s).row,1);assert.equal(tileAt(610,610,rectangle,s).row,0);
  assert.equal(tileAt(610,610,square,s).column,1);assert.equal(tileAt(610,610,rectangle,s).column,1);
  assert.equal(tileAt(601,300,square,s).grout,true);assert.equal(tileAt(599,300,square,s).grout,false);
  assert.throws(()=>tileAt(1,1,{widthMm:null,heightMm:600},s),/Format commercial/);
});
test('90 degree rotation and one third offsets change texture geometry, with negative-coordinate continuity',()=>{
  const p={widthMm:600,heightMm:1200};
  const normal=tileAt(700,200,p,{groutMm:0}),rotated=tileAt(700,200,p,{groutMm:0,rotation:90});assert.equal(normal.column,1);assert.equal(rotated.column,0);assert.equal(rotated.row,-1);
  const row1=tileAt(500,1300,p,{groutMm:0,layout:'third'}),row3=tileAt(500,3700,p,{groutMm:0,layout:'third'});assert.equal(row1.column,1);assert.equal(row3.column,0);
  const negative=tileAt(-1,-1,p,{groutMm:2});assert.ok(negative.u>=0&&negative.v>=0);assert.equal(negative.column,-1);
});
test('face choice is deterministic across export definitions and includes all faces',()=>{
  const used=new Set();for(let y=-5;y<5;y++)for(let x=-5;x<5;x++){const f=deterministicFace(x,y,5,17);assert.equal(f,deterministicFace(x,y,5,17));used.add(f);}assert.equal(used.size,5);
});
test('mask contour is independent of geometry and protects furniture cutouts',()=>{
  const mask=createMask(100,100);fillContour(mask,[{x:10,y:30},{x:90,y:30},{x:95,y:95},{x:5,y:95}]);
  assert.equal(mask.data[10*100+50],0);assert.equal(mask.data[60*100+50],255);
  brushStroke(mask,{x:50,y:60},{x:50,y:60},10,'remove');assert.equal(mask.data[60*100+50],0);assert.equal(mask.data[60*100+70],255);
  const original=new Uint8ClampedArray(mask.data),q=defaultQuad(mask,100,100);assert.equal(validateQuad(q),true);assert.deepEqual(mask.data,original);
  const larger=resampleMask(mask,200,200);assert.equal(larger.data[120*200+100],0);assert.equal(larger.data[120*200+140],255);assert.ok(maskCoverage(mask)>.4);
});
test('history restores removed furniture pixels and drops redo after a new edit',()=>{
  const mask=createMask(30,30),history=new MaskHistory(2);history.push(mask);brushStroke(mask,{x:15,y:15},{x:15,y:15},5);assert.equal(mask.data[15*30+15],255);
  assert.equal(history.undo(mask),true);assert.equal(mask.data[15*30+15],0);assert.equal(history.redo(mask),true);assert.equal(mask.data[15*30+15],255);
  history.push(mask);brushStroke(mask,{x:15,y:15},{x:15,y:15},5,'remove');assert.equal(history.redo(mask),false);
});
test('image sizing retains the photo ratio and never invents high definition',()=>{
  assert.deepEqual(fitSize(800,600,2600),{width:800,height:600});assert.deepEqual(fitSize(6000,4000,2600),{width:2600,height:1733});assert.deepEqual(fitSize(3000,4000,1100),{width:825,height:1100});
});
test('importing a saved bounded PNG keeps exactly the same work dimensions after rounding',async()=>{
  const originalDocument=globalThis.document,originalDecoder=globalThis.createImageBitmap;
  const imageBlob=(width,height,type)=>{const blob=new Blob(['image fixture'],{type});blob.fixtureWidth=width;blob.fixtureHeight=height;return blob;};
  globalThis.createImageBitmap=async blob=>({width:blob.fixtureWidth,height:blob.fixtureHeight,close(){}});
  globalThis.document={createElement(){const canvas={width:0,height:0};canvas.getContext=()=>({drawImage(){}});canvas.toBlob=(callback,type)=>callback(imageBlob(canvas.width,canvas.height,type));return canvas;}};
  try {
    // This tall ratio previously rounded directly to368×1100, but its saved
    // 871×2600 PNG rounded to369×1100, invalidating the otherwise intact mask.
    const first=await importPhoto(imageBlob(2009,6000,'image/jpeg')),resumed=await importPhoto(first.sourceBlob);
    assert.deepEqual([first.work.width,first.work.height],[369,1100]);
    assert.deepEqual([resumed.work.width,resumed.work.height],[first.work.width,first.work.height]);
    assert.deepEqual([resumed.photo.width,resumed.photo.height],[871,2600]);
  }finally{globalThis.document=originalDocument;globalThis.createImageBitmap=originalDecoder;}
});
test('low frequency illumination removes an old alternating joint pattern',()=>{
  const width=300,height=300,data=new Uint8ClampedArray(width*height*4),mask=createMask(width,height);mask.data.fill(255);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4,v=(Math.floor(x/3)+Math.floor(y/3))%2?240:30;data[p]=data[p+1]=data[p+2]=v;data[p+3]=255;}
  const field=illuminationField({width,height,data},mask);assert.ok(Math.max(...field.grid)-Math.min(...field.grid)<.001);
});
test('actual renderer keeps original pixels outside mask and in protected furniture holes',async()=>{
  const originalDocument=globalThis.document,originalImageData=globalThis.ImageData;
  globalThis.ImageData=class {constructor(data,width,height){Object.assign(this,{data,width,height});}};
  globalThis.document={createElement(){const canvas={width:0,height:0};canvas.getContext=()=>({putImageData(value){canvas.imageData=value;}});return canvas;}};
  try {
    const width=8,height=8,data=new Uint8ClampedArray(width*height*4);for(let i=0;i<data.length;i+=4){data[i]=25;data[i+1]=50;data[i+2]=75;data[i+3]=255;}
    const photo={width,height,data},mask=createMask(width,height);mask.data.fill(255);mask.data[0]=0;mask.data[4*width+4]=0;
    const product={photoStudioEligible:true,widthMm:600,heightMm:600},faces=[{width:1,height:1,data:new Uint8ClampedArray([210,180,140,255])}];
    const canvas=await renderFloor({photo,mask,product,faces,quad:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],settings:{lighting:0,groutMm:0}}),out=canvas.imageData.data;
    assert.deepEqual([...out.slice(0,4)],[25,50,75,255]);const furniture=(4*width+4)*4;assert.deepEqual([...out.slice(furniture,furniture+4)],[25,50,75,255]);assert.deepEqual([...out.slice(4,8)],[210,180,140,255]);assert.equal(canvas.width,width);assert.equal(canvas.height,height);
    const controller=new AbortController();controller.abort();await assert.rejects(renderFloor({photo,mask,product,faces,quad,signal:controller.signal}),{name:'AbortError'});
  }finally{globalThis.document=originalDocument;globalThis.ImageData=originalImageData;}
});
test('manufacturer texture orientation changes sampling without rotating the commercial plane',async()=>{
  const originalDocument=globalThis.document,originalImageData=globalThis.ImageData;
  globalThis.ImageData=class {constructor(data,width,height){Object.assign(this,{data,width,height});}};
  globalThis.document={createElement(){const canvas={width:0,height:0};canvas.getContext=()=>({putImageData(value){canvas.imageData=value;}});return canvas;}};
  try {
    const photo={width:2,height:2,data:new Uint8ClampedArray(16).fill(255)},mask=createMask(2,2);mask.data.fill(255);
    const product={photoStudioEligible:true,widthMm:600,heightMm:600},faces=[{width:2,height:2,data:new Uint8ClampedArray([255,0,0,255,0,255,0,255,0,0,255,255,255,255,0,255])}],q=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],settings={planeWidthMm:600,planeHeightMm:600,groutMm:0,lighting:0};
    const normal=await renderFloor({photo,mask,product,faces,quad:q,settings}),rotated=await renderFloor({photo,mask,product:{...product,textureRotation:90},faces,quad:q,settings});
    assert.deepEqual([...normal.imageData.data.slice(0,3)],[255,0,0]);assert.deepEqual([...rotated.imageData.data.slice(0,3)],[0,0,255]);
  }finally{globalThis.document=originalDocument;globalThis.ImageData=originalImageData;}
});
