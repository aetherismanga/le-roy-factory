'use strict';
const O={};
const A=(ref,color,kind,format,finish,pcs,sqm,kg,bp,sp,kp,unit,per,orderOnly=false,sqmPiece=null,kgPiece=null,pcsPal=null)=>[ref,color,kind,format,finish,pcs,sqm,kg,bp,sp,kp,unit,per,orderOnly,sqmPiece,kgPiece,pcsPal];

// DUST · 364–375
{
  const r=[];
  const C={Terrae:'80',Blush:'30',Dove:'40',Ice:'00',Sage:'60',Pine:'70',Niagara:'50',Ink:'90'};
  for(const [c,s] of Object.entries(C)){
    r.push(A(`03E50${s}`,c,'Carreau','5 × 20 cm','Soft · 8 mm',50,.50,7.53,120,60,903,'MQ',.50));
    r.push(A(`03E50${s[0]}1`,c,'Carreau','5 × 20 cm','Gloss · 8 mm',50,.50,7.53,120,60,903,'MQ',.50));
    r.push(A(`03E5D${s}`,c,'Carreau','Dune 5 × 20 cm','Soft · 14 mm',44,.44,6.35,120,52.8,779,'MQ',.44));
    r.push(A(`03E5D${s[0]}1`,c,'Carreau','Dune 5 × 20 cm','Gloss · 14 mm',44,.44,6.35,120,52.8,779,'MQ',.44));
    r.push(A(`03E5L${s}`,c,'Carreau','Line 5 × 20 cm','Soft · 9 mm',44,.44,6.63,120,52.8,816,'MQ',.44));
    r.push(A(`03E5C${s}`,c,'Carreau','Chevron 5 × 20 cm','Soft · 9 mm',44,.44,6.63,120,52.8,816,'MQ',.44));
    r.push(A(`03EE1${s}`,c,'Carreau','Exa 17,5 × 20 cm','R10 · 9 mm',25,.71,13.10,80,56.8,1048,'MQ',.71));
    r.push(A(`03EJ1${s}`,c,'Pièce spéciale','Coprispigolo Soft 1,2 × 20 cm','9 mm',null,null,null,null,null,null,'PZ',1));
    r.push(A(`03EJ1${s[0]}1`,c,'Pièce spéciale','Coprispigolo Gloss 1,2 × 20 cm','9 mm',null,null,null,null,null,null,'PZ',1));
  }
  O.dust={n:'Dust',p:'364–375',c:Object.keys(C),r};
}

// SEGMENTO · 392–401
{
  const r=[];
  const base=[['04I1500','Albus'],['04I1560','Nigrum'],['04I1510','Amaryllis'],['04I1580','Rubens'],['04I1530','Coelestis'],['04I1520','Caeruleus'],['04I1540','Flavus'],['04I1590','Viridis'],['04I1550','Lapis'],['04I1570','Nox']];
  for(const [ref,c] of base) r.push(A(ref,c,'Carreau','15 × 15 cm','R9 · 8,5 mm',46,1.04,18,60,62.4,1080,'MQ',1.04));
  const duplex=[['04I15A0','Duplex A'],['04I15B0','Duplex B'],['04I15C0','Duplex C'],['04I15D0','Duplex D'],['04I15E0','Duplex E'],['04I15F0','Duplex F']];
  for(const [ref,c] of duplex) r.push(A(ref,c,'Décor','15 × 15 cm','R9 · 8,5 mm',46,1.04,18,60,62.4,1080,'MQ',1.04));
  O.segmento={n:'Segmento',p:'392–401',c:[...base.map(x=>x[1]),...duplex.map(x=>x[1])],r};
}

// TROPICAL · 402–413
{
  const r=[];
  const C={Bianco:'00',Grigio:'70',Nero:'85',Ocra:'75',Salvia:'80',Petrolio:'40',Azzurro:'10',Blu:'50'};
  for(const [c,s] of Object.entries(C)){
    r.push(A(`09920${s}`,c,'Carreau','20 × 20 cm','10 mm',30,1.20,23.75,60,72,1445,'MQ',1.20));
    if(c!=='Nero') r.push(A(`0996B${s}`,c,'Carreau','6 × 25 cm','Lucido · 10 mm',32,.48,9.8,100,48,1000,'MQ',.48));
    r.push(A(`099ES${s}`,c,'Carreau','Exa 25 × 22 cm','R10 B · 9,5 mm',9,.37,8.5,72,26.24,637,'MQ',.37));
    r.push(A('',c,'Pièce spéciale','Coprispigolo 1 × 25 cm','10 mm',6,null,null,null,null,null,'PZ',6,true));
    r.push(A('',c,'Pièce spéciale','Angolo esterno 12 × 25 × 6 cm','10 mm',12,null,null,null,null,null,'PZ',12,true));
  }
  [['0992116','Decoro Oceano 1'],['0992216','Decoro Oceano 2'],['0992316','Decoro Oceano 3'],['0992215','Decoro Savana 2'],['0992315','Decoro Savana 3']].forEach(([ref,n])=>r.push(A(ref,'Décors','Décor',`${n} 20 × 20 cm`,'10 mm',30,1.20,23.75,60,72,1445,'MQ',1.20)));
  r.push(A('09920D1','Décors','Décor','Decoro Felce 20 × 20 cm · composition 6 pcs','10 mm',6,.24,4.75,null,null,null,'MQ',.24));
  O.tropical={n:'Tropical',p:'402–413',c:[...Object.keys(C),'Décors'],r};
}

// TWIST · 414–421
{
  const r=[];
  const C={Brick:'3',Green:'6',Sky:'5',White:'0',Black:'9'};
  for(const [c,s] of Object.entries(C)){
    r.push(A(`00T20${s}0`,c,'Carreau','20 × 20 cm','R10 · 8,5 mm',35,1.40,23.8,60,84,1445,'MQ',1.40));
    r.push(A(`00T20${s}4`,c,'Décor','Mix 20 × 20 cm','R10 · 8,5 mm · 8 patterns aléatoires',35,1.40,23.8,60,84,1445,'MQ',1.40));
    r.push(A(`00T20${s}2`,c,'Décor','Evo 20 × 20 cm','R10 · 8,5 mm',35,1.40,23.8,60,84,1445,'MQ',1.40));
    r.push(A(`00T20${s}1`,c,'Décor','Classic 20 × 20 cm','R10 · 8,5 mm',35,1.40,23.8,60,84,1445,'MQ',1.40));
    r.push(A(`00T20${s}3`,c,'Décor','Pop 20 × 20 cm','R10 · 8,5 mm',35,1.40,23.8,60,84,1445,'MQ',1.40));
  }
  O.twist={n:'Twist',p:'414–421',c:Object.keys(C),r};
}

// VENERE · 422–439
{
  const r=[];
  const base=[['04H3X05','Perla'],['04H3X02','Aura'],['04H3X07','Seta'],['04H3X03','Flora'],['04H3X06','Rugiada'],['04H3X08','Zefiro'],['04H3X04','Mare'],['04H3X01','Atlante']];
  for(const [ref,c] of base) r.push(A(ref,c,'Carreau mural','33,3 × 100 cm','R9 · Rectifié · 7 mm',4,1.33,20,36,47.88,720,'MQ',1.33));
  const decors=[['04H3X25','Materica Perla'],['04H3X22','Materica Aura'],['04H3X26','Materica Rugiada'],['04H3X24','Materica Mare'],['04H3X15','Dorica Perla'],['04H3X12','Dorica Aura'],['04H3X17','Dorica Seta'],['04H3X18','Dorica Zefiro'],['04H3X39','Optica Rosa'],['04H3X30','Optica Blu']];
  for(const [ref,c] of decors) r.push(A(ref,c,'Décor','33,3 × 100 cm','R9 · Rectifié · 7 mm',4,1.33,20,36,47.88,720,'MQ',1.33));
  O.venere={n:'Venere',p:'422–439',c:[...base.map(x=>x[1]),...decors.map(x=>x[1])],r};
}

module.exports=O;
