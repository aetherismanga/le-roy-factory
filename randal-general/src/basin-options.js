import {SOLID_FAMILIES} from '../../shared/lrf-3d/solid-surface-catalog.js';

export const TOP_OPTIONS=Object.freeze([
 {id:'none',name:'Meuble seul',description:'Sans plan ni vasque'},
 {id:'compact',name:'Vasque LESS incluse',description:'Lave-mains compact 40 × 22 cm'},
 {id:'sella',name:'Sella encastrée',description:'Céramique blanc brillant · 80 cm',reference:'2171'},
 {id:'tampa',name:'Tampa encastrée',description:'Blanc brillant, blanc mat ou noir mat',reference:'6228'},
 ...Object.entries(SOLID_FAMILIES).map(([id,family])=>({id,name:family.name+' · Solid Surface',description:'Solid Surface blanc mat',image:'assets/solid-'+id+'.webp',group:'integrated'})),
 {id:'plain',name:'Plan assorti seul',description:'Même finition que le meuble · ép. 2 cm',reference:'14215 80@FINITION'},
 {id:'neris',name:'Plan + Neris',description:'Vasque à poser · 46 × 33 × 14 cm',reference:'9567'},
 {id:'torne',name:'Plan + Torne',description:'Vasque à poser · Ø 37 × 12 cm',reference:'9559'}
]);
