(()=>{
'use strict';
const S=window.LRF_ELIOS_POSE_V2;if(!S)return;const {D,state}=S;
const fmt=(key,label,pcs,boxM2,ref)=>({key,label,pcs,boxM2,ref});
const opt=(id,series,finish,finishLabel,color,formats)=>({id,series,finish,finishLabel,color,formats});
const roma=(id,finish,finishLabel,color,codes,with61)=>opt(id,'Roma',finish,finishLabel,color,{
  '20.3x20.3':fmt('20.3x20.3','20,3 × 20,3 cm',28,1.15,codes[0]),
  '20.3x40.6':fmt('20.3x40.6','20,3 × 40,6 cm',13,1.07,codes[1]),
  '40.6x40.6':fmt('40.6x40.6','40,6 × 40,6 cm',6,.99,codes[2]),
  '40.6x60.9':fmt('40.6x60.9','40,6 × 60,9 cm',6,1.46,codes[3]),
  ...(with61?{'61x61':fmt('61x61','61 × 61 cm',3,1.12,codes[4])}:{})
});
const sed=(id,finish,finishLabel,color,d)=>opt(id,'Sedimenti Tumbled',finish,finishLabel,color,{
  '20.3x20.3':fmt('20.3x20.3','20,3 × 20,3 cm',30,1.24,`03Z20${d}`),
  '20.3x40.6':fmt('20.3x40.6','20,3 × 40,6 cm',13,1.07,`03Z24${d}`),
  '40.6x40.6':fmt('40.6x40.6','40,6 × 40,6 cm',6,.99,`03Z40${d}`),
  '40.6x60.9':fmt('40.6x60.9','40,6 × 60,9 cm',6,1.48,`03Z46${d}`)
});
D.modularOptions=[
  roma('roma-r10-aventino','R10','R10 · 10 mm','Aventino',['0852040','0852640','0854240','0854640','0856140'],true),
  roma('roma-r10-celio','R10','R10 · 10 mm','Celio',['0852005','0852605','0854205','0854605','0856105'],true),
  roma('roma-r11-aventino','R11','Outdoor R11 · 10 mm','Aventino',['0852042','0852642','0854242','0854642'],false),
  roma('roma-r11-celio','R11','Outdoor R11 · 10 mm','Celio',['0852007','0852607','0854207','0854607'],false),
  sed('sedimenti-tumbled-r10-white','R10','Tumbled · R10 · 8,5 mm','White Tumbled','01'),
  sed('sedimenti-tumbled-r10-beige','R10','Tumbled · R10 · 8,5 mm','Beige Tumbled','02'),
  sed('sedimenti-tumbled-r10-sand','R10','Tumbled · R10 · 8,5 mm','Sand Tumbled','03'),
  sed('sedimenti-tumbled-r10-grey','R10','Tumbled · R10 · 8,5 mm','Grey Tumbled','04'),
  sed('sedimenti-tumbled-r11-beige','R11','Tumbled · Outdoor R11 · 8,5 mm','Beige Tumbled','05'),
  sed('sedimenti-tumbled-r11-sand','R11','Tumbled · Outdoor R11 · 8,5 mm','Sand Tumbled','06')
];
S.modules={
  'roma-r10-aventino':{ref:'085M140',label:'Modulo préemballé · 0,75 m²',boxM2:.75,pcs:6,finish:'R10 · 10 mm'},
  'roma-r10-celio':{ref:'085M105',label:'Modulo préemballé · 0,75 m²',boxM2:.75,pcs:6,finish:'R10 · 10 mm'},
  'roma-r11-aventino':{ref:'085M141',label:'Modulo extérieur préemballé · 0,75 m²',boxM2:.75,pcs:6,finish:'Outdoor R11 · 10 mm'},
  'roma-r11-celio':{ref:'085M106',label:'Modulo extérieur préemballé · 0,75 m²',boxM2:.75,pcs:6,finish:'Outdoor R11 · 10 mm'},
  'sedimenti-tumbled-r10-white':{ref:'03ZM101',label:'Modulo pré-boxé · 0,75 m²',boxM2:.75,pcs:6,finish:'Tumbled · R10 · 8,5 mm'},
  'sedimenti-tumbled-r10-beige':{ref:'03ZM102',label:'Modulo pré-boxé · 0,75 m²',boxM2:.75,pcs:6,finish:'Tumbled · R10 · 8,5 mm'},
  'sedimenti-tumbled-r10-sand':{ref:'03ZM103',label:'Modulo pré-boxé · 0,75 m²',boxM2:.75,pcs:6,finish:'Tumbled · R10 · 8,5 mm'},
  'sedimenti-tumbled-r10-grey':{ref:'03ZM104',label:'Modulo pré-boxé · 0,75 m²',boxM2:.75,pcs:6,finish:'Tumbled · R10 · 8,5 mm'},
  'sedimenti-tumbled-r11-beige':{ref:'03ZM105',label:'Modulo extérieur pré-boxé · 0,75 m²',boxM2:.75,pcs:6,finish:'Tumbled · Outdoor R11 · 8,5 mm'},
  'sedimenti-tumbled-r11-sand':{ref:'03ZM106',label:'Modulo extérieur pré-boxé · 0,75 m²',boxM2:.75,pcs:6,finish:'Tumbled · Outdoor R11 · 8,5 mm'}
};
state.modularId=D.modularOptions[0].id;
const stepNote=document.querySelector('.ep-left .ep-step small');if(stepNote)stepNote.textContent='Collection, finition R10/R11, modèle / couleur puis conditionnement.';
})();
