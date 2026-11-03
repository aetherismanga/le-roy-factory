import {cabinetFormat} from './configuration.js';
import {furnitureTowelBounds} from './furniture-accessories.js';
const overlap=(a,b)=>a.minU<b.maxU-.1&&a.maxU>b.minU+.1&&a.minHeight<b.maxHeight-.1&&a.maxHeight>b.minHeight+.1&&a.minOffset<b.maxOffset-.1&&a.maxOffset>b.minOffset+.1;
export function furnitureLayoutError(project){
 const cabinets=(project.items||[]).filter(item=>item.type==='cabinet');
 for(const item of cabinets){
  const bar=furnitureTowelBounds(item.settings,item.placement);if(!bar)continue;
  const points=project.room?.points||[],wall=item.placement.wall;
  if(wall<points.length){const a=points[wall],b=points[(wall+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(bar.minU<-.1||bar.maxU>length+.1)return 'Le porte-serviette dépasse le bord du mur. Prévoyez 5 cm du côté choisi.';}
  for(const other of cabinets){
   if(other.id===item.id||other.placement.wall!==wall)continue;
   const p=other.placement,s=other.settings,f=cabinetFormat(s.format),body={minU:p.u-s.width/2,maxU:p.u+s.width/2,minHeight:p.height,maxHeight:p.height+f.height*100,minOffset:p.offset||0,maxOffset:(p.offset||0)+f.depth*100};
   if(overlap(bar,body)||overlap(bar,furnitureTowelBounds(s,p)||{minU:Infinity,maxU:-Infinity}))return 'Le porte-serviette traverse un autre meuble ou accessoire. Choisissez le côté libre ou écartez les meubles.';
  }
 }
 return '';
}
