// Non-sensitive route hints only. No pricing, account or access decision here.
(() => {
  const normalise=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const query=new URLSearchParams(location.search);
  const requested=normalise(query.get('partner'));
  // Keep membership and fallback order aligned with inspirations-v2.js.
  const categories=[
    ['carrelage',['elios-ceramica','selection-lrf-exterieur-r11','la-fenice','view-ceramica']],
    ['exception',['petracers','pecchioli-firenze','bulbo']],
    ['mosaique',['reviglass']],['parement',['saxso','biopietra']],
    ['meubles',['randal-pro','neobath','petracers','bulbo']],
    ['robinetterie',['aquahome','opal','reitano-rubinetterie','petracers']],
    ['sanitaire',['petracers','uptrend']],['outillages',['bilt']]
  ];
  const aliases={r11:'selection-lrf-exterieur-r11',exterieur:'selection-lrf-exterieur-r11',elios:'elios-ceramica',view:'view-ceramica',petracer:'petracers',pecchioli:'pecchioli-firenze',randal:'randal-pro',opalhome:'opal',saxo:'saxso'};
  const partner=categories.flatMap(([,partners])=>partners).find(slug=>normalise(slug)===requested)||aliases[requested]||'';
  const requestedCategory=query.get('category')||query.get('cat')||'';
  const categoryId=requestedCategory==='piscine'?'carrelage':requestedCategory;
  const category=categories.find(([id,partners])=>id===categoryId&&(!partner||partners.includes(partner)))
    ||(partner?categories.find(([,partners])=>partners.includes(partner)):null)
    ||categories.find(([id])=>id===categoryId)||categories[0];
  const route=[category[0],partner&&category[1].includes(partner)?partner:category[1][0]||''];
  document.documentElement.dataset.lrfSelectionCategory=route[0];
  document.documentElement.dataset.lrfSelectionPartner=route[1];
  if(route[1]==='opal'){
    for(const [rel,as,href] of [['modulepreload','','assets/js/opal-catalogue.js?v=20261106-firstpaint1'],['preload','fetch','assets/data/opal-products.json?v=20261106-firstpaint1'],['preload','fetch','assets/css/opal-catalogue.css?v=20261106-firstpaint1'],['preload','image','assets/img/opal-catalogue-2026/opal-aixa.jpg']]){
      const link=document.createElement('link');link.rel=rel;if(as)link.as=as;if(as==='fetch')link.crossOrigin='anonymous';link.href=href;document.head.appendChild(link);
    }
  }
})();
