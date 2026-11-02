import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createTopSet as studioCreateTopSet,vesselGeometry as studioVesselGeometry} from '@studio-one-original/tops.js';
import {TOP_OPTIONS,topSelection} from './anima-data.js';
export {TOP_OPTIONS,topSelection};
// Used only inside the untouched original Studio One factory, before its hidden
// RANDAL demonstration tops are replaced by the selected Anima components.
export const createTopSet=studioCreateTopSet;

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
    for(let i=0;i<=N;i++){const k=j*(N+1)+i,angle=i/N*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);a.setX(k,rx*Math.sign(c)*Math.abs(c)**(2/p));a.setZ(k,rz*Math.sign(s)*Math.abs(s)**(2/p));}
  }
  geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
function superContour(w,d,power=4.2,n=128){return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);return [w/2*Math.sign(c)*Math.abs(c)**(2/power),d/2*Math.sign(s)*Math.abs(s)**(2/power)];});}
function bowlGeometry(w,d,depth,power=4.2){
  // Same closed, concentric ceramic-shell construction as Studio One. Family
  // curvature follows the catalogue photographs; it is not manufacturing CAD.
  const profiles=[[1,1,0],[.985,.975,-.003],[.955,.935,-.012],[.87,.77,-depth*.53],[.68,.52,-depth*.87],[.34,.27,-depth*.97],[.075,.075,-depth],[.075,.075,-depth-.004],[.36,.30,-depth-.004],[.70,.57,-depth*.90],[.90,.82,-depth*.57],[1,1,-.016],[1,1,0]];
  const N=128,positions=[],uv=[],indices=[];
  for(let j=0;j<profiles.length;j++){const [sx,sz,y]=profiles[j];for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,c=Math.cos(a),s=Math.sin(a);positions.push(w/2*sx*Math.sign(c)*Math.abs(c)**(2/power),y,d/2*sz*Math.sign(s)*Math.abs(s)**(2/power));uv.push(i/N,j/(profiles.length-1));if(j<profiles.length-1&&i<N){const k=j*(N+1)+i,b=k+N+1;indices.push(k,b,k+1,b,b+1,k+1);}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function integratedFamily(top,basin,width){
  const ref=String(top.ref||'').toUpperCase();
  if(basin)return {w:(basin.width||48)/100,d:(basin.depth||30)/100,power:sourceShape(basin)==='oval'?2.1:sourceShape(basin)==='round'?2:5.0,depth:Math.min(.16,(basin.height||14)/100)};
  const room=width-.13;
  if(ref.startsWith('PIC'))return {w:Math.min(room,.88),d:.31,power:2.25,depth:.13};
  if(ref.startsWith('JUST'))return {w:width-.055,d:.33,power:7.4,depth:.12};
  if(ref.startsWith('TA'))return {w:width-.075,d:.33,power:7.4,depth:.14};
  if(ref.startsWith('BNT'))return {w:Math.min(room,.49),d:.28,power:3.9,depth:.14};
  if(ref.startsWith('TMS')||ref.startsWith('TM'))return {w:Math.min(room,.54),d:.30,power:7.0,depth:.14};
  if(ref.startsWith('TOS')||ref.startsWith('TO'))return {w:Math.min(room,.55),d:.30,power:4.0,depth:.14};
  return {w:Math.min(room,.54),d:.30,power:4.6,depth:.14};
}
export function buildAnimaTop({selection,ceramic,wood,chrome,surfaceY=.82,cabinetDepth=.46}){
  const root=new T.Group();root.name='NEOBATH_ANIMA_PLAN';root.userData.editTarget='basin';
  const solid=new T.Group(),drilled=new T.Group(),insets={},vessels={};root.add(solid,drilled);
  const all=[],ownedMaterials=[];const add=(g,m,name,parent=root,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;o.userData.editTarget='basin';parent.add(o);all.push(g);return o;};
  if(!selection?.top)return {root,solid,drilled,vessels,insets,centers:[],dispose(){all.forEach(g=>g.dispose());root.removeFromParent();}};
  const {top,basin}=selection,W=selection.topWidth/100,H=top.height/100,D=(top.depth||46.2)/100,Z=cabinetDepth/2-.23;
  const plateMaterial=top.subtype==='cover'?wood:basin?.subtype==='countertop'?ceramic.clone():ceramic;
  if(plateMaterial!==wood&&plateMaterial!==ceramic)ownedMaterials.push(plateMaterial);
  if(!selection.integrated){
    const parent=basin?drilled:solid;
    const deck=new T.Shape();const points=superContour(W,D,18,128);points.forEach(([x,z],i)=>i?deck.lineTo(x,z):deck.moveTo(x,z));deck.closePath();
    if(basin){const waste=new T.Path();waste.absarc(0,-.02,.024,0,Math.PI*2,true);deck.holes.push(waste);const tap=new T.Path();tap.absarc(0,D/2-.06,.017,0,Math.PI*2,true);deck.holes.push(tap);}
    const g=new T.ExtrudeGeometry(deck,{depth:H,steps:1,bevelEnabled:true,bevelSize:.00065,bevelThickness:.00065,bevelSegments:3,curveSegments:36});g.rotateX(-Math.PI/2);add(g,plateMaterial,'Plan_'+(top.ref||top.id),parent,0,surfaceY,Z);
    if(basin){const group=new T.Group();group.name='Vasque_'+(basin.ref||basin.id);group.position.set(0,surfaceY+H,Z+.015);root.add(group);const bowl=add(vesselGeometry(basin),ceramic,'Vasque_NEOBATH_'+(basin.ref||basin.id),group);add(new T.CylinderGeometry(.021,.021,.006,48),chrome,'Bonde',group,0,.020,0);add(new T.CylinderGeometry(.0315,.0315,.002,48),chrome,'Couvercle_bonde',group,0,.024,0);vessels[selection.mode]={group,bowl};}
  }else{
    const group=new T.Group();group.name='Lavabo_'+(basin?.ref||top.ref||top.id);group.userData.editTarget='basin';root.add(group);insets[selection.mode]=group;
    const count=selection.positions.length||1,family=integratedFamily(top,basin,W/count),wellW=Math.min(family.w,W/count-.07),wellD=Math.min(family.d,D-.10),wellZ=Z+.020;
    const plate=new T.Shape();const points=superContour(W,D,24);points.forEach(([x,z],i)=>i?plate.lineTo(x,z):plate.moveTo(x,z));plate.closePath();
    for(const x of selection.positions){const hole=new T.Path();const pts=superContour(wellW,wellD,family.power).reverse();pts.forEach(([xx,zz],i)=>i?hole.lineTo(xx+x,zz-.020):hole.moveTo(xx+x,zz-.020));hole.closePath();plate.holes.push(hole);const tap=new T.Path();tap.absarc(x,D/2-.055,.017,0,Math.PI*2,true);plate.holes.push(tap);}
    const g=new T.ExtrudeGeometry(plate,{depth:H,steps:1,bevelEnabled:true,bevelSize:.00065,bevelThickness:.00065,bevelSegments:3,curveSegments:36});g.rotateX(-Math.PI/2);add(g,ceramic,'Plan_lavabo_'+(top.ref||top.id),group,0,surfaceY,Z);
    for(const x of selection.positions){add(bowlGeometry(wellW,wellD,family.depth,family.power),ceramic,'Vasque_'+selection.mode.toUpperCase()+'_coque_3D',group,x,surfaceY+H,wellZ);add(new T.CylinderGeometry(.021,.021,.006,48),chrome,'Bonde',group,x,surfaceY+H-family.depth+.004,wellZ);add(new T.CylinderGeometry(.0315,.0315,.002,48),chrome,'Couvercle_bonde',group,x,surfaceY+H-family.depth+.009,wellZ);}
    group.userData.basinCenters=selection.positions;group.userData.basinLayout=selection.layout;
  }
  solid.visible=!basin&&!selection.integrated;drilled.visible=!!basin&&!selection.integrated;
  return {root,solid,drilled,vessels,insets,centers:selection.positions,topSurface:surfaceY+H,dispose(){all.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());root.removeFromParent();}};
}
