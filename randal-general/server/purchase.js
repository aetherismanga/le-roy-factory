import {quoteProject} from '../src/commerce/pricing.js';
import {checkedProject} from '../src/commerce/flow.js';
// The Studio One purchase grid does not apply to the general catalogue.
// Return no amount until a verified general-catalogue commercial grid is supplied.
export function purchaseQuote(input){const q=quoteProject(checkedProject(input));return {rows:q.rows.map(r=>({...r,proHT:null})),proHT:null,source:'Catalogue général : conditions professionnelles sur demande'};}
export const privateReference=(code,cents)=>/^LRF-\d{5}$/.test(code||'')&&Number.isInteger(cents)?code+'-'+(cents/100).toFixed(4):code||'';
