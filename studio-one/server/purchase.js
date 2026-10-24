import {readPurchaseGrid} from '../../shared/lrf-server/purchase-grid.mjs';
import {quoteProject} from '../src/commerce/pricing.js';
import {checkedProject} from '../src/commerce/flow.js';
// Decryption happens only on the server; missing configuration fails closed.
export function purchaseQuote(input){
 const q=quoteProject(checkedProject(input)),grid=readPurchaseGrid(new URL('./data/studio-one-purchase.enc.json',import.meta.url),'studio-one'),prices=grid?.prices||Object.create(null);
 const rows=q.rows.map(r=>({...r,proHT:r.publicTTC!==null&&Number.isInteger(prices[r.ref])?prices[r.ref]:null}));
 return {rows,proHT:rows.length&&rows.every(r=>r.proHT!==null)?rows.reduce((n,r)=>n+r.proHT,0):null,source:grid?'Grille STUDIO ONE vérifiée':'Tarifs agents momentanément indisponibles',pricingUnavailable:!grid,indicative:q.indicative};
}
// A reference is never an encoded channel for a purchase amount.
export const privateReference=code=>/^LRF-\d{5}$/.test(code||'')?code:'';
