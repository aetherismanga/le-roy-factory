import * as T from 'three';

// The catalogue shows a recessed horizontal grip on every front, including
// the two opposing centre grips on the reversible column (PDF pp.128–132).
// Grip section and Ribelle pitch are photo-based preview reconstructions; the
// catalogue supplies the cabinet envelope, not industrial machining sections.
export const ANIMA_WOOD_PERIOD=Object.freeze({horizontal:.80,vertical:.70});
export const ANIMA_GRIP_PROFILE=Object.freeze({height:.040,recess:.016,lip:.0015,lowerBevel:.007,endReturn:.017,curveSegments:0,profile:'rectilinear-channel-with-end-returns',sourcePdfPages:[4,9,29,42,65,66,67],approximate:true});
export const RIBELLE_PROFILE=Object.freeze({pitch:.008,depth:.00135,samples:16,ridgeFraction:.56,sourcePdfPage:9,approximate:true});

// UVs represent metres rather than one stretched swatch per door. Material
// orientation follows the native photos: horizontal Pura, vertical Ribelle.
// The rib relief itself never distorts or rotates the texture coordinates.
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
  const positions=[],normals=[],uvs=[],indices=[],vertices=new Map();
  const count=ribelle?Math.max(1,Math.round(width/RIBELLE_PROFILE.pitch)):1;
  const samples=ribelle?count*RIBELLE_PROFILE.samples:1,pitch=width/count;
  const half=thickness/2,bottom=-height/2,top=height/2;
  const gripHeight=Math.min(ANIMA_GRIP_PROFILE.height,height*.22),recess=Math.min(ANIMA_GRIP_PROFILE.recess,thickness-.002);
  const bodyTop=top-gripHeight,lip=ANIMA_GRIP_PROFILE.lip,bevel=Math.min(ANIMA_GRIP_PROFILE.lowerBevel,gripHeight-lip-.002),endReturn=Math.min(ANIMA_GRIP_PROFILE.endReturn,width*.08);
  // The native Anima photographs show straight grip facets with mitred end
  // returns. The outer ends of the front remain full rectangles. A rounded,
  // full-width C cut is visibly different from this catalogue construction.
  const xs=[...new Set([...Array.from({length:samples+1},(_,i)=>-width/2+width*i/samples),-width/2+endReturn,width/2-endReturn].map(x=>Number(x.toFixed(12))))].sort((a,b)=>a-b);
  const ys=[bottom,bodyTop,bodyTop+lip,bodyTop+lip+bevel,top];
  const at=x=>{const phase=((x+width/2)/pitch)%1,edge=RIBELLE_PROFILE.ridgeFraction/2,groove=1-RIBELLE_PROFILE.ridgeFraction,t=(phase-edge)/groove,inGroove=t>0&&t<1;
    const z=half-(ribelle&&inGroove?RIBELLE_PROFILE.depth*(1-Math.cos(t*Math.PI*2))/2:0);
    const derivative=ribelle&&inGroove?-RIBELLE_PROFILE.depth*Math.PI/(pitch*groove)*Math.sin(t*Math.PI*2):0;
    return {z,derivative};};
  const point=(x,row,back=false)=>[x,ys[row],back?-half:row<2?at(x).z:row===2?half:half-recess*Math.min(1,Math.max(0,(width/2-Math.abs(x))/endReturn))];
  const vertex=(p,n)=>{const key=ribelle?[...p,...n].join(','):null;if(key!==null&&vertices.has(key))return vertices.get(key);const i=positions.length/3;positions.push(...p);normals.push(...n);uvs.push(p[0]/ANIMA_WOOD_PERIOD.horizontal+.5,p[1]/ANIMA_WOOD_PERIOD.vertical+.5);if(key!==null)vertices.set(key,i);return i;};
  const triangle=(a,b,c,ns=null)=>{const normal=ns?null:new T.Vector3().crossVectors(new T.Vector3().fromArray(b).sub(new T.Vector3().fromArray(a)),new T.Vector3().fromArray(c).sub(new T.Vector3().fromArray(a))).normalize().toArray();for(const [i,p]of[a,b,c].entries())indices.push(vertex(p,ns?.[i]||normal));};
  const quad=(a,b,c,d,ns=null)=>{triangle(a,b,c,ns?[ns[0],ns[1],ns[2]]:null);triangle(a,c,d,ns?[ns[0],ns[2],ns[3]]:null);};
  if(!ribelle){
  for(let i=0;i<xs.length-1;i++){
    const a=xs[i],b=xs[i+1];
    for(let j=0;j<ys.length-1;j++){
      const na=j===0?new T.Vector3(-at(a).derivative,0,1).normalize().toArray():null,nb=j===0?new T.Vector3(-at(b).derivative,0,1).normalize().toArray():null;
      quad(point(a,j),point(b,j),point(b,j+1),point(a,j+1),na?[na,nb,nb,na]:null);
      quad(point(a,j,true),point(a,j+1,true),point(b,j+1,true),point(b,j,true));
    }
    quad(point(a,4),point(b,4),point(b,4,true),point(a,4,true));
    quad(point(a,0,true),point(b,0,true),point(b,0),point(a,0));
  }
  for(const [side,x]of[[-1,-width/2],[1,width/2]])for(let j=0;j<ys.length-1;j++){
    if(side<0)quad(point(x,j,true),point(x,j),point(x,j+1),point(x,j+1,true));
    else quad(point(x,j,true),point(x,j+1,true),point(x,j+1),point(x,j));
  }
  }else{
    // Keep every original relief and lower-bevel facet. Only planar surfaces
    // are retriangulated: the flat rear, upright grip and panel edges. Their
    // boundary vertices are retained, so adjoining faces remain watertight.
    const fan=(boundary,center)=>{for(let i=0;i<boundary.length;i++)triangle(center,boundary[i],boundary[(i+1)%boundary.length]);};
    for(let i=0;i<xs.length-1;i++){
      const a=xs[i],b=xs[i+1];
      for(let j=0;j<3;j++){
        const na=j===0?new T.Vector3(-at(a).derivative,0,1).normalize().toArray():null,nb=j===0?new T.Vector3(-at(b).derivative,0,1).normalize().toArray():null;
        quad(point(a,j),point(b,j),point(b,j+1),point(a,j+1),na?[na,nb,nb,na]:null);
      }
    }
    const breaks=[xs[0],Number((-width/2+endReturn).toFixed(12)),Number((width/2-endReturn).toFixed(12)),xs.at(-1)];
    for(let i=0;i<breaks.length-1;i++){
      const a=breaks[i],b=breaks[i+1],bottomEdge=xs.filter(x=>x>=a&&x<=b).map(x=>point(x,3));
      const center=point((a+b)/2,3);center[1]=(ys[3]+ys[4])/2;
      fan([...bottomEdge,point(b,4),point(a,4)],center);
    }
    quad(point(xs[0],0,true),point(xs[0],4,true),point(xs.at(-1),4,true),point(xs.at(-1),0,true));
    fan([...breaks.map(x=>point(x,4)),point(xs.at(-1),4,true),point(xs[0],4,true)],[0,top,-half+.0005]);
    fan([point(xs[0],0,true),point(xs.at(-1),0,true),...xs.slice().reverse().map(x=>point(x,0))],[0,bottom,0]);
    for(const [side,x]of[[-1,xs[0]],[1,xs.at(-1)]]){
      const boundary=[point(x,0,true),...ys.map((_,row)=>point(x,row)),point(x,4,true)];
      if(side>0)boundary.reverse();
      fan(boundary,[x,0,0]);
    }
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingBox();
  geometry.userData.animaFacade={ribelle,pitch:ribelle?pitch:null,depth:ribelle?RIBELLE_PROFILE.depth:0,ridgeFraction:ribelle?RIBELLE_PROFILE.ridgeFraction:null,grain:ribelle?'vertical':'horizontal',uvScale:'metres',grip:{...ANIMA_GRIP_PROFILE,height:gripHeight,recess,lowerBevel:bevel,endReturn,smoothBand:true,closedEnds:true},section:'horizontal-recessed-grip',sourcePdfPage:9,approximate:true};
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
