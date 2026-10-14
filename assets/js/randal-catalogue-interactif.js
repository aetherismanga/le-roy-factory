(()=>{
'use strict';
const PDF_URL='assets/pdf/RANDAL-V04.pdf';
const SECTIONS=[
 {name:'Harmony',page:3,kind:'meuble'},{name:'Luce',page:7,kind:'meuble'},
 {name:'Brent',page:10,kind:'meuble'},{name:'Aruba rainuré',page:15,kind:'meuble'},
 {name:'Aruba',page:17,kind:'meuble'},{name:'Aras',page:20,kind:'meuble'},
 {name:'Boreal',page:23,kind:'meuble'},{name:'Brunei',page:26,kind:'meuble'},
 {name:'Amat',page:28,kind:'meuble'},{name:'Less',page:31,kind:'meuble'},
 {name:'Sima',page:33,kind:'meuble'},{name:'Miroirs',page:35,kind:'accessoire'},
 {name:'Vasques',page:37,kind:'accessoire'},{name:'Plans vasques',page:39,kind:'accessoire'},
 {name:'Vasques à poser',page:41,kind:'accessoire'},{name:'RANDAL Studio',page:42,kind:'autre'}
];
const $=id=>document.getElementById(id);
const maxPage=43;
let page=1,zoom=1,pdf=null,renderTask=null,requestId=0,resizeTimer=0;let thumbStarted=false;
const pageInput=$('page-input'),status=$('viewer-status'),pageMount=$('page-mount');
const viewer=$('page-frame'),drawer=$('index-overlay'),configLink=$('configure-link');
const clamp=n=>Math.max(1,Math.min(maxPage,Math.round(n)));
const currSection=n=>[...SECTIONS].reverse().find(s=>n>=s.page)||null;
const allNav=[...document.querySelectorAll('[data-index-list]')];

function navButton(s){
 const b=document.createElement('button');b.type='button';b.className='index-item';b.dataset.goto=String(s.page);
 const img=document.createElement('canvas');img.className='index-thumb';img.width=136;img.height=104;img.dataset.thumb=String(s.page);img.setAttribute('aria-label','Aperçu '+s.name);
 const wrap=document.createElement('span');wrap.className='index-text';
 const name=document.createElement('strong');name.textContent=s.name;
 const num=document.createElement('small');num.textContent='Page '+s.page;
 wrap.append(name,num);b.append(img,wrap);return b;
}
async function loadThumbnails(){
 if(thumbStarted||!pdf)return;thumbStarted=true;
 const thumbs=[...document.querySelectorAll('canvas[data-thumb]')];
 for(const section of SECTIONS){
  const canvases=thumbs.filter(c=>Number(c.dataset.thumb)===section.page);
  if(!canvases.length)continue;
  try{
   const p=await pdf.getPage(section.page);
   const base=p.getViewport({scale:1});
   const viewport=p.getViewport({scale:Math.min(160/base.width,110/base.height)});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   const ctx=canvas.getContext('2d',{alpha:false});await p.render({canvasContext:ctx,viewport}).promise;
   canvases.forEach(c=>{const context=c.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,c.width,c.height);context.drawImage(canvas,(c.width-canvas.width)/2,(c.height-canvas.height)/2)});
  }catch(e){console.warn('Miniature RANDAL',section.name,e);}
 }
}
function fallback(){pageMount.replaceChildren();const frame=document.createElement('iframe');frame.className='pdf-fallback';frame.title='Catalogue RANDAL V04';frame.loading='eager';frame.src=PDF_URL+'#page='+page+'&toolbar=0&navpanes=0';pageMount.append(frame);status.hidden=true;viewer.setAttribute('aria-busy','false');}

function populateIndex(){
 allNav.forEach(list=>{
  list.replaceChildren();
  const meubles=document.createElement('div');meubles.className='index-group';meubles.textContent='Meubles montés';
  list.append(meubles);
  SECTIONS.forEach((s,i)=>{
   if(i===11){const t=document.createElement('div');t.className='index-group';t.textContent='Miroirs, vasques et plans';list.append(t);}
   if(i===15){const t=document.createElement('div');t.className='index-group';t.textContent='Sur mesure';list.append(t);}
   list.append(navButton(s));
  });
  list.addEventListener('click',e=>{
   const b=e.target.closest('[data-goto]');
   if(!b)return;
   goPage(Number(b.dataset.goto));closeIndex();
  });
 });
 document.querySelectorAll('[data-index-search]').forEach(input=>input.addEventListener('input',()=>{
  const list=input.closest('.index-pane').querySelector('[data-index-list]');
  const term=input.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  list.querySelectorAll('.index-item').forEach(b=>{
   const text=b.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   b.hidden=term!==''&&!text.includes(term);
  });
  list.querySelectorAll('.index-group').forEach(b=>b.hidden=term!=='');
 }));
}
function updateNavigation(){
 pageInput.value=String(page);
 $('page-counter').textContent='/ '+maxPage;
 $('prev-page').disabled=page<=1;
 $('next-page').disabled=page>=maxPage;
 $('zoom-percent').textContent=Math.round(zoom*100)+' %';
 const section=currSection(page);
 $('section-name').textContent=section?section.name:(page===2?'Sommaire':'Couverture');
 $('page-caption').textContent='Catalogue RANDAL V04 · Page '+page+' / '+maxPage;
 document.querySelectorAll('[data-goto]').forEach(b=>{
  const active=section&&Number(b.dataset.goto)===section.page;
  b.classList.toggle('active',Boolean(active));
  if(active)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');
 });
 configLink.href='randal-configurateur.html'+(section&&section.kind==='meuble'?'?collection='+encodeURIComponent(section.name):'');
 configLink.textContent=section&&section.kind==='meuble'?'Configurer '+section.name+' ↗':'Ouvrir le configurateur ↗';
}
function goPage(n,updateUrl=true){
 page=clamp(Number(n)||1);updateNavigation();
 if(updateUrl)history.replaceState(null,'','#page='+page);
 render();
}
function showMessage(message,isError){
 status.textContent=message;
 status.classList.toggle('error',Boolean(isError));
 status.hidden=false;
}
async function render(){
 if(!pdf){fallback();return;}
 const ticket=++requestId;
 if(renderTask){try{renderTask.cancel();}catch(_e){}renderTask=null;}
 showMessage('Affichage de la page '+page+'…',false);
 viewer.setAttribute('aria-busy','true');
 try{
  const p=await pdf.getPage(page);
  if(ticket!==requestId)return;
  const natural=p.getViewport({scale:1});
  const frameWidth=Math.max(255,viewer.clientWidth-22);
  const fitWidth=Math.min(frameWidth,840);
  const fitted=fitWidth/natural.width;
  const viewport=p.getViewport({scale:fitted*zoom});
  const ratio=Math.min(2,window.devicePixelRatio||1);
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(viewport.width*ratio);
  canvas.height=Math.ceil(viewport.height*ratio);
  canvas.style.width=Math.ceil(viewport.width)+'px';
  canvas.style.height=Math.ceil(viewport.height)+'px';
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Page '+page+' du catalogue RANDAL');
  const ctx=canvas.getContext('2d',{alpha:false});
  const task=p.render({canvasContext:ctx,viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});
  renderTask=task;
  await task.promise;
  if(ticket!==requestId)return;
  pageMount.replaceChildren(canvas);
  viewer.scrollTop=0;viewer.scrollLeft=0;
  status.hidden=true;
 }catch(err){
  if(ticket!==requestId||err&&err.name==='RenderingCancelledException')return;
  showMessage('Impossible d’afficher cette page. Utilisez le PDF original.',true);
  console.error('RANDAL PDF:',err);
 }finally{
  if(ticket===requestId){renderTask=null;viewer.setAttribute('aria-busy','false');}
 }
}
function openIndex(){
 drawer.hidden=false;document.body.classList.add('index-open');
 $('close-index').focus();
}
function closeIndex(){drawer.hidden=true;document.body.classList.remove('index-open');}
function changeZoom(amount){zoom=Math.max(.75,Math.min(2.5,Math.round((zoom+amount)*100)/100));updateNavigation();render();}
function attachEvents(){
 $('open-index').addEventListener('click',openIndex);
 $('close-index').addEventListener('click',closeIndex);
 drawer.addEventListener('click',e=>{if(e.target===drawer)closeIndex();});
 $('prev-page').addEventListener('click',()=>goPage(page-1));
 $('next-page').addEventListener('click',()=>goPage(page+1));
 $('zoom-in').addEventListener('click',()=>changeZoom(.25));
 $('zoom-out').addEventListener('click',()=>changeZoom(-.25));
 $('fit-page').addEventListener('click',()=>{zoom=1;updateNavigation();render();});
 pageInput.addEventListener('change',()=>goPage(pageInput.value));
 pageInput.addEventListener('keydown',e=>{if(e.key==='Enter'){goPage(pageInput.value);pageInput.blur();}});
 window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeIndex();return;}
  if(!drawer.hidden||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))return;
  if(e.key==='ArrowLeft')goPage(page-1);
  if(e.key==='ArrowRight')goPage(page+1);
 });
 let x=0,y=0;
 viewer.addEventListener('touchstart',e=>{if(e.touches.length===1){x=e.touches[0].clientX;y=e.touches[0].clientY;}},{passive:true});
 viewer.addEventListener('touchend',e=>{
  if(zoom!==1||!x||!e.changedTouches.length)return;
  const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;
  x=0;
  if(Math.abs(dx)>90&&Math.abs(dx)>Math.abs(dy)*1.7)goPage(page+(dx<0?1:-1));
 },{passive:true});
 window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,180);},{passive:true});
 window.addEventListener('hashchange',()=>{const value=new URLSearchParams(location.hash.slice(1)).get('page');if(value)goPage(value,false);});
}
async function start(){
 populateIndex();attachEvents();
 const q=new URLSearchParams(location.search);
 const h=new URLSearchParams(location.hash.slice(1));
 const desired=Number(h.get('page')||q.get('page'));
 page=Number.isFinite(desired)&&desired>=1?clamp(desired):1;
 updateNavigation();
 $('pdf-original').href=PDF_URL;
 $('pdf-error-link').href=PDF_URL;
 showMessage('Ouverture du catalogue RANDAL…',false);
 if(!window.pdfjsLib){fallback();return;}
 try{
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const loader=pdfjsLib.getDocument({url:PDF_URL,rangeChunkSize:65536,disableAutoFetch:true});
  pdf=await loader.promise;
  if(pdf.numPages!==maxPage)console.warn('RANDAL : nombre de pages différent du catalogue V04 attendu',pdf.numPages);
  await render();
  loadThumbnails();
 }catch(err){
  fallback();
  console.error('RANDAL PDF:',err);
 }
}
start();
})();