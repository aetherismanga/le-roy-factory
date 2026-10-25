import {readPurchaseGrid} from '../../shared/lrf-server/purchase-grid.mjs';
import {purchaseRows} from '../../shared/lrf-server/commercial-reference.mjs';
export {privateReference} from '../../shared/lrf-server/commercial-reference.mjs';
import {quoteProject} from '../src/commerce/pricing.js';
import {checkedProject} from '../src/commerce/flow.js';
// Only the verified ceramic basin grid applies to the general catalogue.
export function purchaseQuote(input){
 const q=quoteProject(checkedProject(input)),grid=readPurchaseGrid(new URL('./data/ceramic-purchase.enc.json',import.meta.url),'randal-general');
 return {...purchaseRows(q,grid),source:grid?'Vasques céramiques : grille pro HT vérifiée ; autres conditions professionnelles sur demande':'Tarifs agents momentanément indisponibles'};
}
