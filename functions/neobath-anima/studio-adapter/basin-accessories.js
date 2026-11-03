import CATALOGUE from '../catalogue.json' with {type:'json'};

// Anima PDF p.75 / printed p.149 lists the white Ocritech insert and the
// black ABS support separately. Neither is automatically bundled with the
// other. Their manufacturing dimensions are not published in the catalogue.
const PRODUCTS=new Map(CATALOGUE.products.map(product=>[product.id,product]));
const COLOURS=new Set(['fume-matte','bronze-matte']);
const basinProduct=value=>value?.basin||value?.product||value;
export function eclisseAccessoryFamily(value){
 const product=basinProduct(value);
 if(product?.category!=='basin')return null;
 return /^ECLISSE(114|115|116)(?:\/S)?$/.exec(String(product.ref||'').replace(/\s+/g,'').toUpperCase())?.[1]||null;
}

export function resolveBasinAccessories(value,settings={}){
 const bottom=settings.basinBottom===undefined?'none':settings.basinBottom,support=settings.basinSupport===undefined?false:settings.basinSupport;
 if(!['none','tvl'].includes(bottom)||typeof support!=='boolean')throw Error('Option de tablette de fond Anima inconnue.');
 const family=eclisseAccessoryFamily(value),colour=settings.basinPriceKey||settings.basinColor;
 const available=!!family&&COLOURS.has(colour);
 if((bottom!=='none'||support)&&!available)throw Error('La tablette de fond et son support sont réservés aux vasques Eclisse fumées ou bronze compatibles.');
 const bottomProduct=bottom==='tvl'?PRODUCTS.get('tvl'+family+'-accessory'):null;
 const supportProduct=support?PRODUCTS.get('sup'+family+'-accessory'):null;
 if(bottom==='tvl'&&!bottomProduct||support&&!supportProduct)throw Error('Référence de tablette de fond Anima inconnue.');
 return {available,basinBottom:bottom,basinSupport:support,bottomProduct,supportProduct,products:[bottomProduct,supportProduct].filter(Boolean)};
}

export function eclisseBottomOptions(value,settings={}){
 const family=eclisseAccessoryFamily(value),colour=settings.basinPriceKey||settings.basinColor;
 if(!family||!COLOURS.has(colour))return [];
 const product=PRODUCTS.get('tvl'+family+'-accessory');
 return [{id:'none',name:'Sans tablette de fond',product:null},{id:'tvl',name:'Avec tablette blanche · '+product.ref,product}];
}
