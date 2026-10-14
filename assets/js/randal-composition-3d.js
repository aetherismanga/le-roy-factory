/* RANDAL — Visualisation 3D paramétrique indicative. Modèles usine 3D non fournis.
   Dimensions et options reprises du configurateur ; Three.js chargé à la demande. */
(function(){
'use strict';
const THREE_URLS=['https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js','https://unpkg.com/three@0.152.2/build/three.min.js'];
let libraryPromise=null,renderer=null,scene=null,camera=null,stage=null,resizeObserver=null,raf=0;
let yaw=.47,pitch=.22,distance=3.55,lastPointer=null,lastPinch=null;
let active=false,previousFocus=null,restoreOverflow='',current=null,sessionId=0,contextFailed=false;
const $=id=>document.getElementById(id);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const strip=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const labels={integrated:'Vasque sur meuble',vessel:'Plan et vasque à poser',none:'Meuble sans vasque'};
const woodCodes=['nogal','roble','serenade','fresno','biscuit','lagom','natura','lincoln'];
const finishRGB={
 'blanco':'#eeeae2','noir':'#252825','negro':'#272827',
 'serenade':'#bba58a','nogal lincoln':'#8f5636','nogal valentina':'#6e4730',
 'nogal mist':'#937154','roble amazona':'#bd9973','roble natura':'#c2a581',
 'fresno lagom':'#c4ad85','biscuit':'#d2c2a8','gris':'#929391',
 'verde utopia':'#638473','azul ceylan':'#506d83','azul acero':'#637e90',
 'vert celadon':'#8c9f8c','bleu':'#6e8199','gris clair':'#c9c8c0',
 'blanc casse':'#e9e2d4','rose':'#bc8c88','taupe':'#9a8881',
 'argent':'#bdc0c1','dore':'#c1a26a','bronze':'#8a6950'
};
function colorFor(str,fallback='#aaa39a'){
 const s=strip(str);
 for(const [k,v] of Object.entries(finishRGB))if(s.includes(k))return v;
 return fallback;
}
function label(id,value){const n=$(id);if(n)n.textContent=String(value||'—')}
function modal(){
 let el=$('randal-composition-dialog');
 if(el)return el;
 el=document.createElement('div');el.id='randal-composition-dialog';el.className='composition-overlay';el.hidden=true;
 el.innerHTML='<div class="composition-shade" data-close="1"></div>'+
 '<section class="composition-window" role="dialog" aria-modal="true" aria-labelledby="composition-heading">'+
 '<header class="composition-top"><div><span class="composition-eyebrow">RANDAL · VISUALISATION</span><h2 id="composition-heading">Votre salle de bain</h2></div>'+
 '<button type="button" class="composition-close" id="composition-close" aria-label="Fermer l’aperçu">×</button></header>'+
 '<div class="composition-layout"><div class="composition-stage-area">'+
 '<div id="composition-canvas" class="composition-canvas" role="img" aria-label="Modèle 3D manipulable de votre composition RANDAL">'+
 '<div class="composition-loading" id="composition-loading">Préparation de votre aperçu 3D…</div></div>'+
 '<p class="composition-gesture">Glissez pour tourner le meuble · Pincez pour zoomer</p>'+
 '<div class="composition-view-tools"><button type="button" id="composition-front">Vue de face</button><button type="button" id="composition-angle">Vue de côté</button><button type="button" id="composition-photo">Enregistrer l’image</button></div>'+
 '</div><aside class="composition-details"><div class="composition-label">VOTRE COMPOSITION</div><h3 id="composition-model"></h3>'+
 '<div class="composition-selected"><div><span>Dimensions</span><strong id="composition-size"></strong></div>'+
 '<div><span>Finition du meuble</span><strong id="composition-color"></strong></div>'+
 '<div><span>Vasque / plan</span><strong id="composition-basin"></strong></div>'+
 '<div><span>Miroir</span><strong id="composition-mirror"></strong></div></div>'+
 '<div class="composition-swatch"><img id="composition-swatch" alt="Échantillon de la finition retenue"></div>'+
 '<p class="composition-disclaimer">Projection 3D indicative : les proportions, la disposition et les teintes sont simulées à partir de votre sélection. Les dessins, caractéristiques et échantillons RANDAL font référence.</p>'+
 '</aside></div><div class="composition-footer"><button id="composition-back" type="button">Retour au récapitulatif</button></div></section>';
 document.body.appendChild(el);
 $('composition-close').addEventListener('click',close);
 $('composition-back').addEventListener('click',close);
 el.querySelector('[data-close]').addEventListener('click',close);
 $('composition-front').addEventListener('click',()=>{yaw=0;pitch=.12;moveCamera();});
 $('composition-angle').addEventListener('click',()=>{yaw=.63;pitch=.21;moveCamera();});
 $('composition-photo').addEventListener('click',saveImage);
 el.addEventListener('keydown',e=>{if(e.key==='Tab'){const items=[...el.querySelectorAll('button:not(:disabled)')];const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 return el;
}
// Release CPU buffers, GPU textures and WebGL contexts after EVERY preview.
function releaseRenderer(){
 cancelAnimationFrame(raf);raf=0;
 if(resizeObserver){resizeObserver.disconnect();resizeObserver=null}
 if(scene){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  scene.traverse(object=>{
   if(object.geometry)geometries.add(object.geometry);
   if(object.material){
    const mats=Array.isArray(object.material)?object.material:[object.material];
    mats.forEach(mat=>{if(mat)materials.add(mat)});
   }
  });
  materials.forEach(mat=>{
   for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','envMap']){
    if(mat[key]&&typeof mat[key].dispose==='function')textures.add(mat[key]);
   }
  });
  textures.forEach(texture=>texture.dispose());
  geometries.forEach(geo=>geo.dispose());
  materials.forEach(mat=>mat.dispose());
 }
 if(renderer){
  const currentRenderer=renderer;renderer=null;
  try{currentRenderer.dispose();currentRenderer.forceContextLoss?.()}catch(err){console.warn('Libération WebGL RANDAL',err)}
  try{currentRenderer.domElement.remove()}catch(err){}
 }
 scene=null;camera=null;stage=null;lastPointer=null;lastPinch=null;
}
function close(){
 const el=$('randal-composition-dialog');if(!el||el.hidden)return;
 active=false;sessionId++;el.hidden=true;document.body.style.overflow=restoreOverflow;
 releaseRenderer();
 current=null;
 if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
}

function ensureThree(){
 if(window.THREE)return Promise.resolve(window.THREE);
 if(!libraryPromise){libraryPromise=new Promise((resolve,reject)=>{
  function load(index){
   if(index>=THREE_URLS.length){reject(new Error('Chargement du moteur 3D bloqué'));return;}
   const script=document.createElement('script');
   script.src=THREE_URLS[index];script.async=true;script.crossOrigin='anonymous';
   script.onload=()=>window.THREE?resolve(window.THREE):load(index+1);
   script.onerror=()=>load(index+1);
   document.head.appendChild(script);
  }
  load(0);
 }).catch(err=>{libraryPromise=null;throw err});}
 return libraryPromise;
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
function woodTexture(hex,grain){
 const c=document.createElement('canvas');c.width=256;c.height=256;
 const ctx=c.getContext('2d');ctx.fillStyle=hex;ctx.fillRect(0,0,256,256);
 let seed=41792;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let n=0;n<125;n++){const x=random()*256;const w=.5+random()*2;
 ctx.beginPath();ctx.strokeStyle=grain?(random()>.4?'rgba(43,25,14,.14)':'rgba(251,234,199,.12)'):'rgba(255,255,255,.045)';
 ctx.lineWidth=w;ctx.moveTo(x,0);ctx.bezierCurveTo(x+random()*11-5,70,x+random()*11-5,175,x+random()*7-3,256);ctx.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);t.anisotropy=2;
 return t;
}
function isWood(color){return woodCodes.some(k=>strip(color).includes(k))}
function useCatalogueFinish(material,url){
 if(!url)return;
 const generation=sessionId;
 const image=new Image();
 image.onload=()=>{
  if(!active||generation!==sessionId||!scene||!material)return;
  // La pastille du catalogue est circulaire : on ne prélève que le coeur
  // afin de ne jamais étirer le fond ivoire autour sur le meuble.
  const c=document.createElement('canvas');c.width=256;c.height=256;
  const ctx=c.getContext('2d',{alpha:false});
  const size=Math.min(image.naturalWidth,image.naturalHeight)*.66;
  const xx=(image.naturalWidth-size)/2,yy=(image.naturalHeight-size)/2;
  ctx.filter='contrast(1.10) saturate(1.06)';
  ctx.drawImage(image,xx,yy,size,size,0,0,256,256);
  ctx.filter='none';
  const texture=new THREE.CanvasTexture(c);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(1.2,1.0);texture.anisotropy=2;
  if(material.map)material.map.dispose();
  material.color.set('#ffffff');
  material.map=texture;
  material.needsUpdate=true;
  requestFrame();
 };
 image.onerror=()=>{};
 image.src=url;
}
function addFixtures(root,config,width,height,depth,wood){
 const metallic=newMat('#a98b5b',.26,.75);
 const white=newMat('#f4f0e8',.17,.09);
 const bowl=newMat('#dad7cf',.30,.05);
 const choice=config.basinMode;
 if(choice==='none'||config.kind==='column')return;
 let top=white;
 if(choice==='vessel')top=newMat(colorFor(config.topFinish,'#eae4d6'),.3,.04);
 putBox(root,0,height+.01,0,width+.045,.038,depth+.04,top);
 const twoBowls=width>1.12&&choice==='integrated'&&config.model==='Harmony';
 const count=twoBowls?2:1;
 for(let i=0;i<count;i++){
  const x=count===1?0:((i===0?-1:1)*width*.255);
  const r=choice==='vessel'?.145:Math.min(width/count*.28,.175);
  if(choice==='vessel'){
   const profile=[[0,.016],[r*.32,.012],[r*.68,.035],[r*.90,.11],[r,.143]];
   const points=profile.map(p=>new THREE.Vector2(p[0],p[1]));
   const mesh=new THREE.Mesh(new THREE.LatheGeometry(points,40),white);
   mesh.position.set(x,height+.033,.058);mesh.castShadow=true;root.add(mesh);
   putBox(root,x,height+.061,.058,r*1.25,.009,r*.95,bowl);
  }else{
   putBox(root,x,height+.032,.035,r*1.75,.005,r*1.20,bowl);
   elliptical(root,x,height+.040,.035,r,r*.73,white);
   const drain=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.002,18),metallic);
   drain.position.set(x,height+.037,.03);root.add(drain);
  }
  // Faucet: vertical column, horizontal spout and handle.
  const faucet=putBox(root,x+.12,height+.12,-depth*.26,.024,.18,.025,metallic);
  const spout=putBox(root,x+.07,height+.21,-depth*.25+.08,.115,.016,.018,metallic);
  putBox(root,x+.14,height+.215,-depth*.26,.045,.011,.012,metallic);
 }
}
function mirror(config,w,topHeight){
 if(config.mirror==='Sans miroir'||!config.mirror)return;
 const name=strip(config.mirror);
 const frameColor=name.includes('metal')?colorFor(config.mirrorFinish,'#292b29'):'#d9d6ce';
 const frame=newMat(frameColor,.24,.8);
 const mirrorSurface=newMat('#aebfc5',.10,.80);
 const highlight=newMat('#edf7f5',.09,.25);
 const vals=String(config.mirrorSize||'').match(/\d+/g)?.map(Number)||[];
 let mw=(vals[0]||80)/100,mh=(vals[1]||vals[0]||75)/100;
 mw=clamp(mw,.40,1.3);mh=clamp(mh,.40,1.0);
 if(name.includes('rond'))mh=mw;
 if(name.includes('capsula')){mw=.45;mh=.9}
 const cy=Math.max(1.24,topHeight+.27+mh*.5),z=-.373;
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
  putBox(scene,0,cy,z,mw+.027,mh+.027,.033,frame);
  putBox(scene,0,cy,z+.028,mw-.016,mh-.016,.006,mirrorSurface);
  const glint=putBox(scene,-mw*.26,cy+mh*.26,z+.034,mw*.27,.007,.003,highlight);
  glint.rotation.z=.78;
 }
 if(name.includes('led')){
  const led= new THREE.PointLight(0xe6f2ff,.85,.8);led.position.set(0,cy,z+.13);scene.add(led);
 }
}
function buildScene(config){
 scene=new THREE.Scene();scene.background=new THREE.Color('#e9e5dd');
 // Éclairage doux : les anciennes intensités surexposaient entièrement les bois.
 const ambient=new THREE.HemisphereLight(0xfffcf3,0xb2aaa0,1.0);scene.add(ambient);
 const light=new THREE.DirectionalLight(0xffffff,1.65);light.position.set(-1.4,3.3,3.7);light.castShadow=false;
 // Les ombres temps réel sont désactivées pour éviter la surcharge du GPU en rendez-vous.
 light.shadow.bias=-.00012;scene.add(light);
 const accent=new THREE.PointLight(0xffecd0,3.8,7);accent.position.set(1.9,2.3,1.8);scene.add(accent);
 const wall=newMat('#ece7dd',.96);putBox(scene,0,1.4,-.45,5,2.8,.07,wall);
 const floor=newMat('#d7d0c5',.87);putBox(scene,0,-.033,.70,5,.065,3.4,floor);
 const tile=new THREE.LineBasicMaterial({color:'#d8d2c8',transparent:true,opacity:.5});
 let tileVertices=[];
 for(let x=-2.5;x<=2.5;x+=.26){tileVertices.push(x,.1,-.405,x,2.65,-.405)}
 for(let y=.1;y<2.7;y+=.26){tileVertices.push(-2.5,y,-.405,2.5,y,-.405)}
 let tiles=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(tileVertices,3)),tile);scene.add(tiles);
 const width=clamp((Number(config.width)||80)/100,.35,1.56),height=clamp((Number(config.height)||53)/100,.1,1.75),depth=clamp((Number(config.depth)||45)/100,.22,.55);
 const isColumn=config.kind==='column';
 const isCounter=config.kind==='counter';
 const legs=(config.typeId==='three'||config.typeId==='three-door'||config.model==='Brent')&&!isColumn?.12:0;
 // Mur centré en z=-0.45, épaisseur 7 cm : face avant à -0.415.
 // On accole systématiquement le dos du meuble à cette face (tolérance 1.8 cm).
 const wallFrontZ=-.45+.07/2,flushOffset=.018;
 const backWallCabinetZ=wallFrontZ+depth/2+flushOffset;
 // Les meubles suspendus doivent réellement flotter au-dessus du sol.
 const floatingHeight=!isColumn&&!isCounter&&!legs?.39:0;
 const cabinet=new THREE.Group();
 cabinet.position.set(0,floatingHeight,backWallCabinetZ);
 scene.add(cabinet);
 const lower=isColumn?.10:legs;
 const boardH=isCounter?.09:Math.max(.10,height-lower-.017);
 const finish=newMat(colorFor(config.color,'#a49584'),isWood(config.color)?.64:.31,.03);
 // Pas de double allocation d'une texture bois si le véritable échantillon existe.
 if(!config.swatch&&isWood(config.color))finish.map=woodTexture(colorFor(config.color,'#a49584'),true);
 useCatalogueFinish(finish,config.swatch);
 const edge=newMat(colorFor(config.color,'#948778'),.50,.01);
 const dark=newMat('#34312d',.35,.55);
 if(isCounter){
  putBox(cabinet,0,height*.52,0,width,.07,depth,finish);
 }else{
  putBox(cabinet,0,lower+boardH/2,0,width,boardH,depth,finish);
  const front=depth/2+.016,door=nameToDoor(config),doorOnly=isColumn||strip(config.typeName).includes('1 porte');
  if(doorOnly){
   const doors=isColumn&&width>.44?2:1;
   for(let i=0;i<doors;i++){
    const dw=(width-.021)/doors,xx=(i-(doors-1)/2)*dw;
    putBox(cabinet,xx,lower+boardH/2,front,dw-.01,boardH-.027,.014,finish);
    putBox(cabinet,xx+(i===0?dw*.31:-dw*.31),lower+boardH/2,front+.016,.008,.075,.015,dark);
   }
  }else{
   const drawerCount=(strip(config.typeName).includes('3 tiroir')?3:strip(config.typeName).includes('1 tiroir')?1:2);
   const bodyH=boardH-.034,unitH=bodyH/drawerCount;
   for(let i=0;i<drawerCount;i++){
    const yy=lower+.03+(i+.5)*unitH;
    if(door){
     const dw=width*.71;
     putBox(cabinet,-width*.12,yy,front,dw-.014,unitH-.009,.014,finish);
     putBox(cabinet,-width*.12,yy+unitH*.30,front+.009,dw*.45,.008,.018,dark);
    }else{
     putBox(cabinet,0,yy,front,width-.015,unitH-.009,.014,finish);
     putBox(cabinet,0,yy+unitH*.31,front+.011,width*.34,.008,.014,dark);
    }
   }
   if(door){
    putBox(cabinet,width*.36,lower+boardH/2,front,width*.26,boardH-.02,.014,finish);
    putBox(cabinet,width*.45,lower+boardH*.56,front+.012,.008,.075,.017,dark);
   }
  }
  if(config.typeId==='niche'){
   const niche=newMat('#3b3430',.75);putBox(cabinet,0,lower+.055,front+.015,width-.04,.10,.04,niche);
  }
  if(config.model==='Aruba rainuré'||strip(config.color).includes('acanalado')){
   for(let i=1;i<Math.min(48,Math.round(width*40));i++){
    const xx=-width/2+width*i/Math.round(width*40);
    putBox(cabinet,xx,lower+boardH/2,front+.029,.003,boardH-.035,.003,edge);
   }
  }
  if(legs){
   for(const xx of [-width*.41,width*.41])for(const zz of [-depth*.38,depth*.38])putBox(cabinet,xx,legs/2,zz,.026,legs,.025,dark);
  }
 }
 if(!isColumn)addFixtures(cabinet,config,width,height,depth,finish);
 mirror(config,width,height+floatingHeight);
 return {width,height,depth};
}
function nameToDoor(config){return strip(config.typeName).includes('porte')}
function renderFrame(){raf=0;if(!active||!renderer||!scene||!camera)return;renderer.render(scene,camera)}
function requestFrame(){if(!raf&&active)raf=requestAnimationFrame(renderFrame)}
function moveCamera(){
 if(!camera)return;
 const target=new THREE.Vector3(0,1.05,0);
 camera.position.set(Math.sin(yaw)*distance,target.y+Math.sin(pitch)*distance,Math.cos(yaw)*distance);
 camera.lookAt(target);requestFrame();
}
function bindGestures(canvas){
 canvas.style.touchAction='none';
 const pointers=new Map();
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});lastPointer={x:e.clientX,y:e.clientY}});
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const older=pointers.get(e.pointerId);const dx=e.clientX-older.x,dy=e.clientY-older.y;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
   const p=[...pointers.values()],span=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
   if(lastPinch)distance=clamp(distance*lastPinch/span,1.9,5.5);
   lastPinch=span;
  }else{yaw=clamp(yaw+dx*.008,-1.25,1.25);pitch=clamp(pitch+dy*.006,-.2,.70)}
  moveCamera();
 });
 const finish=e=>{pointers.delete(e.pointerId);if(pointers.size<2)lastPinch=null};
 canvas.addEventListener('pointerup',finish);
 canvas.addEventListener('pointercancel',finish);
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.002,1.9,5.5);moveCamera()},{passive:false});
}
function init(config){
 const area=$('composition-canvas');
 const T=window.THREE; if(!T)throw Error('Moteur 3D indisponible');
 // Named global: all scene helpers use THREE for concise meshes/materials.
 THREE=T;
 renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,preserveDrawingBuffer:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:true});
 // Limite les allocations 4K / écrans Retina, sans toucher au format des produits.
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.3));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=.83;
 renderer.shadowMap.enabled=false;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.setSize(Math.max(250,area.clientWidth),Math.max(250,area.clientHeight),false);
 const loading=$('composition-loading');if(loading)loading.remove();
 area.appendChild(renderer.domElement);
 // Récupération sans crash de l'onglet si le navigateur perd le contexte GPU.
 renderer.domElement.addEventListener('webglcontextlost',event=>{
  event.preventDefault();
  if(!active||contextFailed)return;
  contextFailed=true;
  releaseRenderer();
  if(current)fallback(current,'Contexte graphique interrompu');
 });
 camera=new THREE.PerspectiveCamera(37,Math.max(320,area.clientWidth)/Math.max(320,area.clientHeight),.08,70);
 yaw=.40;pitch=.12;distance=3.15;
 buildScene(config);
 bindGestures(renderer.domElement);
 const resize=()=>{
  if(!active||!renderer||!camera||!area.isConnected)return;
  const w=Math.max(250,area.clientWidth),h=Math.max(250,area.clientHeight);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestFrame();
 };
 if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(area)}
 resize();moveCamera();
}
let THREE=null;
function fallback(config,message){
 const area=$('composition-canvas');if(!area)return;
 const typeImg=config.typePhoto?'assets/img/randal/types/'+config.typePhoto+'.webp':'assets/img/randal/v04/luce.webp';
 const photo=src=>{const img=document.createElement('img');img.src=src;img.alt='Visuel catalogue RANDAL';return img};
 const wall=document.createElement('div');wall.className='composition-fallback';
 wall.appendChild(photo(typeImg));
 if(config.basin&&config.basin!=='Sans vasque'&&config.basinMode!=='none'){const im=photo('assets/img/randal/accessories/basin-'+strip(config.basin)+'.webp');wall.appendChild(im)}
 if(config.mirror&&config.mirror!=='Sans miroir'&&config.mirrorPhoto){wall.appendChild(photo('assets/img/randal/accessories/'+config.mirrorPhoto+'.webp'))}
 const p=document.createElement('p');p.textContent='Aperçu catalogue disponible. La visualisation 3D nécessite une connexion permettant de charger son moteur.';wall.appendChild(p);
 area.replaceChildren(wall);
 $('composition-photo').disabled=true;
 console.warn('RANDAL composition 3D:',message);
}
function saveImage(){
 if(!renderer||!scene||!camera)return;
 requestFrame();
 try{
  renderer.render(scene,camera);
  const link=document.createElement('a');link.download='RANDAL-'+String(current?.model||'meuble').replace(/\s/g,'-')+'-composition.png';
  link.href=renderer.domElement.toDataURL('image/png');link.click();
 }catch(e){alert('Impossible d’enregistrer cette image sur cet appareil.')}
}
function present(config){
 label('composition-model',config.model+' · '+config.typeName);
 label('composition-size',[config.width,config.height,config.depth].join(' × ')+' cm');
 label('composition-color',config.color);
 label('composition-basin',config.kind==='column'?'Sans vasque':(labels[config.basinMode]||'')+(config.basinMode==='none'?'':' · '+config.basin));
 label('composition-mirror',config.mirror==='Sans miroir'?'Sans miroir':config.mirror+' · '+(config.mirrorSize||'À définir')+(config.mirrorFinish?' · '+config.mirrorFinish:''));
 const img=$('composition-swatch');
 if(config.swatch){img.src=config.swatch;img.hidden=false}else img.hidden=true;
}
async function open(config){
 const el=modal();
 if(!el.hidden)close();
 const generation=++sessionId;
 contextFailed=false;previousFocus=document.activeElement;
 current=config;el.hidden=false;active=true;restoreOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 present(config);$('composition-close').focus();
 const area=$('composition-canvas');area.innerHTML='<div class="composition-loading" id="composition-loading">Préparation de votre aperçu 3D…</div>';
 $('composition-photo').disabled=false;
 try{
  await ensureThree();if(!active||generation!==sessionId)return;
  init(config);
 }catch(e){if(active&&generation===sessionId){releaseRenderer();fallback(config,e.message)}}
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
window.RandalComposition3D={open,close};
})();