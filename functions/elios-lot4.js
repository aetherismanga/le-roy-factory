'use strict';
const O={};
const A=(ref,color,kind,format,finish,pcs,sqm,kg,bp,sp,kp,unit,per,orderOnly=false)=>[ref,color,kind,format,finish,pcs,sqm,kg,bp,sp,kp,unit,per,orderOnly];

// GLOW · 260–269
{
  const r=[];
  const colors=[['Oregon','04D4570'],['California','04D4560'],['Montana','04D4540'],['Florida','04D4550'],['Virginia','04D4530'],['Arizona','04D4520'],['Dakota','04D4510'],['Indiana','04D4580'],['Washington','04D4500'],['Texas','04D4590']];
  for(const [c,ref] of colors) r.push(A(ref,c,'Carreau','4,8 × 45 cm','Glossy · 9,5 mm',32,.69,13.7,66,45.54,904.2,'MQ',.69));
  O.glow={n:'Glow',p:'260–269',c:colors.map(x=>x[0]),r};
}

// GOLDEN HOUR · 270–279
{
  const r=[];
  const colors=[['White Lady','12'],['Gin Tonic','05'],['Bellini','13'],['Margarita','08'],['Mojito','10'],['Caipirinha','03'],['Hawaian','06'],['Blue Lagoon','02']];
  for(const [c,s] of colors){
    r.push(A(`04G43${s}`,c,'Carreau','4,8 × 20 cm','Lucido · 9,5 mm',50,.48,10,90,43.2,920,'MQ',.48));
    r.push(A(`04GA4${s}`,c,'Pièce spéciale','Angolo Esterno 10 × 35 × 4,8 cm','Lucido · 9,5 mm',12,null,null,null,null,null,'PZ',12));
    r.push(A(`04GQ4${s}`,c,'Pièce spéciale','Coprispigolo 1,4 × 20 cm','Lucido · 9,5 mm',6,null,null,null,null,null,'PZ',6));
  }
  O['golden-hour']={n:'Golden Hour',p:'270–279',c:colors.map(x=>x[0]),r};
}

// HEXAGON · 280–289
{
  const r=[];
  const items=[
    ['00ZESC5','Lily Sky'],['00ZESC8','Lily Grey'],['00ZESC0','Lily White'],['00ZESC1','Lily Beige'],['00ZESC4','Lily Teal'],
    ['00ZESB5','Cube Sky'],['00ZESB9','Cube B&W'],['00ZESB6','Cube Mint'],
    ['00ZESA8','Frame Grey'],['00ZESA9','Frame B&W'],['00ZESA0','Frame White'],['00ZESA1','Frame Beige'],
    ['00ZESD6','Japan Mint'],['00ZESD8','Japan Grey'],['00ZESD5','Japan Sky'],
    ['00ZES50','Sky'],['00ZES40','Teal'],['00ZES60','Mint'],['00ZES10','Beige'],['00ZES00','White'],['00ZES80','Grey'],['00ZES90','Dark']
  ];
  for(const [ref,c] of items) r.push(A(ref,c,c.startsWith('Lily')||c.startsWith('Cube')||c.startsWith('Frame')||c.startsWith('Japan')?'Décor':'Carreau','22 × 25 cm','R10 · 9 mm',18,.74,13.8,63,46.62,884,'MQ',.74));
  O.hexagon={n:'Hexagon',p:'280–289',c:items.map(x=>x[1]),r};
}

// HORIZON · 290–299
{
  const r=[];
  const colors={Polvere:{x:'R911X00',a:'0916A00',s:'0916000',t:'0913600',u:'0913602',b120:'091BA00',b100:'091BX00'},Cava:{x:'R919970',a:'0916A70',s:'0916070',t:'0913670',u:'0913672',b120:'091BA70',b100:'091BX70'},Calce:{x:'R919940',a:'0916A40',s:'0916040',t:'0913640',u:'0913642',b120:'091BA40',b100:'091BX40'},Carbone:{x:'R919980',a:'0916A80',s:'0916080',t:'0913680',u:'0913682',b120:'091BA80',b100:'091BX80'}};
  for(const [c,v] of Object.entries(colors)){
    r.push(A(v.x,c,'Carreau','100 × 100 cm','Rectifié · 8,5 mm',2,2,39,24,48,932,'MQ',2));
    r.push(A(v.a,c,'Carreau','60 × 120 cm','Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44));
    r.push(A(v.s,c,'Carreau','60 × 60 cm','Rectifié · 8,5 mm',4,1.44,28,30,43.2,984,'MQ',1.44));
    r.push(A(v.t,c,'Carreau','30 × 60 cm','Rectifié · 8,5 mm',7,1.26,23.3,48,60.48,1118,'MQ',1.26));
    r.push(A(v.u,c,'Décor','Urbanesque 30 × 60 cm','Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26));
    r.push(A(v.b120,c,'Plinthe','6,5 × 120 cm','Rectifié · 8,5 mm',8,null,21.3,null,null,null,'ML',9.6));
    r.push(A(v.b100,c,'Plinthe','6,5 × 100 cm','Rectifié · 8,5 mm',6,null,7.5,null,null,null,'ML',6));
    r.push(A('',c,'Pièce spéciale','Gradino costa retta 33 × 120 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));
    r.push(A('',c,'Pièce spéciale','Gradino costa retta angolo DX/SX 33 × 120 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));
  }
  O.horizon={n:'Horizon',p:'290–299',c:Object.keys(colors),r};
}

// MARECHIARO · 300–311
{
  const r=[];
  r.push(A('03R4000','Bianco','Carreau','40,6 × 40,6 cm','Glossy · 8,5 mm',6,.99,17.19,72,71.28,1238,'MQ',.99));
  r.push(A('03R4050','Blu','Carreau','40,6 × 40,6 cm','Glossy · 8,5 mm',6,.99,17.19,72,71.28,1238,'MQ',.99));
  r.push(A('03R2000','Bianco','Carreau','20,3 × 20,3 cm','Glossy · 8,5 mm',30,1.24,23.6,60,74.4,1429,'MQ',1.24));
  [['03R2001','Mix'],['03R2004','Amalfi'],['03R2005','Positano'],['03R2002','Sorrento'],['03R2003','Vietri']].forEach(([ref,c])=>r.push(A(ref,c,'Décor','20,3 × 20,3 cm','Glossy · 8,5 mm',30,1.24,23.6,60,74.4,1429,'MQ',1.24)));
  O.marechiaro={n:'Marechiaro',p:'300–311',c:['Bianco','Blu','Mix','Amalfi','Positano','Sorrento','Vietri'],r};
}

// MONTREAL · 312–323
{
  const r=[];
  const colors={White:'00',Grey:'80',Beige:'40',Taupe:'60',Dark:'90'};
  for(const [c,s] of Object.entries(colors)){
    r.push(A(`00X1X${s}`,c,'Carreau','100 × 100 cm','R10 B · Rectifié · 8,5 mm',2,2,39,24,48,932,'MQ',2));
    r.push(A(`00X6A${s}`,c,'Carreau','60 × 120 cm','R10 B · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44));
    r.push(A(`00X60${s}`,c,'Carreau','60 × 60 cm','R10 B · Rectifié · 8,5 mm',4,1.44,32,32,46.08,984,'MQ',1.44));
    r.push(A(`00X36${s}`,c,'Carreau','30 × 60 cm','R10 B · Rectifié · 8,5 mm',7,1.26,24,48,60.48,1152,'MQ',1.26));
    if(c==='Grey'||c==='Beige'||c==='Taupe'){
      r.push(A(`00X1X${s.slice(0,1)}1`,c,'Carreau extérieur','100 × 100 cm','Outdoor R11 · Rectifié · 8,5 mm',2,2,39,24,48,932,'MQ',2));
      r.push(A(`00X12${s}`,c,'Dalle extérieure','100 × 100 cm','Outdoor R11 · Rectifié · 20 mm',1,1,39,24,24,956,'MQ',1));
    }
  }
  const mrefs={White:['00XH100','00XH300','00XH200'],Grey:['00XH180','00XH380','00XH280'],Beige:['00XH140','00XH340','00XH240'],Taupe:['00XH160','00XH360','00XH260'],Dark:['00XH190','00XH390','00XH290']};
  for(const [c,refs] of Object.entries(mrefs)){
    r.push(A(refs[0],c,'Mosaïque','Mosaico T36 30 × 30 cm','R10 B · Rectifié · 8,5 mm',11,1,null,30,null,null,'MQ',1));
    r.push(A(refs[1],c,'Mosaïque','Mosaico Elegance 25 × 22,5 cm','R10 B · Rectifié · 8,5 mm',11,.63,null,30,null,null,'MQ',.63));
    r.push(A(refs[2],c,'Mosaïque','Mosaico Royal 32 × 35 cm','R10 B · Rectifié · 8,5 mm',9,1,null,36,null,null,'MQ',1));
  }
  for(const [c,s] of Object.entries(colors)){
    r.push(A(`00XBX${s}`,c,'Plinthe','6,5 × 100 cm','Rectifié · 8,5 mm',6,null,7.5,null,null,null,'ML',6));
    r.push(A(`00XBA${s}`,c,'Plinthe','6,5 × 120 cm','Rectifié · 8,5 mm',8,.62,12.24,null,null,null,'ML',9.6));
    r.push(A(`00XGR${s}`,c,'Pièce spéciale','Gradino costa retta 33 × 120 × 4 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2));
    r.push(A(`00XGR${s[0]}D`,c,'Pièce spéciale','Gradino costa retta angolo DX 33 × 120 × 4 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2));
    r.push(A(`00XGR${s[0]}S`,c,'Pièce spéciale','Gradino costa retta angolo SX 33 × 120 × 4 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2));
  }
  O.montreal={n:'Montreal',p:'312–323',c:Object.keys(colors),r};
}

module.exports=O;
