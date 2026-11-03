import * as T from 'three';
import {createTopSet as studioCreateTopSet,vesselGeometry as studioVesselGeometry} from '@studio-one-original/tops.js';
import {TOP_OPTIONS,topSelection} from './anima-data.js';
import {animaWellLayout,animaBasinStyle} from './top-profiles.js';
export {TOP_OPTIONS,topSelection};
// Used only inside the untouched original Studio One factory, before its hidden
// RANDAL demonstration tops are replaced by the selected Anima components.
export const createTopSet=studioCreateTopSet;

function profileTrig(angle){const c=Math.cos(angle),s=Math.sin(angle);return [Math.abs(c)<1e-12?0:c,Math.abs(s)<1e-12?0:s];}
function closedProfileNormals(geometry,N=128){
  geometry.computeVertexNormals();const normals=geometry.attributes.normal,rows=geometry.attributes.position.count/(N+1),v=new T.Vector3();
  const average=(a,b)=>{v.set(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();normals.setXYZ(a,v.x,v.y,v.z);normals.setXYZ(b,v.x,v.y,v.z);};
  for(let j=0;j<rows;j++)average(j*(N+1),j*(N+1)+N);
  for(let i=0;i<=N;i++)average(i,(rows-1)*(N+1)+i);
  return geometry;
}
function sourceShape(p){const ref=String(p?.ref||'').toUpperCase(),shape=p?.basinGeometry||p?.shape||'';
  if(/FO01|B578|ECLISSE116/.test(ref))return 'round';
  if(/FO03/.test(ref))return 'square';
  if(/FO04|PF149380|ECLISSE114|B571|B860|B861|B862/.test(ref))return 'rectangle';
  if(/FO02|CVR45|ECLISSE115/.test(ref))return 'oval';
  return /round|circle|rond/.test(shape)?'round':/oval|ovale/.test(shape)?'oval':'rectangle';
}
export function vesselGeometry(product){
  const shape=sourceShape(product),round=shape==='round'||shape==='oval';
  const geometry=studioVesselGeometry(round?'torne':'neris'),a=geometry.attributes.position;
  const w=(product.width||40)/100,d=(product.depth||40)/100,h=(product.height||14)/100;
  // Preserve Studio One's closed outer/inner shells, rim and waste opening,
  // changing only the manufacturer outer dimensions and family proportions.
  const baseW=round?.37:.46,baseD=round?.37:.33,baseH=round?.12:.14;
  for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i);a.setXYZ(i,x*w/baseW,a.getY(i)*h/baseH,z*d/baseD);}
  const power=round?2:/B571|B860|B861|B862/i.test(product.ref||'')?12:shape==='square'?8:4.5,N=128;
  for(let j=0;j<a.count/(N+1);j++){
    let rx=0,rz=0;for(let i=0;i<=N;i++){rx=Math.max(rx,Math.abs(a.getX(j*(N+1)+i)));rz=Math.max(rz,Math.abs(a.getZ(j*(N+1)+i)));}
    const p=rx<.035||rz<.035?2:power;
    for(let i=0;i<=N;i++){const k=j*(N+1)+i,angle=i/N*Math.PI*2,[c,s]=profileTrig(angle);a.setX(k,rx*Math.sign(c)*Math.abs(c)**(2/p));a.setZ(k,rz*Math.sign(s)*Math.abs(s)**(2/p));}
  }
  closedProfileNormals(geometry);geometry.computeBoundingBox();return geometry;
}
function superContour(w,d,power=4.2,n=128){return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,[c,s]=profileTrig(a);return [w/2*Math.sign(c)*Math.abs(c)**(2/power),d/2*Math.sign(s)*Math.abs(s)**(2/power)];});}
function deckContour(w,d,r=.003){
  const result=[],radius=Math.min(r,w/2,d/2),n=16;
  for(let corner=0;corner<4;corner++){const a=corner*Math.PI/2,cx=(corner===0||corner===3?1:-1)*(w/2-radius),cz=(corner<2?1:-1)*(d/2-radius);
    for(let i=0;i<=n;i++){const [c,s]=profileTrig(a+i/n*Math.PI/2);result.push([cx+c*radius,cz+s*radius]);}
  }return result;
}
function worldPath(points,outer=false){
  // The deck is drafted in world X/Z and then extruded along Y. A -90 degree
  // X rotation sends local shape Y to world -Z, so convert exactly once here.
  const local=points.map(([x,z])=>new T.Vector2(x,-z));
  if(T.ShapeUtils.isClockWise(local)!==outer)local.reverse();
  const path=outer?new T.Shape():new T.Path();
  local.forEach((p,i)=>i?path.lineTo(p.x,p.y):path.moveTo(p.x,p.y));path.closePath();return path;
}
function circleContour(x,z,r,n=64){return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return [x+Math.cos(a)*r,z+Math.sin(a)*r];});}
function plateGeometry(W,D,H,holes=[]){
  const b=Math.min(.00045,H/10),shape=worldPath(deckContour(W-2*b,D-2*b),true);
  for(const points of holes)shape.holes.push(worldPath(points));
  const g=new T.ExtrudeGeometry(shape,{depth:H-2*b,steps:1,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:3,curveSegments:48});
  g.rotateX(-Math.PI/2);g.translate(0,b,0);g.computeBoundingBox();g.userData.animaUVSpace='metres';return g;
}
function insertGeometry(w,d,height,power){
  const shape=worldPath(superContour(w,d,power),true),g=new T.ExtrudeGeometry(shape,{depth:height-.001,steps:1,bevelEnabled:true,bevelSize:.0005,bevelThickness:.0005,bevelSegments:2});g.rotateX(-Math.PI/2);g.translate(0,.0005,0);g.computeBoundingBox();return g;
}
function bowlGeometry(w,d,depth,power=4.2,{panels=false,slope=false}={}){
  // Reuse the Studio One closed ceramic-shell construction, with a circular
  // waste neck. Top opening, exterior and underside are one watertight shell.
  const profiles=panels?[{sx:1,sz:1,y:0},{sx:.985,sz:.975,y:-.003},{sx:.965,sz:.94,y:-.010},{sx:.93,sz:.86,y:-depth*.90},{sx:.84,sz:.76,y:-depth},{sx:.34,sz:.27,y:-depth},{radius:.021,y:-depth},{radius:.021,y:-depth-.006},{radius:.027,y:-depth-.006},{sx:.85,sz:.77,y:-depth-.006},{sx:.94,sz:.87,y:-depth*.92},{sx:.98,sz:.96,y:-.016},{sx:1,sz:1,y:0}]:[{sx:1,sz:1,y:0},{sx:.985,sz:.975,y:-.003},{sx:.955,sz:.935,y:-.012},{sx:.87,sz:.77,y:-depth*.53},{sx:.68,sz:.52,y:-depth*.87},{sx:.34,sz:.27,y:-depth*.97},{radius:.021,y:-depth},{radius:.021,y:-depth-.006},{radius:.027,y:-depth-.006},{sx:.36,sz:.30,y:-depth-.006},{sx:.70,sz:.57,y:-depth*.90},{sx:.90,sz:.82,y:-depth*.57},{sx:1,sz:1,y:-.016},{sx:1,sz:1,y:0}];
  const N=128,positions=[],uv=[],indices=[];
  for(let j=0;j<profiles.length;j++){
    const profile=profiles[j],rx=profile.radius||w/2*profile.sx,rz=profile.radius||d/2*profile.sz,p=profile.radius?2:panels?24:power;
    for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,[c,s]=profileTrig(a),z=rz*Math.sign(s)*Math.abs(s)**(2/p),fall=slope?Math.min(1,Math.max(0,(-profile.y-.010)/(depth-.010)))*.045*z/d:0;positions.push(rx*Math.sign(c)*Math.abs(c)**(2/p),profile.y+fall,z);uv.push(i/N,j/(profiles.length-1));if(j<profiles.length-1&&i<N){const k=j*(N+1)+i,b=k+N+1;indices.push(k,b,k+1,b,b+1,k+1);}}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);closedProfileNormals(g);g.computeBoundingBox();return g;
}
export {bowlGeometry as animaBowlGeometry};
function semiRecessedCutout(geometry,level){
  // Intersect the outside wall of the existing Studio One closed shell with
  // the mounting plane. The catalogue gives no mounting section: only the
  // vertical placement is a preview reconstruction, not a fabrication cutout.
  const p=geometry.attributes.position,N=128,points=[];
  for(let i=0;i<N;i++){
    let segment=0;
    while(segment<4&&p.getY((segment+1)*(N+1)+i)<level)segment++;
    const a=segment*(N+1)+i,b=a+N+1,ratio=T.MathUtils.clamp((level-p.getY(a))/(p.getY(b)-p.getY(a)),0,1);
    const x=T.MathUtils.lerp(p.getX(a),p.getX(b),ratio),z=T.MathUtils.lerp(p.getZ(a),p.getZ(b),ratio),scale=1+.0006/Math.hypot(x,z);
    points.push([x*scale,z*scale]);
  }return points;
}

export function buildAnimaTop({selection,ceramic,wood,chrome,planMaterial=null,bowlMaterial=null,surfaceY=.82,cabinetDepth=.46}){
  const root=new T.Group();root.name='NEOBATH_ANIMA_PLAN';root.userData.editTarget='basin';root.userData.animaWorktopTarget=true;
  const solid=new T.Group(),drilled=new T.Group(),insets={},vessels={};root.add(solid,drilled);
  const geometries=new Set(),ownedMaterials=[],surfaceMeshes=[],bowlMeshes=[];
  const add=(g,m,name,parent=root,x=0,y=0,z=0,role='bowl')=>{const o=new T.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;o.userData.editTarget='basin';o.userData.animaSurfaceRole=role;if(['bowl','drain','drain-cover','drain-slot','basin-floor','basin-accessory'].includes(role)){o.userData.animaBasinTarget=true;o.userData.animaBasinId=selection?.basin?.id||selection?.mode;}parent.add(o);geometries.add(g);if(role==='deck')surfaceMeshes.push(o);else if(role==='bowl')bowlMeshes.push(o);return o;};
  const dispose=()=>{geometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());root.removeFromParent();};
  const ceramicBowl=bowlMaterial||ceramic;let previewBasinRise=0;
  if(!selection?.top)return {root,solid,drilled,vessels,insets,centers:[],previewBasinRise,planMaterial:planMaterial||ceramic,bowlMaterial:ceramicBowl,surfaceMeshes,bowlMeshes,dispose};
  const {top,basin}=selection,W=selection.topWidth/100,H=top.height/100,D=(selection.previewDepth??top.depth??46.2)/100,Z=cabinetDepth/2-.23+(selection.previewDepth-(selection.referenceDepth??selection.previewDepth))/200;
  if(![W,H,D,surfaceY,Z].every(Number.isFinite)||W<=0||D<=0||H<=0)throw Error('Dimensions de plan Anima invalides.');
  const plateMaterial=planMaterial||(top.subtype==='cover'?wood:basin?.subtype==='countertop'?ceramic.clone():ceramic);
  if(!planMaterial&&plateMaterial!==wood&&plateMaterial!==ceramic)ownedMaterials.push(plateMaterial);
  const style=animaBasinStyle(top,basin),description={productId:top.id,reference:top.ref,width:W,height:H,depth:D,surfaceY,topSurface:surfaceY+H,zOffset:Z,wells:[],tapHoles:[],basinStyle:style,accessories:[]};
  const wasteCover=(well,parent=root)=>{
    const y=surfaceY+H-well.innerDepth+.008,z=Z+well.z;
    if(style.drain==='rectangular-matched')add(plateGeometry(Math.min(.09,well.width*.18),Math.min(.06,well.depth*.18),.004),ceramicBowl,'Bonde_rectangulaire_assortie',parent,well.x,y,z,'drain-cover');
    else if(style.drain==='round-matched')add(new T.CylinderGeometry(.029,.029,.004,64),ceramicBowl,'Bonde_ronde_assortie',parent,well.x,y+.002,z,'drain-cover');
    else if(style.drain==='full-length-matched')add(plateGeometry(well.width*.88,.020,.005),ceramicBowl,'Bonde_assortie_toute_longueur',parent,well.x,y,z-well.depth*.29,'drain-cover');
    else if(style.drain==='continuous-slot'){
      const floorY=surfaceY+H-well.innerDepth,fall=.045,plate=add(plateGeometry(well.width*.78,well.depth*.67,.004),ceramicBowl,'Pente_fixe_sans_bonde_apparente',parent,well.x,floorY+.005,z,'basin-floor');plate.rotation.x=-Math.atan(fall/well.depth);
      const dark=new T.MeshStandardMaterial({color:'#202523',roughness:.8});ownedMaterials.push(dark);add(new T.BoxGeometry(well.width*.78,.003,.010),dark,'Evacuation_continue_pente_fixe',parent,well.x,floorY-fall*.35+.002,z-well.depth*.35,'drain-slot');
    }else {add(new T.CylinderGeometry(.021,.021,.006,64),chrome,'Bonde',parent,well.x,y-.005,z,'drain');add(new T.CylinderGeometry(.0315,.0315,.002,64),chrome,'Couvercle_bonde',parent,well.x,y,z,'drain');}
  };
  if(!selection.integrated){
    const parent=basin?drilled:solid,holes=[];
    const vesselZ=selection.positionsZ?.[0]??.020,vesselX=selection.positions?.[0]??0,semiRecessed=basin?.subtype==='semi-recessed',vesselShape=basin?vesselGeometry(basin):null;
    const fullHeight=vesselShape?.boundingBox.max.y||0,recessDepth=semiRecessed?Math.max(0,fullHeight-.025):0;
    previewBasinRise=fullHeight-recessDepth;
    if(basin){
      if(semiRecessed){
        const cutout=semiRecessedCutout(vesselShape,recessDepth).map(([x,z])=>[x+vesselX,z+vesselZ]);holes.push(cutout);
        description.reconstruction={mounting:'semi-recessed',sourcePdfPage:75,approximate:true,rimRise:previewBasinRise,recessDepth,note:'Implantation semi-encastrée reconstruite pour la prévisualisation; cote d’encastrement et découpe à confirmer sur le gabarit fabricant.'};
      }else holes.push(circleContour(vesselX,vesselZ,.024));
      const radius=.017,clearance=.012,edge=.007,basinW=(basin.width||40)/100,basinD=(basin.depth||40)/100;
      const rearZ=vesselZ-basinD/2-clearance-radius;
      let tap=rearZ-radius>=-D/2+edge?{x:vesselX,z:rearZ,radius,rotationY:0}:null;
      if(!tap){
        const side=vesselX>0?-1:1,sideX=vesselX+side*(basinW/2+clearance+radius);
        if(Math.abs(sideX)+radius<=W/2-edge)tap={x:sideX,z:vesselZ,radius,rotationY:side>0?-Math.PI/2:Math.PI/2};
      }
      if(tap){holes.push(circleContour(tap.x,tap.z,radius));description.tapHoles.push({...tap,z:tap.z+Z});description.tapMount='deck';}
      else description.tapMount='wall';
    }
    add(plateGeometry(W,D,H,holes),plateMaterial,'Plan_'+(top.ref||top.id),parent,0,surfaceY,Z,'deck');
    if(basin){
      const group=new T.Group();group.name='Vasque_'+(basin.ref||basin.id);group.position.set(vesselX,surfaceY+H-recessDepth,Z+vesselZ);root.add(group);
      const bowl=add(vesselShape,ceramicBowl,'Vasque_NEOBATH_'+(basin.ref||basin.id),group);
      if(style.drain==='rectangular-matched')add(plateGeometry(.073,.050,.003),ceramicBowl,'Bonde_rectangulaire_assortie',group,0,.024,0,'drain-cover');
      else {add(new T.CylinderGeometry(.021,.021,.006,64),chrome,'Bonde',group,0,.020,0,'drain');add(new T.CylinderGeometry(.0315,.0315,.002,64),chrome,'Couvercle_bonde',group,0,.024,0,'drain');}vessels[selection.mode]={group,bowl};
      if(/^ECLISSE/.test(basin.ref||'')&&(selection.basinBottom==='tvl'||selection.basinSupport)){
        const code=(basin.ref.match(/ECLISSE(\d+)/)||[])[1],power=sourceShape(basin)==='round'?2:sourceShape(basin)==='oval'?2.1:5,w=basin.width/100*(power===5?.76:.82),d=basin.depth/100*(power===5?.76:.82),level=.052;
        const white=new T.MeshPhysicalMaterial({color:'#f6f5f1',roughness:.56,metalness:0,clearcoat:0}),black=new T.MeshStandardMaterial({color:'#202322',roughness:.7});ownedMaterials.push(white,black);
        const feet=(material,name)=>{for(const x of[-w*.34,w*.34])for(const z of[-d*.30,d*.30])add(new T.CylinderGeometry(.005,.006,.019,16),material,name,group,x,level-.010,z,'basin-accessory');};
        if(selection.basinSupport){
          for(const z of[-d*.32,d*.32])add(new T.BoxGeometry(w*.75,.005,.010),black,'Support_ABS_noir_SUP'+code,group,0,level-.004,z,'basin-accessory');feet(black,'Pied_support_ABS');description.accessories.push({ref:'SUP'+code,kind:'black-abs-support',approximate:true,sourcePdfPage:75});
        }
        if(selection.basinBottom==='tvl'){add(insertGeometry(w,d,.004,power),white,'Tablette_amovible_TVL'+code,group,0,level,0,'basin-accessory');if(!selection.basinSupport)feet(white,'Pied_tablette_TVL');description.accessories.push({ref:'TVL'+code,kind:'removable-white-bottom',approximate:true,sourcePdfPage:75});}
      }
      description.wells.push({x:vesselX,z:Z+vesselZ,width:basin.width/100,depth:basin.depth/100,height:basin.height==null?null:basin.height/100,rimRise:previewBasinRise,recessDepth,kind:semiRecessed?'semi-recessed':'countertop'});
    }
  }else{
    const group=new T.Group();group.name='Lavabo_'+(basin?.ref||top.ref||top.id);group.userData.editTarget='basin';root.add(group);insets[selection.mode]=group;
    const wells=animaWellLayout(selection),holes=[];if(!wells)throw Error('La largeur fabricant ou la profondeur de la cuve est incompatible avec cette implantation.');
    for(const well of wells){holes.push(superContour(well.width,well.depth,well.power).map(([xx,zz])=>[xx+well.x,zz+well.z]));holes.push(circleContour(well.tapX,well.tapZ,well.tapRadius));}
    add(plateGeometry(W,D,H,holes),plateMaterial,'Plan_lavabo_'+(top.ref||top.id),group,0,surfaceY,Z,'deck');
    for(const well of wells){
      add(bowlGeometry(well.width,well.depth,well.innerDepth,well.power,style),ceramicBowl,'Vasque_'+selection.mode.toUpperCase()+'_coque_3D',group,well.x,surfaceY+H,Z+well.z);
      wasteCover(well,group);
      description.wells.push({...well,z:Z+well.z,kind:'integrated'});description.tapHoles.push({x:well.tapX,z:Z+well.tapZ,radius:well.tapRadius,rotationY:0});
    }
    group.userData.basinCenters=selection.positions;group.userData.basinLayout=selection.layout;group.userData.animaWells=description.wells;
  }
  if(description.wells.length){
    const plumbing=new T.Group();plumbing.name='Siphons_Anima';plumbing.userData.editTarget='basin';root.add(plumbing);description.plumbing=[];
    for(const [index,well]of description.wells.entries()){
      const drainY=well.kind==='integrated'?description.topSurface-well.innerDepth:description.topSurface-(well.recessDepth||0)+.018,trapY=Math.min(surfaceY-.18,drainY-.035),x=well.x,z=well.z;
      const points=[new T.Vector3(x,drainY,z),new T.Vector3(x,trapY+.025,z),new T.Vector3(x,trapY,-.205)];
      add(new T.TubeGeometry(new T.CatmullRomCurve3(points),28,.012,16,false),chrome,'Siphon_tube_'+(index+1),plumbing,0,0,0,'plumbing');
      add(new T.CylinderGeometry(.022,.024,.045,32),chrome,'Siphon_corps_'+(index+1),plumbing,x,trapY+.007,z,'plumbing');
      description.plumbing.push({x,z,drainY,trapY,approximate:true,note:'Siphon de prévisualisation ; encombrement et raccordement fabricant à confirmer.'});
    }
  }
  root.userData.animaTop=description;solid.visible=!basin&&!selection.integrated;drilled.visible=!!basin&&!selection.integrated;
  return {root,solid,drilled,vessels,insets,centers:selection.positions,topSurface:surfaceY+H,previewBasinRise,planMaterial:plateMaterial,bowlMaterial:ceramicBowl,surfaceMeshes,bowlMeshes,dispose};
}
