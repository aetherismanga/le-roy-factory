/* Exact colour identities only: never use a neighbouring colour as a substitute. */
(function(root,factory){
  const model=factory();
  if(typeof module==='object'&&module.exports)module.exports=model;
  else root.ELIOS_SELECTION_MEDIA_MODEL=model;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const unique=list=>[...new Set((list||[]).filter(value=>typeof value==='string'&&value.trim()))];
  function mergeVariants(...sources){
    const merged={};
    for(const source of sources)for(const [slug,colors]of Object.entries(source||{})){
      merged[slug]||={};
      for(const [color,images]of Object.entries(colors||{})){
        if(!Array.isArray(images))continue;
        const previous=Object.keys(merged[slug]).find(name=>key(name)===key(color));
        if(previous&&previous!==color)delete merged[slug][previous];
        merged[slug][color]=unique(images);
      }
    }
    return merged;
  }
  function imagesForColor(colors,color){
    const exact=Object.keys(colors||{}).find(name=>key(name)===key(color));
    return exact?unique(colors[exact]):[];
  }
  function colorEntries(productColors,colors){
    const seen=new Set();
    return [...(productColors||[]),...Object.keys(colors||{})].filter(color=>{const id=key(color);if(!id||seen.has(id))return false;seen.add(id);return true;}).map(color=>({color,images:imagesForColor(colors,color)}));
  }
  return Object.freeze({mergeVariants,imagesForColor,colorEntries,unique});
});
