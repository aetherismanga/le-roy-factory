import {buildPhotorealPrompt} from './photoreal-export.js';
import {CATALOG} from './commerce/catalog.js';
import {quoteProject} from './commerce/pricing.js';

// Catalogue labels are selected explicitly; quote prices, customer details and
// project notes never become part of the external image-generation brief.
export function buildGeneralPhotorealPrompt(project){
 const prompt=buildPhotorealPrompt(project,{name:'RANDAL Catalogue Général',scope:'room',finishName:id=>CATALOG.finishes.find(f=>f.id===id)?.name||CATALOG.topFinishes.find(f=>f.id===id)?.name||id});
 const products=quoteProject(project).rows.map(({name,ref,detail})=>({modele:name,reference:ref,dimensionsEtFinition:detail}));
 return prompt+(products.length?'\n\nDESCRIPTION FABRICANT DU MOBILIER :\n'+JSON.stringify(products,null,2):'');
}
