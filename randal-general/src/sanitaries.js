import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeTap,tapProduct,metalMaterial} from './taps.js';
export const SANITARIES=[
 {id:'TR2217R',name:'AMARO VORTEX',type:'toilet',width:.36,depth:.48,height:.36,finish:'Blanc brillant',page:44},
 {id:'TR2217R-U18',name:'AMARO BLACK VORTEX',type:'toilet',width:.36,depth:.48,height:.36,finish:'Noir mat',page:44},
 {id:'TR2224',name:'KRAL',type:'toilet',width:.36,depth:.615,height:.745,floor:true,finish:'Blanc brillant',page:54},
 {id:'STR4335',name:'DALIA',type:'washstand',width:.55,depth:.31,height:.125,finish:'Blanc brillant',page:30},
 {id:'TR443',name:'TRIXIE',type:'washstand',width:.625,depth:.285,height:.15,finish:'Blanc brillant',page:29,note:'Catalogue : 62,5 × 28,5 × 15 cm ; le tarif JSON indique 44 × 27 × 15 cm. Cote PDF retenue.'}
];
export const PLUMBING=[
 {id:'Chrome brillant',trap:'31141112704',drain:'000550'}, {id:'Noir mat',trap:'31141112708',drain:'000553'}, {id:'Or brossé',trap:'31141112709',drain:'000558'}, {id:'Cuivre',trap:'31141112705',drain:'000559'}, {id:'Inox brossé',trap:'31141112760',drain:'000556'}, {id:'Gris canon',trap:'31141112706',drain:'000566'}, {id:'Blanc mat',trap:'31141112703',drain:'000552'}
];
export const sanitarySpec=s=>SANITARIES.find(p=>p.id===s.reference)||SANITARIES[0];
// The catalogue gives overall dimensions/photos, not manufacturer CAD. Closed
// multi-profile ceramic shells preserve the hollow interior and physical rims.
function shell(profiles,centreX,centreZ,power=2){const positions=[],indices=[],uv=[],n=96;for(let j=0;j<profiles.length;j++){const [rx,rz,y]=profiles[j];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);positions.push(centreX+rx*Math.sign(c)*Math.abs(c)**(2/power),y,centreZ+rz*Math.sign(s)*Math.abs(s)**(2/power));uv.push(i/n,j/profiles.length);if(j<profiles.length-1&&i<n){const k=j*(n+1)+i;indices.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
export function makeSanitary(type,s={}){const p=sanitarySpec(s),root=new T.Group();root.userData.editTarget=type;root.userData.reference=p.id;root.name=p.name+'_'+p.id;const ceramic=new T.MeshPhysicalMaterial({color:p.id.includes('U18')?'#292a2b':'#f1f0e9',roughness:p.id.includes('U18')?.65:.16,clearcoat:p.id.includes('U18')?.04:.75,ior:1.5}),metal=metalMaterial(s.metal||'Chrome brillant');
 const add=(g,m,name,x=0,y=0,z=0,parent=root)=>{const o=new T.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;},box=(w,h,d,x,y,z,name,m=ceramic,parent=root)=>add(new RoundedBoxGeometry(w,h,d,3,Math.min(.006,h/4,d/4)),m,name,x,y,z,parent),cyl=(r,h,x,y,z,name)=>add(new T.CylinderGeometry(r,r,h,48),metal,name,x,y,z);
 if(type==='toilet'){
  const floor=!!p.floor,z=-.23+(floor?.135:0)+.24,H=floor?.40:.36;
  const bowl=add(shell([[.11,.15,0],[.15,.205,.07],[.18,.24,H-.025],[.18,.24,H-.01],[.16,.215,H],[.145,.19,H-.025],[.12,.15,H-.09],[.05,.07,.10],[.035,.045,.08],[.035,.045,.02],[.11,.15,0]],0,z,2.6),ceramic,'Cuvette_creuse');
  const seatShape=new T.Shape().absellipse(0,0,.174,.23,0,Math.PI*2,false);seatShape.holes.push(new T.Path().absellipse(0,0,.137,.183,0,Math.PI*2,true));const seatG=new T.ExtrudeGeometry(seatShape,{depth:.012,bevelEnabled:true,bevelSize:.002,bevelThickness:.001,bevelSegments:2,curveSegments:64});seatG.rotateX(-Math.PI/2);add(seatG,ceramic,'Lunette',0,H-.007,z);
  const lid=new T.Group();lid.name='Abattant';lid.position.set(0,H+.006,z-.20);root.add(lid);const shape=new T.Shape().absellipse(0,0,.175,.231,0,Math.PI*2,false),g=new T.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:true,bevelSize:.002,bevelThickness:.001,bevelSegments:2,curveSegments:64});g.rotateX(-Math.PI/2);add(g,ceramic,'Couvercle',0,0,.20,lid);lid.rotation.x=s.lidOpen?-Math.PI*.48:0;
  if(floor){box(.29,.40,.27,0,.20,-.23+.24,'Pied');box(.345,.345,.155,0,.5725,-.23+.0775,'Reservoir');box(.355,.016,.165,0,.737,-.23+.08,'Couvercle_reservoir');cyl(.022,.004,0,.747,-.23+.08,'Bouton_double_chasse');}
  else box(.32,.28,.035,0,.155,-.23+.02,'Dos_fixation');
  const angle=lid.rotation.x;lid.rotation.x=0;const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),content=new T.Group();while(root.children.length)content.add(root.children[0]);content.scale.set(p.width/size.x,p.height/size.y,p.depth/size.z);content.position.set(-(bounds.min.x+bounds.max.x)/2*content.scale.x,-bounds.min.y*content.scale.y,-.23-bounds.min.z*content.scale.z);root.add(content);lid.rotation.x=angle;root.updateMatrixWorld(true);const actualHeight=new T.Box3().setFromObject(root).getSize(new T.Vector3()).y;
  return {root,spec:p,dimensions:{width:p.width,depth:p.depth,height:actualHeight,base:0},ceramic};
 }
 const trixie=p.id==='TR443',W=p.width,D=p.depth,H=p.height,x=trixie?.13:0,z=-.23+D/2;
 if(trixie){add(shell([[.08,.06,0],[.15,.115,.03],[.182,.1425,H-.008],[.18,.14,H],[.162,.12,H-.008],[.14,.095,.06],[.026,.026,.025],[.026,.026,.005],[.08,.06,0]],x,z),ceramic,'Vasque_ovale');box(.26,.018,D,-W/2+.13,H-.009,z,'Tablette');box(.26,.022,.02,-W/2+.13,.016,z+D/2-.01,'Porte_serviettes');box(.018,H,D,-W/2+.009,H/2,z,'Joue_tablette');}
 else{add(shell([[W/2-.01,D/2-.01,0],[W/2,D/2,H-.006],[W/2-.006,D/2-.006,H],[W/2-.023,D/2-.05,H-.005],[.20,.08,.025],[.025,.025,.012],[.025,.025,0],[W/2-.01,D/2-.01,0]],0,z,10),ceramic,'Vasque_rectangle');box(W-.02,.012,.055,0,H-.006,-.23+.035,'Plage_robinetterie');}
 const drain=s.drain==='square'?'000560':PLUMBING.find(p=>p.id===(s.metal||'Chrome brillant'))?.drain||'000550';if(s.drain==='square')box(.07,.005,.07,x,.03,z,'Bonde_'+drain,metal);else cyl(.0315,.005,x,.03,z,'Bonde_'+drain);
 cyl(.016,.18,x,-.09,z,'Tube_vertical_G1_1_4');if(s.trap==='square')box(.05,.128,.05,x,-.235,z,'Siphon_31141112702',metal);else cyl(.035,.18,x,-.22,z,'Siphon_'+(PLUMBING.find(p=>p.id===(s.metal||'Chrome brillant'))?.trap||'31141112704'));
 const outlet=add(new T.CylinderGeometry(.016,.016,D/2,32),metal,'Sortie_D32',x,-.23,z-D/4);outlet.rotation.x=Math.PI/2;
 const tap=makeTap(tapProduct(s.tap,'basin'));tap.name='Mitigeur_lave_mains';tap.position.set(trixie?-.025:0,H,-.23+.036);root.add(tap);
 const overflow=add(new T.CircleGeometry(.008,32),metal,'Trop_plein',x,H-.035,-.23+.055);overflow.rotation.x=.1;
 return {root,spec:p,ceramic,dimensions:{width:W,depth:D,height:H+.19,base:0,clearanceBelow:.31}};
}
