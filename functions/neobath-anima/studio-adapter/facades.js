import * as T from 'three';

// The catalogue shows a recessed horizontal grip on every front, including
// the two opposing centre grips on the reversible column (PDF pp.128–132).
// Grip section and Ribelle pitch are photo-based preview reconstructions; the
// catalogue supplies the cabinet envelope, not industrial machining sections.
export const ANIMA_WOOD_PERIOD=Object.freeze({horizontal:.80,vertical:.70});
export const ANIMA_GRIP_PROFILE=Object.freeze({height:.040,recess:.016,lip:.002,curveSegments:8,sourcePdfPages:[9,65,66,67],approximate:true});
export const RIBELLE_PROFILE=Object.freeze({pitch:.008,depth:.00135,samples:16,ridgeFraction:.56,sourcePdfPage:9,approximate:true});

// UVs represent metres rather than one stretched swatch per door. Pura and
// Ribelle have the same grain direction; the rib relief never rotates a map.
export function applyAnimaWoodUV(mesh,{front=false,period=ANIMA_WOOD_PERIOD}={}){
  const geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal;
  let uv=geometry.attributes.uv;if(!uv){uv=new T.Float32BufferAttribute(new Float32Array(p.count*2),2);geometry.setAttribute('uv',uv);}
  for(let i=0;i<p.count;i++){
    const x=p.getX(i)+mesh.position.x,y=p.getY(i)+mesh.position.y,z=p.getZ(i)+mesh.position.z;
    if(front)uv.setXY(i,x/period.horizontal+.5,y/period.vertical+.5);
    else if(Math.abs(n.getX(i))>.6)uv.setXY(i,z/period.vertical+.4,y/period.vertical+.5);
    else if(Math.abs(n.getY(i))>.6)uv.setXY(i,x/period.horizontal+.5,z/period.vertical+.4);
    else uv.setXY(i,x/period.horizontal+.5,y/period.vertical+.5);
  }
  uv.needsUpdate=true;return mesh;
}

export function animaFacadeGeometry(width,height,ribelle=false,thickness=.019){
  const positions=[],normals=[],uvs=[],indices=[];
  const count=ribelle?Math.max(1,Math.round(width/RIBELLE_PROFILE.pitch)):1;
  const samples=ribelle?count*RIBELLE_PROFILE.samples:1,pitch=width/count;
  const half=thickness/2,bottom=-height/2,top=height/2;
  const gripHeight=Math.min(ANIMA_GRIP_PROFILE.height,height*.22),recess=Math.min(ANIMA_GRIP_PROFILE.recess,thickness-.002);
  const bodyTop=top-gripHeight,lip=ANIMA_GRIP_PROFILE.lip;
  const at=i=>{const x=-width/2+width*i/samples,phase=((x+width/2)/pitch)%1,edge=RIBELLE_PROFILE.ridgeFraction/2,groove=1-RIBELLE_PROFILE.ridgeFraction,t=(phase-edge)/groove,inGroove=t>0&&t<1;
    // Broad raised lands and a narrow rounded valley reproduce the visible
    // Ribelle section without a second blurred photographic groove pattern.
    const z=half-(ribelle&&inGroove?RIBELLE_PROFILE.depth*(1-Math.cos(t*Math.PI*2))/2:0);
    const derivative=ribelle&&inGroove?-RIBELLE_PROFILE.depth*Math.PI/(pitch*groove)*Math.sin(t*Math.PI*2):0;
    return {x,z,derivative};};
  const vertex=(x,y,z,nx,ny,nz)=>{const i=positions.length/3;positions.push(x,y,z);normals.push(nx,ny,nz);uvs.push(x/ANIMA_WOOD_PERIOD.horizontal+.5,y/ANIMA_WOOD_PERIOD.vertical+.5);return i;};
  // The face relief is a continuous C1 surface. The grip above it is a smooth
  // recessed section, rather than a dark line painted over full-height fronts.
  for(let i=0;i<=samples;i++){const p=at(i),n=new T.Vector3(-p.derivative,0,1).normalize();vertex(p.x,bottom,p.z,n.x,n.y,n.z);vertex(p.x,bodyTop,p.z,n.x,n.y,n.z);}
  for(let i=0;i<samples;i++){const a=i*2;indices.push(a,a+2,a+1,a+2,a+3,a+1);}
  const quad=(a,b,c,d,normal)=>{const base=positions.length/3;for(const p of[a,b,c,d])vertex(...p,...normal);indices.push(base,base+1,base+2,base,base+2,base+3);};
  const curve=Array.from({length:ANIMA_GRIP_PROFILE.curveSegments+1},(_,i)=>{const angle=i/ANIMA_GRIP_PROFILE.curveSegments*Math.PI/2;return {y:bodyTop+lip+recess*Math.sin(angle),blend:Math.cos(angle),sine:Math.sin(angle)};});
  for(let i=0;i<samples;i++){
    const a=at(i),b=at(i+1),za=half-recess,zb=half-recess;
    // Solid lower nose, rounded finger clearance and recessed upright. This
    // geometric profile replaces the inherited Studio One 45-degree bevel.
    quad([a.x,bodyTop,a.z],[b.x,bodyTop,b.z],[b.x,bodyTop+lip,half],[a.x,bodyTop+lip,half],[0,0,1]);
    for(let j=0;j<curve.length-1;j++){
      const c=curve[j],d=curve[j+1],base=positions.length/3;
      // Anima p.9: the horizontal grip is smooth even on Ribelle. The narrow
      // solid nose above closes the rib valleys before this rounded section.
      for(const [p,section]of[[a,c],[b,c],[b,d],[a,d]]){const n=new T.Vector3(0,recess*section.sine,recess*section.blend).normalize();vertex(p.x,section.y,za+recess*section.blend,n.x,n.y,n.z);}
      indices.push(base,base+1,base+2,base,base+2,base+3);
    }
    quad([a.x,curve.at(-1).y,za],[b.x,curve.at(-1).y,zb],[b.x,top,zb],[a.x,top,za],[0,0,1]);
    quad([a.x,top,za],[b.x,top,zb],[b.x,top,-half],[a.x,top,-half],[0,1,0]);
    quad([a.x,bottom,-half],[b.x,bottom,-half],[b.x,bottom,b.z],[a.x,bottom,a.z],[0,-1,0]);
  }
  quad([-width/2,bottom,-half],[-width/2,top,-half],[width/2,top,-half],[width/2,bottom,-half],[0,0,-1]);
  for(const side of[-1,1]){
    const p=at(side<0?0:samples),profile=[[bottom,-half],[bottom,p.z],[bodyTop,p.z],...curve.map(c=>[c.y,half-recess+recess*c.blend]),[top,half-recess],[top,-half]];
    const base=positions.length/3;for(const [y,z]of profile)vertex(p.x,y,z,side,0,0);
    // Concave section: triangulate the actual grip contour, never bridge it.
    const vectors=profile.map(([y,z])=>new T.Vector2(y,z));
    for(const triangle of T.ShapeUtils.triangulateShape(vectors,[])){const order=side>0?triangle:triangle.slice().reverse();indices.push(...order.map(i=>base+i));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingBox();
  geometry.userData.animaFacade={ribelle,pitch:ribelle?pitch:null,depth:ribelle?RIBELLE_PROFILE.depth:0,ridgeFraction:ribelle?RIBELLE_PROFILE.ridgeFraction:null,grain:'horizontal',uvScale:'metres',grip:{...ANIMA_GRIP_PROFILE,height:gripHeight,recess,smoothBand:true},section:'horizontal-recessed-grip',sourcePdfPage:9,approximate:true};
  return geometry;
}

export function addAnimaDoor({parent,width,height,bottom,frontZ,wood,metal,ribelle,count=1,hingeSide='left',gripEdge='top'}){
  const doors=[],frontMeshes=[],proxies=[];
  for(let i=0;i<count;i++){
    const side=count===2?(i===0?-1:1):(hingeSide==='right'?1:-1),w=(width-.004-(count-1)*.003)/count;
    const door=new T.Group();door.name='Porte_Anima_'+(i+1);door.userData.animaOpening={type:'hinged',hingeSide:side<0?'left':'right',gripEdge};door.position.set(side*(width/2-.002),bottom,frontZ);parent.add(door);
    const front=new T.Mesh(animaFacadeGeometry(w,height-.004,ribelle),wood);front.name=(ribelle?'Ribelle':'Pura')+'_porte';if(gripEdge==='bottom')front.geometry.rotateZ(Math.PI);front.userData.animaGripEdge=gripEdge;front.position.set(-side*w/2,(height-.004)/2+.002,0);front.castShadow=front.receiveShadow=true;front.userData.editTarget='furniture';door.add(front);applyAnimaWoodUV(front,{front:true});frontMeshes.push(front);
    for(const y of [.075,height-.075]){const barrel=new T.Mesh(new T.CylinderGeometry(.005,.005,.035,14),metal);barrel.name='Charniere_Anima';barrel.position.set(-side*.013,y,-.018);door.add(barrel);}
    // Studio One's opening controller writes .position.z. A proxy preserves its
    // existing animation while converting that travel into a real door swing.
    const fullTravel=count===1?.315:i===0?.200:.315;
    let travel=0;const position={};Object.defineProperty(position,'z',{get:()=>travel,set:value=>{travel=Number(value)||0;const amount=Math.min(1,Math.max(0,travel/fullTravel));door.rotation.y=amount?side*amount*Math.PI*.56:0;}});
    proxies.push({name:'Ouverture_porte_Anima_'+(i+1),position,userData:{door:true}});doors.push(door);
  }
  return {doors,frontMeshes,proxies};
}
