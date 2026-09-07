(() => {
  'use strict';
  const data=Array.isArray(window.VIEW_CATALOGUE)?window.VIEW_CATALOGUE:[];
  const patch=(productId,variantKey,palette,detail)=>{
    const product=data.find(p=>p.id===productId);const variant=product?.variants?.find(v=>v.key===variantKey);if(!variant)return;
    variant.proPrice=null;variant.proPalette=palette;variant.proDetail=detail;variant.note='Tarif net 20 mm 60×90 : 1 palette et plus / détail, selon grille FR CL 0226.';
  };
  patch('view-digione','dig-6090-20',25,27);
  patch('view-corso','corso-6090-20',25,27);
})();