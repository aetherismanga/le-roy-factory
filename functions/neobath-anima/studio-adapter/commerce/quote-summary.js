import {money} from './pricing.js';

/** Keep priced furniture visible when a distinct fabrication item needs a
 * quotation. Equipment excluded from the furniture amount is a separate list. */
export function atelierQuoteSummary(quote){
 const missing=quote.missing||[],excluded=quote.excluded||[];
 const totalText=missing.length?money(quote.subtotal)+' · sous-total':money(quote.publicTTC);
 const details=[];
 if(missing.length){
  const references=[...new Set(missing.map(row=>row.ref&&row.ref!=='À confirmer'?row.ref:row.name||'Article à confirmer'))];
  details.push('Sur devis : '+references.join(', ')+'. Total à compléter.');
 }else details.push('Mobilier de votre composition.');
 if(excluded.length)details.push(excluded.length+' équipement'+(excluded.length>1?'s':'')+' hors montant mobilier (robinetterie ou éléments de pièce).');
 return {totalText,detailsText:details.join(' ')};
}
