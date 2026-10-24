import {canonicalSurfaceIdentity} from '../../../shared/lrf-3d/surface-identity.mjs';
// Review references may fill missing illustrations. Existing manufacturer HD
// faces, variants and previews always remain the source for an established SKU.
export function mergeCatalogue(base,review={}){
 const products=base.products.map(p=>{const patch=review.previews?.[p.key];if(!patch)return {...p};if(p.preview)return {...patch,...p};return {...p,...patch};});
 const known=new Set(products.map(p=>p.key));
 for(const p of review.products||[])if(!known.has(p.key)){products.push(p);known.add(p.key);}
 return {...base,products:products.map(product=>{
  if(!product.native)return product;
  try{canonicalSurfaceIdentity(product);return product;}
  catch(error){return {...product,native:false,available3d:false,transferIssue:error.message};}
 })};
}
