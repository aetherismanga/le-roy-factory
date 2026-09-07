'use strict';

const lot2 = {};
const R = (ref,color,kind,format,finish,pcsBox=null,sqmBox=null,kgBox=null,boxesPal=null,sqmPal=null,kgPal=null,unit=null,perBox=null,orderOnly=false,sqmPiece=null,kgPiece=null,pcsPal=null) =>
  [ref,color,kind,format,finish,pcsBox,sqmBox,kgBox,boxesPal,sqmPal,kgPal,unit,perBox,orderOnly,sqmPiece,kgPiece,pcsPal];

// BAVARIA STONE — Catalogue Général ELIOS 2026, pp. 94–103.
lot2['bavaria-stone']={n:'Bavaria Stone',p:'94–103',c:['Stone'],r:[
  R('R931245','Stone','Dalle extérieure','100 × 100 cm','Outdoor R11 · Rectifié · 20 mm',1,1,44,24,24,1076,'MQ',1),
  R('R935X45','Stone','Dalle extérieure','50 × 100 cm','Outdoor R11 · Rectifié · 20 mm',2,1,44,24,24,1076,'MQ',1),
  R('0936A45','Stone','Carreau','60 × 120 cm','Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44),
  R('0936045','Stone','Carreau','60 × 60 cm','Rectifié · 8,5 mm',4,1.44,28,30,43.2,984,'MQ',1.44),
  R('0933645','Stone','Carreau','30 × 60 cm','Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26),
  R('0933145','Stone','Carreau','30,5 × 61 cm','8,5 mm',7,1.29,24,48,61.92,1152,'MQ',1.29),
  R('0933345','Stone','Carreau','30 × 30 cm','Rectifié · 8,5 mm',13,1.2,22.2,42,50.4,947,'MQ',1.2),
  R('093H145','Stone','Mosaïque','30 × 30 cm','Sur trame · 8,5 mm',6,.55,9.5,32,23.04,320,'MQ',.55),
  R('093BC45','Stone','Plinthe','6,2 × 61 cm','8,5 mm',15,null,16,null,null,null,'ML',9.15),
  R('093BF45','Stone','Plinthe','6 × 60 cm','Rectifié · 8,5 mm',15,null,16,null,null,null,'ML',9),
  R('093FF45','Stone','Plinthe','6 × 120 cm','Rectifié · 8,5 mm',8,null,21.3,null,null,null,'ML',9.6)
]};

// GRAND PLACE — Catalogue Général ELIOS 2026, pp. 116–125.
lot2['grand-place']={n:'Grand Place',p:'116–125',c:['Bruxelles','Antwerpen','Namur','Warm','Cold'],r:[
  R('R441280','Bruxelles','Dalle extérieure','100 × 100 cm','Outdoor R11 · Rectifié · 20 mm',1,1,39,24,24,956,'MQ',1),
  R('S446080','Bruxelles','Dalle extérieure','60 × 60 cm','Outdoor R11 · Rectifié · 20 mm',2,.72,33.28,32,23.04,1085,'MQ',.72),
  R('R441270','Antwerpen','Dalle extérieure','100 × 100 cm','Outdoor R11 · Rectifié · 20 mm',1,1,39,24,24,956,'MQ',1),
  R('S446070','Antwerpen','Dalle extérieure','60 × 60 cm','Outdoor R11 · Rectifié · 20 mm',2,.72,33.28,32,23.04,1085,'MQ',.72),
  R('R441240','Namur','Dalle extérieure','100 × 100 cm','Outdoor R11 · Rectifié · 20 mm',1,1,39,24,24,956,'MQ',1),
  R('S446040','Namur','Dalle extérieure','60 × 60 cm','Outdoor R11 · Rectifié · 20 mm',2,.72,33.28,32,23.04,1085,'MQ',.72),
  R('R4412D1','Warm','Pièce spéciale','Decoro Etnic C Warm · 100 × 100 cm','Outdoor R11 · Rectifié · 20 mm',1,1,39,24,24,932,'MQ',1),
  R('S4460D1','Warm','Pièce spéciale','Decoro Etnic C Warm · 60 × 60 cm','Outdoor R11 · Rectifié · 20 mm',2,.72,33.28,32,23.04,1085,'MQ',.72),
  R('R4412D2','Cold','Pièce spéciale','Decoro Etnic C Cold · 100 × 100 cm','Outdoor R11 · Rectifié · 20 mm',1,1,39,24,24,932,'MQ',1),
  R('S4460D2','Cold','Pièce spéciale','Decoro Etnic C Cold · 60 × 60 cm','Outdoor R11 · Rectifié · 20 mm',2,.72,33.28,32,23.04,1085,'MQ',.72)
]};

// HARMONY — Catalogue Général ELIOS 2026, pp. 126–137.
{
  const rows=[];
  const colors=[
    ['White','R941X00','R945X00','0946000','0943600','094H200','0943606','094B000','094BS00'],
    ['Grey','R941X80','R945X80','0946080','0943680','094H280','0943607','094B080','094BS80'],
    ['Black','R941X85','',       '0946085','0943685','094H285','0943609','094B085','094BS85'],
    ['Cream','R941X40','R945X40','0946040','0943640','094H240','0943608','094B040','094BS40'],
    ['Taupe','R941X60','',       '0946060','0943660','094H260','0943610','094B060','094BS60']
  ];
  for(const [color,r100,r50,r60,r30,mSq,canvas,b60,b100] of colors){
    rows.push(R(r100,color,'Carreau','100 × 100 cm','R10 · Rectifié · 8,5 mm',2,2,38,24,48,932,'MQ',2));
    if(r50) rows.push(R(r50,color,'Carreau','50 × 100 cm','R10 · Rectifié · 8,5 mm',2,1,19.5,48,48,951,'MQ',1));
    rows.push(R(r60,color,'Carreau','60 × 60 cm','R10 · Rectifié · 8,5 mm',4,1.44,28,30,43.2,984,'MQ',1.44));
    rows.push(R(r30,color,'Carreau','30 × 60 cm','R10 · Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26));
    rows.push(R(mSq,color,'Mosaïque','Mosaico Square · 28 × 35 cm','R10 · sur trame · 8,5 mm',6,.54,8.2,60,32.4,512,'MQ',.54));
    rows.push(R(canvas,color,'Pièce spéciale','Decoro Canvas · 30 × 60 cm','R10 · Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26));
    rows.push(R(b60,color,'Plinthe','6,5 × 60 cm','R10 · Rectifié · 8,5 mm',15,null,16.5,null,null,null,'ML',9));
    rows.push(R(b100,color,'Plinthe','6,5 × 100 cm','R10 · Rectifié · 8,5 mm',6,null,7.5,null,null,null,'ML',6));
    rows.push(R('',color,'Pièce spéciale','Gradino costa retta 33 × 60 cm','R10 · Rectifié · 8,5 mm',1,null,null,null,null,null,'PZ',1,true));
    rows.push(R('',color,'Pièce spéciale','Gradino costa retta angolo DX/SX 33 × 60 cm','R10 · Rectifié · 8,5 mm',1,null,null,null,null,null,'PZ',1,true));
  }
  rows.push(
    R('094H180','White','Mosaïque','Mosaico Optic Cold · 28 × 35 cm','R10 · sur trame · 8,5 mm',6,.54,8.2,60,32.4,512,'MQ',.54),
    R('094H140','Cream','Mosaïque','Mosaico Optic Warm · 28 × 35 cm','R10 · sur trame · 8,5 mm',6,.54,8.2,60,32.4,512,'MQ',.54),
    R('0943602','White','Pièce spéciale','Decoro Geometrie Cold · 30 × 60 cm','R10 · Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26),
    R('0943611','Cream','Pièce spéciale','Decoro Geometrie Warm · 30 × 60 cm','R10 · Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26),
    R('09436H2','White','Pièce spéciale','Decoro Paint Cold · 30 × 60 cm','R10 · Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26),
    R('09436H1','Cream','Pièce spéciale','Decoro Paint Warm · 30 × 60 cm','R10 · Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26),
    R('09413H2','White','Pièce spéciale','Decoro Paint Cold · 10 × 30 cm','R10 · Rectifié · 8,5 mm',33,1,18.9,null,null,null,'MQ',1),
    R('09413H1','Cream','Pièce spéciale','Decoro Paint Warm · 10 × 30 cm','R10 · Rectifié · 8,5 mm',33,1,18.9,null,null,null,'MQ',1)
  );
  lot2.harmony={n:'Harmony',p:'126–137',c:['White','Grey','Black','Cream','Taupe'],r:rows};
}

// MILLENNIUM QUARTZ — Catalogue Général ELIOS 2026, pp. 138–147.
{
  const rows=[];
  const cfg={
    Vulcano:{s:'90',out:'',small:null,h2:'03QH290',h1:'03QH190',bt:'03QBT90',step:''},
    Deserto:{s:'10',out:'03Q6C10',small:['03Q3111','03Q2410'],h2:'03QH210',h1:'03QH110',bt:'03QBT10',step:'03QL111'},
    Scoglio:{s:'60',out:'03Q6C60',small:['03Q3161','03Q2460'],h2:'03QH260',h1:'03QH160',bt:'03QBT60',step:'03QL161'},
    Roccia:{s:'70',out:'03Q6C70',small:['03Q3171','03Q2470'],h2:'03QH270',h1:'03QH170',bt:'03QBT70',step:'03QL171'},
    Terra:{s:'20',out:'03Q6C20',small:['03Q3121','03Q2420'],h2:'03QH220',h1:'03QH120',bt:'03QBT20',step:'03QL121'}
  };
  for(const [color,c] of Object.entries(cfg)){
    if(c.out) rows.push(R(c.out,color,'Dalle extérieure','60 × 120 cm','Outdoor R11 · Rectifié · 20 mm',1,.72,28,32,23.04,896,'MQ',.72));
    rows.push(
      R(`03Q6A${c.s}`,color,'Carreau','60 × 120 cm','Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44),
      R(`03Q60${c.s}`,color,'Carreau','60 × 60 cm','Rectifié · 8,5 mm',4,1.44,28,30,43.2,984,'MQ',1.44),
      R(`03Q36${c.s}`,color,'Carreau','30 × 60 cm','Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26)
    );
    if(c.small){
      rows.push(
        R(c.small[0],color,'Carreau','30,5 × 60,5 cm','8,5 mm',7,1.29,24,48,61.92,1152,'MQ',1.29),
        R(c.small[1],color,'Carreau','20,3 × 40,6 cm','8,5 mm',13,1.07,20.03,72,77.04,1462,'MQ',1.07)
      );
    }
    rows.push(
      R(c.h2,color,'Mosaïque','27,8 × 30 cm','Rectifié · relief 8,5–15 mm',3,.25,null,null,null,null,'MQ',.25),
      R(c.h1,color,'Mosaïque','30 × 30 cm','Rectifié · 8,5 mm',11,null,null,30,null,null,'PZ',11),
      R(c.bt,color,'Plinthe','6,5 × 120 cm','Rectifié · 8,5 mm',8,null,21.3,null,null,null,'ML',9.6),
      R('',color,'Pièce spéciale','Gradino costa retta 33 × 120 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true),
      R('',color,'Pièce spéciale','Gradino costa retta angolo DX/SX 33 × 120 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true)
    );
    if(c.step) rows.push(R(c.step,color,'Pièce spéciale','15 × 30 × 4 cm','8,5 mm',8,null,null,null,null,null,'PZ',8));
  }
  lot2['millennium-quartz']={n:'Millennium Quartz',p:'138–147',c:Object.keys(cfg),r:rows};
}

// SEDIMENTI — Catalogue Général ELIOS 2026, pp. 158–175.
{
  const rows=[];
  const selected=[['White','1','LF1311'],['Beige','2','LF1312'],['Sand','3','LF1313'],['Grey','4','LF1314']];
  for(const [base,d,large] of selected){
    const color=`${base} Selected`;
    rows.push(
      R(large,color,'Carreau grand format','120 × 278 cm','Selected · R9 · Rectifié · 6,5 mm',1,3.33,51.61,18,59.9,929,'PZ',1,false,3.33,51.61,18),
      R(`03Z6A0${d}`,color,'Carreau','60 × 120 cm','Selected · R10 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44),
      R(`03Z6A9${d}`,color,'Carreau','60 × 120 cm','Selected · R9 Soft Touch · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44),
      R(`03Z110${d}`,color,'Carreau','120 × 120 cm','Selected · R10 · Rectifié · 8,5 mm',2,2.88,57.9,20,57.6,1158,'MQ',2.88),
      R(`03Z119${d}`,color,'Carreau','120 × 120 cm','Selected · R9 Soft Touch · Rectifié · 8,5 mm',2,2.88,57.9,20,57.6,1158,'MQ',2.88),
      R(`03Z600${d}`,color,'Carreau','60 × 60 cm','Selected · R10 · Rectifié · 8,5 mm',4,1.44,28,30,43.2,984,'MQ',1.44),
      R(`03Z609${d}`,color,'Carreau','60 × 60 cm','Selected · R9 Soft Touch · Rectifié · 8,5 mm',4,1.44,28,30,43.2,984,'MQ',1.44),
      R(`03Z6A1${d}`,color,'Carreau extérieur','60 × 120 cm','Selected · Outdoor R11 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44),
      R(`03Z330${d}`,color,'Carreau','30 × 30 cm','Selected · R10 · Rectifié · 8,5 mm',11,.99,19,48,48,null,'MQ',.99),
      R(`03Z730${d}`,color,'Carreau','7,5 × 30 cm','Selected · R10 · Rectifié · 8,5 mm',44,.99,18,60,59.4,1080,'MQ',.99),
      R(`03Z770${d}`,color,'Carreau','7,5 × 7,5 cm','Selected · R10 · Rectifié · 8,5 mm',176,.99,18,60,59.4,1080,'MQ',.99),
      R(`03ZBT0${d}`,color,'Plinthe','6,5 × 120 cm','Selected · Rectifié · 8,5 mm',8,.62,12.24,null,null,null,'ML',9.6),
      R('',color,'Pièce spéciale','Gradino costa retta 33 × 120 cm','Selected · Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true),
      R('',color,'Pièce spéciale','Gradino angolo DX 33 × 120 cm','Selected · Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true),
      R('',color,'Pièce spéciale','Gradino angolo SX 33 × 120 cm','Selected · Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true)
    );
  }
  rows.push(
    R('03Z6A95','White Selected','Pièce spéciale','Sticks White · 60 × 120 cm','Selected · R10 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44),
    R('03Z6A96','Beige Selected','Pièce spéciale','Sticks Beige · 60 × 120 cm','Selected · R10 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44)
  );
  const tumbled=[['White','1'],['Beige','2'],['Sand','3'],['Grey','4']];
  const code45={White:'03Z4501',Beige:'03Z4502',Sand:'03Z4504',Grey:'03Z4503'};
  for(const [base,d] of tumbled){
    const color=`${base} Tumbled`;
    rows.push(
      R(code45[base],color,'Carreau','4,8 × 45 cm','Tumbled · R10 · 9,5 mm',32,.69,13.7,66,45.54,904.2,'MQ',.69),
      R(`03Z200${d}`,color,'Carreau','20,3 × 20,3 cm','Tumbled · R10 · 8,5 mm',30,1.24,23.56,60,74.4,1434,'MQ',1.24),
      R(`03Z240${d}`,color,'Carreau','20,3 × 40,6 cm','Tumbled · R10 · 8,5 mm',13,1.07,20.33,72,77.04,1464,'MQ',1.07),
      R(`03Z400${d}`,color,'Carreau','40,6 × 40,6 cm','Tumbled · R10 · 8,5 mm',6,.99,17.19,72,71.28,1238,'MQ',.99),
      R(`03Z460${d}`,color,'Carreau','40,6 × 60,9 cm','Tumbled · R10 · 8,5 mm',6,1.48,24.5,40,59.2,980,'MQ',1.48),
      R(`03ZM10${d}`,color,'Modulo','Modulo pré-boxé','Tumbled · R10 · 8,5 mm',6,.75,13,80,60,1057,'MQ',.75),
      R(`03Z6A2${d}`,color,'Carreau extérieur','60 × 120 cm','Tumbled · Outdoor R11 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44),
      R(`03Z6C2${d}`,color,'Dalle extérieure','60 × 120 cm','Tumbled · Outdoor R11 · Rectifié · 20 mm',1,.72,28,32,23.04,896,'MQ',.72),
      R(`03ZB10${d}`,color,'Plinthe','6,5 × 60,9 cm','Tumbled · 8,5 mm',15,null,16,null,null,null,'ML',9.135),
      R('',color,'Pièce spéciale','Gradino costa retta 33 × 120 cm','Tumbled · Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true),
      R('',color,'Pièce spéciale','Gradino angolo DX 33 × 120 cm','Tumbled · Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true),
      R('',color,'Pièce spéciale','Gradino angolo SX 33 × 120 cm','Tumbled · Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true)
    );
  }
  rows.push(
    R('03ZM105','Beige Tumbled','Modulo','Modulo pré-boxé','Tumbled · Outdoor R11 · 8,5 mm',6,.75,13,80,60,1057,'MQ',.75),
    R('03ZM106','Sand Tumbled','Modulo','Modulo pré-boxé','Tumbled · Outdoor R11 · 8,5 mm',6,.75,13,80,60,1057,'MQ',.75)
  );
  for(const [base,sfx] of [['Beige','05'],['Sand','06']]){
    const color=`${base} Tumbled`;
    rows.push(
      R(`03Z20${sfx}`,color,'Carreau extérieur','20,3 × 20,3 cm','Tumbled · Outdoor R11 · 8,5 mm',30,1.24,23.56,60,74.4,1434,'MQ',1.24),
      R(`03Z24${sfx}`,color,'Carreau extérieur','20,3 × 40,6 cm','Tumbled · Outdoor R11 · 8,5 mm',13,1.07,20.33,72,77.04,1464,'MQ',1.07),
      R(`03Z40${sfx}`,color,'Carreau extérieur','40,6 × 40,6 cm','Tumbled · Outdoor R11 · 8,5 mm',6,.99,17.19,72,71.28,1238,'MQ',.99),
      R(`03Z46${sfx}`,color,'Carreau extérieur','40,6 × 60,9 cm','Tumbled · Outdoor R11 · 8,5 mm',6,1.48,24.5,40,59.2,980,'MQ',1.48)
    );
  }
  lot2.sedimenti={n:'Sedimenti',p:'158–175',c:['White Selected','Beige Selected','Sand Selected','Grey Selected','White Tumbled','Beige Tumbled','Sand Tumbled','Grey Tumbled'],r:rows};
}

// SLATE — Catalogue Général ELIOS 2026, pp. 176–187.
{
  const rows=[];
  const cfg={
    River:{s:'60',out20:'03F6C60',out85:'03F3161',wall:'03FH160',hex:'03FH260',arrow:'03FH360',bt:'03FBT60'},
    Flame:{s:'20',out20:'03F6C20',out85:'03F3121',wall:'03FH120',hex:'03FH220',arrow:'03FH320',bt:'03FBT20'},
    Gold:{s:'10',out20:'03F6C10',out85:'03F3111',wall:'03FH110',hex:'03FH210',arrow:'03FH310',bt:'03FBT10'},
    Grey:{s:'80',out20:'03F6C80',out85:'03F3181',wall:'03FH180',hex:'03FH280',arrow:'03FH380',bt:'03FBT80'},
    Dark:{s:'90',out20:'',out85:'',wall:'03FH190',hex:'03FH290',arrow:'03FH390',bt:'03FBT90'},
    Natural:{s:'00',out20:'',out85:'',wall:'03FH100',hex:'03FH200',arrow:'03FH300',bt:'03FBT00'}
  };
  for(const [color,c] of Object.entries(cfg)){
    if(c.out20) rows.push(R(c.out20,color,'Dalle extérieure','60 × 120 cm','Outdoor R11 · Rectifié · 20 mm',1,.72,28,32,23.04,896,'MQ',.72));
    if(c.out85) rows.push(R(c.out85,color,'Carreau extérieur','30,5 × 60,5 cm','Outdoor R11 · 8,5 mm',7,1.29,24,48,61.92,1152,'MQ',1.29));
    rows.push(
      R(`03F6A${c.s}`,color,'Carreau','60 × 120 cm','R10 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44),
      R(`03F60${c.s}`,color,'Carreau','60 × 60 cm','R10 · Rectifié · 8,5 mm',4,1.44,28,30,43.2,984,'MQ',1.44),
      R(`03F36${c.s}`,color,'Carreau','30 × 60 cm','R10 · Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26),
      R(`03F33${c.s}`,color,'Carreau','30 × 30 cm','R10 · Rectifié · 8,5 mm',11,.99,18,48,47.52,879,'MQ',.99),
      R(`03F73${c.s}`,color,'Carreau','7,5 × 30 cm','R10 · 8,5 mm',44,.99,18,60,59.4,1095,'MQ',.99),
      R(`03F15${c.s}`,color,'Carreau','15 × 15 cm','R10 · 9 mm',46,1.04,20,60,62.4,1215,'MQ',1.04),
      R(`03F16${c.s}`,color,'Pièce spéciale','Muretto 3D · 15 × 61 cm','R10 · 7,5–11 mm',11,1.02,18.94,48,48.96,909,'MQ',1.02),
      R(c.wall,color,'Mosaïque','Mosaico Wall · 30 × 30 cm','Rectifié · sur trame · 8,5 mm',6,null,null,null,null,null,'PZ',6),
      R(c.hex,color,'Mosaïque','Mosaico Hex · 35 × 38 cm','Rectifié · sur trame · 8,5 mm',6,null,null,null,null,null,'PZ',6),
      R(c.arrow,color,'Mosaïque','Mosaico Arrow · 29,5 × 30 cm','Rectifié · sur trame · 8,5 mm',6,null,null,null,null,null,'PZ',6),
      R(c.bt,color,'Plinthe','6,5 × 120 cm','Rectifié · 8,5 mm',8,.62,12.24,null,null,null,'ML',9.6)
    );
  }
  lot2.slate={n:'Slate',p:'176–187',c:Object.keys(cfg),r:rows};
}

module.exports=lot2;
