import {clampPage,swipeStep,fitPageScale,pixelRatio,createBoundedCache} from './neobath-reader-model.mjs?v=20261110-reader2';

const ENDPOINT='https://gettariffpdf-5m3lsyu7bq-uc.a.run.app';
const DNA=location.pathname.endsWith('neobath-dna-interactif.html'),collection=DNA?'DNA':'ANIMA';
const FIREBASE_CONFIG={apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory',storageBucket:'le-roy-factory.firebasestorage.app',messagingSenderId:'249878619253',appId:'1:249878619253:web:05f051710b6251dbfa843c'};
const ADMIN_EMAILS=new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
const animaSections=[
 ['Présentation','Introduction',3],['Finitions Pura & Ribelle','Finitions',4],['Toutes les compositions','Présentation',5],
 ['Composition 01 · Ribelle','Compositions',6],['Composition 02 · Pura & Ribelle','Compositions',10],
 ['Composition 02b · Pura','Compositions',13],['Composition 03 · Ribelle','Compositions',14],
 ['Composition 04 · Pura','Compositions',17],['Composition 05 · Ribelle','Compositions',20],
 ['Composition 05b · Ribelle','Compositions',22],['Composition 06 · Ribelle','Compositions',25],
 ['Composition 07 · Pura','Compositions',27],['Composition 08 · Ribelle','Compositions',29],
 ['Composition 09 · Pura','Compositions',32],['Composition 10 · Pura & Ribelle','Compositions',35],
 ['Composition 11 · Pura','Compositions',37],['Composition 12 · Pura','Compositions',39],
 ['Composition 12b · Pura','Compositions',41],['Composition 13 · Pura','Compositions',42],
 ['Composition 14 · Pura','Compositions',44],['Composition 15 · Ribelle','Compositions',46],
 ['Composition 16 · Ribelle','Compositions',48],
 ['Colonnes et éléments suspendus','Meubles & accessoires',51],['Accessoires','Meubles & accessoires',53],
 ['Modularité et combinaisons','Technique',57],['Fiches techniques','Technique',58],
 ['Tarifs · Sommaire','Tarifs (accès PRO)',59],['Tarifs · Compositions photographiées','Tarifs (accès PRO)',60],
 ['Tarifs · Meubles sous-vasque','Tarifs (accès PRO)',65],['Tarifs · Colonnes et éléments','Tarifs (accès PRO)',67],
 ['Tarifs · Plans céramique','Tarifs (accès PRO)',68],['Tarifs · Plans Geacril','Tarifs (accès PRO)',70],
 ['Tarifs · Plans Ocritech','Tarifs (accès PRO)',72],['Tarifs · Vasques','Tarifs (accès PRO)',73],
 ['Tarifs · Plans HPL / Fenix','Tarifs (accès PRO)',74],['Tarifs · Vasques à poser','Tarifs (accès PRO)',75],
 ['Tarifs · Miroirs','Tarifs (accès PRO)',77],['Tarifs · Lampes','Tarifs (accès PRO)',80]
].map(([name,group,page])=>({name,group,page}));
const $=id=>document.getElementById(id),frame=$('frame'),mount=$('mount'),status=$('status'),overlay=$('overlay');
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const sectionAt=n=>DNA?null:[...animaSections].reverse().find(s=>s.page<=n);
const canvasCache=createBoundedCache(3,canvas=>{canvas.width=0;canvas.height=0;});
const thumbnailCache=createBoundedCache(24,url=>URL.revokeObjectURL(url));
const pagesText=new Map(),entries=new Map(),visibleThumbnails=new Set(),thumbnailQueue=new Set();
let page=1,total=0,zoom=1,pdf=null,blobUrl='',renderTask=null,renderTurn=0,searchTurn=0,loading=false,mainBusy=false,thumbnailBusy=false,observer=null,disposed=false,thumbnailTask=null;
let requestedPage=Number(location.hash.match(/page=(\d+)/)?.[1]||1);
function setStatus(message,error=false){status.replaceChildren(document.createTextNode(message));status.classList.toggle('error',error);status.hidden=false;}
function updateUI(){
 frame.style.touchAction=zoom>1.05?'pan-x pan-y pinch-zoom':'pan-y pinch-zoom';
 $('page').value=String(page);$('page').max=String(total||1);$('page').disabled=!total;
 $('total').textContent=total?'/ '+total:'/ …';$('zoom').textContent=Math.round(zoom*100)+' %';
 for(const id of ['prev','stage-prev'])$(id).disabled=!total||page<=1;
 for(const id of ['next','stage-next'])$(id).disabled=!total||page>=total;
 for(const id of ['less','more','fit','open-index'])$(id).disabled=!pdf;
 const title=entries.get(page)?.name||sectionAt(page)?.name||'Catalogue '+collection;
 $('section-title').textContent=title;
 $('caption').textContent=total?'Page '+page+' sur '+total:'Votre catalogue se prépare…';
 for(const button of document.querySelectorAll('[data-goto]')){const active=Number(button.dataset.goto)===page;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
}
function getSession(){try{return window.LRF_PRO_SESSION?.read?.()||JSON.parse(sessionStorage.getItem('lrfProSession')||'null');}catch{return null;}}
async function getAdminBearer(){
 const [fb,authLib]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]);
 const app=fb.getApps().find(x=>x.name==='[DEFAULT]')||fb.initializeApp(FIREBASE_CONFIG),auth=authLib.getAuth(app);
 await auth.authStateReady();const user=auth.currentUser;
 if(!user||!ADMIN_EMAILS.has(String(user.email||'').toLowerCase()))throw Error('Connectez votre compte LRF pour ouvrir ce document.');
 return user.getIdToken();
}
async function fetchSecurePdf(){
 const session=getSession(),body={tariffId:DNA?'neobath-dna-pdf':'neobath-anima'},headers={'Content-Type':'application/json'};
 if(session&&/^LRF-\d{5}$/i.test(String(session.codeClient||''))&&session.departement){body.codeClient=String(session.codeClient).toUpperCase();body.departement=session.departement;}
 else headers.Authorization='Bearer '+await getAdminBearer();
 const response=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(90000)});
 if(!response.ok){let message='Le catalogue est momentanément indisponible.';try{message=(await response.json()).error||message;}catch{}throw Error(message);}
 const length=Number(response.headers.get('Content-Length'))||0,chunks=[];let loaded=0,lastUpdate=0;
 if(response.body?.getReader){const reader=response.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.byteLength;if(Date.now()-lastUpdate>250){lastUpdate=Date.now();setStatus('Chargement de '+collection+' · '+(loaded/1048576).toFixed(1)+' Mo'+(length?' / '+(length/1048576).toFixed(1)+' Mo':''));}}}
 else chunks.push(new Uint8Array(await response.arrayBuffer()));
 const blob=new Blob(chunks,{type:'application/pdf'});
 if(blob.size<1000||!(await blob.slice(0,5).text()).startsWith('%PDF-'))throw Error('Le document reçu est invalide. Réessayez dans un instant.');
 return blob;
}
function labelFor(n){if(n===1)return 'Couverture '+collection;const section=sectionAt(n);return section?section.name:collection+' · Page '+n;}
function buildIndex(){
 observer?.disconnect();visibleThumbnails.clear();thumbnailQueue.clear();entries.clear();
 for(let n=1;n<=total;n++)entries.set(n,{page:n,name:labelFor(n)});
 for(const list of document.querySelectorAll('[data-list]')){
  list.replaceChildren();
  for(const entry of entries.values()){
   const button=document.createElement('button');button.type='button';button.className='index-item';button.dataset.goto=String(entry.page);
   const preview=document.createElement('span');preview.className='thumbnail';preview.textContent=String(entry.page).padStart(2,'0');preview.setAttribute('aria-hidden','true');
   const number=document.createElement('span');number.className='page-tag';number.textContent=String(entry.page).padStart(2,'0');
   const title=document.createElement('span');title.className='item-title';title.textContent=entry.name;
   button.append(preview,number,title);button.addEventListener('click',()=>{navigate(entry.page);hideIndex();});list.append(button);
  }
 }
 if('IntersectionObserver' in window){observer=new IntersectionObserver(changes=>{for(const change of changes){if(change.isIntersecting){visibleThumbnails.add(change.target);queueThumbnail(Number(change.target.dataset.goto));}else{visibleThumbnails.delete(change.target);const image=change.target.querySelector('.thumbnail img');if(image){image.removeAttribute('src');image.hidden=true;}}}},{rootMargin:'100px',threshold:.01});for(const button of document.querySelectorAll('[data-goto]'))observer.observe(button);}
 else refreshVisibleThumbnails();
 updateUI();
}
function applyThumbnail(n,url){
 for(const button of visibleThumbnails){if(Number(button.dataset.goto)!==n)continue;const preview=button.querySelector('.thumbnail');let image=preview.querySelector('img');if(!image){image=document.createElement('img');image.alt='';image.decoding='async';preview.replaceChildren(image);}image.hidden=false;image.src=url;}
}
function queueThumbnail(n){if(!pdf||disposed)return;const url=thumbnailCache.get(n);if(url){applyThumbnail(n,url);return;}thumbnailQueue.add(n);pumpThumbnails();}
function refreshVisibleThumbnails(){
 for(const button of document.querySelectorAll('[data-goto]')){const rect=button.getBoundingClientRect();if(rect.width&&rect.height&&rect.bottom>0&&rect.top<innerHeight){visibleThumbnails.add(button);queueThumbnail(Number(button.dataset.goto));}else visibleThumbnails.delete(button);}
}
async function pumpThumbnails(){
 if(thumbnailBusy||!pdf||disposed)return;thumbnailBusy=true;
 try{while(thumbnailQueue.size&&!disposed){
  if(mainBusy){await new Promise(resolve=>setTimeout(resolve,60));continue;}
  const n=thumbnailQueue.values().next().value;thumbnailQueue.delete(n);
  if(![...visibleThumbnails].some(b=>Number(b.dataset.goto)===n))continue;
  try{const p=await pdf.getPage(n);if(disposed)break;const natural=p.getViewport({scale:1}),viewport=p.getViewport({scale:150/natural.width});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   thumbnailTask=p.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport,background:'#ffffff'});await thumbnailTask.promise;thumbnailTask=null;
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.72));canvas.width=0;canvas.height=0;
   if(blob&&!disposed){const url=URL.createObjectURL(blob);thumbnailCache.set(n,url);applyThumbnail(n,url);}
  }catch(error){if(error?.name!=='RenderingCancelledException')console.warn('Aperçu du catalogue indisponible.');}
  await new Promise(resolve=>setTimeout(resolve,0));
 }}finally{thumbnailBusy=false;}
}
function hideIndex(){overlay.hidden=true;document.body.classList.remove('modal-open');$('open-index').focus({preventScroll:true});}
function showIndex(){overlay.hidden=false;document.body.classList.add('modal-open');if(!observer)refreshVisibleThumbnails();$('close-index').focus({preventScroll:true});}
function navigate(next){if(!total)return;const target=clampPage(next,total);if(target===page)return;page=target;requestedPage=page;updateUI();history.replaceState(null,'','#page='+page);render();}
function scaleFor(p){const natural=p.getViewport({scale:1}),style=getComputedStyle(frame),paddingX=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight),paddingY=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);return fitPageScale({pageWidth:natural.width,pageHeight:natural.height,frameWidth:frame.clientWidth-paddingX+24,frameHeight:frame.clientHeight-paddingY+24,zoom});}
async function render(){
 if(!pdf||disposed)return;const turn=++renderTurn,n=page;renderTask?.cancel();renderTask=null;mainBusy=true;frame.setAttribute('aria-busy','true');
 const key=[n,Math.round(frame.clientWidth),Math.round(innerHeight),zoom,devicePixelRatio].join(':');
 const cached=canvasCache.get(key);if(cached){mount.replaceChildren(cached);status.hidden=true;mainBusy=false;frame.setAttribute('aria-busy','false');pumpThumbnails();return;}
 setStatus('Page '+n+'…');let canvas;
 try{const p=await pdf.getPage(n);if(turn!==renderTurn||disposed)return;const viewport=p.getViewport({scale:scaleFor(p)}),ratio=pixelRatio({width:viewport.width,height:viewport.height,dpr:devicePixelRatio||1});
  canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(viewport.width*ratio));canvas.height=Math.max(1,Math.floor(viewport.height*ratio));canvas.style.width=Math.round(viewport.width)+'px';canvas.style.height=Math.round(viewport.height)+'px';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',collection+' · Page '+n);
  const task=p.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:undefined,background:'#ffffff'});renderTask=task;await task.promise;
  if(turn!==renderTurn||disposed){canvas.width=0;canvas.height=0;return;}
  canvasCache.set(key,canvas);mount.replaceChildren(canvas);status.hidden=true;
  // Prepare only PDF page metadata; no offscreen full-resolution canvas.
  if(n<total)pdf.getPage(n+1).catch(()=>{});
 }catch(error){if(canvas){canvas.width=0;canvas.height=0;}if(turn===renderTurn&&error?.name!=='RenderingCancelledException'){setStatus('Cette page ne peut pas être affichée. Réessayez ou ouvrez le PDF.',true);}}
 finally{if(turn===renderTurn){renderTask=null;mainBusy=false;frame.setAttribute('aria-busy','false');pumpThumbnails();}}
}
async function loadPdf(){
 if(loading||pdf)return;loading=true;setStatus('Ouverture du catalogue '+collection+'…');$('retry-load')?.setAttribute('hidden','');
 try{const blob=await fetchSecurePdf();if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(blob);
  const download=$('download');download.href=blobUrl;download.download='NEOBATH_'+collection+'_2026.pdf';download.hidden=false;download.removeAttribute('aria-disabled');
  if(!window.pdfjsLib)throw Error('L’aperçu n’a pas pu démarrer. Vous pouvez ouvrir le PDF avec le lien ci-dessus.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const documentPDF=await pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,disableAutoFetch:true}).promise;
  if(disposed){await documentPDF.destroy();return;}pdf=documentPDF;total=pdf.numPages;page=clampPage(requestedPage,total);buildIndex();await render();
 }catch(error){setStatus(error?.name==='TimeoutError'?'Le chargement prend trop de temps. Vérifiez votre connexion puis réessayez.':error.message||'Ouverture impossible.',true);$('retry-load')?.removeAttribute('hidden');}
 finally{loading=false;updateUI();}
}
async function pageText(n){if(pagesText.has(n))return pagesText.get(n);const p=await pdf.getPage(n),text=await p.getTextContent(),raw=text.items.map(item=>item.str||'').join(' ').replace(/\s+/g,' ').trim();pagesText.set(n,raw);return raw;}
async function searchDocument(query){
 const q=normalize(query.trim());if(q.length<2)return;const turn=++searchTurn;const results=$('results'),label=$('results-title'),list=$('results-list');results.hidden=false;list.replaceChildren();
 if(!pdf){label.textContent='Ouvrez le catalogue pour rechercher une référence.';return;}
 let found=0;label.textContent='Recherche en cours…';
 for(let n=1;n<=total;n++){
  if(turn!==searchTurn||disposed)return;
  try{const raw=await pageText(n);if(turn!==searchTurn||disposed)return;const at=normalize(raw).indexOf(q);if(at>=0){found++;const button=document.createElement('button');button.type='button';button.className='result';const title=document.createElement('strong'),excerpt=document.createElement('span');title.textContent='Page '+n;excerpt.textContent=(at>50?'…':'')+raw.slice(Math.max(0,at-50),at+q.length+80);button.append(title,excerpt);button.addEventListener('click',()=>{navigate(n);results.hidden=true;});list.append(button);}}
  catch{}if(turn!==searchTurn||disposed)return;if(n%8===0){label.textContent='Recherche · '+n+' / '+total;await new Promise(resolve=>setTimeout(resolve,0));}
 }
 if(turn===searchTurn)label.textContent=found?found+' page'+(found>1?'s':'')+' trouvée'+(found>1?'s':''):'Aucun résultat pour « '+query+' »';
}
$('open-index').addEventListener('click',showIndex);$('close-index').addEventListener('click',hideIndex);
overlay.addEventListener('click',event=>{if(event.target===overlay)hideIndex();});
for(const id of ['prev','stage-prev'])$(id).addEventListener('click',()=>navigate(page-1));
for(const id of ['next','stage-next'])$(id).addEventListener('click',()=>navigate(page+1));
$('page').addEventListener('change',()=>{navigate($('page').value);updateUI();});
for(const [id,delta] of [['less',-.25],['more',.25]])$(id).addEventListener('click',()=>{zoom=Math.max(.75,Math.min(3,zoom+delta));updateUI();render();});
$('fit').addEventListener('click',()=>{zoom=1;updateUI();render();});
$('retry-load')?.addEventListener('click',loadPdf);
$('search-form').addEventListener('submit',event=>{event.preventDefault();searchDocument($('search').value);$('search').blur();});
$('results-close').addEventListener('click',()=>{searchTurn++;$('results').hidden=true;});
for(const input of document.querySelectorAll('[data-filter]'))input.addEventListener('input',()=>{const q=normalize(input.value.trim());const list=input.closest('.sidebar').querySelector('[data-list]');for(const button of list.querySelectorAll('[data-goto]'))button.hidden=!!q&&!normalize(button.textContent).includes(q);if(!observer)refreshVisibleThumbnails();});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'){if(!overlay.hidden)hideIndex();searchTurn++;$('results').hidden=true;return;}
 if(!overlay.hidden){if(event.key==='Tab'){const items=[...overlay.querySelectorAll('button:not([disabled]),input,a[href]')].filter(item=>!item.hidden&&item.getClientRects().length);const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}return;}
 if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')||document.activeElement?.isContentEditable)return;
 if(event.key==='ArrowLeft'){event.preventDefault();navigate(page-1);}if(event.key==='ArrowRight'){event.preventDefault();navigate(page+1);}
});
let touch=null;
frame.addEventListener('touchstart',event=>{if(event.touches.length!==1){if(touch)touch.multiTouch=true;return;}if(!touch)touch={startX:event.touches[0].clientX,startY:event.touches[0].clientY,multiTouch:false};},{passive:true});
frame.addEventListener('touchmove',event=>{if(touch&&event.touches.length!==1)touch.multiTouch=true;},{passive:true});
frame.addEventListener('touchend',event=>{if(!touch)return;const start=touch;touch=null;const end=event.changedTouches[0];if(!end)return;const step=swipeStep({...start,endX:end.clientX,endY:end.clientY,zoom});if(step)navigate(page+step);},{passive:true});
frame.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{canvasCache.clear();if(pdf)render();},150);});
addEventListener('hashchange',()=>{const n=location.hash.match(/page=(\d+)/)?.[1];if(n)navigate(n);});
for(const list of document.querySelectorAll('[data-list]'))list.addEventListener('scroll',()=>{if(!observer)refreshVisibleThumbnails();},{passive:true});
addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;renderTurn++;searchTurn++;renderTask?.cancel();thumbnailTask?.cancel();observer?.disconnect();canvasCache.clear();thumbnailCache.clear();if(blobUrl)URL.revokeObjectURL(blobUrl);pdf?.destroy();});
updateUI();loadPdf();
