import {readFileSync} from 'node:fs';
const ceramic=JSON.parse(readFileSync(new URL('./data/ceramic-purchase.json',import.meta.url),'utf8'));
import {quoteProject} from '../src/commerce/pricing.js';
import {checkedProject} from '../src/commerce/flow.js';
// The Studio One purchase grid does not apply to the general catalogue.
// Only the supplied ceramic basin purchase grid is verified. Furniture and
// other categories remain on request; never infer their conditions.
export function purchaseQuote(input){const q=quoteProject(checkedProject(input));const rows=q.rows.map(r=>({...r,proHT:r.name.startsWith('Vasque ')&&r.publicTTC!==null&&Number.isInteger(ceramic.prices[r.ref])?ceramic.prices[r.ref]:null}));return {rows,proHT:rows.length&&rows.every(r=>r.proHT!==null)?rows.reduce((sum,r)=>sum+r.proHT,0):null,source:'Vasques céramiques : grille pro HT vérifiée ; autres conditions professionnelles sur demande'};}
export const privateReference=(code,cents)=>/^LRF-\d{5}$/.test(code||'')&&Number.isInteger(cents)?code+'-'+(cents/100).toFixed(4):code||'';
