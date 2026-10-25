import {quoteProject} from '../src/commerce/pricing.js';
import {checkedProject} from '../src/commerce/flow.js';
export {privateReference} from '../../shared/lrf-server/commercial-reference.mjs';

// Catalogue Général only: purchase basis = public TTC / 1.20 / 2.
// Work in integer cents and round each priced line to the nearest cent.
// Studio One keeps its separate, unchanged official purchase grid.
export function purchaseQuote(input){
 const quote=quoteProject(checkedProject(input));
 const rows=quote.rows.map(row=>({
  ...row,
  proHT:Number.isSafeInteger(row.publicTTC)&&row.publicTTC>=0
   ?Math.round(row.publicTTC/2.4)
   :null
 }));
 const complete=rows.length>0&&rows.every(row=>row.proHT!==null);
 const total=complete?rows.reduce((sum,row)=>sum+row.proHT,0):null;
 return {
  rows,
  proHT:Number.isSafeInteger(total)?total:null,
  pricingUnavailable:!complete,
  source:'Catalogue Général : prix public TTC / 1,20 / 2'
 };
}
