import * as T from 'three';

// LESS is a 40 × 22 cm hand basin with a right-hand tap ledge, not a
// scaled-down Sella. Coordinates are local to the ceramic top.
export const LESS_BASIN=Object.freeze({centerX:-.045,centerZ:.010,tapX:.142,tapZ:-.018,tapRotation:-Math.PI/2});
export function createLessBasin({parent,W,depth,ceramic,chrome,roundedRect,mesh}){
 const group=new T.Group();group.name='Vasque_compact_LESS';group.userData.editTarget='basin';parent.add(group);
 const {centerX,centerZ,tapX,tapZ}=LESS_BASIN,N=96;
 const ring=(rx,rz,p)=>Array.from({length:N},(_,i)=>{const a=i/N*Math.PI*2;return [rx*Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**(2/p),rz*Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**(2/p)];});
 const shape=roundedRect(W+.006,depth+.006,.008);
 shape.holes.push(new T.Path(ring(.120,.074,4.5).map(([x,z])=>new T.Vector2(x+centerX,-z-centerZ)).reverse()));
 const tapHole=new T.Path();tapHole.absarc(tapX,-tapZ,.017,0,Math.PI*2,true);shape.holes.push(tapHole);
 const top=new T.ExtrudeGeometry(shape,{depth:.020,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:3,curveSegments:24});top.rotateX(-Math.PI/2);
 mesh(top,ceramic,'Plan_vasque_LESS_400x220',group,0,.820,0);
 const profiles=[[.120,.074,.840,4.5],[.116,.070,.837,4.5],[.108,.062,.812,4.3],[.085,.048,.765,3.8],[.045,.029,.753,2.8],[.020,.020,.750,2],[.020,.020,.744,2],[.048,.032,.747,2.8],[.090,.053,.759,3.8],[.114,.069,.811,4.3],[.120,.074,.819,4.5]];
 const positions=[],uv=[],indices=[];
 for(let j=0;j<profiles.length;j++){
  const [rx,rz,y,p]=profiles[j],points=ring(rx,rz,p);
  for(let k=0;k<=N;k++){const [x,z]=points[k%N];positions.push(x,y,z);uv.push(k/N,j/(profiles.length-1));if(j<profiles.length-1&&k<N){const a=j*(N+1)+k,b=a+N+1;indices.push(a,b,a+1,b,b+1,a+1);}}
 }
 const bowl=new T.BufferGeometry();bowl.setAttribute('position',new T.Float32BufferAttribute(positions,3));bowl.setAttribute('uv',new T.Float32BufferAttribute(uv,2));bowl.setIndex(indices);bowl.computeVertexNormals();
 mesh(bowl,ceramic,'Vasque_COMPACT_coque_3D',group,centerX,0,centerZ);
 mesh(new T.CylinderGeometry(.020,.019,.006,48),chrome,'Bonde_chromee',group,centerX,.750,centerZ);
 mesh(new T.CylinderGeometry(.026,.026,.002,48),chrome,'Couvercle_bonde',group,centerX,.754,centerZ);
 group.userData.basinLayout='compact';group.userData.basinCenters=[centerX];
 return group;
}
