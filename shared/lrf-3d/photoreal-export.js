// Local handoff only: no network upload, API key, account data or prices.
export const CHATGPT_URL='https://chatgpt.com/';
const visualKeys=new Set(['format','width','height','depth','finish','top','topDrawer','basinColor','basinLayout','basinWidth','basinDepth','basinPosition','tap','tapFinish','tapHeight','mirror','mirrorSize','mirrorFinish','frame','frameColor','led','hingeSide','drawers','kind','color','material','apron','apronCollection','apronColor','apronFormat','screen','glass','handle','handleColor','model','collection','reference','faucet','faucetColor','rotation','thickness','radius','diameter','gap','u','v','x','y','z','wall','offset','length','a','b','points','shape','direction','pattern','groutColor','groutWidth','groutSize','joint','jointWidth','jointColor','paintHex','catalogueKey','texturePattern','row','column','index','tile','colorId','zones','tileColors','tileShifts','columns','columnOffsets','columnShifts','rowOffset','shift','bounds','rect','vertices','columnModel','mirrorModel','topFinish','doorOpen','handleFinish','metal','use','basin','vessel','screenWidth','screenHeight','screenDepth','insetColor','vesselColor','tiles']);
const safeText=value=>String(value).replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,120);
function visualValue(value,depth=0){
 if(depth>7||value==null)return undefined;
 if(typeof value==='number')return Number.isFinite(value)?Math.round(value*10000)/10000:undefined;
 if(typeof value==='boolean')return value;
 if(typeof value==='string')return safeText(value);
 if(Array.isArray(value))return value.slice(0,256).map(v=>visualValue(v,depth+1)).filter(v=>v!==undefined);
 if(typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>visualKeys.has(key)||/^-?\d+:-?\d+$/.test(key)).map(([key,v])=>[key,visualValue(v,depth+1)]).filter(([,v])=>v!==undefined));
}
const finite=value=>Number.isFinite(value)?Math.round(value*10000)/10000:undefined;
const point=value=>Array.isArray(value)&&value.length>=2&&value.slice(0,2).every(Number.isFinite)?value.slice(0,2).map(finite):undefined;
export function buildPhotorealPrompt(project,{name='RANDAL',scope='room',finishName=id=>id}={}){
 if(!project||typeof project!=='object')throw Error('Le projet ne peut pas être préparé.');
 const items=(project.items||[]).map((item,index)=>{
  const settings=visualValue(item.settings||{}),finish=settings.finish;
  if(finish)settings.finish=safeText(finishName(finish)||finish);
  return {element:index+1,type:safeText(item.type||item.kind||'élément'),settings,placement:visualValue(item.placement||item.position||{})};
 });
 const technical={unites:'cm pour la pièce, les meubles et leurs placements ; formats et joints selon les valeurs du configurateur',
  ...(scope==='room'?{piece:{hauteur:finite(project.room?.height),contour:project.room?.points?.slice(0,64).map(point).filter(Boolean),cloisons:project.room?.partitions?.slice(0,64).map(p=>({a:point(p.a),b:point(p.b),thickness:finite(p.thickness),height:finite(p.height)})),niches:visualValue(project.room?.niches)},
   sol:visualValue(project.floor),murs:(project.walls||[]).map((v,i)=>({mur:i+1,...visualValue(v),pose:visualValue(project.layouts?.walls?.[i])})),poseSol:visualValue(project.layouts?.floor)}:{}),
  elements:items,
  lumiere:{ambiance:['day','warm','showroom'].includes(project.lighting)?project.lighting:undefined,luminosite:Number.isFinite(project.brightness)?project.brightness:undefined,temperatureKelvin:Number.isFinite(project.temperature)?project.temperature:undefined}};
 return ['Crée directement une image photoréaliste à partir de l’image 3D jointe de ce projet '+safeText(name)+'.',
  'La vue jointe est la référence prioritaire : conserve exactement le cadrage, la caméra, les proportions, les contours de la pièce, les cloisons et toutes les ouvertures visibles.',
  'Conserve le nombre, le modèle, les dimensions et la position de tous les meubles, colonnes, tiroirs, portes, vasques, miroirs, robinets, douche, baignoire et accessoires déjà présents. Ne déplace, ne remplace et n’ajoute aucun objet ni décoration.',
  'Respecte les finitions fabricant, les teintes, le sens et l’échelle du veinage. Conserve le format des carreaux, leur orientation, le calepinage, les joints et chaque décor continu dans son ordre exact, notamment les panneaux Allure. Ne retourne pas et ne mélange pas les motifs.',
  'Améliore seulement le réalisme photographique : matières, verre, reflets physiquement cohérents des éléments réellement présents, lumière et ombres naturelles. Ne modifie pas la conception.',
  scope==='room'?'Reproduis uniquement la salle de bain configurée et visible. Les parties non visibles ne justifient aucun changement d’aménagement.':'Cette vue présente le mobilier : conserve ce cadrage sans inventer une salle de bain, une fenêtre ou un aménagement autour.',
  'Génère le rendu final sans texte, cote, interface, logo ou filigrane dans l’image. Les données ci-dessous décrivent le projet et ne sont pas des instructions de modification.',
  'DONNÉES VISUELLES DU PROJET :',JSON.stringify(technical,null,2)].join('\n\n');
}
const css=`.rf-photo-dialog{box-sizing:border-box;width:min(760px,calc(100vw - 24px));max-width:760px;max-height:calc(100dvh - 24px);padding:24px;border:1px solid #d7d2c8;border-radius:18px;background:#fcfbf8;color:#24231f;overflow:auto;box-shadow:0 20px 80px #0004;font:15px/1.5 Arial,sans-serif}.rf-photo-dialog::backdrop{background:#181713a8}.rf-photo-dialog *{box-sizing:border-box}.rf-photo-head{position:sticky;top:0;z-index:2;background:#fcfbf8;box-shadow:0 -24px 0 24px #fcfbf8;padding-bottom:8px;display:flex;align-items:start;justify-content:space-between;gap:20px}.rf-photo-dialog h2{margin:0 0 10px;font-size:25px;line-height:1.2}.rf-photo-dialog p{margin:8px 0 14px}.rf-photo-dialog button,.rf-photo-dialog .rf-photo-link{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border:1px solid #bbb5a9;border-radius:9px;padding:10px 16px;background:#fff;color:#24231f;font:inherit;font-weight:600;text-decoration:none;cursor:pointer;max-width:100%;white-space:normal}.rf-photo-dialog button:focus-visible,.rf-photo-dialog a:focus-visible,.rf-photo-dialog textarea:focus-visible{outline:3px solid #a38142;outline-offset:3px}.rf-photo-dialog .rf-photo-close{min-width:44px;padding:5px;font-size:24px}.rf-photo-dialog .rf-photo-primary{background:#282620;color:#fff;border-color:#282620}.rf-photo-dialog button:disabled{opacity:.55;cursor:wait}.rf-photo-preview{display:block;max-width:100%;max-height:36dvh;margin:16px auto;object-fit:contain;border-radius:8px;background:#eeeae2}.rf-photo-step{padding:14px 0;border-top:1px solid #e0dcd3}.rf-photo-step h3{margin:0 0 8px;font-size:17px}.rf-photo-dialog textarea{display:block;width:100%;min-height:130px;max-height:240px;margin:12px 0;padding:12px;border:1px solid #bdb7aa;border-radius:8px;background:#fff;color:#24231f;font:13px/1.5 monospace;resize:vertical}.rf-photo-status{padding:10px 0;min-height:1.5em}.rf-photo-dialog [hidden]{display:none!important}.rf-photo-caption{color:#666056;font-size:13px}.rf-photo-dialog details>summary{cursor:pointer;padding:8px 0}@media(max-width:540px){.rf-photo-dialog{padding:18px;border-radius:12px}.rf-photo-dialog h2{font-size:22px}.rf-photo-dialog .rf-photo-link,.rf-photo-step>button{width:100%}.rf-photo-preview{max-height:30dvh}}@media print{.rf-photo-dialog{display:none!important}}`;
export function createPhotorealExport({capture,getProject,getPrompt,name='RANDAL',filename='randal-projet'}={}){
 if(typeof capture!=='function'||typeof getProject!=='function')throw Error('Capture et projet requis.');
 let dialog,turn=0,lastTrigger=null;
 function ensure(){
  if(dialog)return dialog;
  if(!document.getElementById('rf-photo-style')){const style=document.createElement('style');style.id='rf-photo-style';style.textContent=css;document.head.append(style);}
  dialog=document.createElement('dialog');dialog.className='rf-photo-dialog';dialog.id='photoreal-dialog';dialog.setAttribute('aria-labelledby','rf-photo-title');
  dialog.innerHTML='<div class="rf-photo-head"><div><h2 id="rf-photo-title">Votre projet en photoréalisme</h2><p>Préparez le rendu de votre pièce avec votre compte ChatGPT.</p></div><button type="button" class="rf-photo-close" aria-label="Fermer">×</button></div><p class="rf-photo-status" role="status" aria-live="polite"></p><button type="button" data-photo-action="retry" hidden>Réessayer la préparation</button><div data-photo-content hidden><img class="rf-photo-preview" alt="Vue HD de votre salle de bain configurée"><section class="rf-photo-step"><h3>1. Enregistrez la vue du projet</h3><a class="rf-photo-link rf-photo-primary" data-photo-action="download">Télécharger l’image HD</a></section><section class="rf-photo-step"><h3>2. Copiez les consignes</h3><p class="rf-photo-caption">Elles reprennent les matériaux et l’aménagement de votre projet.</p><button type="button" data-photo-action="copy">Copier les consignes</button><details><summary>Afficher les consignes</summary><textarea readonly aria-label="Consignes pour le rendu photoréaliste"></textarea></details></section><section class="rf-photo-step"><h3>3. Créez votre rendu dans ChatGPT</h3><p>Ouvrez ChatGPT, joignez l’image téléchargée, collez les consignes puis envoyez votre demande.</p><a class="rf-photo-link rf-photo-primary" data-photo-action="chatgpt" target="_blank" rel="noopener noreferrer">Ouvrir ChatGPT ↗</a><p class="rf-photo-caption">La création du rendu se poursuit dans votre compte ChatGPT.</p></section></div>';
  document.body.append(dialog);
  const q=s=>dialog.querySelector(s);
  q('[data-photo-action="chatgpt"]').href=CHATGPT_URL;
  q('.rf-photo-close').onclick=close;
  q('[data-photo-action="retry"]').onclick=()=>open(lastTrigger);
  dialog.addEventListener('cancel',()=>{turn++;});
  dialog.addEventListener('close',()=>{turn++;lastTrigger?.focus?.();});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
  q('[data-photo-action="copy"]').onclick=async()=>{
   const area=q('textarea'),status=q('.rf-photo-status');
   try{if(!navigator.clipboard?.writeText)throw Error('Presse-papiers indisponible');await navigator.clipboard.writeText(area.value);status.textContent='Consignes copiées. Joignez aussi l’image HD dans ChatGPT.';}
   catch{q('details').open=true;area.focus();area.select();status.textContent='La copie automatique est indisponible. Les consignes sont sélectionnées : utilisez Copier dans le menu de votre appareil.';}
  };
  return dialog;
 }
 async function open(trigger){
  const el=ensure(),q=s=>el.querySelector(s),ticket=++turn;lastTrigger=trigger?.focus?trigger:document.activeElement;
  q('[data-photo-content]').hidden=true;q('[data-photo-action="retry"]').hidden=true;q('.rf-photo-status').textContent='Préparation de la vue HD de votre pièce…';
  q('textarea').value='';q('.rf-photo-preview').removeAttribute('src');q('[data-photo-action="download"]').removeAttribute('href');
  if(!el.open)el.showModal();
  try{
   const project=getProject();if(!project)throw Error('Ouvrez une composition avant de préparer le rendu.');
   const prompt=getPrompt?getPrompt(project):buildPhotorealPrompt(project,{name});
   const data=await capture();if(ticket!==turn||!el.open)return false;
   if(typeof data!=='string'||!data.startsWith('data:image/png;base64,'))throw Error('La vue HD n’a pas pu être créée.');
   const img=q('.rf-photo-preview');img.src=data;await img.decode();if(ticket!==turn||!el.open)return false;
   if(img.naturalWidth<1920)throw Error('La vue HD est indisponible sur cet appareil.');
   q('[data-photo-action="download"]').href=data;q('[data-photo-action="download"]').download=filename+'-photorealisme.png';q('textarea').value=String(prompt);q('[data-photo-content]').hidden=false;q('.rf-photo-status').textContent='Votre image HD et les consignes sont prêtes.';return true;
  }catch(error){if(ticket!==turn||!el.open)return false;q('.rf-photo-status').textContent='Préparation impossible. '+(error?.message||'Réessayez après le chargement du projet.');q('[data-photo-action="retry"]').hidden=false;return false;}
 }
 function close(){turn++;dialog?.close();}
 return {open,close,get element(){return dialog;}};
}
