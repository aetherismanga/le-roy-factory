import {readPurchaseGrid} from '../../shared/lrf-server/purchase-grid.mjs';
import {purchaseRows} from '../../shared/lrf-server/commercial-reference.mjs';
export {privateReference} from '../../shared/lrf-server/commercial-reference.mjs';
import {quoteProject} from '../src/commerce/pricing.js';
import {checkedProject} from '../src/commerce/flow.js';
// Decryption happens only on the server; missing configuration fails closed.
export function purchaseQuote(input){
 const q=quoteProject(checkedProject(input)),grid=readPurchaseGrid(new URL('./data/studio-one-purchase.enc.json',import.meta.url),'studio-one');
 return {...purchaseRows(q,grid),source:grid?'Grille STUDIO ONE vérifiée':'Tarifs agents momentanément indisponibles',indicative:q.indicative};
}
