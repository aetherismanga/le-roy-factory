/* RANDAL — Visualisation 3D paramétrique indicative. Modèles usine 3D non fournis.
   Dimensions et options reprises du configurateur ; Three.js chargé à la demande. */
(function(){
'use strict';
const THREE_URLS=['https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js','https://unpkg.com/three@0.152.2/build/three.min.js'];
let libraryPromise=null,renderer=null,scene=null,camera=null,stage=null,resizeObserver=null,raf=0;
let yaw=.47,pitch=.15,distance=2.75,lastPointer=null,lastPinch=null;
let active=false,previousFocus=null,restoreOverflow='',current=null,sessionId=0,contextFailed=false,surfaceChoice={floor:'elios-creta-ginepro',wall:'ivory'};
let drawers=[],drawersOpen=false,drawerAnimation=0,sceneGeneration=0,floorTextureTicket=0;
let dimensionsVisible=false,dimensionsCanvas=null,measureBounds=null,fullscreen3D=false;
let focusBounds=null,orbitTarget=null,cameraAnimation=0,cameraTouched=false,initialFitDistance=2.5;
let rootCabinet=null,extraColumn=null,mirrorScenePieces=[],extraCabinets=[],objectDrag=null;
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
 sub:'60 × 60 cm · rectifié',preview:'assets/img/elios/creta/textures/'+id+'.webp',base}))
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
 '<div class="composition-viewport">'+
 '<div id="composition-canvas" class="composition-canvas" role="img" aria-label="Modèle 3D manipulable de votre composition RANDAL">'+
 '<div class="composition-loading" id="composition-loading">Préparation de votre aperçu 3D…</div></div>'+
 '<div class="composition-stage-floating"><button type="button" id="composition-dimensions" aria-pressed="false" aria-label="Afficher les cotes et dimensions du meuble">◫ Cotes</button><button type="button" id="composition-add-item" aria-label="Ajouter un élément à la composition">＋ Ajouter un élément</button><button type="button" id="composition-fullscreen" aria-pressed="false" aria-label="Afficher la vue 3D en plein écran">⛶ Plein écran</button></div>'+
 '<div id="composition-object-menu" class="composition-object-menu" hidden></div>'+

 '<div class="composition-view-tools" role="group" aria-label="Personnaliser la salle de bain"><button type="button" id="composition-floor" aria-expanded="false" aria-controls="composition-surface-panel">Sol</button><button type="button" id="composition-wall" aria-expanded="false" aria-controls="composition-surface-panel">Mur</button><button type="button" id="composition-photo" aria-label="Enregistrer la photo 3D">↓ Image</button></div>'+
 '<div id="composition-surface-panel" class="composition-surface-panel" role="region" aria-label="Choix des matériaux" hidden><button type="button" id="composition-surface-close" class="composition-surface-close" aria-label="Fermer le choix des matériaux">×</button><strong id="composition-surface-title"></strong><div id="composition-surface-choices"></div><p>Creta 60 × 60 : coloris officiels du catalogue ELIOS.</p></div>'+
 '</div>'+
 '<p class="composition-gesture">Glissez pour tourner le meuble · Pincez pour zoomer</p>'+
 '<div class="composition-harmony-controls" id="composition-harmony-controls" hidden><button type="button" id="composition-drawers" aria-pressed="false" title="Tiroir supérieur avec compartiment siphon">Ouvrir les tiroirs</button></div>'+
 '<div class="composition-customize" id="composition-harmony-customize" hidden>'+
 '<button type="button" data-customize="color" aria-expanded="false">Changer la finition</button>'+
 '<button type="button" data-customize="basin" aria-expanded="false">Changer la vasque</button>'+
 '<div class="composition-customize-panel" id="composition-customize-panel" hidden></div></div>'+
 '</div><aside class="composition-details"><div class="composition-label">VOTRE COMPOSITION</div><h3 id="composition-model"></h3>'+
 '<div class="composition-selected"><div><span>Dimensions</span><strong id="composition-size"></strong></div>'+
 '<div><span>Finition du meuble</span><strong id="composition-color"></strong></div>'+
 '<div><span>Vasque / plan</span><strong id="composition-basin"></strong></div>'+
 '<div><span>Miroir</span><strong id="composition-mirror"></strong></div>'+
 '<div><span>Référence meuble</span><strong id="composition-reference"></strong></div>'+
 '<div><span>Composition · prix public</span><strong id="composition-total"></strong></div></div>'+
 '<div class="composition-swatch"><img id="composition-swatch" alt="Échantillon de la finition retenue"></div><div class="composition-proof"><h4>Illustrations du catalogue</h4><div id="composition-proof-images" class="composition-proof-images"></div></div>'+
 '<p class="composition-disclaimer">Projection 3D indicative : les proportions, la disposition et les teintes sont simulées à partir de votre sélection. Les dessins, caractéristiques et échantillons RANDAL font référence.</p>'+
 '</aside></div><div class="composition-footer"><button id="composition-back" type="button">Retour au récapitulatif</button></div></section>';
 document.body.appendChild(el);
 $('composition-close').addEventListener('click',close);
 $('composition-back').addEventListener('click',close);
 el.querySelector('[data-close]').addEventListener('click',close);
 $('composition-floor').addEventListener('click',()=>showSurface('floor'));
 $('composition-wall').addEventListener('click',()=>showSurface('wall'));
 $('composition-surface-close').addEventListener('click',()=>{
  const palette=$('composition-surface-panel');palette.hidden=true;
  $('composition-floor').setAttribute('aria-expanded','false');$('composition-wall').setAttribute('aria-expanded','false');
 });
 $('composition-dimensions').addEventListener('click',toggleDimensions);
 $('composition-fullscreen').addEventListener('click',toggleFullscreen);
 document.addEventListener('fullscreenchange',()=>{
  if(document.fullscreenElement===el)return;
  if(fullscreen3D){fullscreen3D=false;el.classList.remove('composition-fullscreen');
   const b=$('composition-fullscreen');if(b){b.setAttribute('aria-pressed','false');b.textContent='⛶ Plein écran';}}
 });
 $('composition-add-item').addEventListener('click',showAddMenu);
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
 scene=null;drawers=[];rootCabinet=null;extraColumn=null;mirrorScenePieces=[];extraCabinets=[];
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
 cancelAnimationFrame(cameraAnimation);cameraAnimation=0;
 scene=null;camera=null;stage=null;lastPointer=null;lastPinch=null;dimensionsCanvas=null;measureBounds=null;focusBounds=null;orbitTarget=null;cameraTouched=false;
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
 // Fermer le sélecteur sans quitter la visualisation 3D.
 const closeButton=document.createElement('button');
 closeButton.type='button';closeButton.className='composition-options-close';
 closeButton.textContent='✕ Fermer et voir mon meuble';
 closeButton.style.cssText='display:block;width:100%;min-height:48px;margin:12px 0;padding:12px;border:1px solid #718a77;border-radius:12px;background:#e6eee7;color:#294638;font-weight:700;cursor:pointer';
 closeButton.onclick=()=>{panel.hidden=true;$('composition-harmony-customize')?.querySelectorAll('[data-customize]').forEach(el=>el.setAttribute('aria-expanded','false'));};
 panel.appendChild(closeButton);
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
  // Revenir automatiquement au meuble après le choix.
  panel.hidden=true;
  $('composition-harmony-customize')?.querySelectorAll('[data-customize]').forEach(el=>el.setAttribute('aria-expanded','false'));
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
 if(current.model==='Harmony'&&current.basinMode==='integrated'&&Number(current.width)===120){
  section('Nombre de cuves');
  for(const [layout,title] of [['single','Vasque simple · 1 cuve'],['double','Vasque double · 2 cuves']]){
   const image='assets/img/randal/accessories/'+(layout==='double'?'basin-'+strip(current.basin)+'-double.webp':'basin-'+strip(current.basin)+'.webp');
   addOption(title,image,current.basinLayout===layout,()=>update({basinLayout:layout}));
  }
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

function hideObjectMenu(){const p=$('composition-object-menu');if(p)p.hidden=true}
function sceneChange(patch){
 if(!current?.onChange)return;
 const next=current.onChange(patch);if(!next)return;
 current=next;hideObjectMenu();redrawCurrent();
}
function sceneMenu(title,create){
 const panel=$('composition-object-menu');if(!panel)return;
 panel.replaceChildren();panel.hidden=false;
 const h=document.createElement('div');h.className='composition-menu-head';
 const b=document.createElement('strong');b.textContent=title;
 const close=document.createElement('button');close.type='button';close.textContent='×';close.onclick=hideObjectMenu;
 h.append(b,close);panel.appendChild(h);create(panel);
}
function sceneButton(panel,text,action){
 const b=document.createElement('button');b.type='button';b.className='composition-menu-action';b.textContent=text;b.onclick=action;panel.appendChild(b);
}
function sceneSelect(panel,name,options,value,callback){
 const lab=document.createElement('label');lab.textContent=name;panel.appendChild(lab);
 const el=document.createElement('select');
 for(const pair of options){const option=document.createElement('option');option.value=pair[0];option.textContent=pair[1];el.appendChild(option)}
 el.value=value;el.onchange=()=>callback(el.value);panel.appendChild(el);
}
function showObjectMenu(kind){
 if(!current)return;
 sceneMenu(({meuble:'Meuble',vasque:'Vasque',miroir:'Miroir',colonne:'Colonne'})[kind]||'Élément',panel=>{
  if(kind==='meuble'){
   sceneButton(panel,'Dupliquer la composition',()=>sceneChange({quantity:Math.min(9,Number(current.quantity||1)+1)}));
   if(current.widths?.length)sceneSelect(panel,'Format',current.widths.map(w=>[String(w),w+' cm']),String(current.width),v=>sceneChange({width:Number(v)}));
   if(current.finishes?.length)sceneSelect(panel,'Finition',current.finishes.map(x=>[x,x]),current.color,v=>sceneChange({color:v}));
  }
  if(kind==='colonne'){
   sceneButton(panel,current.columnAccessory?'Retirer la colonne':'Ajouter une colonne',()=>sceneChange({columnAccessory:!current.columnAccessory}));
   if(!current.columnAvailable)sceneButton(panel,'Colonne indisponible pour cette collection',()=>{});
  }
  if(kind==='miroir'){
   const list=['Sans miroir',...Object.keys(current.mirrorFormats||{})];
   sceneSelect(panel,'Modèle',list.map(x=>[x,x]),current.mirror||'Sans miroir',v=>sceneChange({mirror:v}));
   const formats=current.mirrorFormats?.[current.mirror]||[];
   if(formats.length)sceneSelect(panel,'Dimensions',formats.map(x=>[x[0],x[0]]),current.mirrorSize,v=>sceneChange({mirrorSize:v}));
   if(current.mirror?.includes('métallique'))sceneSelect(panel,'Couleur du cadre',['Noir','Doré','Bronze','Argent'].map(x=>[x,x]),current.mirrorFinish,v=>sceneChange({mirrorFinish:v}));
   if(current.mirror!=='Sans miroir')sceneButton(panel,'Dupliquer le miroir',()=>sceneChange({mirrorQuantity:Math.min(3,Number(current.mirrorQuantity||1)+1)}));
  }
  if(kind==='vasque')sceneButton(panel,'Choisir la vasque et sa finition',()=>{hideObjectMenu();showCustomize('basin')});
 });
}
function showAddMenu(){
 if(!current)return;
 sceneMenu('Ajouter un élément',panel=>{
  sceneButton(panel,'＋ Meuble',()=>sceneChange({quantity:Math.min(9,Number(current.quantity||1)+1)}));
  sceneButton(panel,'＋ Colonne',()=>current.columnAvailable?sceneChange({columnAccessory:true}):showObjectMenu('colonne'));
  sceneButton(panel,'＋ Miroir',()=>current.mirror==='Sans miroir'?sceneChange({mirror:'Basic'}):showObjectMenu('miroir'));
  sceneButton(panel,'＋ Vasque',()=>current.basinMode==='none'?sceneChange({basinMode:'integrated'}):showObjectMenu('vasque'));
 });
}
function redrawCurrent(){
 if(!active||!current)return;
 hideObjectMenu();
 cancelAnimationFrame(drawerAnimation);drawerAnimation=0;drawersOpen=false;
 $('composition-drawers').textContent='Ouvrir les tiroirs';
 $('composition-drawers').setAttribute('aria-pressed','false');
 if(scene&&renderer&&camera){
  disposeScene();buildScene(current);requestFrame();
 }
 present(current);
}

function syncSurfaceLabels(){
 const floor=FLOOR_OPTIONS.find(item=>item.id===surfaceChoice.floor)||FLOOR_OPTIONS[0];
 const wallSpec=WALL_COLORS[surfaceChoice.wall],wall=wallSpec?.label||'Personnalisé';
 function chip(btn,kind,name,base,preview){
  if(!btn)return;
  const swatch=document.createElement('span');swatch.className='composition-material-swatch';swatch.style.backgroundColor=base;
  if(preview){const img=document.createElement('img');img.src=preview;img.alt='';img.decoding='async';swatch.appendChild(img)}
  const label=document.createElement('span');label.className='composition-material-label';
  const small=document.createElement('small');small.textContent=kind;
  const strong=document.createElement('strong');strong.textContent=name;label.append(small,strong);
  const arrow=document.createElement('span');arrow.className='composition-material-chevron';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');
  btn.replaceChildren(swatch,label,arrow);
  btn.title=kind+' · '+name;btn.setAttribute('aria-label','Modifier '+(kind==='Sol'?'le carrelage du sol':'la couleur du mur')+', actuellement '+name);
 }
 chip($('composition-floor'),'Sol',floor.label.replace('ELIOS · ','').replace('VIEW · ',''),floor.base,floor.preview);
 chip($('composition-wall'),'Mur',wall,wallSpec?.hex||(/^#[0-9a-f]{6}$/i.test(surfaceChoice.wall)?surfaceChoice.wall:'#c9c5ba'),null);
}
// Changer le décor ne doit jamais fermer les tiroirs, modifier le zoom ou recréer la 3D.
function updateSurfaceLive(which){
 if(!scene||!renderer)return;
 if(which==='wall'){
  const material=scene.getObjectByName('RANDAL_InteriorWall')?.material;
  if(material)material.color.set(WALL_COLORS[surfaceChoice.wall]?.hex||surfaceChoice.wall);
 }else if(which==='floor'){
  const material=scene.getObjectByName('RANDAL_InteriorFloor')?.material;
  if(material)applyFloorTexture(material);
 }
 requestFrame();
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
  button.onclick=()=>{surfaceChoice[which]=item.id;syncSurfaceLabels();panel.hidden=true;
   $('composition-floor').setAttribute('aria-expanded','false');
   $('composition-wall').setAttribute('aria-expanded','false');
   updateSurfaceLive(which);
  };
  list.appendChild(button);
 }
 const help=panel.querySelector('p');
 if(which==='wall'){
  const picker=document.createElement('label');picker.className='composition-custom-wall';
  picker.textContent='Couleur personnalisée';
  const input=document.createElement('input');input.type='color';
  input.value=WALL_COLORS[surfaceChoice.wall]?.hex||(/^#[0-9a-f]{6}$/i.test(surfaceChoice.wall)?surfaceChoice.wall:'#c9c5ba');
  input.setAttribute('aria-label','Choisir librement la couleur du mur');
  input.addEventListener('input',e=>{
    surfaceChoice.wall=e.target.value;syncSurfaceLabels();
    if(scene){
      const wall=scene.getObjectByName('RANDAL_InteriorWall');
      if(wall){wall.material.color.set(surfaceChoice.wall);requestFrame();}
    }
  });
  input.addEventListener('change',e=>{surfaceChoice.wall=e.target.value;syncSurfaceLabels();panel.hidden=true;$('composition-floor').setAttribute('aria-expanded','false');$('composition-wall').setAttribute('aria-expanded','false');updateSurfaceLive('wall')});
  picker.appendChild(input);list.appendChild(picker);
 }
 if(help)help.textContent=which==='floor'?'Creta ELIOS : véritables échantillons 60 × 60 cm, 8 coloris.':'Peinture mate : choisissez une teinte du nuancier ou personnalisez-la.';
}
function close(){
 const drawerButton=$('composition-drawers');
 if(drawerButton){drawerButton.textContent='Ouvrir les tiroirs';drawerButton.setAttribute('aria-pressed','false')}
 const el=$('randal-composition-dialog');if(!el||el.hidden)return;
 fullscreen3D=false;el.classList.remove('composition-fullscreen');
 if(document.fullscreenElement===el)document.exitFullscreen?.().catch(()=>{});
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
// Meubles Harmony : finition mate et chants nets comme sur les visuels officiels.
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
   for(let i=0;i<740;i++){
    const x=rand()*1024,w=.15+rand()*1.25,y=rand()*1024;
    ctx.beginPath();
    ctx.strokeStyle=rand()>.5?'rgba(59,37,18,.105)':'rgba(255,247,220,.11)';
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
  if(wood){material.bumpMap=texture;material.bumpScale=.0024;}
  material.needsUpdate=true;
  requestFrame();
 };
 image.onerror=()=>{};
 image.src=url;
}
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
 const twin=width>=1.16&&config.model==='Harmony'&&!vesselMode&&config.basinLayout==='double';
 const sinks=Array.from({length:twin?2:1},(_,i)=>twin?(i===0?-1:1)*width*.255:0);
 const isHarmonyBasin=!vesselMode&&config.model==='Harmony';
 // Les cuves intégrées suivent le modèle choisi : Sella elliptique, Tampa à angles adoucis.
 // Deux cuves sont modélisées seulement pour Harmony 120 cm lorsque la double vasque est choisie.
 const tampa=strip(config.basin).includes('tampa');
 const unitWidth=width/(twin?2:1);
 const basinWidth=Math.min(twin?.44:.53,Math.max(.36,unitWidth*(tampa?.77:.73)));
 const rw=basinWidth/2,rd=tampa?.137:.158;
 const profilePower=tampa?4.7:2.05;
 const basinPoint=(angle,scale=1)=>{
  const c=Math.cos(angle),sn=Math.sin(angle),pow=2/profilePower;
  return [Math.sign(c)*Math.pow(Math.abs(c),pow)*rw*scale,Math.sign(sn)*Math.pow(Math.abs(sn),pow)*rd*scale];
 };
 if(isHarmonyBasin){
  // Plan de céramique avec découpes RÉELLES (extrusion avec trous).
  // L'ancien plan plein masquait la cuve et donnait l'impression d'une vasque dessinée.
  const w2=(width+.025)/2,d2=(depth+.012)/2;
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
  putBox(basinGroup,0,height+.015,0,width+.025,.027,depth+.012,counterSurface);
 }
 for(const x of sinks){
  if(vesselMode){
   const neris=strip(config.basin).includes('neris');
   // Neris ovale / Torne ronde, fond concave et épaisseur de céramique visible.
   const r=neris?.18:.185,h=neris?.14:.12;
   const profile=[
    new THREE.Vector2(.014,.01),new THREE.Vector2(r*.42,.008),
    new THREE.Vector2(r*.78,.015),new THREE.Vector2(r*.94,h*.55),
    new THREE.Vector2(r,h),new THREE.Vector2(r*.962,h+.008)
   ];
   const mesh=new THREE.Mesh(new THREE.LatheGeometry(profile,72),vesselCeramic);
   mesh.position.set(x,height+.031,.027);mesh.scale.set(neris?1.27:1,1,neris?.9:1);
   mesh.castShadow=true;mesh.receiveShadow=true;basinGroup.add(mesh);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(r,.006,12,80),vesselCeramic);
   rim.rotation.x=-Math.PI/2;rim.position.set(x,height+.031+h,.027);
   rim.scale.set(neris?1.27:1,1,neris?.9:1);basinGroup.add(rim);
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
 const loadTicket=++floorTextureTicket;
 const item=FLOOR_OPTIONS.find(x=>x.id===surfaceChoice.floor)||FLOOR_OPTIONS[0];
 if(material.map){material.map.dispose();material.map=null;}
 material.color.set(item.base);material.roughness=.84;material.metalness=0;material.needsUpdate=true;
 requestFrame();
 if(!item.preview){loadCocoFloor(material,loadTicket);return;}
 const ticket=sceneGeneration,session=sessionId;
 const image=new Image();image.decoding='async';
 image.onload=()=>{
  if(!scene||ticket!==sceneGeneration||session!==sessionId||!active||loadTicket!==floorTextureTicket)return;
  // Atlas de 2 x 2 dalles Creta, dimensions réelles 60x60.
  // Un seul maillage plat de 18 m : aucun rebord, aucune marche.
  const tile=window.innerWidth<760?512:768,total=(window.innerWidth<760?512:768)*2,canvas=document.createElement('canvas');
  canvas.width=canvas.height=total;
  const ctx=canvas.getContext('2d',{alpha:false});
  const variants=[0,1,3,2];
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
   const x=col*tile,y=row*tile,k=variants[row*2+col];
   ctx.save();
   ctx.translate(x+tile/2,y+tile/2);
   ctx.rotate(k*Math.PI/2);
   ctx.drawImage(image,-tile/2,-tile/2,tile,tile);
   ctx.restore();
   // Joint 2 à 3 mm environ à l'échelle de 60 cm.
   ctx.strokeStyle='rgba(77,69,62,.23)';ctx.lineWidth=3;
   ctx.strokeRect(x+1.5,y+1.5,tile-3,tile-3);
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(9/1.2,9/1.2);
  texture.anisotropy=Math.min(12,renderer?.capabilities.getMaxAnisotropy?.()||8);
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  if(material.map)material.map.dispose();
  material.color.set('#ffffff');material.map=texture;material.needsUpdate=true;
  requestFrame();
 };
 image.onerror=()=>{console.warn('Texture officielle ELIOS indisponible:',item.preview);requestFrame()};
 image.src=item.preview;
}
function loadCocoFloor(material,loadTicket){
 const uri=window.RANDAL_VIEW_COCO_BEIGE;
 if(!uri)return;
 const generation=sessionId,sceneTicket=sceneGeneration,image=new Image();
 image.onload=()=>{
  if(!active||generation!==sessionId||sceneTicket!==sceneGeneration||!scene||loadTicket!==floorTextureTicket)return;
  const texture=new THREE.Texture(image);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(9/.6,9/.4);texture.anisotropy=8;texture.needsUpdate=true;
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
  const door=putBox(cabinet,0,cy,front,w-.025,h/2-.009,.017,finish);
  door.name='Porte_colonne_Harmony_'+(i+1);
  // Relief d'onglet 45° de la porte haute et basse, coordonné au décor de façade.
  const bevel=new THREE.Mesh(new THREE.BoxGeometry(w-.030,.019,.019),finish);
  bevel.rotation.x=-Math.PI/4;
  bevel.position.set(0,cy+h/4-.016,front+.011);
  bevel.castShadow=true;bevel.receiveShadow=true;cabinet.add(bevel);
  // Joint d'ombre au niveau de la prise de main entre les deux portes.
  putBox(cabinet,0,i===0?h/2-.005:h/2+.005,front+.016,w-.051,.003,.006,edge);
 }
}

function buildHarmonyCabinet(cabinet,config,w,h,d,finish,edge,metal,dark){
 const feet=config.typeId==='three',legH=feet?.105:0;
 // 79 cm incluent les pieds, et non 79 cm + pieds.
 const bodyHeight=h-legH,bodyBottom=legH,bodyTop=legH+bodyHeight,side=.016;
 const woodInterior=newMat('#a6a29a',.78);
 // Corps creux : flancs, fond arrière, fond et traverse supérieure.
 putBox(cabinet,-w/2+side/2,bodyBottom+bodyHeight/2,0,side,bodyHeight,d,finish);
 putBox(cabinet,w/2-side/2,bodyBottom+bodyHeight/2,0,side,bodyHeight,d,finish);
 putBox(cabinet,0,bodyBottom+.011,0,w-2*side,.022,d-.02,woodInterior);
 // Ancienne traverse retirée : elle traversait la vasque au niveau du creux.
 // Traverse arrière hors de l'empreinte de toutes les cuves.
 putBox(cabinet,0,bodyTop-.028,-d/2+.016,w-2*side,.045,.028,woodInterior);
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
  harmonyDrawerFloor(drawer,w,d,base,woodInterior,i===0,w>1.16&&config.basinMode==='integrated'&&config.basinLayout==='double');
   // Glissières fixes et coulissantes superposées : le tiroir reste visuellement relié au caisson.
   for(const xx of [-w/2+.053,w/2-.053]){
    putBox(cabinet,xx,base+.061,-.033,.010,.021,d-.095,metal);
    putBox(drawer,xx,base+.061,-.023,.008,.014,d-.14,metal);
   }
  // Profil de prise de main intégré dans le chant : jamais de barre rapportée.
  putBox(drawer,0,center+frontH/2-.003,frontZ+.010,w-.055,.003,.006,edge);
  drawer.userData.closedZ=drawer.position.z;cabinet.add(drawer);drawers.push(drawer);
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
 if(!drawers.length)return;
 // Des positions fermées absolues garantissent la réversibilité de l'animation.
 // Ancien bug : en refermant, les tiroirs restaient parfois à leur position ouverte.
 const starts=drawers.map(drawer=>drawer.position.z);
 // Débattement réaliste : chaque tiroir garde au moins ~20 cm engagés dans le caisson.
 // Coulisses toujours engagées dans le caisson, sorties davantage pour voir l'intérieur.
 const travel=i=>drawers.length===3?(i===0?.165:i===1?.215:.265):(i===0?.19:.265);
 const targets=drawers.map((drawer,i)=>(drawer.userData.closedZ??0)+(drawersOpen?travel(i):0));
 const began=performance.now(),duration=620,ticket=sessionId;
 function frame(now){
  drawerAnimation=0;
  if(!active||ticket!==sessionId)return;
  drawers.forEach((drawer,i)=>{
   const progress=clamp((now-began-i*38)/duration,0,1),ease=progress*progress*(3-2*progress);
   drawer.position.z=starts[i]+(targets[i]-starts[i])*ease;
  });
  requestFrame();
  if(now-began<duration+(drawers.length-1)*38)drawerAnimation=requestAnimationFrame(frame);
 }
 drawerAnimation=requestAnimationFrame(frame);
}

function buildScene(config){
 sceneGeneration++;
 scene=new THREE.Scene();scene.background=new THREE.Color('#d8d4ce');
 // Éclairage doux : les anciennes intensités surexposaient entièrement les bois.
 const ambient=new THREE.HemisphereLight(0xfff6ed,0x87857e,.63);scene.add(ambient);
 const bounce=new THREE.AmbientLight(0xfff8ed,.08);scene.add(bounce);
 const light=new THREE.DirectionalLight(0xfff5eb,1.22);light.position.set(-2.4,4.5,3.0);light.castShadow=true;light.shadow.radius=3;light.shadow.mapSize.set(window.innerWidth<720?1024:2048,window.innerWidth<720?1024:2048);light.shadow.camera.left=-3.1;light.shadow.camera.right=3.1;light.shadow.camera.top=3.1;light.shadow.camera.bottom=-3.1;light.shadow.normalBias=.003;
 // Ombres de contact douces : densité ajustée à la puissance du terminal.
 light.shadow.bias=-.00012;scene.add(light);
 const accent=new THREE.PointLight(0xfff3e6,.40,6);accent.position.set(1.9,2.9,2.1);scene.add(accent);
 const wall=newMat(WALL_COLORS[surfaceChoice.wall]?.hex||(/^#[0-9a-f]{6}$/i.test(surfaceChoice.wall)?surfaceChoice.wall:WALL_COLORS.cream.hex),.94);
 const wallMesh=new THREE.Mesh(new THREE.PlaneGeometry(12,4.7),wall);wallMesh.position.set(0,2.35,-.62);wallMesh.receiveShadow=true;wallMesh.name='RANDAL_InteriorWall';scene.add(wallMesh);
 // Un seul plan continu au niveau zéro, sans tranche apparente ni fausse marche.
 const floor=newMat('#d8d0c5',.88);const floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(9,9),floor);
 floorMesh.rotation.x=-Math.PI/2;floorMesh.position.set(0,-.005,0);floorMesh.receiveShadow=true;floorMesh.name='RANDAL_InteriorFloor';scene.add(floorMesh);
 applyFloorTexture(floor);
 const width=clamp((Number(config.width)||80)/100,.35,1.56),height=clamp((Number(config.height)||53)/100,.1,1.75),depth=clamp((Number(config.depth)||45)/100,.22,.55);
 const isColumn=config.kind==='column';
 const isCounter=config.kind==='counter';
 const legs=(config.typeId==='three'||config.typeId==='three-door'||config.model==='Brent')&&!isColumn?.12:0;
 // Dos du meuble aligné sur le mur sans ressaut de sol.
 // On accole systématiquement le dos du meuble à cette face (tolérance 1.8 cm).
 const wallFrontZ=-.65+.06/2,flushOffset=.014;
 const backWallCabinetZ=wallFrontZ+depth/2+flushOffset;
 // Les meubles suspendus doivent réellement flotter au-dessus du sol.
 const floatingHeight=!isColumn&&!isCounter&&!legs?.39:0;
 const cabinet=new THREE.Group();cabinet.userData.randalKind='meuble';rootCabinet=cabinet;
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
 const mirrorStart=scene.children.length;
 mirror(config,width,height+floatingHeight);
 const mirrorGroup=new THREE.Group();mirrorGroup.userData.randalKind='miroir';
 for(const part of scene.children.slice(mirrorStart)){scene.remove(part);mirrorGroup.add(part)}
 if(mirrorGroup.children.length){scene.add(mirrorGroup);mirrorScenePieces=[mirrorGroup]}
 extraColumn=null;
 if(config.columnAccessory&&config.columnAvailable&&!isColumn){
  extraColumn=new THREE.Group();extraColumn.userData.randalKind='colonne';
  extraColumn.position.set(width/2+.30,0,backWallCabinetZ);
  buildHarmonyColumn(extraColumn,.35,1.50,.31,finish,edge);
  scene.add(extraColumn);
 }
 extraCabinets=[];
 if(Number(config.quantity)>1&&!isColumn){
  const duplicate=cabinet.clone(true);duplicate.userData.randalKind='meuble';
  duplicate.position.x=-(width+.14);scene.add(duplicate);extraCabinets.push(duplicate);
 }
 focusBounds=new THREE.Box3().setFromObject(cabinet);
 if(extraColumn)focusBounds.expandByObject(extraColumn);
 for(const p of extraCabinets)focusBounds.expandByObject(p);
 for(const part of mirrorScenePieces)focusBounds.expandByObject(part);
 if(config.model==='Harmony'&&drawers.length)focusBounds.max.z+=.10;
 focusBounds.expandByScalar(.035);
 measureBounds={w:width,h:height,d:depth,y:floatingHeight,z:backWallCabinetZ};
 return {width,height,depth};
}
function nameToDoor(config){return strip(config.typeName).includes('porte')}
// Mesures en projection perspective, recalculées lors de chaque rotation ou zoom.
// Canvas transparent indépendant : aucune cotation ne modifie la géométrie des meubles.
function toggleDimensions(){
 dimensionsVisible=!dimensionsVisible;
 const btn=$('composition-dimensions');
 if(btn){btn.setAttribute('aria-pressed',String(dimensionsVisible));btn.textContent=dimensionsVisible?'✓ Masquer les cotes':'◫ Cotes';btn.setAttribute('aria-label',dimensionsVisible?'Masquer les cotes et dimensions du meuble':'Afficher les cotes et dimensions du meuble');}
 requestFrame();
}
function toggleFullscreen(){
 const el=$('randal-composition-dialog'),btn=$('composition-fullscreen');if(!el||!btn)return;
 fullscreen3D=!fullscreen3D;el.classList.toggle('composition-fullscreen',fullscreen3D);
 // Fullscreen API si le navigateur mobile l'autorise; le mode CSS reste le secours.
 if(fullscreen3D){try{el.requestFullscreen?.({navigationUI:'hide'})?.catch(()=>{});}catch(e){}}
 else if(document.fullscreenElement===el)document.exitFullscreen?.().catch(()=>{});
 btn.setAttribute('aria-pressed',String(fullscreen3D));
 btn.textContent=fullscreen3D?'⤢ Réduire':'⛶ Plein écran';
 btn.setAttribute('aria-label',fullscreen3D?'Quitter le plein écran 3D':'Afficher la vue 3D en plein écran');
 const surfacePanel=$('composition-surface-panel');if(surfacePanel)surfacePanel.hidden=true;
 $('composition-floor').setAttribute('aria-expanded','false');$('composition-wall').setAttribute('aria-expanded','false');
 requestAnimationFrame(()=>{
  const area=$('composition-canvas');
  if(renderer&&camera&&area){
   const w=Math.max(250,area.clientWidth),h=Math.max(250,area.clientHeight);
   renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();adaptFraming();
  }
  requestFrame();
 });
}
function ensureDimensionsCanvas(){
 const area=$('composition-canvas');
 if(!area)return;
 if(!dimensionsCanvas){
  dimensionsCanvas=document.createElement('canvas');
  dimensionsCanvas.className='composition-dimensions-layer';
  dimensionsCanvas.setAttribute('aria-hidden','true');
  area.appendChild(dimensionsCanvas);
 }
}
function drawDimensions(){
 if(!dimensionsCanvas||!camera||!measureBounds)return;
 dimensionsCanvas.style.display=dimensionsVisible?'block':'none';
 if(!dimensionsVisible)return;
 const area=$('composition-canvas'),w=Math.max(1,area.clientWidth),h=Math.max(1,area.clientHeight);
 const ratio=Math.min(window.devicePixelRatio||1,2);
 const pw=Math.round(w*ratio),ph=Math.round(h*ratio);
 if(dimensionsCanvas.width!==pw||dimensionsCanvas.height!==ph){
  dimensionsCanvas.width=pw;dimensionsCanvas.height=ph;
 }
 const ctx=dimensionsCanvas.getContext('2d');
 ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.clearRect(0,0,w,h);
 const b=measureBounds;
 const placedLabels=[]; // Une étiquette par mesure, sans collisions ni recouvrement de la barre matières.
 const xy=(x,y,z)=>{
  const p=new THREE.Vector3(x,y,z).project(camera);
  return {x:(p.x+1)*w/2,y:(1-p.y)*h/2,visible:p.z>-1&&p.z<1};
 };
 const guide=(a,c,stroke)=>{
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);
  ctx.strokeStyle='rgba(255,255,255,.93)';ctx.lineWidth=5;ctx.stroke();
  ctx.strokeStyle=stroke;ctx.lineWidth=2.3;ctx.stroke();
 };
 function dimension(label,color,start,end,ext1,ext2,labelDX=0,labelDY=0){
  const a=xy(...start),c=xy(...end),ea=xy(...ext1),ec=xy(...ext2);
  if(!a.visible||!c.visible)return;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  guide(ea,a,color);guide(ec,c,color);guide(a,c,color);
  const dx=c.x-a.x,dy=c.y-a.y,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
  for(const [p,d] of [[a,1],[c,-1]]){
   ctx.beginPath();ctx.moveTo(p.x,p.y);
   ctx.lineTo(p.x+d*ux*10-uy*4,p.y+d*uy*10+ux*4);
   ctx.moveTo(p.x,p.y);
   ctx.lineTo(p.x+d*ux*10+uy*4,p.y+d*uy*10-ux*4);
   ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.stroke();
  }
  const tx=(a.x+c.x)/2,ty=(a.y+c.y)/2;
  ctx.font='bold 13px system-ui,Arial,sans-serif';
  const textWidth=ctx.measureText(label).width;
  const bw=textWidth+22,bh=27;
  const minX=bw/2+7,maxX=Math.max(minX,w-bw/2-7);
  const minY=73,maxY=Math.max(minY,h-85);
  const candidates=[[labelDX,labelDY],[labelDX+65,labelDY-55],[labelDX-65,labelDY-55],[labelDX,labelDY-75],[labelDX+65,labelDY+55],[labelDX-65,labelDY+55]];
  let best=null,bestPenalty=Infinity;
  for(const [dx,dy] of candidates){
   const px=clamp(tx+dx,minX,maxX),py=clamp(ty+dy,minY,maxY);
   const b={left:px-bw/2-9,right:px+bw/2+9,top:py-bh/2-9,bottom:py+bh/2+9};
   const overlap=placedLabels.reduce((total,t)=>total+Math.max(0,Math.min(b.right,t.right)-Math.max(b.left,t.left))*Math.max(0,Math.min(b.bottom,t.bottom)-Math.max(b.top,t.top)),0);
   const penalty=overlap*30+Math.abs(px-tx-dx)*.4+Math.abs(py-ty-dy)*.4+Math.hypot(dx-labelDX,dy-labelDY)*.1;
   if(penalty<bestPenalty){best={px,py,b};bestPenalty=penalty;}
   if(overlap===0&&Math.abs(px-tx-dx)<1&&Math.abs(py-ty-dy)<1)break;
  }
  const {px,py}=best;placedLabels.push(best.b);
  ctx.fillStyle='rgba(255,255,255,.97)';
  ctx.beginPath();ctx.roundRect(px-bw/2,py-bh/2,bw,bh,7);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,px,py+.5);
  ctx.restore();
 }
 const front=b.z+b.d/2+.06,back=b.z-b.d/2;
 // Un léger écart entre traits et produit améliore la lecture sur téléphone.
 dimension('L '+Math.round(b.w*100)+' cm','#d33f38',
  [-b.w/2,b.y+b.h+.13,front],[b.w/2,b.y+b.h+.13,front],
  [-b.w/2,b.y+b.h,front-.06],[b.w/2,b.y+b.h,front-.06]);
 dimension('H '+Math.round(b.h*100)+' cm','#2268d6',
  [b.w/2+.16,b.y,front],[b.w/2+.16,b.y+b.h,front],
  [b.w/2,b.y,front-.05],[b.w/2,b.y+b.h,front-.05]);
 // La profondeur est dessinée sur le bord supérieur droit pour la dissocier de la hauteur.
 dimension('P '+Math.round(b.d*100)+' cm','#16834d',
  [b.w/2+.17,b.y+b.h+.06,back-.05],[b.w/2+.17,b.y+b.h+.06,front],
  [b.w/2,b.y+b.h,back],[b.w/2,b.y+b.h,front-.06],25,-36);
}
function renderFrame(){raf=0;if(!active||!renderer||!scene||!camera)return;renderer.render(scene,camera);drawDimensions()}
function requestFrame(){if(!raf&&active)raf=requestAnimationFrame(renderFrame)}
function getOrbitTarget(){return orbitTarget||focusBounds?.getCenter(new THREE.Vector3())||new THREE.Vector3(0,.78,-.25)}
// Ajuster les huit coins du meuble dans la zone libre entre les commandes mobiles.
function computeFitDistance(a=yaw,p=pitch,target=null){
 if(!camera||!focusBounds||focusBounds.isEmpty())return 2.5;
 const area=$('composition-canvas'),w=Math.max(250,area?.clientWidth||360),h=Math.max(250,area?.clientHeight||420);
 const center=target||focusBounds.getCenter(new THREE.Vector3()),probe=camera.clone();
 probe.aspect=w/h;probe.updateProjectionMatrix();
 const mn=focusBounds.min,mx=focusBounds.max;
 const corners=[[mn.x,mn.y,mn.z],[mn.x,mn.y,mx.z],[mn.x,mx.y,mn.z],[mn.x,mx.y,mx.z],
 [mx.x,mn.y,mn.z],[mx.x,mn.y,mx.z],[mx.x,mx.y,mn.z],[mx.x,mx.y,mx.z]]
 .map(([x,y,z])=>new THREE.Vector3(x,y,z));
 const top=1-2*Math.min(136,h*.31)/h,bottom=-1+2*Math.min(101,h*.26)/h;
 function fits(d){
  probe.position.set(center.x+Math.sin(a)*d,center.y+Math.sin(p)*d,center.z+Math.cos(a)*d);
  probe.lookAt(center);probe.updateMatrixWorld();
  return corners.every(v=>{
   const projected=v.clone().project(probe);
   return projected.z<1&&projected.x>=-.82&&projected.x<=.82&&projected.y<=top&&projected.y>=bottom;
  });
 }
 let near=.48,far=15;
 for(let i=0;i<22;i++){const mid=(near+far)/2;if(fits(mid))far=mid;else near=mid;}
 return clamp(far*1.045,.64,12);
}
function stopCameraAnimation(){cancelAnimationFrame(cameraAnimation);cameraAnimation=0;}
function setCameraButtons(view){
 const f=$('composition-view-front'),a=$('composition-view-angle');
 if(f)f.setAttribute('aria-pressed',String(view==='front'));
 if(a)a.setAttribute('aria-pressed',String(view==='angle'));
}
function moveCamera(){
 if(!camera)return;
 const target=getOrbitTarget();
 camera.position.set(target.x+Math.sin(yaw)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*distance);
 camera.lookAt(target);requestFrame();
}
function setCameraPreset(mode){
 if(!camera||!focusBounds)return;
 stopCameraAnimation();
 const endYaw=mode==='front'?0:.43,endPitch=mode==='front'?.085:.17;
 const target=focusBounds.getCenter(new THREE.Vector3());
 const endDistance=computeFitDistance(endYaw,endPitch,target),from={yaw,pitch,distance,target:getOrbitTarget().clone()};
 const started=performance.now(),ticket=sessionId;
 cameraTouched=false;initialFitDistance=endDistance;
 setCameraButtons(mode==='front'?'front':'angle');
 function frame(now){
  cameraAnimation=0;
  if(!active||!camera||sessionId!==ticket)return;
  const t=clamp((now-started)/480,0,1),e=t*t*(3-2*t);
  yaw=from.yaw+(endYaw-from.yaw)*e;pitch=from.pitch+(endPitch-from.pitch)*e;
  distance=from.distance+(endDistance-from.distance)*e;orbitTarget=from.target.clone().lerp(target,e);
  moveCamera();
  if(t<1)cameraAnimation=requestAnimationFrame(frame);
 }
 cameraAnimation=requestAnimationFrame(frame);
}
function adaptFraming(){
 if(!camera)return;
 if(!cameraTouched&&!cameraAnimation&&focusBounds){
  orbitTarget=focusBounds.getCenter(new THREE.Vector3());
  distance=computeFitDistance(yaw,pitch,orbitTarget);
  initialFitDistance=distance;
 }
 moveCamera();
}

function detectObject(canvas,e){
 if(!scene||!camera||!THREE)return null;
 const r=canvas.getBoundingClientRect();
 const xy=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
 const ray=new THREE.Raycaster();ray.setFromCamera(xy,camera);
 const candidates=[rootCabinet,extraColumn,...mirrorScenePieces,...extraCabinets].filter(Boolean);
 const hit=ray.intersectObjects(candidates,true)[0];if(!hit)return null;
 for(let obj=hit.object;obj;obj=obj.parent){
  if(obj.userData?.randalSelectBasin)return'vasque';
  if(obj.userData?.randalKind)return obj.userData.randalKind;
 }
 return null;
}
function bindGestures(canvas){
 canvas.style.touchAction='none';
 const pointers=new Map(),origins=new Map();
 let longPress=null;
 canvas.addEventListener('pointerdown',e=>{
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const type=detectObject(canvas,e);
  origins.set(e.pointerId,{x:e.clientX,y:e.clientY,type});
  lastPointer={x:e.clientX,y:e.clientY};
  objectDrag=null;clearTimeout(longPress);
  if(type&&pointers.size===1)longPress=setTimeout(()=>{if(pointers.size===1){objectDrag=type;canvas.style.cursor='grabbing'}},350);
 });
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)){
   if(e.pointerType==='mouse')canvas.style.cursor=detectObject(canvas,e)?'pointer':'grab';
   return;
  }
  const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y,start=origins.get(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8&&!objectDrag)clearTimeout(longPress);
  if(objectDrag&&pointers.size===1){
   const delta=dx*distance/Math.max(350,canvas.clientWidth)*1.5;
   if(objectDrag==='meuble'&&rootCabinet)rootCabinet.position.x=clamp(rootCabinet.position.x+delta,-.85,.85);
   if(objectDrag==='colonne'&&extraColumn)extraColumn.position.x=clamp(extraColumn.position.x+delta,Number(current.width)/200+.12,1.9);
   if(objectDrag==='miroir')for(const group of mirrorScenePieces)group.position.x=clamp(group.position.x+delta,-1.2,1.2);
   if(objectDrag==='vasque'&&rootCabinet)rootCabinet.position.x=clamp(rootCabinet.position.x+delta,-.24,.24);
   requestFrame();return;
  }
  if(pointers.size===2){
   clearTimeout(longPress);
   const p=[...pointers.values()],span=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
   if(lastPinch){stopCameraAnimation();cameraTouched=true;distance=clamp(distance*lastPinch/span,Math.max(.6,initialFitDistance*.60),Math.max(5,initialFitDistance*2.3))}
   lastPinch=span;
  }else{
   stopCameraAnimation();cameraTouched=true;yaw=clamp(yaw+dx*.008,-1.10,1.10);pitch=clamp(pitch+dy*.005,.04,.54);
  }
  moveCamera();
 });
 const finish=e=>{
  pointers.delete(e.pointerId);origins.delete(e.pointerId);
  clearTimeout(longPress);objectDrag=null;
  if(pointers.size<2)lastPinch=null;
 };
 canvas.addEventListener('pointerup',e=>{
  const start=origins.get(e.pointerId);
  if(start&&start.type&&!objectDrag&&pointers.size===1&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<8)showObjectMenu(start.type);
  finish(e);canvas.style.cursor='grab';
 });
 canvas.addEventListener('pointercancel',finish);
 canvas.addEventListener('wheel',e=>{
  e.preventDefault();stopCameraAnimation();cameraTouched=true;
  distance=clamp(distance+e.deltaY*.002,Math.max(.55,initialFitDistance*.57),Math.max(5,initialFitDistance*2.35));moveCamera();
 },{passive:false});
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
 renderer.toneMappingExposure=.80;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.setSize(Math.max(250,area.clientWidth),Math.max(250,area.clientHeight),false);
 const loading=$('composition-loading');if(loading)loading.remove();
 area.appendChild(renderer.domElement);
 ensureDimensionsCanvas();
 // Récupération sans crash de l'onglet si le navigateur perd le contexte GPU.
 renderer.domElement.addEventListener('webglcontextlost',event=>{
  event.preventDefault();
  if(!active||contextFailed)return;
  contextFailed=true;
  releaseRenderer();
  if(current)fallback(current,'Contexte graphique interrompu');
 });
 camera=new THREE.PerspectiveCamera(37,Math.max(320,area.clientWidth)/Math.max(320,area.clientHeight),.08,70);
 yaw=.43;pitch=.17;distance=2.5;
 cameraTouched=false;stopCameraAnimation();
 buildScene(config);
 orbitTarget=focusBounds?.getCenter(new THREE.Vector3())||new THREE.Vector3(0,.78,-.25);
 distance=computeFitDistance(yaw,pitch,orbitTarget);initialFitDistance=distance;
 setCameraButtons('angle');
 bindGestures(renderer.domElement);
 const resize=()=>{
  if(!active||!renderer||!camera||!area.isConnected)return;
  const w=Math.max(250,area.clientWidth),h=Math.max(250,area.clientHeight);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();adaptFraming();
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
 if(!renderer||!scene||!camera||!current)return;
 const wasDimensioned=dimensionsVisible;
 try{
  renderer.render(scene,camera);
  // L'export commercial conserve les trois cotes colorées, sans forcer leur affichage à l'écran.
  if(!wasDimensioned){dimensionsVisible=true;drawDimensions();}
  const raw=renderer.domElement;
  const width=1260,pad=46,contentWidth=width-pad*2;
  const visualH=Math.round(contentWidth*raw.height/Math.max(1,raw.width));
  const infoH=365,headH=144;
  const output=document.createElement('canvas');
  output.width=width;output.height=headH+visualH+infoH;
  const ctx=output.getContext('2d');
  ctx.fillStyle='#fcfbf8';ctx.fillRect(0,0,width,output.height);
  // Entête sobre : aucune modification du logo ni de l'en-tête du site.
  ctx.fillStyle='#334238';ctx.textAlign='left';ctx.font='bold 38px system-ui,Arial,sans-serif';
  ctx.fillText('RANDAL',pad,67);
  ctx.font='600 22px system-ui,Arial,sans-serif';ctx.fillStyle='#7e796d';
  ctx.fillText('COMPOSITION 3D · LE ROY FACTORY',pad,107);
  ctx.fillStyle='#e4e7df';ctx.fillRect(pad,headH-10,contentWidth,2);
  const imageY=headH+7;
  ctx.drawImage(raw,pad,imageY,contentWidth,visualH);
  if(dimensionsCanvas)ctx.drawImage(dimensionsCanvas,pad,imageY,contentWidth,visualH);
  const top=imageY+visualH+22;
  ctx.fillStyle='#334238';ctx.font='bold 30px system-ui,Arial,sans-serif';
  const heading=String(current.model||'RANDAL')+' · '+String(current.typeName||'');
  const fitted=(text,maxWidth,fontSize)=>{
   ctx.font='600 '+fontSize+'px system-ui,Arial,sans-serif';
   let value=String(text||'—');
   while(value.length>6&&ctx.measureText(value).width>maxWidth)value=value.slice(0,-2);
   return value===String(text||'—')?value:value+'…';
  };
  ctx.fillText(fitted(heading,contentWidth,30),pad,top+26);
  // Cotes explicites avec la même convention colorimétrique que le modèle 3D.
  const badges=[
   {text:'L '+current.width+' cm',color:'#b83b37'},
   {text:'H '+current.height+' cm',color:'#2769b5'},
   {text:'P '+current.depth+' cm',color:'#22804c'}
  ];
  let px=pad;
  ctx.font='bold 21px system-ui,Arial,sans-serif';
  for(const pill of badges){
   const pw=ctx.measureText(pill.text).width+32;
   ctx.fillStyle='#ffffff';ctx.strokeStyle=pill.color;ctx.lineWidth=2;
   ctx.beginPath();ctx.roundRect(px,top+44,pw,39,9);ctx.fill();ctx.stroke();
   ctx.fillStyle=pill.color;ctx.fillText(pill.text,px+16,top+71);px+=pw+13;
  }
  const columns=[
   [['Finition du meuble',current.color],['Vasque',current.basinMode==='none'?'Sans vasque':(current.basin||'À confirmer')+(current.basinLayout==='double'?' · double':'')],['Miroir',current.mirror||'Sans miroir']],
   [['Référence meuble',current.reference||'À confirmer'],['Prix public de la composition',current.totalPublic||'À confirmer'],['Ambiance',('ELIOS Creta '+(FLOOR_OPTIONS.find(x=>x.id===surfaceChoice.floor)?.label?.split(' ').pop()||'')+' / '+(WALL_COLORS[surfaceChoice.wall]?.label||'Mur personnalisé'))]]
  ];
  for(let col=0;col<2;col++)for(let row=0;row<3;row++){
   const x=pad+col*(contentWidth/2+12),y=top+125+row*60;
   ctx.fillStyle='#85847d';ctx.font='600 16px system-ui,Arial,sans-serif';
   ctx.fillText(columns[col][row][0],x,y);
   ctx.fillStyle='#263930';ctx.font='600 20px system-ui,Arial,sans-serif';
   ctx.fillText(fitted(columns[col][row][1],contentWidth/2-22,20),x,y+26);
  }
  ctx.fillStyle='#86867d';ctx.font='16px system-ui,Arial,sans-serif';
  ctx.fillText('Visuel indicatif · Finitions, références et prix à confirmer avec RANDAL.',pad,output.height-28);
  const link=document.createElement('a');
  link.download='RANDAL-'+String(current.model||'meuble').replace(/\s+/g,'-')+'-'+String(current.width||'')+'cm-composition.png';
  link.href=output.toDataURL('image/png');
  document.body.appendChild(link);link.click();link.remove();
 }catch(err){
  console.warn('RANDAL export composition:',err);
  alert('Impossible d’enregistrer cette image sur cet appareil.');
 }finally{
  dimensionsVisible=wasDimensioned;
  if(dimensionsCanvas)drawDimensions();
 }
}
function present(config){
 label('composition-model',config.model+' · '+config.typeName);
 label('composition-size',[config.width,config.height,config.depth].join(' × ')+' cm');
 label('composition-color',config.color);
 label('composition-reference',config.reference||'À confirmer');
 label('composition-total',config.totalPublic||'À confirmer');
 label('composition-basin',config.kind==='column'?'Sans vasque':(labels[config.basinMode]||'')+(config.basinMode==='none'?'':' · '+config.basin)+(config.basinMode==='vessel'?' · '+config.basinFinish:config.basinMode==='integrated'&&config.basinLayout==='double'?' · double vasque':''));
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
 surfaceChoice={floor:'elios-creta-ginepro',wall:'ivory'};
 fullscreen3D=false;el.classList.remove('composition-fullscreen');
 current=config;el.hidden=false;active=true;restoreOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 syncSurfaceLabels();
 present(config);
 dimensionsVisible=false;
 const dimsButton=$('composition-dimensions');if(dimsButton){dimsButton.textContent='◫ Cotes';dimsButton.setAttribute('aria-pressed','false');dimsButton.setAttribute('aria-label','Afficher les cotes et dimensions du meuble');}
 const fullButton=$('composition-fullscreen');if(fullButton){fullButton.textContent='⛶ Plein écran';fullButton.setAttribute('aria-pressed','false');}
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