(() => {
  'use strict';
  if(!Array.isArray(window.VIEW_CATALOGUE))window.VIEW_CATALOGUE=[];
  if(window.VIEW_CATALOGUE.some(p=>p.id==='view-marais'))return;

  const img=(url,alt)=>({url,alt});
  const pack=(m2Box,pcsBox,kgBox,boxesPallet,m2Pallet,kgPallet)=>({m2Box,pcsBox,kgBox,boxesPallet,m2Pallet,kgPallet});
  const v=(key,format,thickness,finish,publicPrice,proPrice,extra={})=>({key,format,thickness,finish,publicPrice,proPrice,unit:'m²',...extra});
  const source='Listino VIEW n°24 · Prix nets FR CL 0226';

  window.VIEW_CATALOGUE.push(
    {
      id:'view-marais',slug:'marais',name:'MARAIS',collection:'Marais',
      category:'Carrelage effet pierre',effect:'Pierre',
      description:'Grès cérame rectifié imitation Pierre Bleue en Avana, Beige, Argento et Grafite. Finition naturelle, Vintage et versions extérieures 20 mm Grip.',
      formats:['60×60','60×90','90×90'],colors:['Avana','Beige','Argento','Grafite'],colorFamilies:['Beige','Gris','Noir'],finishes:['Naturel R10/A+B','Vintage','Grip R11/A+B+C'],
      images:[img('assets/img/view.png','Marais · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/marais-2/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('marais-9090-nat','90×90','10 mm','Naturel R10/A+B',66,16.5,{colors:['Avana','Beige','Argento','Grafite'],refs:{Avana:'VMS920R',Beige:'VMS925R',Argento:'VMS930R',Grafite:'VMS970R'},pack:pack(1.62,2,37.27,20,32.4,745)}),
        v('marais-9090-v','90×90','10 mm','Vintage',82,21.5,{colors:['Avana','Beige','Argento','Grafite'],refs:{Avana:'VMS920PR',Beige:'VMS925PR',Argento:'VMS930PR',Grafite:'VMS970PR'},pack:pack(1.62,2,37.27,20,32.4,745)}),
        v('marais-6090-nat','60×90','10 mm','Naturel R10/A+B',63,15.5,{colors:['Avana','Beige','Argento','Grafite'],refs:{Avana:'VMS6920LR',Beige:'VMS6925LR',Argento:'VMS6930LR',Grafite:'VMS6970LR'},pack:pack(1.08,2,24,48,51.84,1152)}),
        v('marais-6090-v','60×90','10 mm','Vintage',80,20.5,{colors:['Avana','Beige','Argento','Grafite'],refs:{Avana:'VMS6920LPR',Beige:'VMS6925LPR',Argento:'VMS6930LPR',Grafite:'VMS6970LPR'},pack:pack(1.08,2,24,48,51.84,1152)}),
        v('marais-6060-nat','60×60','10 mm','Naturel R10/A+B',52,13,{colors:['Avana','Beige','Argento','Grafite'],refs:{Avana:'VMS620R',Beige:'VMS625R',Argento:'VMS630R',Grafite:'VMS670R'},pack:pack(1.08,3,24,40,43.2,960)}),
        v('marais-6060-v','60×60','10 mm','Vintage',69,18,{colors:['Avana','Beige','Argento','Grafite'],refs:{Avana:'VMS620PR',Beige:'VMS625PR',Argento:'VMS630PR',Grafite:'VMS670PR'},pack:pack(1.08,3,24,40,43.2,960)}),
        v('marais-9090-20','90×90','20 mm','Grip R11/A+B+C',101,null,{colors:['Avana','Argento','Grafite'],refs:{Avana:'VMS92020R',Argento:'VMS93020R',Grafite:'VMS97020R'},proPalette:27.5,proDetail:29.5,pack:pack(.81,1,36,25,20.25,900)}),
        v('marais-6090-20','60×90','20 mm','Grip R11/A+B+C',95,null,{colors:['Avana','Beige','Grafite'],refs:{Avana:'VMS6920L20R',Beige:'VMS6925L20R',Grafite:'VMS6930L20R'},proPalette:25,proDetail:27,pack:pack(.54,1,24.5,48,25.92,1176),note:'Le Listino VIEW n°24 indique Avana, Beige et Grafite pour cette ligne 20 mm.'})
      ]
    },
    {
      id:'view-tibur',slug:'tibur',name:'TIBUR',collection:'Tibur',
      category:'Carrelage effet pierre',effect:'Pierre de Jérusalem',
      description:'Grès cérame imitation pierre de Jérusalem en Almond, Silver et Carbon, avec surface naturelle, Vintage et Grip extérieur.',
      formats:['30×60','60×60','60×90','90×90'],colors:['Almond','Silver','Carbon'],colorFamilies:['Beige','Gris','Noir'],finishes:['Naturel R10/A+B','Vintage','Grip R11/A+B+C'],
      images:[img('assets/img/view.png','Tibur · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/tibur-fr/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('tibur-9090-nat','90×90','10 mm','Naturel R10/A+B',66,16.5,{colors:['Carbon'],refs:{Carbon:'VTI970R'},pack:pack(1.62,2,35,20,32.4,700)}),
        v('tibur-9090-v','90×90','10 mm','Vintage',82,21.5,{colors:['Carbon'],refs:{Carbon:'VTI970PR'},pack:pack(1.62,2,35,20,32.4,700)}),
        v('tibur-6090-as-nat','60×90','10 mm','Naturel R10/A+B',60,15.5,{colors:['Almond','Silver'],refs:{Almond:'VTI6920LR',Silver:'VTI6930LR'},pack:pack(1.08,2,23.5,45,48.6,1058)}),
        v('tibur-6090-c-nat','60×90','10 mm','Naturel R10/A+B',60,15.5,{colors:['Carbon'],refs:{Carbon:'VTI6970LR'},pack:pack(1.08,2,24,48,51.84,1152)}),
        v('tibur-6090-as-v','60×90','10 mm','Vintage',76,20.5,{colors:['Almond','Silver'],refs:{Almond:'VTI6920LPR',Silver:'VTI6930LPR'},pack:pack(1.08,2,23.5,45,48.6,1058)}),
        v('tibur-6090-c-v','60×90','10 mm','Vintage',76,20.5,{colors:['Carbon'],refs:{Carbon:'VTI6970LPR'},pack:pack(1.08,2,24,48,51.84,1152)}),
        v('tibur-6090-grip','60×90','10 mm','Grip R11/A+B+C',64,15.5,{colors:['Almond','Silver'],refs:{Almond:'VTI6920LSR',Silver:'VTI6930LSR'},pack:pack(1.08,2,23.5,45,48.6,1060)}),
        v('tibur-6060-nat','60×60','10 mm','Naturel R10/A+B',48,13,{colors:['Almond','Silver','Carbon'],refs:{Almond:'VTI620R',Silver:'VTI630R',Carbon:'VTI670R'},pack:pack(1.08,3,23,40,43.2,920)}),
        v('tibur-6060-v','60×60','10 mm','Vintage',63,18,{colors:['Almond','Silver','Carbon'],refs:{Almond:'VTI620PR',Silver:'VTI630PR',Carbon:'VTI670PR'},pack:pack(1.08,3,23,40,43.2,920)}),
        v('tibur-3060-nat','30×60','10 mm','Naturel R10/A+B',48,13,{colors:['Almond','Silver','Carbon'],refs:{Almond:'VTI620LR',Silver:'VTI630LR',Carbon:'VTI670LR'},pack:pack(1.08,6,23,40,43.2,920)}),
        v('tibur-3060-v','30×60','10 mm','Vintage',66,18,{colors:['Almond','Silver','Carbon'],refs:{Almond:'VTI620LPR',Silver:'VTI630LPR',Carbon:'VTI670LPR'},pack:pack(1.08,6,23,40,43.2,920)}),
        v('tibur-6090-20','60×90','20 mm','Grip R11/A+B+C',90,null,{colors:['Almond','Silver'],refs:{Almond:'VTI6920L20R',Silver:'VTI6930L20R'},proPalette:25,proDetail:27,pack:pack(.54,1,24,48,25.92,1152)})
      ]
    },
    {
      id:'view-oikos',slug:'oikos',name:'OIKOS',collection:'Oikos',
      category:'Carrelage effet béton',effect:'Béton / ciment',
      description:'Grès cérame effet béton coffré, légèrement structuré, en White, Silver et Grey au format 60×120.',
      formats:['60×120'],colors:['White','Silver','Grey'],colorFamilies:['Blanc','Gris'],finishes:['Naturel R10/A+B'],
      images:[img('assets/img/view.png','Oikos · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/oikos-en/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('oikos-60120','60×120','10 mm','Naturel R10/A+B',60,15.5,{colors:['White','Silver','Grey'],refs:{White:'VOK61210LR',Silver:'VOK61230LR',Grey:'VOK61240LR'},pack:pack(1.44,2,32.2,35,50.4,1127)})
      ]
    },
    {
      id:'view-marmi',slug:'i-marmi-di-view',name:'I MARMI DI VIEW',collection:'I Marmi di View',
      category:'Carrelage effet marbre',effect:'Marbre',
      description:'Grès cérame effet marbre, surfaces matt et levigato poli. Les références et couleurs ci-dessous suivent le Listino VIEW n°24.',
      formats:['60×120','120×120'],colors:['Calacatta','Statuario','Travertino Bianco','Soveraia Silver','Pulpis Ivoire','Pulpis Gris','Soveraia Grey','Sahara Noir'],colorFamilies:['Blanc','Beige','Gris','Noir'],finishes:['Matt','Levigato poli'],
      images:[img('assets/img/view.png','I Marmi di View · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/marmi/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('marmi-120-pol-a','120×120','9,5 mm','Levigato poli',120,30,{colors:['Calacatta','Statuario','Travertino Bianco','Soveraia Silver','Pulpis Ivoire','Pulpis Gris'],refs:{Calacatta:'VMV112010LPR',Statuario:'VMV112015LPR','Travertino Bianco':'VMV112020LPR','Soveraia Silver':'VMV112040LPR','Pulpis Ivoire':'VMV112025LPR','Pulpis Gris':'VMV112045LPR'},pack:pack(1.44,2,33,32,46.08,1056)}),
        v('marmi-120-pol-b','120×120','9,5 mm','Levigato poli',128,30,{colors:['Soveraia Grey','Sahara Noir'],refs:{'Soveraia Grey':'VMV112070LPR','Sahara Noir':'VMV112075LPR'},pack:pack(1.44,2,33,32,46.08,1056)}),
        v('marmi-120-matt-a','120×120','9,5 mm','Matt R10/A',91,22,{colors:['Calacatta','Statuario','Travertino Bianco','Soveraia Silver','Pulpis Ivoire','Pulpis Gris'],refs:{Calacatta:'VMV112010LR',Statuario:'VMV112015LR','Travertino Bianco':'VMV112020PR','Soveraia Silver':'VMV112040LR','Pulpis Ivoire':'VMV112025LR','Pulpis Gris':'VMV112045LR'},pack:pack(1.44,2,33,32,46.08,1056),note:'Le code VMV112020PR est reproduit tel qu’indiqué dans le Listino n°24.'}),
        v('marmi-120-matt-b','120×120','9,5 mm','Matt R10/A',95,22,{colors:['Soveraia Grey','Sahara Noir'],refs:{'Soveraia Grey':'VMV112070LR','Sahara Noir':'VMV112075LR'},pack:pack(1.44,2,33,32,46.08,1056)}),
        v('marmi-60120-pol-a','60×120','9,5 mm','Levigato poli',94,26,{colors:['Calacatta','Statuario','Travertino Bianco','Soveraia Silver','Pulpis Ivoire','Pulpis Gris'],refs:{Calacatta:'VMV61210LPR',Statuario:'VMV61215LPR','Travertino Bianco':'VMV61220LPR','Soveraia Silver':'VMV61240LPR','Pulpis Ivoire':'VMV61225LPR','Pulpis Gris':'VMV61245LPR'},pack:pack(1.44,2,33,32,46.08,1056)}),
        v('marmi-60120-pol-b','60×120','9,5 mm','Levigato poli',98,26,{colors:['Soveraia Grey','Sahara Noir'],refs:{'Soveraia Grey':'VMV61270LPR','Sahara Noir':'VMV61275LPR'},pack:pack(1.44,2,33,32,46.08,1056)}),
        v('marmi-60120-matt-a','60×120','9,5 mm','Matt R10/A',70,19.5,{colors:['Calacatta','Statuario','Travertino Bianco','Soveraia Silver','Pulpis Ivoire','Pulpis Gris'],refs:{Calacatta:'VMV61210LR',Statuario:'VMV61215LR','Travertino Bianco':'VMV61220LR','Soveraia Silver':'VMV61240LR','Pulpis Ivoire':'VMV61225LR','Pulpis Gris':'VMV61245LR'},pack:pack(1.44,2,33,32,46.08,1056)}),
        v('marmi-60120-matt-b','60×120','9,5 mm','Matt R10/A',74,19.5,{colors:['Soveraia Grey','Sahara Noir'],refs:{'Soveraia Grey':'VMV61270LR','Sahara Noir':'VMV61275LR'},pack:pack(1.44,2,33,32,46.08,1056)})
      ]
    },
    {
      id:'view-light',slug:'light',name:'LIGHT',collection:'Light',
      category:'Carrelage effet béton',effect:'Béton / ciment',
      description:'Grès cérame effet béton en Sabbia, Perla, Cenere et Grafite, avec formats intérieurs, 20 mm Grip et grandes dalles 120×278.',
      formats:['30×60','60×60','60×120','100×100','120×278'],colors:['Sabbia','Perla','Cenere','Grafite'],colorFamilies:['Beige','Gris','Noir'],finishes:['Naturel R10/B','Grip R11/C','Grande dalle 6,5 mm'],
      images:[img('assets/img/view.png','Light · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/light-2/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('light-100','100×100','8,5 mm','Naturel R10/B',74,18,{colors:['Sabbia','Perla','Cenere','Grafite'],refs:{Sabbia:'VLH10020R',Perla:'VLH10030R',Cenere:'VLH10040R',Grafite:'VLH10070R'},pack:pack(2,2,40,24,48,960)}),
        v('light-60120','60×120','9,5 mm','Naturel R10/B',62,15.5,{colors:['Sabbia','Perla','Cenere','Grafite'],refs:{Sabbia:'VLH61220LR',Perla:'VLH61230LR',Cenere:'VLH61240LR',Grafite:'VLH61270LR'},pack:pack(1.44,2,31.6,36,51.84,1138)}),
        v('light-6060','60×60','9,5 mm','Naturel R10/B',50,13,{colors:['Sabbia','Perla','Cenere','Grafite'],refs:{Sabbia:'VLH620R',Perla:'VLH630R',Cenere:'VLH640R',Grafite:'VLH670R'},pack:pack(1.08,3,23.3,40,43.2,932)}),
        v('light-3060','30×60','9,5 mm','Naturel R10/B',50,13,{colors:['Sabbia','Perla','Cenere','Grafite'],refs:{Sabbia:'VLH620LR',Perla:'VLH630LR',Cenere:'VLH640LR',Grafite:'VLH670LR'},pack:pack(1.08,6,23.3,40,43.2,932)}),
        v('light-6060-20','60×60','20 mm','Grip R11/C',80,null,{colors:['Sabbia','Perla','Cenere','Grafite'],refs:{},proPalette:22,proDetail:24,pack:pack(.72,2,33,30,21.6,990),note:'Le Listino n°24 présente une incohérence de codes sur cette ligne 60×60 20 mm ; référence à confirmer auprès de VIEW.'}),
        v('light-100-20','100×100','20 mm','Grip R11/C',100,null,{colors:['Sabbia','Perla','Cenere','Grafite'],refs:{Sabbia:'VLH1002020R',Perla:'VLH1003020R',Cenere:'VLH1004020R',Grafite:'VLH1007020R'},proPalette:29.5,proDetail:31.5,pack:pack(1,1,46.6,21,21,979)}),
        v('light-slab','120×278','6,5 mm','Naturel R10/B',108,39.02,{colors:['Sabbia','Perla','Cenere'],refs:{Sabbia:'VLH27820LR',Perla:'VLH27830LR',Cenere:'VLH27840LR'},pack:pack(3.33,1,51.6,18,59.94,929),note:'Net calculé selon remise slabs FR CL 0226 : -50% -15% -15%.'})
      ]
    },
    {
      id:'view-dorset',slug:'dorset',name:'DORSET',collection:'Dorset',
      category:'Carrelage effet pierre',effect:'Pierre',
      description:'Grès cérame imitation pierre portugaise, rectifié en 10,5 mm et décliné en 20 mm Grip au format 60×90.',
      formats:['30×60','60×60','60×90'],colors:['Crema','Sabbia','Perla','Pietra','Ombra'],colorFamilies:['Blanc','Beige','Gris','Noir'],finishes:['Naturel R10/A','Grip R11/A+B+C'],
      images:[img('assets/img/view.png','Dorset · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/dorset-fr/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('dorset-6090','60×90','10,5 mm','Naturel R10/A',60,15.5,{colors:['Crema','Sabbia','Perla','Pietra','Ombra'],refs:{Crema:'VDO6910LR',Sabbia:'VDO6920LR',Perla:'VDO6930LR',Pietra:'VDO6940LR',Ombra:'VDO6970LR'},pack:pack(1.08,2,23.55,45,48.6,1060)}),
        v('dorset-6060','60×60','10,5 mm','Naturel R10/A',48,13,{colors:['Crema','Sabbia','Perla','Pietra'],refs:{Crema:'VDO610R',Sabbia:'VDO620R',Perla:'VDO630R',Pietra:'VDO640R'},pack:pack(1.08,3,23,40,43.2,920)}),
        v('dorset-3060','30×60','10,5 mm','Naturel R10/A',48,13,{colors:['Crema','Sabbia','Perla','Pietra'],refs:{Crema:'VDO610LR',Sabbia:'VDO620LR',Perla:'VDO630LR',Pietra:'VDO640LR'},pack:pack(1.08,6,23,40,43.2,920)}),
        v('dorset-6090-20','60×90','20 mm','Grip R11/A+B+C',90,null,{colors:['Sabbia','Perla','Pietra','Ombra'],refs:{Sabbia:'VDO6920L20R',Perla:'VDO6930L20R',Pietra:'VDO6940L20R',Ombra:'VDO6970L20R'},proPalette:25,proDetail:27,pack:pack(.54,1,24.6,48,25.92,1181),note:'Couleurs reproduites telles qu’indiquées dans le Listino VIEW n°24.'})
      ]
    },
    {
      id:'view-baar-stone',slug:'baar-stone',name:'BAAR STONE',collection:'Baar Stone',
      category:'Carrelage effet pierre',effect:'Pierre de Jura',
      description:'Grès cérame effet pierre de Jura en Pure, Beige et Grey, avec finition naturelle, Vintage, extérieur 20 mm et dalle 120×278.',
      formats:['30×60','60×60','60×120','120×120','120×278'],colors:['Pure','Beige','Grey'],colorFamilies:['Blanc','Beige','Gris'],finishes:['Naturel R10/B','Vintage','Grip R11/C','Grande dalle 6,5 mm'],
      images:[img('assets/img/view.png','Baar Stone · View Ceramica')],
      sourceUrl:'https://viewceramiche.com/prodotto/baar-stone-3/',sourceLabel:source,availability:'Disponibilité à confirmer auprès de VIEW',
      variants:[
        v('baar-120-nat','120×120','9,5 mm','Naturel R10/B',78,20,{colors:['Pure','Beige','Grey'],refs:{Pure:'VBS112010R',Beige:'VBS112020R',Grey:'VBS112040R'},pack:pack(1.44,1,32.4,40,57.6,1296)}),
        v('baar-120-v','120×120','9,5 mm','Vintage',95,25,{colors:['Pure','Beige','Grey'],refs:{Pure:'VBS112010PR',Beige:'VBS112020PR',Grey:'VBS112040PR'},pack:pack(1.44,1,32.4,40,57.6,1296)}),
        v('baar-60120-nat','60×120','9,5 mm','Naturel R10/B',60,15.5,{colors:['Pure','Beige','Grey'],refs:{Pure:'VBS61210LR',Beige:'VBS61220LR',Grey:'VBS61240LR'},pack:pack(1.44,2,30.1,36,51.84,1084)}),
        v('baar-60120-v','60×120','9,5 mm','Vintage',80,20.5,{colors:['Pure','Beige','Grey'],refs:{Pure:'VBS61210LPR',Beige:'VBS61220LPR',Grey:'VBS61240LPR'},pack:pack(1.44,2,30.1,36,51.84,1084)}),
        v('baar-6060-nat','60×60','9,5 mm','Naturel R10/B',48,13,{colors:['Pure','Beige','Grey'],refs:{Pure:'VBS610R',Beige:'VBS620R',Grey:'VBS640R'},pack:pack(1.44,4,29.2,30,43.2,876)}),
        v('baar-6060-v','60×60','9,5 mm','Vintage',59,18,{colors:['Pure','Beige','Grey'],refs:{Pure:'VBS610PR',Beige:'VBS620PR',Grey:'VBS640PR'},pack:pack(1.44,4,29.2,30,43.2,876)}),
        v('baar-3060-nat','30×60','9,5 mm','Naturel R10/B',48,13,{colors:['Pure','Beige','Grey'],refs:{Pure:'VBS610LR',Beige:'VBS620LR',Grey:'VBS640LR'},pack:pack(1.44,8,28.95,32,46.08,926)}),
        v('baar-3060-v','30×60','9,5 mm','Vintage',59,18,{colors:['Pure','Beige','Grey'],refs:{Pure:'VBS610LPR',Beige:'VBS620LPR',Grey:'VBS640LPR'},pack:pack(1.44,8,28.95,32,46.08,926)}),
        v('baar-60120-20','60×120','20 mm','Grip R11/C',90,null,{colors:['Pure','Beige','Grey'],refs:{Pure:'VBS6121020R',Beige:'VBS6122020R',Grey:'VBS6124020R'},proPalette:26,proDetail:28,pack:pack(.72,1,33,30,21.6,990)}),
        v('baar-slab','120×278','6,5 mm','Naturel R10/B',108,39.02,{colors:['Pure','Beige','Grey'],refs:{Pure:'VBS27810LR',Beige:'VBS27820LR',Grey:'VBS27840LR'},pack:pack(3.33,1,51.6,18,59.94,929),note:'Net calculé selon remise slabs FR CL 0226 : -50% -15% -15%.'})
      ]
    }
  );
})();