import {COLLECTIONS} from './surface-catalog.js';
import {resolveSurfaceTexture} from './surface-texture-selection.js';
import {surfaceAssetURL} from './texture-loader.js';

// Preview the exact catalogue entry. A missing colour or texture must never
// borrow the first image of another finish, even when both names are similar.
export function presentationAssetURL(file){
 const value=typeof file==='string'?file.trim():'';
 if(!value)return '';
 return /^(?:https?:|data:|blob:|\/|assets\/)/.test(value)?value:'assets/'+value;
}
export function presentationMaterialPreview(material,{label=material?.name,caption}={}){
 if(!material)return null;
 const file=material.swatch||material.textureVariants?.max||material.textureURL||material.texture;
 const src=presentationAssetURL(Array.isArray(file)?file[0]:file),name=label||material.id||'';
 if(src)return {type:'image',src,alt:'Échantillon '+name,caption:caption||name};
 if(/^#[\da-f]{6}$/i.test(material.hex||''))return {type:'color',hex:material.hex,alt:'Couleur '+name,caption:caption||name};
 return null;
}
export function presentationChoicePreview(choice){
 if(!choice)return null;
 const definition=COLLECTIONS[choice.collection],color=definition?.colors.find(c=>c.id===choice.color);
 if(!color)return null;
 if(choice.collection==='Peinture')return presentationMaterialPreview(color,{label:choice.name});
 // Match the scene's explicit Slate source and its verified format-to-face
 // lookup for Stone Icon, rather than a neighbouring format's photograph.
 const resolved=choice.texture?{files:[choice.texture.file]}:resolveSurfaceTexture(choice.collection,choice.color,'max',choice);
 const file=resolved.files[0];if(!file)return null;
 return {type:'image',src:surfaceAssetURL(file),alt:choice.name,caption:[choice.name,resolved.reference&&'Réf. '+resolved.reference,color.continuousDecor?'Panneau décor fabricant':'Échantillon fabricant'].filter(Boolean).join(' · ')};
}
