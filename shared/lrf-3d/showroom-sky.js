import * as T from 'three';
import {loadQueuedTexture} from './texture-loader.js';

export const SHOWROOM_SKY=Object.freeze({
 file:'assets/showroom/partly-cloudy-sky-4k.webp',
 source:'https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky',
 authors:'Greg Zaal · Jarod Guest',license:'CC0-1.0',projection:'equirectangular',width:4096,height:2048
});

// A photographic panorama surrounds the visitor beyond the actual transparent
// roof and façades. Its centre follows the walker to stay inside the far plane;
// the sky never rotates or drifts as the visitor changes viewing direction.
export function makeShowroomSky({onReady=()=>{},loadTexture=loadQueuedTexture}={}){
 const root=new T.Group();root.name='Ciel_photographique_panoramique';root.userData={visualOnly:true,excludeFromProductBounds:true};
 const material=new T.MeshBasicMaterial({color:'#b4c8de',side:T.BackSide,depthWrite:false,fog:false,toneMapped:false});
 const dome=new T.Mesh(new T.SphereGeometry(84,48,24),material);dome.name='Panorama_ciel_nuages_reels';dome.raycast=()=>{};dome.renderOrder=-100;
 dome.userData={visualOnly:true,excludeFromProductBounds:true,sky:SHOWROOM_SKY};root.add(dome);
 let disposed=false,task=null,texture=null;const controller=new AbortController();
 function prepareNear(position){
  if(disposed)return Promise.resolve(false);root.position.set(position.x,0,position.z);
  if(task)return task;
  if(loadTexture===loadQueuedTexture&&typeof Image==='undefined')return Promise.resolve(false);
  const mobile=typeof navigator!=='undefined'&&navigator.maxTouchPoints>0;
  task=Promise.resolve().then(()=>loadTexture(SHOWROOM_SKY.file,{signal:controller.signal,maxDimension:mobile?2048:4096})).then(map=>{
   if(disposed||controller.signal.aborted){map.dispose();return false;}
   texture=map;map.colorSpace=T.SRGBColorSpace;map.mapping=T.EquirectangularReflectionMapping;map.wrapS=T.RepeatWrapping;map.wrapT=T.ClampToEdgeWrapping;map.needsUpdate=true;
   material.map=map;material.color.set('#ffffff');material.needsUpdate=true;root.userData.ready=true;onReady();return true;
  }).catch(error=>{if(!disposed){root.userData.error=String(error?.message||error);task=null;}return false;});
  return task;
 }
 function dispose(){if(disposed)return;disposed=true;controller.abort();texture?.dispose();texture=null;material.dispose();dome.geometry.dispose();root.removeFromParent();}
 material.addEventListener('dispose',()=>{if(!disposed){disposed=true;controller.abort();texture?.dispose();texture=null;}});
 return {root,prepareNear,dispose,get texture(){return texture}};
}
