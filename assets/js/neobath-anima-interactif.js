(() => {
'use strict';
const ENDPOINT='https://gettariffpdf-5m3lsyu7bq-uc.a.run.app';
const FIREBASE_CONFIG={apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory',storageBucket:'le-roy-factory.firebasestorage.app',messagingSenderId:'249878619253',appId:'1:249878619253:web:05f051710b6251dbfa843c'};
const ADMIN_EMAILS=new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
const MAX=81;
const sections=[
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
const $=id=>document.getElementById(id);
const lists=[...document.querySelectorAll('[data-list]')];
const status=$('status'),mount=$('mount'),frame=$('frame'),overlay=$('overlay');
const pageInput=$('page');
let page=1,zoom=1,pdf=null,sourceBlob=null,blobUrl=null,renderTask=null,ticket=0,searchTicket=0,pagesText=new Map();
const clamp=n=>Math.max(1,Math.min(MAX,Math.round(Number(n)||1)));
const sectionAt=n=>[...sections].reverse().find(s=>s.page<=n)||null;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function setStatus(message,error=false){status.textContent=message;status.classList.toggle('error',error);status.hidden=false;}
function getSession(){
 try{return window.LRF_PRO_SESSION?.read?.()||JSON.parse(sessionStorage.getItem('lrfProSession')||'null');}catch(_){return null;}
}
async function getAdminBearer(){
 const [fb,authLib]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
 ]);
 const app=fb.getApps().find(x=>x.name==='[DEFAULT]')||fb.initializeApp(FIREBASE_CONFIG);
 const auth=authLib.getAuth(app);
 let user=auth.currentUser;
 if(!user){
  user=await new Promise((resolve,reject)=>{
   const delay=setTimeout(()=>{unsubscribe();reject(new Error('Connexion administrateur expirée. Reconnectez-vous à votre Espace Agent.'));},8000);
   const unsubscribe=authLib.onAuthStateChanged(auth,u=>{if(u){clearTimeout(delay);unsubscribe();resolve(u);}else if(auth.currentUser===null){clearTimeout(delay);unsubscribe();resolve(null);}},e=>{clearTimeout(delay);unsubscribe();reject(e);});
  });
 }
 if(!user||!ADMIN_EMAILS.has(String(user.email||'').toLowerCase()))throw new Error('Accès PRO introuvable. Connectez-vous à vos tarifs pour ouvrir ce catalogue.');
 return user.getIdToken();
}
async function fetchSecurePdf(){
 const s=getSession();
 const body={tariffId:'neobath-anima'},headers={'Content-Type':'application/json'};
 if(s&&/^LRF-\d{5}$/i.test(String(s.codeClient||''))&&s.departement){
  body.codeClient=String(s.codeClient).toUpperCase();
  body.departement=s.departement;
 }else{
  headers.Authorization='Bearer '+await getAdminBearer();
 }
 const response=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'});
 if(!response.ok){
  let message='Le tarif ANIMA est indisponible ou votre accès PRO a expiré.';
  try{const data=await response.json();if(data?.error)message=String(data.error);}catch(_){}
  throw new Error(message);
 }
 const blob=await response.blob();
 if(blob.size<1000)throw new Error('Le document reçu est vide. Veuillez contacter votre agent.');
 const head=await blob.slice(0,5).text();
 if(!head.startsWith('%PDF-'))throw new Error('Le document sécurisé renvoyé ne correspond pas à un PDF.');
 return blob;
}
function buildIndex(){
 lists.forEach(list=>{
  list.replaceChildren();
  let group='';
  for(const s of sections){
   if(s.group!==group){group=s.group;const title=document.createElement('div');title.className='index-group';title.textContent=group;list.append(title);}
   const btn=document.createElement('button');btn.type='button';btn.className='index-item';btn.dataset.goto=String(s.page);
   const num=document.createElement('span');num.className='page-tag';num.textContent=String(s.page).padStart(2,'0');
   const title=document.createElement('span');title.className='item-title';title.textContent=s.name;
   btn.append(num,title);btn.addEventListener('click',()=>{navigate(s.page);hideIndex();});list.append(btn);
  }
 });
 for(const input of document.querySelectorAll('[data-filter]')){
  input.addEventListener('input',()=>{
   const q=normalize(input.value.trim());
   const list=input.closest('.sidebar').querySelector('[data-list]');
   for(const item of list.querySelectorAll('.index-item'))item.hidden=!!q&&!normalize(item.textContent).includes(q);
   for(const group of list.querySelectorAll('.index-group'))group.hidden=!!q;
  });
 }
}
function updateUI(){
 pageInput.value=String(page);$('total').textContent='/ '+MAX;
 $('prev').disabled=page===1;$('next').disabled=page===MAX;
 $('zoom').textContent=Math.round(zoom*100)+' %';
 const section=sectionAt(page);
 $('section-title').textContent=section?section.name:'Couverture ANIMA';
 $('caption').textContent='NEOBATH ANIMA · Page '+page+' sur '+MAX;
 for(const item of document.querySelectorAll('[data-goto]')){
  const active=!!section&&Number(item.dataset.goto)===section.page;
  item.classList.toggle('active',active);
  if(active)item.setAttribute('aria-current','location');else item.removeAttribute('aria-current');
 }
}
function navigate(next){
 page=clamp(next);updateUI();history.replaceState(null,'','#page='+page);render();
}
function hideIndex(){overlay.hidden=true;document.body.classList.remove('modal-open');}
function showIndex(){overlay.hidden=false;document.body.classList.add('modal-open');const input=overlay.querySelector('[data-filter]');input.focus();}
function scaleFor(p){
 const natural=p.getViewport({scale:1});
 // Chaque planche est conservée dans son intégralité, sans recadrage.
 const maxWidth=Math.min(1050,Math.max(250,frame.clientWidth-28));
 return Math.min(1,maxWidth/natural.width)*zoom;
}
async function fallback(){
 if(!blobUrl){setStatus('Document indisponible. Retournez dans vos tarifs PRO.',true);return;}
 mount.replaceChildren();
 const iframe=document.createElement('iframe');iframe.title='Catalogue ANIMA';iframe.src=blobUrl+'#page='+page+'&toolbar=0&navpanes=0';
 mount.append(iframe);status.hidden=true;frame.setAttribute('aria-busy','false');
}
async function render(){
 if(!pdf){if(blobUrl)await fallback();return;}
 const id=++ticket;
 if(renderTask){try{renderTask.cancel();}catch(_){ }renderTask=null;}
 setStatus('Ouverture de la page '+page+'…');frame.setAttribute('aria-busy','true');
 try{
  const p=await pdf.getPage(page);
  if(id!==ticket)return;
  const desired=p.getViewport({scale:scaleFor(p)});
  const ratio=Math.min(1.6,devicePixelRatio||1,Math.sqrt(3500000/(desired.width*desired.height)));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(desired.width*ratio));canvas.height=Math.max(1,Math.round(desired.height*ratio));
  canvas.style.width=Math.round(desired.width)+'px';canvas.style.height=Math.round(desired.height)+'px';
  const ctx=canvas.getContext('2d',{alpha:false});
  const task=p.render({canvasContext:ctx,viewport:desired,transform:ratio!==1?[ratio,0,0,ratio,0,0]:undefined});
  renderTask=task;await task.promise;
  if(id!==ticket){canvas.width=0;canvas.height=0;return;}
  mount.replaceChildren(canvas);status.hidden=true;
 }catch(e){
  if(e?.name!=='RenderingCancelledException'&&id===ticket){console.error('NEOBATH ANIMA rendu',e);await fallback();}
 }finally{if(id===ticket)frame.setAttribute('aria-busy','false');}
}
async function loadPdf(){
 setStatus('Ouverture du tarif ANIMA avec votre autorisation professionnelle…');
 try{
  sourceBlob=await fetchSecurePdf();
  blobUrl=URL.createObjectURL(sourceBlob);
  const a=$('download');a.href=blobUrl;a.download='NEOBATH_ANIMA_2026.pdf';a.removeAttribute('aria-disabled');a.hidden=false;
  if(typeof window.pdfjsLib==='undefined'){await fallback();return;}
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const data=new Uint8Array(await sourceBlob.arrayBuffer());
  pdf=await pdfjsLib.getDocument({data,disableAutoFetch:true,isEvalSupported:false}).promise;
  if(pdf.numPages!==MAX){
   $('total').textContent='/ '+pdf.numPages;
   setStatus('Attention : le tarif sécurisé ne correspond pas aux 81 pages du catalogue ANIMA transmis. Veuillez vérifier la version du document.',true);
   return;
  }
  render();
 }catch(e){
  console.error('Chargement sécurisé ANIMA',e);
  setStatus((e?.message||'Impossible de charger ce document.')+' Revenez dans votre espace Tarifs PRO et reconnectez-vous.',true);
 }
}
async function pageText(n){
 if(pagesText.has(n))return pagesText.get(n);
 const p=await pdf.getPage(n);const text=await p.getTextContent();
 const joined=text.items.map(x=>x.str||'').join(' ').replace(/\s+/g,' ').trim();
 pagesText.set(n,joined);
 return joined;
}
async function searchDocument(query){
 const q=normalize(query.trim());if(q.length<2)return;
 const run=++searchTicket;
 const results=$('results'),label=$('results-title'),list=$('results-list');
 results.hidden=false;list.replaceChildren();label.textContent='Recherche « '+query+' » en cours…';
 if(!pdf){label.textContent='Le catalogue n’est pas encore disponible.';return;}
 let count=0;
 for(let n=1;n<=pdf.numPages;n++){
  if(run!==searchTicket)return;
  try{
   const raw=await pageText(n);const norm=normalize(raw);
   const at=norm.indexOf(q);
   if(at<0)continue;
   count++;
   const button=document.createElement('button');button.type='button';button.className='result';
   const strong=document.createElement('strong');strong.textContent='Page '+n+(n>=59?' · tarifs':' · catalogue');
   const excerpt=document.createElement('span');
   excerpt.textContent=(at>60?'…':'')+raw.slice(Math.max(0,at-60),Math.min(raw.length,at+q.length+100))+(at+q.length+100<raw.length?'…':'');
   button.append(strong,excerpt);button.addEventListener('click',()=>{navigate(n);results.hidden=true;});list.append(button);
  }catch(e){console.warn('Indexation page ANIMA '+n,e);}
  if(n%10===0){label.textContent='Recherche « '+query+' » · '+n+' / '+MAX+' pages analysées';await new Promise(r=>setTimeout(r,0));}
 }
 if(run===searchTicket)label.textContent=count?'Recherche « '+query+' » · '+count+' page(s) trouvée(s)':'Aucun résultat pour « '+query+' »';
}
function bind(){
 $('open-index').addEventListener('click',showIndex);$('close-index').addEventListener('click',hideIndex);
 overlay.addEventListener('click',e=>{if(e.target===overlay)hideIndex();});
 $('prev').addEventListener('click',()=>navigate(page-1));$('next').addEventListener('click',()=>navigate(page+1));
 pageInput.addEventListener('change',()=>navigate(pageInput.value));
 $('less').addEventListener('click',()=>{zoom=Math.max(.65,Math.round((zoom-.2)*100)/100);updateUI();render();});
 $('more').addEventListener('click',()=>{zoom=Math.min(3,Math.round((zoom+.2)*100)/100);updateUI();render();});
 $('fit').addEventListener('click',()=>{zoom=1;updateUI();render();});
 $('search-form').addEventListener('submit',e=>{e.preventDefault();searchDocument($('search').value);});
 $('results-close').addEventListener('click',()=>{searchTicket++;$('results').hidden=true;});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){hideIndex();searchTicket++;$('results').hidden=true;}
  if(/INPUT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
  if(e.key==='ArrowLeft')navigate(page-1);
  if(e.key==='ArrowRight')navigate(page+1);
 });
 let x0=0,y0=0;
 frame.addEventListener('touchstart',e=>{if(e.touches.length!==1||zoom>1.05)return;x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
 frame.addEventListener('touchend',e=>{
  if(!x0||zoom>1.05||e.changedTouches.length!==1)return;
  const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=0;
  if(Math.abs(dx)>75&&Math.abs(dx)>Math.abs(dy)*1.6)navigate(page+(dx<0?1:-1));
 },{passive:true});
 let resize;
 window.addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{if(pdf&&zoom===1)render();},220);});
 window.addEventListener('pagehide',()=>{if(blobUrl)URL.revokeObjectURL(blobUrl);});
}
buildIndex();bind();
const hashMatch=location.hash.match(/page=(\d+)/);page=clamp(hashMatch?hashMatch[1]:1);updateUI();loadPdf();
})();