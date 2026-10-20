(()=>{
'use strict';
const $=id=>document.getElementById(id);
const PDF_URL='assets/pdf/RANDAL-V04.pdf?v=20261014-prix-publics';
const PHOTO_ROOT='https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/v04/';
// Noms et pages vérifiés dans le PDF V04 et dans RandalCatalogueData.models.
// Aruba rainuré est une collection distincte d’Aruba : aucune correspondance approximative.
const SECTIONS=[
 {name:'Harmony',page:3,slug:'harmony',kind:'meuble'},
 {name:'Luce',page:7,slug:'luce',kind:'meuble'},
 {name:'Brent',page:10,slug:'brent',kind:'meuble'},
 {name:'Aruba rainuré',page:15,slug:'aruba-rainure',kind:'meuble'},
 {name:'Aruba',page:17,slug:'aruba',kind:'meuble'},
 {name:'Aras',page:20,slug:'aras',kind:'meuble'},
 {name:'Boreal',page:23,slug:'boreal',kind:'meuble'},
 {name:'Brunei',page:26,slug:'brunei',kind:'meuble'},
 {name:'Amat',page:28,slug:'amat',kind:'meuble'},
 {name:'Less',page:31,slug:'less',kind:'meuble'},
 {name:'Sima',page:33,slug:'sima',kind:'meuble'},
 {name:'Miroirs',page:35,kind:'accessoire'},
 {name:'Vasques',page:37,kind:'accessoire'},
 {name:'Plans vasques',page:39,kind:'accessoire'},
 {name:'Vasques à poser',page:41,kind:'accessoire'},
 {name:'RANDAL Studio',page:42,kind:'autre',end:42}
];
const models=window.RandalCatalogueData?.models||[];
const configurable=section=>section?.kind==='meuble'&&models.some(([name,p])=>name===section.name&&p===section.page);
const sectionAt=n=>SECTIONS.find((s,i)=>n>=s.page&&n<=(s.end??(SECTIONS[i+1]?.page||44)-1))||null;
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const viewer=$('page-frame'),mount=$('page-mount'),drawer=$('index-overlay');
let page=1,maxPage=43,pdf=null,loader=null,renderTask=null,renderId=0,renderTimer=0,resizeTimer=0;
let zoom=1,panX=0,panY=0,baseWidth=0,baseHeight=0,natural=null,visibleCanvas=null,fitMode='page';
let returnFocus=null,reading=false,thumbnailObserver=null,thumbnailChain=Promise.resolve(),idleTimer=0;
const pageCache=new Map(),thumbnailCache=new Map(),pointers=new Map();
let gesture=null,pinch=null,lastTap=null;
function photoButton(section){
 const b=document.createElement('button');b.type='button';b.className='index-item';b.dataset.goto=String(section.page);
 const img=section.slug?document.createElement('img'):document.createElement('canvas');img.className='index-thumb';
 if(section.slug){img.src=PHOTO_ROOT+section.slug+'.webp';img.alt='Collection '+section.name;img.loading='lazy';img.decoding='async';img.width=200;img.height=150;}
 else{img.width=240;img.height=170;img.dataset.thumb=String(section.page);img.setAttribute('role','img');img.setAttribute('aria-label','Aperçu '+section.name);}
 const text=document.createElement('span');text.className='index-text';
 const name=document.createElement('strong');name.textContent=section.name;
 const num=document.createElement('small');num.textContent='Page '+section.page;
 text.append(name,num);b.append(img,text);
 return b;
}
function populateIndex(){
 document.querySelectorAll('[data-index-list]').forEach(list=>{
  for(const [label,items] of [['Les collections',SECTIONS.filter(s=>s.kind==='meuble')],['Miroirs, vasques & plans',SECTIONS.filter(s=>s.kind==='accessoire')],['Sur mesure',SECTIONS.filter(s=>s.kind==='autre')]]){
   const group=document.createElement('div');group.className='index-group';group.textContent=label;list.append(group);
   items.forEach(s=>list.append(photoButton(s)));
  }
  const end=document.createElement('div');end.className='index-group';end.textContent='Le catalogue';list.append(end);
  [{name:'Couverture',page:1},{name:'Sommaire',page:2},{name:'Informations RANDAL',page:43}].forEach(s=>list.append(photoButton(s)));
  const empty=document.createElement('p');empty.className='index-empty';empty.textContent='Aucune collection trouvée.';empty.hidden=true;list.append(empty);
  list.addEventListener('click',e=>{const b=e.target.closest('[data-goto]');if(!b)return;goPage(Number(b.dataset.goto));closeIndex();});
 });
 document.querySelectorAll('[data-index-search]').forEach(input=>input.addEventListener('input',()=>{
  const list=input.closest('.sidebar,.index-dialog').querySelector('[data-index-list]'),term=normalize(input.value.trim());
  let count=0;list.querySelectorAll('.index-item').forEach(b=>{b.hidden=!!term&&!normalize(b.textContent).includes(term);if(!b.hidden)count++;});
  list.querySelectorAll('.index-group').forEach(g=>g.hidden=!!term);list.querySelector('.index-empty').hidden=count>0;
 }));
 thumbnailObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting&&pdf){thumbnailObserver.unobserve(entry.target);queueThumbnail(entry.target);}
 }),{rootMargin:'60px'});
 document.querySelectorAll('canvas[data-thumb]').forEach(c=>thumbnailObserver.observe(c));
}
function getPdfPage(n){
 if(!pageCache.has(n)){
  const promise=pdf.getPage(n).catch(err=>{pageCache.delete(n);throw err;});pageCache.set(n,promise);
 }
 return pageCache.get(n);
}
function queueThumbnail(canvas){
 const n=Number(canvas.dataset.thumb);
 thumbnailChain=thumbnailChain.then(async()=>{
  if(!canvas.isConnected||!pdf)return;
  try{
   let src=thumbnailCache.get(n);
   if(!src){
    const p=await getPdfPage(n),v=p.getViewport({scale:240/p.getViewport({scale:1}).width});
    src=document.createElement('canvas');src.width=Math.ceil(v.width);src.height=Math.ceil(v.height);
    await p.render({canvasContext:src.getContext('2d',{alpha:false}),viewport:v}).promise;
    thumbnailCache.set(n,src);
   }
   const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   const ratio=Math.min(canvas.width/src.width,canvas.height/src.height);
   ctx.drawImage(src,(canvas.width-src.width*ratio)/2,(canvas.height-src.height*ratio)/2,src.width*ratio,src.height*ratio);
   // Les miniatures restent petites ; les opérateurs PDF hors voisinage sont libérés.
   trimPages();
  }catch(_err){/* Le lien et son intitulé restent disponibles sans miniature. */}
 });
}
function refreshThumbnails(){
 document.querySelectorAll('canvas[data-thumb]').forEach(c=>{thumbnailObserver.unobserve(c);thumbnailObserver.observe(c);});
}
function trimPages(){
 for(const [n,promise] of pageCache){
  if(Math.abs(n-page)>1){pageCache.delete(n);promise.then(p=>p.cleanup()).catch(()=>{});}
 }
}
function prefetchNeighbours(){
 clearTimeout(idleTimer);idleTimer=setTimeout(()=>{
  if(!pdf)return;
  [page-1,page+1].filter(n=>n>=1&&n<=maxPage).forEach(n=>getPdfPage(n).catch(()=>{}));
  trimPages();
 },400);
}
function updateNavigation(){
 const section=sectionAt(page),name=section?.name||(page===1?'Couverture':page===2?'Sommaire':'Informations RANDAL');
 $('page-input').value=String(page);$('page-input').max=String(maxPage);$('page-counter').textContent='/ '+maxPage;
 $('prev-page').disabled=page<=1;$('next-page').disabled=page>=maxPage;
 $('section-name').textContent=name;$('page-caption').textContent='Page '+page+' / '+maxPage;
 $('section-category').textContent=section?.kind==='meuble'?'Collection RANDAL':section?.kind==='accessoire'?'Les compléments':'RANDAL 2026 · V04';
 const before=[...SECTIONS].reverse().find(s=>s.page<(section?.page||page));
 const after=SECTIONS.find(s=>s.page>(section?.page||page));
 $('prev-collection').disabled=!before;$('next-collection').disabled=!after;
 $('prev-collection').dataset.page=String(before?.page||1);$('next-collection').dataset.page=String(after?.page||maxPage);
 document.querySelectorAll('[data-goto]').forEach(b=>{
  const active=Number(b.dataset.goto)===(section?.page||page);b.classList.toggle('active',active);
  if(active)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');
 });
 const canConfigure=configurable(section),link=$('configure-link');link.hidden=!canConfigure;
 if(canConfigure){link.href='randal-configurateur.html?collection='+encodeURIComponent(section.name);link.setAttribute('aria-label','Configurer cette collection : '+section.name);}
 else{link.removeAttribute('href');link.removeAttribute('aria-label');}
 $('configuration-unavailable').hidden=!section||canConfigure;
 viewer.dataset.page=String(page);
}
function updateZoom(){
 $('zoom-percent').value=Math.round(zoom*100)+' %';$('zoom-out').disabled=zoom<=1;$('zoom-in').disabled=zoom>=5;
 viewer.dataset.zoom=String(zoom);
}
function measure(){
 if(!natural)return;
 const space=reading?12:24,availableW=Math.max(100,viewer.clientWidth-space),availableH=Math.max(100,viewer.clientHeight-space-(!reading?20:0));
 const factor=fitMode==='width'?availableW/natural.width:fitMode==='height'?availableH/natural.height:Math.min(availableW/natural.width,availableH/natural.height);
 baseWidth=natural.width*factor;baseHeight=natural.height*factor;
 if(visibleCanvas){visibleCanvas.style.width=baseWidth+'px';visibleCanvas.style.height=baseHeight+'px';}
 applyTransform();
}
function applyTransform(){
 const maxX=Math.max(0,(baseWidth*zoom-viewer.clientWidth)/2+12),maxY=Math.max(0,(baseHeight*zoom-viewer.clientHeight)/2+12);
 panX=clamp(panX,-maxX,maxX);panY=clamp(panY,-maxY,maxY);
 mount.style.width=baseWidth+'px';mount.style.height=baseHeight+'px';
 mount.style.transform='translate('+(panX-baseWidth*zoom/2)+'px,'+(panY-baseHeight*zoom/2)+'px) scale('+zoom+')';
}
function changeZoom(value,x=0,y=0){
 const next=clamp(value,1,5),ratio=next/zoom;panX=x-(x-panX)*ratio;panY=y-(y-panY)*ratio;zoom=next;
 applyTransform();updateZoom();scheduleRender();
}
function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>render(),180);}
function status(message){$('viewer-status').textContent=message;$('viewer-status').hidden=!message;}
async function render(){
 if(!pdf)return;
 const ticket=++renderId,currentPage=page;
 if(renderTask){renderTask.cancel();renderTask=null;}
 viewer.setAttribute('aria-busy','true');$('viewer-error').hidden=true;
 status('Affichage de la page '+currentPage+'…');
 let canvas=null;
 try{
  const p=await getPdfPage(currentPage);if(ticket!==renderId)return;
  natural=p.getViewport({scale:1});measure();
  const renderZoom=zoom,cssWidth=baseWidth,cssHeight=baseHeight;
  // Une seule page HD affichée. Maximum 4 Mpx (16 Mo) par canvas, même au zoom.
  const ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(4000000/(cssWidth*cssHeight*renderZoom*renderZoom)));
  const scale=(cssWidth/natural.width)*renderZoom*ratio,viewport=p.getViewport({scale});
  canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  canvas.style.width=cssWidth+'px';canvas.style.height=cssHeight+'px';
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Page '+currentPage+' du catalogue officiel RANDAL V04');canvas.dataset.page=String(currentPage);
  const task=p.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport});renderTask=task;
  await task.promise;
  if(ticket!==renderId){canvas.width=0;canvas.height=0;return;}
  const previous=visibleCanvas;visibleCanvas=canvas;mount.replaceChildren(canvas);
  if(previous){previous.width=0;previous.height=0;}
  viewer.dataset.renderedPage=String(currentPage);status('');prefetchNeighbours();
 }catch(err){
  if(canvas){canvas.width=0;canvas.height=0;}
  if(ticket!==renderId||err?.name==='RenderingCancelledException')return;
  status('');$('viewer-error').hidden=false;console.warn('Affichage RANDAL indisponible',err);
 }finally{if(ticket===renderId){renderTask=null;viewer.setAttribute('aria-busy','false');}}
}
function goPage(n,writeUrl=true){
 const next=clamp(Math.round(Number(n)||1),1,maxPage);page=next;zoom=1;panX=0;panY=0;lastTap=null;
 clearTimeout(renderTimer);updateNavigation();updateZoom();applyTransform();
 if(writeUrl)history.replaceState(null,'','#page='+page);
 render();
}
function openIndex(){
 if(!drawer.hidden)return;
 returnFocus=document.activeElement;drawer.hidden=false;document.querySelector('.masthead').inert=true;document.querySelector('.catalogue-app').inert=true;$('open-index').setAttribute('aria-expanded','true');
 const search=drawer.querySelector('input');search.focus({preventScroll:true});refreshThumbnails();
 const active=drawer.querySelector('.active');if(active)active.scrollIntoView({block:'nearest'});
}
function closeIndex(){
 if(drawer.hidden)return;drawer.hidden=true;document.querySelector('.masthead').inert=false;document.querySelector('.catalogue-app').inert=false;$('open-index').setAttribute('aria-expanded','false');
 if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
}
function setReading(value){
 reading=value;document.body.classList.toggle('reading-mode',reading);$('show-controls').hidden=!reading;
 $('reading-mode').setAttribute('aria-pressed',String(reading));
 requestAnimationFrame(()=>{measure();scheduleRender();(reading?$('show-controls'):$('reading-mode')).focus({preventScroll:true});});
}
function localPoint(e){const r=viewer.getBoundingClientRect();return {x:e.clientX-r.left-r.width/2,y:e.clientY-r.top-r.height/2};}
function beginPinch(){
 const [a,b]=[...pointers.values()];pinch={distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),zoom,x:(a.x+b.x)/2,y:(a.y+b.y)/2,panX,panY};
 if(gesture)gesture.multi=true;lastTap=null;
}
function attachGestures(){
 viewer.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.pointerType==='mouse')return;
  e.preventDefault();viewer.setPointerCapture(e.pointerId);const point=localPoint(e);pointers.set(e.pointerId,point);
  if(pointers.size===1){gesture={start:point,last:point,time:performance.now(),moved:false,multi:false};viewer.classList.add('is-dragging');}
  if(pointers.size===2)beginPinch();
 });
 viewer.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;e.preventDefault();const point=localPoint(e);pointers.set(e.pointerId,point);
  if(pointers.size===2&&pinch){
   const [a,b]=[...pointers.values()],value=clamp(pinch.zoom*Math.hypot(b.x-a.x,b.y-a.y)/pinch.distance,1,5),ratio=value/pinch.zoom;
   panX=(a.x+b.x)/2-(pinch.x-pinch.panX)*ratio;panY=(a.y+b.y)/2-(pinch.y-pinch.panY)*ratio;zoom=value;applyTransform();updateZoom();
  }else if(pointers.size===1&&gesture){
   const dx=point.x-gesture.last.x,dy=point.y-gesture.last.y;
   if(Math.hypot(point.x-gesture.start.x,point.y-gesture.start.y)>8)gesture.moved=true;
   panX+=dx;panY+=dy;applyTransform();gesture.last=point;
  }
 });
 function finish(e,cancelled=false){
  if(!pointers.has(e.pointerId))return;
  const point=localPoint(e),g=gesture;pointers.delete(e.pointerId);
  if(pointers.size){pinch=null;if(g){g.multi=true;g.last=[...pointers.values()][0];}scheduleRender();return;}
  viewer.classList.remove('is-dragging');pinch=null;gesture=null;
  if(cancelled||!g){scheduleRender();return;}
  const elapsed=performance.now()-g.time,dx=point.x-g.start.x,dy=point.y-g.start.y;
  if(!g.multi&&zoom===1&&fitMode==='page'&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5&&elapsed<850){goPage(page+(dx<0?1:-1));return;}
  if(!g.multi&&!g.moved&&elapsed<300){
   const now=performance.now();
   if(lastTap&&now-lastTap.time<330&&Math.hypot(point.x-lastTap.x,point.y-lastTap.y)<35){changeZoom(zoom>1?1:2.4,point.x,point.y);lastTap=null;}
   else lastTap={time:now,...point};
  }
  scheduleRender();
 }
 viewer.addEventListener('pointerup',e=>finish(e));viewer.addEventListener('pointercancel',e=>finish(e,true));
 viewer.addEventListener('wheel',e=>{
  if(e.ctrlKey||e.metaKey){e.preventDefault();const p=localPoint(e);changeZoom(zoom*Math.exp(-e.deltaY*.01),p.x,p.y);}
  else if(zoom>1||fitMode!=='page'){e.preventDefault();panX-=e.deltaX;panY-=e.deltaY;applyTransform();}
 },{passive:false});
}
function attachEvents(){
 $('open-index').onclick=openIndex;$('return-index').onclick=openIndex;$('close-index').onclick=closeIndex;
 drawer.addEventListener('click',e=>{if(e.target===drawer)closeIndex();});
 $('prev-page').onclick=()=>goPage(page-1);$('next-page').onclick=()=>goPage(page+1);
 $('prev-collection').onclick=e=>goPage(e.currentTarget.dataset.page);$('next-collection').onclick=e=>goPage(e.currentTarget.dataset.page);
 $('zoom-in').onclick=()=>changeZoom(zoom+.5);$('zoom-out').onclick=()=>changeZoom(zoom-.5);
 $('fit-mode').onchange=e=>{fitMode=e.target.value;zoom=1;panX=0;panY=0;measure();updateZoom();render();};
 $('page-input').onchange=e=>goPage(e.target.value);$('page-input').onkeydown=e=>{if(e.key==='Enter'){goPage(e.target.value);e.target.blur();}};
 $('reading-mode').onclick=()=>setReading(true);$('show-controls').onclick=()=>setReading(false);
 $('fullscreen').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else setReading(!reading);}
  catch(_err){setReading(!reading);}
 };
 $('retry-pdf').onclick=()=>pdf?render():loadDocument();
 window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(!drawer.hidden)closeIndex();else if(reading)setReading(false);return;}
  if(!drawer.hidden){
   if(e.key==='Tab'){
    const items=[...drawer.querySelectorAll('button,input,a[href]')].filter(el=>el.getClientRects().length),first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
   return;
  }
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;
  if(e.key==='ArrowLeft'){e.preventDefault();goPage(page-1);}
  if(e.key==='ArrowRight'){e.preventDefault();goPage(page+1);}
  if(e.key==='Home'){e.preventDefault();goPage(1);}
  if(e.key==='End'){e.preventDefault();goPage(maxPage);}
  if(e.key==='+'||e.key==='=')changeZoom(zoom+.5);if(e.key==='-')changeZoom(zoom-.5);
 });
 const observer=new ResizeObserver(()=>{measure();clearTimeout(resizeTimer);resizeTimer=setTimeout(scheduleRender,120);});observer.observe(viewer);
 window.addEventListener('hashchange',()=>{const n=new URLSearchParams(location.hash.slice(1)).get('page');if(n)goPage(n,false);});
 window.addEventListener('pagehide',()=>{
  clearTimeout(renderTimer);clearTimeout(idleTimer);++renderId;if(renderTask)renderTask.cancel();
  if(visibleCanvas){visibleCanvas.width=0;visibleCanvas.height=0;visibleCanvas=null;}
  if(pdf)pdf.cleanup().catch(()=>{});
 });
 window.addEventListener('pageshow',e=>{if(e.persisted)render();});
 attachGestures();
}
async function loadDocument(){
 if(loader)return;
 $('viewer-error').hidden=true;viewer.setAttribute('aria-busy','true');status('Ouverture du catalogue RANDAL…');
 try{
  if(!window.pdfjsLib)throw new Error('Visionneuse PDF indisponible');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  // Lecture par plages HTTP : ne pas télécharger le PDF complet à chaque ouverture.
  loader=pdfjsLib.getDocument({url:PDF_URL,rangeChunkSize:131072,disableAutoFetch:true,disableStream:true});
  pdf=await loader.promise;maxPage=pdf.numPages;page=clamp(page,1,maxPage);updateNavigation();
  await render();refreshThumbnails();
 }catch(err){status('');$('viewer-error').hidden=false;viewer.setAttribute('aria-busy','false');console.warn('Catalogue RANDAL indisponible',err);}
 finally{loader=null;}
}
function start(){
 const query=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.slice(1));
 const collection=SECTIONS.find(s=>s.name===query.get('collection'));
 page=clamp(Math.round(Number(hash.get('page')||query.get('page')||collection?.page)||1),1,maxPage);
 populateIndex();attachEvents();updateNavigation();updateZoom();loadDocument();
}
start();
})();
