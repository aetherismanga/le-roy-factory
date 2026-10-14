/* RANDAL — Visualisation 3D paramétrique indicative. Modèles usine 3D non fournis.
   Dimensions et options reprises du configurateur ; Three.js chargé à la demande. */
(function(){
'use strict';
const THREE_URLS=['https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js','https://unpkg.com/three@0.152.2/build/three.min.js'];
let libraryPromise=null,renderer=null,scene=null,camera=null,stage=null,resizeObserver=null,raf=0;
let yaw=.47,pitch=.15,distance=2.75,lastPointer=null,lastPinch=null;
let active=false,previousFocus=null,restoreOverflow='',current=null,sessionId=0,contextFailed=false,surfaceChoice={floor:'elios-creta-avena',wall:'greige'};
let drawers=[],drawersOpen=false,drawerAnimation=0,sceneGeneration=0;
const WALL_COLORS={
 cream:{label:'Crème doux',hex:'#eee4d5'},ivory:{label:'Ivoire',hex:'#f4f0e8'},
 chalk:{label:'Blanc craie',hex:'#f5f5f0'},greige:{label:'Greige',hex:'#c9c5ba'},
 linen:{label:'Lin naturel',hex:'#d8c9b4'},sand:{label:'Sable',hex:'#ddc4a7'},
 sage:{label:'Vert sauge',hex:'#aebdac'},stone:{label:'Pierre claire',hex:'#c2b9ad'},
 blue:{label:'Bleu poudré',hex:'#b6c7cb'},terracotta:{label:'Terre cuite',hex:'#c9907a'},
 graphite:{label:'Graphite',hex:'#6a6a66'}
};
const FLOOR_OPTIONS=[
 {id:'view-coco-beige',label:'VIEW · Coco Beige',sub:'40 × 60 cm · naturel',preview:null,base:'#c6b19b'},
 ...[
 ['zucchero','#dfcfb6'],['avena','#bba78e'],['biscotto','#bb8f67'],['caramello','#a5734b'],
 ['matcha','#89906c'],['ginepro','#5f776f'],['malto','#a28265'],['pepe','#75726c']
 ].map(([id,base])=>({id:'elios-creta-'+id,label:'ELIOS · Creta '+id.charAt(0).toUpperCase()+id.slice(1),
 sub:'60 × 60 cm · R9',preview:'assets/img/elios/creta/textures/'+id+'.webp',base}))
];
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
 'argent':'#bdc0c1','dore':'#c1a26a','bronze':'#8a6950',
 'anthracite':'#5d6061','vert namibie':'#717866','bleu kivu':'#193c5c',
 'rose nadir':'#c49d94','blanc ivoire':'#efede3','blanc pur':'#f9f8f3','blanc brillant':'#fafaf7'
};
function colorFor(str,fallback='#aaa39a'){
 const s=strip(str);
 for(const [k,v] of Object.entries(finishRGB).sort((a,b)=>b[0].length-a[0].length))if(s.includes(k))return v;
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
 '<div class="composition-harmony-controls" id="composition-harmony-controls" hidden><button type="button" id="composition-drawers" aria-pressed="false">Ouvrir les tiroirs</button><span>Découpe siphon visible dans le tiroir supérieur</span></div>'+
 '<div class="composition-view-tools"><button type="button" id="composition-floor" aria-expanded="false" aria-controls="composition-surface-panel">Sol</button><button type="button" id="composition-wall" aria-expanded="false" aria-controls="composition-surface-panel">Mur</button><button type="button" id="composition-photo">Enregistrer l’image</button></div>'+
 '<div id="composition-surface-panel" class="composition-surface-panel" hidden><strong id="composition-surface-title"></strong><div id="composition-surface-choices"></div><p>Creta 60 × 60 : coloris officiels du catalogue ELIOS.</p></div>'+
 '</div><aside class="composition-details"><div class="composition-label">VOTRE COMPOSITION</div><h3 id="composition-model"></h3>'+
 '<div class="composition-selected"><div><span>Dimensions</span><strong id="composition-size"></strong></div>'+
 '<div><span>Finition du meuble</span><strong id="composition-color"></strong></div>'+
 '<div><span>Vasque / plan</span><strong id="composition-basin"></strong></div>'+
 '<div><span>Miroir</span><strong id="composition-mirror"></strong></div>'+
 '<div><span>Référence meuble</span><strong id="composition-reference"></strong></div>'+
 '<div><span>Composition · prix public</span><strong id="composition-total"></strong></div></div>'+
 '<div class="composition-customize" id="composition-harmony-customize" hidden>'+
 '<button type="button" data-customize="color" aria-expanded="false">Changer la finition</button>'+
 '<button type="button" data-customize="basin" aria-expanded="false">Changer la vasque</button>'+
 '<div class="composition-customize-panel" id="composition-customize-panel" hidden></div></div>'+
 '<div class="composition-swatch"><img id="composition-swatch" alt="Échantillon de la finition retenue"></div><div class="composition-proof"><h4>Illustrations du catalogue</h4><div id="composition-proof-images" class="composition-proof-images"></div></div>'+
 '<p class="composition-disclaimer">Projection 3D indicative : les proportions, la disposition et les teintes sont simulées à partir de votre sélection. Les dessins, caractéristiques et échantillons RANDAL font référence.</p>'+
 '</aside></div><div class="composition-footer"><button id="composition-back" type="button">Retour au récapitulatif</button></div></section>';
 document.body.appendChild(el);
 $('composition-close').addEventListener('click',close);
 $('composition-back').addEventListener('click',close);
 el.querySelector('[data-close]').addEventListener('click',close);
 $('composition-floor').addEventListener('click',()=>showSurface('floor'));
 $('composition-wall').addEventListener('click',()=>showSurface('wall'));
 $('composition-photo').addEventListener('click',saveImage);
 $('composition-drawers').addEventListener('click',toggleDrawers);
 el.querySelectorAll('[data-customize]').forEach(button=>button.addEventListener('click',()=>showCustomize(button.dataset.customize)));
 el.addEventListener('keydown',e=>{if(e.key==='Tab'){const items=[...el.querySelectorAll('button:not(:disabled)')];const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 return el;
}
// Release CPU buffers, GPU textures and WebGL contexts after EVERY preview.
function disposeScene(){
 if(!scene)return;
 const geometries=new Set(),materials=new Set(),textures=new Set();
 scene.traverse(object=>{
  if(object.geometry)geometries.add(object.geometry);
  if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(mat=>{if(mat)materials.add(mat)});
 });
 materials.forEach(mat=>{
  for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','envMap']){
   if(mat[key]?.dispose)textures.add(mat[key]);
  }
 });
 textures.forEach(texture=>texture.dispose());
 geometries.forEach(geo=>geo.dispose());
 materials.forEach(mat=>mat.dispose());
 scene=null;drawers=[];
}
function releaseRenderer(){
 cancelAnimationFrame(raf);raf=0;
 cancelAnimationFrame(drawerAnimation);drawerAnimation=0;
 if(resizeObserver){resizeObserver.disconnect();resizeObserver=null}
 disposeScene();
 if(renderer){
  const currentRenderer=renderer;renderer=null;
  try{currentRenderer.dispose();currentRenderer.forceContextLoss?.()}catch(err){console.warn('Libération WebGL RANDAL',err)}
  try{currentRenderer.domElement.remove()}catch(err){}
 }
 scene=null;camera=null;stage=null;lastPointer=null;lastPinch=null;
}

function showCustomize(type){
 if(!current||current.model!=='Harmony')return;
 const panel=$('composition-customize-panel');
 if(!panel)return;
 const open=panel.hidden||panel.dataset.type!==type;
 panel.hidden=!open;panel.dataset.type=type;
 $('composition-harmony-customize').querySelectorAll('[data-customize]').forEach(el=>el.setAttribute('aria-expanded',String(open&&el.dataset.customize===type)));
 if(!open)return;
 panel.replaceChildren();
 const head=document.createElement('div');head.className='composition-options-title';
 head.textContent=type==='color'?'Finition Harmony':"Vasque et plan de toilette";
 panel.appendChild(head);
 const section=(text)=>{
  const title=document.createElement('div');title.className='composition-choice-title';title.textContent=text;panel.appendChild(title);
 };
 const addOption=(text,img,selected,onClick,swatch=false)=>{
  const button=document.createElement('button');button.type='button';
  button.className='composition-option'+(selected?' active':'');
  button.setAttribute('aria-pressed',String(!!selected));
  if(img){
   const photo=document.createElement('img');photo.src=img;photo.alt=text;photo.loading='lazy';photo.decoding='async';
   if(swatch)photo.className='composition-option-swatch';
   button.appendChild(photo);
  }
  const caption=document.createElement('span');caption.textContent=text;button.appendChild(caption);
  button.onclick=onClick;panel.appendChild(button);
 };
 const update=(patch)=>{
  if(!current?.onChange)return;
  let updated;
  try{updated=current.onChange(patch)}catch(e){console.error('RANDAL update failure',e);return}
  if(!updated||!active)return;
  current=updated;
  redrawCurrent();
  panel.hidden=true;
  showCustomize(type);
 };
 if(type==='color'){
  section('Choisissez une finition du catalogue');
  for(const value of current.finishes||[]){
   const img=current.finishUrls?.[value];
   addOption(value,img,current.color===value,()=>update({color:value}),true);
  }
  return;
 }
 section('Type de vasque');
 for(const [mode,text] of [['integrated','Vasque sur meuble'],['vessel','Plan + vasque à poser'],['none','Sans vasque']]){
  if(!current.availableModes?.includes(mode))continue;
  addOption(text,null,current.basinMode===mode,()=>update({basinMode:mode}));
 }
 if(current.basinMode==='none')return;
 section(current.basinMode==='integrated'?'Modèle de vasque intégrée':'Modèle de vasque à poser');
 for(const name of current.basinMode==='integrated'?['Sella','Tampa']:['Neris','Torne']){
  const image='assets/img/randal/accessories/hd/basin-'+strip(name)+'.webp';
  addOption(name,image,current.basin===name,()=>update({basin:name}));
 }
 if(current.basinMode==='vessel'){
  section('Couleur de la vasque');
  for(const color of current.basinColors||[]){
   addOption(color,null,current.basinFinish===color,()=>update({basinFinish:color}));
  }
  section('Finition du plan');
  for(const color of current.topFinishes||[]){
   addOption(color,null,current.topFinish===color,()=>update({topFinish:color}));
  }
 }
}
function redrawCurrent(){
 if(!active||!current)return;
 cancelAnimationFrame(drawerAnimation);drawerAnimation=0;drawersOpen=false;
 $('composition-drawers').textContent='Ouvrir les tiroirs';
 $('composition-drawers').setAttribute('aria-pressed','false');
 if(scene&&renderer&&camera){
  disposeScene();buildScene(current);requestFrame();
 }
 present(current);
}

function showSurface(which){
 const panel=$('composition-surface-panel'),title=$('composition-surface-title'),list=$('composition-surface-choices');
 if(!panel||!title||!list)return;
 const alreadyOpen=!panel.hidden&&panel.dataset.which===which;
 panel.hidden=alreadyOpen;panel.dataset.which=which;
 $('composition-floor').setAttribute('aria-expanded',String(!alreadyOpen&&which==='floor'));
 $('composition-wall').setAttribute('aria-expanded',String(!alreadyOpen&&which==='wall'));
 if(alreadyOpen)return;
 title.textContent=which==='floor'?'Choisissez votre carrelage':'Choisissez la couleur du mur';
 list.replaceChildren();
 const items=which==='floor'?FLOOR_OPTIONS:Object.entries(WALL_COLORS).map(([id,c])=>({id,label:c.label,base:c.hex}));
 for(const item of items){
  const button=document.createElement('button');button.type='button';button.className='composition-surface-option';
  button.dataset.selected=String(surfaceChoice[which]===item.id);
  button.setAttribute('aria-pressed',button.dataset.selected);
  const preview=document.createElement('span');preview.className='composition-surface-swatch';
  preview.style.backgroundColor=item.base;
  if(item.preview){const img=document.createElement('img');img.src=item.preview;img.alt='';img.loading='lazy';img.onerror=()=>{img.remove()};preview.appendChild(img)}
  const copy=document.createElement('span');copy.className='composition-surface-label';
  const heading=document.createElement('strong');heading.textContent=item.label;
  const sub=document.createElement('small');sub.textContent=item.sub||'Peinture mate';copy.append(heading,sub);
  const tick=document.createElement('span');tick.className='composition-surface-check';tick.textContent=surfaceChoice[which]===item.id?'✓':'';
  button.append(preview,copy,tick);
  button.onclick=()=>{surfaceChoice[which]=item.id;panel.hidden=true;
   $('composition-floor').setAttribute('aria-expanded','false');
   $('composition-wall').setAttribute('aria-expanded','false');
   redrawCurrent();
  };
  list.appendChild(button);
 }
 const help=panel.querySelector('p');
 if(help)help.textContent=which==='floor'?'Textures et teintes inspirées des échantillons du catalogue ELIOS.':'Choisissez une teinte de peinture mate pour le mur.';
}
function close(){
 const drawerButton=$('composition-drawers');
 if(drawerButton){drawerButton.textContent='Ouvrir les tiroirs';drawerButton.setAttribute('aria-pressed','false')}
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
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);t.anisotropy=8;
 return t;
}
function isWood(color){return woodCodes.some(k=>strip(color).includes(k))}
function useCatalogueFinish(material,url,wood){
 if(!url)return;
 const generation=sessionId,sceneTicket=sceneGeneration;
 const image=new Image();
 image.onload=()=>{
  if(!active||generation!==sessionId||sceneTicket!==sceneGeneration||!scene||!material)return;
  const c=document.createElement('canvas');c.width=c.height=1024;
  const ctx=c.getContext('2d',{alpha:false});
  // La photo du véritable échantillon RANDAL est centrée dans une pastille :
  // prélever uniquement la matière pour éviter les bordures ivoire.
  const size=Math.min(image.naturalWidth,image.naturalHeight)*.58;
  const xx=(image.naturalWidth-size)/2,yy=(image.naturalHeight-size)/2;
  ctx.drawImage(image,xx,yy,size,size,0,0,1024,1024);
  if(wood){
   // Fil de bois vertical fin, très discret : simule le veinage absent du faible
   // grossissement de la pastille tout en conservant sa teinte réelle.
   let seed=487219;
   const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
   for(let i=0;i<410;i++){
    const x=rand()*1024,w=.15+rand()*1.25,y=rand()*1024;
    ctx.beginPath();
    ctx.strokeStyle=rand()>.5?'rgba(59,37,18,.057)':'rgba(255,247,220,.095)';
    ctx.lineWidth=w;
    ctx.moveTo(x,y-260);
    ctx.bezierCurveTo(x+(rand()-.5)*8,y+50,x+(rand()-.5)*6,y+360,x+(rand()-.5)*7,y+870);
    ctx.stroke();
   }
  }
  const texture=new THREE.CanvasTexture(c);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(1,1);
  texture.anisotropy=Math.min(12,renderer?.capabilities.getMaxAnisotropy?.()||8);
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  if(material.map)material.map.dispose();
  material.color.set('#ffffff');
  material.map=texture;
  material.roughness=wood?.67:.42;
  // Relief infime du veinage, pas de texture plastique ou de bois bombé.
  if(wood){material.bumpMap=texture;material.bumpScale=.0018;}
  material.needsUpdate=true;
  requestFrame();
 };
 image.onerror=()=>{};
 image.src=url;
}
function addFixtures(root,config,width,height,depth,wood){
 if(config.basinMode==='none'||config.kind==='column')return;
 // A tap on the countertop or basin opens the Harmony basin selector.
 const basinGroup=new THREE.Group();
 basinGroup.name='RANDAL_Change_Basin';
 basinGroup.userData={randalSelectBasin:true};
 root.add(basinGroup);
 const ceramic=newMat('#f5f4ee',.28,.05);
 const sinkShade=newMat('#d1cec5',.82,0);
 const chrome=newMat('#b1b2af',.26,.72);
 const vesselCeramic=newMat(colorFor(config.basinFinish,'#f5f4ee'),.28,.05);
 const vesselMode=config.basinMode==='vessel';
 const counterSurface=vesselMode?newMat(colorFor(config.topFinish,'#e9e5dd'),.50,.04):ceramic;
 // Plan / vasque au catalogue : 46 cm de profondeur.
 putBox(basinGroup,0,height+.015,0,width+.025,.027,depth+.01,counterSurface);
 const twoBasins=width>=1.16&&config.model==='Harmony'&&!vesselMode;
 const count=twoBasins?2:1;
 for(let i=0;i<count;i++){
  const x=count===1?0:(i===0?-1:1)*width*.255;
  if(vesselMode){
   const neris=strip(config.basin).includes('neris');
   // NERIS ovale 46x33x14 / TORNE rond Ø37x12, d'après la p.41.
   const r=neris?.18:.185,h=neris?.14:.12;
   const points=[
    new THREE.Vector2(0,.018),new THREE.Vector2(r*.35,.015),
    new THREE.Vector2(r*.75,.022),new THREE.Vector2(r*.93,h*.58),
    new THREE.Vector2(r,h),new THREE.Vector2(r*.955,h+.008)
   ];
   const body=new THREE.Mesh(new THREE.LatheGeometry(points,56),vesselCeramic);
   body.position.set(x,height+.031,.027);
   body.scale.set(neris?1.27:1,1,neris?.89:1);
   basinGroup.add(body);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(r,.007,10,64),vesselCeramic);
   rim.rotation.x=-Math.PI/2;rim.position.set(x,height+.031+h,.027);
   rim.scale.set(neris?1.27:1,neris?.89:1,1);basinGroup.add(rim);
  }else{
   const soft=strip(config.basin).includes('sella'),rw=soft?.16:.165,rd=soft?.11:.105;
   // SELLА galbée / TAMPA cuve anguleuse : modèles distincts.
   if(soft){
    elliptical(basinGroup,x,height+.046,.035,rw,rd,ceramic);
    putBox(basinGroup,x,height+.041,.035,rw*1.55,.004,rd*1.2,sinkShade);
   }else{
    const y=height+.046,z=.035;
    putBox(basinGroup,x,y,z,rw*1.95,.003,rd*1.9,sinkShade);
    for(const side of [-1,1]){
     putBox(basinGroup,x+side*rw,y+.006,z,.013,.012,rd*2.04,ceramic);
     putBox(basinGroup,x,y+.006,z+side*rd,rw*2,.012,.013,ceramic);
    }
   }
   const drain=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.003,24),chrome);
   drain.position.set(x,height+.048,.035);basinGroup.add(drain);
  }
 }
 // Aucun mitigeur n'est automatiquement ajouté : cette option n'est pas
 // sélectionnée dans le configurateur RANDAL.
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
function applyFloorTexture(material){
 const item=FLOOR_OPTIONS.find(x=>x.id===surfaceChoice.floor)||FLOOR_OPTIONS[0];
 material.color.set(item.base);material.roughness=.84;material.metalness=0;
 if(!item.preview){loadCocoFloor(material);return;}
 const ticket=sceneGeneration,session=sessionId;
 const image=new Image();image.decoding='async';
 image.onload=()=>{
  if(!scene||ticket!==sceneGeneration||session!==sessionId||!active)return;
  // Atlas de 2 x 2 dalles Creta, dimensions réelles 60x60.
  // Un seul maillage plat de 18 m : aucun rebord, aucune marche.
  const tile=512,total=1024,canvas=document.createElement('canvas');
  canvas.width=canvas.height=total;
  const ctx=canvas.getContext('2d',{alpha:false});
  const variants=[0,1,3,2];
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
   const x=col*tile,y=row*tile,k=variants[row*2+col];
   ctx.save();
   ctx.translate(x+tile/2,y+tile/2);
   ctx.rotate(k*Math.PI/2);
   ctx.drawImage(image,-tile/2+2,-tile/2+2,tile-4,tile-4);
   ctx.restore();
   // Joint 2 à 3 mm environ à l'échelle de 60 cm.
   ctx.strokeStyle='rgba(77,69,62,.23)';ctx.lineWidth=3;
   ctx.strokeRect(x+1.5,y+1.5,tile-3,tile-3);
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(18/1.2,18/1.2);
  texture.anisotropy=Math.min(12,renderer?.capabilities.getMaxAnisotropy?.()||8);
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  if(material.map)material.map.dispose();
  material.color.set('#ffffff');material.map=texture;material.needsUpdate=true;
  requestFrame();
 };
 image.onerror=()=>{console.warn('Texture officielle ELIOS indisponible:',item.preview);requestFrame()};
 image.src=item.preview;
}
function loadCocoFloor(material){
 const uri=window.RANDAL_VIEW_COCO_BEIGE;
 if(!uri)return;
 const generation=sessionId,sceneTicket=sceneGeneration,image=new Image();
 image.onload=()=>{
  if(!active||generation!==sessionId||sceneTicket!==sceneGeneration||!scene)return;
  const texture=new THREE.Texture(image);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(18/.6,18/.4);texture.anisotropy=8;texture.needsUpdate=true;
  if(material.map)material.map.dispose();
  material.color.set('#ffffff');material.map=texture;material.needsUpdate=true;requestFrame();
 };
 image.src=uri;
}

/* HARMONY : véritable caisse vide, tiroirs séparés et passage siphon arrière en U.
   Variantes catalogue A-F : 2 tiroirs ; G-L : 3 tiroirs avec pieds. */
function harmonyDrawerFloor(group,width,depth,base,material,topDrawer,doubleWaste){
 const innerW=width-.096,bodyDepth=depth-.115;
 const frontZ=depth/2-.040,backZ=frontZ-bodyDepth;
 const floorY=base+.018;
 const cutDepth=Math.min(.18,bodyDepth*.62),notch=.19;
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
  if(l>x0+.005)putBox(group,(x0+l)/2,floorY,(rearStart+rearEnd)/2,l-x0,.009,cutDepth,material);
  const start=clamp(c-notch/2,-innerW/2,innerW/2);
  const end=clamp(c+notch/2,-innerW/2,innerW/2);
  for(const x of [start,end])putBox(group,x,base+.064,(rearStart+rearEnd)/2,.009,.090,cutDepth,material);
  x0=end;
 }
 if(x0<innerW/2-.005)putBox(group,(x0+innerW/2)/2,floorY,(rearStart+rearEnd)/2,innerW/2-x0,.009,cutDepth,material);
}

/* HARMONY colonne M : 30 × 150 × 27 cm, deux portes superposées.
   Le modèle ne présente pas l'option ouvrir les tiroirs. */
function buildHarmonyColumn(cabinet,w,h,d,finish,edge){
 const side=.016,inside=newMat('#b7b2a9',.78);
 putBox(cabinet,-w/2+side/2,h/2,0,side,h,d,finish);
 putBox(cabinet,w/2-side/2,h/2,0,side,h,d,finish);
 putBox(cabinet,0,.014,0,w-.032,.027,d,inside);
 putBox(cabinet,0,h-.014,0,w-.032,.027,d,inside);
 putBox(cabinet,0,h/2,0,w-.032,.017,d-.025,inside);
 putBox(cabinet,0,h/2,-d/2+.007,w-.032,h-.045,.013,inside);
 for(let i=0;i<2;i++){
  const cy=(i+.5)*h/2,front=d/2+.013;
  putBox(cabinet,0,cy,front,w-.025,h/2-.009,.017,finish);
  // Une prise de main discrète sur la jonction centrale.
  putBox(cabinet,0,i===0?h/2-.005:h/2+.005,front+.011,w-.054,.004,.008,edge);
 }
}

function buildHarmonyCabinet(cabinet,config,w,h,d,finish,edge,metal,dark){
 const feet=config.typeId==='three',legH=feet?.105:0;
 // 79 cm incluent les pieds, et non 79 cm + pieds.
 const bodyHeight=h-legH,bodyBottom=legH,bodyTop=legH+bodyHeight,side=.016;
 const woodInterior=newMat('#b6b3a9',.73);
 // Corps creux : flancs, fond arrière, fond et traverse supérieure.
 putBox(cabinet,-w/2+side/2,bodyBottom+bodyHeight/2,0,side,bodyHeight,d,finish);
 putBox(cabinet,w/2-side/2,bodyBottom+bodyHeight/2,0,side,bodyHeight,d,finish);
 putBox(cabinet,0,bodyBottom+.011,0,w-2*side,.022,d-.02,woodInterior);
 putBox(cabinet,0,bodyTop-.010,-d*.29,w-2*side,.02,d*.41,woodInterior);
 putBox(cabinet,0,bodyBottom+bodyHeight/2,-d/2+.008,w-2*side,bodyHeight-.035,.010,woodInterior);
 putBox(cabinet,0,bodyTop-.018,d/2-.025,w-.04,.016,.035,woodInterior);
 const count=feet?3:2,step=(bodyHeight-.036)/count,topStart=bodyTop-.018;
 for(let i=0;i<count;i++){
  const drawer=new THREE.Group();
  drawer.name='Harmony_tiroir_'+(i+1);
  const center=topStart-(i+.5)*step,base=center-step/2,frontZ=d/2+.014;
  const frontH=step-.006;
  putBox(drawer,0,center,frontZ,w-.029,frontH,.016,finish).name='Facade_sans_poignee_'+(i+1);
  const rearZ=d/2-.040-(d-.115);
  // Compartimentage interne visible lorsque le client ouvre les tiroirs.
  for(const x of [-w/2+.043,w/2-.043])
   putBox(drawer,x,base+.068,(d/2-.040+rearZ)/2,.012,.12,d-.115,woodInterior);
  if(i>0)putBox(drawer,0,base+.070,rearZ+.012,w-.09,.118,.012,woodInterior);
  harmonyDrawerFloor(drawer,w,d,base,woodInterior,i===0,w>1.16&&config.basinMode==='integrated');
  // Profil de prise de main intégré dans le chant : jamais de barre rapportée.
  putBox(drawer,0,center+frontH/2-.003,frontZ+.010,w-.055,.003,.006,edge);
  cabinet.add(drawer);drawers.push(drawer);
 }
 if(feet){
  for(const xx of [-w/2+.057,w/2-.057])for(const zz of [-d/2+.063,d/2-.063]){
   putBox(cabinet,xx,legH/2,zz,.026,legH,.026,metal);
  }
 }
}
function toggleDrawers(){
 if(!current||current.model!=='Harmony'||current.typeId==='column'||!drawers.length)return;
 drawersOpen=!drawersOpen;
 const btn=$('composition-drawers');
 btn.textContent=drawersOpen?'Fermer les tiroirs':'Ouvrir les tiroirs';
 btn.setAttribute('aria-pressed',String(drawersOpen));
 animateHarmonyDrawers();
}
function animateHarmonyDrawers(){
 cancelAnimationFrame(drawerAnimation);drawerAnimation=0;
 const originals=drawers.map(d=>d.position.z);
  // Ouverture différenciée : tiroir haut court, tiroir(s) inférieur(s) plus profond(s).
  const drawerTravel=i=>!drawersOpen?0:(i===0?.105:drawers.length===3&&i===1?.215:.305);
 if(!drawers.length)return;
 const began=performance.now(),duration=540,ticket=sessionId;
 function frame(now){
  drawerAnimation=0;
  if(!active||ticket!==sessionId)return;
  const p=clamp((now-began)/duration,0,1),ease=1-Math.pow(1-p,3);
  drawers.forEach((d,i)=>{const goal=drawerTravel(i);d.position.z=originals[i]+(goal-originals[i])*ease});
  requestFrame();
  if(p<1)drawerAnimation=requestAnimationFrame(frame);
 }
 drawerAnimation=requestAnimationFrame(frame);
}

function buildScene(config){
 sceneGeneration++;
 scene=new THREE.Scene();scene.background=new THREE.Color('#dedbd5');
 // Éclairage doux : les anciennes intensités surexposaient entièrement les bois.
 const ambient=new THREE.HemisphereLight(0xfff6eb,0xa7a29b,.66);scene.add(ambient);
 const bounce=new THREE.AmbientLight(0xffffff,.17);scene.add(bounce);
 const light=new THREE.DirectionalLight(0xfff4e6,1.48);light.position.set(-2.4,4.5,3.0);light.castShadow=true;light.shadow.mapSize.set(window.innerWidth<720?1024:2048,window.innerWidth<720?1024:2048);light.shadow.camera.left=-3.1;light.shadow.camera.right=3.1;light.shadow.camera.top=3.1;light.shadow.camera.bottom=-3.1;light.shadow.normalBias=.003;
 // Ombres de contact douces : densité ajustée à la puissance du terminal.
 light.shadow.bias=-.00012;scene.add(light);
 const accent=new THREE.PointLight(0xffefd9,.38,6);accent.position.set(1.9,2.9,2.1);scene.add(accent);
 const wall=newMat(WALL_COLORS[surfaceChoice.wall]?.hex||WALL_COLORS.cream.hex,.94);
 putBox(scene,0,2.35,-.65,12,4.7,.06,wall);
 // Un seul plan continu au niveau zéro, sans tranche apparente ni fausse marche.
 const floor=newMat('#e1dcd4',.9);const floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(18,18),floor);
 floorMesh.rotation.x=-Math.PI/2;floorMesh.position.set(0,-.005,0);floorMesh.receiveShadow=true;scene.add(floorMesh);
 applyFloorTexture(floor);
 const width=clamp((Number(config.width)||80)/100,.35,1.56),height=clamp((Number(config.height)||53)/100,.1,1.75),depth=clamp((Number(config.depth)||45)/100,.22,.55);
 const isColumn=config.kind==='column';
 const isCounter=config.kind==='counter';
 const legs=(config.typeId==='three'||config.typeId==='three-door'||config.model==='Brent')&&!isColumn?.12:0;
 // Mur centré en z=-0.45, épaisseur 7 cm : face avant à -0.415.
 // On accole systématiquement le dos du meuble à cette face (tolérance 1.8 cm).
 const wallFrontZ=-.65+.06/2,flushOffset=.014;
 const backWallCabinetZ=wallFrontZ+depth/2+flushOffset;
 // Les meubles suspendus doivent réellement flotter au-dessus du sol.
 const floatingHeight=!isColumn&&!isCounter&&!legs?.39:0;
 const cabinet=new THREE.Group();
 cabinet.position.set(0,floatingHeight,backWallCabinetZ);
 scene.add(cabinet);
 if(!isColumn){
  const shadeCanvas=document.createElement('canvas');shadeCanvas.width=shadeCanvas.height=128;
  const g=shadeCanvas.getContext('2d');
  const gradient=g.createRadialGradient(64,64,6,64,64,63);
  gradient.addColorStop(0,'rgba(48,44,37,.29)');gradient.addColorStop(1,'rgba(48,44,37,0)');
  g.fillStyle=gradient;g.fillRect(0,0,128,128);
  const sm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadeCanvas),transparent:true,opacity:.72,depthWrite:false});
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(width*1.4,depth*2),sm);
  shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-.001,backWallCabinetZ+.10);
  scene.add(shadow);
 }
 const lower=isColumn?.10:legs;
 const boardH=isCounter?.09:Math.max(.10,height-lower-.017);
 const finish=newMat(colorFor(config.color,'#a49584'),isWood(config.color)?.63:.44,0);
 // Pas de double allocation d'une texture bois si le véritable échantillon existe.
 if(!config.swatch&&isWood(config.color))finish.map=woodTexture(colorFor(config.color,'#a49584'),true);
 useCatalogueFinish(finish,config.swatch,isWood(config.color));
 const edge=newMat(colorFor(config.color,'#948778'),.50,.01);
 const dark=newMat('#34312d',.35,.55);
 if(config.model==='Harmony'&&config.typeId==='column'){
  buildHarmonyColumn(cabinet,width,height,depth,finish,edge);
 }else if(config.model==='Harmony'){
  drawers=[];drawersOpen=false;
  buildHarmonyCabinet(cabinet,config,width,height,depth,finish,edge,newMat('#afb4b6',.36,.78),dark);
 }else if(isCounter){
  putBox(cabinet,0,height*.52,0,width,.07,depth,finish);
 }else{
  putBox(cabinet,0,lower+boardH/2,0,width,boardH,depth,finish);
  const front=depth/2+.016,door=nameToDoor(config),doorOnly=isColumn||strip(config.typeName).includes('1 porte');
  const handleless=['harmony','luce','aruba','aruba rainure','aras','boreal','brunei'].includes(strip(config.model));
  if(doorOnly){
   const doors=isColumn&&width>.44?2:1;
   for(let i=0;i<doors;i++){
    const dw=(width-.021)/doors,xx=(i-(doors-1)/2)*dw;
    putBox(cabinet,xx,lower+boardH/2,front,dw-.01,boardH-.027,.014,finish);
    if(!handleless)putBox(cabinet,xx+(i===0?dw*.31:-dw*.31),lower+boardH/2,front+.016,.008,.075,.015,dark);
   }
  }else{
   const drawerCount=(strip(config.typeName).includes('3 tiroir')?3:strip(config.typeName).includes('1 tiroir')?1:2);
   const bodyH=boardH-.034,unitH=bodyH/drawerCount;
   for(let i=0;i<drawerCount;i++){
    const yy=lower+.03+(i+.5)*unitH;
    if(door){
     const dw=width*.71;
     putBox(cabinet,-width*.12,yy,front,dw-.014,unitH-.009,.014,finish);
     if(!handleless)putBox(cabinet,-width*.12,yy+unitH*.30,front+.009,dw*.45,.008,.018,dark);
    }else{
     putBox(cabinet,0,yy,front,width-.015,unitH-.009,.014,finish);
     if(!handleless)putBox(cabinet,0,yy+unitH*.31,front+.011,width*.34,.008,.014,dark);
     if(config.model==='Harmony'&&i<drawerCount-1)putBox(cabinet,0,yy-unitH*.475,front+.008,width*.95,.005,.012,dark);
    }
   }
   if(door){
    putBox(cabinet,width*.36,lower+boardH/2,front,width*.26,boardH-.02,.014,finish);
    if(!handleless)putBox(cabinet,width*.45,lower+boardH*.56,front+.012,.008,.075,.017,dark);
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
 const target=new THREE.Vector3(0,current?.kind==='column'?1.04:.82,0);
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
 canvas.addEventListener('pointerup',e=>{
  const origin=pointers.get(e.pointerId);
  const tap=origin&&Math.abs(origin.x-e.clientX)<6&&Math.abs(origin.y-e.clientY)<6;
  if(tap&&current?.model==='Harmony'&&camera&&scene&&THREE.Raycaster){
   const rect=canvas.getBoundingClientRect();
   const xy=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
   const ray=new THREE.Raycaster();ray.setFromCamera(xy,camera);
   if(ray.intersectObjects(scene.children,true).some(hit=>{
    for(let o=hit.object;o;o=o.parent)if(o.userData?.randalSelectBasin)return true;
    return false;
   }))showCustomize('basin');
  }
  finish(e);
 });
 canvas.addEventListener('pointercancel',finish);
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.002,1.9,5.5);moveCamera()},{passive:false});
}
function init(config){
 const area=$('composition-canvas');
 const T=window.THREE; if(!T)throw Error('Moteur 3D indisponible');
 // Named global: all scene helpers use THREE for concise meshes/materials.
 THREE=T;
 renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance',failIfMajorPerformanceCaveat:false});
 // Limite les allocations 4K / écrans Retina, sans toucher au format des produits.
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<720?1.85:2.25));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=.91;
 renderer.shadowMap.enabled=true;
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
 yaw=.46;pitch=.13;distance=config.kind==='column'?3.10:2.68;
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
 label('composition-reference',config.reference||'À confirmer');
 label('composition-total',config.totalPublic||'À confirmer');
 label('composition-basin',config.kind==='column'?'Sans vasque':(labels[config.basinMode]||'')+(config.basinMode==='none'?'':' · '+config.basin)+(config.basinMode==='vessel'?' · '+config.basinFinish:''));
 label('composition-mirror',config.mirror==='Sans miroir'?'Sans miroir':config.mirror+' · '+(config.mirrorSize||'À définir')+(config.mirrorFinish?' · '+config.mirrorFinish:''));
 const img=$('composition-swatch');
 if(config.swatch){img.src=config.swatch;img.hidden=false}else img.hidden=true;
 const proofs=$('composition-proof-images');
 if(proofs){
  proofs.replaceChildren();
  const items=[
   ['Meuble',config.typePhoto?'assets/img/randal/types/'+config.typePhoto+'.webp':null],
   ['Vasque',config.basinMode!=='none'&&config.basin?'assets/img/randal/accessories/hd/basin-'+strip(config.basin).replace(/[^a-z0-9]+/g,'-')+'.webp':null],
   ['Miroir',config.mirrorPhoto?'assets/img/randal/accessories/'+config.mirrorPhoto+'.webp':null]
  ];
  for(const [name,src] of items){
   if(!src)continue;
   const card=document.createElement('div'),photo=document.createElement('img'),title=document.createElement('span');
   photo.src=src;photo.alt='Illustration officielle RANDAL : '+name;photo.loading='lazy';
   photo.onerror=()=>{photo.onerror=null;photo.src=src.replace('/hd/','/')};
   title.textContent=name;card.append(photo,title);
   if(name==='Vasque'&&config.model==='Harmony'){
    card.classList.add('composition-proof-action');
    card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Changer la vasque');
    card.onclick=()=>showCustomize('basin');
    card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showCustomize('basin')}};
   }
   proofs.appendChild(card);
  }
 }
}
async function open(config){
 const el=modal();
 if(!el.hidden)close();
 const generation=++sessionId;
 drawersOpen=false;drawers=[];
 contextFailed=false;previousFocus=document.activeElement;
 current=config;el.hidden=false;active=true;restoreOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 present(config);
 const drawerControls=$('composition-harmony-controls');
 if(drawerControls)drawerControls.hidden=!(config.model==='Harmony'&&config.typeId!=='column');
 const harmonyCustomize=$('composition-harmony-customize');
 if(harmonyCustomize){harmonyCustomize.hidden=config.model!=='Harmony';$('composition-customize-panel').hidden=true}

 $('composition-close').focus();
 const panel=$('composition-surface-panel');if(panel)panel.hidden=true;
 $('composition-floor').setAttribute('aria-expanded','false');
 $('composition-wall').setAttribute('aria-expanded','false');
 const area=$('composition-canvas');area.innerHTML='<div class="composition-loading" id="composition-loading">Préparation de votre aperçu 3D…</div>';
 $('composition-photo').disabled=false;
 try{
  await ensureThree();if(!active||generation!==sessionId)return;
  init(config);
 }catch(e){if(active&&generation===sessionId){contextFailed=true;releaseRenderer();fallback(config,e.message)}}
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
window.RandalComposition3D={open,close};
})();