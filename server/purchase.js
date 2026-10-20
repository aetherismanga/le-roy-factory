import {readFileSync} from 'node:fs';
import {quoteProject} from '../src/commerce/pricing.js';
import {checkedProject} from '../src/commerce/flow.js';
const catalog=JSON.parse(readFileSync(new URL('./data/studio-one-purchase.json',import.meta.url),'utf8'));
// Input amounts, discounts, account IDs and references are never trusted.
export function purchaseQuote(input){const q=quoteProject(checkedProject(input)),rows=q.rows.map(r=>({...r,proHT:r.publicTTC!==null&&Number.isInteger(catalog.prices[r.ref])?catalog.prices[r.ref]:null}));return {rows,proHT:rows.some(r=>r.proHT===null)?null:rows.reduce((n,r)=>n+r.proHT,0),source:'Grille STUDIO ONE existante',indicative:q.indicative};}
export const privateReference=(code,cents)=>/^LRF-\d{5}$/.test(code||'')&&Number.isInteger(cents)?code+'-'+(cents/100).toFixed(4):code||'';
