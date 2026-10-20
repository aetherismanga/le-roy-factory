import {CanvasTexture} from 'three';
// The JSON media endpoint serves the same public Storage objects with CORS.
// Raw bucket URLs can display in <img> while being rejected as WebGL textures.
export function finishTextureURL(definition){
 const url=definition.textureURL||'https://studio-one-beta-test-v2.vercel.app/assets/'+definition.texture;
 const source=new URL(url);
 if(source.hostname!=='storage.googleapis.com'||source.pathname.startsWith('/download/'))return url;
 const [bucket,...key]=source.pathname.slice(1).split('/');
 return `https://storage.googleapis.com/download/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(key.join('/'))}?alt=media`;
}
// Some official swatches are circles on white. Only their centre is usable as
// a material map; white borders must never be projected onto furniture.
export function prepareFinishTexture(texture,definition){
 if(!definition?.textureCrop)return texture;
 const im=texture.image,canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 canvas.getContext('2d').drawImage(im,im.width*.32,im.height*.32,im.width*.36,im.height*.36,0,0,256,256);
 const cropped=new CanvasTexture(canvas);texture.dispose();return cropped;
}
