const original="total.textContent=money(q.publicTTC);excluded.textContent=q.excluded.length?q.excluded.length+' élément(s) sans tarif, hors montant mobilier.':'Mobilier de votre composition.';";

// The original live amount is reused; only Anima's richer quote explanation
// changes. Unknown fabrication charges never become a made-up zero total.
export function transformAnimaQuoteDisplay(source,relativePath){
 if(relativePath!=='commerce/atelier.js')return source;
 if(!source.includes(original))throw Error('Studio One live quote display changed; review Anima tariff explanation.');
 return "import {atelierQuoteSummary as __animaQuoteSummary} from '@anima-adapter/commerce/quote-summary.js';\n"+source.replaceAll(original,'const summary=__animaQuoteSummary(q);total.textContent=summary.totalText;excluded.textContent=summary.detailsText;');
}
