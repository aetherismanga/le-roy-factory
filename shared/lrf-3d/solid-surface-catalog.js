import {BASIN_LAYOUT_NAMES} from './integrated-basins.js';

// RANDAL France, tarif vasques Solid Surface, 09/12/2025, pages 1–2.
// Widths identify the cabinet. The actual slab overhangs it by 1 cm in total.
export const SOLID_SURFACE_LEAD_TIME='Pour une vasque Solid Surface, prévoir 5 à 6 jours de plus que le délai habituel.';
export const SOLID_FAMILIES=Object.freeze({
 milo:{name:'Milo',thickness:2,bowlWidth:54,bowlDepth:30},
 fiona:{name:'Fiona',thickness:1.5,bowlWidth:50,bowlDepth:26},
 hebe:{name:'Hebe',thickness:12,bowlWidth:55,bowlDepth:31},
 aria:{name:'Aria',thickness:12,bowlWidth:55,bowlDepth:28},
 'hebe-toallero':{name:'Hebe Toallero',thickness:12,bowlWidth:55,bowlDepth:31}
});
const centered=(refs,prices)=>[60,70,80,90,100,120].map((width,i)=>[width,'center',refs[i],prices[i]]);
const rows={
 milo:[...centered([15001,15002,15003,15004,15005,15008],[226,240,259,274,298,346]),
  [100,'offset',15006,298],[100,'offset-right',15007,298],[120,'offset',15009,346],[120,'offset-right',15010,346],[120,'double',15011,370],[140,'double',15012,408]],
 fiona:[[120,'long',15024,394],...centered([15016,15017,15018,15019,15020,15021],[230,264,283,302,317,374]),
  [120,'offset',15022,374],[120,'offset-right',15023,374],[120,'double',15025,427],[140,'double',15026,437]],
 hebe:[...centered([15027,15028,15029,15030,15031,15032],[350,394,398,418,466,552]),[120,'double',15033,566]],
 aria:[...centered([15034,15035,15036,15037,15038,15039],[355,403,413,437,480,528]),[120,'double',15040,586]],
 'hebe-toallero':[...centered([15041,15042,15043,15044,15045,15046],[480,514,552,590,643,715]),[120,'double',15047,782]]
};
const plans=Object.fromEntries(Object.entries(rows).map(([id,entries])=>[id,entries.map(([cm,layout,ref,price])=>{
 const family=SOLID_FAMILIES[id],singlePhoto=['milo','fiona'].includes(id)&&layout!=='double';
 return Object.freeze({...family,id,ref:String(ref),ttc:price*100,width:cm+1,depth:46,layout,
  bowlWidth:layout==='long'?100:family.bowlWidth,image:'assets/solid-'+id+(singlePhoto?'-simple':'')+'.webp'});
})]));
export const isSolidSurface=id=>Object.hasOwn(SOLID_FAMILIES,id);
export const solidPlans=(id,cm)=>isSolidSurface(id)?plans[id].filter(p=>p.width===cm+1):[];
export function solidPlan(id,cm,layout){
 const choices=solidPlans(id,cm);
 if(layout)return choices.find(p=>p.layout===layout)||null;
 const preferred=id==='fiona'&&cm===120?'long':cm>=120?'double':'center';
 return choices.find(p=>p.layout===preferred)||choices[0]||null;
}
// Studio One exposes the manufacturer's two continuous 140 cm plans.
export const SOLID_SURFACE=Object.freeze({milo:solidPlan('milo',140),fiona:solidPlan('fiona',140)});
export const solidSurface=id=>Object.hasOwn(SOLID_SURFACE,id)?SOLID_SURFACE[id]:null;
export const integratedTop=id=>id==='sella'||id==='tampa'||isSolidSurface(id);
export const defaultBasinColor=id=>isSolidSurface(id)?'matte':'gloss';
export function solidLayoutName(p){
 if(p.id==='fiona'&&p.width===121&&['long','center'].includes(p.layout))return 'Cuve centrée '+p.bowlWidth+' × '+p.bowlDepth+' cm';
 return BASIN_LAYOUT_NAMES[p.layout];
}
export function solidDescription(p){
 const bowl=p.layout==='double'?'2 cuves de':p.layout==='offset'?'Cuve à gauche de':p.layout==='offset-right'?'Cuve à droite de':'Cuve centrée de';
 return 'Solid Surface blanc mat · '+p.width+' × '+p.depth+' × '+p.thickness.toLocaleString('fr-FR')+' cm · '+bowl+' '+p.bowlWidth+' × '+p.bowlDepth+' cm';
}
