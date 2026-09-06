(() => {
  'use strict';

  const COLORS = ['Aventino', 'Celio', 'Viminale', 'Palatino'];

  const defs = [
    {kind:'Carreau', format:'20,3 × 20,3 cm', finish:'R10 · 10 mm', pcsBox:28, sqmBox:1.15, kgBox:23, boxesPal:60, sqmPal:69, kgPal:1395, codes:{Aventino:'0852040',Celio:'0852005'}},
    {kind:'Carreau', format:'20,3 × 40,6 cm', finish:'R10 · 10 mm', pcsBox:13, sqmBox:1.07, kgBox:21, boxesPal:72, sqmPal:77.04, kgPal:1527, codes:{Aventino:'0852640',Celio:'0852605'}},
    {kind:'Carreau', format:'40,6 × 40,6 cm', finish:'R10 · 10 mm', pcsBox:6, sqmBox:0.99, kgBox:20, boxesPal:72, sqmPal:71.28, kgPal:1455, codes:{Aventino:'0854240',Celio:'0854205'}},
    {kind:'Carreau', format:'61 × 61 cm', finish:'R10 · 10 mm', pcsBox:3, sqmBox:1.12, kgBox:23.57, boxesPal:40, sqmPal:44.8, kgPal:963, codes:{Aventino:'0856140',Celio:'0856105',Viminale:'0856100',Palatino:'0856170'}},
    {kind:'Carreau', format:'40,6 × 60,9 cm', finish:'R10 · 10 mm', pcsBox:6, sqmBox:1.46, kgBox:29.8, boxesPal:40, sqmPal:58.4, kgPal:1210, codes:{Aventino:'0854640',Celio:'0854605',Viminale:'0854600',Palatino:'0854670'}},
    {kind:'Modulo pré-emballé', format:'Multiformat 40,5 × 61 / 40,5 × 40,5 / 20,3 × 40,5 / 20,3 × 20,3', finish:'R10 · 10 mm', pcsBox:6, sqmBox:0.75, kgBox:14.5, boxesPal:80, sqmPal:59.6, kgPal:1175, codes:{Aventino:'085M140',Celio:'085M105',Viminale:'085M100',Palatino:'085M170'}},

    {kind:'Carreau extérieur', format:'20,3 × 20,3 cm', finish:'Outdoor R11 · 10 mm', pcsBox:28, sqmBox:1.15, kgBox:23, boxesPal:60, sqmPal:69, kgPal:1395, codes:{Aventino:'0852042',Celio:'0852007'}},
    {kind:'Carreau extérieur', format:'20,3 × 40,6 cm', finish:'Outdoor R11 · 10 mm', pcsBox:13, sqmBox:1.07, kgBox:21, boxesPal:72, sqmPal:77.04, kgPal:1527, codes:{Aventino:'0852642',Celio:'0852607'}},
    {kind:'Carreau extérieur', format:'40,6 × 40,6 cm', finish:'Outdoor R11 · 10 mm', pcsBox:6, sqmBox:0.99, kgBox:20, boxesPal:72, sqmPal:71.28, kgPal:1455, codes:{Aventino:'0854242',Celio:'0854207'}},
    {kind:'Dalle extérieure', format:'60 × 120 cm', finish:'Outdoor R11 · 20 mm · Rectifié', pcsBox:1, sqmBox:0.72, kgBox:28, boxesPal:32, sqmPal:23.04, kgPal:896, codes:{Aventino:'0856C40',Celio:'0856C05'}},
    {kind:'Carreau extérieur', format:'40,6 × 60,9 cm', finish:'Outdoor R11 · 10 mm', pcsBox:6, sqmBox:1.46, kgBox:29.8, boxesPal:40, sqmPal:58.4, kgPal:1210, codes:{Aventino:'0854642',Celio:'0854607',Viminale:'0854602',Palatino:'0854672'}},
    {kind:'Modulo extérieur', format:'Multiformat pré-emballé', finish:'Outdoor R11 · 10 mm', pcsBox:6, sqmBox:0.75, kgBox:14.5, boxesPal:80, sqmPal:59.6, kgPal:1175, codes:{Aventino:'085M141',Celio:'085M106'}},

    {kind:'Mosaïque', format:'30,4 × 30,4 cm · tesselles 5 × 5', finish:'R10 · 10 mm · sur trame', pcsBox:6, sqmBox:0.55, kgBox:8.2, boxesPal:null, sqmPal:null, kgPal:null, codes:{Aventino:'085H140',Celio:'085H105',Viminale:'085H100',Palatino:'085H170'}},
    {kind:'Plinthe', format:'6,5 × 61 cm', finish:'R10 · 10 mm', pcsBox:15, sqmBox:0.59, kgBox:16.5, boxesPal:null, sqmPal:null, kgPal:null, orderUnit:'ML', orderPerBox:9.15, codes:{Aventino:'085B140',Celio:'085B105',Viminale:'085B100',Palatino:'085B170'}},
    {kind:'Plinthe', format:'7,5 × 40,5 cm', finish:'R10 · 10 mm', pcsBox:24, sqmBox:null, kgBox:15, boxesPal:null, sqmPal:null, kgPal:null, orderUnit:'ML', orderPerBox:9.72, codes:{Aventino:'085BC40',Celio:'085BC05',Viminale:'085BC00',Palatino:'085BC70'}},
    {kind:'Pièce spéciale', format:'Gradino costa retta 33 × 60 cm', finish:'R10 · 10 mm', pcsBox:1, sqmBox:null, kgBox:null, boxesPal:null, sqmPal:null, kgPal:null, orderUnit:'PZ', orderPerBox:1, orderOnly:true, codes:{}},
    {kind:'Pièce spéciale', format:'Gradino costa retta angolo DX/SX 33 × 60 cm', finish:'R10 · 10 mm', pcsBox:1, sqmBox:null, kgBox:null, boxesPal:null, sqmPal:null, kgPal:null, orderUnit:'PZ', orderPerBox:1, orderOnly:true, codes:{}}
  ];

  const rows = [];
  for (const color of COLORS) {
    for (const def of defs) {
      const ref = def.codes[color] || '';
      if (!ref && !def.orderOnly) continue;
      rows.push({
        collection:'ROMA',
        color,
        ref,
        searchRef:ref,
        name:`ROMA ${color.toUpperCase()} — ${def.kind}`,
        kind:def.kind,
        format:def.format,
        finish:def.finish,
        pcsBox:def.pcsBox,
        sqmBox:def.sqmBox,
        kgBox:def.kgBox,
        boxesPal:def.boxesPal,
        sqmPal:def.sqmPal,
        kgPal:def.kgPal,
        orderUnit:def.orderUnit || null,
        orderPerBox:def.orderPerBox || null,
        orderOnly:Boolean(def.orderOnly),
        stock:null,
        production:null,
        updatedAt:null
      });
    }
  }

  window.ELIOS_ROMA_STOCK_DATA = {
    collection:'ROMA',
    source:'ELIOS Catalogo Generale 2026 · Roma pp. 156–157',
    colors:COLORS,
    rows
  };
})();
