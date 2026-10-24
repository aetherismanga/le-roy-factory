// Administrator purchase data is fetched on demand and retained only in memory.
// The same-origin gateway uses the HttpOnly administrator cookie. Customer PRO
// sessions never grant access to this endpoint or provide prices in the bundle.
let prices=null,flight=null;
export const surfacePurchaseAvailable=()=>globalThis.LRF_VERIFIED_IDENTITY?.isAdmin===true;
globalThis.addEventListener?.('lrf-identity',()=>{prices=null;flight=null;globalThis.dispatchEvent?.(new Event('lrf-surface-purchase-access'));});
export async function loadSurfacePurchasePrices(){
 if(!surfacePurchaseAvailable())throw Error('Accès administrateur requis.');if(prices)return prices;if(flight)return flight;
 flight=(async()=>{const response=await fetch('/api/purchase-prices',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000),cache:'no-store'});const value=await response.json().catch(()=>({}));if(!response.ok||value.success!==true||value.variant!=='studio-one')throw Error(value.error||'Prix professionnels temporairement indisponibles.');if(!surfacePurchaseAvailable())throw Error('Session administrateur modifiée.');prices=value;return value;})().finally(()=>{flight=null;});return flight;
}
export function privateSurfacePrice(group,key){return surfacePurchaseAvailable()?prices?.[group]?.[key]||{}:{};}
const confidential=/purchase|achat|cost|^priceSource$|^priceNote$|^publicPriceHT$/i;
export function publicProjectData(value){if(Array.isArray(value))return value.map(publicProjectData);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!confidential.test(key)).map(([key,val])=>[key,publicProjectData(val)]));return value;}
