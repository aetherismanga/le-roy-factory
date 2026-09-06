window.ELIOS_POSE_V1 = (() => {
  const fmt = (key, label, pcs, boxM2, ref) => ({ key, label, pcs, boxM2, ref });
  const option = (id, series, color, formats) => ({ id, series, color, formats });

  const modularOptions = [
    option('roma-aventino','Roma','Aventino',{
      '20.3x20.3':fmt('20.3x20.3','20,3 × 20,3 cm',28,1.15,'0852040'),
      '20.3x40.6':fmt('20.3x40.6','20,3 × 40,6 cm',13,1.07,'0852640'),
      '40.6x40.6':fmt('40.6x40.6','40,6 × 40,6 cm',6,0.99,'0854240'),
      '40.6x60.9':fmt('40.6x60.9','40,6 × 60,9 cm',6,1.46,'0854640'),
      '61x61':fmt('61x61','61 × 61 cm',3,1.12,'0856140')
    }),
    option('roma-celio','Roma','Celio',{
      '20.3x20.3':fmt('20.3x20.3','20,3 × 20,3 cm',28,1.15,'0852005'),
      '20.3x40.6':fmt('20.3x40.6','20,3 × 40,6 cm',13,1.07,'0852605'),
      '40.6x40.6':fmt('40.6x40.6','40,6 × 40,6 cm',6,0.99,'0854205'),
      '40.6x60.9':fmt('40.6x60.9','40,6 × 60,9 cm',6,1.46,'0854605'),
      '61x61':fmt('61x61','61 × 61 cm',3,1.12,'0856105')
    }),
    option('sedimenti-tumbled-beige','Sedimenti Tumbled','Beige Tumbled',{
      '20.3x20.3':fmt('20.3x20.3','20,3 × 20,3 cm',30,1.24,'03Z2005'),
      '20.3x40.6':fmt('20.3x40.6','20,3 × 40,6 cm',13,1.07,'03Z2405'),
      '40.6x40.6':fmt('40.6x40.6','40,6 × 40,6 cm',6,0.99,'03Z4005'),
      '40.6x60.9':fmt('40.6x60.9','40,6 × 60,9 cm',6,1.48,'03Z4605')
    }),
    option('sedimenti-tumbled-sand','Sedimenti Tumbled','Sand Tumbled',{
      '20.3x20.3':fmt('20.3x20.3','20,3 × 20,3 cm',30,1.24,'03Z2006'),
      '20.3x40.6':fmt('20.3x40.6','20,3 × 40,6 cm',13,1.07,'03Z2406'),
      '40.6x40.6':fmt('40.6x40.6','40,6 × 40,6 cm',6,0.99,'03Z4006'),
      '40.6x60.9':fmt('40.6x60.9','40,6 × 60,9 cm',6,1.48,'03Z4606')
    })
  ];

  const tropical = {
    series:'Tropical', format:'6x25', formatLabel:'6 × 25 cm', pcs:32, boxM2:0.48,
    colors:[
      ['Bianco','0996B00'],['Grigio','0996B70'],['Ocra','0996B75'],['Salvia','0996B80'],
      ['Petrolio','0996B40'],['Azzurro','0996B10'],['Blu','0996B50']
    ].map(([color,ref])=>({color,ref}))
  };
  const domus = {
    series:'Domus', format:'4.8x45', formatLabel:'4,8 × 45 cm', pcs:32, boxM2:0.69,
    colors:[
      ['Moon White','04E4500'],['Sandstone Beige','04E4520'],['Sunset Rose','04E4570'],
      ['Clay Red','04E4550'],['Canyon Rust','04E4580'],['Forest Green','04E4540'],['Ocean Blue','04E4560']
    ].map(([color,ref])=>({color,ref}))
  };
  const glow = {
    series:'Glow', format:'4.8x45', formatLabel:'4,8 × 45 cm', pcs:32, boxM2:0.69,
    colors:[
      ['Oregon','04D4570'],['California','04D4560'],['Montana','04D4540'],['Florida','04D4550'],
      ['Virginia','04D4530'],['Arizona','04D4520'],['Dakota','04D4510'],['Indiana','04D4580'],
      ['Washington','04D4500'],['Texas','04D4590']
    ].map(([color,ref])=>({color,ref}))
  };
  const golden = {
    series:'Golden Hour', format:'4.8x20', formatLabel:'4,8 × 20 cm', pcs:50, boxM2:0.48,
    colors:[
      ['White Lady','04G4312'],['Gin Tonic','04G4305'],['Bellini','04G4313'],['Margarita','04G4308'],
      ['Mojito','04G4310'],['Caipirinha','04G4303'],['Hawaian','04G4306'],['Blue Lagoon','04G4302']
    ].map(([color,ref])=>({color,ref}))
  };
  const segmento = {
    series:'Segmento', format:'15x15', formatLabel:'15 × 15 cm', pcs:46, boxM2:1.04,
    colors:[
      ['Albus','04I1500'],['Nigrum','04I1560'],['Amaryllis','04I1510'],['Rubens','04I1580'],
      ['Coelestis','04I1530'],['Caeruleus','04I1520'],['Flavus','04I1540'],['Viridis','04I1590'],
      ['Lapis','04I1550'],['Nox','04I1570'],['Duplex A','04I15A0'],['Duplex B','04I15B0'],
      ['Duplex C','04I15C0'],['Duplex D','04I15D0'],['Duplex E','04I15E0'],['Duplex F','04I15F0']
    ].map(([color,ref])=>({color,ref}))
  };
  const sedimentiSelected = {
    series:'Sedimenti Selected',
    colors:['White Selected','Beige Selected','Sand Selected','Grey Selected'],
    data:{
      'White Selected':{
        '30x30':fmt('30x30','30 × 30 cm',11,0.99,'03Z3301'),
        '7.5x30':fmt('7.5x30','7,5 × 30 cm',44,0.99,'03Z7301'),
        '7.5x7.5':fmt('7.5x7.5','7,5 × 7,5 cm',176,0.99,'03Z7701')
      },
      'Beige Selected':{
        '30x30':fmt('30x30','30 × 30 cm',11,0.99,'03Z3302'),
        '7.5x30':fmt('7.5x30','7,5 × 30 cm',44,0.99,'03Z7302'),
        '7.5x7.5':fmt('7.5x7.5','7,5 × 7,5 cm',176,0.99,'03Z7702')
      },
      'Sand Selected':{
        '30x30':fmt('30x30','30 × 30 cm',11,0.99,'03Z3303'),
        '7.5x30':fmt('7.5x30','7,5 × 30 cm',44,0.99,'03Z7303'),
        '7.5x7.5':fmt('7.5x7.5','7,5 × 7,5 cm',176,0.99,'03Z7703')
      },
      'Grey Selected':{
        '30x30':fmt('30x30','30 × 30 cm',11,0.99,'03Z3304'),
        '7.5x30':fmt('7.5x30','7,5 × 30 cm',44,0.99,'03Z7304'),
        '7.5x7.5':fmt('7.5x7.5','7,5 × 7,5 cm',176,0.99,'03Z7704')
      }
    }
  };

  const p = (id, group, parts, label='') => ({id:String(id),group,parts,label:label||`Schéma ${id}`});
  const patterns = [
    p(1,'modular',[['40.6x60.9',50],['40.6x40.6',33],['20.3x40.6',17]]),
    p(2,'modular',[['40.6x40.6',67],['20.3x40.6',33]]),
    p(3,'modular',[['40.6x60.9',33],['40.6x40.6',44],['20.3x40.6',23]]),
    p(4,'modular',[['40.6x60.9',50],['40.6x40.6',33],['20.3x40.6',17]]),
    p(5,'modular',[['40.6x40.6',50],['20.3x40.6',50]]),
    p(6,'modular',[['61x61',43],['40.6x60.9',28],['40.6x40.6',19],['20.3x40.6',10]]),
    p(7,'modular',[['61x61',36],['40.6x60.9',24],['40.6x40.6',32],['20.3x40.6',8]]),
    p(8,'modular',[['61x61',43],['40.6x60.9',28],['40.6x40.6',19],['20.3x40.6',10]]),
    p(9,'modular',[['61x61',48],['40.6x60.9',31],['40.6x40.6',21]]),
    p(10,'modular',[['61x61',43],['40.6x60.9',28],['40.6x40.6',19],['20.3x40.6',10]]),
    p(11,'modular',[['40.6x60.9',63],['40.6x40.6',21],['20.3x40.6',11],['20.3x20.3',5]]),
    p(12,'modular',[['40.6x60.9',46],['40.6x40.6',31],['20.3x40.6',15],['20.3x20.3',8]]),
    p(13,'modular',[['40.6x60.9',46],['40.6x40.6',31],['20.3x40.6',15],['20.3x20.3',8]]),
    p(14,'modular',[['40.6x60.9',46],['40.6x40.6',31],['20.3x40.6',15],['20.3x20.3',8]]),
    p(15,'modular',[['40.6x60.9',60],['40.6x40.6',20],['20.3x40.6',10],['20.3x20.3',10]]),
    p(16,'modular',[['40.6x60.9',57],['40.6x40.6',19],['20.3x40.6',19],['20.3x20.3',5]]),
    p(17,'modular',[['40.6x60.9',63],['40.6x40.6',21],['20.3x40.6',11],['20.3x20.3',5]]),
    p(18,'modular',[['40.6x60.9',63],['40.6x40.6',21],['20.3x40.6',11],['20.3x20.3',5]]),
    p(19,'modular',[['40.6x60.9',33],['40.6x40.6',44],['20.3x40.6',11],['20.3x20.3',11]]),
    p(20,'modular',[['40.6x60.9',33],['40.6x40.6',44],['20.3x40.6',11],['20.3x20.3',11]]),
    p(21,'modular',[['40.6x60.9',33],['40.6x40.6',44],['20.3x40.6',11],['20.3x20.3',11]]),
    p(22,'modular',[['40.6x60.9',33],['40.6x40.6',44],['20.3x40.6',11],['20.3x20.3',11]]),
    p(23,'small',[['6x25',100]],'Pose droite décalée · 6 × 25'),
    p(24,'small',[['6x25',100]],'Chevron · 6 × 25'),
    p(25,'small',[['4.8x45',100]],'Pose droite décalée · 4,8 × 45'),
    p(26,'small',[['4.8x45',100]],'Chevron · 4,8 × 45'),
    p(27,'small',[['4.8x20',100]],'Pose droite décalée · 4,8 × 20'),
    p(28,'small',[['4.8x20',100]],'Chevron · 4,8 × 20'),
    p(29,'sedimenti',[['30x30',64,'A'],['7.5x30',32,'B'],['7.5x7.5',4,'C']]),
    p(30,'sedimenti',[['7.5x30',50,'A'],['7.5x30',50,'B']]),
    p(31,'sedimenti',[['7.5x30',50,'A'],['7.5x30',50,'B']]),
    p(32,'sedimenti',[['7.5x30',40,'A'],['7.5x30',60,'B']])
  ];
  for(let i=1;i<=12;i++) patterns.push(p(`S${String(i).padStart(2,'0')}`,'segmento',[['15x15',100]],`Segmento Pattern ${String(i).padStart(2,'0')}`));

  return {
    version:'1.0.0', catalogue:'Elios Ceramica — Catalogue Général 2026',
    modularOptions, tropical, domus, glow, golden, segmento, sedimentiSelected, patterns
  };
})();
