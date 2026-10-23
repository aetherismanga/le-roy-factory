// Shared centimetre-based cutting list. Copies in the standalone ateliers are
// checked byte-for-byte by the release tests; no renderer or DOM dependency.
const EPS=1e-6;
export function plinthSettings(value={}){
 return {enabled:value.enabled!==false,type:['tile','factory','wood'].includes(value.type)?value.type:'tile',height:Number.isFinite(value.height)?value.height:8,thickness:Number.isFinite(value.thickness)?value.thickness:1,kerf:Number.isFinite(value.kerf)?value.kerf:.3,reserve:Number.isFinite(value.reserve)?value.reserve:0,aligned:value.aligned!==false,walls:{...(value.walls||{})},product:value.product||null,purchaseHT:Number.isFinite(value.purchaseHT)?value.purchaseHT:null};
}
export function plinthSettingsError(value){
 if(value===undefined)return '';if(!value||typeof value!=='object'||Array.isArray(value))return 'Réglages de plinthes invalides.';
 if(value.purchaseHT!=null&&(!Number.isFinite(value.purchaseHT)||value.purchaseHT<0||value.purchaseHT>100000))return 'Prix d’achat des plinthes invalide.';
 const s=plinthSettings(value);if(!['tile','factory','wood',undefined].includes(value.type)||s.height<3||s.height>30||s.thickness<.3||s.thickness>3||s.kerf<0||s.kerf>1||s.reserve<0||s.reserve>30||Object.keys(s.walls).length>1000||Object.values(s.walls).some(v=>![true,false,'auto'].includes(v)))return 'Plinthes : hauteur 3–30 cm, épaisseur 0,3–3 cm, trait de coupe 0–1 cm et réserve 0–30 %.';
 if(s.product&&(!Number.isFinite(s.product.length)||s.product.length<3||s.product.length>300||!Number.isInteger(s.product.packPieces)||s.product.packPieces<1||s.product.packPieces>1000||!['pièce','ml','boîte',undefined].includes(s.product.priceUnit)||s.product.purchaseHT!=null&&(!Number.isFinite(s.product.purchaseHT)||s.product.purchaseHT<0||s.product.purchaseHT>100000)))return 'Conditionnement ou prix des plinthes invalide.';return '';
}
export function plinthPurchase(report,tile={}){
 if(!report||report.error)return {totalHT:null};
 const included=report.type==='tile',unit=included?'m²':report.type==='wood'?'barre':report.product?.priceUnit||'pièce',quantity=included?report.tileArea:unit==='ml'?report.order:unit==='boîte'?report.boxes:report.units;
 const unitPriceHT=included?tile.purchaseHT:report.purchaseHT??report.product?.purchaseHT??null;
 return {included,unit,quantity,unitPriceHT,totalHT:quantity===0?0:Number.isFinite(unitPriceHT)&&Number.isFinite(quantity)?Math.round(quantity*unitPriceHT*100)/100:null};
}
export function subtractIntervals(length,cuts=[]){
 const sorted=cuts.filter(v=>Array.isArray(v)&&v.every(Number.isFinite)).map(([a,b])=>[Math.max(0,Math.min(a,b)),Math.min(length,Math.max(a,b))]).filter(([a,b])=>b>a+EPS).sort((a,b)=>a[0]-b[0]);
 const out=[];let start=0;for(const [a,b]of sorted){if(a>start+EPS)out.push([start,a]);start=Math.max(start,b);}if(start<length-EPS)out.push([start,length]);return out;
}
export function wallHasPlinth(wall,settings={}){const s=plinthSettings(settings),override=s.walls[wall.key];return s.enabled&&override!==false&&(override===true||!wall.tiled);}
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
function gridBreaks(a,b,grid){
 if(grid?.cells){const dx=b[0]-a[0],dy=b[1]-a[1],marks=[0,1];for(const polygon of grid.cells)for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],ex=q[0]-p[0],ey=q[1]-p[1],den=dx*ey-dy*ex;if(Math.abs(den)<EPS)continue;const ax=p[0]-a[0],ay=p[1]-a[1],t=(ax*ey-ay*ex)/den,u=(ax*dy-ay*dx)/den;if(t>EPS&&t<1-EPS&&u>=-EPS&&u<=1+EPS)marks.push(t);}return [...new Set(marks.map(v=>Math.round(v*1e9)/1e9))].sort((a,b)=>a-b);}
 if(!grid?.toGrid||!(grid.width>0&&grid.height>0))return [0,1];
 const p=grid.toGrid(a),q=grid.toGrid(b),dx=q[0]-p[0],dy=q[1]-p[1],marks=[0,1],w=grid.width,h=grid.height;
 const crossLines=(start,end,step,offset,from=0,to=1)=>{if(Math.abs(end-start)<EPS)return;const lo=Math.floor((Math.min(start,end)-offset)/step),hi=Math.ceil((Math.max(start,end)-offset)/step);if(hi-lo>20000)throw Error('Trop de découpes de plinthes.');for(let k=lo;k<=hi;k++){const t=(k*step+offset-start)/(end-start);if(t>from+EPS&&t<to-EPS)marks.push(t);}};
 crossLines(p[1],q[1],h,0);const rows=[...marks].sort((a,b)=>a-b);
 for(let i=1;i<rows.length;i++){const from=rows[i-1],to=rows[i],y=p[1]+dy*(from+to)/2,row=Math.floor(y/h+EPS),offset=grid.pattern==='offset'&&Math.abs(row%2)===1?w/2:0;crossLines(p[0],q[0],w,offset,from,to);}
 return [...new Set(marks.map(t=>Math.round(t*1e9)/1e9))].sort((a,b)=>a-b);
}
// Best-fit decreasing: proposes a reproducible cutting list and reuses only
// offcuts that fit. It does not claim a mathematically optimal cutting plan.
function packLengths(values,stock,kerf){const bins=[];for(const length of [...values].sort((a,b)=>b-a)){let pick=-1,left=Infinity;for(let i=0;i<bins.length;i++){const need=length+(bins[i].length?kerf:0),remaining=stock-bins[i].reduce((s,v)=>s+v,0)-kerf*Math.max(0,bins[i].length-1)-need;if(remaining>=-EPS&&remaining<left){pick=i;left=remaining;}}if(pick<0)bins.push([length]);else bins[pick].push(length);}return bins;}
export function calculatePlinths(walls,value={},grid=null){
 const error=plinthSettingsError(value);if(error)throw Error(error);const s=plinthSettings(value),pieces=[],runs=[],groups=new Map();let net=0;
 for(const wall of walls){if(!wallHasPlinth(wall,s))continue;const length=dist(wall.a,wall.b);if(length<EPS)continue;const forced=s.walls[wall.key]===true,cuts=[...(wall.cuts||[]),...(!forced?(wall.tiledCuts||[]):[])];
  for(const [from,to]of subtractIntervals(length,cuts)){const a=lerp(wall.a,wall.b,from/length),b=lerp(wall.a,wall.b,to/length),span=to-from;net+=span;runs.push({key:wall.key,label:wall.label,a,b,length:span});const marks=s.type!=='wood'&&s.aligned?gridBreaks(a,b,grid):[0,1];
   for(let i=1;i<marks.length;i++){const p=lerp(a,b,marks[i-1]),q=lerp(a,b,marks[i]),axis=grid?.toGrid?[grid.toGrid(p),grid.toGrid(q)]:[p,q],horizontal=Math.abs(axis[1][0]-axis[0][0])>=Math.abs(axis[1][1]-axis[0][1]),stock=s.type==='wood'?220:s.type==='factory'?s.product?.length||0:horizontal?grid?.width: grid?.height,cross=s.type==='tile'?(horizontal?grid?.height:grid?.width):s.height;
    if(!(stock>0))throw Error('Choisissez le format des carreaux ou une référence de plinthe.');if(s.type==='tile'&&cross<s.height-EPS)throw Error('La hauteur de plinthe dépasse le côté du carreau.');const strips=s.type==='tile'?Math.max(1,Math.floor((cross+s.kerf+EPS)/(s.height+s.kerf))):1,groupKey=[stock,cross,strips].join('|');if(!groups.has(groupKey))groups.set(groupKey,{stock,cross,strips,lengths:[]});const segment=dist(p,q),n=Math.ceil((segment-EPS)/stock);
    for(let k=0;k<n;k++){const start=k*stock,end=Math.min(segment,(k+1)*stock),aa=lerp(p,q,start/segment),bb=lerp(p,q,end/segment);groups.get(groupKey).lengths.push(end-start);pieces.push({key:wall.key,label:wall.label,a:aa,b:bb,length:end-start});}
   }
  }
 }
 let debit=0,order=0,units=0,stockNeeded=0,tiles=0,tileArea=0;const cutting=[];
 for(const g of groups.values()){const bins=packLengths(g.lengths,g.stock,s.kerf),reserved=Math.ceil(bins.length*(1+s.reserve/100)-EPS);debit+=bins.length*g.stock;stockNeeded+=reserved;let count=reserved;if(s.type==='tile'){count=Math.ceil(reserved/g.strips);tiles+=count;tileArea+=count*g.stock*g.cross/10000;order+=count*g.strips*g.stock;}else if(s.type==='factory'){count=Math.ceil(reserved/(s.product.packPieces||1))*(s.product.packPieces||1);order+=count*g.stock;}else order+=count*g.stock;units+=count;cutting.push({stock:g.stock,stripsPerTile:g.strips,bins,orderedUnits:count});}
 const boxes=s.type==='factory'&&s.product?.packPieces?units/s.product.packPieces:null;
 return {type:s.type,net:net/100,debit:debit/100,order:order/100,waste:Math.max(0,debit-net)/100,orderSurplus:Math.max(0,order-net)/100,pieces:pieces.length,units,stockNeeded,tiles,tileArea,boxes,runs,pieceList:pieces,cutting,height:s.type==='factory'?(s.product?.height||s.height):s.height,product:s.type==='factory'?s.product:null,purchaseHT:s.purchaseHT,aligned:s.type!=='wood'&&s.aligned};
}
