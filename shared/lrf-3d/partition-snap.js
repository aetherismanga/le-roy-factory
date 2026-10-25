import {Vector3,Group} from 'three';
import {inside,validateRoom,polygonArea,partitionGeometry} from './room.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const round=value=>Math.round(value*1000)/1000;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

// A translation keeps the wall rigid; attachment reorients it along the inward
// normal of the nearest boundary. The same centimetre-space result drives the
// SVG plan and the 3D preview, including clockwise and rotated room drawings.
export function snapPartitionDrag(config,index,delta,{wall:previousWall=null,threshold=18,releaseThreshold=28,recoveryThreshold=40,validate=null}={}){
 const original=config.partitions?.[index];if(!original)return null;
 const length=distance(original.a,original.b),moved={...copy(original),a:original.a.map((v,i)=>round(v+delta[i])),b:original.b.map((v,i)=>round(v+delta[i]))};
 if(!Number.isFinite(length)||length<20||!delta.every(Number.isFinite))return null;
 const sign=polygonArea(config.points)>0?1:-1,candidates=[];
 const accept=(partition,metadata={})=>{const draft={...copy(config),partitions:config.partitions.map((p,i)=>i===index?partition:copy(p))};if(validateRoom(draft,0)||validate&&!validate(draft))return null;return {config:draft,partition,...metadata};};
 for(const [wall,a]of config.points.entries()){
  const b=config.points[(wall+1)%config.points.length],wallLength=distance(a,b);if(wallLength<original.thickness+.2)continue;
  const tangent=[(b[0]-a[0])/wallLength,(b[1]-a[1])/wallLength],normal=[-tangent[1]*sign,tangent[0]*sign],margin=original.thickness/2+.01;
  for(const end of ['a','b']){
   const p=moved[end],u=(p[0]-a[0])*tangent[0]+(p[1]-a[1])*tangent[1],projected=Math.max(0,Math.min(wallLength,u)),nearest=[a[0]+tangent[0]*projected,a[1]+tangent[1]*projected],d=distance(p,nearest),outside=!inside(p,config.points),limit=wall===previousWall?releaseThreshold:outside?recoveryThreshold:threshold;
   if(d>limit)continue;
   // Leave the whole thickness inside at an angle/corner. This also catches a
   // slight pointer overshoot beyond either endpoint of the boundary segment.
   const along=Math.max(margin,Math.min(wallLength-margin,u)),anchor=[round(a[0]+tangent[0]*along),round(a[1]+tangent[1]*along)],other=anchor.map((v,i)=>round(v+normal[i]*length)),partition={...copy(moved),[end]:anchor,[end==='a'?'b':'a']:other};
   const result=accept(partition,{snapped:true,wall,end,point:anchor,anchor:copy(p),right:true,attached:true,distance:d});
   if(result)candidates.push({...result,score:d+Math.abs(along-u)*.05-(wall===previousWall?3:0)});
  }
 }
 candidates.sort((a,b)=>a.score-b.score);if(candidates.length)return candidates[0];
 return accept(moved,{snapped:false,wall:null});
}

// Reuse wall metadata with new rigid transforms; never tessellate tiles while
// the mouse is down. The real room/cuts and quantities are rebuilt on release.
export function partitionPreviewRoom(config,room,index){
 const partitions=partitionGeometry(config),partition=partitions[index];if(!partition)return null;
 const walls=room.walls.map(w=>{if(w.partition!==index)return w;const side=w.partitionSide,a=side?partition.b:partition.a,b=side?partition.a:partition.b,normal=side?partition.normal.clone().negate():partition.normal.clone(),group=new Group(),start=new Vector3(a[0],0,a[1]-.23).addScaledVector(normal,partition.thickness/2);group.position.copy(start);group.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);group.updateMatrixWorld(true);return {...w,group,start,normal,length:partition.length,height:partition.height};});
 return {...room,walls,partitions};
}
