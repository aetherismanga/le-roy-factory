import {CATALOGUE} from './anima-data.js';
import VISUALS from '../../../assets/data/neobath-anima-visuals.json' with {type:'json'};

// The same finish schema as Studio One, with manufacturer Anima samples.
// A separate front sample preserves Rovere Alba's actual horizontal grain.
export const FINISHES=Object.freeze(CATALOGUE.finishes.map(f=>{
  const v=VISUALS.finishes[f.id];
  if(!v)throw Error('Échantillon Anima manquant : '+f.id);
  return {id:f.id,name:f.name,refCode:f.id,hex:v.hex||v.color,texture:v.sideTexture||v.texture,
    frontTexture:v.frontTexture||v.texture,swatch:v.swatch||v.frontTexture||v.texture,
    ribelleFrontTexture:v.ribelleFrontTexture||v.sideTexture||v.frontTexture||v.texture,
    textureVariants:{fluid:v.sideTexture||v.texture,balanced:v.sideTexture||v.texture,max:v.sideTexture||v.texture},
    frontTextureVariants:{fluid:v.frontTexture||v.texture,balanced:v.frontTexture||v.texture,max:v.frontTexture||v.texture},
    frontRotation:v.frontRotation||0,textureRepeat:v.repeat||[1,1],frontRepeat:v.frontRepeat||[1,1],
    kind:f.id==='rovere-alba'?'Bois':'Mat',roughness:v.roughness||.66,clearcoat:f.id==='rovere-alba'?.025:0,
    clearcoatRoughness:.68,bumpScale:f.id==='rovere-alba'?.00009:.000025,
    physicalPeriod:{horizontal:.80,vertical:.70},textureWrap:'mirrored-repeat',manufacturerSample:true,source:v.source||f.source};
}));
