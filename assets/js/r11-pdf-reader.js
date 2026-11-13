/* Public R11 catalogue: reuse the hosted LRF PDF.js runtime and byte-range loader. */
import {loadPdfRuntime,openPdfDocument} from './randal-catalogue/pdf-runtime.mjs';

const PDF_URL=new URL('../pdf/selection-lrf-exterieur-r11.pdf',import.meta.url).href;
const $=id=>document.getElementById(id);
let pdf=null,pageNumber=1,zoom=1,renderTask=null,revision=0,loadRevision=0,resizeTimer;
const destinations=[];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const pageFromHash=()=>Number(new URLSearchParams(location.hash.slice(1)).get('page'))||1;
function message(text,retry=false){$('pdf-message').textContent=text;$('pdf-status').hidden=!text;$('pdf-retry').hidden=!retry;}
function controls(){
  const loaded=Boolean(pdf);
  for(const id of ['pdf-page','pdf-fit','pdf-plus','pdf-minus','pdf-outline'])$(id).disabled=!loaded;
  $('pdf-prev').disabled=!loaded||pageNumber<=1;$('pdf-next').disabled=!loaded||pageNumber>=pdf.numPages;
  $('pdf-minus').disabled=!loaded||zoom<=1;$('pdf-plus').disabled=!loaded||zoom>=4;
  $('pdf-page').value=pageNumber;$('pdf-page').max=pdf?.numPages||143;$('pdf-total').textContent='/ '+(pdf?.numPages||143);
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
    page.cleanup();
  }catch(error){if(error?.name==='RenderingCancelledException'||ticket!==revision)return;$('pdf-surface').setAttribute('aria-busy','false');message('La page ne peut pas être affichée. Vérifiez votre connexion puis réessayez.',true);}
}
function navigate(value){if(!pdf)return;pageNumber=clamp(Number(value)||1,1,pdf.numPages);history.replaceState(history.state,'','#page='+pageNumber);render();}
async function outline(){
  const items=await pdf.getOutline();if(!items?.length)return;
  const select=$('pdf-outline');
  function append(nodes,depth=0){for(const item of nodes){if(item.dest){const option=document.createElement('option');option.value=String(destinations.push(item.dest)-1);option.textContent=(depth?'  ':'')+item.title;select.append(option);}if(item.items?.length)append(item.items,depth+1);}}
  append(items);
}
async function open(){
  const ticket=++loadRevision;++revision;renderTask?.cancel();message('Ouverture du catalogue…');$('pdf-retry').disabled=true;
  try{
    if(pdf){await pdf.destroy();pdf=null;}controls();
    const next=await openPdfDocument(await loadPdfRuntime(),PDF_URL);if(ticket!==loadRevision){await next.destroy();return;}
    pdf=next;pageNumber=clamp(pageFromHash(),1,pdf.numPages);zoom=1;destinations.length=0;$('pdf-outline').innerHTML='<option value="">Sommaire des collections</option>';
    controls();await render();outline().catch(()=>{});
  }catch{if(ticket===loadRevision)message('Le catalogue est momentanément indisponible. Vérifiez votre connexion puis réessayez.',true);}
  finally{$('pdf-retry').disabled=false;}
}
$('pdf-prev').addEventListener('click',()=>navigate(pageNumber-1));$('pdf-next').addEventListener('click',()=>navigate(pageNumber+1));
$('pdf-page').addEventListener('change',event=>navigate(event.target.value));
$('pdf-outline').addEventListener('change',event=>{if(event.target.value!=='')goDestination(destinations[Number(event.target.value)]);});
$('pdf-plus').addEventListener('click',()=>{zoom=clamp(zoom+.5,1,4);render();});$('pdf-minus').addEventListener('click',()=>{zoom=clamp(zoom-.5,1,4);render();});$('pdf-fit').addEventListener('click',()=>{zoom=1;render();});
$('pdf-retry').addEventListener('click',()=>pdf?render():open());
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>render(),150);});
window.addEventListener('hashchange',()=>navigate(pageFromHash()));
window.addEventListener('pagehide',()=>{++revision;++loadRevision;renderTask?.cancel();const prior=pdf;pdf=null;prior?.destroy();});
window.addEventListener('pageshow',event=>{if(event.persisted)open();});
open();
