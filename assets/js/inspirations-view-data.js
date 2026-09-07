(() => {
  'use strict';
  if (Array.isArray(window.VIEW_CATALOGUE) && window.VIEW_CATALOGUE.length) return;

  const img = (url, alt) => ({ url, alt });
  const v = (key, format, thickness, finish, publicPrice, proPrice, extra={}) => ({
    key, format, thickness, finish, publicPrice, proPrice, unit:'m²', ...extra
  });

  window.VIEW_CATALOGUE = [
    {
      id:'view-lux', slug:'lux', name:'LUX', collection:'I Legni di View · LUX',
      category:'Carrelage effet bois', effect:'Bois',
      description:'Grès cérame effet bois rectifié. Collection LUX en quatre teintes, avec version Grip sur certaines références.',
      formats:['20×120','30×120'], colors:['Agata','Topazio','Perla','Giada'], colorFamilies:['Bois','Beige','Marron'], finishes:['Naturel','Grip R11'],
      images:[img('assets/img/view.png','LUX · View Ceramica')],
      sourceLabel:'Tarif public View n°24 · Tarif net FR CL 0226', availability:'Sur demande auprès de VIEW',
      variants:[
        v('lux-20x120-nat','20×120','10 mm','Naturel',50,14,{colors:['Agata','Topazio','Perla','Giada']}),
        v('lux-20x120-grip','20×120','10 mm','Grip R11',54,14,{colors:['Topazio','Perla']}),
        v('lux-30x120-nat','30×120','10 mm','Naturel',50,14,{colors:['Agata','Topazio','Perla','Giada']})
      ]
    },
    {
      id:'view-rovere-forte', slug:'rovere-forte', name:'ROVERE FORTE', collection:'I Legni di View · Rovere Forte',
      category:'Carrelage effet bois', effect:'Bois',
      description:'Grès cérame effet chêne, rectifié, en formats lames. Une référence Grip est disponible en Honey.',
      formats:['20×120','30×120'], colors:['Cream','Honey','Nut','Soft'], colorFamilies:['Bois','Beige','Marron'], finishes:['Naturel','Grip R11'],
      images:[img('assets/img/view.png','Rovere Forte · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/i-legni-di-view-rovere-forte-2/', sourceLabel:'Tarif public View n°24 · Tarif net FR CL 0226', availability:'Sur demande auprès de VIEW',
      variants:[
        v('rf-20x120-nat','20×120','9,5 mm','Naturel',50,14,{colors:['Cream','Honey','Nut','Soft']}),
        v('rf-20x120-grip','20×120','9,5 mm','Grip R11',54,14,{colors:['Honey']}),
        v('rf-30x120-nat','30×120','9,5 mm','Naturel',50,14,{colors:['Cream','Honey','Nut']})
      ]
    },
    {
      id:'view-blois', slug:'blois', name:'BLOIS', collection:'Blois',
      category:'Carrelage effet pierre', effect:'Pierre',
      description:'Pierre contemporaine en Beige, Gris et Anthracite, disponible en intérieur et en 20 mm Grip pour l’extérieur.',
      formats:['30×60','60×60','60×90','90×90'], colors:['Beige','Gris','Anthracite'], colorFamilies:['Beige','Gris','Noir'], finishes:['Naturel','Grip R11'],
      images:[img('https://viewceramiche.com/wp-content/uploads/2023/11/Blois-Gris-2000x-600x424.jpg','Blois Gris · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/blois/', sourceLabel:'Tarif public View n°24 · Tarif net FR CL 0226', availability:'Sur demande auprès de VIEW',
      variants:[
        v('blois-90','90×90','10,5 mm','Naturel',64,16.5),
        v('blois-6090','60×90','10,5 mm','Naturel',60,15.5),
        v('blois-6090-grip','60×90','10,5 mm','Grip R11',64,15.5),
        v('blois-6060','60×60','10,5 mm','Naturel',48,13),
        v('blois-3060','30×60','10,5 mm','Naturel',48,13),
        v('blois-90-20','90×90','20 mm','Grip R11/C',95,null,{proPalette:27.5,proDetail:29.5})
      ]
    },
    {
      id:'view-ardenne', slug:'ardenne', name:'ARDENNE', collection:'Ardenne',
      category:'Carrelage effet pierre', effect:'Pierre',
      description:'Pierre élégante en Avorio, Sabbia, Grigio et Antracite, du 30×60 jusqu’à la grande dalle 120×278.',
      formats:['30×60','60×60','60×120','80×80','120×120','120×278'], colors:['Avorio','Sabbia','Grigio','Antracite'], colorFamilies:['Blanc','Beige','Gris','Noir'], finishes:['Naturel','Grip R11','Grande dalle'],
      images:[img('https://viewceramiche.com/wp-content/uploads/2023/11/Ardenne-Sabbia-2000x-300x300.jpg','Ardenne Sabbia · View Ceramica')],
      sourceLabel:'Tarif public View n°24 · Tarif net FR CL 0226', availability:'Sur demande auprès de VIEW',
      variants:[
        v('ard-120','120×120','9,5 mm','Naturel',78,20),
        v('ard-80','80×80','9,5 mm','Naturel',61,16.5),
        v('ard-60120','60×120','9,5 mm','Naturel',60,15.5),
        v('ard-6060','60×60','9,5 mm','Naturel',48,13),
        v('ard-3060','30×60','9,5 mm','Naturel',48,13),
        v('ard-80-20','80×80','20 mm','Grip R11/C',92,null,{colors:['Sabbia','Grigio','Antracite'],proPalette:27.5,proDetail:29.5}),
        v('ard-60-20','60×60','20 mm','Grip R11/C',80,null,{colors:['Sabbia','Grigio','Antracite'],proPalette:22,proDetail:24}),
        v('ard-slab','120×278','6,5 mm','Naturel',108,39.02,{colors:['Avorio','Sabbia','Grigio'],note:'Net calculé selon remise slabs FR CL 0226 : -50% -15% -15%.'})
      ]
    },
    {
      id:'view-docks', slug:'docks', name:'DOCKS', collection:'Docks',
      category:'Carrelage effet pierre', effect:'Pierre / béton',
      description:'Grand format 100×100 au caractère minéral, disponible en 8,5 mm et en 20 mm Grip pour terrasse.',
      formats:['100×100'], colors:['Sabbia','Grigio','Antracite'], colorFamilies:['Beige','Gris','Noir'], finishes:['Naturel','Grip R11'],
      images:[img('https://viewceramiche.com/wp-content/uploads/2023/11/Docks-Grigio-700x-300x300.jpg','Docks Grigio · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/docks-en/', sourceLabel:'Tarif public View n°24 · Tarif net FR CL 0226', availability:'Sur demande auprès de VIEW',
      variants:[
        v('docks-100','100×100','8,5 mm','Naturel',74,18),
        v('docks-100-20','100×100','20 mm','Grip R11/C',100,null,{proPalette:29.5,proDetail:31.5})
      ]
    },
    {
      id:'view-digione', slug:'digione', name:'DIGIONE', collection:'Digione',
      category:'Carrelage effet pierre', effect:'Pierre',
      description:'Pierre 60×90 en Oro, Perla et Grigio. Version 20 mm Grip disponible en Oro.',
      formats:['60×90'], colors:['Oro','Perla','Grigio'], colorFamilies:['Beige','Gris'], finishes:['Naturel','Grip R11'],
      images:[img('https://viewceramiche.com/wp-content/uploads/2023/11/Digione-Perla-2000x-600x424.jpg','Digione Perla · View Ceramica')],
      sourceLabel:'Tarif public View n°24 · Tarif net FR CL 0226', availability:'Sur demande auprès de VIEW',
      variants:[
        v('dig-6090','60×90','10 mm','Naturel',60,15.5),
        v('dig-6090-20','60×90','20 mm','Grip R11/C',90,null,{colors:['Oro'],proPalette:33,proDetail:35,note:'Tarif 20 mm série Pierres.'})
      ]
    },
    {
      id:'view-corso', slug:'corso', name:'CORSO', collection:'Corso',
      category:'Carrelage effet pierre', effect:'Pierre',
      description:'Collection pierre en Avorio et Beige, avec finitions Naturel, Vintage, Grip et Burattato à bords cassés.',
      formats:['30×60','60×60','60×90','60×120','120×120','Modulo A'], colors:['Avorio','Beige'], colorFamilies:['Blanc','Beige'], finishes:['Naturel','Vintage','Grip R11','Burattato'],
      images:[img('https://viewceramiche.com/wp-content/uploads/2023/12/Corso-Beige-2000x-600x445.jpg','Corso Beige · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/corso/', sourceLabel:'Tarif public View n°24 · Tarif net FR CL 0226', availability:'Sur demande auprès de VIEW',
      variants:[
        v('corso-120','120×120','10 mm','Naturel',78,20),
        v('corso-120-v','120×120','10 mm','Vintage',95,25),
        v('corso-60120','60×120','10 mm','Naturel',62,15.5),
        v('corso-60120-v','60×120','10 mm','Vintage',80,20.5),
        v('corso-6090','60×90','10 mm','Naturel',60,15.5),
        v('corso-6090-grip','60×90','10 mm','Grip R11',64,15.5),
        v('corso-6090-v','60×90','10 mm','Vintage',76,20.5),
        v('corso-6060','60×60','10 mm','Naturel',48,13),
        v('corso-6060-v','60×60','10 mm','Vintage',60,18),
        v('corso-3060','30×60','10 mm','Naturel',48,13),
        v('corso-3060-v','30×60','10 mm','Vintage',60,18),
        v('corso-burattato','60×90','10 mm','Burattato',128,34),
        v('corso-modulo','Modulo A 30×60 / 60×60 / 60×90','10 mm','Burattato',135,33),
        v('corso-6090-20','60×90','20 mm','Grip R11/C',90,null,{proPalette:33,proDetail:35,note:'Tarif 20 mm série Pierres.'})
      ]
    }
  ];
})();