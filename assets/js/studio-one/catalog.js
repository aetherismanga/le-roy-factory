/* STUDIO ONE only. Prices preserved from the C1 25/09/2026 grid and RANDAL V04 pp.38/41. */
(function(){
"use strict";
var M=[
 {name:'2 tiroirs',sub:'H 54 cm · P 46 cm',height:54,base:'13692',top:'14215',sans:[210,220,250,259],avec:[245,264,303,321],drawers:2},
 {name:'3 tiroirs',sub:'H 91 cm · P 46 cm',height:91,base:'13693',top:'14216',sans:[278,301,338,353],avec:[313,345,391,415],drawers:3},
 {name:'1 tiroir XL',sub:'H 37,5 cm · P 46 cm',height:37.5,base:'13691',top:'14178',sans:[188,199,228,237],avec:[223,243,281,299],drawers:1},
 {name:'2 tiroirs XL',sub:'H 75 cm · P 46 cm',height:75,base:'14176',top:'14214',sans:[231,242,275,285],avec:[266,286,328,347],drawers:2}
];
var colors=[
 {name:'Roble Amazona',code:'ROBLE',wood:['#bda084','#ba9472','#d6baa0']},
 {name:'Serenade Alba',code:'ALBA',wood:['#c4ae94','#d3bda4','#a58b72']},
 {name:'Nogal Valentina',code:'NOGAL',wood:['#53433e','#7e6256','#453e41']},
 {name:'White Bolero',code:'WHITE',solid:'#dfdeda'},
 {name:'Azul Acero',code:'AZUL',solid:'#61717c'},
 {name:'Gris Tórtora',code:'GRIS',solid:'#5e5559'},
 {name:'Biscuit',code:'BISC.',solid:'#c9b29a'},
 {name:'Muted Green',code:'GREEN',solid:'#949280'}
];
var sizes=[{lo:40,hi:60,ref:'60',label:'40–60 cm'},{lo:61,hi:80,ref:'80',label:'61–80 cm'},{lo:81,hi:100,ref:'100',label:'81–100 cm'},{lo:101,hi:120,ref:'120',label:'101–120 cm'}];
var INSET={
 Sella:{
  gloss:{60:[115,'2215'],70:[130,'2808'],80:[136,'2171'],90:[165,'13237'],100:[176,'3279'],120:[385,'6389'],'120double':[318,'2809']}
 },
 Tampa:{
  gloss:{60:[122,'6227'],70:[138,'7781'],80:[142,'6228'],90:[173,'7782'],100:[192,'6229'],120:[279,'6232'],'120double':[323,'6235']},
  matte:{60:[203,'13039'],70:[264,'13040'],80:[264,'13041'],90:[316,'13042'],100:[332,'13043'],120:[475,'13044'],'120double':[499,'13045']},
  black:{60:[203,'13039'],70:[264,'13040'],80:[264,'13041'],90:[316,'13042'],100:[332,'13043'],120:[475,'13044'],'120double':[499,'13045']}
 }
};
var INSET_COLORS=[{code:'gloss',name:'Blanc brillant',hex:'#fafaf7'},{code:'matte',name:'Blanc mat',hex:'#e5e4df'},{code:'black',name:'Noir mat',hex:'#363638'}];
var VESSEL_COLORS=[
 {code:'gloss',name:'Blanc brillant',hex:'#f6f5f1',Neris:'9567',Torne:'9559'},
 {code:'pure',name:'Blanc pur',hex:'#ffffff',Neris:'9560',Torne:'9552'},
 {code:'anthracite',name:'Anthracite',hex:'#858689',Neris:'9564',Torne:'9556'},
 {code:'black',name:'Noir mat',hex:'#424042',Neris:'11371',Torne:'10444'},
 {code:'taupe',name:'Taupe',hex:'#aa9a8a',Neris:'9561',Torne:'9553'},
 {code:'namibie',name:'Vert Namibie',hex:'#767765',Neris:'9562',Torne:'9554'},
 {code:'ivory',name:'Blanc ivoire',hex:'#e8e6db',Neris:'9563',Torne:'9555'},
 {code:'pink',name:'Rose Nadir',hex:'#c6a397',Neris:'9566',Torne:'9558'},
 {code:'blue',name:'Bleu Kivu',hex:'#123755',Neris:'9565',Torne:'9557'}
];
var MIRROR_OPTIONS={
 Basic:[['60 × 80 cm','10129',59],['70 × 60 cm','12449',55],['100 × 60 cm','11054',71],['120 × 60 cm','10130',78]],
 'Zen LED':[['60 × 80 cm','11713',184],['80 × 80 cm','11533',205],['100 × 80 cm','11714',229],['120 × 80 cm','11523',263]],
 'Ilse LED':[['60 × 80 cm','12743',389],['80 × 80 cm','12744',434],['100 × 80 cm','12745',481],['120 × 80 cm','12746',533]],
 'Cápsula LED':[['45 × 90 cm','12741',347]],
 'Miroir métallique rectangulaire':[['80 × 60 cm','3731',215],['120 × 75 cm','10572',340]],
 'Miroir métallique rond':[['Ø 60 cm','3717',162]]
};
var MIRROR_METAL_REFS={
 'Miroir métallique rectangulaire':{'80 × 60 cm':{Noir:'3731','Doré':'3727',Bronze:'3728',Argent:'3730'},'120 × 75 cm':{Noir:'10572','Doré':'10574',Bronze:'10575',Argent:'10577'}},
 'Miroir métallique rond':{'Ø 60 cm':{Noir:'3717','Doré':'3722',Bronze:'3723',Argent:'3725'}}
};
const finishes=colors.map(c=>({...c,hex:c.solid||c.wood[0],texture:({ROBLE:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/studio-one/roble.webp',ALBA:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/studio-one/serenade-alba.webp',NOGAL:'https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/studio-one/nogal-valentina.webp'})[c.code]}));
window.StudioOneCatalog=Object.freeze({models:M,finishes,sizes,inset:INSET,insetColors:INSET_COLORS,vesselColors:VESSEL_COLORS,mirrors:MIRROR_OPTIONS,mirrorRefs:MIRROR_METAL_REFS,
 column:{name:'Colonne STUDIO ONE · 1 porte',width:38,height:132,depth:27,ref:'14177',price:177},
 vessels:{Neris:{width:46,depth:33,height:14,minWidth:50},Torne:{width:37,depth:37,height:12,minWidth:40}},
 source:'Meubles C1 · 25/09/2026 ; vasques PRO HT = public HT RANDAL V04 / 2 ; miroirs public HT indicatif'});
})();
