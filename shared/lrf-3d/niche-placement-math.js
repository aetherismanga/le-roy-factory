import {wallSlots,validateNiches} from './niches.js';

// Positions and dimensions are centimetres, just like the persisted room.
// Use the same thickness source as validation (not a renderer approximation).
export function nichePlacement(config,wallKey,x,y,{id='niche-preview',openings=[],zones=[]}={}){
 const wall=wallSlots(config).find(w=>w.key===wallKey);
 if(!wall||![x,y].every(Number.isFinite))return {error:'Choisissez la face intérieure d’un mur.'};
 const width=Math.min(60,wall.length-4),height=Math.min(30,wall.height-4),depth=Math.min(10,wall.thickness-2);
 if(width<10||height<10||depth<2)return {error:'Cette paroi est trop petite ou trop fine pour une niche.'};
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(v*10)/10));
 const niche={id,wallKey,u:clamp(x,width/2+2,wall.length-width/2-2),bottom:clamp(y-height/2,2,wall.height-height-2),width,height,depth,covering:{mode:'inherit'}};
 const error=validateNiches({...config,niches:[...(config.niches||[]),niche]});
 if(error)return {niche,error};
 const a={left:niche.u-width/2,right:niche.u+width/2,bottom:niche.bottom,top:niche.bottom+height};
 const overlaps=b=>a.left<b.right&&b.left<a.right&&a.bottom<b.top&&b.bottom<a.top;
 if(openings.some(o=>overlaps({left:o.left*100,right:o.right*100,bottom:o.bottom*100,top:o.top*100})))return {niche,error:'La niche ne peut pas croiser une porte ou une fenêtre.'};
 if(zones.some(z=>overlaps({left:z.x,right:z.x+z.width,bottom:z.y,top:z.y+z.height})))return {niche,error:'Déplacez la colonne carrelée avant de poser la niche à cet endroit.'};
 return {niche,error:''};
}
