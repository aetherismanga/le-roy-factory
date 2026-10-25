import {test} from 'node:test';import assert from 'node:assert/strict';
import {CATALOG as C} from '../../randal-general/src/commerce/catalog.js';
import {basinChoicePrice} from '../../randal-general/src/commerce/basin-price.js';
import {basinLayouts,basinColors} from '../../randal-general/src/basins.js';
import {initialDraft,draftProject} from '../../randal-general/src/commerce/guided.js';
import {quoteProject} from '../../randal-general/src/commerce/pricing.js';
import {topAvailable} from '../../randal-general/src/configuration.js';
import {readFileSync} from 'node:fs';
const official=JSON.parse(readFileSync(new URL('../../randal-general/qa/ceramic-pdf-prices.json',import.meta.url))).publicTTC;
test('General basin choice prices and recap agree for every available model, width, colour and basin layout',()=>{
 let checked=0;
 for(const model of C.models)for(const width of model.widths)for(const top of ['sella','tampa','neris','torne']){
  if(!topAvailable(top,width,model.id))continue;
  const base={...initialDraft(model.collection),format:model.id,width,finish:model.finishes[0],top};
  const colors=['sella','tampa'].includes(top)?basinColors(top,width,model.id):C.vesselColors.map(c=>({id:c.code}));
  for(const color of colors){const layouts=['sella','tampa'].includes(top)?basinLayouts(top,width,model.id,color.id):[{layout:null}];
   for(const layout of layouts){const draft={...base,basinColor:color.id,basinLayout:layout.layout},q=quoteProject(draftProject(draft)),row=q.rows.find(r=>r.name.startsWith('Vasque '));
    assert(row);assert(Number.isInteger(row.publicTTC));assert.equal(basinChoicePrice(draft,top),row.publicTTC);
    if(['sella','tampa'].includes(top))assert.equal(row.publicTTC,official[row.ref]);
    else assert.equal(row.publicTTC,C.vesselTTC);
    checked++;
   }
  }
 }
 assert(checked>500);console.log('Verified basin choices: '+checked);
});
