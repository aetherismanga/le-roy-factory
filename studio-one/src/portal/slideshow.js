// Official catalogue photographs, automatically crossfaded without visible controls.
export function mountPortalSlideshow({document=globalThis.document,view=globalThis.window,delay=6000}={}){
 const images=[...document.querySelectorAll('.portal-slide')];if(images.length<2)return;
 let index=0,timer;
 function select(next){if(!images[next]?.complete||!images[next].naturalWidth)return false;index=next;images.forEach((image,i)=>{image.classList.toggle('is-active',i===index);image.setAttribute('aria-hidden',String(i!==index));});return true;}
 function advance(){if(document.hidden||!images[0].parentElement.getClientRects().length)return;for(let offset=1;offset<images.length;offset++)if(select((index+offset)%images.length))return;}
 function start(){view.clearInterval(timer);timer=view.setInterval(advance,delay);}
 const stop=()=>view.clearInterval(timer);view.addEventListener('pagehide',stop);view.addEventListener('pageshow',start);
 start();return {select,advance,get index(){return index;},dispose(){stop();view.removeEventListener('pagehide',stop);view.removeEventListener('pageshow',start);}};
}
