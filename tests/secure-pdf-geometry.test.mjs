import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfTileGeometry,pdfZoomTarget} from '../assets/js/secure-pdf-viewer.mjs';

const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-8,`${message}: ${actual} vs ${expected}`);

test('the tile crops an enlarged page around the visible document region',()=>{
 const page={left:6,top:6,width:3900,height:5460};
 const view={left:1800,top:2200,width:390,height:700};
 const tile=pdfTileGeometry(page,view,3);
 assert.deepEqual({left:tile.left,top:tile.top,width:tile.width,height:tile.height},{left:1664,top:2048,width:704,height:1024});
 assert.ok(tile.left+page.left<=view.left);
 assert.ok(tile.top+page.top<=view.top);
 assert.ok(tile.left+tile.width+page.left>=view.left+view.width);
 assert.ok(tile.top+tile.height+page.top>=view.top+view.height);
 assert.ok(tile.width<page.width/4,'The backing bitmap does not cover the whole zoomed page');
 assert.ok(tile.height<page.height/4);
 assert.ok(tile.scale>=2,'The phone viewport retains high-DPI detail at high zoom');
});

test('PDF render translation maps the crop origin to the backing canvas origin',()=>{
 const page={left:30,top:1000,width:2800,height:3900};
 const view={left:1100,top:2300,width:412,height:796};
 const tile=pdfTileGeometry(page,view,3);
 assert.equal(tile.left,896);assert.equal(tile.top,1152);
 const documentPoint={x:1250,y:2480};
 const pixel={x:(documentPoint.x-page.left-tile.left)*tile.scale,y:(documentPoint.y-page.top-tile.top)*tile.scale};
 near(pixel.x,324*tile.scale,'The crop translates the PDF x coordinate');
 near(pixel.y,328*tile.scale,'The crop translates the PDF y coordinate');
 assert.ok(pixel.x>=0&&pixel.x<tile.pixelWidth);
 assert.ok(pixel.y>=0&&pixel.y<tile.pixelHeight);
 near(pixel.x/tile.scale+tile.left+page.left,documentPoint.x,'Pixel x restores the source point');
 near(pixel.y/tile.scale+tile.top+page.top,documentPoint.y,'Pixel y restores the source point');
});

test('a tile never extends beyond the real PDF page at document edges',()=>{
 const page={left:6,top:506,width:300,height:420};
 const tile=pdfTileGeometry(page,{left:0,top:450,width:390,height:700},3);
 assert.equal(tile.left,0);assert.equal(tile.top,0);
 assert.equal(tile.width,300);assert.equal(tile.height,420);
 assert.equal(tile.pixelWidth,900);assert.equal(tile.pixelHeight,1260);
});

test('far-offscreen pages allocate no canvas',()=>{
 const page={left:100,top:1000,width:600,height:840};
 for(const view of [
  {left:0,top:0,width:390,height:600},
  {left:0,top:2400,width:390,height:600},
  {left:1500,top:1000,width:390,height:600},
  {left:-1000,top:1000,width:390,height:600}
 ])assert.equal(pdfTileGeometry(page,view,3),null);
});

test('zoom 1 through 8 and high-DPI screens stay inside pixel and side budgets',()=>{
 for(const zoom of [1,1.25,2.5,4,8])for(const deviceScale of [1,2,3,4,8])for(const budget of [1000000,4000000]){
  for(const viewport of [{width:375,height:619},{width:390,height:796},{width:1280,height:852},{width:3840,height:2112}]){
   const page={left:6,top:6,width:Math.max(390,viewport.width)*zoom,height:Math.max(390,viewport.width)*1.4*zoom};
   const view={left:Math.max(0,(page.width-viewport.width)*.45),top:Math.max(0,(page.height-viewport.height)*.4),...viewport};
   const tile=pdfTileGeometry(page,view,deviceScale,budget);
   assert.ok(tile,JSON.stringify({zoom,deviceScale,budget,viewport}));
   assert.ok(Number.isFinite(tile.scale)&&tile.scale>0);
   assert.ok(Number.isInteger(tile.pixelWidth)&&tile.pixelWidth>0&&tile.pixelWidth<=4096);
   assert.ok(Number.isInteger(tile.pixelHeight)&&tile.pixelHeight>0&&tile.pixelHeight<=4096);
   assert.ok(tile.pixelWidth*tile.pixelHeight<=budget,JSON.stringify(tile));
  }
 }
});

test('very long or wide PDF surfaces do not request giant backing canvases',()=>{
 for(const page of [
  {left:0,top:0,width:100000,height:100000},
  {left:0,top:0,width:100000,height:1200},
  {left:0,top:0,width:1200,height:100000}
 ]){
  const tile=pdfTileGeometry(page,{left:0,top:0,width:100000,height:100000},8);
  assert.ok(tile.pixelWidth<=4096&&tile.pixelHeight<=4096);
  assert.ok(tile.pixelWidth*tile.pixelHeight<=4000000);
 }
});

test('zoom keeps an interior document point underneath the same screen point',()=>{
 const page={left:6,top:1500,width:1600,height:2240};
 const anchor={x:.4,y:.35,screenX:195,screenY:300};
 const target=pdfZoomTarget(page,anchor,{documentHeight:10000,height:796});
 near(page.left+anchor.x*page.width-target.left,anchor.screenX,'Horizontal focal point');
 near(page.top+anchor.y*page.height-target.top,anchor.screenY,'Vertical focal point');
});

test('zoom scroll targets clamp to the beginning and end of the document',()=>{
 const viewport={documentHeight:3000,height:796};
 assert.deepEqual(pdfZoomTarget({left:0,top:0,width:300,height:420},{x:0,y:0,screenX:195,screenY:300},viewport),{left:0,top:0});
 const bottom=pdfZoomTarget({left:6,top:2700,width:600,height:840},{x:.5,y:1,screenX:195,screenY:0},viewport);
 assert.equal(bottom.top,2204);
 assert.equal(pdfZoomTarget({left:0,top:0,width:300,height:420},{x:.5,y:1,screenX:195,screenY:0},{documentHeight:420,height:796}).top,0);
});
