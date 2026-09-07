'use strict';
const O={};
const A=(ref,color,kind,format,finish,pcs,sqm,kg,bp,sp,kp,unit,per,orderOnly=false)=>[ref,color,kind,format,finish,pcs,sqm,kg,bp,sp,kp,unit,per,orderOnly];

// BROOKLYN · 190–199
{
  const r=[];
  const F={
    x:["Carreau","100 × 100 cm","R10 B · Rectifié · 8,5 mm",2,2,39,24,48,932],
    a:["Carreau","60 × 120 cm","R10 B · Rectifié · 8,5 mm",2,1.44,32,32,46.08,984],
    s:["Carreau","60 × 60 cm","R10 B · Rectifié · 8,5 mm",4,1.44,28,30,43.2,984],
    t:["Carreau","30 × 60 cm","R10 B · Rectifié · 8,5 mm",7,1.26,24,48,60.48,1152],
    m:["Muretto 3D","15 × 61 cm","R10 B · 7,5–11 mm",11,1.02,18.94,48,48.96,909.12],
    o:["Carreau extérieur","100 × 100 cm","Outdoor R11 C · Rectifié · 8,5 mm",2,2,39,24,48,932],
    p:["Carreau extérieur","20,3 × 40,6 cm","Outdoor R11 C · 8,5 mm",13,1.07,20.3,72,77.04,1461.6],
    q:["Carreau extérieur","20,3 × 20,3 cm","Outdoor R11 C · 8,5 mm",30,1.24,22.45,60,74.4,1347],
    d:["Dalle extérieure","100 × 100 cm","Outdoor R11 C · Rectifié · 20 mm",1,1,39,24,24,956]
  };
  const C={
    White:{x:'00K1X00',a:'00K6A00',s:'00K6000',t:'00K3600'},
    Almond:{x:'00K1X10',a:'00K6A10',s:'00K6010',d:'00K1210'},
    Gold:{x:'00K1X50',a:'00K6A50',s:'00K6050',d:'00K1250'},
    Grey:{x:'00K1X80',a:'00K6A80',s:'00K6080',t:'00K3680',m:'00K1680',d:'00K1280'},
    Beige:{x:'00K1X40',a:'00K6A40',s:'00K6040',t:'00K3640',m:'00K1640',o:'00K1X41',p:'00K2441',q:'00K2041',d:'00K1240'},
    Taupe:{x:'00K1X60',a:'00K6A60',s:'00K6060',t:'00K3660',m:'00K1660',o:'00K1X61',p:'00K2461',q:'00K2061',d:'00K1260'},
    Dark:{x:'00K1X90',a:'00K6A90',s:'00K6090',t:'00K3690',d:'00K1290'}
  };
  for(const [color,refs] of Object.entries(C)) for(const [k,ref] of Object.entries(refs)){const f=F[k];r.push(A(ref,color,f[0],f[1],f[2],f[3],f[4],f[5],f[6],f[7],f[8],'MQ',f[4]));}
  const MOS={White:['00KH100','00KH300','00KH200'],Almond:['','',''],Gold:['','',''],Grey:['00KH180','00KH380','00KH280'],Beige:['00KH140','00KH340','00KH240'],Taupe:['00KH160','00KH360','00KH260'],Dark:['00KH190','00KH390','00KH290']};
  const MS=[['30 × 30 cm','Mosaico T36 · R10 B · Rectifié · 8,5 mm',.55,null,null,null],['29 × 29 cm','Mosaico Euclide · R10 B · Rectifié · 8,5 mm',.54,60,32.4,507],['28 × 32,3 cm','Mosaico Woody · R10 B · Rectifié · 8,5 mm',.54,60,32.4,507]];
  for(const [color,refs] of Object.entries(MOS)) refs.forEach((ref,i)=>{const m=MS[i];r.push(A(ref,color,'Mosaïque',m[0],m[1],6,m[2],8.2,m[3],m[4],m[5],'MQ',m[2],!ref));});
  const B={White:'00KBF00',Almond:'00KBS10',Gold:'00KBS50',Grey:'00KBF80',Beige:'00KBF40',Taupe:'00KBF60',Dark:'00KBF90'};
  for(const [color,ref] of Object.entries(B)) r.push(A(ref,color,'Plinthe','6,5 × 100 cm','R10 B · Rectifié · 8,5 mm',6,null,7.5,null,null,null,'ML',6));
  for(const color of Object.keys(C)){r.push(A('',color,'Pièce spéciale','Gradino costa retta 33 × 120 cm','R10 B · Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));r.push(A('',color,'Pièce spéciale','Gradino costa retta angolo DX/SX 33 × 120 cm','R10 B · Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));}
  O['brooklyn']={n:'Brooklyn',p:'190–199',c:Object.keys(C),r};
}

// CLAY · 200–213
{
  const r=[]; const colors={Emerald:'60',Ocean:'55',Aqua:'50',Mustard:'20',Linen:'10',Bouquet:'35',Silk:'30',Cotton:'00'};
  for(const [c,s] of Object.entries(colors)) r.push(A(`00G10${s}`,c,'Carreau','10 × 10 cm','Glossy · 8,5 mm',60,.6,11.7,98,58.8,1170,'MQ',.6));
  for(const [c,s] of Object.entries(colors)) r.push(A(`00GQ2${s}`,c,'Pièce spéciale','Quarter Round 1,2 × 10 cm','Glossy · 8,5 mm',12,null,null,null,null,null,'PZ',12));
  for(const [c,s] of Object.entries({Emerald:'60',Ocean:'55',Aqua:'50',Mustard:'20',Bouquet:'35'})) r.push(A(`00G1D${s}`,c,'Décor','Pattern 10 × 10 cm','Mix 6 motifs · Glossy · 8,5 mm',12,null,null,null,null,null,'PZ',12));
  [['00G1D04','Emerald'],['00G1D05','Ocean / Aqua'],['00G1D06','Mustard'],['00G1D03','Bouquet']].forEach(([ref,c])=>r.push(A(ref,c,'Décor','Flower 10 × 10 cm','Mix 6 motifs · Glossy · 8,5 mm',6,null,null,null,null,null,'PZ',6)));
  O['clay']={n:'Clay',p:'200–213',c:Object.keys(colors),r};
}

// CRETA · 214–225
{
  const r=[];
  const C={Malto:'20',Pepe:'90',Zucchero:'00',Avena:'10',Biscotto:'30',Caramello:'80',Matcha:'60',Ginepro:'50'};
  const full=new Set(['Malto','Pepe','Zucchero','Avena']), large=new Set(['Malto','Pepe','Zucchero','Avena','Biscotto','Caramello']);
  for(const [c,s] of Object.entries(C)){
    r.push(A(`03V60${s}`,c,'Carreau','60 × 60 cm','R9 · Rectifié · 8,5 mm',4,1.44,23.28,30,43.2,951,'MQ',1.44));
    r.push(A(`03V6A${s}`,c,'Carreau','60 × 120 cm','R9 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44));
    if(full.has(c)) r.push(A(`03V6B${s}`,c,'Carreau','60 × 120 cm','R10 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44));
    if(large.has(c)) r.push(A(`03V11${s}`,c,'Carreau','120 × 120 cm','R9 · Rectifié · 8,5 mm',2,2.88,57.9,20,57.6,1158,'MQ',2.88));
    r.push(A(`03VBT${s}`,c,'Plinthe','6,5 × 120 cm','R9 · 8,5 mm',8,.62,12.24,null,null,null,'ML',9.6));
    r.push(A('',c,'Pièce spéciale','Gradino costa retta 33 × 120 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));
    r.push(A('',c,'Pièce spéciale','Gradino angolo DX 33 × 120 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));
    r.push(A('',c,'Pièce spéciale','Gradino angolo SX 33 × 120 cm','Rectifié · 8,5 mm',2,null,null,null,null,null,'PZ',2,true));
  }
  [['03V6ADC','Coccio'],['03V6ADF','Pintura'],['03V6AD1','Cloé Avena'],['03V6AD0','Cloé Zucchero'],['03V6AD4','Spiga Avena Zucchero'],['03V6AD5','Spiga Pepe Malto']].forEach(([ref,n])=>r.push(A(ref,'Décors','Décor',`${n} 60 × 120 cm`,'R9 · Rectifié · 8,5 mm',2,1.44,32,32,46.08,984,'MQ',1.44)));
  O['creta']={n:'Creta',p:'214–225',c:[...Object.keys(C),'Décors'],r};
}

// DECO · 226–235
{
  const r=[]; const base=[['0892080','Black'],['0892000','White'],['0892060','Taupe'],['0892070','Grey'],['0892010','Light Blue'],['0892090','Nordic Green']];
  for(const [ref,c] of base) r.push(A(ref,c,'Carreau','20 × 20 cm','R10 · 9 mm',30,1.12,23.75,60,72,1445,'MQ',1.12));
  const d=[['089D3B1','Original B B&W'],['089D3B2','Original B Light Blue'],['089D3C1','Original C Grey'],['089D3C4','Original C Taupe'],['089D3D1','Original D Grey'],['089D3D3','Original D Taupe'],['089D1A2','Etnic A B&W'],['089D1A1','Etnic A Light Blue'],['089D1B2','Etnic B B&W'],['089D1B1','Etnic B Light Blue'],['089D1C1','Etnic C B&W'],['089D4A1','Nordic A'],['089D4B1','Nordic B'],['089D4C1','Nordic C'],['089D2A1','Geo A Light Blue'],['089D2B1','Geo B B&W'],['089D2C1','Geo C Taupe']];
  for(const [ref,n] of d) r.push(A(ref,'Décors','Décor',`${n} 20 × 20 cm`,'R10 · 9 mm',30,1.12,23.75,60,72,1445,'MQ',1.12));
  O['deco']={n:'Deco',p:'226–235',c:[...base.map(x=>x[1]),'Décors'],r};
}

// D_ESIGN EVO · 236–249
{
  const r=[]; const base=[['0792000','Bianco'],['0792070','Grigio'],['0792080','Antracite'],['0792030','Burro'],['0792040','Tortora'],['0792060','Brown'],['0792010','Ciano'],['0792090','Verde Inglese'],['0792020','Terra di Siena']];
  for(const [ref,c] of base) r.push(A(ref,c,'Carreau','20 × 20 cm','R10 · 10 mm',30,1.12,23.75,60,72,1445,'MQ',1.12));
  const d=[['079D50E','Palazzo Ducale Sogg. E'],['079D50F','Palazzo Ducale Sogg. F'],['079D50G','Palazzo Ducale Sogg. G'],['079D50B','Palazzo Ducale Sogg. B'],['079D50A','Palazzo Ducale Sogg. A'],['079D50C','Palazzo Ducale Sogg. C'],['079D50D','Palazzo Ducale Sogg. D'],['079D50Z','Palazzo Ducale Sogg. Z'],['079D60X','Palazzo Ducale B&W Sogg. X'],['079D60D','Palazzo Ducale B&W Sogg. D'],['079D60Z','Palazzo Ducale B&W Sogg. Z'],['079D60B','Palazzo Ducale B&W Sogg. B'],['079D500','Palazzo Ducale Mix'],['079D57A','Evo Ciano Sogg. A'],['079D57B','Evo Ciano Sogg. B'],['079D570','Evo Ciano Mix'],['079D54A','Evo Senape Sogg. A'],['079D54B','Evo Senape Sogg. B'],['079D540','Evo Senape Mix']];
  for(const [ref,n] of d) r.push(A(ref,'Décors','Décor',`${n} 20 × 20 cm`,'R10 · 10 mm',30,1.2,23.75,60,72,1445,'MQ',1.2));
  const o=[['0796201','Burro Ibiza'],['079620A','Decoro Alicante'],['079620B','Decoro Barcelona'],['079620C','Decoro Cordoba'],['079620Z','Decoro Zaragozza']];
  for(const [ref,n] of o) r.push(A(ref,'Outdoor','Dalle extérieure',`${n} 60 × 60 cm`,'Outdoor R11 · Rectifié · 20 mm',2,.72,32,32,23.04,1024,'MQ',.72));
  O['d-esign-evo']={n:'D_ESIGN EVO',p:'236–249',c:[...base.map(x=>x[1]),'Décors','Outdoor'],r};
}

// DOMUS · 250–259
{
  const r=[]; const c=[['04E4500','Moon White'],['04E4520','Sandstone Beige'],['04E4570','Sunset Rose'],['04E4550','Clay Red'],['04E4580','Canyon Rust'],['04E4540','Forest Green'],['04E4560','Ocean Blue']];
  for(const [ref,color] of c) r.push(A(ref,color,'Carreau','4,8 × 45 cm','R10 B · 9,5 mm',32,.69,13.7,66,45.54,904.2,'MQ',.69));
  O['domus']={n:'Domus',p:'250–259',c:c.map(x=>x[1]),r};
}

module.exports=O;
