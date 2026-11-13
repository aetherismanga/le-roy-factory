/* LRF exterior catalogue: HD visual index, PDF links and page navigation. */
import {loadPdfRuntime,openPdfDocument} from './randal-catalogue/pdf-runtime.mjs';

const RELEASE='20261113-navigation2';
const PDF_URL=new URL('../pdf/selection-lrf-exterieur-r11.pdf?v='+RELEASE,import.meta.url).href;
const INDEX_URL=new URL('../data/r11-pdf-index.json?v='+RELEASE,import.meta.url).href;
const $=id=>document.getElementById(id);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brandLabel=value=>value==='View'?'VIEW':value;
let pdf=null,indexData=null,pageNumber=1,zoom=1,renderTask=null,revision=0,loadRevision=0,resizeTimer;
let pointerStart=null,suppressClickUntil=0,wheelTotal=0,lastWheel=0,wheelLock=0;
const destinations=[];
const pageFromHash=()=>Number(new URLSearchParams(location.hash.slice(1)).get('page'))||1;
function message(text,retry=false){$('pdf-message').textContent=text;$('pdf-status').hidden=!text;$('pdf-retry').hidden=!retry;}
function currentCollection(){return indexData?.collections.find(col=>col.page<=pageNumber&&col.endPage>=pageNumber);}
function fillCollections(brand='',selected=''){
  const select=$('pdf-outline');
  select.innerHTML='<option value="">Choisir une collection</option>';
  for(const col of indexData.collections.filter(col=>!brand||col.brand===brand)){
    const option=document.createElement('option');
    option.value=col.id;option.textContent=(!brand?brandLabel(col.brand)+' · ':'')+col.name+(col.has20mm?' · 20 mm':'');
    select.append(option);
  }
  select.value=selected;
}
function controls(){
  const loaded=Boolean(pdf);
  for(const id of ['pdf-page','pdf-fit','pdf-plus','pdf-minus','pdf-outline'])$(id).disabled=!loaded;
  $('pdf-brand').disabled=!loaded||!indexData;$('pdf-index-open').disabled=!loaded||!indexData;
  $('pdf-prev').disabled=!loaded||pageNumber<=1;$('pdf-next').disabled=!loaded||pageNumber>=pdf.numPages;
  $('pdf-minus').disabled=!loaded||zoom<=1;$('pdf-plus').disabled=!loaded||zoom>=4;
  $('pdf-page').value=pageNumber;$('pdf-page').max=pdf?.numPages||1;$('pdf-total').textContent='/ '+(pdf?.numPages||'…');
  $('pdf-surface').classList.toggle('is-zoomed',zoom>1);
  const col=currentCollection();
  if(indexData){
    const factory=indexData.brands.find((b,i)=>pageNumber>=b.page&&pageNumber<(indexData.brands[i+1]?.page||indexData.collections[0].page));
    const brand=col?.brand||factory?.name||'';
    if($('pdf-brand').value!==brand)$('pdf-brand').value=brand;
    fillCollections(brand,col?.id||'');
    $('pdf-current').textContent=col?brandLabel(col.brand)+' / '+col.name:factory?'Sommaire / '+brandLabel(factory.name):pageNumber===1?'Le catalogue de vos extérieurs':'Sommaire des usines';
  }
  $('pdf-thickness').hidden=!col?.has20mm;
}
async function destinationPage(destination){
  const resolved=typeof destination==='string'?await pdf.getDestination(destination):destination;
  if(!Array.isArray(resolved)||!resolved.length)return null;
  const first=resolved[0];
  return typeof first==='number'?first+1:(await pdf.getPageIndex(first))+1;
}
async function goDestination(destination){
  try{const page=await destinationPage(destination);if(page)navigate(page);}catch{message('Ce lien de page est momentanément indisponible. Utilisez le sommaire.',true);}
}
function safeLink(value){
  try{const url=new URL(value,location.href);return /^(https?:)$/.test(url.protocol)?url:null;}catch{return null;}
}
async function render(){
  if(!pdf)return;
  const ticket=++revision;renderTask?.cancel();$('pdf-surface').setAttribute('aria-busy','true');
  message('Affichage de la page '+pageNumber+'…');controls();
  try{
    const page=await pdf.getPage(pageNumber);if(ticket!==revision)return;
    const natural=page.getViewport({scale:1}),stage=$('pdf-stage');
    const gutter=matchMedia('(max-width:700px)').matches?12:24;
    const fit=Math.max(.1,Math.min((stage.clientWidth-gutter)/natural.width,(stage.clientHeight-gutter)/natural.height));
    const viewport=page.getViewport({scale:fit*zoom});
    const ratio=Math.min(devicePixelRatio||1,2.5,Math.sqrt(8000000/(viewport.width*viewport.height)));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(viewport.width*ratio));canvas.height=Math.max(1,Math.ceil(viewport.height*ratio));
    canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';canvas.setAttribute('aria-label','Page '+pageNumber+' sur '+pdf.numPages);
    renderTask=page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport,transform:[ratio,0,0,ratio,0,0],background:'#fff'});
    await renderTask.promise;if(ticket!==revision){canvas.width=canvas.height=0;return;}
    const links=document.createElement('div');links.className='pdf-links';
    for(const annotation of await page.getAnnotations({intent:'display'})){
      if(annotation.subtype!=='Link'||!Array.isArray(annotation.rect))continue;
      const link=document.createElement('a'),rectangle=viewport.convertToViewportRectangle(annotation.rect);
      const left=Math.min(rectangle[0],rectangle[2]),top=Math.min(rectangle[1],rectangle[3]);
      Object.assign(link.style,{left:left+'px',top:top+'px',width:Math.abs(rectangle[2]-rectangle[0])+'px',height:Math.abs(rectangle[3]-rectangle[1])+'px'});
      if(annotation.dest){link.href='#page='+pageNumber;link.setAttribute('aria-label','Accéder à la page du sommaire');link.addEventListener('click',event=>{event.preventDefault();goDestination(annotation.dest);});}
      else{
        const target=safeLink(annotation.url);if(!target)continue;link.href=target.href;link.setAttribute('aria-label',target.origin===location.origin?'Ouvrir la référence dans la sélection LRF':'Consulter le document du fabricant');
        if(target.origin!==location.origin){link.target='_blank';link.rel='noopener';}
      }
      links.append(link);
    }
    if(ticket!==revision)return;
    const surface=$('pdf-surface'),old=surface.querySelector('canvas');surface.replaceChildren(canvas,links);surface.style.width=viewport.width+'px';surface.style.height=viewport.height+'px';
    if(old)old.width=old.height=0;
    surface.setAttribute('aria-busy','false');message('');stage.scrollTop=0;stage.scrollLeft=Math.max(0,(viewport.width-stage.clientWidth)/2);
    $('pdf-announcement').textContent='Page '+pageNumber+' sur '+pdf.numPages+(currentCollection()?' · '+currentCollection().name:'');
    page.cleanup();
  }catch(error){if(error?.name==='RenderingCancelledException'||ticket!==revision)return;$('pdf-surface').setAttribute('aria-busy','false');message('La page ne peut pas être affichée. Vérifiez votre connexion puis réessayez.',true);}
}
function navigate(value){
  if(!pdf)return;
  const next=clamp(Math.round(Number(value)||1),1,pdf.numPages);
  if(next===pageNumber){controls();return;}
  pageNumber=next;history.replaceState(history.state,'','#page='+pageNumber);render();
}
async function loadIndex(){
  try{
    const response=await fetch(INDEX_URL);if(!response.ok)return null;
    const data=await response.json();
    if(data.version!==1||!Array.isArray(data.collections)||!Array.isArray(data.brands))return null;
    if(!data.collections.every(col=>Number.isInteger(col.page)&&Number.isInteger(col.endPage)&&col.endPage>=col.page&&/^assets\/img\//.test(col.image)))return null;
    return data;
  }catch{return null;}
}
async function fallbackOutline(){
  const items=await pdf.getOutline();if(!items?.length)return;
  const select=$('pdf-outline');select.innerHTML='<option value="">Sommaire des collections</option>';
  function append(nodes,depth=0){for(const item of nodes){if(item.dest){const option=document.createElement('option');option.value=String(destinations.push(item.dest)-1);option.textContent=(depth?'  ':'')+item.title;select.append(option);}if(item.items?.length)append(item.items,depth+1);}}
  append(items);
}
function indexView(brand=''){
  $('pdf-index-description').textContent=brand?brandLabel(brand)+' · Choisissez une collection pour ouvrir ses pages.':'Choisissez une usine, puis votre collection.';
  $('pdf-index-nav').innerHTML=[{name:'',label:'Toutes les usines'},...indexData.brands.map(b=>({name:b.name,label:brandLabel(b.name)}))].map(b=>'<button type="button" data-brand="'+escape(b.name)+'" aria-pressed="'+(b.name===brand)+'">'+escape(b.label)+'</button>').join('');
  const items=brand?indexData.collections.filter(col=>col.brand===brand):indexData.brands;
  $('pdf-index-grid').innerHTML=items.map(item=>{
    const collection=Boolean(item.id),label=collection?item.name:brandLabel(item.name);
    return '<button type="button" class="pdf-index-card'+(collection?'':' is-factory')+'" '+(collection?'data-collection="'+escape(item.id)+'"':'data-brand="'+escape(item.name)+'"')+' aria-label="'+escape(collection?'Ouvrir '+label+', page '+item.page:'Choisir '+label)+'"><span class="pdf-index-photo"><img src="'+escape(item.image)+'" alt="Ambiance '+escape(label)+'" loading="lazy" decoding="async">'+(item.has20mm?'<span class="pdf-badge">20 mm</span>':'')+'</span><span class="pdf-index-copy"><strong>'+escape(label)+'</strong><small>'+escape(collection?(item.category?item.category+' · ':'')+'Page '+item.page:item.collections+' collections · Découvrir →')+'</small></span></button>';
  }).join('');
  $('pdf-index').scrollTop=0;
}
async function open(){
  const ticket=++loadRevision;++revision;renderTask?.cancel();message('Ouverture du catalogue…');$('pdf-retry').disabled=true;
  try{
    if(pdf){await pdf.destroy();pdf=null;}controls();
    const [next,index]=await Promise.all([loadPdfRuntime().then(runtime=>openPdfDocument(runtime,PDF_URL)),loadIndex()]);
    if(ticket!==loadRevision){await next.destroy();return;}
    pdf=next;indexData=index?.pageCount===pdf.numPages?index:null;pageNumber=clamp(Math.round(pageFromHash()),1,pdf.numPages);zoom=1;destinations.length=0;
    $('pdf-brand').innerHTML='<option value="">Toutes les usines</option>';
    if(indexData)for(const brand of indexData.brands){const option=document.createElement('option');option.value=brand.name;option.textContent=brandLabel(brand.name);$('pdf-brand').append(option);}
    controls();await render();if(!indexData)fallbackOutline().catch(()=>{});
  }catch{if(ticket===loadRevision)message('Le catalogue est momentanément indisponible. Vérifiez votre connexion puis réessayez.',true);}
  finally{$('pdf-retry').disabled=false;}
}
$('pdf-prev').addEventListener('click',()=>navigate(pageNumber-1));$('pdf-next').addEventListener('click',()=>navigate(pageNumber+1));
$('pdf-page').addEventListener('change',event=>navigate(event.target.value));
$('pdf-brand').addEventListener('change',event=>{
  const brand=event.target.value;fillCollections(brand);
  navigate(indexData.brands.find(b=>b.name===brand)?.page||indexData.tocPage);
});
$('pdf-outline').addEventListener('change',event=>{
  if(!event.target.value)return;
  if(indexData)navigate(indexData.collections.find(col=>col.id===event.target.value)?.page);
  else goDestination(destinations[Number(event.target.value)]);
});
$('pdf-index-open').addEventListener('click',()=>{indexView('');$('pdf-index').showModal();});
$('pdf-index-close').addEventListener('click',()=>$('pdf-index').close());
$('pdf-index').addEventListener('click',event=>{
  const button=event.target.closest('button[data-brand],button[data-collection]');
  if(button){
    if(button.hasAttribute('data-brand')){indexView(button.dataset.brand);$('pdf-index-nav').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});}
    else{const col=indexData.collections.find(col=>col.id===button.dataset.collection);$('pdf-index').close();if(col)navigate(col.page);}
  }else if(event.target===$('pdf-index')){
    const box=event.target.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.target.close();
  }
});
$('pdf-plus').addEventListener('click',()=>{zoom=clamp(zoom+.5,1,4);render();});$('pdf-minus').addEventListener('click',()=>{zoom=clamp(zoom-.5,1,4);render();});$('pdf-fit').addEventListener('click',()=>{zoom=1;render();});
$('pdf-retry').addEventListener('click',()=>pdf?render():open());
const surface=$('pdf-surface'),stage=$('pdf-stage');
surface.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};});
surface.addEventListener('pointermove',event=>{
  const box=surface.getBoundingClientRect();surface.classList.toggle('is-previous',event.clientX-box.left<box.width*.35);
  if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>12)suppressClickUntil=performance.now()+400;
});
surface.addEventListener('pointercancel',()=>{pointerStart=null;suppressClickUntil=performance.now()+400;});
surface.addEventListener('click',event=>{
  pointerStart=null;
  if(!pdf||zoom>1||performance.now()<suppressClickUntil||event.target.closest('a,button,input,select'))return;
  const box=surface.getBoundingClientRect();navigate(pageNumber+(event.clientX-box.left<box.width*.35?-1:1));
});
stage.addEventListener('wheel',event=>{
  if(!pdf||event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1);
  // A zoomed page scrolls naturally; it turns only after reaching its top or bottom.
  if(zoom>1&&((delta>0&&stage.scrollTop+stage.clientHeight<stage.scrollHeight-2)||(delta<0&&stage.scrollTop>2))){wheelTotal=0;return;}
  event.preventDefault();
  const now=performance.now();if(now-lastWheel>220)wheelTotal=0;lastWheel=now;
  if(now<wheelLock)return;
  wheelTotal+=delta;
  if(Math.abs(wheelTotal)>=45){const direction=Math.sign(wheelTotal);wheelTotal=0;wheelLock=now+450;navigate(pageNumber+direction);}
},{passive:false});
window.addEventListener('keydown',event=>{
  if(!pdf||$('pdf-index').open||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,select,textarea,button,a,[contenteditable="true"]'))return;
  const direction=['ArrowRight','ArrowDown','PageDown',' '].includes(event.key)?1:['ArrowLeft','ArrowUp','PageUp'].includes(event.key)?-1:0;
  if(direction){event.preventDefault();navigate(pageNumber+direction);}
  else if(event.key==='Home'||event.key==='End'){event.preventDefault();navigate(event.key==='Home'?1:pdf.numPages);}
});
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>render(),150);});
window.addEventListener('hashchange',()=>navigate(pageFromHash()));
window.addEventListener('pagehide',()=>{++revision;++loadRevision;renderTask?.cancel();const prior=pdf;pdf=null;prior?.destroy();});
window.addEventListener('pageshow',event=>{if(event.persisted)open();});
open();
