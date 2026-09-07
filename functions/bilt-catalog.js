'use strict';

const VERSION = 'TARIFS 3.2.1 2026';
const P = (ref, group, name, format, net, minQty, minUnit) => ({ ref, group, name, format, net, minQty, minUnit });

const PRODUCTS = [
  P('BSA021','NOX CLIP','NOX CLIP 0,5 mm','200 uds',6.25,18,'Sacs'),
  P('BSA007','NOX CLIP','NOX CLIP 1,0 mm','200 uds',5.16,18,'Sacs'),
  P('BSA022','NOX CLIP','NOX CLIP 1,5 mm','200 uds',5.16,18,'Sacs'),
  P('BSA023','NOX CLIP','NOX CLIP 2,0 mm','200 uds',5.16,18,'Sacs'),
  P('BSA024','NOX CLIP','NOX CLIP 3,0 mm','200 uds',5.16,18,'Sacs'),
  P('BSA059','NOX CLIP','NOX CLIP 4,0 mm','200 uds',5.16,18,'Sacs'),
  P('BSA044','NOX CLIP','NOX CLIP 5,0 mm','200 uds',5.16,18,'Sacs'),

  P('BSA112','MINI BOX NOX CLIP','MINI BOX NOX CLIP 0,5 mm','1000 uds',29.90,4,'Cartons'),
  P('BSA113','MINI BOX NOX CLIP','MINI BOX NOX CLIP 1,0 mm','1000 uds',24.30,4,'Cartons'),
  P('BSA114','MINI BOX NOX CLIP','MINI BOX NOX CLIP 1,5 mm','1000 uds',24.30,4,'Cartons'),
  P('BSA115','MINI BOX NOX CLIP','MINI BOX NOX CLIP 2,0 mm','1000 uds',24.30,4,'Cartons'),
  P('BSA116','MINI BOX NOX CLIP','MINI BOX NOX CLIP 3,0 mm','1000 uds',24.30,4,'Cartons'),
  P('BSA117','MINI BOX NOX CLIP','MINI BOX NOX CLIP 4,0 mm','1000 uds',24.30,4,'Cartons'),
  P('BSA118','MINI BOX NOX CLIP','MINI BOX NOX CLIP 5,0 mm','1000 uds',24.30,4,'Cartons'),

  P('BSA045','BIG BOX NOX CLIP','BIG BOX NOX CLIP 0,5 mm','4000 uds',117.50,1,'Carton'),
  P('BSA046','BIG BOX NOX CLIP','BIG BOX NOX CLIP 1,0 mm','4000 uds',95.60,1,'Carton'),
  P('BSA047','BIG BOX NOX CLIP','BIG BOX NOX CLIP 1,5 mm','4000 uds',95.60,1,'Carton'),
  P('BSA048','BIG BOX NOX CLIP','BIG BOX NOX CLIP 2,0 mm','4000 uds',95.60,1,'Carton'),
  P('BSA049','BIG BOX NOX CLIP','BIG BOX NOX CLIP 3,0 mm','4000 uds',95.60,1,'Carton'),
  P('BSA053','BIG BOX NOX CLIP','BIG BOX NOX CLIP 4,0 mm','4000 uds',95.60,1,'Carton'),
  P('BSA050','BIG BOX NOX CLIP','BIG BOX NOX CLIP 5,0 mm','4000 uds',95.60,1,'Carton'),
  P('BSA051','BIG BOX NOX CLIP','BIG BOX CUÑA REMONTABLE','2000 uds',84.70,1,'Carton'),

  P('BSA008','ACCESSOIRES NIVELLEMENT','CALE REMONTABLE','100 uds',4.48,20,'Sacs'),
  P('BSA009','ACCESSOIRES NIVELLEMENT','PINCE AJUSTABLE','1 uni',10.45,10,'Uds'),
  P('BSA052','ACCESSOIRES NIVELLEMENT','PROTECTEUR GRES','100 uds',5.95,10,'Sacs'),

  P('BSA054','KIT NOX CLIP','KIT NOX 0,5 mm (1 pince + 100 clips + 100 cales)','1 uni',21.97,4,'Boites'),
  P('BSA025','KIT NOX CLIP','KIT NOX 1,0 mm (1 pince + 100 clips + 100 cales)','1 uni',20.97,4,'Boites'),
  P('BSA043','KIT NOX CLIP','KIT NOX 1,5 mm (1 pince + 100 clips + 100 cales)','1 uni',20.97,4,'Boites'),
  P('BSA055','KIT NOX CLIP','KIT NOX 2,0 mm (1 pince + 100 clips + 100 cales)','1 uni',20.97,4,'Boites'),
  P('BSA056','KIT NOX CLIP','KIT NOX 3,0 mm (1 pince + 100 clips + 100 cales)','1 uni',20.97,4,'Boites'),
  P('BSA057','KIT NOX CLIP','KIT NOX 4,0 mm (1 pince + 100 clips + 100 cales)','1 uni',20.97,4,'Boites'),
  P('BSA058','KIT NOX CLIP','KIT NOX 5,0 mm (1 pince + 100 clips + 100 cales)','1 uni',20.97,4,'Boites'),

  P('BSA039','CLIP XXL','CLIP XXL 1,0 mm','200 uds',7.16,12,'Sacs'),
  P('BSA040','CLIP XXL','CLIP XXL 1,5 mm','200 uds',7.16,12,'Sacs'),
  P('BSA041','CLIP XXL','CLIP XXL 2,0 mm','200 uds',7.16,12,'Sacs'),
  P('BSA042','CLIP XXL','CLIP XXL 3,0 mm','200 uds',7.16,12,'Sacs'),
  P('BSA072','CLIP XXL','CLIP XXL 4,0 mm','200 uds',7.16,12,'Sacs'),
  P('BSA073','CLIP XXL','CLIP XXL 5,0 mm','200 uds',7.16,12,'Sacs'),

  P('BSA060','CROIX CRX & CALE','CROIX CRX 1,0 mm','300 uds',1.25,30,'Sacs'),
  P('BSA065','CROIX CRX & CALE','CROIX CRX 1,5 mm','300 uds',1.35,30,'Sacs'),
  P('BSA061','CROIX CRX & CALE','CROIX CRX 2,0 mm','300 uds',1.37,30,'Sacs'),
  P('BSA062','CROIX CRX & CALE','CROIX CRX 3,0 mm','300 uds',1.62,30,'Sacs'),
  P('BSA063','CROIX CRX & CALE','CROIX CRX 4,0 mm','300 uds',1.78,30,'Sacs'),
  P('BSA064','CROIX CRX & CALE','CROIX CRX 5,0 mm','300 uds',1.98,30,'Sacs'),
  P('BSA068','CROIX CRX & CALE','CROIX CRX 7,0 mm','150 uds',2.08,30,'Sacs'),
  P('BSA069','CROIX CRX & CALE','CROIX CRX 10,0 mm','100 uds',1.74,30,'Sacs'),
  P('BSA066','CROIX CRX & CALE','CALE DE CARRELÉ 5 mm','500 uds',2.97,30,'Sacs'),

  P('BSA125','AGRAFE DE FAÇADE','AGRAFE DE BORD 10 mm','100 uds',29.95,9,'Cartons'),
  P('BSA126','AGRAFE DE FAÇADE','AGRAFE DE BORD 12 mm','100 uds',29.95,9,'Cartons'),
  P('BSA127','AGRAFE DE FAÇADE','AGRAFE DE BORD 15 mm','100 uds',29.95,9,'Cartons'),
  P('BSA128','AGRAFE DE FAÇADE','AGRAFE DE BORD 18 mm','100 uds',29.95,9,'Cartons'),
  P('BSA129','AGRAFE DE FAÇADE','AGRAFE INTERMÉDIAIRE 10 mm','100 uds',29.95,9,'Cartons'),
  P('BSA130','AGRAFE DE FAÇADE','AGRAFE INTERMÉDIAIRE 12 mm','100 uds',29.95,9,'Cartons'),
  P('BSA131','AGRAFE DE FAÇADE','AGRAFE INTERMÉDIAIRE 15 mm','100 uds',29.95,9,'Cartons'),
  P('BSA132','AGRAFE DE FAÇADE','AGRAFE INTERMÉDIAIRE 18 mm','100 uds',29.95,9,'Cartons'),

  P('BSA001','CHEVILLE PF CARTON','CHEVILLE PF 5 x 25 NYLON','100 uds',1.58,45,'Cartons'),
  P('BSA002','CHEVILLE PF CARTON','CHEVILLE PF 6 x 30 NYLON','100 uds',1.99,45,'Cartons'),
  P('BSA003','CHEVILLE PF CARTON','CHEVILLE PF 8 x 40 NYLON','100 uds',2.94,20,'Cartons'),
  P('BSA004','CHEVILLE PF CARTON','CHEVILLE PF 10 x 50 NYLON','50 uds',2.79,20,'Cartons'),
  P('BSA005','CHEVILLE PF CARTON','CHEVILLE PF 12 x 60 NYLON','25 uds',2.68,20,'Cartons'),
  P('BSA006','CHEVILLE PF CARTON','CHEVILLE PF 14 x 70 NYLON','20 uds',3.94,20,'Cartons'),

  P('BSA027','CHEVILLE PF CUBO','BOITE CHEVILLE PF 5 x 25','3000 uds',30.16,4,'Boites'),
  P('BSA028','CHEVILLE PF CUBO','BOITE CHEVILLE PF 6 x 30','3000 uds',35.90,4,'Boites'),
  P('BSA029','CHEVILLE PF CUBO','BOITE CHEVILLE PF 8 x 40','1500 uds',29.38,4,'Boites'),
  P('BSA030','CHEVILLE PF CUBO','BOITE CHEVILLE PF 10 x 50','750 uds',27.96,4,'Boites'),
  P('BSA186','CHEVILLE PF CUBO','BOITE CHEVILLE PF 12 x 60','500 uds',29.50,4,'Boites'),
  P('BSA187','CHEVILLE PF CUBO','BOITE CHEVILLE PF 14 x 70','300 uds',24.95,4,'Boites'),

  P('BSA031','CHEVILLE PF + VIS','CHEVILLE + VIS PF 5 x 25 + vis 3','50+50 uds',2.10,45,'Cartons'),
  P('BSA032','CHEVILLE PF + VIS','CHEVILLE + VIS PF 6 x 30 + vis 4','50+50 uds',2.49,45,'Cartons'),
  P('BSA033','CHEVILLE PF + VIS','CHEVILLE + VIS PF 8 x 40 + vis 5','50+50 uds',3.85,20,'Cartons'),
  P('BSA034','CHEVILLE PF + VIS','CHEVILLE + VIS PF 10 x 50 + vis 6','25+25 uds',3.65,20,'Cartons'),

  P('BSA070','CHEVILLE FAST','CHEVILLE FAST 6 x 37','100 uds',3.39,20,'Cartons'),
  P('BSA202','CHEVILLE FAST','CARTON CHEVILLE FAST 6 x 37','250 uds',8.42,21,'Cartons'),
  P('BSA071','CHEVILLE FAST','BOITE CHEVILLE FAST 6 x 37','1000 uds',31.50,4,'Boites'),

  P('BSA188','MULTICHEVILLE PF','MULTITACO PF','194 uds',10.95,20,'Cartons'),
  P('BSA189','MULTICHEVILLE PF','MULTITACO PF + Vis','350 uds',14.90,20,'Cartons'),

  P('BSA164','CHEVILLE POUR COLLIERS','CHEVILLE POUR COLLIERS ø 6 NOIR','100 uds',2.25,50,'Sacs'),
  P('BSA165','CHEVILLE POUR COLLIERS','CHEVILLE POUR COLLIERS ø 6 BLANC','100 uds',2.25,50,'Sacs'),
  P('BSA166','CHEVILLE POUR COLLIERS','CHEVILLE POUR COLLIERS ø 8 NOIR','100 uds',2.30,50,'Sacs'),
  P('BSA167','CHEVILLE POUR COLLIERS','CHEVILLE POUR COLLIERS ø 8 BLANC','100 uds',2.30,50,'Sacs'),

  P('BSA156','CHEVILLE ISO PRO','CHEVILLE ISO PRO 10 x 70','200 uds',24.35,2,'Cartons'),
  P('BSA157','CHEVILLE ISO PRO','CHEVILLE ISO PRO 10 x 90','200 uds',25.60,2,'Cartons'),
  P('BSA158','CHEVILLE ISO PRO','CHEVILLE ISO PRO 10 x 120','200 uds',29.95,2,'Cartons'),
  P('BSA159','CHEVILLE ISO PRO','CHEVILLE ISO PRO 10 x 140','200 uds',33.70,2,'Cartons'),
  P('BSA160','CHEVILLE ISO PRO','CHEVILLE ISO PRO 10 x 160','200 uds',38.95,2,'Cartons'),
  P('BSA161','CHEVILLE ISO PRO','CHEVILLE ISO PRO 10 x 180','200 uds',43.50,2,'Cartons'),
  P('BSA162','CHEVILLE ISO PRO','CHEVILLE ISO PRO 10 x 200','200 uds',50.95,2,'Cartons'),
  P('BSA163','CHEVILLE ISO PRO','CHEVILLE ISO PRO 10 x 220','200 uds',59.45,2,'Cartons'),

  P('BSA168','COLLIERS NYLON','COLLIERS 2,5 x 100','100 uds',0.49,500,'Sacs'),
  P('BSA169','COLLIERS NYLON','COLLIERS 2,5 x 130','100 uds',0.84,250,'Sacs'),
  P('BSA170','COLLIERS NYLON','COLLIERS 2,5 x 200','100 uds',1.10,250,'Sacs'),
  P('BSA171','COLLIERS NYLON','COLLIERS 3,6 x 140','100 uds',1.04,250,'Sacs'),
  P('BSA172','COLLIERS NYLON','COLLIERS 3,6 x 200','100 uds',1.45,200,'Sacs'),
  P('BSA173','COLLIERS NYLON','COLLIERS 3,6 x 300','100 uds',2.16,100,'Sacs'),
  P('BSA174','COLLIERS NYLON','COLLIERS 4,6 x 160','100 uds',1.67,100,'Sacs'),
  P('BSA175','COLLIERS NYLON','COLLIERS 4,8 x 200','100 uds',1.79,100,'Sacs'),
  P('BSA176','COLLIERS NYLON','COLLIERS 4,8 x 250','100 uds',2.59,100,'Sacs'),
  P('BSA177','COLLIERS NYLON','COLLIERS 4,8 x 300','100 uds',2.82,100,'Sacs'),
  P('BSA178','COLLIERS NYLON','COLLIERS 4,8 x 360','100 uds',3.54,50,'Sacs'),
  P('BSA179','COLLIERS NYLON','COLLIERS 4,8 x 430','100 uds',5.45,50,'Sacs'),
  P('BSA180','COLLIERS NYLON','COLLIERS 7,6 x 300','100 uds',5.90,50,'Sacs'),
  P('BSA181','COLLIERS NYLON','COLLIERS 7,6 x 370','100 uds',7.20,25,'Sacs'),
  P('BSA182','COLLIERS NYLON','COLLIERS 7,6 x 550','100 uds',13.90,10,'Sacs'),
  P('BSA183','COLLIERS NYLON','COLLIERS 7,6 x 750','100 uds',19.98,10,'Sacs'),
  P('BSA184','COLLIERS NYLON','COLLIERS 8,8 x 780','100 uds',22.15,10,'Sacs'),
  P('BSA185','COLLIERS NYLON','COLLIERS 12,4 x 1000','100 uds',53.90,10,'Sacs'),

  P('BSA074','COFFRAGE','SETA DE PROTECCIÓN ø8-20','100 uds',7.32,9,'Sacs'),
  P('BSA076','SÉPARATEUR TIMÓN','SÉPARATEUR TIMÓN 20 mm','250 uds',7.60,8,'Sacs'),
  P('BSA077','SÉPARATEUR TIMÓN','SÉPARATEUR TIMÓN 25 mm','250 uds',8.30,6,'Sacs'),
  P('BSA078','SÉPARATEUR TIMÓN','SÉPARATEUR TIMÓN 30 mm','100 uds',5.30,8,'Sacs'),
  P('BSA079','SÉPARATEUR TIMÓN','SÉPARATEUR TIMÓN 35 mm','100 uds',6.35,6,'Sacs'),
  P('BSA080','SÉPARATEUR TIMÓN','SÉPARATEUR TIMÓN 40 mm','50 uds',5.35,8,'Sacs'),
  P('BSA081','SÉPARATEUR TIMÓN','SÉPARATEUR TIMÓN 50 mm','50 uds',6.30,6,'Sacs'),
  P('BSA106','SÉPARATEUR TIMÓN','SÉPARATEUR TIMÓN 60 mm','200 uds',42.70,1,'Carton'),
  P('BSA107','SÉPARATEUR TIMÓN','SÉPARATEUR TIMÓN 70 mm','200 uds',49.80,1,'Carton'),

  P('BSA197','SÉPARATEUR COBRA','SÉPARATEUR COBRA 25 mm','1 uni',0.41,200,'Uds'),
  P('BSA198','SÉPARATEUR COBRA','SÉPARATEUR COBRA 30 mm','1 uni',0.44,200,'Uds'),
  P('BSA199','SÉPARATEUR COBRA','SÉPARATEUR COBRA 35 mm','1 uni',0.49,200,'Uds'),
  P('BSA200','SÉPARATEUR COBRA','SÉPARATEUR COBRA 40 mm','1 uni',0.52,200,'Uds'),
  P('BSA201','SÉPARATEUR COBRA','SÉPARATEUR COBRA 45 mm','1 uni',0.57,200,'Uds'),

  P('BSA088','TUBE & CÔNE COFFRAGE','TUBO PASAMURO ø22 x 2000 mm','1 uni',1.25,200,'Uds'),
  P('BSA090','TUBE & CÔNE COFFRAGE','CONO PASAMURO ø22','200 uds',5.90,12,'Sacs'),
  P('BSA108','TUBE & CÔNE COFFRAGE','TAPÓN ESTANCO ø22','250 uds',7.50,18,'Sacs')
];

const BY_REF = new Map(PRODUCTS.map(product => [product.ref, product]));
const GROUPS = [...new Set(PRODUCTS.map(product => product.group))];

function productByRef(ref) {
  return BY_REF.get(String(ref || '').trim().toUpperCase()) || null;
}

function publicCatalog() {
  return { version: VERSION, groups: GROUPS, products: PRODUCTS.map(product => ({ ...product })) };
}

module.exports = { VERSION, PRODUCTS, GROUPS, productByRef, publicCatalog };
