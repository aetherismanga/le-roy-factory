import * as T from 'three';

// Anima uses the Studio One carcass/joinery. Only the visible face profile is
// changed here: smooth Pura or the actual vertical Ribelle relief.
export function animaFacadeGeometry(width,height,ribelle=false,thickness=.019){
  const shape=new T.Shape();
  shape.moveTo(-width/2,-thickness/2);shape.lineTo(width/2,-thickness/2);shape.lineTo(width/2,thickness/2);
  if(ribelle){const count=Math.max(1,Math.round(width/.0065)),pitch=width/count;
    for(let i=count-1;i>=0;i--){const right=-width/2+(i+1)*pitch;for(let k=0;k<=8;k++){const f=k/8;shape.lineTo(right-f*pitch,thickness/2-.0023*Math.sin(Math.PI*f));}}
  }else shape.lineTo(-width/2,thickness/2);
  shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:height,steps:1,bevelEnabled:false,curveSegments:6});
  geometry.rotateX(Math.PI/2);geometry.translate(0,height/2,0);
  const a=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<a.count;i++){
    const x=a.getX(i),y=a.getY(i),z=a.getZ(i);
    // Original Studio One integrated grip, with the full outer edge retained.
    if(y>height/2-.00001)a.setY(i,y-(thickness/2-z));
    const yy=a.getY(i);uv.setXY(i,ribelle?yy/height+.5:x/width+.5,ribelle?x/width+.5:yy/height+.5);
  }
  geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}

export function addAnimaDoor({parent,width,height,bottom,frontZ,wood,metal,ribelle,count=1,hingeSide='left'}){
  const doors=[],frontMeshes=[],proxies=[];
  for(let i=0;i<count;i++){
    const side=count===2?(i===0?-1:1):(hingeSide==='right'?1:-1),w=(width-.004-(count-1)*.003)/count;
    const door=new T.Group();door.name='Porte_Anima_'+(i+1);door.position.set(side*(width/2-.002),bottom,frontZ);parent.add(door);
    const front=new T.Mesh(animaFacadeGeometry(w,height-.004,ribelle),wood);front.name=(ribelle?'Ribelle':'Pura')+'_porte';front.position.set(-side*w/2,(height-.004)/2+.002,0);front.castShadow=front.receiveShadow=true;front.userData.editTarget='furniture';door.add(front);frontMeshes.push(front);
    for(const y of [.075,height-.075]){const barrel=new T.Mesh(new T.CylinderGeometry(.005,.005,.035,14),metal);barrel.name='Charniere_Anima';barrel.position.set(-side*.013,y,-.018);door.add(barrel);}
    // Studio One's opening controller writes .position.z. A proxy preserves its
    // existing animation while converting that travel into a real door swing.
    const fullTravel=count===1?.315:i===0?.200:.315;
    let travel=0;const position={};Object.defineProperty(position,'z',{get:()=>travel,set:value=>{travel=Number(value)||0;const amount=Math.min(1,Math.max(0,travel/fullTravel));door.rotation.y=amount?side*amount*Math.PI*.56:0;}});
    proxies.push({name:'Ouverture_porte_Anima_'+(i+1),position,userData:{door:true}});doors.push(door);
  }
  return {doors,frontMeshes,proxies};
}
