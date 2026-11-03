import {CATALOGUE} from './anima-data.js';
import VISUALS from '../../../assets/data/neobath-anima-visuals.json' with {type:'json'};

// Photographs remain available for manufacturer swatches. Only the wood uses
// them as a 3D diffuse map: photographed grooves/lighting must never be baked
// onto a second, physically modelled Ribelle relief or a uniform lacquer.
export const FINISHES=Object.freeze(CATALOGUE.finishes.map(f=>{
  const v=VISUALS.finishes[f.id];
  if(!v)throw Error('Échantillon Anima manquant : '+f.id);
  const wood=f.id==='rovere-alba';
  return {id:f.id,name:f.name,refCode:f.id,hex:v.hex||v.color,texture:v.sideTexture||v.texture,
    frontTexture:v.frontTexture||v.texture,swatch:v.swatch||v.frontTexture||v.texture,
    ribelleFrontTexture:v.ribelleFrontTexture||v.sideTexture||v.frontTexture||v.texture,
    textureVariants:{fluid:v.sideTexture||v.texture,balanced:v.sideTexture||v.texture,max:v.sideTexture||v.texture},
    frontTextureVariants:{fluid:v.frontTexture||v.texture,balanced:v.frontTexture||v.texture,max:v.frontTexture||v.texture},
    frontRotation:v.frontRotation||0,textureRepeat:v.repeat||[1,1],frontRepeat:v.frontRepeat||[1,1],
    textureMapped:wood,colourIdentity:wood?'manufacturer-wood-photograph':'manufacturer-sampled-rgb',
    kind:wood?'Bois':'Mat',roughness:v.roughness||.66,clearcoat:wood?.025:0,
    clearcoatRoughness:.68,bumpScale:wood?.00009:0,
    physicalPeriod:{horizontal:.80,vertical:.70},textureWrap:'mirrored-repeat',manufacturerSample:true,source:v.source||f.source};
}));
