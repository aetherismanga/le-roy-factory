import {SRGBColorSpace} from 'three';

export const WINDOW_AMBIENCES=Object.freeze([
 {id:'mediterranean',name:'Jardin méditerranéen',file:'assets/exterior/mediterranean-garden.webp'},
 {id:'coast',name:'Bord de mer',file:'assets/exterior/coast.webp'},
 {id:'forest-lake',name:'Forêt et lac',file:'assets/exterior/forest-lake.webp'},
 {id:'mountains',name:'Montagne',file:'assets/exterior/mountains.webp'},
 {id:'contemporary-garden',name:'Jardin contemporain',file:'assets/exterior/contemporary-garden.webp'}
].map(Object.freeze));

// Missing legacy settings retain the existing garden. Unknown explicit choices
// are rejected so a project never silently displays a different selected view.
export function windowAmbience(value){return WINDOW_AMBIENCES.find(choice=>choice.id===(value??'mediterranean'))||null;}
export function windowAmbienceURL(value){const choice=windowAmbience(value);if(!choice)throw Error('Ambiance de fenêtre inconnue.');return choice.file;}

// Only the selected view is downloaded. A ready texture is shared by windows
// and registered once; failures can be retried and never mark an image ready.
export function createWindowAmbienceLoader({loadTexture,registerTexture=()=>{},onReady=()=>{},maxAnisotropy=8}){
 const pending=new Map(),ready=new Map();
 const load=value=>{
  const choice=windowAmbience(value);if(!choice)return Promise.reject(Error('Ambiance de fenêtre inconnue.'));
  if(pending.has(choice.id))return pending.get(choice.id);
  const task=Promise.resolve().then(()=>loadTexture(choice.file)).then(texture=>{
   texture.colorSpace=SRGBColorSpace;texture.anisotropy=Math.min(8,Math.max(1,maxAnisotropy));
   ready.set(choice.id,texture);registerTexture(texture,choice.id);onReady(texture,choice.id);return texture;
  }).catch(error=>{pending.delete(choice.id);ready.delete(choice.id);throw error;});
  pending.set(choice.id,task);return task;
 };
 return {
  load,
  isReady:value=>ready.has(windowAmbience(value)?.id),
  ensureItems:items=>Promise.all([...new Set((items||[]).filter(item=>item.type==='window').map(item=>item.settings?.exteriorAmbience??'mediterranean'))].map(load)),
  diagnostics:()=>({loaded:[...ready.keys()],requested:[...pending.keys()]})
 };
}
