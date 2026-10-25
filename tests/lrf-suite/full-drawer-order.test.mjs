import {test} from 'node:test';import assert from 'node:assert/strict';
for(const app of ['studio-one','randal-general'])test(app+': full drawer option appears once in order details and preserves prices and references',async()=>{
 const {initialDraft,draftProject}=await import('../../'+app+'/src/commerce/guided.js');const {quoteProject}=await import('../../'+app+'/src/commerce/pricing.js');const {orderText}=await import('../../'+app+'/src/commerce/flow.js');
 const draft={...initialDraft(),top:'neris',topDrawer:'full'},project=draftProject(draft),standard=draftProject({...draft,topDrawer:'siphon'});
 assert.deepEqual(quoteProject(project),quoteProject(standard));assert.equal((orderText(project).match(/Tiroir supérieur plein/g)||[]).length,1);assert(!orderText(standard).includes('Tiroir supérieur plein'));
});
