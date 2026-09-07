'use strict';
const O={};
const A=(ref,color,finish,pages)=>[ref,color,'Carreau piscine','15 × 15 cm',finish,56,1.26,17.30,60,75.60,null,'MQ',1.26,false,null,null,null];

O['pool-abyss']={n:'Pool Surfaces — Abyss',p:'10–15',c:['Tikal','Port Royal','Atlantis','Thonis'],r:[
  A('2071517','Tikal','Glossy · 7,5 mm'),
  A('2071510','Port Royal','Glossy · 7,5 mm'),
  A('2071590','Atlantis','Glossy · 7,5 mm'),
  A('2071512','Thonis','Glossy · 7,5 mm')
]};
O['pool-acqua']={n:'Pool Surfaces — Acqua',p:'16–21',c:['Light','River','Deep','Cobalt'],r:[
  A('04A1510','Light','Glossy · 7,5 mm'),
  A('04A1530','River','Glossy · 7,5 mm'),
  A('04A1520','Deep','Glossy · 7,5 mm'),
  A('04A1540','Cobalt','Glossy · 7,5 mm')
]};
O['pool-greek-isles']={n:'Pool Surfaces — Greek Isles',p:'22–27',c:['Crete'],r:[
  A('2101580','Crete','Matt & glossy grit · 7,5 mm')
]};
O['pool-italian-slate']={n:'Pool Surfaces — Italian Slate',p:'28–33',c:['Naples','Firenze'],r:[
  A('2091540','Naples','Matt · 7,5 mm'),
  A('2091511','Firenze','Matt · 7,5 mm')
]};
O['pool-lakes']={n:'Pool Surfaces — Lakes',p:'34–39',c:['Shasta','Tahoe'],r:[
  A('LAKSHA6','Shasta','Glossy · 7,5 mm'),
  A('LAKTAH6','Tahoe','Glossy · 7,5 mm')
]};
O['pool-mare']={n:'Pool Surfaces — Mare',p:'40–45',c:['Viridus','Altum','Caeles'],r:[
  A('2151590','Viridus','Matt & glossy grit · 7,5 mm'),
  A('2151515','Altum','Matt & glossy grit · 7,5 mm'),
  A('2151510','Caeles','Matt & glossy grit · 7,5 mm')
]};
O['pool-nevada']={n:'Pool Surfaces — Nevada',p:'46–51',c:['Mohave','Carson','Vegas','Reno'],r:[
  A('NEMOH66','Mohave','Matt · 7,5 mm'),
  A('NECAR66','Carson','Matt · 7,5 mm'),
  A('NEVEG66','Vegas','Matt · 7,5 mm'),
  A('NEREN66','Reno','Matt · 7,5 mm')
]};
O['pool-pacific']={n:'Pool Surfaces — Pacific',p:'52–57',c:['Japan','Mex','Australia'],r:[
  A('04B1510','Japan','Glossy 3D · 7,5 mm'),
  A('04B1520','Mex','Glossy 3D · 7,5 mm'),
  A('04B1530','Australia','Glossy 3D · 7,5 mm')
]};
O['pool-quantum']={n:'Pool Surfaces — Quantum',p:'58–63',c:['Prism','Vector','Nova'],r:[
  A('04LBN02','Prism','Glossy 3D · 7,5 mm'),
  A('04LBN03','Vector','Glossy 3D · 7,5 mm'),
  A('04LBN01','Nova','Glossy 3D · 7,5 mm')
]};
O['pool-sea-breeze']={n:'Pool Surfaces — Sea Breeze',p:'64–69',c:['Sky','Teal'],r:[
  A('2011570','Sky','Glossy · 7,5 mm'),
  A('2011590','Teal','Glossy · 7,5 mm')
]};
O['pool-seychelles']={n:'Pool Surfaces — Seychelles',p:'70–75',c:['Original','Blue','Cobalt','Light','Pearl'],r:[
  A('04C1510','Original','Matt & glossy grit · 7,5 mm'),
  A('04C1530','Blue','Matt & glossy grit · 7,5 mm'),
  A('04C1540','Cobalt','Matt & glossy grit · 7,5 mm'),
  A('04C1550','Light','Matt & glossy grit · 7,5 mm'),
  A('04C1520','Pearl','Matt & glossy grit · 7,5 mm')
]};
O['pool-twelfth-night']={n:'Pool Surfaces — Twelfth Night',p:'76–81',c:['Orsino','Viola'],r:[
  A('NETN615','Orsino','Matt & glossy grit · 7,5 mm'),
  A('NETN639','Viola','Matt & glossy grit · 7,5 mm')
]};

module.exports=O;
