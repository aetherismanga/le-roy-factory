// Reuse the Studio One storage contract, with a distinct per-agent namespace.
const memory=()=>{const values=new Map();return {get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(String(k))??null,setItem:(k,v)=>values.set(String(k),String(v)),removeItem:k=>values.delete(String(k)),clear:()=>values.clear()};};
const storage=kind=>{try{return globalThis[kind]||memory();}catch{return memory();}};
export const isRandalDemo=()=>false;
export function scopedDemoStorage(input,{prefix='lrf-neobath-anima-studio-v1:'+String(globalThis.NEOBATH_ANIMA_AGENT?.uid||'private')+':'}={}){
  return {keys(){return Array.from({length:input.length},(_,i)=>input.key(i)).filter(k=>typeof k==='string'&&k.startsWith(prefix)).map(k=>k.slice(prefix.length));},get length(){return this.keys().length;},key(i){return this.keys()[i]??null;},getItem:k=>input.getItem(prefix+String(k)),setItem:(k,v)=>input.setItem(prefix+String(k),String(v)),removeItem:k=>input.removeItem(prefix+String(k)),clear(){for(const key of this.keys())input.removeItem(prefix+key);}};
}
export const localStorage=scopedDemoStorage(storage('localStorage'));
export const sessionStorage=scopedDemoStorage(storage('sessionStorage'));
export const anonymousDemoState=()=>({client:null,isAdmin:false,known:true,pending:false,proHT:null,proRows:[],privateCode:'',referenceAllowed:false,randalAllowed:false});
export function createDemoIdentity(changed=()=>{}){const state=anonymousDemoState();return {get state(){return state;},load:async()=>{changed(state);return state;},refresh:async()=>state,schedule(){},logout:async()=>state};}
export function demoPreviewOrigin(){return null;}
export function demoRoute(path){return path;}
export function setDemoVariant(){}
export function demoConfiguratorURL(_variant,path='index.html'){const url=new URL(path,'https://leroyfactory.fr/');const view=/atelier/.test(url.pathname)?'atelier':'home';return 'https://leroyfactory.fr/neobath-anima-configurateur.html?studioView='+view+(url.search?'&'+url.search.slice(1):'')+url.hash;}
export function mountDemoIsolation(){}
