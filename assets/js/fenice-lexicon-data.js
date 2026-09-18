(() => {
  'use strict';
  const GENERAL_PDF='https://lafenicegc.com/wp-content/uploads/pdf/Fenice_catalogo_Generale_2026-2027__AMERICA2_.pdf';
  const CERSAIE_PDF='assets/pdf/LA_FENICE_CERSAIE_2026_INTERACTIF.pdf';

  const general = [
    ['Amazing',104],['Antique Aurea',22],['Apache',112],['Briccole',340],
    ['Calcarea',118],['Circus',258],['Core',124],['Docks 25',132],
    ['Dolmen',138],['Étoile',146],['Ever',154],['Fiordi',160],
    ['Genesis',166],['Glowood',346],['Hollywood',352],['Il Travertino',172],
    ['Lapis',38],['Le Doghe',360],['LifesTile',386],['Lime Evolution',182],
    ['Lithos',192],['Lumiere',46],['Majestic',54],['Marble Velvet',74],
    ['Meco',204],['Natural',264],['Natural Resine',274],['Norbistone',224],
    ['Paris',286],['Patagonia',212],['Pietra De’ Medici',216],
    ['Polveri Vietresi',402],['Polveri Vietresi Wall',412],['Rovere',374],
    ['Saturn',230],['Segesta',86],['Shabby Wood',376],['Shapes',238],
    ['Slate',244],['Steel Art',288],['Stone',250],['Suveya',96],
    ['Tendance',380],['Touch',294],['Touch Evo',306],['Walk Materials',316],
    ['Woodland',382],['X Beton',322],['X Metal',330]
  ].map(([name, printedPage]) => ({
    id:'fenice-general-'+name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
    name,
    pdf:GENERAL_PDF,
    page:printedPage+2,
    printedPage,
    meta:`Catalogue général · p. ${printedPage}`,
    keywords:name
  }));

  const c = (name,page,meta,keywords='') => ({
    id:'fenice-cersaie-'+name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
    name,pdf:CERSAIE_PDF,page,meta:`${meta} · p. ${page}`,keywords
  });

  const cersaie = [
    c('Allure',5,'Collection','diamante perla ambra quarzo 120x120 60x120 90x90'),
    c('Allure · Diamante',5,'Coloris','allure diamante'),
    c('Allure · Perla',12,'Coloris / références','allure perla'),
    c('Allure · Ambra',12,'Coloris / références','allure ambra'),
    c('Allure · Quarzo',12,'Coloris / références','allure quarzo'),
    c('Allure · Dec. Incanto',11,'Décor','allure incanto'),
    c('Allure · Dec. Ricami Dorati',11,'Décor','allure ricami dorati'),
    c('Allure · Dec. Sinfonie Rosa',11,'Décor','allure sinfonie rosa'),
    c('Allure · Dec. Sinfonie Grigio',11,'Décor','allure sinfonie grigio'),

    c('Aspen',15,'Collection','white sand oak ash greige dark 60x60 20x120 7,5x60 7,5x30'),
    c('Aspen · White',24,'Coloris / références','aspen white'),
    c('Aspen · Sand',24,'Coloris / références','aspen sand'),
    c('Aspen · Oak',24,'Coloris / références','aspen oak'),
    c('Aspen · Ash',24,'Coloris / références','aspen ash'),
    c('Aspen · Greige',24,'Coloris / références','aspen greige'),
    c('Aspen · Dark',24,'Coloris / références','aspen dark'),
    c('Aspen · Parke',22,'Décor','parke white sand oak ash greige dark'),
    c('Aspen · Quadri',23,'Mosaïque / décor','quadri dark oak ash greige white sand'),
    c('Aspen · Intreccio',23,'Mosaïque / décor','intreccio white ash oak dark greige sand'),
    c('Aspen · Stick',23,'Mosaïque / décor','stick sand oak ash white greige dark'),
    c('Aspen · Girandola',23,'Mosaïque / décor','girandola white oak greige ash sand'),
    c('Aspen · Tatami',23,'Décor','tatami white sand oak ash greige dark'),

    c('City Loft',27,'Collection','tokyo new york milano berlino oslo miami 120x120 60x120 60x60'),
    c('City Loft · Tokyo',40,'Coloris / références','city loft tokyo'),
    c('City Loft · New York',40,'Coloris / références','city loft new york'),
    c('City Loft · Milano',40,'Coloris / références','city loft milano'),
    c('City Loft · Berlino',40,'Coloris / références','city loft berlino'),
    c('City Loft · Oslo',40,'Coloris / références','city loft oslo'),
    c('City Loft · Miami',40,'Coloris / références','city loft miami'),
    c('City Loft · Bamboo Warm',38,'Décor','bamboo warm'),
    c('City Loft · Bamboo Cold',38,'Décor','bamboo cold'),
    c('City Loft · Trame Mix',38,'Décor','trame mix'),
    c('City Loft · Capsul',38,'Décor','capsul'),
    c('City Loft · Stream',39,'Décor','stream'),
    c('City Loft · Hexa',39,'Décor','hexa'),

    c('Heritage',43,'Collection','bianco gioia calacatta oro madreperla tortora chiaro cashmere tabacco brown nero antico calacatta cardinale rosso francia verde smeraldo'),
    c('Heritage · Bianco Gioia',52,'Coloris / références','heritage bianco gioia'),
    c('Heritage · Calacatta Oro',52,'Coloris / références','heritage calacatta oro'),
    c('Heritage · Madreperla',52,'Coloris / références','heritage madreperla'),
    c('Heritage · Tortora Chiaro',52,'Coloris / références','heritage tortora chiaro'),
    c('Heritage · Cashmere',52,'Coloris / références','heritage cashmere'),
    c('Heritage · Tabacco Brown',52,'Coloris / références','heritage tabacco brown'),
    c('Heritage · Nero Antico',52,'Coloris / références','heritage nero antico'),
    c('Heritage · Calacatta Cardinale',52,'Coloris / références','heritage calacatta cardinale'),
    c('Heritage · Rosso Francia',52,'Coloris / références','heritage rosso francia'),
    c('Heritage · Verde Smeraldo',52,'Coloris / références','heritage verde smeraldo'),
    c('Heritage · Mosaico Diamond 1',51,'Mosaïque','diamond nero bianco tabacco madreperla verde calacatta rosso'),
    c('Heritage · Mosaico Hexagon T16',51,'Mosaïque','hexagon bianco calacatta madreperla tortora tabacco nero rosso cashmere verde'),
    c('Heritage · Mosaico Basket Tumble',51,'Mosaïque','basket tumble'),
    c('Heritage · Mosaico Domino',51,'Mosaïque','domino'),
    c('Heritage · Mosaico Piramid',51,'Mosaïque','piramid'),
    c('Heritage · Mosaico Stick',51,'Mosaïque','stick'),

    c('Oykos',55,'Collection','white ivory beige taupe grey 120x120 90x90 60x120 60x60'),
    c('Oykos · White',62,'Coloris / références','oykos white'),
    c('Oykos · Ivory',62,'Coloris / références','oykos ivory'),
    c('Oykos · Beige',62,'Coloris / références','oykos beige'),
    c('Oykos · Taupe',62,'Coloris / références','oykos taupe'),
    c('Oykos · Grey',62,'Coloris / références','oykos grey'),
    c('Oykos · Dec. Prism',58,'Décor','oykos prism'),

    c('Oykos Fossil',57,'Collection','white ivory beige taupe grey 60x60 30x60'),
    c('Oykos Fossil · White',64,'Coloris / références','oykos fossil white'),
    c('Oykos Fossil · Ivory',64,'Coloris / références','oykos fossil ivory'),
    c('Oykos Fossil · Beige',64,'Coloris / références','oykos fossil beige'),
    c('Oykos Fossil · Taupe',64,'Coloris / références','oykos fossil taupe'),
    c('Oykos Fossil · Grey',64,'Coloris / références','oykos fossil grey')
  ];

  window.LRF_FENICE_LEXICON = {
    defaultCatalogue:'cersaie-2026',
    catalogues:[
      {
        id:'general-2026-2027',
        label:'Catalogue Général 2026/2027',
        subtitle:`${general.length} collections · PDF officiel haute définition`,
        entries:general
      },
      {
        id:'cersaie-2026',
        label:'Nouveautés Cersaie 2026',
        subtitle:`${cersaie.length} références, coloris et décors · PDF Le Roy Factory`,
        entries:cersaie
      }
    ]
  };
})();