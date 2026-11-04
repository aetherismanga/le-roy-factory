import {PRODUCT_BY_ID} from './anima-data.js';

import {planTapContext} from './tap-drilling.js';

/** Anima pp.70–74 list MFR separately (66 public HT per deck tap hole).
 * Quotation reads the very same drilled poses as the mesh: wall/none closes
 * custom holes, a basin's own ledge and fixed factory holes are not MFR work. */
export function planFabricationOperations(selection){
 if(!selection?.top?.configurableWidth||!selection.positions?.length)return [];
 const count=planTapContext(selection).physicalHoles.filter(hole=>hole.mount!=='basin').length,product=PRODUCT_BY_ID.get('mfr-accessory');
 return count&&product?[{product,quantity:count,kind:'tap-hole',planReference:selection.top.ref}]:[];
}
