import {TextureLoader} from 'three';
import {runTextureTask} from './texture-queue.mjs';

export function loadQueuedTexture(url,{timeout=45000}={}){
 return runTextureTask(()=>new Promise((resolve,reject)=>{
  let settled=false;
  const timer=setTimeout(()=>{if(!settled){settled=true;reject(Error('Délai de chargement de la texture dépassé. Réessayez.'));}},timeout);
  const fail=error=>{if(settled)return;settled=true;clearTimeout(timer);reject(error instanceof Error?error:Error('Image fabricant indisponible.'));};
  try{new TextureLoader().load(url,texture=>{if(settled){texture.dispose();return;}settled=true;clearTimeout(timer);resolve(texture);},undefined,fail);}catch(error){fail(error);}
 }));
}

export function surfaceAssetURL(file){
 const value=String(file||'');
 if(value.startsWith('https://eliosceramica.com/'))return '/manufacturer-materials/elios/'+value.slice('https://eliosceramica.com/'.length);
 if(value.startsWith('/assets/img/lrf-plan-pose/faces/'))return 'https://leroyfactory.fr'+value;
 if(/^(shell|creta)-[^/]+\.webp$/.test(value)||value.startsWith('elios-restored/'))return 'https://leroyfactory.fr/review-studio/assets/'+value;
 return /^(https?:|data:|blob:)/.test(value)?value:'assets/'+value;
}
