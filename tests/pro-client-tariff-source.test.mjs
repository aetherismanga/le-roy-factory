import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectProfessionalTariffs} from '../scripts/check-professional-tariff-source.mjs';
const data={elios:{'azulimood|5x15|standard':{amount:12.34,label:'Synthetic A'},'azulimood|10x10|standard':{amount:56.78,label:'Synthetic B'}},view:[{proDetail:23.45}]};
test('release gate checks existing source coverage without returning confidential values',()=>{
 assert.deepEqual(inspectProfessionalTariffs(data),{validated:true,eliosQuotes:2,viewVariants:1,azuliFormats:['5x15','10x10']});
 for(const bad of [null,{...data,view:[]},{...data,view:[{}]},{...data,elios:{}},{...data,elios:{...data.elios,'azulimood|10x10|standard':{amount:NaN,label:'Invalid'}}}])assert.throws(()=>inspectProfessionalTariffs(bad));
});
