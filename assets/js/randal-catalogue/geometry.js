/* Catalogue général uniquement. Géométrie paramétrique issue des dessins V04 ; ce ne sont pas des modèles usine. */
(()=>{'use strict';
window.RandalGeometry=function(THREE,resources){
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),strip=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let scene,environment=resources.environment;
const woodCodes=['nogal','roble','serenade','fresno','biscuit','lagom','natura','lincoln'];
const finishRGB={
 'blanco':'#eeeae2','noir':'#252825','negro':'#272827',
 'serenade':'#bba58a','nogal lincoln':'#8f5636','nogal valentina':'#6e4730',
 'nogal mist':'#937154','roble amazona':'#bd9973','roble natura':'#c2a581',
 'fresno lagom':'#c4ad85','biscuit':'#d2c2a8','gris':'#929391',
 'verde utopia':'#638473','azul ceylan':'#506d83','azul acero':'#637e90',
 'vert celadon':'#8c9f8c','bleu':'#6e8199','gris clair':'#c9c8c0',
 'blanc casse':'#e9e2d4','rose':'#bc8c88','taupe':'#9a8881',
 'argent':'#bdc0c1','dore':'#c1a26a','bronze':'#8a6950',
 'anthracite':'#5d6061','vert namibie':'#717866','bleu kivu':'#193c5c',
 'rose nadir':'#c49d94','blanc ivoire':'#efede3','blanc pur':'#f9f8f3','blanc brillant':'#fafaf7'
};
function colorFor(str,fallback='#aaa39a'){
 const s=strip(str);
 for(const [k,v] of Object.entries(finishRGB).sort((a,b)=>b[0].length-a[0].length))if(s.includes(k))return v;
 return fallback;
}
function putBox(parent,x,y,z,w,h,d,material){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.004,w),Math.max(.004,h),Math.max(.004,d)),material);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function elliptical(parent,x,y,z,r1,r2,mat,rotation=-Math.PI/2){
 const mesh=new THREE.Mesh(new THREE.TorusGeometry(1,.022,12,64),mat);
 mesh.rotation.x=rotation;mesh.scale.set(r1,r2,Math.max(.1,(r1+r2)/2));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function newMat(hex,rough=.6,metal=0){return new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal})}
function addFixtures(root,config,width,height,depth,wood){
 if(config.basinMode==='none'||config.kind==='column')return;
 const basinGroup=new THREE.Group();
 basinGroup.name='RANDAL_Change_Basin';
 basinGroup.userData={randalSelectBasin:true};
 root.add(basinGroup);
 const ceramic=new THREE.MeshPhysicalMaterial({color:'#f8f7f3',roughness:.19,metalness:0,clearcoat:.24,clearcoatRoughness:.24,side:THREE.DoubleSide});
 const chrome=new THREE.MeshStandardMaterial({color:'#b9bdbe',roughness:.18,metalness:.86});
 const vesselCeramic=new THREE.MeshPhysicalMaterial({color:colorFor(config.basinFinish,'#f5f4ee'),roughness:.23,metalness:0,clearcoat:.22,side:THREE.DoubleSide});
 const vesselMode=config.basinMode==='vessel';
 const counterSurface=vesselMode?newMat(colorFor(config.topFinish,'#e9e5dd'),.45,.03):ceramic;
 const twin=!vesselMode&&(config.basinLayout==='double'||width>1.3);
 const sinks=Array.from({length:twin?2:1},(_,i)=>twin?(i===0?-1:1)*width*.255:!vesselMode&&width>1.15&&config.model!=='Luce'?width*.24:0);
 const isHarmonyBasin=!vesselMode;
 // Les cuves intégrées suivent le modèle choisi : Sella elliptique, Tampa à angles adoucis.
 // Deux cuves sont modélisées seulement pour Harmony 120 cm lorsque la double vasque est choisie.
 const tampa=strip(config.basin).includes('tampa');
 const unitWidth=width/(twin?2:1);
 const basinWidth=config.model==='Less'?.28:Math.min(twin?.44:.53,Math.max(.36,unitWidth*(tampa?.77:.73)));
 const rw=basinWidth/2,rd=Math.min(tampa?.137:.158,depth*.34);
 const profilePower=tampa?4.7:2.05;
 const basinPoint=(angle,scale=1)=>{
  const c=Math.cos(angle),sn=Math.sin(angle),pow=2/profilePower;
  return [Math.sign(c)*Math.pow(Math.abs(c),pow)*rw*scale,Math.sign(sn)*Math.pow(Math.abs(sn),pow)*rd*scale];
 };
 if(isHarmonyBasin){
  // Plan de céramique avec découpes RÉELLES (extrusion avec trous).
  // L'ancien plan plein masquait la cuve et donnait l'impression d'une vasque dessinée.
  const w2=(Number(config.commercialWidth||config.width)/100)/2,d2=depth/2;
  const shape=new THREE.Shape();
  shape.moveTo(-w2,-d2);shape.lineTo(w2,-d2);shape.lineTo(w2,d2);shape.lineTo(-w2,d2);shape.closePath();
  sinks.forEach(x=>{
   const hole=new THREE.Path();
   // Tracé dans le sens horaire, comme attendu pour l'extrusion d'un trou.
   for(let j=0;j<=96;j++){
    const [dx,dz]=basinPoint(Math.PI*2-j*Math.PI*2/96);
    if(j===0)hole.moveTo(x+dx,-.035-dz);else hole.lineTo(x+dx,-.035-dz);
   }
   shape.holes.push(hole);
  });
  const plate=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.027,steps:1,bevelEnabled:false,curveSegments:64}),ceramic);
  plate.rotation.x=-Math.PI/2;
  plate.position.set(0,height+.003,0);
  plate.receiveShadow=true;plate.castShadow=true;basinGroup.add(plate);
 }else{
  if(config.kind!=='counter')putBox(basinGroup,0,height+.015,0,width+.025,.027,depth+.012,counterSurface);
 }
 for(const x of sinks){
  if(vesselMode){
   const neris=strip(config.basin).includes('neris');
   // Neris ovale / Torne ronde, fond concave et épaisseur de céramique visible.
   const r=neris?.159:.179,h=(neris?.14:.12)-.006;
   const profile=[
    new THREE.Vector2(.014,.01),new THREE.Vector2(r*.42,.008),
    new THREE.Vector2(r*.78,.015),new THREE.Vector2(r*.94,h*.55),
    new THREE.Vector2(r,h),new THREE.Vector2(r*.962,h),new THREE.Vector2(r*.90,h*.43),new THREE.Vector2(r*.64,.023),new THREE.Vector2(.014,.022)
   ];
   const mesh=new THREE.Mesh(new THREE.LatheGeometry(profile,72),vesselCeramic);
   mesh.position.set(x,height+(config.kind==='counter'?.002:.031),.027);mesh.scale.set(neris?46/33:1,1,1);
   mesh.castShadow=true;mesh.receiveShadow=true;basinGroup.add(mesh);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(r,.006,12,80),vesselCeramic);
   rim.rotation.x=-Math.PI/2;rim.position.set(x,height+(config.kind==='counter'?.002:.031)+h,.027);
   rim.scale.set(neris?46/33:1,1,1);basinGroup.add(rim);
  }else if(isHarmonyBasin){
   // Véritable cuvette 3D en creux : ellipse douce Sella ou rectangle arrondi Tampa.
   // Le profil de la cuvette suit exactement la découpe pratiquée dans le plan.
   const ringCount=16,segments=96,positions=[],indices=[];
   for(let r=0;r<=ringCount;r++){
    const scale=1-r/ringCount*.995;
    const cy=height+.029-.092*(1-scale*scale);
    for(let j=0;j<=segments;j++){
     const [dx,dz]=basinPoint(j*Math.PI*2/segments,scale);
     positions.push(x+dx,cy,.035+dz);
    }
   }
   for(let r=0;r<ringCount;r++)for(let j=0;j<segments;j++){
    const a=r*(segments+1)+j,b=a+segments+1;
    indices.push(a,b,a+1,b,b+1,a+1);
   }
   const bowlGeo=new THREE.BufferGeometry();
   bowlGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   bowlGeo.setIndex(indices);bowlGeo.computeVertexNormals();
   const bowl=new THREE.Mesh(bowlGeo,ceramic);
   bowl.receiveShadow=true;bowl.castShadow=true;basinGroup.add(bowl);
   const rimPoints=[];
   for(let j=0;j<=96;j++){
    const [dx,dz]=basinPoint(j*Math.PI*2/96);
    rimPoints.push(new THREE.Vector3(x+dx,height+.031,.035+dz));
   }
   const rim=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints,true),128,.006,8,true),ceramic);
   basinGroup.add(rim);
   const drain=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.003,32),chrome);
   drain.position.set(x,height-.062,.035);basinGroup.add(drain);
  }else{
   // Autres collections : ne pas modifier le type de vasque non validé.
   elliptical(basinGroup,x,height+.046,.035,rw,rd,ceramic);
   const drain=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.003,24),chrome);
   drain.position.set(x,height+.048,.035);basinGroup.add(drain);
  }
 }
 // Pas de robinet fictif : la robinetterie ne fait pas partie de cette configuration.
}
function mirror(config,w,topHeight){
 if(config.mirror==='Sans miroir'||!config.mirror)return;
 const name=strip(config.mirror);
 const frameColor=name.includes('metal')?colorFor(config.mirrorFinish,'#292b29'):'#d9d6ce';
 const frame=newMat(frameColor,.24,.8);
 const mirrorSurface=new THREE.MeshPhysicalMaterial({color:'#f2f4f4',roughness:.055,metalness:1,envMap:environment,envMapIntensity:1.05});
 const highlight=newMat('#edf7f5',.09,.25);
 const vals=String(config.mirrorSize||'').match(/\d+/g)?.map(Number)||[];
 let mw=(vals[0]||80)/100,mh=(vals[1]||vals[0]||75)/100;
 mw=clamp(mw,.40,1.3);mh=clamp(mh,.40,1.0);
 if(name.includes('rond'))mh=mw;
 if(name.includes('capsula')){mw=.45;mh=.9}
 const cy=config.mirrorY??Math.max(1.24,topHeight+.18+mh*.5),z=-.60;
 if(name.includes('rond')||name.includes('capsula')){
  const capsule=name.includes('capsula');const shape=new THREE.Shape();
  if(capsule){
   const rad=mw/2;const hh=mh/2;
   shape.moveTo(-rad,-hh+rad);shape.lineTo(-rad,hh-rad);
   shape.absarc(0,hh-rad,rad,Math.PI,0,true);
   shape.lineTo(rad,-hh+rad);shape.absarc(0,-hh+rad,rad,0,Math.PI,true);
  }else shape.absarc(0,0,mw/2,0,Math.PI*2);
  const geo=new THREE.ShapeGeometry(shape,40);
  const glass=new THREE.Mesh(geo,mirrorSurface);glass.position.set(0,cy,z+.028);scene.add(glass);
  const points=shape.getPoints(90).map(p=>new THREE.Vector3(p.x,p.y,0));
  const edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:frameColor}));
  edge.position.set(0,cy,z+.045);scene.add(edge);
  const glint=putBox(scene,-mw*.16,cy+mh*.14,z+.047,mw*.2,.009,.002,highlight);
  glint.rotation.z=.75;
 }else{
  putBox(scene,0,cy,z,mw+(name.includes('metal')?.027:.003),mh+(name.includes('metal')?.027:.003),.018,frame);
  putBox(scene,0,cy,z+.028,mw-.016,mh-.016,.006,mirrorSurface);
  const glint=putBox(scene,-mw*.26,cy+mh*.26,z+.034,mw*.27,.007,.003,highlight);
  glint.rotation.z=.78;
 }
 if(name.includes('led')){
  const glow=new THREE.MeshBasicMaterial({color:'#eaf8f8'});
  if(name.includes('capsula')){const border=new THREE.Mesh(new THREE.CapsuleGeometry(mw/2+.006,mh-mw,8,32),glow);border.scale.z=.02;border.position.set(0,cy,z-.005);scene.add(border)}else putBox(scene,0,cy,z-.005,mw+.014,mh+.014,.009,glow);
  const led= new THREE.PointLight(0xe6f2ff,.85,.8);led.position.set(0,cy,z+.13);scene.add(led);
 }
}

function isWood(color){return woodCodes.some(k=>strip(color).includes(k))}
function finish(config){
 const mat=newMat(colorFor(config.color),isWood(config.color)?.67:.39);
 if(config.swatch)resources.finish(config.swatch).then(texture=>{if(texture&&!resources.disposed()){mat.map=texture;mat.color.set('#ffffff');mat.needsUpdate=true;resources.invalidate()}}).catch(()=>{});
 return mat;
}
function door(parent,x,y,z,w,h,mat,motions,hinge='left'){
 const pivot=new THREE.Group(),sign=hinge==='left'?1:-1;
 pivot.position.set(x-sign*w/2,y,z);parent.add(pivot);
 putBox(pivot,sign*w/2,0,0,w-.006,h,.018,mat);
 motions.push({object:pivot,kind:'door',sign,travel:Math.PI*.48});return pivot;
}
function harmonyDrawerFloor(group,width,depth,base,material,topDrawer,doubleWaste){
 const innerW=width-.096,bodyDepth=depth-.115;
 const frontZ=depth/2-.040,backZ=frontZ-bodyDepth;
 const floorY=base+.018;
 const cutDepth=Math.min(.18,bodyDepth*.62),notch=.19;
 const partitionH=.128,partitionY=base+.018+partitionH/2;
 if(!topDrawer){
  putBox(group,0,floorY,(frontZ+backZ)/2,innerW,.009,bodyDepth,material);
  return;
 }
 const cuts=doubleWaste?[-width*.245,width*.245]:[0];
 const rearStart=backZ,rearEnd=backZ+cutDepth;
 // Avant de la découpe : fond plein jusqu'à la façade.
 putBox(group,0,floorY,(frontZ+rearEnd)/2,innerW,.009,frontZ-rearEnd,material);
 let x0=-innerW/2;
 for(const c of cuts){
  let l=clamp(c-notch/2,-innerW/2,innerW/2);
  if(l>x0+.005){
   putBox(group,(x0+l)/2,floorY,(rearStart+rearEnd)/2,l-x0,.009,cutDepth,material);
   putBox(group,(x0+l)/2,partitionY,rearStart+.006,l-x0,partitionH,.012,material);
  }
  const start=clamp(c-notch/2,-innerW/2,innerW/2);
  const end=clamp(c+notch/2,-innerW/2,innerW/2);
  // Retour fermé du siphon: deux joues longitudinales et un fond de U côté tiroir.
  for(const x of [start,end])putBox(group,x,partitionY,(rearStart+rearEnd)/2,.012,partitionH,cutDepth,material);
  putBox(group,(start+end)/2,partitionY,rearEnd-.006,end-start+.012,partitionH,.012,material);
  x0=end;
 }
 if(x0<innerW/2-.005){
  putBox(group,(x0+innerW/2)/2,floorY,(rearStart+rearEnd)/2,innerW/2-x0,.009,cutDepth,material);
  putBox(group,(x0+innerW/2)/2,partitionY,rearStart+.006,innerW/2-x0,partitionH,.012,material);
 }
}


function furniture(config){
 const root=new THREE.Group(),motions=[],w=Number(config.width)/100,h=Number(config.height)/100,d=Number(config.depth)/100;
 root.name=config.model+'_'+config.reference;
 const mat=finish(config),inside=newMat('#c8c3b9',.76),metal=newMat(config.model==='Brent'&&config.color.includes('or vieilli')?'#ae925b':'#aab0b4',.32,.75),edge=newMat(colorFor(config.color),.6),s=.016;
 const column=config.kind==='column',less=config.model==='Less',counter=config.kind==='counter';
 const legs=(config.model==='Brent'||!column&&config.typeId.startsWith('three'))?.12:0;
 const lower=legs,H=h-lower;
 if(counter){putBox(root,0,h/2,0,w,h,d,mat)}else{
  putBox(root,-w/2+s/2,lower+H/2,0,s,H,d,mat);putBox(root,w/2-s/2,lower+H/2,0,s,H,d,mat);
  putBox(root,0,lower+s/2,0,w-.032,s,d,inside);putBox(root,0,lower+H/2,-d/2+s/2,w-.032,H-.02,s,inside);
  putBox(root,0,h-.012,-d/2+.018,w-.032,.024,.036,inside);
  if(column||less){
   putBox(root,0,h-.008,0,w-.032,.016,d,inside);
   // Two interior shelves; hinged fronts remain independent from the case.
   for(const k of [1/3,2/3])putBox(root,0,lower+H*k,0,w-.034,.014,d-.03,inside);
   const brent=column&&config.model==='Brent',cols=brent&&w>.5?2:1,rows=less?1:2,niche=brent?.14:0;
   if(niche)putBox(root,0,lower+niche,0,w-.035,.016,d-.02,inside);
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const dw=(w-.028)/cols,dh=(H-niche-.018)/rows,x=(col-(cols-1)/2)*dw,y=lower+niche+(row+.5)*(H-niche)/rows;
    const right=cols===2&&col===1;
    const pivot=door(root,x,y,d/2+.012,dw,dh-.006,mat,motions,right?'right':'left');
    const sign=right?-1:1;
    if(less||brent)putBox(pivot,sign*dw*.80,0,.016,.015,.055,.018,metal);
    if(brent){for(const xx of[.025,dw-.025])putBox(pivot,sign*xx,0,.011,.027,dh-.035,.008,mat);for(const yy of[-dh/2+.025,dh/2-.025])putBox(pivot,sign*dw/2,yy,.011,dw-.035,.027,.008,mat);}
   }

  }else{
   const sideDoor=config.typeId.includes('door'),fixedPanel=config.model==='Amat'&&!sideDoor,dw=sideDoor||fixedPanel?w*.70:w,dx=sideDoor?-w*.15:fixedPanel?w*.15:0;
   const niche=config.typeId==='niche'?.16:0,count=config.typeId==='single'?1:config.typeId.startsWith('three')?3:2;
   const step=(H-.025-niche)/count;
   for(let i=0;i<count;i++){
    const group=new THREE.Group(),y=h-.014-(i+.5)*step,base=y-step/2;
    root.add(group);group.name='Tiroir_'+(i+1);
    putBox(group,dx,y,d/2+.012,dw-.028,step-.007,.018,mat);
    const bodyD=Math.max(.10,d-.11);
    for(const xx of [dx-dw/2+.042,dx+dw/2-.042])putBox(group,xx,base+.066,-.016,.012,.115,bodyD,inside);
    if(config.model==='Harmony')harmonyDrawerFloor(group,dw,d,base,inside,i===0,config.basinLayout==='double');else putBox(group,dx,base+.014,-.016,dw-.09,.012,bodyD,inside);
    if(!(config.model==='Harmony'&&i===0))putBox(group,dx,base+.067,-bodyD/2-.016,dw-.09,.115,.012,inside);
    const handleless=!['Brent','Amat'].includes(config.model);
    if(handleless)putBox(group,dx,y+step/2-.012,d/2+.024,dw-.05,.004,.007,edge);
    else putBox(group,dx,y+step*.30,d/2+.030,Math.min(.33,dw*.50),.009,.017,metal);
    if(config.model==='Aruba rainuré')for(let n=0;n<Math.floor(dw/.018);n++)putBox(group,dx-dw/2+.025+n*.018,y,d/2+.023,.002,step-.016,.003,edge);
    motions.push({object:group,kind:'drawer',travel:Math.min(.265,d*.55)});
   }
   if(fixedPanel){putBox(root,-w*.35,lower+H/2,d/2+.012,w*.30-.022,H-.026,.018,mat);putBox(root,-w*.20,lower+H/2,0,.016,H,d,inside);}
   if(sideDoor){
    const sw=w*.30;
    putBox(root,w*.20,lower+H/2,0,.016,H,d,inside);
    door(root,w*.35,lower+H/2,d/2+.012,sw-.024,H-.026,mat,motions,'right');
   }
   if(niche)putBox(root,0,lower+niche/2,-d/2+.025,w-.04,niche-.01,.01,inside);
  }
  if(legs)for(const xx of [-w/2+.045,w/2-.045])for(const zz of [-d/2+.05,d/2-.05])putBox(root,xx,legs/2,zz,.025,legs,.025,metal);
 }
 if(!column){
  if(less){addFixtures(root,{...config,basinMode:'integrated',basin:'Tampa',commercialWidth:40},w,h,d,mat)}
  else addFixtures(root,config,w,h,d,mat);
 }
 return {root,motions,w,h,d};
}
function mirrors(config,topHeight){
 scene=new THREE.Group();if(!config.mirror||config.mirror==='Sans miroir')return scene;
 // Use exactly the same real planar mirror/LED/frame renderer as STUDIO ONE.
 if(resources.mirrorRenderer){
  const name=config.mirror,vals=String(config.mirrorSize||'').match(/\d+/g)?.map(Number)||[60,80];
  let w=(vals[0]||80)/100,h=(vals[1]||vals[0]||80)/100; // exact catalogue dimensions
  if(strip(name).includes('rond'))h=w;
  const frameColor=/métallique|metallique/i.test(name)?colorFor(config.mirrorFinish,'#292b29'):'#b7bbb8';
  const visual=resources.mirrorRenderer.create(name,w,h,{on:/LED/i.test(name),frameColor});
  visual.position.set(0,config.mirrorY??Math.max(1.24,topHeight+.18+h*.5),-.60);
  scene.add(visual);return scene;
 }
 mirror(config,Number(config.width)/100,topHeight);return scene;
}
return {furniture,mirrors,colorFor};
};})();
