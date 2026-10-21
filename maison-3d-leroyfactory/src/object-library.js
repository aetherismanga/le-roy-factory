import * as T from 'three';
import {box,cylinder,sphere,tube,mesh,group} from './geometry.js';
import {furnitureKit} from './furniture.js';
import {ROOMS,SCALE,roomBounds,point} from './plan.js';

export const OBJECT_LIBRARY=[
 {id:'plant-ficus',name:'Ficus · pot minéral',kind:'plant',category:'Végétal',mark:'♧',variant:0},
 {id:'plant-palm',name:'Kentia · feuillage arqué',kind:'plant',category:'Végétal',mark:'♧',variant:1},
 {id:'plant-sansevieria',name:'Sansevieria · pot strié',kind:'plant',category:'Végétal',mark:'♧',variant:2},
 {id:'plant-monstera',name:'Monstera · grandes feuilles',kind:'plant',category:'Végétal',mark:'♧',variant:3},
 {id:'art-horizon',name:'Horizon · tableau paysage',kind:'art',category:'Tableaux',mark:'▧',variant:10,mount:'wall'},
 {id:'art-arches',name:'Architecture · tableau encadré',kind:'art',category:'Tableaux',mark:'▧',variant:11,mount:'wall'},
 {id:'art-lines',name:'Traits · composition graphique',kind:'art',category:'Tableaux',mark:'▧',variant:12,mount:'wall'},
 {id:'art-earth',name:'Terres · abstraction',kind:'art',category:'Tableaux',mark:'▧',variant:13,mount:'wall'},
 {id:'sofa-linen',name:'Canapé droit · lin naturel',kind:'sofa',category:'Mobilier',mark:'▱'},
 {id:'armchair-sage',name:'Fauteuil · tissu sauge',kind:'chair',category:'Mobilier',mark:'▱'},
 {id:'coffee-oak',name:'Tables basses · chêne',kind:'coffeeTable',category:'Mobilier',mark:'○'},
 {id:'desk-oak',name:'Bureau · chêne naturel',kind:'desk',category:'Mobilier',mark:'▱'},
 {id:'wardrobe-oak',name:'Armoire · deux portes',kind:'wardrobe',category:'Mobilier',mark:'▥'},
 {id:'bed-linen',name:'Lit double · lin',kind:'bed',category:'Mobilier',mark:'▱'},
 {id:'rug-natural',name:'Tapis · tissage naturel',kind:'rug',category:'Décoration',mark:'▤'},
 {id:'floor-lamp',name:'Lampadaire · laiton & lin',kind:'light',category:'Décoration',mark:'◉'},
 {id:'vase-sculpture',name:'Sculpture · céramique sur socle',kind:'sculpture',category:'Décoration',mark:'◒'},
 {id:'console-books',name:'Console · livres & objets',kind:'shelf',category:'Décoration',mark:'▤'},
];
export function validateAdditions(list=[]){
 if(!Array.isArray(list)||list.length>80)throw Error('Limite de 80 éléments supplémentaires.');
 const ids=new Set();for(const x of list){if(!x||!/^extra-[\w-]{1,70}$/.test(x.id)||ids.has(x.id)||!OBJECT_LIBRARY.some(p=>p.id===x.product)||!ROOMS.some(r=>r.id===x.room))throw Error('Élément de bibliothèque inconnu.');ids.add(x.id);}return list;
}
export function specimenPlant(M,variant=0){
 const g=new T.Group();g.name='Plante_'+variant;
 const pot=variant===1?M.linen:variant===2?M.paint:M.terracotta;
 cylinder(g,.17,.31,pot,0,.155,0,'Cache_pot',48,.195);
 cylinder(g,.165,.009,M.earth,0,.315,0,'Terre');
 if(variant===2){
  for(let i=0;i<13;i++){
   const a=i*2.399,h=.43+(i%4)*.135,r=.045+(i%3)*.025;
   const shape=new T.Shape();shape.moveTo(-.024,0);shape.quadraticCurveTo(-.05,h*.5,0,h);shape.quadraticCurveTo(.055,h*.48,.024,0);shape.closePath();
   const geo=new T.ShapeGeometry(shape,16),pos=geo.attributes.position;for(let j=0;j<pos.count;j++)pos.setZ(j,Math.sin(pos.getY(j)/h*Math.PI)*.045);geo.computeVertexNormals();
   const leaf=mesh(g,geo,i%3?M.leaf:M.leafLight,'Feuille_épaisse',Math.cos(a)*r,.31,Math.sin(a)*r);leaf.rotation.y=a;leaf.rotation.z=.1*Math.sin(a);
  }
 }else if(variant===1){
  for(let i=0;i<8;i++){
   const a=i*2.399,h=.84+(i%3)*.15;
   const stem=new T.CatmullRomCurve3([new T.Vector3(0,.31,0),new T.Vector3(Math.cos(a)*.1,h*.86,Math.sin(a)*.1),new T.Vector3(Math.cos(a)*.54,h*.76,Math.sin(a)*.54)]);
   mesh(g,new T.TubeGeometry(stem,20,.005,5,false),M.leaf,'Tige_kentia');
   for(let j=2;j<12;j++)for(const sign of [-1,1]){const p=stem.getPoint(j/12),l=.12*Math.sin(j/12*Math.PI)+.035;const o=sphere(g,1,j%3?M.leaf:M.leafLight,p.x+Math.cos(a+sign*1.1)*l*.65,p.y-.025,p.z+Math.sin(a+sign*1.1)*l*.65,[.023,.008,l],'Foliole');o.rotation.y=-a-sign*1.1;}
  }
 }else{
  cylinder(g,.012,variant===0?.95:.55,M.trunk,0,variant===0?.78:.57,0,'Tronc');
  for(let i=0;i<(variant===0?26:9);i++){
   const a=i*2.399,h=variant===0?.65+(i%7)*.115:.58+(i%4)*.13,r=variant===0?.19+(i%3)*.055:.27;
   const end=[Math.cos(a)*r,h,Math.sin(a)*r];tube(g,[[0,.48,0],[end[0]*.5,h,end[2]*.5],end],.003,M.trunk,'Branche');
   if(variant===0){const leaf=sphere(g,1,i%4?M.leaf:M.leafLight,...end,[.09,.016,.14],'Feuille_ficus');leaf.rotation.set(.2,-a,.3);}
   else{
    const s=new T.Shape();s.moveTo(0,0);s.bezierCurveTo(-.25,-.08,-.21,.18,-.14,.26);s.lineTo(-.06,.11);s.lineTo(-.1,.31);s.quadraticCurveTo(0,.43,.11,.3);s.lineTo(.06,.11);s.lineTo(.17,.22);s.bezierCurveTo(.28,.05,.22,-.11,0,0);
    const geo=new T.ShapeGeometry(s,16),p=geo.attributes.position;for(let j=0;j<p.count;j++)p.setZ(j,Math.abs(p.getX(j))*.22);geo.computeVertexNormals();const leaf=mesh(g,geo,i%2?M.leaf:M.leafLight,'Feuille_monstera',...end);leaf.rotation.set(-.8,-a,0);
   }
  }
 }
 return g;
}
export function createLibraryObject(id,M){
 const p=OBJECT_LIBRARY.find(p=>p.id===id);if(!p)throw Error('Objet inconnu.');const k=furnitureKit(M),parent=new T.Group();let o;
 if(p.kind==='plant')o=specimenPlant(M,p.variant);
 else if(p.kind==='art')o=k.art(parent,p.variant===10?1.05:.65,p.variant===10?.65:.85,0,0,0,0,p.variant);
 else if(id==='sofa-linen')o=k.sofa(parent,2.15,false);
 else if(id==='armchair-sage')o=k.chair(parent,{arm:true,mat:M.sageFabric});
 else if(id==='coffee-oak')o=k.coffeeTable(parent);
 else if(id==='desk-oak')o=k.desk(parent,1.15);
 else if(id==='wardrobe-oak')o=k.wardrobe(parent,1.15,2.35);
 else if(id==='bed-linen')o=k.bed(parent,1.6);
 else if(id==='rug-natural')o=k.rug(parent,1.6,2.3,0,0);
 else if(id==='floor-lamp'){
  o=new T.Group();cylinder(o,.18,.025,M.bronze,0,.015,0);cylinder(o,.013,1.38,M.bronze,0,.71,0);
  mesh(o,new T.CylinderGeometry(.2,.28,.35,48,1,true),M.linen,'Abat_jour',0,1.55,0);sphere(o,.04,M.led,0,1.5,0);
 }else if(id==='vase-sculpture'){
  o=new T.Group();box(o,.28,.66,.28,M.stone,0,.33,0,'Socle',.015);
  const torus=mesh(o,new T.TorusGeometry(.17,.06,18,56),M.whiteCeramic,'Céramique_sculptée',0,.89,0);torus.rotation.z=.4;
 }else if(id==='console-books'){
  o=new T.Group();box(o,.95,.04,.26,M.oak,0,.78,0);for(const x of [-.4,.4])box(o,.026,.76,.22,M.black,x,.38,0);k.books(o,-.33,.8,0,6);k.vase(o,.3,.8,0,.2);
 }
 return o;
}
export function registerAddition(house,project,M,entry){
 const product=OBJECT_LIBRARY.find(p=>p.id===entry.product),room=ROOMS.find(r=>r.id===entry.room),b=roomBounds(room),o=createLibraryObject(entry.product,M);
 o.position.set(...point(b.x+b.w/2,.02,b.z+b.d/2));house.floors[room.floor].static.add(o);
 return house.arrangement.register(o,{id:entry.id,room:room.id,floor:room.floor,kind:product.kind,name:product.name});
}
// Use the very same obstruction tests as dragging; new objects never obstruct a door or the stairs.
export function findAdditionPlace(arrangement,item,product){
 const room=ROOMS.find(r=>r.id===item.room),b=roomBounds(room),base=arrangement.read(item),w=b.w*SCALE*100,d=b.d*SCALE*100,margin=3;
 const candidates=[];
 if(product.mount==='wall'){
  for(const [x,z,angle]of [[w/2,base.depth/2+margin,0],[w/2,d-base.depth/2-margin,180],[base.depth/2+margin,d/2,90],[w-base.depth/2-margin,d/2,-90]])candidates.push({...base,x,z,angle,y:125});
 }else{
  for(let z=base.depth/2+margin;z<d-base.depth/2-margin;z+=20)for(let x=base.width/2+margin;x<w-base.width/2-margin;x+=20)candidates.push({...base,x,z,y:2});
  candidates.sort((a,c)=>Math.hypot(a.x-w/2,a.z-d/2)-Math.hypot(c.x-w/2,c.z-d/2));
 }
 return candidates.find(s=>arrangement.check(item,s).length===0)||null;
}
