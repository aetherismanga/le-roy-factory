(()=>{
'use strict';
const {models,RANDAL,SPECIAL_VARIANTS,MODEL_TYPES,AUX_REFS,AUX_PRICES,BRENT_COLS,TOP_REFS,TOP_FINISHES,CERAMIC_PRICES,DOUBLE_CERAMIC_PRICES,VESSEL_REFS,VESSEL_FINISHES,MIRROR_FORMATS,MIRROR_PRICES,METAL_MIRROR_REFS}=window.RandalCatalogueData;

const variant=()=>{
 const type=selectedType();if(!type)return null;
 const special=SPECIAL_VARIANTS[st.model];
 if(type[3]==='column'){
  if(st.model==='Brent'){
   const col=special.colors.indexOf(st.color);
   if(col<0||!type[5].includes(st.variantCode))return null;
   return {ref:BRENT_COLS[st.variantCode][col%4]+' - '+(col<4?'ORO':'PLATA'),price:st.variantCode==='I'?1076:941};
  }
  const idx=RANDAL[st.model]?.colors.indexOf(st.color)??-1;
  return idx<0?null:{ref:AUX_REFS[st.model]?.[idx],price:AUX_PRICES[st.model]};
 }
 if(special){
  const row=special.shapes.findIndex(x=>x.code===st.variantCode&&type[5].includes(x.code));
  const col=special.colors.indexOf(st.color);
  if(row<0||col<0)return null;
  const base=special.refRows[row]?.[col%4];
  return {ref:st.model==='Brent'?base+' - '+(col<4?'ORO':'PLATA'):special.refRows[row]?.[col],price:special.shapes[row].price};
 }
 const d=RANDAL[st.model];
 if(!d?.w.includes(Number(st.width))||!d.colors.includes(st.color)||Number(st.height)!==type[4])return null;
 const i=d.w.indexOf(Number(st.width))+(st.model==='Harmony'&&st.typeId==='three'?6:0);
 return {ref:d.refs[i]?.[d.colors.indexOf(st.color)],price:d.prices[i]};
};


const typeOptions=()=>MODEL_TYPES[st.model]||[];
const selectedType=()=>typeOptions().find(t=>t[0]===st.typeId);



const steps=['Collection','Modèle','Dimensions','Couleur','Vasque & plan','Miroir','Récapitulatif'];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='lrfRandalV04Draft';
let st;try{st=JSON.parse(sessionStorage.getItem(key)||'{}')}catch{st={}}
st={model:'',typeId:'',width:'',height:'',depth:'',color:'',variantCode:'',drawers:'',basin:'Sella',top:'Sans plan',basinMode:'integrated',basinLayout:'single',basinFinish:'Blanc brillant',topFinish:'Blanco mate',mirror:'Sans miroir',mirrorSize:'',mirrorFinish:'',quantity:1,columnAccessory:false,mirrorQuantity:1,company:'',name:'',email:'',phone:'',notes:'',step:0,...st};
st.maxStep=Math.max(Number(st.step)||0,Number(st.maxStep)||0);
// Migration anciennes configurations Harmony 119 -> largeur commerciale 120 cm.
if(st.model==='Harmony'&&String(st.width)==='119')st.width='120';
st.step=Math.max(0,Math.min(6,Number(st.step)||0));
const save=()=>sessionStorage.setItem(key,JSON.stringify(st));
const physicalWidth=()=>st.model==='Harmony'&&Number(st.width)===120?119:Number(st.width);

const MODEL_PAGE=Object.fromEntries(models);
const COLOR_HEX={'Blanco mate':'#f7f6f1','Serenade Alba':'#d7d0bf','Gris tórtora':'#9b938a','Nogal Valentina':'#675143','Roble Amazona':'#be9e75','Biscuit':'#d7cab7','Azul Acero':'#637c87','Negro':'#242425','Gris':'#959799','Verde Utopía':'#527f6e','Azul Ceylan':'#3e6376','Nogal Lincoln':'#78543a','Fresno Lagom':'#c5ac89','Roble Natura':'#bd9a72','Nogal Mist':'#7f6550'};


const METAL_MIRROR_FINISHES=['Noir','Doré','Bronze','Argent'];

const isMetalMirror=name=>Object.prototype.hasOwnProperty.call(METAL_MIRROR_REFS,name);
const mirrorRef=()=>isMetalMirror(st.mirror)?(METAL_MIRROR_REFS[st.mirror]?.[st.mirrorSize]?.[st.mirrorFinish]||'À confirmer'):(MIRROR_FORMATS[st.mirror]?.find(([x])=>x===st.mirrorSize)?.[1]||'À confirmer');



const topReference=()=>{const i=[60,70,80,90,100,120].indexOf(Number(st.width));return i>=0?TOP_REFS[st.topFinish]?.[i]||'À confirmer':'À confirmer'};
const allowedModes=()=>st.model==='Boreal'&&Number(st.width)===79?['integrated','none']:selectedType()?.[3]==='column'||st.model==='Less'?['none']:st.model==='Sima'?['vessel']:[60,70,79,80,90,100,120].includes(Number(st.width))?['integrated','vessel','none']:['integrated','none'];
function syncBasin(){
 if(st.model==='Boreal'&&Number(st.width)===79&&st.basinMode==='vessel')st.basinMode='integrated';
 if(!allowedModes().includes(st.basinMode))st.basinMode=allowedModes()[0];
 if(Number(st.width)===140&&st.basinMode==='integrated')st.basinLayout='double';else if(!(st.model==='Harmony'&&Number(st.width)===120&&st.basinMode==='integrated'))st.basinLayout='single';
 if(!['single','double'].includes(st.basinLayout))st.basinLayout='single';
 if(st.basinMode==='none'){st.basin='Sans vasque';st.top='Sans plan'}
 if(st.basinMode==='integrated'){if(!['Sella','Tampa'].includes(st.basin))st.basin=st.model==='Luce'||st.model==='Brent'?'Tampa':'Sella';if(st.model==='Luce'||st.model==='Brent')st.basin='Tampa';st.top='Sans plan'}
 if(st.basinMode==='vessel'){if(!['Neris','Torne'].includes(st.basin))st.basin='Neris';st.top=st.model==='Sima'?'Plateau SIMA':'Plan pour vasque à poser';if(!TOP_FINISHES.includes(st.topFinish))st.topFinish='Blanco mate'}
}
const imagePages={mirror:35,integrated:37,vessel:41,none:0};
let pdfPromise=null;const imageCache=new Map();
async function loadPdf(){
 if(!window.pdfjsLib)return null;
 if(!pdfPromise){window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';pdfPromise=window.pdfjsLib.getDocument({url:'assets/pdf/RANDAL-V04.pdf?v=20261014-prix-publics',disableAutoFetch:false}).promise.catch(e=>{console.warn('Photos catalogue RANDAL',e);return null})}
 return pdfPromise;
}
async function renderPreview(page){
 if(imageCache.has(page))return imageCache.get(page);
 const doc=await loadPdf();if(!doc)return null;
 const p=await doc.getPage(page),v=p.getViewport({scale:.55});
 const off=document.createElement('canvas');off.width=Math.ceil(v.width);off.height=Math.ceil(v.height);
 await p.render({canvasContext:off.getContext('2d'),viewport:v}).promise;
 imageCache.set(page,off);return off;
}
let thumbCall=0;
async function paintThumbnails(){
 const seq=++thumbCall,targets=[...document.querySelectorAll('canvas[data-photo-page]')];if(!targets.length)return;
 const pages=[...new Set(targets.map(x=>Number(x.dataset.photoPage)).filter(Boolean))];
 for(const p of pages){
  let source;try{source=await renderPreview(p)}catch(e){console.warn('Visuel RANDAL',p,e)}
  if(seq!==thumbCall)return;
  if(!source)continue;
  targets.filter(x=>Number(x.dataset.photoPage)===p).forEach(canvas=>{
   if(!canvas.isConnected)return;
   const c=canvas.getContext('2d');const W=canvas.width,H=canvas.height;
   // Haut de la page : photos officielles, en excluant le bandeau et les tableaux.
   const positions={
 'Basic':[.04,.15,.33,.39],'Zen LED':[.36,.15,.66,.39],'Ilse LED':[.69,.15,.97,.39],
 'Cápsula LED':[.04,.45,.34,.70],'Miroir métallique rectangulaire':[.35,.45,.67,.70],
 'Miroir métallique rond':[.68,.45,.97,.70],
 'Neris':[.04,.10,.48,.74],'Torne':[.50,.10,.95,.74],
 'Sella':[.04,.18,.49,.75],'Tampa':[.51,.18,.96,.75]
};
 const region=positions[canvas.dataset.photoKey];
 const srcX=source.width*(region?region[0]:.06),srcY=source.height*(region?region[1]:.10),srcW=source.width*(region?(region[2]-region[0]):.88),srcH=source.height*(region?(region[3]-region[1]):.64);
   const ratio=Math.max(W/srcW,H/srcH);
   const cropW=W/ratio,cropH=H/ratio;
   c.drawImage(source,srcX+(srcW-cropW)/2,srcY+(srcH-cropH)*.32,cropW,cropH,0,0,W,H);
  });
 }
}
window.addEventListener('load',()=>paintThumbnails(),{once:true});
const COLLECTION_IMAGES={
 'Harmony':'harmony','Luce':'luce','Brent':'brent','Aruba rainuré':'aruba-rainure',
 'Aruba':'aruba','Aras':'aras','Boreal':'boreal','Brunei':'brunei','Amat':'amat','Less':'less','Sima':'sima'
};
const collectionImage=name=>'<span class="visual collection-visual"><img src="assets/img/randal/v04/'+(COLLECTION_IMAGES[name]||'harmony')+'.webp" alt="Photo officielle RANDAL '+esc(name)+'" loading="lazy" decoding="async"></span>';
const photo=(page,tag='',key='')=>'<span class="visual"><canvas width="300" height="190" data-photo-page="'+page+'" data-photo-key="'+esc(key)+'" role="img" aria-label="Photo officielle RANDAL, page '+page+'"></canvas>'+(tag?'<i>'+tag+'</i>':'')+'</span>';

const resetConfiguration=()=>{Object.assign(st,{typeId:'',width:'',height:'',depth:'',color:'',variantCode:'',basinLayout:'single',basin:'Sella',top:'Sans plan',basinMode:'integrated',topFinish:'Blanco mate',mirror:'Sans miroir',mirrorSize:'',mirrorFinish:'',quantity:1});};
function normalize(){
 const type=selectedType();
 if(!type){st.width='';st.height='';st.depth='';st.variantCode='';return;}
 const special=SPECIAL_VARIANTS[st.model];
 if(type[3]==='column'){
  if(st.model==='Brent'){
   if(!type[5].includes(st.variantCode))st.variantCode='';
   st.width=st.variantCode==='I'?'60':st.variantCode==='J'?'40':'';
   st.depth='35';
  }else{
   st.width=st.model==='Luce'?'25':'30';st.depth=st.model==='Luce'?'30':'27';st.variantCode=type[5];
  }
  st.height=String(type[4]);
 }else if(special){
  const shape=special.shapes.find(x=>x.code===st.variantCode&&type[5].includes(x.code));
  if(shape){st.width=String(shape.width);st.height=String(shape.height);st.depth=String(shape.depth);}
  else{st.width='';st.height='';st.depth='';st.variantCode='';}
 }else{
  const d=RANDAL[st.model];
  if(!d?.w.includes(Number(st.width)))st.width='';
  st.height=String(type[4]);st.depth=String(d?.d||'');st.variantCode=st.width?type[5][d.w.indexOf(Number(st.width))]||'':'';
 }
 const colors=special?.colors||RANDAL[st.model]?.colors||[];
 if(!colors.includes(st.color))st.color='';
}
if(!selectedType()){
 st.typeId='';
 if(st.step>1)st.step=1;
}
normalize();syncBasin();
const selectedFromCatalogue=new URLSearchParams(location.search).get('collection');
if(selectedFromCatalogue&&models.some(([name])=>name===selectedFromCatalogue)){if(st.model!==selectedFromCatalogue){resetConfiguration();st.model=selectedFromCatalogue;st.maxStep=0;}st.step=0;normalize();save();}
const entry=(label,name,type='text',placeholder='')=>'<label class="field">'+label+'<input name="'+name+'" type="'+type+'" '+(type==='number'?'min="1" max="9" step="1"':'')+' placeholder="'+placeholder+'" value="'+esc(st[name])+'"></label>';
const select=(label,name,opts)=>'<label class="field">'+label+'<select name="'+name+'">'+opts.map(v=>'<option value="'+esc(v)+'" '+(st[name]===v?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>';
// Dessins PDF RANDAL conservés en tracés SVG : précision indépendante du zoom.
const typeVectorUrl=slug=>'assets/img/randal/types/'+slug+'.svg?v=20261014-vectoriels1';
window.randalVectorFallback=img=>{img.onerror=null;img.src=img.src.split('?')[0].replace(/\.svg$/,'.webp')};
const typeCards=()=>'<div class="choices type-choices">'+typeOptions().map(t=>
 '<button type="button" class="choice type-choice '+(st.typeId===t[0]?'active':'')+'" data-field="typeId" data-value="'+esc(t[0])+'">'+
 '<span class="type-photo"><img src="'+esc(typeVectorUrl(t[2]))+'" alt="Dessin technique vectoriel RANDAL '+esc(t[1])+'" loading="lazy" decoding="async" onerror="randalVectorFallback(this)"></span>'+
 '<span class="choice-copy"><strong>'+esc(t[1])+'</strong><small>'+esc(t[3]==='column'?'Colonne auxiliaire':t[3]==='counter'?'Plateau seul':'Meuble salle de bain')+'</small><small>Références '+esc(t[5])+' · Catalogue p. '+t[6]+'</small></span></button>'
 ).join('')+'</div>';
const dimensionCards=(entries)=>'<div class="choices">'+entries.map(([code,width,height,depth])=>
 '<button type="button" class="choice '+(st.variantCode===code?'active':'')+'" data-field="variantCode" data-value="'+esc(code)+'"><span class="choice-copy"><strong>'+esc(width)+' cm</strong><small>H. '+esc(height)+' · P. '+esc(depth)+' cm · Réf. '+esc(code)+'</small></span></button>'
 ).join('')+'</div>';
const activeTypeVisual=()=>{const t=selectedType();return t?
 '<span class="visual type-visual"><img src="'+esc(typeVectorUrl(t[2]))+'" alt="'+esc(t[1])+'" loading="lazy" onerror="randalVectorFallback(this)"></span>':collectionImage(st.model);};
const ACCESSORY_ART={
 'Sella':'basin-sella','Tampa':'basin-tampa','Sella double':'basin-sella-double','Tampa double':'basin-tampa-double','Neris':'basin-neris','Torne':'basin-torne',
 'Basic':'mirror-basic','Zen LED':'mirror-zen-led','Ilse LED':'mirror-ilse-led',
 'Cápsula LED':'mirror-capsula-led',
 'Miroir métallique rectangulaire':'mirror-metal-rectangular',
 'Miroir métallique rond':'mirror-metal-round'
};
const accessoryImage=name=>{
 const slug=ACCESSORY_ART[name];
 return slug?'<span class="visual accessory-visual"><img src="assets/img/randal/accessories/'+(st.model==='Harmony'&&['Sella','Tampa','Neris','Torne'].includes(name)?'hd/':'')+slug+'.webp" loading="lazy" decoding="async" alt="Dessin RANDAL '+esc(name)+'"></span>':'';
};
const blankAccessory=label=>'<span class="visual accessory-empty">'+esc(label)+'</span>';
const METAL_FINISH_SLUG={Noir:'anthracite','Doré':'dore',Bronze:'bronze',Argent:'argent'};
const metalFinishImage=value=>'<span class="metallic-finish-preview"><img src="assets/img/randal/mirror-finishes/'+(METAL_FINISH_SLUG[value]||'anthracite')+'.webp" alt="Finition métallique '+esc(value)+'" loading="lazy" decoding="async"></span>';
const finishSlug=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const finishUrl=(model,finish)=>'assets/img/randal/finishes/'+finishSlug(model)+'/'+finishSlug(finish)+'.webp';
const finishImage=(model,finish)=>'<span class="finish-preview"><img src="'+esc(finishUrl(model,finish))+'" loading="lazy" decoding="async" alt="Échantillon officiel de finition '+esc(finish)+'" onerror="this.onerror=null;this.hidden=true;this.parentNode.classList.add(\'finish-not-found\')"></span>';
const pick=(name,values,group='')=>'<div class="choices '+group+'">'+values.map(([value,sub])=>{
 const visual=name==='model'?collectionImage(value)
  :name==='mirror'?(accessoryImage(value)||blankAccessory(value==='Sans miroir'?'Sans miroir':'À préciser'))
  :name==='basin'?(accessoryImage(value)||blankAccessory('Vasque'))
  :name==='basinLayout'?(accessoryImage(value==='double'?st.basin+' double':st.basin)||blankAccessory('Vasque'))
  :name==='basinMode'?(value==='integrated'?accessoryImage('Sella'):value==='vessel'?accessoryImage('Neris'):blankAccessory('Sans vasque'))
  :name==='mirrorFinish'?metalFinishImage(value)
  :name==='color'?finishImage(st.model,value)
  :'';
 return '<button type="button" class="choice '+(st[name]===value?'active':'')+'" data-field="'+name+'" data-value="'+esc(value)+'">'+visual+'<span class="choice-copy"><strong>'+esc(name==='width'&&st.model==='Harmony'&&value==='120'?'119 cm':name==='basinMode'?({integrated:'Vasque sur meuble',vessel:'Plan + vasque à poser',none:'Sans vasque'}[value]):value)+'</strong><small>'+esc(sub||'')+'</small></span></button>'
 }).join('')+'</div>';

/* Prix source du catalogue RANDAL, convertis une seule fois pour affichage public, pages 4–5, 8, 12,
   16, 18, 21, 24, 27, 29–30, 34, 36, 38, 40 et 41. Aucun tarif d'achat usine. */

// PDF officiel p.38 : références de vasques à deux cuves de largeur 120 cm.




const euroPrice=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n):'À confirmer';
const safeQty=()=>Math.max(1,Number.isFinite(Number(st.quantity))?Math.floor(Number(st.quantity)):1);
const publicPrice=base=>base==null||!Number.isFinite(Number(base))?null:Math.round((Number(base)*1.20+Number.EPSILON)*100)/100;
const rowPrice=(title,details,ref,unit)=>({title,details,ref:String(ref||'À confirmer'),unit:publicPrice(unit),quantity:safeQty()});
function ceramicChoice(){
 if(st.basinMode!=='integrated'||!['Sella','Tampa'].includes(st.basin))return null;
 const width=Number(st.width)===79?80:Number(st.width);
 if(st.model==='Harmony'&&width===120&&st.basinLayout==='double'){
  const row=DOUBLE_CERAMIC_PRICES[st.basin];return row?{price:row[0],ref:row[1]}:null;
 }
 if(st.basin==='Tampa'&&width===120&&st.model==='Luce')return {ref:'6232',price:279};
 const row=CERAMIC_PRICES[st.basin]?.[width];
 return row?{price:row[0],ref:row[1]}:null;
}
function orderRows(){
 const rows=[],variantInfo=variant(),type=selectedType();
 rows.push(rowPrice(st.model+' — '+(type?.[1]||'Meuble'),[
  (st.model==='Harmony'&&Number(st.width)===120?119:st.width)+' × '+st.height+' × '+st.depth+' cm',
  'Finition '+st.color,
  'Variante '+(st.variantCode||'à confirmer')
 ].join(' · '),variantInfo?.ref,variantInfo?.price));
 if(type?.[3]!=='column'&&st.basinMode==='integrated'){
  const ceramic=ceramicChoice();
  rows.push(rowPrice('Vasque '+st.basin+(st.basinLayout==='double'?' double · 2 cuves':' · 1 cuve'),'Céramique blanc brillant · largeur '+(Number(st.width)===79?80:st.width)+' cm',ceramic?.ref,ceramic?.price));
 }
 if(type?.[3]!=='column'&&st.basinMode==='vessel'){
  const idx=VESSEL_FINISHES.indexOf(st.basinFinish||'Blanc brillant');
  const ref=VESSEL_REFS[st.basin]?.[idx];
  if(st.model!=='Sima'){
   const w=[60,70,80,90,100,120].indexOf(Number(st.width));
   rows.push(rowPrice('Plan pour vasque à poser',String(st.width)+' × 46 cm · '+st.topFinish,topReference(),w>=0?[66,74,83,92,100,118][w]:null));
  }
  rows.push(rowPrice('Vasque à poser '+st.basin,st.basinFinish||'Blanc brillant',ref,ref?226:null));
 }
 if(st.mirror&&MIRROR_FORMATS[st.mirror]){
  const ref=mirrorRef();
  const price=MIRROR_PRICES[st.mirror]?.[ref];
  const mirrorRow=rowPrice('Miroir '+st.mirror,(isMetalMirror(st.mirror)?'Cadre '+(st.mirrorFinish||'à préciser')+' · ':'')+(st.mirrorSize||'Dimensions à confirmer'),ref,price??null);mirrorRow.quantity*=Math.max(1,Number(st.mirrorQuantity)||1);rows.push(mirrorRow);
 }
 if(st.columnAccessory&&AUX_REFS[st.model]){
  const colorIndex=(RANDAL[st.model]?.colors||[]).indexOf(st.color);
  rows.push(rowPrice('Colonne assortie '+st.model,'Finition '+st.color+' · portes à 45°',AUX_REFS[st.model][colorIndex]||'À confirmer',AUX_PRICES[st.model]??null));
 }
 return rows;
}
function totals(){
 const rows=orderRows(),known=rows.every(r=>r.unit!==null&&r.ref!=='À confirmer');
 return {rows,complete:known,unit:rows.reduce((sum,r)=>sum+(r.unit||0),0),sum:rows.reduce((sum,r)=>sum+(r.unit||0)*r.quantity,0),qty:safeQty()};
}
function emailBody(){
 const t=totals();
 const out=[
  'Bonjour Zahra,',
  '',
  'Merci de vérifier la disponibilité des références suivantes et de confirmer la faisabilité de notre demande RANDAL.',
  '',
  'COMPOSITION RANDAL',
  '----------------------------------------',
  'Collection : '+st.model,
  'Modèle : '+(selectedType()?.[1]||'À confirmer'),
  'Dimensions : '+(st.model==='Harmony'&&Number(st.width)===120?119:st.width)+' × '+st.height+' × '+st.depth+' cm',
  'Finition : '+st.color,
  'Variante catalogue : '+(st.variantCode||'À confirmer'),
  ...(st.basinMode==='integrated'?['Vasque : '+(st.basinLayout==='double'?'double vasque, 2 cuves':'vasque simple, 1 cuve')]:[]),
  'Quantité de compositions : '+t.qty,
  '',
  'DÉTAIL DES ARTICLES ET RÉFÉRENCES',
  '----------------------------------------'
 ];
 t.rows.forEach((r,i)=>{
  out.push((i+1)+'. '+r.title);
  out.push('   Référence : '+r.ref);
  out.push('   Description : '+r.details);
  out.push('   Quantité : '+r.quantity);
  out.push('');
 });
 out.push('Merci de nous confirmer :');
 out.push('- la disponibilité et la compatibilité de chaque article ;');
 out.push('- la validation des références et des finitions ;');
 out.push('- les délais de livraison et les conditions de transport ;');
 out.push('- la prise en compte de cette demande.');
 out.push('','Cette demande ne constitue pas une commande ferme, sous réserve de votre confirmation.');
 out.push('','Merci d’avance,','Agence Le Roy Factory');
 return out.join('\n');
}
const orderDetails=()=>[
 'RANDAL · '+st.model+' / '+(selectedType()?.[1]||'Modèle'),
 'Dimensions : '+(st.model==='Harmony'&&Number(st.width)===120?119:st.width)+' × '+st.height+' × '+st.depth+' cm',
 'Finition : '+st.color+' · Variante '+(st.variantCode||'à confirmer'),
 'Quantité : '+safeQty()+' ensemble(s)'
];
const printableRows=()=>orderRows().map(r=>'<div class="recap-line"><div class="recap-product"><strong>'+esc(r.title)+'</strong><small>'+esc(r.details)+'</small><small class="recap-ref">Réf. '+esc(r.ref)+'</small></div><span class="recap-number">'+r.quantity+'</span><span class="recap-money">'+esc(euroPrice(r.unit))+'</span><strong class="recap-money">'+esc(r.unit===null?'À confirmer':euroPrice(r.unit*r.quantity))+'</strong></div>').join('');
const professionalRecap=()=>{
 const t=totals();
 return '<div id="randal-order-sheet" class="recap-sheet">'+
 '<div class="recap-heading"><div><span class="recap-kicker">LE ROY FACTORY · RANDAL</span><h3>Récapitulatif de configuration</h3><p>Demande de disponibilité et de confirmation usine</p></div><span class="recap-tag">Catalogue RANDAL V04</span></div>'+
 '<div class="recap-metadata">'+orderDetails().map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>'+
 '<div class="recap-grid-head"><span>Produit / Référence</span><span>Qté</span><span>Prix unit.</span><span>Total</span></div>'+
 '<div class="recap-lines">'+printableRows()+'</div>'+
 '<div class="recap-total"><span>'+ (t.complete?'TOTAL GÉNÉRAL':'TOTAL PARTIEL')+'</span><strong>'+esc(euroPrice(t.sum))+'</strong></div>'+
 (t.complete?'':'<p class="recap-warning">Certains prix ou références sont à confirmer par RANDAL : le total est partiel.</p>')+
 '<p class="recap-legal">Prix publics conseillés issus du catalogue RANDAL V04, hors transport et installation. Montants indicatifs, sous réserve de confirmation par l’usine. Ceci n’est pas un bon de commande ferme.</p>'+
 '</div>';
};


/* Export PDF autonome : jsPDF chargé à la demande, sans serveur ni données personnelles. */
async function getPdfGenerator(){
 if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
 const src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
 await new Promise((resolve,reject)=>{
  const tag=document.createElement('script');tag.src=src;tag.async=true;
  tag.onload=resolve;tag.onerror=()=>reject(new Error('Téléchargement du moteur PDF indisponible'));
  document.head.appendChild(tag);
 });
 if(!window.jspdf?.jsPDF)throw new Error('Générateur PDF indisponible');
 return window.jspdf.jsPDF;
}
async function jpegFromImage(path){
 if(!path)return null;
 const res=await fetch(path);
 if(!res.ok)throw new Error('Image non trouvée');
 const blob=await res.blob();
 const url=URL.createObjectURL(blob);
 try{
  const img=await new Promise((resolve,reject)=>{
   const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url;
  });
  const canvas=document.createElement('canvas');
  canvas.width=1320;canvas.height=780;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,1320,780);
  const sc=Math.min(1260/img.width,720/img.height);
  ctx.drawImage(img,(1320-img.width*sc)/2,(780-img.height*sc)/2,img.width*sc,img.height*sc);
  return canvas.toDataURL('image/jpeg',.90);
 }finally{URL.revokeObjectURL(url)}
}
function exportPictures(){
 const t=selectedType();return [
  {name:st.model,src:t?typeVectorUrl(t[2]):null},
  {name:st.basinMode==='none'?'Sans vasque':st.basin,src:st.basinMode!=='none'&&st.basin!=='Sans vasque'?'assets/img/randal/accessories/'+ACCESSORY_ART[st.basin]+'.webp':null},
  {name:st.mirror,src:st.mirror!=='Sans miroir'&&ACCESSORY_ART[st.mirror]?'assets/img/randal/accessories/'+ACCESSORY_ART[st.mirror]+'.webp':null}
 ];
}
async function downloadOrderPdf(){
 const btn=$('save-pdf');if(btn){btn.disabled=true;btn.textContent='Création du PDF…'}
 try{
  const JS=await getPdfGenerator();
  const pdf=new JS({unit:'mm',format:'a4',orientation:'portrait'});
  const clean=s=>String(s??'').replace(/[–—]/g,'-').replace(/[×]/g,'x').replace(/[·]/g,'-');
  const write=(str,x,y,style='normal',size=10,color=[40,46,40])=>{
   pdf.setFont('helvetica',style);pdf.setFontSize(size);pdf.setTextColor(...color);
   pdf.text(clean(str),x,y);
  };
  const money=n=>clean(euroPrice(n));
  pdf.setFillColor(64,78,67);pdf.rect(0,0,210,29,'F');
  write('RANDAL  /  LE ROY FACTORY',15,12,'bold',15,[255,255,255]);
  write('DEMANDE DE DISPONIBILITÉ - PROJET À CONFIRMER',15,20,'normal',9,[240,240,232]);
  write('Composition : '+st.model+' / '+(selectedType()?.[1]||'Meuble'),16,39,'bold',12);
  write('Dimensions : '+st.width+' x '+st.height+' x '+st.depth+' cm',16,46,'normal',9);
  write('Finition : '+st.color+'   |   Variante : '+(st.variantCode||'à confirmer'),16,52,'normal',9);
  write('Quantité : '+safeQty()+' ensemble(s)',16,58,'normal',9);
  const pictures=exportPictures();
  for(let i=0;i<pictures.length;i++){
   const p=pictures[i],x=16+i*60;
   pdf.setFillColor(249,247,244);pdf.rect(x,64,55,35,'F');
   if(p.src)try{const data=await jpegFromImage(p.src);if(data)pdf.addImage(data,'JPEG',x+2,65,51,29)}catch(e){console.warn('Aperçu image PDF',e)}
   write(p.name.slice(0,27),x+2,103,'normal',8);
  }
  let y=116;
  const rows=orderRows();
  pdf.setFillColor(234,238,234);pdf.rect(15,y,180,11,'F');
  write('PRODUIT / RÉFÉRENCE',18,y+7,'bold',8);
  write('QTE',122,y+7,'bold',8);
  write('PRIX UNIT.',142,y+7,'bold',8);
  write('TOTAL',171,y+7,'bold',8);
  y+=12;
  for(const r of rows){
   if(y+27>267){pdf.addPage();y=20}
   pdf.setDrawColor(223,225,221);pdf.line(15,y+24,195,y+24);
   write(r.title.slice(0,51),18,y+5,'bold',9);
   const desc=pdf.splitTextToSize(clean(r.details),98).slice(0,2);
   pdf.setFont('helvetica','normal');pdf.setFontSize(7.6);pdf.setTextColor(108,109,102);pdf.text(desc,18,y+10);
   write('Réf. '+r.ref,18,y+21,'bold',8,[65,84,71]);
   write(r.quantity,126,y+6,'normal',9);
   write(money(r.unit),143,y+6,'normal',8);
   write(r.unit===null?'À confirmer':money(r.unit*r.quantity),171,y+6,'bold',8);
   y+=27;
  }
  if(y+44>272){pdf.addPage();y=20}
  const t=totals();
  pdf.setFillColor(239,243,237);pdf.rect(15,y+1,180,18,'F');
  write(t.complete?'TOTAL GÉNÉRAL':'TOTAL PARTIEL',19,y+12,'bold',10,[49,81,65]);
  write(money(t.sum),156,y+12,'bold',12,[49,81,65]);
  y+=28;
  const legal='Prix publics conseillés du catalogue RANDAL V04. Hors transport et installation. Merci de confirmer les références, la disponibilité, les prix d’achat professionnels et les délais. Document non contractuel ; aucune commande ferme avant validation de l’usine.';
  const lines=pdf.splitTextToSize(clean(legal),179);
  pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(100,102,97);
  pdf.text(lines,16,y);
  pdf.setFontSize(7);pdf.text('Document préparé sur leroifactory.fr - '+new Date().toLocaleDateString('fr-FR'),16,286);
  pdf.save('RANDAL-Demande-'+st.model.replace(/\s/g,'-')+'-'+(variant()?.ref||'modele')+'.pdf');
 }catch(e){
  console.error('Export PDF RANDAL',e);
  alert('L’enregistrement direct est indisponible. La fenêtre d’impression permet de choisir « Enregistrer en PDF ».');
  window.print();
 }finally{if(btn){btn.disabled=false;btn.textContent='Enregistrer en PDF'}}
}

const summary=()=>['Référence meuble : '+(variant()?.ref||'À vérifier'),'Prix public conseillé meuble : '+euroPrice(publicPrice(variant()?.price)),'DEMANDE DE DISPONIBILITÉ / COMMANDE À CONFIRMER','RANDAL — Catalogue V04','','MODÈLE : '+st.model,'Largeur : '+(st.width?physicalWidth():'À confirmer')+' cm','Hauteur : '+(st.height||'À confirmer')+' cm','Profondeur : '+(st.depth||'À confirmer')+' cm','Couleur / finition : '+(st.color||'À confirmer'),'Sous-modèle : '+(selectedType()?.[1]||'À vérifier'),'Variante catalogue : '+(st.variantCode||(st.typeId==='two'?'A à F':'Selon largeur')),'Type de montage : '+({integrated:'Vasque sur meuble',vessel:'Plan et vasque à poser',none:'Meuble sans vasque'}[st.basinMode]),'Vasque : '+st.basin,'Plan : '+st.top+(st.basinMode==='vessel'&&st.model!=='Sima'?' · '+st.topFinish+' · Réf. '+topReference():''),'Miroir : '+st.mirror+(st.mirror==='Sans miroir'?'':' · '+(st.mirrorSize||'Taille à confirmer')+(isMetalMirror(st.mirror)?' · cadre '+(st.mirrorFinish||'à préciser'):'')+' · réf. '+mirrorRef()),'Quantité : '+st.quantity,'','Merci de confirmer les références exactes, les associations possibles, les conditions commerciales, les stocks et le délai.','Aucune commande ferme avant confirmation de votre part.'].join('\n');

/* Un seul état commercial : chaque modification 3D passe par les règles,
   références et tarifs existants du configurateur RANDAL. */
function compositionConfig(){
 const type=selectedType(),t=totals();
 return {
  model:st.model,typeId:st.typeId,typeName:type?.[1]||'Meuble',kind:type?.[3]||'vanity',
  typePhoto:type?.[2]||'',width:st.model==='Harmony'&&Number(st.width)===120?119:st.width,height:st.height,depth:st.depth,commercialWidth:Number(st.width),
  color:st.color,swatch:finishUrl(st.model,st.color),
  finishes:SPECIAL_VARIANTS[st.model]?.colors||RANDAL[st.model]?.colors||[],
  finishUrls:Object.fromEntries((RANDAL[st.model]?.colors||[]).map(color=>[color,finishUrl(st.model,color)])),
  basinMode:st.basinMode,basinLayout:st.basinLayout,basin:st.basin,basinFinish:st.basinFinish||'Blanc brillant',
  availableModes:allowedModes(),basinColors:VESSEL_FINISHES,topFinishes:TOP_FINISHES,
  topFinish:st.topFinish,mirror:MIRROR_FORMATS[st.mirror]?st.mirror:'Sans miroir',mirrorSize:st.mirrorSize,
  mirrorFinish:st.mirrorFinish,mirrorPhoto:ACCESSORY_ART[st.mirror]||'',
  reference:String(variant()?.ref||'À confirmer'),
  totalPublic:t.complete?euroPrice(t.sum):euroPrice(t.sum)+' + éléments à confirmer',
  mirrorFormats:MIRROR_FORMATS,mirrorQuantity:Number(st.mirrorQuantity)||1,quantity:Number(st.quantity)||1,
  columnAccessory:!!st.columnAccessory,columnAvailable:!!AUX_REFS[st.model],
  accessoryReference:AUX_REFS[st.model]?.[(RANDAL[st.model]?.colors||[]).indexOf(st.color)]||'',
  widths:RANDAL[st.model]?.w||[],onChange:changeFromComposition
 };
}
function changeFromComposition(patch){
 if(!patch||typeof patch!=='object')return null;
 const [name,value]=Object.entries(patch)[0]||[];
 if(!name)return null;
 if(name==='color'){if(!(RANDAL[st.model]?.colors||[]).includes(value))return null}
 else if(name==='width'){
  if(SPECIAL_VARIANTS[st.model])return null;
  const type=selectedType(),widths=RANDAL[st.model]?.w||[],i=widths.indexOf(Number(value));
  if(i<0||!type||!type[5][i])return null;
  st.width=String(value);st.height=String(type[4]);st.depth=String(RANDAL[st.model].d);st.variantCode=type[5][i];
  syncBasin();normalize();save();render();return compositionConfig();
 }else if(name==='mirror'){
  if(value!=='Sans miroir'&&!MIRROR_FORMATS[value])return null;
  st.mirror=value;st.mirrorSize=MIRROR_FORMATS[value]?.[0]?.[0]||'';st.mirrorFinish=isMetalMirror(value)?'Noir':'';
  save();render();return compositionConfig();
 }else if(name==='mirrorSize'){if(!MIRROR_FORMATS[st.mirror]?.some(x=>x[0]===value))return null}
 else if(name==='mirrorFinish'){if(!METAL_MIRROR_FINISHES.includes(value))return null}
 else if(name==='columnAccessory'){if(!AUX_REFS[st.model])return null;st.columnAccessory=!!value;save();render();return compositionConfig()}
 else if(name==='quantity'){if(!Number.isInteger(Number(value))||Number(value)<1||Number(value)>9)return null}
 else if(name==='mirrorQuantity'){if(!Number.isInteger(Number(value))||Number(value)<1||Number(value)>3)return null}
 else if(name==='basinMode'){if(!allowedModes().includes(value))return null}
 else if(name==='basin'){if(!(st.basinMode==='integrated'?['Sella','Tampa']:st.basinMode==='vessel'?['Neris','Torne']:[]).includes(value))return null}
 else if(name==='basinLayout'){if(!(st.model==='Harmony'&&Number(st.width)===120&&st.basinMode==='integrated'&&['single','double'].includes(value)))return null}
 else if(name==='basinFinish'){if(st.basinMode!=='vessel'||!VESSEL_FINISHES.includes(value))return null}
 else if(name==='topFinish'){if(st.basinMode!=='vessel'||!TOP_FINISHES.includes(value))return null}
 else return null;
 st[name]=value;syncBasin();normalize();save();render();return compositionConfig();
}

/* On conserve le dernier écran visité, pour permettre un retour par les numéros. */
function stepReady(index){
 if(index===0)return Boolean(MODEL_TYPES[st.model]);
 if(index===1)return Boolean(selectedType());
 if(index===2){
  const t=selectedType(),d=RANDAL[st.model],special=SPECIAL_VARIANTS[st.model];
  const valid=t?.[3]==='column'?(st.model==='Brent'?['I','J'].includes(st.variantCode):Boolean(st.width))
    :special?special.shapes.some(x=>x.code===st.variantCode&&t[5].includes(x.code))
    :Boolean(d?.w.includes(Number(st.width))&&Number(st.height)===t?.[4]);
  return Boolean(valid&&Number.isInteger(Number(st.quantity))&&Number(st.quantity)>0&&Number(st.quantity)<=9);
 }
 if(index===3){
  const colors=SPECIAL_VARIANTS[st.model]?.colors||RANDAL[st.model]?.colors||[];
  return colors.includes(st.color)&&Boolean(variant()?.ref);
 }
 if(index===4){
  syncBasin();
  return allowedModes().includes(st.basinMode)&&
   (st.basinMode==='none'||st.basinMode==='integrated'&&['Sella','Tampa'].includes(st.basin)||
    st.basinMode==='vessel'&&['Neris','Torne'].includes(st.basin)&&
    VESSEL_FINISHES.includes(st.basinFinish)&&TOP_FINISHES.includes(st.topFinish));
 }
 if(index===5){
  return (!MIRROR_FORMATS[st.mirror]||MIRROR_FORMATS[st.mirror].some(x=>x[0]===st.mirrorSize)&&Number.isInteger(Number(st.mirrorQuantity))&&Number(st.mirrorQuantity)>=1&&Number(st.mirrorQuantity)<=3)&&
   (!isMetalMirror(st.mirror)||METAL_MIRROR_FINISHES.includes(st.mirrorFinish));
 }
 return true;
}
function navigateTo(index){
 if(!Number.isInteger(index)||index<0||index>6)return;
 if(index>st.maxStep)return;
 for(let j=0;j<index;j++)if(!stepReady(j))return;
 st.step=index;save();render();window.scrollTo({top:0,behavior:'smooth'});
}
function advanceSelection(){
 if(st.step>=6||!stepReady(st.step))return;
 st.step++;st.maxStep=Math.max(st.maxStep,st.step);
 save();render();window.scrollTo({top:0,behavior:'smooth'});
}
function choiceDone(field){
 if(st.step===0&&field==='model')return true;
 if(st.step===1&&field==='typeId')return true;
 if(st.step===2&&(field==='width'||field==='variantCode'))return true;
 if(st.step===3&&field==='color')return true;
 if(st.step===4){
  if(field==='basinMode')return st.basinMode==='none';
  if(st.basinMode==='vessel')return st.model==='Sima'?field==='basinFinish':field==='topFinish';
  if(st.basinMode==='integrated'){
   if(st.model==='Harmony'&&Number(st.width)===120)return field==='basinLayout';
   return field==='basin';
  }
  return false; // Vasque à poser : choisir aussi finition vasque ET finition plan.
 }
 if(st.step===5){
  if(field==='mirror')return !MIRROR_FORMATS[st.mirror]&&!isMetalMirror(st.mirror);
  if(field==='mirrorFinish')return !MIRROR_FORMATS[st.mirror]||Boolean(st.mirrorSize);
 }
 return false;
}

function render(){
$('steps').innerHTML=steps.map((name,i)=>'<button type="button" class="step '+(i===st.step?'active':i<st.maxStep?'done':'')+'" data-nav-step="'+i+'" '+(i>st.maxStep?'disabled':'')+' '+(i===st.step?'aria-current="step"':'')+' aria-label="Étape '+(i+1)+' : '+name+'">'+(i+1)+'. '+name+'</button>').join('');
$('steps').querySelectorAll('[data-nav-step]').forEach(button=>button.onclick=()=>navigateTo(Number(button.dataset.navStep)));
let h='<h2>'+['Choisissez une collection','Choisissez votre modèle','Choisissez les dimensions','Choisissez la finition','Vasque et plan','Choisissez votre miroir','Vérifiez votre commande'][st.step]+'</h2>';
if(st.step===0)h+='<p class="hint">Choisissez une collection RANDAL.</p>'+pick('model',models.map(([name,p])=>[name,'Catalogue page '+p]));
if(st.step===1)h+='<p class="hint">D’abord le type de meuble, puis ses dimensions.</p>'+typeCards();
if(st.step===2){
 const t=selectedType(),d=RANDAL[st.model],special=SPECIAL_VARIANTS[st.model];
 if(!t)h+='<p class="warn">Sélectionnez un modèle.</p>';
 else if(t[3]==='column'&&st.model==='Brent')h+='<p class="hint">Largeur de la colonne.</p>'+dimensionCards([['I',60,163,35],['J',40,163,35]]);
 else if(t[3]==='column')h+='<div class="fixed-format"><strong>'+(st.model==='Luce'?25:30)+' × '+t[4]+' × '+(st.model==='Luce'?30:27)+' cm</strong><small>Colonne · Variante '+t[5]+'</small></div>';
 else if(special)h+='<p class="hint">Formats du modèle '+esc(t[1])+'.</p>'+dimensionCards(special.shapes.filter(x=>t[5].includes(x.code)).map(x=>[x.code,x.width,x.height,x.depth]));
 else if(d)h+='<p class="hint">H. '+t[4]+' cm · P. '+d.d+' cm.</p>'+pick('width',d.w.map(w=>[String(w),st.model==='Harmony'&&w===120?'Meuble 119 cm · vasque / plan 120 cm':w+' cm de largeur']));
 h+='<div class="fields" style="margin-top:18px">'+entry('Quantité','quantity','number')+'</div>';
}
if(st.step===3){
 const colors=SPECIAL_VARIANTS[st.model]?.colors||RANDAL[st.model]?.colors||[];
 h+='<p class="hint">Finitions disponibles pour ce modèle.</p>'+pick('color',colors.map(c=>[c,'']));
}
if(st.step===4){
 syncBasin();
 if(selectedType()?.[3]==='column'){
  h+='<p class="hint">La colonne auxiliaire est un meuble de rangement, sans vasque ni plan à choisir.</p><div class="fixed-format"><strong>Colonne seule</strong><small>Vous pouvez ajouter un miroir à l’étape suivante.</small></div>';
 }else{

 h+='<p class="hint">Choisissez un montage. Seules les options correspondantes sont proposées.</p>';
 const modes=[['integrated','Vasque directement sur le meuble'],['vessel','Plan avec vasque à poser'],['none','Meuble seul, sans vasque']];
 h+=pick('basinMode',modes.filter(x=>allowedModes().includes(x[0])),'mode-grid');
 if(st.basinMode==='integrated'){
  h+='<div class="options-group"><h3>Vasque</h3>'+pick('basin',(st.model==='Luce'||st.model==='Brent'?['Tampa']:['Sella','Tampa']).map(x=>[x,'Vasque en céramique, page 38']))+'</div>';
  if(st.model==='Harmony'&&Number(st.width)===120)
   h+='<div class="options-group"><h3>Nombre de cuves</h3><p class="hint">Vasques 120 cm du catalogue officiel.</p>'+pick('basinLayout',[['single','Vasque simple · 1 cuve'],['double','Vasque double · 2 cuves']])+'</div>';
 }
 if(st.basinMode==='vessel'){
  h+='<div class="options-group"><h3>Vasque à poser</h3>'+pick('basin',['Neris','Torne'].map(x=>[x,'Page 41']))+'</div>';
  h+='<div class="options-group">'+select('Couleur de la vasque','basinFinish',VESSEL_FINISHES)+'</div>';
  if(st.model==='Sima')h+='<div class="options-group"><h3>Finition de la vasque</h3>'+pick('basinFinish',VESSEL_FINISHES.map(x=>[x,'']))+'</div><div class="options-group">Plateau SIMA (fourni dans la composition). Aucun plan supplémentaire.</div>';
  else h+='<div class="options-group"><h3>Finition du plan</h3><p class="mini">Appuyez sur une finition pour confirmer le plan et passer au miroir.</p>'+pick('topFinish',TOP_FINISHES.map(x=>[x,'']))+'</div>';
 }
 if(st.basinMode==='none')h+='<p class="mini">Le meuble sera demandé sans vasque ni plan.</p>';
 }
}
if(st.step===5){
 h+='<p class="hint">Choisissez votre miroir et sa dimension.</p>'+pick('mirror',[['Sans miroir',''],['Basic',''],['Zen LED',''],['Ilse LED',''],['Cápsula LED',''],['Miroir métallique rectangulaire',''],['Miroir métallique rond',''],['Autre miroir (à préciser)','Demande particulière · aucun article ni prix ajouté']]);
 const dims=MIRROR_FORMATS[st.mirror];
 if(dims)h+='<div class="options-group">'+select('Dimension du miroir','mirrorSize',['',...dims.map(x=>x[0])])+'</div>';
 if(isMetalMirror(st.mirror))h+='<div class="options-group"><h3>Couleur du cadre</h3><p class="mini">Finitions RANDAL — catalogue page 36.</p>'+pick('mirrorFinish',METAL_MIRROR_FINISHES.map(x=>[x,'']),'mirror-metal-choices')+'</div>';
}
if(st.step===6){
 h+='<p class="hint">Vérifiez les articles, références et prix avant la demande à RANDAL.</p>'+
 '<div class="visual-summary">'+
 '<div class="preview-card">'+activeTypeVisual()+'<strong>'+esc(st.model)+' · '+esc(selectedType()?.[1])+' · '+esc(st.color)+'</strong><span class="selected-finish"><img src="'+esc(finishUrl(st.model,st.color))+'" alt="Finition '+esc(st.color)+'" loading="lazy"></span></div>'+
 '<div class="preview-card">'+((selectedType()?.[3]==='column'||st.basinMode==='none')?blankAccessory('Sans vasque'):accessoryImage(st.basin+(st.basinLayout==='double'?' double':'')))+'<strong>'+esc(st.basin)+(st.basinLayout==='double'?' · double vasque':'')+'</strong></div>'+
 '<div class="preview-card">'+(accessoryImage(st.mirror)||blankAccessory('Sans miroir'))+'<strong>'+esc(st.mirror)+(isMetalMirror(st.mirror)?' · '+esc(st.mirrorFinish):'')+'</strong>'+(isMetalMirror(st.mirror)?metalFinishImage(st.mirrorFinish):'')+'</div>'+ 
 '</div>'+
 professionalRecap()+
 '<div class="recap-tools"><button type="button" class="btn recap-button recap-3d" id="preview-composition">◈ Ajouter à ma composition 3D</button><button type="button" class="btn recap-button" id="print-order">Imprimer</button>'+
 '<button type="button" class="btn recap-button" id="save-pdf">Enregistrer en PDF</button>'+
 '<button type="button" class="btn primary recap-button" id="send">Envoyer la demande</button></div>'+
 '<p class="mini recap-mailnote">Choisissez Gmail ou une autre messagerie. Le message contient les références et quantités, sans tarifs, et reste à envoyer manuellement.</p>';
}
h+='<div class="catalogue-step-nav"><button type="button" id="step-prev" '+(st.step===0?'disabled':'')+'>← Précédent</button><span>Étape '+(st.step+1)+' / 7</span><button type="button" id="step-next" '+(!stepReady(st.step)||st.step===6?'disabled':'')+'>Suivant →</button></div>';
$('panel').innerHTML=h;
$('step-prev').onclick=()=>navigateTo(st.step-1);
$('step-next').onclick=()=>advanceSelection();
const link=document.getElementById('catalogue-selected-page');if(link){link.href='randal-catalogue-interactif.html#page='+(selectedType()?.[6]||MODEL_PAGE[st.model]||2);link.textContent=st.model?'Catalogue · '+st.model+' p. '+(selectedType()?.[6]||MODEL_PAGE[st.model]):'Catalogue interactif';}
 paintThumbnails();
$('panel').querySelectorAll('[data-field]').forEach(b=>b.onclick=()=>{
 const field=b.dataset.field,value=b.dataset.value;
 if(field==='model'&&st.model!==value){resetConfiguration();st.model=value;st.maxStep=0;}
 else if(field==='typeId'&&st.typeId!==value){
  st.typeId=value;st.width='';st.height='';st.depth='';st.variantCode='';
  st.basinMode='integrated';st.basin='Sella';st.basinLayout='single';st.top='Sans plan';
  st.maxStep=Math.min(st.maxStep,1);
 }else{
  if((field==='width'||field==='variantCode')&&st[field]!==value){st.maxStep=Math.min(st.maxStep,2);}
  if(field==='width'&&st.width!==value)st.basinLayout='single';
  if(field==='color'&&st.color!==value)st.maxStep=Math.min(st.maxStep,3);
  if(['basinMode','basin','basinLayout'].includes(field)&&st[field]!==value)st.maxStep=Math.min(st.maxStep,4);
  if(field==='mirror'&&st.mirror!==value){st.mirrorSize='';st.mirrorFinish='';st.maxStep=Math.min(st.maxStep,5);}
  st[field]=value;
 }
 normalize();syncBasin();
 if(choiceDone(field)){
  // Les colonnes aux dimensions fixes passent directement à la finition.
  if(field==='color'&&selectedType()?.[3]==='column'){
   st.step=5;st.maxStep=Math.max(st.maxStep,5);save();render();window.scrollTo({top:0,behavior:'smooth'});
  }else if(field==='typeId'&&selectedType()?.[3]==='column'&&st.model!=='Brent'){
   st.step=3;st.maxStep=Math.max(st.maxStep,3);save();render();window.scrollTo({top:0,behavior:'smooth'});
  }else advanceSelection();
 }else{save();render();}
});
$('panel').querySelectorAll('[name]').forEach(el=>el.onchange=()=>{
 st[el.name]=el.value.trim();syncBasin();save();
 if(st.step===4&&st.basinMode==='vessel'&&el.name==='topFinish')advanceSelection();
 else if(st.step===5&&el.name==='mirrorSize'&&st.mirrorSize&&(!isMetalMirror(st.mirror)||st.mirrorFinish))advanceSelection();
 else if(st.step===4)render();
});
if($('preview-composition'))$('preview-composition').onclick=()=>{
 if(window.RandalWorkspace){window.RandalWorkspace.addDraft({...st});return;} 
 const type=selectedType();
 if(!window.RandalComposition3D){alert('La visualisation 3D est encore en cours de chargement. Réessayez dans un instant.');return;}
 window.RandalComposition3D.open(compositionConfig());
};
if($('print-order'))$('print-order').onclick=()=>window.RandalWorkspace?.exportDraft({...st},true);
if($('save-pdf'))$('save-pdf').onclick=()=>window.RandalWorkspace?.exportDraft({...st},false);
if($('send'))$('send').onclick=()=>window.RandalWorkspace?.contactDraft({...st});
}
window.RandalCatalogue={
 getState:()=>JSON.parse(JSON.stringify(st)),
 resolve(input){const previous=st;try{st={...previous,...input};normalize();syncBasin();const complete=[0,1,2,3,4,5].every(stepReady);return {valid:complete,state:JSON.parse(JSON.stringify(st)),config:compositionConfig(),rows:orderRows(),total:totals().sum};}finally{st=previous}},
 edit(input){st={...st,...input,step:2,maxStep:6};normalize();syncBasin();save();render();document.getElementById('panel').scrollIntoView({block:'start'});},
 newItem(){resetConfiguration();st.step=0;st.maxStep=0;save();render();},
 price:publicPrice
};

render();
})();
