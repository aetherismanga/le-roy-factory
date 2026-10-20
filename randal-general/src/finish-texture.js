import {CanvasTexture} from 'three';
// Some official swatches are circles on white. Only their centre is usable as
// a material map; white borders must never be projected onto furniture.
export function prepareFinishTexture(texture,definition){
 if(!definition?.textureCrop)return texture;
 const im=texture.image,canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 canvas.getContext('2d').drawImage(im,im.width*.32,im.height*.32,im.width*.36,im.height*.36,0,0,256,256);
 const cropped=new CanvasTexture(canvas);texture.dispose();return cropped;
}
