import * as T from 'three';
const BASE={day:{key:2.8,fill:1,rim:.8,sun:.9,hemi:.3,env:.45},warm:{key:2,fill:.65,rim:2.2,sun:.35,hemi:.22,env:.32},showroom:{key:3.7,fill:1.2,rim:2,sun:.9,hemi:.24,env:.5}};
const corners=box=>[box.min.x,box.max.x].flatMap(x=>[box.min.y,box.max.y].flatMap(y=>[box.min.z,box.max.z].map(z=>new T.Vector3(x,y,z))));
// Fit to the room in light space, independent of the viewing camera and the
// selected object. A furniture click must never move the sun or its shadow map.
export function fitRoomShadow(sun,room){
 const c=sun.shadow.camera;c.position.copy(sun.position);c.lookAt(sun.target.position);c.updateMatrixWorld(true);
 const points=corners(room.bounds.clone().expandByScalar(.06)).map(p=>p.applyMatrix4(c.matrixWorldInverse)),xs=points.map(p=>p.x),ys=points.map(p=>p.y),zs=points.map(p=>-p.z);
 const width=Math.max(...xs)-Math.min(...xs)+.12,height=Math.max(...ys)-Math.min(...ys)+.12,texelX=width/Math.max(1,sun.shadow.mapSize.x),texelY=height/Math.max(1,sun.shadow.mapSize.y),x=Math.round((Math.max(...xs)+Math.min(...xs))/2/texelX)*texelX,y=Math.round((Math.max(...ys)+Math.min(...ys))/2/texelY)*texelY;
 c.left=x-width/2;c.right=x+width/2;c.bottom=y-height/2;c.top=y+height/2;c.near=Math.max(.05,Math.min(...zs)-.2);c.far=Math.max(c.near+.1,Math.max(...zs)+.2);c.updateProjectionMatrix();
 sun.shadow.bias=-.00008;sun.shadow.normalBias=Math.min(.009,Math.max(.0015,Math.max(texelX,texelY)*.55));sun.shadow.radius=2.4;
}
export function createDaylightRig(scene,{sun,key,fill,rim,hemisphere}){
 const portals=new Map();let signature='',active=false,primaryId=null;
 return {
  reset(){signature='';},
  update({room,items=[],mode='day',profile,color}){
   if(!room)return;const windows=items.filter(i=>i.type==='window'&&room.walls[i.placement.wall]?.partition===undefined),next=JSON.stringify([room.points,room.bounds.min.toArray(),room.bounds.max.toArray(),mode,profile.id,color.getHexString(),windows.map(i=>[i.id,i.settings.width,i.settings.height,i.placement])]);if(next===signature)return;signature=next;
   const p=BASE[mode]||BASE.day;active=mode==='day'&&windows.length>0;const sorted=windows.slice().sort((a,b)=>b.settings.width*b.settings.height-a.settings.width*a.settings.height||a.id.localeCompare(b.id)),primary=active?sorted[0]:null;primaryId=primary?.id||null;
   const center=room.bounds.getCenter(new T.Vector3());center.y=Math.min(1.2,room.height*.5);const size=room.bounds.getSize(new T.Vector3()),reach=Math.max(2,size.length()*.65);
   key.position.copy(center).add(new T.Vector3(-reach*.4,reach*.45,reach*.45));key.lookAt(center);fill.position.copy(center).add(new T.Vector3(reach*.4,.6,reach*.25));fill.lookAt(center);rim.position.copy(center).add(new T.Vector3(0,.9,-.1));rim.lookAt(center);
   key.intensity=p.key*(active?.42:1);fill.intensity=p.fill*(active?.5:1);rim.intensity=p.rim*(active?.35:1);hemisphere.intensity=p.hemi*(active?.9:1);scene.environmentIntensity=p.env*(active?.78:1);
   if(primary){
    const wall=room.walls[primary.placement.wall],opening=primary.root.position.clone();opening.y+=primary.settings.height/200;opening.addScaledVector(wall.normal,-.23);const tangent=new T.Vector3(wall.normal.z,0,-wall.normal.x);
    sun.target.position.copy(opening);sun.position.copy(opening).addScaledVector(wall.normal,-6).addScaledVector(tangent,1.25).add(new T.Vector3(0,4.5,0));sun.intensity=profile.shadow>0?1.9:0;
   }else{sun.target.position.copy(center);sun.position.copy(center).add(new T.Vector3(-reach,reach*1.6,reach));sun.intensity=p.sun;}
   for(const [id,l]of portals)if(!windows.some(i=>i.id===id)){scene.remove(l);l.dispose();portals.delete(id);}
   for(const item of windows){let l=portals.get(item.id);if(!l){l=new T.RectAreaLight('#e9f1ff',1,item.settings.width/100,item.settings.height/100);l.name='Lumiere_diffuse_fenetre';scene.add(l);portals.set(item.id,l);}const wall=room.walls[item.placement.wall];l.width=Math.max(.2,item.settings.width/100-.11);l.height=Math.max(.2,item.settings.height/100-.11);l.position.copy(item.root.position).addScaledVector(wall.normal,-.20);l.position.y+=item.settings.height/200;l.lookAt(l.position.clone().add(wall.normal));l.color.copy(color).lerp(new T.Color('#e9f1ff'),.6);l.intensity=active?2.1:mode==='warm'?.12:.5;}
   fitRoomShadow(sun,room);
  },
  get physicalDaylight(){return active;},
  diagnostics(){return {windowDaylight:active,primaryWindow:primaryId,skyPortals:portals.size,sunPosition:sun.position.toArray(),sunTarget:sun.target.position.toArray(),sunIntensity:sun.intensity,shadowProjection:sun.shadow.camera.projectionMatrix.toArray(),shadowBias:sun.shadow.bias,shadowNormalBias:sun.shadow.normalBias};}
 };
}
// Cutaway is a viewing tool. Solid walls and the ceiling still block sunlight,
// even when hidden to the user; glass transmits light and is never an occluder.
export function captureRoomShadows({room,items=[],daylight=false},render){
 const states=new Map(),set=(o,key,value)=>{if(!o)return;let s=states.get(o);if(!s){s={};states.set(o,s);}if(!(key in s))s[key]=o[key];o[key]=value;};
 // With a window, the complete architecture occludes the exterior sun.
 // Without one, this is an interior studio presentation: an outside wall must
 // not cast an arbitrary diagonal band from an imaginary exterior light.
 for(const w of room?.walls||[]){set(w.group,'visible',true);set(w.backing,'castShadow',daylight||w.partition!==undefined);set(w.tiles,'castShadow',false);}
 for(const i of items)if(['window','door'].includes(i.type))set(i.root,'visible',true);
 set(room?.shadowCeiling,'visible',daylight);
 try{return render();}finally{for(const [o,s]of states)for(const [key,value]of Object.entries(s))o[key]=value;}
}
