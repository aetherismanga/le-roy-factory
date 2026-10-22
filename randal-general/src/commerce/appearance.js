import {FINISHES} from '../finishes.js';
export const APPEARANCE=Object.fromEntries(FINISHES.map(f=>[f.id,{hex:f.hex,...(f.texture?{texture:f.texture,textureURL:f.textureURL,swatch:f.swatch}:{})}]));
export const chipStyle=id=>{const f=APPEARANCE[id];return f?'background-color:'+f.hex+(f.texture?';background-image:url('+(f.swatch||f.textureURL||'https://studio-one-beta-test-v2.vercel.app/assets/'+f.texture)+');background-size:cover':''):'';};
