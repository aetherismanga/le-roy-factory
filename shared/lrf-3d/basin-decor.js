import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Real, centimetre-scale objects: silhouette, glass wall, seams and label remain
// detailed when approached. These are reusable scene props, not product photos.
let textileTexture=null,labelTexture=null;
function weaveTexture(){
 if(textileTexture)return textileTexture;
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const warp=Math.sin(x*Math.PI/2),weft=Math.sin(y*Math.PI/2),loop=Math.sin((x+y)*.73);
  const value=Math.round(154+warp*26+weft*25+loop*8),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 textileTexture=new T.DataTexture(data,size,size,T.RGBAFormat);
 textileTexture.wrapS=textileTexture.wrapT=T.RepeatWrapping;
 textileTexture.repeat.set(9,12);textileTexture.anisotropy=8;
 textileTexture.generateMipmaps=true;textileTexture.minFilter=T.LinearMipmapLinearFilter;
 textileTexture.userData.sharedDecorTexture=true;textileTexture.needsUpdate=true;return textileTexture;
}
function brandLabel(){
 if(labelTexture)return labelTexture;
 // A self-contained interpretation of the site's serif LE ROY / factory
 // wordmark. No network font or image race in exports, and no hidden prices.
 const canvas=typeof document!=='undefined'&&typeof document.createElement==='function'?document.createElement('canvas'):null;
 let ctx=null;
 try{ctx=canvas?.getContext?.('2d')??null;}catch{/* A DOM test double or unavailable Canvas2D keeps geometry usable. */}
 if(!ctx){
  labelTexture=new T.DataTexture(new Uint8Array([244,238,222,255]),1,1,T.RGBAFormat);
 }else{
  canvas.width=1024;canvas.height=1024;
  ctx.fillStyle='#f4eede';ctx.fillRect(0,0,1024,1024);
  ctx.strokeStyle='#b09358';ctx.lineWidth=3;ctx.strokeRect(46,46,932,932);
  ctx.textAlign='center';ctx.fillStyle='#292c27';ctx.font='400 132px Georgia, serif';ctx.fillText('LE ROY',512,350);
  ctx.font='300 57px Arial, sans-serif';ctx.fillText('F A C T O R Y',512,441);
  ctx.strokeStyle='#b09358';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(245,502);ctx.lineTo(779,502);ctx.stroke();
  ctx.font='36px Georgia, serif';ctx.fillText('Soin des mains',512,634);
  ctx.font='22px Arial, sans-serif';ctx.fillText('SAVON LIQUIDE',512,707);
  ctx.fillStyle='#7b735f';ctx.font='20px Arial, sans-serif';ctx.fillText('LE DÉTAIL FAIT LA DIFFÉRENCE',512,872);
  labelTexture=new T.CanvasTexture(canvas);
 }
 labelTexture.colorSpace=T.SRGBColorSpace;labelTexture.anisotropy=8;
 labelTexture.userData={brand:'LE ROY FACTORY',sharedDecorTexture:true};labelTexture.needsUpdate=true;return labelTexture;
}
function add(parent,geometry,material,x,y,z,name){
 const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.name=name;
 mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function lathe(points,segments=64){return new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),segments);}
function pathTube(points,r=.0005,segments=48){
 return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,5,false);
}
export function createDecorMaterials(){
 return {
  cloth:new T.MeshPhysicalMaterial({color:'#d1c5b1',roughness:.95,sheen:.75,sheenColor:'#d1c5b1',sheenRoughness:.92,bumpMap:weaveTexture(),bumpScale:.00035}),
  ceramic:new T.MeshPhysicalMaterial({color:'#e4e0d6',roughness:.3,clearcoat:.35,clearcoatRoughness:.23}),
  metal:new T.MeshPhysicalMaterial({color:'#a1a8a3',metalness:1,roughness:.21,clearcoat:.2}),
 };
}
export function addDecorBottle(parent,x,y,z,materials=createDecorMaterials()){
 const bottle=new T.Group();bottle.name='Flacon_Le_Roy_FACTORY';bottle.position.set(x,y,z);
 bottle.userData.brand='LE ROY FACTORY';bottle.userData.height=.113;parent.add(bottle);
 const glass=new T.MeshPhysicalMaterial({color:'#ab7640',roughness:.11,metalness:0,transmission:.55,thickness:.0022,ior:1.5,clearcoat:1,clearcoatRoughness:.06,attenuationColor:'#754219',attenuationDistance:.065});
 // Closed shell with inner wall and substantial base, rather than an opaque cylinder.
 const shell=lathe([[0,0],[.016,0],[.020,.002],[.021,.006],[.021,.065],[.0205,.071],[.018,.075],[.0115,.081],[.0105,.084],[.0105,.089],[.0088,.089],[.0088,.083],[.0098,.080],[.0168,.073],[.0188,.069],[.019,.008],[.016,.004],[0,.004]]);
 add(bottle,shell,glass,0,0,0,'Flacon');
 // Three's transmission buffer contains opaque objects, not another nested
 // transmissive layer. Keep the fill in that buffer so its meniscus survives
 // through the glass in the main view, mirror and HD capture alike.
 const liquid=new T.MeshPhysicalMaterial({color:'#b78a45',roughness:.18,ior:1.34,clearcoat:.28,clearcoatRoughness:.12});
 add(bottle,lathe([[0,.0045],[.016,.0045],[.0187,.008],[.0187,.060],[.018,.061],[0,.061]]),liquid,0,0,0,'Savon_ambre');
 const stem=new T.MeshStandardMaterial({color:'#dfd6be',roughness:.38});
 add(bottle,new T.CylinderGeometry(.0014,.0014,.070,12),stem,0,.040,0,'Tube_plongeur');
 add(bottle,new T.CylinderGeometry(.0116,.0116,.008,48),materials.metal,0,.088,0,'Bague_pompe');
 add(bottle,new T.TorusGeometry(.0107,.00065,6,48),materials.metal,0,.0918,0,'Joint_col').rotation.x=Math.PI/2;
 add(bottle,new T.CylinderGeometry(.0048,.0048,.013,32),materials.metal,0,.098,0,'Pompe');
 add(bottle,new RoundedBoxGeometry(.014,.006,.031,3,.0025),materials.metal,0,.108,.010,'Bec_pompe');
 add(bottle,new T.CylinderGeometry(.0018,.0018,.002,16),new T.MeshStandardMaterial({color:'#24251f',roughness:.7}),0,.104,.023,'Sortie_savon');
 const labelMaterial=new T.MeshStandardMaterial({map:brandLabel(),color:'#ffffff',roughness:.74,side:T.FrontSide});
 const labelGeometry=new T.CylinderGeometry(.02125,.02125,.043,48,1,true,-.85,1.7);
 const label=add(bottle,labelGeometry,labelMaterial,0,.040,0,'Etiquette_Le_Roy_FACTORY');
 label.userData.brand='LE ROY FACTORY';label.castShadow=false;
 return bottle;
}
export function addFoldedTowels(parent,x,y,z,materials=createDecorMaterials()){
 const stack=new T.Group();stack.name='Serviettes_pliees';stack.position.set(x,y,z);parent.add(stack);
 for(let i=0;i<3;i++){
  const towel=new T.Group();towel.name='Serviette_pliee';towel.position.set(i===1?.0015:0,.007+i*.014,i===1?-.002:0);towel.rotation.y=(i-1)*.025;stack.add(towel);
  const geometry=new RoundedBoxGeometry(.10,.014,.13,3,.004),positions=geometry.attributes.position;
  for(let n=0;n<positions.count;n++){
   const px=positions.getX(n),py=positions.getY(n),pz=positions.getZ(n);
   // Broad, sub-millimetre waviness; the fine weave remains a mipmapped bump.
   positions.setY(n,py+Math.sin(px*95+pz*36+i)*.00055*Math.max(0,py/.007));
  }
  geometry.computeVertexNormals();add(towel,geometry,materials.cloth,0,0,0,'Tissu_eponge');
  const hemMat=materials.cloth.clone();hemMat.color.set('#c8baa3');
  add(towel,pathTube([[-.043,.003,.062],[-.044,.004,.030],[-.044,.004,-.030],[-.043,.003,-.062]],.00055,24),hemMat,0,0,0,'Ourlet_cousu_gauche');
  add(towel,pathTube([[.043,.003,.062],[.044,.004,.030],[.044,.004,-.030],[.043,.003,-.062]],.00055,24),hemMat,0,0,0,'Ourlet_cousu_droit');
  add(towel,pathTube([[-.044,-.001,.063],[0,-.002,.064],[.044,-.001,.063]],.00045,24),hemMat,0,0,0,'Pli_serviette');
 }
 return stack;
}
export function addHangingTowel(parent,x,y,z,w=.17,h=.31,materials=createDecorMaterials()){
 const group=new T.Group();group.name='Serviette_suspendue';group.position.set(x,y,z);parent.add(group);
 const geometry=new T.PlaneGeometry(w,h,32,44),p=geometry.attributes.position;
 const depth=(px,py)=>Math.sin(px/w*Math.PI*10)*.0035+Math.sin(py/h*Math.PI)*.008;
 for(let i=0;i<p.count;i++)p.setZ(i,depth(p.getX(i),p.getY(i)));
 geometry.computeVertexNormals();const mat=materials.cloth.clone();mat.side=T.DoubleSide;
 add(group,geometry,mat,0,0,0,'Tissu_serviette');
 for(const sign of [-1,1]){
  const points=[];for(let i=0;i<=32;i++){const px=-w/2+w*i/32,py=sign*(h/2-.005);points.push([px,py,depth(px,py)+.00035]);}
  add(group,pathTube(points,.0005,48),mat,0,0,0,'Ourlet_serviette');
 }
 return group;
}
function leafGeometry(){
 const g=new T.PlaneGeometry(1,1,4,14),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const t=p.getY(i)+.5,across=p.getX(i)*2;
  p.setXYZ(i,across*Math.pow(Math.sin(t*Math.PI),.7)*.5,t,Math.sin(t*Math.PI)*.14+across*across*.08);
 }
 g.computeVertexNormals();return g;
}
export function addDecorPlant(parent,x,y,z,materials=createDecorMaterials()){
 const plant=new T.Group();plant.name='Plante_decorative';plant.position.set(x,y,z);parent.add(plant);
 const pot=lathe([[0,0],[.023,0],[.026,.003],[.034,.062],[.035,.067],[.0345,.070],[.0315,.070],[.031,.065],[.023,.007],[0,.007]],48);
 add(plant,pot,materials.ceramic,0,0,0,'Pot');
 add(plant,new T.CylinderGeometry(.0305,.0305,.003,32),new T.MeshStandardMaterial({color:'#514437',roughness:1}),0,.062,0,'Terreau');
 const m=new T.MeshPhysicalMaterial({color:'#526d43',roughness:.67,side:T.DoubleSide,sheen:.18,sheenColor:'#93a77e'});
 const leaves=new T.InstancedMesh(leafGeometry(),m,14),matrix=new T.Matrix4();
 for(let i=0;i<14;i++){
  const a=i*2.399,outer=i<9,position=new T.Vector3(Math.cos(a)*.010,.063,Math.sin(a)*.010);
  const rotation=new T.Quaternion().setFromEuler(new T.Euler(outer?.56:.22,a,outer?.22:.08));
  matrix.compose(position,rotation,new T.Vector3(outer?.023:.018,outer?.085:.105,.075));leaves.setMatrixAt(i,matrix);
 }
 leaves.name='Feuillage';leaves.castShadow=leaves.receiveShadow=true;plant.add(leaves);return plant;
}
export function addDecorSoap(parent,x,y,z,materials=createDecorMaterials()){
 return add(parent,new RoundedBoxGeometry(.07,.024,.043,4,.008),materials.ceramic,x,y,z,'Savon');
}
