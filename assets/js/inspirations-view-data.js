(() => {
  'use strict';
  if (Array.isArray(window.VIEW_CATALOGUE) && window.VIEW_CATALOGUE.length) return;

  const img=(url,alt)=>({url,alt});
  const pack=(m2Box,pcsBox,kgBox,boxesPallet,m2Pallet,kgPallet)=>({m2Box,pcsBox,kgBox,boxesPallet,m2Pallet,kgPallet});
  const v=(key,format,thickness,finish,publicPrice,proPrice,extra={})=>({key,format,thickness,finish,publicPrice,proPrice,unit:'m²',...extra});

  window.VIEW_CATALOGUE=[
    {
      id:'view-lux',slug:'lux',name:'LUX',collection:'I Legni di View · LUX',
      category:'Carrelage effet bois',effect:'Bois',
      description:'Grès cérame effet bois rectifié, épaisseur 10 mm. Quatre teintes et version Grip R11 sur Topazio et Perla.',
      formats:['20×120','30×120'],colors:['Agata','Topazio','Perla','Giada'],colorFamilies:['Bois','Beige','Marron'],finishes:['Naturel R10/A+B','Grip R11'],
      images:[img('assets/img/view.png','LUX · View Ceramica')],
      sourceLabel:'Listino VIEW n°24 · Prix nets FR CL 0226 · Catalogue I Legni',availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('lux-20x120-nat','20×120','10 mm','Naturel R10/A+B',50,14,{colors:['Agata','Topazio','Perla','Giada'],refs:{Agata:'VLX21210LR',Topazio:'VLX21220LR',Perla:'VLX21240LR',Giada:'VLX21290LR'},pack:pack(.96,4,22,48,46.08,1056)}),
        v('lux-20x120-grip','20×120','10 mm','Grip R11',54,14,{colors:['Topazio','Perla'],refs:{Topazio:'VLX21220LSR',Perla:'VLX21240LSR'},pack:pack(.96,4,22,48,46.08,1056)}),
        v('lux-30x120-nat','30×120','10 mm','Naturel R10/A+B',50,14,{colors:['Agata','Topazio','Perla','Giada'],refs:{Agata:'VLX31210LR',Topazio:'VLX31220LR',Perla:'VLX31240LR',Giada:'VLX31290LR'},pack:pack(1.44,4,32.8,24,34.56,787)})
      ]
    },
    {
      id:'view-rovere-forte',slug:'rovere-forte',name:'ROVERE FORTE',collection:'I Legni di View · Rovere Forte',
      category:'Carrelage effet bois',effect:'Bois',
      description:'Grès cérame imitation chêne rectifié, épaisseur 9,5 mm. Quatre couleurs en 20×120, trois en 30×120 et Honey Grip R11.',
      formats:['20×120','30×120'],colors:['Cream','Honey','Nut','Soft'],colorFamilies:['Bois','Beige','Marron'],finishes:['Naturel R10/A+B','Grip R11'],
      images:[img('assets/img/view.png','Rovere Forte · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/i-legni-di-view-rovere-forte-2/',sourceLabel:'Listino VIEW n°24 · Prix nets FR CL 0226',availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('rf-20x120-nat','20×120','9,5 mm','Naturel R10/A+B',50,14,{colors:['Cream','Honey','Nut','Soft'],refs:{Cream:'VRF21210LR',Honey:'VRF21220LR',Nut:'VRF21225LR',Soft:'VRF21215LR'},pack:pack(1.44,6,29,36,51.84,1044)}),
        v('rf-20x120-grip','20×120','9,5 mm','Grip R11',54,14,{colors:['Honey'],refs:{Honey:'VRF21220LSR'},pack:pack(1.44,6,29,36,51.84,1044)}),
        v('rf-30x120-nat','30×120','9,5 mm','Naturel R10/A+B',50,14,{colors:['Cream','Honey','Nut'],refs:{Cream:'VRF31210LR',Honey:'VRF31220LR',Nut:'VRF31225LR'},pack:pack(1.44,4,29.4,36,51.84,1058)})
      ]
    },
    {
      id:'view-blois',slug:'blois',name:'BLOIS',collection:'Blois',
      category:'Carrelage effet pierre',effect:'Pierre',
      description:'Pierre contemporaine rectifiée en Beige, Gris et Anthracite. Intérieur 10,5 mm et terrasse 90×90 en 20 mm Grip.',
      formats:['30×60','60×60','60×90','90×90'],colors:['Beige','Gris','Anthracite'],colorFamilies:['Beige','Gris','Noir'],finishes:['Naturel R10/A+B','Grip R11/A+B+C'],
      images:[img('https://viewceramiche.com/wp-content/uploads/2023/11/Blois-Gris-2000x-600x424.jpg','Blois Gris · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/blois/',sourceLabel:'Listino VIEW n°24 · Prix nets FR CL 0226',availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('blois-90','90×90','10,5 mm','Naturel R10/A+B',64,16.5,{colors:['Beige','Gris','Anthracite'],refs:{Beige:'VBL920R',Gris:'VBL940R',Anthracite:'VBL970R'},pack:pack(1.62,2,35,25,40.5,875)}),
        v('blois-6090','60×90','10,5 mm','Naturel R10/A+B',60,15.5,{colors:['Beige','Gris','Anthracite'],refs:{Beige:'VBL6920LR',Gris:'VBL6940LR',Anthracite:'VBL6970LR'},pack:pack(1.08,2,23.55,45,48.6,1060)}),
        v('blois-6090-grip','60×90','10,5 mm','Grip R11/A+B+C',64,15.5,{colors:['Beige','Gris','Anthracite'],refs:{Beige:'VBL6920LSR',Gris:'VBL6940LSR',Anthracite:'VBL6970LSR'},pack:pack(1.08,2,23.55,45,48.6,1060)}),
        v('blois-6060','60×60','10,5 mm','Naturel R10/A+B',48,13,{colors:['Beige','Gris','Anthracite'],refs:{Beige:'VBL620R',Gris:'VBL640R',Anthracite:'VBL670R'},pack:pack(1.08,3,23,40,43.2,920)}),
        v('blois-3060','30×60','10,5 mm','Naturel R10/A+B',48,13,{colors:['Beige','Gris','Anthracite'],refs:{Beige:'VBL620LR',Gris:'VBL640LR',Anthracite:'VBL670LR'},pack:pack(1.08,6,23,40,43.2,920)}),
        v('blois-90-20','90×90','20 mm','Grip R11/A+B+C',95,null,{colors:['Beige','Gris','Anthracite'],refs:{Beige:'VBL92020R',Gris:'VBL94020R',Anthracite:'VBL97020R'},proPalette:27.5,proDetail:29.5,pack:pack(.81,1,36,25,20.25,900)})
      ]
    },
    {
      id:'view-ardenne',slug:'ardenne',name:'ARDENNE',collection:'Ardenne',
      category:'Carrelage effet pierre',effect:'Pierre',
      description:'Pierre rectifiée en Avorio, Sabbia, Grigio et Antracite, du 30×60 à la dalle 120×278. Versions extérieures 20 mm Grip.',
      formats:['30×60','60×60','60×120','80×80','120×120','120×278'],colors:['Avorio','Sabbia','Grigio','Antracite'],colorFamilies:['Blanc','Beige','Gris','Noir'],finishes:['Naturel R10/A+B','Grip R11/A+B+C','Grande dalle 6,5 mm'],
      images:[img('https://viewceramiche.com/wp-content/uploads/2023/11/Ardenne-Sabbia-2000x-300x300.jpg','Ardenne Sabbia · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/ardenne-en/',sourceLabel:'Listino VIEW n°24 · Prix nets FR CL 0226',availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('ard-120','120×120','9,5 mm','Naturel R10/A+B',78,20,{colors:['Avorio','Sabbia','Grigio','Antracite'],refs:{Avorio:'VAR112010R',Sabbia:'VAR112020R',Grigio:'VAR112040R',Antracite:'VAR112070R'},pack:pack(1.44,1,32.5,40,57.6,1300)}),
        v('ard-80','80×80','9,5 mm','Naturel R10/A+B',61,16.5,{colors:['Avorio','Sabbia','Grigio','Antracite'],refs:{Avorio:'VAR810R',Sabbia:'VAR820R',Grigio:'VAR840R',Antracite:'VAR870R'},pack:pack(1.28,2,28,48,61.44,1340)}),
        v('ard-60120','60×120','9,5 mm','Naturel R10/A+B',60,15.5,{colors:['Avorio','Sabbia','Grigio','Antracite'],refs:{Avorio:'VAR61210LR',Sabbia:'VAR61220LR',Grigio:'VAR61240LR',Antracite:'VAR61270LR'},pack:pack(1.44,2,28.88,36,51.84,1037)}),
        v('ard-6060','60×60','9,5 mm','Naturel R10/A+B',48,13,{colors:['Avorio','Sabbia','Grigio','Antracite'],refs:{Avorio:'VAR610R',Sabbia:'VAR620R',Grigio:'VAR640R',Antracite:'VAR670R'},pack:pack(1.44,4,28.6,30,43.2,858)}),
        v('ard-3060','30×60','9,5 mm','Naturel R10/A+B',48,13,{colors:['Avorio','Sabbia','Grigio','Antracite'],refs:{Avorio:'VAR610LR',Sabbia:'VAR620LR',Grigio:'VAR640LR',Antracite:'VAR670LR'},pack:pack(1.44,8,28.6,32,46.08,915)}),
        v('ard-80-20','80×80','20 mm','Grip R11/A+B+C',92,null,{colors:['Sabbia','Grigio','Antracite'],refs:{Sabbia:'VAR82020R',Grigio:'VAR84020R',Antracite:'VAR87020R'},proPalette:27.5,proDetail:29.5,pack:pack(.64,1,27.9,48,30.72,1339)}),
        v('ard-60-20','60×60','20 mm','Grip R11/A+B+C',80,null,{colors:['Sabbia','Grigio','Antracite'],refs:{Sabbia:'VAR62020R',Grigio:'VAR64020R',Antracite:'VAR67020R'},proPalette:22,proDetail:24,pack:pack(.72,2,33,30,21.6,990)}),
        v('ard-slab','120×278','6,5 mm','Naturel R10/A+B',108,39.02,{colors:['Avorio','Sabbia','Grigio'],refs:{Avorio:'VAR27810LR',Sabbia:'VAR27820LR',Grigio:'VAR27840LR'},pack:pack(3.33,1,51.6,18,59.94,929),note:'Net calculé selon remise slabs FR CL 0226 : -50% -15% -15%.'})
      ]
    },
    {
      id:'view-docks',slug:'docks',name:'DOCKS',collection:'Docks',
      category:'Carrelage effet pierre',effect:'Pierre / béton',
      description:'Grand format rectifié 100×100 au caractère minéral. Version intérieure 8,5 mm et extérieure 20 mm Grip.',
      formats:['100×100'],colors:['Sabbia','Grigio','Antracite'],colorFamilies:['Beige','Gris','Noir'],finishes:['Naturel R10/A+B','Grip R11/A+B+C'],
      images:[img('https://viewceramiche.com/wp-content/uploads/2023/11/Docks-Grigio-700x-300x300.jpg','Docks Grigio · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/docks-en/',sourceLabel:'Listino VIEW n°24 · Prix nets FR CL 0226',availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('docks-100','100×100','8,5 mm','Naturel R10/A+B',74,18,{colors:['Sabbia','Grigio','Antracite'],refs:{Sabbia:'VDK10020R',Grigio:'VDK10040R',Antracite:'VDK10070R'},pack:pack(2,2,40,24,48,960)}),
        v('docks-100-20','100×100','20 mm','Grip R11/A+B+C',100,null,{colors:['Sabbia','Grigio','Antracite'],refs:{Sabbia:'VDK1002020R',Grigio:'VDK1004020R',Antracite:'VDK1007020R'},proPalette:29.5,proDetail:31.5,pack:pack(1,1,46.6,21,21,979)})
      ]
    },
    {
      id:'view-digione',slug:'digione',name:'DIGIONE',collection:'Digione',
      category:'Carrelage effet pierre',effect:'Pierre',
      description:'Pierre rectifiée 60×90 en Oro, Perla et Grigio. La version extérieure 20 mm Grip est disponible en Oro.',
      formats:['60×90'],colors:['Oro','Perla','Grigio'],colorFamilies:['Beige','Gris'],finishes:['Naturel R10/A+B','Grip R11/A+B+C'],
      images:[img('https://viewceramiche.com/wp-content/uploads/2023/11/Digione-Perla-2000x-600x424.jpg','Digione Perla · View Ceramica')],
      sourceLabel:'Listino VIEW n°24 · Prix nets FR CL 0226',availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('dig-6090','60×90','10 mm','Naturel R10/A+B',60,15.5,{colors:['Oro','Perla','Grigio'],refs:{Oro:'VDJ6920LR',Perla:'VDJ6930LR',Grigio:'VDJ6940LR'},pack:pack(1.08,2,23.55,45,48.6,1060)}),
        v('dig-6090-20','60×90','20 mm','Grip R11/A+B+C',90,null,{colors:['Oro'],refs:{Oro:'VDJ6920L20R'},proPalette:33,proDetail:35,pack:pack(.54,1,24.1,48,25.92,1157),note:'Tarif net 20 mm série « Pietre ».'})
      ]
    },
    {
      id:'view-corso',slug:'corso',name:'CORSO',collection:'Corso',
      category:'Carrelage effet pierre',effect:'Pierre / travertin',
      description:'Collection pierre / travertin rectifiée en Avorio et Beige, avec finitions Naturel, Vintage, Grip et Burattato+ à bords cassés.',
      formats:['30×60','60×60','60×90','60×120','120×120','Modulo A'],colors:['Avorio','Beige'],colorFamilies:['Blanc','Beige'],finishes:['Naturel R10/A+B','Vintage','Grip R11/A+B+C','Burattato+'],
      images:[img('https://viewceramiche.com/wp-content/uploads/2023/12/Corso-Beige-2000x-600x445.jpg','Corso Beige · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/corso-fr/',sourceLabel:'Listino VIEW n°24 · Prix nets FR CL 0226',availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('corso-120','120×120','10 mm','Naturel R10/A+B',78,20,{colors:['Avorio','Beige'],refs:{Avorio:'VCR112010R',Beige:'VCR112020R'},pack:pack(1.44,1,32.5,40,57.6,1300)}),
        v('corso-120-v','120×120','10 mm','Vintage',95,25,{colors:['Avorio','Beige'],refs:{Avorio:'VCR112010PR',Beige:'VCR112020PR'},pack:pack(1.44,1,32.5,40,57.6,1300)}),
        v('corso-60120','60×120','10 mm','Naturel R10/A+B',62,15.5,{colors:['Avorio','Beige'],refs:{Avorio:'VCR61210LR',Beige:'VCR61220LR'},pack:pack(1.44,2,32.5,40,57.6,1300)}),
        v('corso-60120-v','60×120','10 mm','Vintage',80,20.5,{colors:['Avorio','Beige'],refs:{Avorio:'VCR61210LPR',Beige:'VCR61220LPR'},pack:pack(1.44,2,32.5,40,57.6,1300)}),
        v('corso-6090','60×90','10 mm','Naturel R10/A+B',60,15.5,{colors:['Avorio','Beige'],refs:{Avorio:'VCR6910LR',Beige:'VCR6920LR'},pack:pack(1.08,2,25,45,48.6,1125)}),
        v('corso-6090-grip','60×90','10 mm','Grip R11/A+B+C',64,15.5,{colors:['Avorio','Beige'],refs:{Avorio:'VCR6910LSR',Beige:'VCR6920LSR'},pack:pack(1.08,2,25,45,48.6,1125)}),
        v('corso-6090-v','60×90','10 mm','Vintage',76,20.5,{colors:['Avorio','Beige'],refs:{Avorio:'VCR6910LPR',Beige:'VCR6920LPR'},pack:pack(1.08,2,25,45,48.6,1125)}),
        v('corso-6060','60×60','10 mm','Naturel R10/A+B',48,13,{colors:['Avorio','Beige'],refs:{Avorio:'VCR610R',Beige:'VCR620R'},pack:pack(1.08,3,24,40,43.2,960)}),
        v('corso-6060-v','60×60','10 mm','Vintage',60,18,{colors:['Avorio','Beige'],refs:{Avorio:'VCR610PR',Beige:'VCR620PR'},pack:pack(1.08,3,24,40,43.2,960)}),
        v('corso-3060','30×60','10 mm','Naturel R10/A+B',48,13,{colors:['Avorio','Beige'],refs:{Avorio:'VCR610LR',Beige:'VCR620LR'},pack:pack(1.08,6,24,40,43.2,960)}),
        v('corso-3060-v','30×60','10 mm','Vintage',60,18,{colors:['Avorio','Beige'],refs:{Avorio:'VCR610LPR',Beige:'VCR620LPR'},pack:pack(1.08,6,24,40,43.2,960)}),
        v('corso-burattato','60×90','10 mm','Burattato+',128,34,{colors:['Avorio','Beige'],refs:{Avorio:'VCR6910LRB',Beige:'VCR6920LRB'},pack:pack(1.08,2,25,45,48.6,1125)}),
        v('corso-modulo','Modulo A 30×60 / 60×60 / 60×90','10 mm','Burattato+',135,33,{colors:['Avorio','Beige'],refs:{Avorio:'VCR6910MDB',Beige:'VCR6920MDB'}}),
        v('corso-6090-20','60×90','20 mm','Grip R11/A+B+C',90,null,{colors:['Avorio','Beige'],refs:{Avorio:'VCR6910L20R',Beige:'VCR6920L20R'},proPalette:33,proDetail:35,pack:pack(.54,1,24,48,25.92,1152),note:'Tarif net 20 mm série « Pietre ».'})
      ]
    }
  ];
})();