import {readPurchaseGrid} from '../../shared/lrf-server/purchase-grid.mjs';
import {purchaseRows} from '../../shared/lrf-server/commercial-reference.mjs';
export {privateReference} from '../../shared/lrf-server/commercial-reference.mjs';
import {quoteProject} from '../src/commerce/pricing.js';
import {checkedProject} from '../src/commerce/flow.js';

// Server-only mirror policy, independently verified against Juan Carlos's
// "09 TARIF MIROIRS PRO-FR.pdf", 11/11/2025 (email 03/12/2025), and
// "00 CONDITIONS VENTES PRO FRANCE.pdf" for STUDIO. The mirror tariff states
// public TTC / 1.20, then 50%; its model/size rows match RANDAL V04 p36.
// Public amounts below are guards, not a purchase grid. A new model, size,
// finish/reference or changed public tariff needs verification before pricing.
const MIRROR_TERMS=[
 ['basic',60,80,7080,{'': '10129'}],
 ['basic',70,60,6600,{'': '12449'}],
 ['basic',100,60,8520,{'': '11054'}],
 ['basic',120,60,9360,{'': '10130'}],
 ['zen',60,80,22080,{'': '11713'}],
 ['zen',80,80,24600,{'': '11533'}],
 ['zen',100,80,27480,{'': '11714'}],
 ['zen',120,80,31560,{'': '11523'}],
 ['ilse',60,80,46680,{'': '12743'}],
 ['ilse',80,80,52080,{'': '12744'}],
 ['ilse',100,80,57720,{'': '12745'}],
 ['ilse',120,80,63960,{'': '12746'}],
 ['capsule',45,90,41640,{'': '12741'}],
 ['metal-rect',80,60,25800,{Noir:'3731',Doré:'3727',Bronze:'3728',Argent:'3730'}],
 ['metal-rect',120,75,40800,{Noir:'10572',Doré:'10574',Bronze:'10575',Argent:'10577'}],
 ['round',60,60,19440,{Noir:'3717',Doré:'3722',Bronze:'3723',Argent:'3725'}]
];

function mirrorPurchase(row,item){
 if(item?.type!=='mirror')return null;
 const s=item.settings||{},terms=MIRROR_TERMS.find(([model,width,height])=>model===s.mirrorModel&&width===s.width&&height===s.height);
 if(!terms||row.publicTTC!==terms[3])return null;
 const refs=terms[4],ref=Object.hasOwn(refs,'')?refs['']:refs[s.mirrorFinish||'Noir'];
 return ref===row.ref?Math.round(row.publicTTC*5/12):null;
}

// Decryption happens only on the server; missing configuration fails closed.
export function purchaseQuote(input){
 const project=checkedProject(input),q=quoteProject(project),grid=readPurchaseGrid(new URL('./data/studio-one-purchase.enc.json',import.meta.url),'studio-one');
 const byId=new Map(project.items.map(item=>[item.id,item]));
 const rows=purchaseRows(q,grid).rows.map(row=>({...row,proHT:byId.get(row.itemId)?.type==='mirror'?(grid?mirrorPurchase(row,byId.get(row.itemId)):null):row.proHT}));
 const complete=rows.length>0&&rows.every(row=>row.proHT!==null),total=complete?rows.reduce((sum,row)=>sum+row.proHT,0):null;
 return {rows,proHT:Number.isSafeInteger(total)?total:null,pricingUnavailable:!complete,source:grid?'Grille STUDIO ONE et conditions miroirs vérifiées':'Tarifs agents momentanément indisponibles',indicative:q.indicative};
}
