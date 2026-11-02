import * as T from 'three';

// Anima uses the Studio One carcass/joinery. Only the visible face profile is
// changed here: smooth Pura or the actual vertical Ribelle relief.
export const ANIMA_WOOD_PERIOD=Object.freeze({horizontal:.80,vertical:.70});
export const RIBELLE_PROFILE=Object.freeze({pitch:.0065,depth:.00135,samples:12});

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
  const half=thickness/2,bottom=-height/2,backTop=height/2-thickness;
  const at=i=>{const x=-width/2+width*i/samples,phase=(x+width/2)/pitch;
    const z=half-(ribelle?RIBELLE_PROFILE.depth*(1-Math.cos(phase*Math.PI*2))/2:0);
    const derivative=ribelle?-RIBELLE_PROFILE.depth*Math.PI/pitch*Math.sin(phase*Math.PI*2):0;
    return {x,z,y:height/2-(half-z),derivative};};
  const vertex=(x,y,z,nx,ny,nz)=>{const i=positions.length/3;positions.push(x,y,z);normals.push(nx,ny,nz);uvs.push(x/ANIMA_WOOD_PERIOD.horizontal+.5,y/ANIMA_WOOD_PERIOD.vertical+.5);return i;};
  // An indexed, analytically smooth front avoids the flat microscopic facets
  // which made fine ribs flicker in perspective. The groove joins are C1.
  for(let i=0;i<=samples;i++){const p=at(i),n=new T.Vector3(-p.derivative,0,1).normalize();vertex(p.x,bottom,p.z,n.x,n.y,n.z);vertex(p.x,p.y,p.z,n.x,n.y,n.z);}
  for(let i=0;i<samples;i++){const a=i*2;indices.push(a,a+2,a+1,a+2,a+3,a+1);}
  const quad=(a,b,c,d,normal)=>{const base=positions.length/3;for(const p of[a,b,c,d])vertex(...p,...normal);indices.push(base,base+1,base+2,base,base+2,base+3);};
  for(let i=0;i<samples;i++){const a=at(i),b=at(i+1);
    quad([a.x,a.y,a.z],[b.x,b.y,b.z],[b.x,backTop,-half],[a.x,backTop,-half],[0,Math.SQRT1_2,-Math.SQRT1_2]);
    quad([a.x,bottom,-half],[b.x,bottom,-half],[b.x,bottom,b.z],[a.x,bottom,a.z],[0,-1,0]);
  }
  quad([-width/2,bottom,-half],[-width/2,backTop,-half],[width/2,backTop,-half],[width/2,bottom,-half],[0,0,-1]);
  for(const side of[-1,1]){const p=at(side<0?0:samples),points=[[p.x,bottom,-half],[p.x,bottom,p.z],[p.x,p.y,p.z],[p.x,backTop,-half]];if(side>0)points.reverse();quad(...points,[side,0,0]);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingBox();
  geometry.userData.animaFacade={ribelle,pitch:ribelle?pitch:null,depth:ribelle?RIBELLE_PROFILE.depth:0,grain:'horizontal',uvScale:'metres'};
  return geometry;
}

export function addAnimaDoor({parent,width,height,bottom,frontZ,wood,metal,ribelle,count=1,hingeSide='left'}){
  const doors=[],frontMeshes=[],proxies=[];
  for(let i=0;i<count;i++){
    const side=count===2?(i===0?-1:1):(hingeSide==='right'?1:-1),w=(width-.004-(count-1)*.003)/count;
    const door=new T.Group();door.name='Porte_Anima_'+(i+1);door.position.set(side*(width/2-.002),bottom,frontZ);parent.add(door);
    const front=new T.Mesh(animaFacadeGeometry(w,height-.004,ribelle),wood);front.name=(ribelle?'Ribelle':'Pura')+'_porte';front.position.set(-side*w/2,(height-.004)/2+.002,0);front.castShadow=front.receiveShadow=true;front.userData.editTarget='furniture';door.add(front);applyAnimaWoodUV(front,{front:true});frontMeshes.push(front);
    for(const y of [.075,height-.075]){const barrel=new T.Mesh(new T.CylinderGeometry(.005,.005,.035,14),metal);barrel.name='Charniere_Anima';barrel.position.set(-side*.013,y,-.018);door.add(barrel);}
    // Studio One's opening controller writes .position.z. A proxy preserves its
    // existing animation while converting that travel into a real door swing.
    const fullTravel=count===1?.315:i===0?.200:.315;
    let travel=0;const position={};Object.defineProperty(position,'z',{get:()=>travel,set:value=>{travel=Number(value)||0;const amount=Math.min(1,Math.max(0,travel/fullTravel));door.rotation.y=amount?side*amount*Math.PI*.56:0;}});
    proxies.push({name:'Ouverture_porte_Anima_'+(i+1),position,userData:{door:true}});doors.push(door);
  }
  return {doors,frontMeshes,proxies};
}
