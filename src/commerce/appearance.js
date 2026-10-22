import {FINISHES} from '../finishes.js';
export const APPEARANCE=Object.fromEntries(FINISHES.map(f=>[f.id,{hex:f.hex,...(f.texture?{texture:f.swatch||f.texture}:{})}]));
export const chipStyle=id=>{const f=APPEARANCE[id];return f?'background-color:'+f.hex+(f.texture?';background-image:url(assets/'+f.texture+');background-size:cover':''):'';};
