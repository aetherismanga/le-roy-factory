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
  if(!best||dist<best.distance)best={wall,start:Math.round(Math.max(2,Math.min(size-width-2,t*size-width/2))*10)/10,distance:dist,length:size};
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
 const valid=rows.filter(x=>!x.error),floorGroups=new Map(),plinthGroups=new Map(),floorQuantities=new Map(),plinthQuantities=new Map();
 // Use the same physical groups and carton rounding as orderLines /
 // plinthOrderLines. Allocate their order to rooms by need, before applying
 // each room's selling price; independently rounded rooms overbill cartons.
 for(const x of valid){
  const t=x.r.tile,key=[t.reference||t.key||x.r.id,t.brand,t.collection,t.color,t.format,t.finish||'',t.packArea,t.packPieces,t.purchaseHT].join('|');
  if(!floorGroups.has(key))floorGroups.set(key,{tile:t,verified:x.packVerified,rows:[],needed:0});
  const g=floorGroups.get(key),needed=Number.isFinite(x.needed)?x.needed:x.orderArea;g.rows.push({row:x,needed});g.needed+=needed;
  const p=x.plinths;plinthQuantities.set(x,p?.type==='tile'?0:p?.order||0);
  if(!p||p.type==='tile'||!p.units)continue;
  const product=p.product,unit=p.type==='wood'?'barre':product?.priceUnit||'pièce',price=p.purchaseHT??product?.purchaseHT??null,pk=[p.type,p.type==='wood'?'wood-220':product?.reference,product?.length,product?.packPieces,unit,price].join('|');
  if(!plinthGroups.has(pk))plinthGroups.set(pk,{type:p.type,product,length:p.type==='wood'?220:product?.length,rows:[],needed:0});
  const pg=plinthGroups.get(pk),stock=p.stockNeeded??p.units;pg.rows.push({row:x,needed:stock});pg.needed+=stock;
 }
 const allocate=(group,quantity,target)=>{let used=0;for(const [i,entry]of group.rows.entries()){const value=i===group.rows.length-1?quantity-used:group.needed>0?quantity*entry.needed/group.needed:0;target.set(entry.row,value);used+=value;}};
 for(const g of floorGroups.values()){const quantity=g.verified?Math.ceil((g.needed-1e-8)/g.tile.packArea)*g.tile.packArea:g.needed;allocate(g,quantity,floorQuantities);}
 for(const g of plinthGroups.values()){const units=g.type==='factory'?Math.ceil(g.needed/g.product.packPieces)*g.product.packPieces:g.needed;allocate(g,units*g.length/100,plinthQuantities);}
 const lines=valid.map(x=>{const sale=project.sales?.[x.r.id]||{},floor=Number.isFinite(sale.floor)?sale.floor:x.r.tile.priceTTC,plinth=Number.isFinite(sale.plinth)?sale.plinth:null,floorQuantity=floorQuantities.get(x),plinthQuantity=plinthQuantities.get(x);return {roomId:x.r.id,name:x.r.name,floor,plinth,floorQuantity,plinthQuantity,plinthIncluded:x.plinths?.type==='tile',floorTotal:Number.isFinite(floor)?floor*floorQuantity:null,plinthTotal:plinthQuantity===0?0:Number.isFinite(plinth)?plinth*plinthQuantity:null};});
 // Distribute the final cent instead of losing it when a carton is shared
 // equally between three or more rooms. Missing prices remain missing.
 for(const field of ['floorTotal','plinthTotal']){const priced=lines.filter(l=>Number.isFinite(l[field])),raw=priced.map(l=>l[field]*100),cents=raw.map(Math.floor),remaining=Math.round(raw.reduce((sum,v)=>sum+v,0))-cents.reduce((sum,v)=>sum+v,0),order=raw.map((v,i)=>({i,fraction:v-cents[i]})).sort((a,b)=>b.fraction-a.fraction);for(let i=0;i<remaining;i++)cents[order[i].i]++;priced.forEach((l,i)=>l[field]=cents[i]/100);}
 for(const line of lines)line.total=line.floorTotal===null||line.plinthTotal===null?null:Math.round((line.floorTotal+line.plinthTotal)*100)/100;
 return {lines,total:lines.length&&!rows.some(x=>x.error)&&lines.every(x=>x.total!==null)?Math.round(lines.reduce((s,x)=>s+x.total,0)*100)/100:null};
}
