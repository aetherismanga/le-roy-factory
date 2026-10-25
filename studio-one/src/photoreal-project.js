import {translateText as t} from '../../shared/lrf-3d/i18n/index.js';
import {buildPhotorealPrompt} from './photoreal-export.js';
import {CATALOG} from './commerce/catalog.js';
import {quoteProject} from './commerce/pricing.js';

// Public manufacturer names and references only; never export quote prices.
export function buildStudioPhotorealPrompt(project){
 const prompt=buildPhotorealPrompt(project,{name:'RANDAL STUDIO ONE',scope:'room',finishName:id=>CATALOG.finishes.find(f=>f.id===id)?.name||id});
 const products=quoteProject(project).rows.map(({name,ref,detail})=>({modele:name,reference:ref,dimensionsEtFinition:detail}));
 return prompt+(products.length?'\n\n'+t('DESCRIPTION FABRICANT DU MOBILIER :')+'\n'+JSON.stringify(products,null,2):'');
}
