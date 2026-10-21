// Mobile browser bars and the official site's iframe can have a smaller visible
// viewport than 100vh. Both screens share this measurement, without reloading
// the configuration or resizing the layout while the visitor pinch-zooms.
const root=document.documentElement;
const hostOrigins=['https://leroyfactory.fr','https://www.leroyfactory.fr'];
let hostHeight=0,scheduled=false;
function updateViewport(){
 scheduled=false;
 const viewport=window.visualViewport;
 if(viewport&&Math.abs(viewport.scale-1)>.01)return;
 const heights=[window.innerHeight,viewport?.height,hostHeight].filter(n=>Number.isFinite(n)&&n>0);
 if(heights.length)root.style.setProperty('--app-height',Math.floor(Math.min(...heights))+'px');
}
function scheduleViewport(){if(!scheduled){scheduled=true;requestAnimationFrame(updateViewport);}}
addEventListener('resize',scheduleViewport);
addEventListener('pageshow',scheduleViewport);
window.visualViewport?.addEventListener('resize',scheduleViewport);
if(parent!==window){
 addEventListener('message',event=>{
  if(event.source!==parent||!hostOrigins.includes(event.origin)||event.data?.type!=='studio-one-viewport')return;
  const {height,safeBottom}=event.data;
  if(!Number.isFinite(height)||height<=0)return;
  hostHeight=height;
  if(Number.isFinite(safeBottom)&&safeBottom>=0)root.style.setProperty('--host-safe-bottom',Math.min(safeBottom,height/3)+'px');
  scheduleViewport();
 });
 let hostOrigin=hostOrigins[0];
 try{if(document.referrer)hostOrigin=new URL(document.referrer).origin;}catch{}
 if(hostOrigins.includes(hostOrigin))parent.postMessage({type:'studio-one-viewport-ready'},hostOrigin);
}
updateViewport();
