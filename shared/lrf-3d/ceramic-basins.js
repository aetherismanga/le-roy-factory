import * as T from 'three';
import {basinCenters} from './integrated-basins.js';
// Reuse the original Studio One ceramic profiles and PBR materials. Only the
// real openings, bowl centres, drains, overflows and tap holes are rearranged.
export function createIntegratedBasin({parent,W,kind,layout,ceramic,chrome,dark,roundedRect,mesh,box}){
 const isTampa=kind==='tampa';
 const insetGroup=new T.Group();insetGroup.name='Vasque_encastree_'+kind;insetGroup.userData.editTarget='basin';parent.add(insetGroup);
 // Ceramic top, precision rounded opening and a closed ceramic shell.
 const topShape=roundedRect(W+.006,.466,.008);
 const offsets=basinCenters(layout,W),double=offsets.length===2;
 const basinScale=Math.min(.281,((double?W/2:layout==='offset'?.6:W)-.12)/2)/.281;
 const ring=(rx,rz,p=4.2,n=128)=>Array.from({length:n},(_,i)=>{let a=i/n*Math.PI*2;return new T.Vector2(rx*Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**(2/p),rz*Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**(2/p)-.027);});
 for(const x of offsets){const hole=new T.Path(ring((isTampa?.25:.281)*basinScale,isTampa?.138:.15,isTampa?8:4.2).map(p=>new T.Vector2(p.x+x,p.y)).reverse());topShape.holes.push(hole);}
 for(const x of offsets){const tapHole=new T.Path();tapHole.absarc(x,.173,.017,0,Math.PI*2,true);topShape.holes.push(tapHole);}
 const topG=new T.ExtrudeGeometry(topShape,{depth:.018,bevelEnabled:true,bevelSize:.0012,bevelThickness:.0012,bevelSegments:3,curveSegments:32});topG.rotateX(-Math.PI/2);
 const top=mesh(topG,ceramic,'Plan_vasque_ceramique_'+Math.round((W+.006)*1000)+'x466',insetGroup,0,.820,0);
 const profiles=isTampa?[[.250,.138,.839,8],[.246,.134,.837,8],[.240,.128,.827,8],[.225,.115,.733,7],[.190,.090,.708,6],[.080,.045,.696,3],[.021,.021,.693,2],[.021,.021,.689,2],[.084,.048,.692,3],[.196,.094,.704,6],[.231,.121,.730,7],[.246,.134,.819,8],[.250,.138,.819,8]]:[ [.281,.150,.839,4.2],[.277,.146,.838,4.2],[.269,.139,.831,4.1],[.252,.126,.812,4],[.223,.102,.761,3.8],[.173,.076,.711,3.3],[.09,.046,.687,2.7],[.021,.021,.683,2], [.021,.021,.679,2],[.093,.049,.683,2.7],[.176,.080,.707,3.3],[.228,.106,.757,3.8],[.257,.131,.808,4],[.275,.144,.818,4.2],[.281,.150,.819,4.2] ];
 const ps=[],uv=[],ix=[],N=128;
 for(let j=0;j<profiles.length;j++){const [rx,rz,y,p]=profiles[j];for(let k=0;k<=N;k++){const a=k/N*Math.PI*2;ps.push((rx>.024?rx*basinScale:rx)*Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**(2/p),y,rz*Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**(2/p)+.027);uv.push(k/N,j/(profiles.length-1));if(j<profiles.length-1&&k<N){const a=j*(N+1)+k,b=a+N+1;ix.push(a,b,a+1,b,b+1,a+1);}}}
 const bowlG=new T.BufferGeometry();bowlG.setAttribute('position',new T.Float32BufferAttribute(ps,3));bowlG.setAttribute('uv',new T.Float32BufferAttribute(uv,2));bowlG.setIndex(ix);bowlG.computeVertexNormals();for(const x of offsets)mesh(bowlG.clone(),ceramic,'Vasque_'+kind.toUpperCase()+'_coque_3D',insetGroup,x);
 const drainG=new T.CylinderGeometry(.022,.02,.008,64);for(const x of offsets)mesh(drainG.clone(),chrome,'Bonde_chromee',insetGroup,x,isTampa?.695:.685,.027);
 for(const x of offsets)mesh(new T.CylinderGeometry(.0315,.0315,.002,64),chrome,'Couvercle_bonde',insetGroup,x,isTampa?.701:.691,.027);
 if(isTampa)for(const x of offsets)box(.036,.007,.0015,dark,'Trop_plein_Tampa',insetGroup,x,.801,-.097,.001);
 insetGroup.userData.basinLayout=layout;insetGroup.userData.basinCenters=offsets;return insetGroup;
}
