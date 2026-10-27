import * as T from 'three';

// A 1.65 m visitor occupies shoulders/arms, not only the camera's optical point.
// Keep this envelope identical in both ateliers and in every rendering profile.
export const VISITOR_BODY_RADIUS=.30;
export const VISITOR_BODY_HEIGHT=1.65;
export const VISITOR_EYE_HEIGHT=1.55;
const FLOOR_PLAN_Z=.23,STEP_HEIGHT=.15,EPS=1e-5;
const nonSolid=new Set(['window','door','mirror','tap','towel']);
const distanceToSegment=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],n=dx*dx+dz*dz,u=n?T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/n,0,1):0;return Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz);};
function inside(x,z,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function touchesPolygon(x,z,points,radius){return inside(x,z,points)||points.some((a,i)=>distanceToSegment(x,z,a,points[(i+1)%points.length])<radius-EPS);}

// Collision polygons are in world coordinates. Composition's plan bounds have
// a historical +23 cm Z offset; they must be converted before comparing them
// with the walk camera. Visible mesh extents additionally include a projecting
// basin/top and drawers which have actually been opened during the visit.
function obstacleFor(item,room,boundsOnWall){
 if(nonSolid.has(item.type)||!item.placement)return null;
 const b=boundsOnWall(room,item);if(!b)return null;
 const corners=b.corners.map(p=>[p[0],p[1]-FLOOR_PLAN_Z]);
 let bottom=b.bottom,top=b.top;
 if(item.root){
  item.root.updateWorldMatrix(true,true);
  const inverse=item.root.matrixWorld.clone().invert(),local=new T.Box3(),point=new T.Vector3();
  function collect(object){
   if(object.visible===false||object.userData?.collision===false)return;
   if(object.isMesh&&object.geometry){
    const materials=Array.isArray(object.material)?object.material:[object.material];
    if(materials.some(material=>material&&material.visible!==false&&(!material.transparent||material.opacity>.05))){
     const geometry=object.geometry;if(!geometry.boundingBox)geometry.computeBoundingBox?.();const box=geometry.boundingBox;
     if(box&&!box.isEmpty()){
      const instance=new T.Matrix4(),worldMatrix=new T.Matrix4(),transform=new T.Matrix4();
      // An InstancedMesh geometry describes its unscaled source (e.g. a unit
      // sphere for 8 mm leaves). Only its rendered instance matrices describe
      // physical dimensions; using the source creates metre-wide obstacles.
      const count=object.isInstancedMesh?object.count:1;
      for(let index=0;index<count;index++){
       worldMatrix.copy(object.matrixWorld);
       if(object.isInstancedMesh){object.getMatrixAt(index,instance);worldMatrix.multiply(instance);}
       const worldBox=box.clone().applyMatrix4(worldMatrix);
       if(worldBox.max.y>STEP_HEIGHT&&worldBox.min.y<VISITOR_BODY_HEIGHT){
        bottom=Math.min(bottom,worldBox.min.y);top=Math.max(top,worldBox.max.y);
        transform.copy(inverse).multiply(worldMatrix);
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])local.expandByPoint(point.set(x,y,z).applyMatrix4(transform));
       }
      }
     }
    }
   }
   for(const child of object.children||[])collect(child);
  }
  collect(item.root);
  if(!local.isEmpty())for(const x of [local.min.x,local.max.x])for(const z of [local.min.z,local.max.z]){
   point.set(x,0,z).applyMatrix4(item.root.matrixWorld);corners.push([point.x,point.z]);
  }
 }
 if(bottom>=VISITOR_BODY_HEIGHT||top<=STEP_HEIGHT)return null;
 // Project the conceptual and rendered extents onto the item's own axes. This
 // avoids a world AABB falsely blocking the corners of rotated furniture.
 const angle=item.root?.rotation.y??0,tx=Math.cos(angle),tz=-Math.sin(angle),nx=-tz,nz=tx;
 const us=corners.map(p=>p[0]*tx+p[1]*tz),vs=corners.map(p=>p[0]*nx+p[1]*nz),a=Math.min(...us),c=Math.max(...us),d=Math.min(...vs),e=Math.max(...vs);
 return [[a,d],[c,d],[c,e],[a,e]].map(([u,v])=>[u*tx+v*nx,u*tz+v*nz]);
}

export function createVisitCollisionWorld({room,items=[],boundsOnWall,radius=VISITOR_BODY_RADIUS}){
 if(!room)return {passable:()=>true,findSafe:p=>({x:p.x,z:p.z}),move:(p,d)=>{p.x+=d.x;p.z+=d.z;return true;}};
 const floor=(room.points||[]).map(p=>[Array.isArray(p)?p[0]:p.x,(Array.isArray(p)?p[1]:p.z)-FLOOR_PLAN_Z]);
 const obstacles=items.map(item=>obstacleFor(item,room,boundsOnWall)).filter(Boolean);
 const doors=items.filter(item=>item.type==='door'&&item.settings?.doorOpen&&item.placement?.wall!==undefined);
 function doorway(wall,u){return doors.some(item=>{
  const other=room.walls[item.placement.wall];if(!other)return false;
  if(wall!==other&&!(wall.partition!==undefined&&other.partition===wall.partition))return false;
  const center=wall===other?item.placement.u/100:wall.length-item.placement.u/100;
  return Math.abs(u-center)<(item.dimensions?.width||.83)/2-radius-EPS;
 });}
 function passable(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  if(obstacles.some(poly=>touchesPolygon(x,z,poly,radius)))return false;
  let openBoundary=false;
  for(const wall of room.walls||[]){
   if(wall.height<=STEP_HEIGHT)continue;
   const tx=wall.normal.z,tz=-wall.normal.x,dx=x-wall.start.x,dz=z-wall.start.z,u=dx*tx+dz*tz;
   const a=[wall.start.x,wall.start.z],b=[a[0]+tx*wall.length,a[1]+tz*wall.length];
   if(wall.partition===undefined&&Math.abs(dx*wall.normal.x+dz*wall.normal.z)<radius+.01&&doorway(wall,u))openBoundary=true;
   if(distanceToSegment(x,z,a,b)<radius-EPS&&!doorway(wall,u))return false;
  }
  if(!floor.length)return true;
  if(!inside(x,z,floor))return openBoundary;
  // Segment checks include concave room corners, unlike four cardinal samples.
  return true;
 }
 function findSafe(preferred){
  if(passable(preferred.x,preferred.z))return {x:preferred.x,z:preferred.z};
  // Search nearest first; opening the visit with an orbit camera already in a
  // basin must place the whole body outside it before the first reflected frame.
  for(let r=.08;r<=1.6;r+=.08){const count=Math.ceil(2*Math.PI*r/.08);for(let i=0;i<count;i++){const angle=i/count*Math.PI*2,x=preferred.x+Math.cos(angle)*r,z=preferred.z+Math.sin(angle)*r;if(passable(x,z))return {x,z};}}
  const bounds=room.bounds;if(bounds){let best=null,distance=Infinity;for(let x=bounds.min.x+radius;x<bounds.max.x;x+=.12)for(let z=bounds.min.z+radius;z<bounds.max.z;z+=.12){const d=(x-preferred.x)**2+(z-preferred.z)**2;if(d<distance&&passable(x,z)){best={x,z};distance=d;}}return best;}
  return null;
 }
 function move(position,delta){
  const initialX=position.x,initialZ=position.z;
  if(!passable(position.x,position.z)){const safe=findSafe(position);if(!safe)return false;position.x=safe.x;position.z=safe.z;}
  // Substeps prevent crossing a thin screen/partition after a delayed frame.
  const count=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.05)),dx=delta.x/count,dz=delta.z/count;
  for(let i=0;i<count;i++){
   if(passable(position.x+dx,position.z+dz)){position.x+=dx;position.z+=dz;continue;}
   // Slide along obstacles without increasing speed or jumping their corners.
   if(passable(position.x+dx,position.z))position.x+=dx;
   if(passable(position.x,position.z+dz))position.z+=dz;
  }
  return Math.hypot(position.x-initialX,position.z-initialZ)>1e-6;
 }
 return {passable,findSafe,move,radius,obstacles};
}
