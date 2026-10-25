import {Vector3} from 'three';
import {isItemPositionLocked} from './position-lock.js';

const copy=value=>JSON.parse(JSON.stringify(value));
export const PARTITION_PROFILE_COLORS=['none','Argent','Noir','Doré','Bronze'];

// An exception to the room lock may change exactly one unlocked partition.
// Room boundaries, niches and every other partition must stay unchanged.
export function allowsPartitionUpdate(composition,current,next,id){
 const index=(current?.partitions||[]).findIndex((p,i)=>(p.id||'index-'+i)===id),target=current?.partitions?.[index];
 if(!target||isItemPositionLocked(composition,target)||(next?.partitions?.[index]?.id||'index-'+index)!==id)return false;
 const before=copy(current),after=copy(next);before.partitions.splice(index,1);after.partitions.splice(index,1);
 return JSON.stringify(before)===JSON.stringify(after);
}

export function inheritedPartitionFinish(finish={}){
 const next=copy(finish);for(const key of ['tiles','zones','jointProfiles'])delete next[key];return next;
}

// Continue the elevation grid. Parallel faces also retain the actual horizontal
// phase, including the reversed tangent of the opposite face. Perpendicular
// faces start at their own corner while keeping the same horizontal rows.
export function inheritedPartitionLayout(source,target){
 const layout=copy(source?.layout||{});if(!source?.group||!target?.group)return layout;
 source.group.updateWorldMatrix(true,false);target.group.updateWorldMatrix(true,false);
 const origin=source.group.worldToLocal(target.group.localToWorld(new Vector3())),along=source.group.worldToLocal(target.group.localToWorld(new Vector3(1,0,0))).sub(origin);
 if(Math.abs(Math.abs(along.x)-1)<1e-6){const pitch=layout.direction==='vertical'?layout.height:layout.width;if(pitch>0){const phase=((Number(layout.x)||0)/100-origin.x)/along.x;layout.x=Math.round((((phase%pitch)+pitch)%pitch)*1e8)/1e6;}}
 return layout;
}

export function partitionUpdate(config,index,patch){
 const draft=copy(config),p=draft.partitions?.[index];if(!p)throw Error('Cloison introuvable.');
 if(patch.length!==undefined){if(!Number.isFinite(patch.length)||patch.length<20||patch.length>1000)throw Error('Longueur entre 20 et 1 000 cm.');const dx=p.b[0]-p.a[0],dy=p.b[1]-p.a[1],length=Math.hypot(dx,dy);p.b=[Math.round(p.a[0]+dx/length*patch.length),Math.round(p.a[1]+dy/length*patch.length)];}
 if(patch.moveX!==undefined||patch.moveY!==undefined){const dx=Number(patch.moveX)||0,dy=Number(patch.moveY)||0;if(![dx,dy].every(Number.isFinite))throw Error('Position de cloison invalide.');p.a=p.a.map((v,i)=>v+(i?dy:dx));p.b=p.b.map((v,i)=>v+(i?dy:dx));}
 for(const key of ['thickness','height','fullHeight','profileEdges'])if(patch[key]!==undefined)p[key]=copy(patch[key]);
 if(patch.height!==undefined&&patch.fullHeight===undefined)p.fullHeight=false;
 if(p.fullHeight)p.height=draft.height;
 return draft;
}

export function worldDeltaToPlan(config,delta){
 const a=config.points[0],b=config.points[1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length,area=config.points.reduce((s,p,i)=>{const q=config.points[(i+1)%config.points.length];return s+p[0]*q[1]-q[0]*p[1];},0),sign=area>0?1:-1;
 return [Math.round((ux*delta.x-sign*uy*delta.z)*100),Math.round((uy*delta.x+sign*ux*delta.z)*100)];
}
