// Project and drawing rules shared by the interface and its regression checks.
export const OPENINGS={
 door:{label:'Porte intérieure',type:'door',width:83,height:204,sill:0,widths:[63,73,83,93]},
 entrance:{label:'Porte d’entrée',type:'door',width:90,height:215,sill:0,widths:[80,90,100]},
 sliding:{label:'Porte coulissante',type:'door',width:83,height:204,sill:0,widths:[73,83,93,123]},
 window:{label:'Fenêtre',type:'window',width:120,height:125,sill:90},
 bay:{label:'Baie vitrée',type:'window',width:240,height:215,sill:0},
 french:{label:'Porte-fenêtre',type:'window',width:120,height:215,sill:0}
};
export const COLORS=[['white','Blanc · RAL 9016','#f6f6f2'],['anthracite','Gris anthracite · RAL 7016','#383e42'],['black','Noir mat · RAL 9005','#0a0a0a']];
export function projectSignature(project){const {updatedAt,savedAt,transfers,...value}=project;return JSON.stringify(value);}
export function orthogonal(a,b){return Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])?[b[0],a[1]]:[a[0],b[1]];}
export function wallPosition(points,point,scale,width=0){
 let best=null;for(let wall=0;wall<points.length;wall++){
  const a=points[wall],b=points[(wall+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),size=length*scale;if(size<width+4)continue;
  const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(length*length))),dist=Math.hypot(point[0]-a[0]-dx*t,point[1]-a[1]-dy*t);
  if(!best||dist<best.distance)best={wall,start:Math.round(Math.max(2,Math.min(size-width-2,t*size-width/2))),distance:dist,length:size};
 }return best;
}
export function isWood(tile){return /bois|wood|legn|parquet|quercia|yosemite|sequoia|lux|lodge|tavol|timber|oak|rovere/i.test([tile.collection,tile.effect,tile.name].join(' '));}
export function isOutdoor(tile){return /R\s*11|(?:20\s*mm|2\s*cm)|outdoor/i.test(tile.finish||'')||tile.thickness===20;}
export function suitableFloor(tile,environment='interior'){
 return tile.shape!=='hexagon'&&Array.isArray(tile.surfaces)&&tile.surfaces.includes('floor')&&(environment==='terrace'?isOutdoor(tile):!isOutdoor(tile));
}
export function rowShift(pattern,row,width){
 if(pattern==='offset')return Math.abs(row%2)*width/2;
 if(pattern==='third')return ((row%3+3)%3)*width/3;
 if(pattern==='two-thirds')return ((row*2%3+3)%3)*width/3;
 if(pattern==='random'){const h=(Math.imul(row+104729,1664525)^1013904223)>>>0;return (.15+(h%701)/1000)*width;}
 return 0;
}
export function defaultTransferRooms(rooms){const bathroom=rooms.find(r=>/salle.*bain|sdb|salle.*eau/i.test(r.name));return [bathroom?.id||rooms[0]?.id].filter(Boolean);}
export function publicQuote(rows,project){
 const lines=rows.filter(x=>!x.error).map(x=>{const sale=project.sales?.[x.r.id]||{},floor=Number.isFinite(sale.floor)?sale.floor:x.r.tile.priceTTC,plinth=Number.isFinite(sale.plinth)?sale.plinth:null;return {roomId:x.r.id,name:x.r.name,floor,plinth,floorQuantity:x.orderArea,plinthQuantity:x.plinths?.order||0,total:Number.isFinite(floor)&&(!(x.plinths?.order>0)||Number.isFinite(plinth))?Math.round((floor*x.orderArea+(plinth||0)*(x.plinths?.order||0))*100)/100:null};});
 return {lines,total:lines.length&&lines.every(x=>x.total!==null)?Math.round(lines.reduce((s,x)=>s+x.total,0)*100)/100:null};
}
