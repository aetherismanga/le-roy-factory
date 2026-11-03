import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {animaFacadeGeometry,ANIMA_GRIP_PROFILE} from '../functions/neobath-anima/studio-adapter/facades.js';
const near=(a,b,note)=>assert.ok(Math.abs(a-b)<2e-7,`${note}: ${a} / ${b}`);
function mesh(width=.8,height=.256,ribelle=false){return new T.Mesh(animaFacadeGeometry(width,height,ribelle),new T.MeshBasicMaterial());}
function fromFront(m,x,y){m.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(x,y,.1),new T.Vector3(0,0,-1)).intersectObject(m,false)[0];}
function dispose(m){m.geometry.dispose();m.material.dispose();}

test('native Anima grip uses straight lower bevel and recessed face, without the old quarter-circle',()=>{
 for(const ribelle of[false,true]){const m=mesh(.8,.256,ribelle),top=.128,half=.0095,g=m.geometry.userData.animaFacade,body=top-g.grip.height;
  try{
   assert.equal(g.grip.profile,'rectilinear-channel-with-end-returns');assert.equal(g.grip.curveSegments,0);assert.equal(g.grip.closedEnds,true);assert.equal(g.grip.approximate,true);assert.ok(g.grip.sourcePdfPages.includes(4));assert.ok(g.grip.sourcePdfPages.includes(9));
   for(const fraction of[.15,.4,.7,.95]){const y=body+g.grip.lip+g.grip.lowerBevel*fraction,hit=fromFront(m,0,y);assert.ok(hit);near(hit.point.z,half-g.grip.recess*fraction,'lower grip bevel is one straight facet');}
   for(const y of[body+.013,body+.025,top-.001]){const hit=fromFront(m,0,y);assert.ok(hit);near(hit.point.z,half-g.grip.recess,'recessed grip upright is flat');}
  }finally{dispose(m);}
 }
});

test('mitred end returns keep both outside silhouettes rectangular, including the top finger-clearance zone',()=>{
 for(const [width,height]of[[.396,.649],[.596,.256],[.796,.516],[1.196,.256]])for(const ribelle of[false,true]){
  const m=mesh(width,height,ribelle),meta=m.geometry.userData.animaFacade,top=height/2,front=.0095;
  try{
   for(const side of[-1,1])for(const y of[top-.003,top-.014,top-.028]){const ray=new T.Raycaster(new T.Vector3(side*(width/2+.1),y,front-.0003),new T.Vector3(-side,0,0)),hits=ray.intersectObject(m,false);assert.ok(hits.length,'solid side returns cannot have a full-height C-shaped notch');near(hits[0].point.x,side*width/2,'outer end retains the stock rectangle');}
   for(const side of[-1,1]){const x=side*(width/2-.002),hit=fromFront(m,x,top-.008);assert.ok(hit);near(hit.point.z,front-meta.grip.recess*.002/meta.grip.endReturn,'end return is a straight mitred facet');}
   const middle=fromFront(m,0,top-.008),end=fromFront(m,width/2-.002,top-.008);assert.ok(end.point.z-middle.point.z>.012,'the end remains filled ahead of the open grip');
  }finally{dispose(m);}
 }
});

test('rectilinear grip shells have closed oriented edges, positive volume and unchanged source envelopes',()=>{
 for(const ribelle of[false,true]){const m=mesh(.8,.256,ribelle),g=m.geometry,p=g.attributes.position,n=g.attributes.normal,indices=g.index.array,edges=new Map(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),cross=new T.Vector3(),normal=new T.Vector3();let volume=0;
  try{
   const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e7)).join(',');
   for(let i=0;i<indices.length;i+=3){const ids=[indices[i],indices[i+1],indices[i+2]];a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);cross.crossVectors(b.clone().sub(a),c.clone().sub(a));assert.ok(cross.lengthSq()>1e-23,'no degenerate facet');normal.fromBufferAttribute(n,ids[0]);assert.ok(cross.dot(normal)>0,'outward front-face winding');volume+=a.dot(b.clone().cross(c))/6;
    for(let j=0;j<3;j++){const u=key(ids[j]),v=key(ids[(j+1)%3]),id=u<v?u+'|'+v:v+'|'+u,entry=edges.get(id)||{count:0,balance:0};entry.count++;entry.balance+=u<v?1:-1;edges.set(id,entry);}
   }
   for(const entry of edges.values()){assert.equal(entry.count,2,'every geometric edge has exactly two incident facets');assert.equal(entry.balance,0,'adjacent facets traverse their shared edge in opposite directions');}
   assert.ok(volume>.8*.256*.012&&volume<.8*.256*.019,'closed, positive-volume front with a real removed grip');const box=g.boundingBox;near(box.max.x-box.min.x,.8,'width');near(box.max.y-box.min.y,.256,'height');near(box.max.z-box.min.z,.019,'panel thickness envelope');
  }finally{dispose(m);}
 }
});

test('native grain orientation identifies horizontal Pura and vertical Ribelle independently of the relief geometry',()=>{
 const pura=animaFacadeGeometry(.8,.256),ribelle=animaFacadeGeometry(.8,.256,true);try{assert.equal(pura.userData.animaFacade.grain,'horizontal');assert.equal(ribelle.userData.animaFacade.grain,'vertical');assert.equal(pura.userData.animaFacade.uvScale,'metres');assert.equal(ribelle.userData.animaFacade.uvScale,'metres');assert.equal(ANIMA_GRIP_PROFILE.approximate,true);}finally{pura.dispose();ribelle.dispose();}
});
