import test from 'node:test';
import assert from 'node:assert/strict';
import {planeProjection,projectPoint,defaultQuad,validateQuad,solveHomography} from '../../assets/js/lrf-photo-studio/geometry.mjs';
import {estimateFloorPerspective,planeDimensions,depthVanishingPoint,projectionCoverage} from '../../assets/js/lrf-photo-studio/perspective.mjs';
import {createMask,refineMaskEdges} from '../../assets/js/lrf-photo-studio/mask.mjs';
import {jointCoverage} from '../../assets/js/lrf-photo-studio/renderer.mjs';

test('metric proportions use photo pixels for a portrait floor photographed from above',()=>{
 const q=[{x:.2,y:.2},{x:.8,y:.2},{x:.8,y:.8},{x:.2,y:.8}];
 assert.equal(planeDimensions(q,400,800).planeHeightMm,7200);
 assert.equal(planeDimensions(q,800,400).planeHeightMm,1800);
});

test('two orthogonal finite vanishing directions recover the actual camera and rectangle ratio',()=>{
 const unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);},u=unit([1,.1,.3]),temp=[.1,-.6,1],dot=u.reduce((n,v,i)=>n+v*temp[i],0),v=unit(temp.map((n,i)=>n-dot*u[i])),origin=[-1,1.4,4];
 const project=(x,y)=>{const p=origin.map((n,i)=>n+x*u[i]+y*v[i]);return{x:(400+600*p[0]/p[2])/800,y:(300+600*p[1]/p[2])/600}};
 const q=[project(0,4),project(3,4),project(3,0),project(0,0)],d=planeDimensions(q,800,600);
 assert.ok(validateQuad(q));assert.equal(d.planeHeightMm,4800);assert.ok(Math.abs(d.focalPixels-600)<1e-6);assert.equal(d.source,'orthogonal-vanishing-points');
});

test('apparent tile scale stays invariant when the reference rectangle is made smaller on the same floor',()=>{
 const q=[{x:.3190431851660722,y:.3832304216230351},{x:.6035954162318034,y:.43100358493088226},{x:.7872081957144857,y:.8470560732048713},{x:.3125,y:.85}];
 const camera=solveHomography([{x:0,y:0},{x:3600,y:0},{x:3600,y:4800},{x:0,y:4800}],q),small=[{x:900,y:1200},{x:2700,y:1200},{x:2700,y:3600},{x:900,y:3600}].map(p=>projectPoint(camera,p));
 const largeDimensions=planeDimensions(q,800,600,null),smallDimensions=planeDimensions(small,800,600,null);
 assert.ok(Math.abs(largeDimensions.planeWidthMm/2-smallDimensions.planeWidthMm)<=1);
 assert.ok(Math.abs(largeDimensions.planeHeightMm/2-smallDimensions.planeHeightMm)<=1);
});

function floorPhoto(){
 const width=320,height=480,q=[{x:.35,y:.44},{x:.65,y:.44},{x:.96,y:.96},{x:.04,y:.96}],h=planeProjection(q,3600,4800),mask=createMask(width,height),data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,p=projectPoint(h,{x:(x+.5)/width,y:(y+.5)/height}),floor=y>height*.44;mask.data[i]=floor?255:0;
  let v=floor?160:90;if(floor&&p){const mx=((p.x%300)+300)%300,my=((p.y%400)+400)%400;v=mx<10||my<10?60:155+10*Math.sin(p.x/100);}data.set([v,v*.9,v*.8,255],i*4);
 }
 return {image:{width,height,data},mask};
}

test('uncertain image-line hypotheses require guided alignment instead of claiming a floor plane',()=>{
 const {image,mask}=floorPhoto(),p=estimateFloorPerspective(image,mask);
 assert.equal(p.detected,false);assert.ok(['low-perspective-confidence','insufficient-cross-direction','no-reliable-lines'].includes(p.reason));
});

test('a spatially distributed family of actual floor lines resolves its true vanishing point',()=>{
 const vp={x:160,y:90},lines=[20,70,120,170,220,270,310].map(x=>{const y=450,dx=x-vp.x,dy=y-vp.y,n=Math.hypot(dx,dy),a=-dy/n,b=dx/n;return {a,b,c:-a*vp.x-b*vp.y,x:(x+vp.x)/2,y:(y+vp.y)/2,length:240,support:1};});
 const result=depthVanishingPoint(lines,320,480,210);assert.ok(result);assert.ok(Math.abs(result.x-vp.x)<1e-6);assert.ok(Math.abs(result.y-vp.y)<1e-6);assert.equal(result.lineCount,7);
});

test('no visible floor lines never yields a claimed automatic perspective',()=>{
 const {image,mask}=floorPhoto();image.data.fill(160);assert.equal(estimateFloorPerspective(image,mask).detected,false);
 const before=defaultQuad(mask,320,480);mask.data.fill(0);assert.deepEqual(defaultQuad(mask,320,480),before,'Furniture silhouettes must not alter initial plane geometry');
});

test('colour-guided mask refinement reduces a jagged object edge and preserves both interiors',()=>{
 const width=100,height=80,mask=createMask(width,height),data=new Uint8ClampedArray(width*height*4);
 let before=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,floor=x<50,v=floor?190:35;data.set([v,v,v,255],i*4);mask.data[i]=x<50+(Math.floor(y/4)%2?5:-5)?255:0;if((mask.data[i]>127)!==floor)before++;}
 const refined=refineMaskEdges(mask,{width,height,data},{radius:10}),after=refined.data.reduce((n,v,i)=>n+((v>127)!==(i%width<50)),0);
 assert.ok(after<before*.55,`${after} vs ${before}`);assert.equal(refined.data[40*width+20],255);assert.equal(refined.data[40*width+75],0);assert.notEqual(refined.data,mask.data);assert.equal(mask.data[40*width+48],0,'Refinement must retain the original editable mask');
});

test('a plane horizon cannot silently leave part of the selected floor unrendered',()=>{
 const mask=createMask(100,100);mask.data.fill(255);const full=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];assert.equal(projectionCoverage(full,mask),1);
 const limited=defaultQuad();assert.ok(projectionCoverage(limited,mask)<.8);for(let y=0;y<65;y++)mask.data.fill(0,y*100,(y+1)*100);assert.equal(projectionCoverage(limited,mask),1);
});

test('subpixel joints retain their area instead of becoming solid distant stripes',()=>{
 assert.equal(jointCoverage(50,600,0,30),0);
 assert.ok(Math.abs(jointCoverage(601,600,2,20)-.1)<1e-8);
 assert.equal(jointCoverage(300,600,2,20),0);
 const samples=1000,mean=Array.from({length:samples},(_,i)=>jointCoverage((i+.5)*602/samples,600,2,50)).reduce((a,b)=>a+b,0)/samples;
 assert.ok(Math.abs(mean-2/602)<.0001);
});
