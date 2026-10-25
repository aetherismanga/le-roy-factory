// Demo is an anonymous presentation context, never an authorization mechanism.
// All normal credentials and project keys remain untouched in the standard app.
export function isRandalDemo(url=globalThis.location?.href){
 try{return new URL(url).searchParams.get('demo')==='randal';}catch{return false;}
}
const memory=()=>{const values=new Map();return {get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(String(k))??null,setItem:(k,v)=>values.set(String(k),String(v)),removeItem:k=>values.delete(String(k)),clear:()=>values.clear()};};
export function scopedDemoStorage(storage,{demo=isRandalDemo(),prefix='lrf-demo-randal-v1:'}={}){
 if(!demo)return storage;
 return {get length(){return this.keys().length;},keys(){return Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>typeof k==='string'&&k.startsWith(prefix)).map(k=>k.slice(prefix.length));},key(i){return this.keys()[i]??null;},getItem:k=>storage.getItem(prefix+String(k)),setItem:(k,v)=>storage.setItem(prefix+String(k),String(v)),removeItem:k=>storage.removeItem(prefix+String(k)),clear(){for(const key of this.keys())storage.removeItem(prefix+key);}};
}
function browserStorage(kind){try{return globalThis[kind]||memory();}catch{return memory();}}
export const localStorage=scopedDemoStorage(browserStorage('localStorage'));
export const sessionStorage=scopedDemoStorage(browserStorage('sessionStorage'));
export const anonymousDemoState=()=>({client:null,isAdmin:false,proHT:null,proRows:[],privateCode:'',referenceAllowed:false,randalAllowed:false,known:true,pending:false,demo:true});
export function createDemoIdentity(changed=()=>{}){
 const state=anonymousDemoState();
 const publish=()=>{globalThis.LRF_VERIFIED_IDENTITY=state;changed(state);if(typeof globalThis.dispatchEvent==='function'&&typeof CustomEvent==='function')globalThis.dispatchEvent(new CustomEvent('lrf-identity',{detail:state}));return state;};
 queueMicrotask(publish);
 const load=async()=>publish();
 return {get state(){return state;},load,reconnect:load,refresh:load,resync:load,schedule(){},authenticate:load,logout:load};
}
export function demoPreviewOrigin(input){
 try{const url=new URL(input);return url.protocol==='https:'&&/^(?:studio-one-beta-test-v2|randal-catalogue-general-3d)-[a-z0-9-]+-hugol-trading\.vercel\.app$/.test(url.hostname)&&!url.username&&!url.password?url.origin:null;}catch{return null;}
}
export function demoRoute(path,base=globalThis.location?.href){
 try{const current=new URL(base),target=new URL(path,current);if(current.searchParams.get('demo')!=='randal')return path;if(target.origin!==current.origin&&!demoPreviewOrigin(target.href))return path;if(target.pathname.endsWith('/maison.html'))target.pathname=target.pathname.replace(/maison\.html$/,'demo.html');target.searchParams.set('demo','randal');target.searchParams.set('lang',current.searchParams.get('lang')==='fr'?'fr':'es');for(const key of ['studio','general']){const origin=demoPreviewOrigin(current.searchParams.get(key));if(origin)target.searchParams.set(key,origin);}return target.href;}catch{return path;}
}
let configuredVariant=null;
export function setDemoVariant(variant){configuredVariant=variant;}
export function demoConfiguratorURL(variant,path='index.html',base=globalThis.location?.href){
 const current=new URL(base),key=variant==='studio-one'?'studio':'general';
 const origin=demoPreviewOrigin(current.searchParams.get(key));
 const currentVariant=configuredVariant||(current.hostname.startsWith('randal-catalogue-general-3d')?'randal-general':current.hostname.startsWith('studio-one-beta-test-v2')?'studio-one':null);
 if(origin)return demoRoute(new URL(path,origin+'/').href,base);
 if(currentVariant===variant)return demoRoute(path,base);
 throw Error('La prévisualisation de cet atelier n’est pas configurée pour cette démonstration.');
}
export function mountDemoIsolation(){
 if(!isRandalDemo()||typeof document==='undefined'||document.getElementById('lrf-demo-isolation'))return;
 document.documentElement.dataset.randalDemo='true';globalThis.LRF_VERIFIED_IDENTITY=anonymousDemoState();
 const style=document.createElement('style');style.id='lrf-demo-isolation';style.textContent='[data-randal-demo=true] :is(.commerce-account,.account-details,#estimate-account,#account-dialog,#house-account,#house-order,#house-send,#prepare-order,.lrf-admin-send,#quote-private,#quote-customer){display:none!important}';document.head.append(style);
 document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(!link||link.hasAttribute('download'))return;const href=link.getAttribute('href');if(!href||href.startsWith('#')||href.startsWith('blob:')||href.startsWith('data:'))return;if(link.matches('#quit-configurator,#return-randal,#brand-home')){event.preventDefault();event.stopImmediatePropagation();globalThis.location.href=demoRoute('demo.html');return;}let url;try{url=new URL(href,location.href);}catch{return;}if(url.origin===location.origin){link.href=demoRoute(url.href);return;}if(url.hostname==='leroyfactory.fr'||url.hostname==='www.leroyfactory.fr'){event.preventDefault();event.stopImmediatePropagation();globalThis.location.href=demoRoute('demo.html');}},true);
}
mountDemoIsolation();
