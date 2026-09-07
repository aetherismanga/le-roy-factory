'use strict';
const O={};
const A=(ref,color,kind,format,finish,pcs,sqm,kg,bp,sp,kp,unit,per,orderOnly=false,sqmPiece=null,kgPiece=null,pcsPal=null)=>[ref,color,kind,format,finish,pcs,sqm,kg,bp,sp,kp,unit,per,orderOnly,sqmPiece,kgPiece,pcsPal];

// LOVE&DECORS · 40–47 + 376–391
{
  const r=[];
  r.push(A('LA1302','Garden','Carreau grand format','120 × 278 cm','Matt · Rectifié · 6,5 mm',1,null,null,null,59.9,1024,'PZ',1,false,3.33,51.6,18));
  r.push(A('LA1301','Rainforest','Carreau grand format','120 × 278 cm','Matt · Rectifié · 6,5 mm',1,null,null,null,59.9,1024,'PZ',1,false,3.33,51.6,18));
  const decors=[
    ['00H6AD5','Equatorial'],['00H6AD6','Flora'],['00H6AD8','Leaf'],['00H6AD7','Ibis'],['L952AD2','Natura Lappato'],
    ['00H6ADC','Lagoon'],['00H6ADB','Paradise'],['00H6ADD','Peony'],['00H6AD2','Autumn'],['00H6ADA','Flamingo'],['00H6ADE','Paint']
  ];
  for(const [ref,name] of decors) r.push(A(ref,name,'Décor','60 × 120 cm','Composition · Rectifié · 10 mm',2,1.44,32,32,46.08,984,'MQ',1.44));
  O['love-decors']={n:'Love&Decors',p:'40–47 / 376–391',c:['Garden','Rainforest',...decors.map(x=>x[1])],r};
}

// MANHATTAN · 48–57
{
  const rows=[['LE1203','Ash'],['LE1202','Pearl'],['LE1201','Sand']].map(([ref,color])=>A(ref,color,'Carreau grand format','120 × 278 cm','Matt · Rectifié · 6,5 mm',1,null,null,null,59.9,1024,'PZ',1,false,3.33,51.6,18));
  O.manhattan={n:'Manhattan',p:'48–57',c:['Ash','Pearl','Sand'],r:rows};
}

// YOSEMITE · 84–91
{
  const r=[];
  const C={Honey:'40',Amber:'70',Natural:'60',White:'00'};
  for(const [c,s] of Object.entries(C)){
    r.push(A(`03H2E${s}`,c,'Carreau','23,4 × 148 cm','R10 B · Rectifié · 8,5 mm',3,1.04,19.85,48,49.92,952.8,'MQ',1.04));
    r.push(A(`03H2D${s}`,c,'Carreau','23,4 × 119,5 cm','R10 B · Rectifié · 8,5 mm',4,1.12,20.9,45,50.4,963,'MQ',1.12));
    r.push(A(`03H2F${s}`,c,'Carreau','23,4 × 95,7 cm','R10 B · Rectifié · 8,5 mm',4,.9,17.2,36,32.4,619.2,'MQ',.9));
    if(c==='Honey'||c==='Amber') r.push(A(`03H18${s}`,c,'Carreau','15 × 85 cm','R10 B · 8,5 mm',8,1.02,21,42,42.84,897,'MQ',1.02));
    r.push(A(`03H74${s}`,c,'Carreau','7,5 × 40,7 cm','R10 B · 8,5 mm',28,.88,15.7,42,36.96,659.4,'MQ',.88));
    r.push(A(`03HBS${s}`,c,'Plinthe','6,5 × 119,5 cm','R10 · 8,5 mm',8,null,null,null,null,null,'ML',9.56));
    r.push(A(`00YB6${s}`,c,'Plinthe','7,5 × 60 cm','R10 · 8,5 mm',16,null,12,null,null,null,'ML',9.6));
    r.push(A('',c,'Pièce spéciale','Gradino costa retta 33 × 120 × 4 × 3 cm','R10 B · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));
    r.push(A('',c,'Pièce spéciale','Gradino costa retta angolo DX/SX 33 × 120 × 4 × 3 cm','R10 B · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));
  }
  O.yosemite={n:'Yosemite',p:'84–91',c:Object.keys(C),r};
}

// SHELL · 324–335
{
  const r=[];
  const C={Ivory:'31','Ivory Light':'30',Beige:'11','Beige Light':'10',Grey:'21','Grey Light':'20'};
  const light=new Set(['Ivory Light','Beige Light','Grey Light']);
  for(const [c,s] of Object.entries(C)){
    r.push(A(`04F60${s}`,c,'Carreau','60 × 60 cm','3D Matt · R10 · Rectifié · 8,5 mm',4,1.44,28,30,43.2,984,'MQ',1.44));
    r.push(A(`04F6A${s}`,c,'Carreau','60 × 120 cm','3D Matt · R10 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44));
    const sat={Ivory:'33','Ivory Light':'32',Beige:'13','Beige Light':'12',Grey:'23','Grey Light':'22'}[c];
    r.push(A(`04F6A${sat}`,c,'Carreau','60 × 120 cm','3D Saten · R10 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44));
    if(light.has(c)){
      const out={ 'Ivory Light':['34','34'], 'Beige Light':['14','14'], 'Grey Light':['24','24'] }[c];
      r.push(A(`04F60${out[0]}`,c,'Carreau extérieur','60 × 60 cm','3D Matt · R11 A+B · Rectifié · 8,5 mm',4,1.44,28,30,43.2,984,'MQ',1.44));
      r.push(A(`04F6A${out[1]}`,c,'Carreau extérieur','60 × 120 cm','3D Matt · R11 A+B · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44));
    }
    r.push(A(`04FBT${s}`,c,'Plinthe','6,5 × 120 cm','R10 · Rectifié · 8,5 mm',8,null,21.3,null,null,null,'ML',9.6));
    r.push(A('',c,'Pièce spéciale','Gradino costa retta 33 × 120 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));
    r.push(A('',c,'Pièce spéciale','Gradino costa retta angolo DX 33 × 120 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));
    r.push(A('',c,'Pièce spéciale','Gradino costa retta angolo SX 33 × 120 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));
  }
  O.shell={n:'Shell',p:'324–335',c:Object.keys(C),r};
}

// TERRE ETRUSCHE · 336–351
{
  const r=[];
  const C={Toscana:'20',Umbria:'60',Lazio:'80',Marche:'99'};
  for(const [c,s] of Object.entries(C)){
    r.push(A(`00B40${s}`,c,'Carreau','40,6 × 40,6 cm','R10 C · 9 mm',6,.99,17.19,72,71.28,1238,'MQ',.99));
    r.push(A(`00B24${s}`,c,'Carreau','20,3 × 40,6 cm','R10 C · 9 mm',13,1.07,20.33,72,77.04,1464,'MQ',1.07));
    r.push(A(`00B20${s}`,c,'Carreau','20,3 × 20,3 cm','R10 C · 9 mm',30,1.24,23.56,60,74.4,1434,'MQ',1.24));
    r.push(A(`00BES${s}`,c,'Carreau','Esagonetta 25 × 22 cm','R10 C · 9 mm',18,.74,13.6,63,46.62,1154,'MQ',.74));
    const os=s==='99'?'91':`${s[0]}1`;
    r.push(A(`00B40${os}`,c,'Carreau extérieur','40,6 × 40,6 cm','Outdoor R11 C · 9 mm',6,.99,17.19,72,71.28,1238,'MQ',.99));
    r.push(A(`00B24${os}`,c,'Carreau extérieur','20,3 × 40,6 cm','Outdoor R11 C · 9 mm',13,1.07,20.33,72,77.04,1464,'MQ',1.07));
    r.push(A(`00B20${os}`,c,'Carreau extérieur','20,3 × 20,3 cm','Outdoor R11 C · 9 mm',30,1.24,23.56,60,74.4,1434,'MQ',1.24));
    r.push(A(`00BHE${s}`,c,'Mosaïque','Mosaico Esagonetta 35 × 38 cm','R10 C · 9 mm',6,.62,10.77,60,37.2,null,'MQ',.62));
    r.push(A(`00BBC${s}`,c,'Plinthe','7,5 × 40,6 cm','R10 C · 9 mm',24,null,null,null,null,null,'ML',9.744));
    r.push(A('',c,'Pièce spéciale','Gradino lineare costa retta 32 × 40 × 3 × 3 cm','R10 C · 9 mm',4,null,null,null,null,null,'PZ',4,true));
    r.push(A('',c,'Pièce spéciale','Gradino costa retta angolo DX/SX 32 × 40 × 3 × 3 cm','R10 C · 9 mm',2,null,null,null,null,null,'PZ',2,true));
    r.push(A('',c,'Pièce spéciale','Coprimuretto incollato 26 × 40,6 × 5 × 5 cm','R10 C · 9 mm',6,null,null,null,null,null,'PZ',6,true));
    r.push(A('',c,'Pièce spéciale','Elemento L monolitico 15 × 30 × 4 cm','R11 · 9 mm',8,null,null,null,null,null,'PZ',8,true));
  }
  r.push(A('00BESD1','Décors','Décor','Decoro Esagonetta 25 × 22 cm','R10 C · 10 mm',18,.74,13.6,63,46.62,1154,'MQ',.74));
  [['00B20D9','Decoro Mix'],['00B20D1','Decoro A'],['00B20D2','Decoro B'],['00B20D3','Decoro C']].forEach(([ref,n])=>r.push(A(ref,'Décors','Décor',`${n} 20,3 × 20,3 cm`,'R10 · 9 mm',30,1.24,23.56,60,74.4,1434,'MQ',1.24)));
  O['terre-etrusche']={n:'Terre Etrusche',p:'336–351',c:[...Object.keys(C),'Décors'],r};
}

// ALLURE · 354–363
{
  const r=[];
  const items=[['03C6A30','Blossom','Carreau'],['03C6A50','Blueberry','Carreau'],['03C6A60','Juniper','Carreau'],['03C6A00','Snow','Carreau'],['03C6A10','Oyster','Carreau'],['03C6AD4','Safari','Décor'],['03C6AD3','Fenix Juniper','Décor'],['03C6AD5','Fenix Blueberry','Décor'],['03C6AD1','Eden','Décor']];
  for(const [ref,c,kind] of items) r.push(A(ref,c,kind,'60 × 120 cm','Rectifié · 7 mm',3,2.16,29.2,30,64.8,891,'MQ',2.16));
  O.allure={n:'Allure',p:'354–363',c:items.map(x=>x[1]),r};
}

module.exports=O;
