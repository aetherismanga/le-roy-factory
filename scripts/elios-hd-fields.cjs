// Attach a reviewed native face only to its exact commercial SKU and format.
// Shared colour previews remain independent of this per-reference HD mapping.
function eliosHDFields(color,reference,format){
 const texture=color?.textureVariantsByReference?.[reference];
 if(!texture?.verified||!format||texture.format!==format||texture.reference!==reference||texture.colorId!==color.id)return {};
 const variants=texture.textureVariants,tiers=['fluid','balanced','max'];
 if(!variants||!tiers.every(t=>Array.isArray(variants[t])&&variants[t].length&&variants[t].every(url=>typeof url==='string'&&/^https:\/\//.test(url))&&new Set(variants[t]).size===variants[t].length)||new Set(tiers.map(t=>variants[t].length)).size!==1)return {};
 return {textureVariants:variants,nativeFaces:true,textureReference:reference,...([0,90,180,270].includes(texture.textureRotation)?{textureRotation:texture.textureRotation}:{})};
}
module.exports={eliosHDFields};
