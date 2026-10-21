// Reuse the signed-off catalogues and manufacturer models of the configurator.
import '../../assets/js/elios-surfaces/catalog.js';
import '../../assets/js/view-surfaces/data.js';
import '../../assets/js/view-surfaces/catalogue.js';
import * as T from 'three';
import {CATALOG} from '../../randal-general/src/commerce/catalog.js';
import {COLLECTIONS as PACKAGING} from '../../randal-general/src/surface-catalog.js';
import {FINISHES} from '../../randal-general/src/finishes.js';
import {finishTextureURL,prepareFinishTexture} from '../../randal-general/src/finish-texture.js';
import {basinColors,basinLayouts} from '../../randal-general/src/basins.js';
import {topAvailable,defaultTop} from '../../randal-general/src/configuration.js';
export {CATALOG,FINISHES,topAvailable,defaultTop};
const catalogue=window.RandalSurfaceCatalogue;
export const SURFACES=catalogue.collections.filter(c=>c.pattern==='tiles'&&c.available3d).map(c=>({...c,colors:c.colors.filter(x=>x.available3d&&x.faces?.length&&x.verifiedFormats?.length),formats:c.formats.filter(f=>f.shape==='rectangle')})).filter(c=>c.colors.length&&c.formats.length);
export const collection=id=>SURFACES.find(c=>c.id===id);
export function surfaceProduct(selection){
 const c=collection(selection?.collection),color=c?.colors.find(x=>x.id===selection.color),format=c?.formats.find(f=>f.id===selection.format);
 if(!c||!color||!format||!color.verifiedFormats.includes(format.id))throw Error('Ce revêtement ou ce format n’est pas disponible dans le catalogue 3D.');
 const packKey=({'elios-shell':'Shell','elios-creta':'Creta','view-corso':'Corso','view-golden-stone':'Golden Stone'})[c.id];
 const pack=PACKAGING[packKey]?.formats.find(f=>f.id===format.id);
 return {collection:c,color,format,pack,name:`${c.brand.toUpperCase()} ${c.name} · ${color.name} · ${format.label}`};
}
export function textureURL(url){
 const u=new URL(url,'https://randal-catalogue-general-3d.vercel.app/');
 if(u.hostname==='randal-catalogue-general-3d.vercel.app'&&u.pathname.startsWith('/assets/materials/'))return '/shared/materials/'+u.pathname.slice('/assets/materials/'.length);
 if(u.hostname!=='storage.googleapis.com'||u.pathname.startsWith('/download/'))return u.href;
 const [b,...key]=u.pathname.slice(1).split('/');return `https://storage.googleapis.com/download/storage/v1/b/${encodeURIComponent(b)}/o/${encodeURIComponent(key.join('/'))}?alt=media`;
}
export function defaultFloor(room){
 // Bedrooms keep actual wood parquet until the customer selects a tile.
 if(room.flooring==='wood')return {kind:'parquet',format:'120x18',pattern:'offset',direction:'horizontal',groutWidth:1.5,x:0,y:0,grout:'#8e795e',waste:10};
 return {kind:'tile',collection:room.flooring==='stone'?'elios-creta':'elios-shell',color:room.flooring==='stone'?'avena':'ivory',format:'60x120',pattern:'straight',direction:'vertical',groutWidth:2,x:0,y:0,grout:'#b9b1a1',waste:10};
}
export function defaultBathroom(id){
 const format=id==='shower'?'aruba-rainure-two':'aruba-two',model=CATALOG.models.find(m=>m.id===format);
 return {format,width:id==='shower'?80:100,finish:model.finishes[0],top:'tampa',basinLayout:'center',basinColor:'gloss',topFinish:'plan--blanco-mate',column:'none',mirror:id==='shower'?'capsule':'ilse'};
}
export function normalizeBathroom(raw){
 const m=CATALOG.models.find(m=>m.id===raw.format);if(!m)throw Error('Modèle RANDAL inconnu.');
 const s={...raw};if(!m.widths.includes(+s.width))throw Error('Largeur indisponible pour cette collection.');
 s.width=+s.width;if(!m.finishes.includes(s.finish))throw Error('Finition indisponible pour ce meuble.');
 if(!topAvailable(s.top,s.width,s.format))throw Error('Ce plan n’est pas compatible avec le meuble.');
 const layouts=basinLayouts(s.top,s.width,s.format,s.basinColor),colors=basinColors(s.top,s.width,s.format,s.basinLayout);
 if(layouts.length&&!layouts.some(l=>l.layout===s.basinLayout))throw Error('Implantation de vasque incompatible.');
 if(colors.length&&!colors.some(c=>c.id===s.basinColor))throw Error('Couleur de céramique incompatible.');
 if(['plain','neris','torne'].includes(s.top)&&!CATALOG.topFinishes.some(f=>f.id===s.topFinish&&f.refs[s.width]))throw Error('Finition de plan indisponible.');
 if(s.column!=='none'&&!CATALOG.columns.some(c=>c.id===s.column&&c.collection===m.collection))throw Error('Colonne incompatible avec cette collection.');
 if(!['capsule','ilse','none'].includes(s.mirror))throw Error('Miroir non disponible.');
 return s;
}
export function createProductTextures(renderer){
 const cache=new Map(),loader=new T.TextureLoader(),resources=new Set();
 const tune=t=>{resources.add(t);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(12,renderer.capabilities.getMaxAnisotropy());t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
 async function tile(selection){
  const p=surfaceProduct(selection),key=p.collection.id+'/'+p.color.id;
  if(!cache.has(key))cache.set(key,Promise.all(p.color.faces.slice(0,innerWidth<700?3:6).map(url=>loader.loadAsync(textureURL(url)).then(tune))).catch(e=>{cache.delete(key);throw Error('La matière HD n’a pas pu être chargée. La finition précédente est conservée.');}));
  const textures=await cache.get(key);
  return textures.map(t=>{
   const map=t.clone();map.center.set(.5,.5);
   const im=t.image,portrait=im.height>im.width,formatPortrait=p.format.height>p.format.width;
   map.rotation=portrait===formatPortrait?0:Math.PI/2;
   map.needsUpdate=true;
   return new T.MeshPhysicalMaterial({map,color:'#ffffff',roughness:p.collection.roughness||.74,metalness:0,clearcoat:.025,clearcoatRoughness:.6});
  });
 }
 async function finish(asset,id){
  const f=FINISHES.find(x=>x.id===id);if(!f)return;
  let textures=null;
  if(f.texture||f.textureURL){
   const key='finish:'+id;
   if(!cache.has(key))cache.set(key,loader.loadAsync(textureURL(finishTextureURL(f))).then(raw=>{
    const t=tune(prepareFinishTexture(raw,f));if(f.materialSample==='aruba-flat-nogal'){t.center.set(.5,.5);t.rotation=Math.PI/2;}
    const front=t.clone();front.center.set(.5,.5);front.rotation=f.collection==='aruba-rainure'||f.materialSample==='aruba-flat-nogal'?0:Math.PI/2;front.needsUpdate=true;
    const bump=t.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;const frontBump=front.clone();frontBump.colorSpace=T.NoColorSpace;frontBump.needsUpdate=true;
    for(const tx of [t,front,bump,frontBump])resources.add(tx);return {map:t,front,bump,frontBump};
   }).catch(e=>{cache.delete(key);throw Error('La finition RANDAL HD n’a pas pu être chargée.');}));
   textures=await cache.get(key);
  }
  for(const [m,front]of [[asset.wood,false],[asset.frontWood,true]])if(m){m.color.set(textures?'#ffffff':f.hex);m.roughness=f.roughness;m.map=textures?(front?textures.front:textures.map):null;m.bumpMap=textures?(front?textures.frontBump:textures.bump):null;m.bumpScale=.00045;m.needsUpdate=true;}
  asset.setMetalFinish?.(id);
 }
 return {tile,finish,resources};
}
