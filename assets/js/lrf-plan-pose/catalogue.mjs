// Add documented corrections without replacing the shared catalogue release.
export function mergeCatalogue(base,review){return {...base,products:[...base.products.map(p=>({...p,...review.previews?.[p.key]})),...(review.products||[])]};}
