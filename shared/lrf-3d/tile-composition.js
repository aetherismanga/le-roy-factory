import catalogue from './commercial-surfaces.json' with {type:'json'};
import {commercialSurfaceProduct} from './surface-identity.mjs';
import {makeRoom} from './room.js';
import {quantityForSurface,summarizeQuantities} from './quantities.js';
import {coloredQuantityRows} from './tile-colors.js';
import {renderSurfaceZones} from './zone-rendering.js';
import {zonePolygon} from './zone-validation.js';
import {tileFormat,normalizeLayout} from './surface-catalog.js';
import {nicheSurfaceFinish,nicheWallFinish} from './niches.js';
import * as T from 'three';
import {createBathAprons,apronFinish,APRON_FACES} from './bath-apron.js';
import {makeTiledShowerTray,applyTrayCladding,trayFootprintInFloor,withTrayZoneQuantities} from './tiled-shower-tray.js';
import {makeSanitary} from './sanitaries.js';
import {applySupportCladding,supportCoveringMode} from './sanitary-support.js';

const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const cleanString=value=>String(value??'').slice(0,240);
const fields=['label','brand','collection','color','format','reference','catalogueKey','finish','preview','area','tileCount','full','cut','layoutArea','cutWaste','loss','withLoss','needed','pcsBox','m2Box','packVerified','boxes','orderArea','orderPieces','paint','plinthArea','source'];
// Only measured quantities and public catalogue identity enter a saved project.
// Purchase grids, auth, prices and commercial references remain outside it.
export function tileCompositionSnapshot(report){
 const pick=row=>Object.fromEntries(fields.filter(key=>row[key]!==undefined).map(key=>[key,typeof row[key]==='string'?cleanString(row[key]):row[key]]));
 return {version:1,rows:(report?.rows||[]).map(pick),groups:(report?.groups||[]).map(pick),profiles:Number(report?.profiles)||0};
}
function quantityIdentity(row){
 const product=commercialSurfaceProduct(row,catalogue.products);
 if(!product)return {...row,publicTTC:null,unitPublicTTC:null};
 const verified=product.packVerified&&product.packArea>0&&Number.isInteger(product.packPieces)&&product.packPieces>0;
 const boxes=verified?Math.ceil((row.needed-1e-8)/product.packArea):null;
 return {...row,catalogueKey:product.key,reference:product.reference,brand:product.brand,colorLabel:product.color,finish:product.finish,preview:product.preview,pcsBox:verified?product.packPieces:null,m2Box:verified?product.packArea:null,packVerified:!!verified,boxes,orderArea:verified?Number((boxes*product.packArea).toFixed(4)):null,orderPieces:verified?boxes*product.packPieces:row.orderPieces,unitPublicTTC:Number.isFinite(product.priceTTC)?product.priceTTC:null,publicTTC:verified&&Number.isFinite(product.priceTTC)?round(boxes*product.packArea*product.priceTTC):null};
}
function measuredProject(project){
 const room=makeRoom(project.room,0),rows=[],surfaces=[],fixtures=[];
 const dispose=group=>group.traverse(o=>{o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material]))m?.dispose();});
 try{
  room.setOpenings((project.items||[]).filter(i=>['window','door'].includes(i.type)).map(item=>({...item,dimensions:{width:item.settings.width/100,height:item.settings.height/100}})));
  // Reuse native cladding geometry without loading bath shell models, textures
  // or lighting. Position its roots exactly as Composition.sync does in 3D.
  for(const raw of project.items||[]){
   const s=raw.settings||{},wall=room.walls[raw.placement?.wall];let asset,dimensions;
   if(!wall)continue;
   if(raw.type==='shower'&&s.trayType==='tile'){asset=makeTiledShowerTray(s);dimensions=asset.dimensions;}
   else if(raw.type==='bath'&&s.apron==='tile'&&s.kind!=='island'){const root=new T.Group();asset={root,tileAprons:createBathAprons(root,s,s.width/100,s.depth/100)};dimensions={width:s.width/100,depth:s.depth/100,height:.57,base:0};}
   else if(raw.type==='toilet'&&s.support){asset=makeSanitary('toilet',s);dimensions=asset.dimensions;}
   if(!asset)continue;
   const root=new T.Group(),floorItem=['shower','bath'].includes(raw.type),placement=raw.placement,tangent=new T.Vector3(Math.cos(wall.group.rotation.y),0,-Math.sin(wall.group.rotation.y));
   root.add(asset.root);root.position.copy(wall.start).addScaledVector(tangent,placement.u/100).addScaledVector(wall.normal,floorItem?(placement.offset||0)/100+dimensions.depth/2:.23+(placement.offset||0)/100);
   if(floorItem)asset.root.position.z=.23-dimensions.depth/2;
   root.position.y=(placement.height||0)/100-(dimensions.base||0);root.rotation.y=wall.group.rotation.y+(floorItem?(placement.rotation||0)*Math.PI/180:0);root.updateMatrixWorld(true);
   fixtures.push({...raw,root,asset,dimensions});
  }
  const onFloor=surface=>{surface.group.updateWorldMatrix(true,false);room.floor.group.updateWorldMatrix(true,false);const n=new T.Vector3(0,0,1).transformDirection(surface.group.matrixWorld),floorN=new T.Vector3(0,0,1).transformDirection(room.floor.group.matrixWorld),height=room.floor.group.worldToLocal(surface.group.getWorldPosition(new T.Vector3())).z;return n.dot(floorN)>.999&&Math.abs(height)<.01;};
  const add=(surface,finish,layout,label,children=true)=>{
   if(!finish||surface.expoEnabled===false)return;
   surface.setLayout(layout||{});
   if(children&&finish.zones?.length)renderSurfaceZones(surface,finish.zones,()=>{},zone=>normalizeLayout({...tileFormat(zone.collection,zone.format),pattern:zone.pattern||'straight',direction:zone.direction||surface.layout.direction,groutWidth:zone.groutWidth||2},zone.collection,zone.format,zone.color),dispose,zonePolygon);
   const floorPlane=(surface===room.floor||!!surface.zone)&&onFloor(surface),trayHoles=floorPlane?fixtures.filter(item=>item.type==='shower').map(item=>trayFootprintInFloor(item,surface)).filter(p=>p.length):[];
   // This helper performs a polygon difference, so a tray overlapping a rug
   // never subtracts the same square metres twice or leaves fictitious cells.
   const measure=callback=>floorPlane?withTrayZoneQuantities(surface,room.floor,fixtures,callback):callback(surface);
   measure(measured=>{
    const readings=coloredQuantityRows(measured,finish,measured.layout,project.tileLoss??10,label);rows.push(...readings);
    const holes=[...(surface.holes||[]),...trayHoles,...(surface.openings||[]).map(o=>[[o.left,o.bottom],[o.right,o.bottom],[o.right,o.top],[o.left,o.top]]),...(surface.niches||[]).map(n=>[[(n.u-n.width/2)/100,n.bottom/100],[(n.u+n.width/2)/100,n.bottom/100],[(n.u+n.width/2)/100,(n.bottom+n.height)/100],[(n.u-n.width/2)/100,(n.bottom+n.height)/100]])];
    surfaces.push({label,polygon:surface.polygon,outline:surface.polygon,holes,openings:surface.openings||[],layout:{...surface.layout},finish:{...finish},area:readings.reduce((sum,r)=>sum+(r.area||0),0),cells:finish.collection==='Peinture'?[]:measured.tiles.geometry.userData.cells.map(c=>({key:c.key,area:c.area,bounds:c.bounds}))});
   });
   if(children){
    for(const face of surface.decorativeZones||[])add(face,face.zone,face.layout,label+' · '+(face.zone.name||'Zone'),false);
    for(const face of surface.nicheSurfaces||[]){
     const nicheFinish=nicheSurfaceFinish(face.niche,face.nichePart,nicheWallFinish(face.niche,finish)),format=nicheFinish.format||tileFormat(nicheFinish.collection)?.id;
     const nicheLayout=normalizeLayout({...surface.layout,...tileFormat(nicheFinish.collection,format),groutWidth:nicheFinish.groutWidth||surface.layout.groutWidth},nicheFinish.collection,format,nicheFinish.color);
     add(face,nicheFinish,nicheLayout,label+' · niche · '+(face.nichePart==='back'?'fond':'contour'),false);
    }
   }
  };
  add(room.floor,project.floor,project.layouts?.floor,'Sol');
  room.walls.forEach((wall,index)=>add(wall,project.walls?.[index],project.layouts?.walls?.[index],wall.expoLabel||(wall.partition===undefined?'Mur '+(index+1):'Cloison '+(wall.partition+1)+' · face '+(wall.partitionSide+1))));
  for(const face of room.partitionCaps||[]){const index=room.walls.findIndex(w=>w.key===face.sourceWallKey),finish=project.walls?.[index];if(finish)add(face,finish,project.layouts?.walls?.[index],'Cloison '+(face.partition+1)+' · '+({a:'chant A',b:'chant B',top:'dessus'}[face.partitionPart]),false);}
  for(const item of fixtures){
   if(item.type==='shower')for(const {surface,finish,label} of applyTrayCladding(item,room.floor,project.floor,()=>{},{walls:room.walls}))add(surface,finish,surface.layout,label,false);
   else if(item.type==='bath')for(const face of item.asset.tileAprons||[])add(face,apronFinish(item.settings,face.part),face.layout,'Baignoire · tablier · '+APRON_FACES.find(f=>f.id===face.part).name,false);
   else if(item.type==='toilet')for(const {surface,finish,label} of applySupportCladding(item,room.walls[item.placement.wall],project.walls?.[item.placement.wall],()=>{}))add(surface,supportCoveringMode(item.settings)==='paint'?{collection:'Peinture',color:item.settings.supportColor}:finish,surface.layout,label,false);
  }
  return {rows,surfaces};
 }finally{for(const item of fixtures)dispose(item.root);room.dispose();}
}

export function buildTileComposition(project,{report=project?.tileCompositionReport,lossPercent=project?.tileLoss??10}={}){
 if(!project?.room)return {rows:[],surfaces:[],totals:{area:0,needed:0,orderArea:0,orderPieces:0,boxes:0,publicTTC:null},lossPercent:10,missing:[]};
 const loss=Math.max(0,Math.min(30,Number(lossPercent)||0)),measured=measuredProject({...project,tileLoss:loss});
 const input=report?.version===1&&Array.isArray(report.rows)?report.rows:measured.rows;
 const quantities=input.map(row=>{
  if(row.paint)return {...row};
  const withLoss=(row.area||0)*(1+loss/100),needed=Math.max(row.layoutArea||0,withLoss,row.plinthArea||0);
  return {...row,loss,withLoss,needed};
 });
 const rows=summarizeQuantities(quantities.map(row=>row.paint?row:quantityIdentity(row))).map(quantityIdentity),area=round(rows.reduce((sum,r)=>sum+(r.area||0),0)),needed=round(rows.reduce((sum,r)=>sum+(r.needed||0),0));
 const orderArea=Number(rows.reduce((sum,r)=>sum+(r.orderArea||0),0).toFixed(4)),missing=rows.filter(row=>row.publicTTC===null||!row.packVerified);
 const subtotal=round(rows.reduce((sum,r)=>sum+(r.publicTTC||0),0)),energyTax={area:orderArea,rateHT:.70,rateTTC:.84,amountTTC:round(orderArea*.84)};
 return {version:1,rows,surfaceRows:quantities,surfaces:measured.surfaces,lossPercent:loss,profiles:Number(report?.profiles)||0,privateCode:'',missing,totals:{area,needed,orderArea,orderPieces:rows.reduce((sum,r)=>sum+(r.orderPieces||0),0),boxes:rows.reduce((sum,r)=>sum+(r.boxes||0),0),subtotal,energyTax,publicTTC:missing.length?null:round(subtotal+energyTax.amountTTC)}};
}
export async function loadTileCompositionQuote(model,{credential='',signal}={}){
 const response=await fetch('/api/tile-quote',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(credential?{Authorization:'Bearer '+credential}:{})},body:JSON.stringify({rows:model.rows.map(row=>({catalogueKey:row.catalogueKey,needed:row.needed}))}),cache:'no-store',signal:signal||AbortSignal.timeout(25000)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok||result.success!==true)throw Error(result.error||'Le chiffrage du carrelage est indisponible.');
 const prices=new Map(result.rows.map(row=>[row.catalogueKey,row]));
 const rows=model.rows.map(row=>({...row,...prices.get(row.catalogueKey)}));
 return {...model,rows,privateCode:result.privateCode||'',pricingStatus:result.pricingStatus,missing:rows.filter(row=>row.publicTTC===null||!row.packVerified),totals:{...model.totals,...result.totals}};
}
