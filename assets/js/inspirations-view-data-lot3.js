(() => {
  'use strict';
  if(!Array.isArray(window.VIEW_CATALOGUE)) window.VIEW_CATALOGUE=[];
  const existing=new Set(window.VIEW_CATALOGUE.map(p=>p.id));
  if(existing.has('view-golden-stone')&&existing.has('view-coco')) return;

  const img=(url,alt)=>({url,alt});
  const pack=(m2Box,pcsBox,kgBox,boxesPallet,m2Pallet,kgPallet)=>({m2Box,pcsBox,kgBox,boxesPallet,m2Pallet,kgPallet});
  const v=(key,format,thickness,finish,proPrice,extra={})=>({key,format,thickness,finish,proPrice,unit:'m²',...extra});
  const source='VIEW · Prix nets FR CL 0226 · catalogues officiels VIEW';

  const products=[
    {
      id:'view-coco',slug:'coco',name:'COCO',collection:'Coco',
      category:'Carrelage effet travertin',effect:'Pierre / travertin',
      description:'Grès cérame effet travertin au format 40×60, disponible en Light et Beige, en finition lisse R10 ou antidérapante Grip R11.',
      formats:['40×60'],colors:['Light','Beige'],colorFamilies:['Blanc','Beige'],finishes:['Lisse R10','Grip R11'],
      images:[img('https://asdecarreaux.com/cdn-cgi/image/width%3D396%2Cheight%3D396%2Cfit%3Dcover%2Cquality%3D80%2Cformat%3Davif/132642/carrelage-imitation-travertin-coco-beige-r11-40x60-12-m.jpg','COCO Beige · View')],
      sourceUrl:'https://www.leroymerlin.fr/produits/carrelage-imitation-pierre-naturelle-coco-light-60x40cm-70684905.html',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('coco-4060-r10','40×60','9 mm','Lisse R10',12,{colors:['Light','Beige'],refs:{Light:'VCC4610L',Beige:'VCC4620L'},pack:pack(1.20,5,23,48,57.60,1124)}),
        v('coco-4060-r11','40×60','9 mm','Grip R11',12,{colors:['Light','Beige'],refs:{Light:'VCC4610LS',Beige:'VCC4620LS'},pack:pack(1.20,5,23,48,57.60,1124)})
      ]
    },
    {
      id:'view-golden-stone',slug:'golden-stone',name:'GOLDEN STONE',collection:'Golden Stone',
      category:'Carrelage effet pierre',effect:'Pierre',
      description:'Collection IN&OUT effet pierre à veinage émaillé, en Ivory, Sand, Pearl, Oxid et Carbon. Formats intérieurs jusqu’au 120×120 et dalles extérieures Grip 20 mm.',
      formats:['7,5×7,5','7,5×30','30×30','30×60','60×60','60×120','120×120'],colors:['Ivory','Sand','Pearl','Oxid','Carbon'],colorFamilies:['Blanc','Beige','Gris','Noir'],finishes:['Naturel R10/A+B','Satinato / Honed','Grip R11/A+B+C'],
      images:[
        img('https://viewceramiche.com/wp-content/uploads/2025/10/Golden-Stone-Oxid-2000x.jpg','Golden Stone Oxid · ambiance HD'),
        img('https://viewceramiche.com/wp-content/uploads/2025/10/Golden-Stone-Ivory-700x-150x150.jpg','Golden Stone Ivory'),
        img('https://viewceramiche.com/wp-content/uploads/2025/10/Golden-Stone-Sand-700x-150x150.jpg','Golden Stone Sand')
      ],
      sourceUrl:'https://viewceramiche.com/prodotto/golden-stone/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('golden-7575','7,5×7,5','9,5 mm','Naturel R10/A+B',37,{colors:['Ivory','Sand','Pearl','Oxid','Carbon']}),
        v('golden-7530','7,5×30','9,5 mm','Naturel R10/A+B',21,{colors:['Ivory','Sand','Pearl','Oxid','Carbon']}),
        v('golden-3030','30×30','9,5 mm','Naturel R10/A+B',18.5,{colors:['Ivory','Sand','Pearl','Oxid','Carbon']}),
        v('golden-3060','30×60','9,5 mm','Naturel R10/A+B',13,{colors:['Ivory','Sand','Pearl','Oxid','Carbon'],pack:pack(1.44,8,null,32,46.08,null)}),
        v('golden-6060','60×60','9,5 mm','Naturel R10/A+B',13,{colors:['Ivory','Sand','Pearl','Oxid','Carbon'],pack:pack(1.44,4,null,30,43.20,null)}),
        v('golden-60120','60×120','9,5 mm','Naturel R10/A+B',15.5,{colors:['Ivory','Sand','Pearl','Oxid','Carbon'],pack:pack(1.44,2,null,36,51.84,null)}),
        v('golden-120120','120×120','9,5 mm','Naturel R10/A+B',20,{colors:['Ivory','Sand','Pearl','Oxid','Carbon'],pack:pack(2.88,2,null,18,51.84,null)}),
        v('golden-satin-3060','30×60','9,5 mm','Satinato / Honed',null,{colors:['Ivory','Sand','Pearl','Oxid','Carbon'],pack:pack(1.44,8,null,32,46.08,null),note:'Tarif net à confirmer : la finition Satinato/Honed est présente au catalogue, sans montant lisible distinct dans la grille FR CL 0226.'}),
        v('golden-satin-6060','60×60','9,5 mm','Satinato / Honed',null,{colors:['Ivory','Sand','Pearl','Oxid','Carbon'],pack:pack(1.44,4,null,30,43.20,null)}),
        v('golden-satin-60120','60×120','9,5 mm','Satinato / Honed',null,{colors:['Ivory','Sand','Pearl','Oxid','Carbon'],pack:pack(1.44,2,null,36,51.84,null)}),
        v('golden-6060-20','60×60','20 mm','Grip R11/A+B+C',null,{colors:['Sand','Pearl','Carbon'],proPalette:22,proDetail:24,pack:pack(.72,2,null,32,23.04,null)}),
        v('golden-60120-20','60×120','20 mm','Grip R11/A+B+C',null,{colors:['Ivory','Sand','Pearl'],proPalette:26,proDetail:28,pack:pack(.72,1,null,30,21.60,null)})
      ]
    },
    {
      id:'view-new-wood',slug:'new-wood',name:'NEW WOOD',collection:'New Wood',
      category:'Dalle extérieure effet bois',effect:'Bois',
      description:'Grès cérame rectifié effet bois pour terrasse extérieure, au format 40×122 en 20 mm.',
      formats:['40×122'],colors:['Miele','Grey','Melange','Brown'],colorFamilies:['Beige','Gris','Marron'],finishes:['Grip R11/C'],
      images:[img('assets/img/view.png','New Wood · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/new-wood-2/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('newwood-40122-20','40×122','20 mm','Grip R11/C',null,{colors:['Miele','Grey','Melange','Brown'],proPalette:27,proDetail:29,pack:pack(.98,2,43.5,21,20.58,913.5)})
      ]
    },
    {
      id:'view-quantum',slug:'quantum',name:'QUANTUM',collection:'Quantum',
      category:'Dalle extérieure effet pierre',effect:'Pierre',
      description:'Grès cérame rectifié 20 mm, surface Grip R11/C pour extérieur, en Cream, Ivory, Grey et Dark.',
      formats:['61×61','45×90'],colors:['Cream','Ivory','Grey','Dark'],colorFamilies:['Beige','Blanc','Gris','Noir'],finishes:['Grip R11/C'],
      images:[
        img('https://viewceramiche.com/wp-content/uploads/2024/01/Quantum-Cream-2000x-600x414.jpg','Quantum Cream · ambiance HD'),
        img('https://viewceramiche.com/wp-content/uploads/2024/01/Quantum-Grey-2000x-600x400.jpg','Quantum Grey · ambiance HD'),
        img('https://viewceramiche.com/wp-content/uploads/2024/01/Quantum-Dark-2000x-600x366.jpg','Quantum Dark · ambiance HD'),
        img('https://viewceramiche.com/wp-content/uploads/2024/01/Quantum-Ivory-700x-600x600.jpg','Quantum Ivory')
      ],
      sourceUrl:'https://viewceramiche.com/prodotto/quantum/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('quantum-6161-20','61×61','20 mm','Grip R11/C',null,{colors:['Cream','Ivory','Grey','Dark'],proPalette:22,proDetail:24,pack:pack(.74,2,31.9,30,22.20,957)}),
        v('quantum-4590-20','45×90','20 mm','Grip R11/C',null,{colors:['Cream','Ivory','Grey','Dark'],proPalette:25,proDetail:27,pack:pack(.81,2,36,27,21.87,972)})
      ]
    },
    {
      id:'view-dorset-xl',slug:'dorset-xl',name:'DORSET XL',collection:'Dorset XL',
      category:'Dalle extérieure effet pierre',effect:'Pierre',
      description:'Dalle en grès cérame rectifié 20 mm de grand format, série Dorset XL, en Ice, Londra, Plata et Night.',
      formats:['120×120','80×180'],colors:['Ice','Londra','Plata','Night'],colorFamilies:['Blanc','Beige','Gris','Noir'],finishes:['Grip extérieur 20 mm'],
      images:[img('assets/img/view.png','Dorset XL · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/dorset-xl-4/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('dorsetxl-120120-20','120×120','20 mm','Grip extérieur',null,{colors:['Ice','Londra','Plata','Night'],proPalette:41.5,proDetail:43.5,pack:pack(1.44,1,67.7,20,28.80,1354)}),
        v('dorsetxl-80180-20','80×180','20 mm','Grip extérieur',null,{colors:['Ice','Londra','Plata','Night'],proPalette:49,proDetail:51,pack:pack(1.44,1,66.7,18,25.92,1200)})
      ]
    },
    {
      id:'view-bigsize',slug:'bigsize',name:'BIGSIZE',collection:'Bigsize',
      category:'Dalle extérieure grand format',effect:'Pierre',
      description:'Grès cérame rectifié effet pierre en 20 mm, surface Grip R11/C pour extérieur, disponible en 120×120 et 120×240.',
      formats:['120×120','120×240'],colors:['Stromboli','Gran Sasso','Vals','Porfido','Dolomiti','Appia'],colorFamilies:['Beige','Gris','Marron','Noir'],finishes:['Grip R11/C'],
      images:[img('assets/img/view.png','Bigsize · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/bigsize/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('bigsize-120120-20','120×120','20 mm','Grip R11/C',null,{colors:['Stromboli','Gran Sasso','Vals','Porfido','Dolomiti','Appia'],note:'La grille FR CL 0226 donne une remise sur tarif public BIGSIZE et non un net direct : tarif à confirmer.'}),
        v('bigsize-120240-20','120×240','20 mm','Grip R11/C',null,{colors:['Stromboli','Gran Sasso','Vals','Porfido','Dolomiti','Appia'],note:'Tarif PRO à confirmer auprès de VIEW.'})
      ]
    },
    {
      id:'view-pietre-6090',slug:'pietre-60x90',name:'PIETRE 60×90',collection:'Pietre 60×90',
      category:'Dalle extérieure effet pierre',effect:'Pierre',
      description:'Dalle extérieure en grès cérame rectifié 20 mm, format 60×90, surface Grip R11/C.',
      formats:['60×90'],colors:['Limestone Yellow','Fossil','Multicolor'],colorFamilies:['Beige','Marron','Noir'],finishes:['Grip R11/C'],
      images:[img('assets/img/view.png','Pietre 60×90 · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/pietre-60x90/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('pietre-6090-20','60×90','20 mm','Grip R11/C',null,{colors:['Limestone Yellow','Fossil','Multicolor'],proPalette:33,proDetail:35,pack:pack(.54,1,24.2,48,25.92,1161)})
      ]
    }
  ];

  products.forEach(p=>{ if(!existing.has(p.id)) { window.VIEW_CATALOGUE.push(p); existing.add(p.id); } });
})();