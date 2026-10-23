import * as T from 'three';
import {MIRROR_METALS} from './mirrors.js';
export function buildProfiles(room,settings={},finishes=[],items=[]){
 const group=new T.Group();group.name='Profiles_alu';const parts=[],details=[],entries=[],materials=new Map();
 const material=color=>{if(!materials.has(color)){const hex=MIRROR_METALS.find(m=>m.id===color)?.hex||MIRROR_METALS[1].hex;materials.set(color,new T.MeshStandardMaterial({color:hex,metalness:.85,roughness:.28}));}return materials.get(color);};
 const strip=(parent,a,b,kind,defaultOn=true)=>{const from=new T.Vector3(...a),to=new T.Vector3(...b),length=from.distanceTo(to);if(length<.03)return;const key=parent.userData.profileKey||'wall-'+parent.userData.wallIndex,id=key+'|'+kind+'|'+a.map(v=>v.toFixed(3)).join(',')+'|'+b.map(v=>v.toFixed(3)).join(','),override=settings.overrides?.[id],enabled=override?.enabled??(!!settings.enabled&&defaultOn),color=override?.color||settings.color||'Argent',g=new T.Group();g.position.copy(from);g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize());g.name='Profile_'+kind;g.userData.editTarget='profile:'+id;parent.add(g);entries.push({id,kind,length,enabled,color});
 if(enabled){const w=.01,t=.0012;for(const [x,z,ww,dd]of [[0,w/2,t,w],[w/2,0,w,t]]){const o=new T.Mesh(new T.BoxGeometry(ww,length,dd),material(color));o.position.set(x,length/2,z);o.castShadow=o.receiveShadow=true;g.add(o);}parts.push(length);details.push({id,kind,length,color});}
 if(settings.editMode){const marker=new T.Mesh(new T.SphereGeometry(.018,12,8),new T.MeshBasicMaterial({color:enabled?'#b59a65':'#6b9576',depthTest:false}));marker.position.y=length/2;marker.renderOrder=20;marker.name='Angle_selectionnable';g.add(marker);}};

 for(const [i,wall]of room.walls.entries()){
  if(finishes[i]?.collection==='Peinture')continue;const local=new T.Group();local.userData.wallIndex=i;local.userData.profileKey=wall.key;local.userData.editTarget='wall:'+i;local.position.copy(wall.group.position);local.rotation.copy(wall.group.rotation);group.add(local);
  const upright=(x,kind,on=true)=>strip(local,[x,0,.002],[x,wall.height,.002],kind,on);
  if(wall.partition!==undefined){upright(0,'angle_externe',false);upright(wall.length,'angle_externe',false);if(wall.height<room.height-.01)strip(local,[0,wall.height,.002],[wall.length,wall.height,.002],'rive_cloison',false);}
  else{
   const p=room.points,n=p.length,a=p[(i+n-1)%n],b=p[i],c=p[(i+1)%n],turn=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
   if(turn<-.00001)upright(0,'angle_externe');
   else upright(0,'angle_interne',!!settings.internalCorners&&(!settings.walls?.length||settings.walls.includes(i)));
   upright(wall.length,'angle_interne',false);
  }
  for(const o of wall.openings||[]){for(const x of [o.left,o.right])strip(local,[x,o.bottom,.002],[x,o.top,.002],'encadrement');strip(local,[o.left,o.top,.002],[o.right,o.top,.002],'encadrement');if(o.bottom>.02)strip(local,[o.left,o.bottom,.002],[o.right,o.bottom,.002],'encadrement');}
 }
 for(const item of items){if(item.type!=='bath'||item.settings.kind==='island'||item.settings.apron!=='tile')continue;const local=new T.Group();local.position.copy(item.root.position);local.rotation.copy(item.root.rotation);local.userData.itemId=item.id;local.userData.editTarget='bath';const carrier=new T.Group();carrier.userData.profileKey='bath-'+item.id;carrier.position.copy(item.asset.root.position);local.add(carrier);group.add(local);const w=item.dimensions.width,d=item.dimensions.depth,z=-.23+d+.003,h=.558;for(const x of [-w/2,w/2]){strip(carrier,[x,0,z],[x,h,z],'angle_baignoire',false);strip(carrier,[x,h,-.23],[x,h,z],'rive_baignoire',false);}strip(carrier,[-w/2,h,z],[w/2,h,z],'rive_baignoire',false);}
 return {group,parts,details,entries,metres:parts.reduce((n,l)=>n+l,0)};
}
