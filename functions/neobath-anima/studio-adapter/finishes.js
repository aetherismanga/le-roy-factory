import {CATALOGUE} from './anima-data.js';
import VISUALS from '../../../assets/data/neobath-anima-visuals.json' with {type:'json'};

// Requested visual replacement only: keep the Anima commercial finish and
// reference, but reuse Studio One's approved flat Serenade Alba sample. This
// must not be labelled a calibrated Neobath manufacturer swatch. The shared
// Studio One source remains unchanged; tests compare these values and hashes
// with its canonical definition and original image files.
const ALBA_ASSETS='https://studio-one-beta-test-v2.vercel.app/assets/finishes/20261022/';
export const STUDIO_ONE_ALBA_APPEARANCE=Object.freeze({
 sourceFinishId:'ALBA',sourceFinishName:'Serenade Alba',hex:'#bfa386',roughness:.46,
 frontRotation:Math.PI/2,textureRepeat:[1,.40375],frontRepeat:[1,.52735],
 clearcoat:.13,clearcoatRoughness:.35,bumpScale:.00045,
 assetRoot:ALBA_ASSETS,maxNativeSize:[945,2048],
 maxSha256:'771491decd956c424fe4302a82cda712f5f84f30d9e0bc5485b1fbbbcb84fcc4',
 source:'Juan Carlos Segura · Serenade_alba_acabado.jpg · 2026-10-22',
 requestedVisualReplacement:true,calibratedNeobathSample:false
});
const ALBA_VARIANTS=Object.freeze(Object.fromEntries(['fluid','balanced','max'].map(profile=>[profile,ALBA_ASSETS+'alba-'+profile+'.webp'])));

// Lacquers stay uniform; no photographed grooves or baked lighting are applied
// on top of the real Ribelle relief. All wood faces share a single clean image;
// Pura keeps the horizontal grain and Ribelle the catalogue's vertical grain.
export const FINISHES=Object.freeze(CATALOGUE.finishes.map(f=>{
 const v=VISUALS.finishes[f.id];if(!v)throw Error('Échantillon Anima manquant : '+f.id);
 const wood=f.id==='rovere-alba';
 if(wood)return {id:f.id,name:f.name,refCode:f.id,hex:STUDIO_ONE_ALBA_APPEARANCE.hex,
  texture:ALBA_VARIANTS.balanced,frontTexture:ALBA_VARIANTS.balanced,ribelleFrontTexture:ALBA_VARIANTS.balanced,
  textureVariants:ALBA_VARIANTS,frontTextureVariants:ALBA_VARIANTS,ribelleFrontTextureVariants:ALBA_VARIANTS,
  swatch:ALBA_ASSETS+'alba-swatch.webp',frontRotation:STUDIO_ONE_ALBA_APPEARANCE.frontRotation,ribelleFrontRotation:0,
  textureRepeat:[...STUDIO_ONE_ALBA_APPEARANCE.textureRepeat],frontRepeat:[...STUDIO_ONE_ALBA_APPEARANCE.frontRepeat],ribelleFrontRepeat:[...STUDIO_ONE_ALBA_APPEARANCE.textureRepeat],
  textureMapped:true,sharedWoodTexture:true,textureWrap:'repeat',woodCrop:null,
  colourIdentity:'user-requested-studio-one-serenade-alba',kind:'Bois',
  roughness:STUDIO_ONE_ALBA_APPEARANCE.roughness,clearcoat:STUDIO_ONE_ALBA_APPEARANCE.clearcoat,
  clearcoatRoughness:STUDIO_ONE_ALBA_APPEARANCE.clearcoatRoughness,bumpScale:STUDIO_ONE_ALBA_APPEARANCE.bumpScale,
  physicalPeriod:{horizontal:.80,vertical:.70},manufacturerSample:false,requestedVisualReplacement:true,
  source:{...STUDIO_ONE_ALBA_APPEARANCE,animaFinishId:f.id,originalAnimaSource:v.source||f.source}};
 return {id:f.id,name:f.name,refCode:f.id,hex:v.hex||v.color,texture:v.sideTexture||v.texture,
  frontTexture:v.frontTexture||v.texture,swatch:v.swatch||v.frontTexture||v.texture,
  ribelleFrontTexture:v.ribelleFrontTexture||v.sideTexture||v.frontTexture||v.texture,
  textureVariants:{fluid:v.sideTexture||v.texture,balanced:v.sideTexture||v.texture,max:v.sideTexture||v.texture},
  frontTextureVariants:{fluid:v.frontTexture||v.texture,balanced:v.frontTexture||v.texture,max:v.frontTexture||v.texture},
  frontRotation:v.frontRotation||0,textureRepeat:v.repeat||[1,1],frontRepeat:v.frontRepeat||[1,1],
  textureMapped:false,colourIdentity:'manufacturer-sampled-rgb',kind:'Mat',roughness:v.roughness||.66,
  clearcoat:0,clearcoatRoughness:.68,bumpScale:0,physicalPeriod:{horizontal:.80,vertical:.70},
  textureWrap:'mirrored-repeat',manufacturerSample:true,source:v.source||f.source};
}));
