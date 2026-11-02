import * as T from 'three';
import {MIRROR_METALS} from './mirrors.js';
import {METAL_FINISHES,metalMaterial} from './taps.js';
import {isNicheProfileFinish,nicheProfileEdges} from './niche-profile-options.js';
export function buildProfiles(room,settings={},finishes=[],items=[]){
 const group=new T.Group();group.name='Profiles_alu';const parts=[],details=[],entries=[],materials=new Map();
 const material=color=>{if(!materials.has(color)){const finish=METAL_FINISHES.find(m=>m.id===color);const hex=MIRROR_METALS.find(m=>m.id===color)?.hex||MIRROR_METALS[1].hex;materials.set(color,finish?metalMaterial(finish.id):new T.MeshStandardMaterial({color:hex,metalness:.85,roughness:.28}));}return materials.get(color);};
 const strip=(parent,a,b,kind,defaultOn=true,options={})=>{const from=new T.Vector3(...a),to=new T.Vector3(...b),length=from.distanceTo(to);if(length<.03)return;const key=parent.userData.profileKey||'wall-'+parent.userData.wallIndex,id=key+'|'+kind+'|'+a.map(v=>v.toFixed(3)).join(',')+'|'+b.map(v=>v.toFixed(3)).join(','),override=settings.overrides?.[id],enabled=options.own?!!options.enabled:override?.enabled??(options.enabled??(!!settings.enabled&&defaultOn)),color=(options.own?options.color:override?.color||options.color)||settings.color||'Argent',g=new T.Group();g.position.copy(from);g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize());g.name='Profile_'+kind;g.userData.editTarget='profile:'+id;parent.add(g);entries.push({id,kind,length,enabled,color});
 if(enabled&&options.inlay){const o=new T.Mesh(new T.BoxGeometry(.008,length,.0012),material(color));o.position.set(0,length/2,-.001);o.castShadow=o.receiveShadow=true;g.add(o);parts.push(length);details.push({id,kind,length,color});}
 else if(enabled){const w=.01,t=.0012;for(const [x,z,ww,dd]of [[0,w/2,t,w],[w/2,0,w,t]]){const o=new T.Mesh(new T.BoxGeometry(ww,length,dd),material(color));o.position.set(x,length/2,z);o.castShadow=o.receiveShadow=true;g.add(o);}parts.push(length);details.push({id,kind,length,color});}
 if(settings.editMode){const marker=new T.Mesh(new T.SphereGeometry(.018,12,8),new T.MeshBasicMaterial({color:enabled?'#b59a65':'#6b9576',depthTest:false}));marker.position.y=length/2;marker.renderOrder=20;marker.name='Angle_selectionnable';g.add(marker);}};

 for(const [i,wall]of room.walls.entries()){
  const painted=finishes[i]?.collection==='Peinture';const local=new T.Group();local.userData.wallIndex=i;local.userData.profileKey=wall.key;local.userData.editTarget='wall:'+i;local.position.copy(wall.group.position);local.rotation.copy(wall.group.rotation);group.add(local);
  const upright=(x,kind,on=true)=>strip(local,[x,0,.002],[x,wall.height,.002],kind,on);
  if(!painted&&wall.partition!==undefined){const edges=room.partitions[wall.partition]?.profileEdges||{},option=edge=>({own:edges[edge]!==undefined,enabled:edges[edge]!==undefined&&edges[edge]!=='none',color:edges[edge]!=='none'?edges[edge]:undefined});strip(local,[0,0,.002],[0,wall.height,.002],'angle_externe',false,option(wall.partitionSide?'b':'a'));strip(local,[wall.length,0,.002],[wall.length,wall.height,.002],'angle_externe',false,option(wall.partitionSide?'a':'b'));if(wall.height<room.height-.01)strip(local,[0,wall.height,.002],[wall.length,wall.height,.002],'rive_cloison',false,option('top'));}
  else if(!painted){
   const p=room.points,n=p.length,a=p[(i+n-1)%n],b=p[i],c=p[(i+1)%n],turn=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
   if(turn<-.00001)upright(0,'angle_externe');
   else upright(0,'angle_interne',!!settings.internalCorners&&(!settings.walls?.length||settings.walls.includes(i)));
   upright(wall.length,'angle_interne',false);
  }
  for(const o of painted?[]:wall.openings||[]){for(const x of [o.left,o.right])strip(local,[x,o.bottom,.002],[x,o.top,.002],'encadrement');strip(local,[o.left,o.top,.002],[o.right,o.top,.002],'encadrement');if(o.bottom>.02)strip(local,[o.left,o.bottom,.002],[o.right,o.bottom,.002],'encadrement');}
  // Each niche has independently selectable front edges. Flat inlays remain
  // behind the wall plane and cannot create a protruding white frame.
  for(const n of wall.niches||[]){
   const carrier=new T.Group();carrier.userData.profileKey='niche-'+n.id;carrier.userData.editTarget='niche:'+n.id;local.add(carrier);
   const l=(n.u-n.width/2)/100,r=(n.u+n.width/2)/100,b=n.bottom/100,t=(n.bottom+n.height)/100;
   const edges={left:[[l,b,0],[l,t,0]],right:[[r,b,0],[r,t,0]],bottom:[[l,b,0],[r,b,0]],top:[[l,t,0],[r,t,0]]};
   const choices=nicheProfileEdges(n);
   for(const [edge,[a,z]]of Object.entries(edges)){const own=choices[edge];strip(carrier,a,z,'niche_'+edge,false,{own:own!==undefined,enabled:!!own&&own!=='none',color:own&&own!=='none'?own:undefined,inlay:true});}
  }
  // A vertical decorative zone is the tiled column/band. Its edge profiles use
  // the same hit targets, overrides and inspector as partition edge profiles.
  for(const z of finishes[i]?.zones||[]){
   const carrier=new T.Group();carrier.userData.profileKey='zone-'+z.id;carrier.userData.editTarget='zone:'+z.id;local.add(carrier);
   const l=z.x/100,r=(z.x+z.width)/100,b=z.y/100,t=(z.y+z.height)/100;
   // Tiled wall columns carry vertical edge trims only, including legacy
   // projects whose old profile flag or overrides enabled a full perimeter.
   const edges={left:[[l,b,.004],[l,t,.004]],right:[[r,b,.004],[r,t,.004]]};
   for(const [edge,[a,end]]of Object.entries(edges)){const own=z.profileEdges?.[edge],enabled=own!==undefined?own!=='none':!!z.profile;strip(carrier,a,end,'colonne_carrelage_'+edge,false,{own:own!==undefined,enabled,color:own&&own!=='none'?own:z.profileColor||'Argent',inlay:true});}
  }
 }
 for(const item of items){if(item.type!=='bath'||item.settings.kind==='island'||item.settings.apron!=='tile')continue;const local=new T.Group();local.position.copy(item.root.position);local.rotation.copy(item.root.rotation);local.userData.itemId=item.id;local.userData.editTarget='bath';const carrier=new T.Group();carrier.userData.profileKey='bath-'+item.id;carrier.position.copy(item.asset.root.position);local.add(carrier);group.add(local);const w=item.dimensions.width,d=item.dimensions.depth,z=-.23+d+.003,h=.558;for(const x of [-w/2,w/2]){strip(carrier,[x,0,z],[x,h,z],'angle_baignoire',false);strip(carrier,[x,h,-.23],[x,h,z],'rive_baignoire',false);}strip(carrier,[-w/2,h,z],[w/2,h,z],'rive_baignoire',false);}
 return {group,parts,details,entries,metres:parts.reduce((n,l)=>n+l,0)};
}

// Niche/zone dialogs and the clicked-edge inspector edit the same persisted
// property. Legacy global overrides remain a read fallback for untouched edges.
export function updateAttachedProfile({room,config,finishes},id,patch){
 const [key,kind]=String(id||'').split('|');if(key?.startsWith('partition-')&&['angle_externe','rive_cloison'].includes(kind)){const wall=room?.walls?.find(w=>w.key===key),source=wall&&config?.partitions?.[wall.partition];if(!source)return false;const x=Number(String(id).split('|')[2]?.split(',')[0]),edge=kind==='rive_cloison'?'top':(x<wall.length/2?(wall.partitionSide?'b':'a'):(wall.partitionSide?'a':'b'));const edges={...source.profileEdges};if(patch===null)delete edges[edge];else{if(patch.color&&!['Argent','Noir','Doré','Bronze'].includes(patch.color))return false;edges[edge]=patch.enabled===false?'none':patch.color||(['Argent','Noir','Doré','Bronze'].includes(edges[edge])?edges[edge]:'Argent');}source.profileEdges=edges;room.partitions[wall.partition].profileEdges={...edges};return true;}const match=/^(?:niche_|colonne_carrelage_)(left|right|top|bottom)$/.exec(kind||'');
 if(!match)return false;const edge=match[1];let source,copies=[];
 if(key.startsWith('niche-')&&kind.startsWith('niche_')){const nicheId=key.slice(6);source=config?.niches?.find(n=>n.id===nicheId);if(!source)return false;copies=(room?.walls||[]).flatMap(w=>(w.niches||[]).filter(n=>n.id===nicheId));}
 else if(key.startsWith('zone-')&&kind.startsWith('colonne_carrelage_')){const zoneId=key.slice(5);source=(finishes||[]).flatMap(f=>f?.zones||[]).find(z=>z.id===zoneId);if(!source)return false;}
 else return false;
 const niche=kind.startsWith('niche_'),allowed=color=>niche?isNicheProfileFinish(color):['Argent','Noir','Doré','Bronze'].includes(color),edges={...source.profileEdges};
 if(patch===null)delete edges[edge];else{if(patch.color&&!allowed(patch.color))return false;edges[edge]=patch.enabled===false?'none':patch.color||(allowed(edges[edge])?edges[edge]:niche?(source.profileFinish||'Chrome brillant'):'Argent');}
 // An explicit clicked trim can re-enable a niche whose whole perimeter was off.
 if(niche&&patch?.enabled!==false&&patch!==null&&source.profileEnabled===false){source.profileEdges=nicheProfileEdges(source);Object.assign(edges,source.profileEdges,{[edge]:patch.color||source.profileFinish||'Chrome brillant'});source.profileEnabled=true;}
 source.profileEdges=edges;for(const copy of copies){copy.profileEdges={...edges};if(niche&&source.profileEnabled!==undefined)copy.profileEnabled=source.profileEnabled;}return true;
}
