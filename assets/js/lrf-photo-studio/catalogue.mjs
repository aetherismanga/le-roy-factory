const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/,/g,'.').replace(/\s+/g,' ').trim();
export function normalizeSearch(value){return normalize(value).replace(/\s*[×x]\s*/g,'x');}
/** Browse the exact commercial catalogue; this never implies a texture is simulable. */
export function filterCatalogue(products,{query='',manufacturer='',collection='',color='',format='',finish=''}={}){
 const terms=normalizeSearch(query).split(' ').filter(Boolean);
 return products.filter(p=>(!manufacturer||p.manufacturer===manufacturer)&&(!collection||p.collection===collection)&&(!color||p.color===color)&&(!format||p.format===format)&&(!finish||p.finish===finish)&&terms.every(t=>normalizeSearch([p.manufacturer,p.collection,p.color,p.reference,p.format,p.finish].join(' ')).includes(t)));
}
export function filterProducts(products,filters={}){return filterCatalogue(products,filters).filter(p=>p.photoStudioEligible);}
export async function loadCatalogue({signal}={}){const response=await fetch(new URL('./catalogue.json',import.meta.url),{signal});if(!response.ok)throw Error('Le catalogue est indisponible. Réessayez dans quelques instants.');const data=await response.json();if(data.schema!=='lrf-photo-studio-catalogue'||data.version!==1||!Array.isArray(data.products))throw Error('Version de catalogue incompatible.');return data;}
export function resolveSavedProduct(id,products){return products.find(p=>p.id===id)||null;}
/** Catalogue cards are summaries. Only the exact complete record can be rendered. */
export function resolveSimulationProduct(selection,products){
 const id=typeof selection==='string'?selection:selection?.id;
 const product=id?resolveSavedProduct(id,products):null;
 if(!product?.photoStudioEligible)throw new Error(selection?.ineligibleReason||'Cette référence ne peut pas être simulée. Choisissez un carrelage disponible en simulation.');
 if(!(product.widthMm>0&&product.heightMm>0)||!product.textureFaces?.length)throw new Error('Les textures ou dimensions de cette référence sont indisponibles. Rouvrez les carrelages et réessayez.');
 return product;
}
