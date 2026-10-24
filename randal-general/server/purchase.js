import {readPurchaseGrid} from '../../shared/lrf-server/purchase-grid.mjs';
import {quoteProject} from '../src/commerce/pricing.js';
import {checkedProject} from '../src/commerce/flow.js';
// Only the verified ceramic basin grid applies to the general catalogue.
export function purchaseQuote(input){
 const q=quoteProject(checkedProject(input)),grid=readPurchaseGrid(new URL('./data/ceramic-purchase.enc.json',import.meta.url),'randal-general'),prices=grid?.prices||Object.create(null);
 const rows=q.rows.map(r=>({...r,proHT:r.name.startsWith('Vasque ')&&r.publicTTC!==null&&Number.isInteger(prices[r.ref])?prices[r.ref]:null}));
 return {rows,proHT:rows.length&&rows.every(r=>r.proHT!==null)?rows.reduce((sum,r)=>sum+r.proHT,0):null,source:grid?'Vasques céramiques : grille pro HT vérifiée ; autres conditions professionnelles sur demande':'Tarifs agents momentanément indisponibles',pricingUnavailable:!grid};
}
export const privateReference=code=>/^LRF-\d{5}$/.test(code||'')?code:'';
