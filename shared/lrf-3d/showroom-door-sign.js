import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {loadQueuedTexture} from './texture-loader.js';

export const SHOWROOM_DOOR_LOGO='assets/showroom/lrf-logo.png';
export function makeShowroomDoorSign({width=.73,onReady=()=>{},loadTexture=loadQueuedTexture}={}){
 const root=new T.Group();root.name='Enseigne_LRF_Showrooms';root.position.set(width/2,1.43,.024);root.userData={visualOnly:true,showroomAction:{kind:'inner-door'},officialLogo:SHOWROOM_DOOR_LOGO,label:'Showrooms'};
 const base=new T.MeshStandardMaterial({color:'#233f34',roughness:.56,metalness:.12});
 const plate=new T.Mesh(new RoundedBoxGeometry(.39,.48,.008,3,.012),base);plate.name='Plaque_porte_Showrooms';plate.castShadow=true;plate.receiveShadow=true;root.add(plate);
 const logoMaterial=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,alphaTest:.02,toneMapped:false});
 const logo=new T.Mesh(new T.PlaneGeometry(.272,.272),logoMaterial);logo.name='Logo_officiel_LRF_porte';logo.position.set(0,.055,.0055);logo.visible=false;root.add(logo);
 const textMaterial=new T.MeshBasicMaterial({color:'#f4edda',transparent:true,toneMapped:false});
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const context=canvas.getContext?.('2d');
  if(context){context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle='#f4edda';context.font='500 116px Georgia, serif';context.textAlign='center';context.textBaseline='middle';context.fillText('Showrooms',512,100,970);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;textMaterial.map=texture;textMaterial.color.set('#ffffff');textMaterial.addEventListener('dispose',()=>texture.dispose());}
 }
 const label=new T.Mesh(new T.PlaneGeometry(.33,.062),textMaterial);label.name='Inscription_Showrooms';label.position.set(0,-.137,.0055);root.add(label);
 let disposed=false,task=null,ownedTexture=null;const controller=new AbortController();
 const prepare=()=>{
  if(disposed||(loadTexture===loadQueuedTexture&&typeof Image==='undefined'))return Promise.resolve(false);if(task)return task;
  task=loadTexture(SHOWROOM_DOOR_LOGO,{signal:controller.signal,maxDimension:512}).then(texture=>{
   if(disposed){texture.dispose();return false;}ownedTexture=texture;texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=8;texture.needsUpdate=true;logoMaterial.map=texture;logoMaterial.needsUpdate=true;logo.visible=true;onReady();return true;
  }).catch(()=>{task=null;return false;});return task;
 };
 logoMaterial.addEventListener('dispose',()=>{disposed=true;controller.abort();ownedTexture?.dispose();});
 root.traverse(object=>{object.raycast=()=>{};object.userData.visualOnly=true;});
 return {root,prepare};
}
