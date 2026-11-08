// Official catalogue photographs only. The slideshow never touches account or project data.
export function mountPortalSlideshow({document=globalThis.document,view=globalThis.window,delay=6000}={}){
 const images=[...document.querySelectorAll('.portal-slide')],dots=[...document.querySelectorAll('[data-slide]')],toggle=document.getElementById('slideshow-toggle');
 if(images.length<2||!toggle)return;
 const motion=view.matchMedia?.('(prefers-reduced-motion: reduce)');let index=0,paused=!!motion?.matches,timer;
 function labels(){const fr=document.documentElement.lang==='fr';toggle.textContent=paused?'▷':'Ⅱ';toggle.setAttribute('aria-label',paused?(fr?'Faire défiler les photos':'Reproducir las fotos'):(fr?'Mettre les photos en pause':'Pausar las fotos'));toggle.setAttribute('aria-pressed',String(paused));dots.forEach((dot,i)=>dot.setAttribute('aria-label',(fr?'Photo ':'Foto ')+(i+1)));}
 function select(next){if(!images[next]?.complete||!images[next].naturalWidth)return false;index=next;images.forEach((image,i)=>{image.classList.toggle('is-active',i===index);image.setAttribute('aria-hidden',String(i!==index));});dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===index)));return true;}
 function advance(){if(paused||document.hidden||!images[0].parentElement.getClientRects().length)return;select((index+1)%images.length);}
 function start(){view.clearInterval(timer);timer=view.setInterval(advance,delay);}
 toggle.onclick=()=>{paused=!paused;labels();};dots.forEach((dot,i)=>{dot.onclick=()=>{select(i);start();};});
 motion?.addEventListener?.('change',e=>{if(e.matches){paused=true;labels();}});
 view.addEventListener('randal-portal-language',labels);view.addEventListener('pagehide',()=>view.clearInterval(timer));view.addEventListener('pageshow',start);
 labels();start();return {select,advance,get index(){return index;},dispose(){view.clearInterval(timer);view.removeEventListener('randal-portal-language',labels);}};
}
