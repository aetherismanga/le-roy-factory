import test from 'node:test';
import assert from 'node:assert/strict';
import {mountTileComposition} from '../../shared/lrf-3d/tile-composition-ui.js';
import {draftProject,initialDraft} from '../../studio-one/src/commerce/guided.js';
import {createVisualChoiceDOM} from '../helpers/visual-choice-dom.mjs';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){for(let i=0;i<300&&!predicate();i++)await settle();assert(predicate(),'Expected the pending verification to begin');}

test('tile codes clear synchronously on logout/account switches and delayed former-account replies cannot restore them',async()=>{
 const h=createVisualChoiceDOM(),originalFetch=globalThis.fetch,originalNodeFilter=globalThis.NodeFilter,pending=[];
 try{
  globalThis.NodeFilter={SHOW_ELEMENT:1,SHOW_TEXT:4,FILTER_ACCEPT:1,FILTER_REJECT:2};h.document.createTreeWalker=()=>({nextNode:()=>null});
  const elementPrototype=Object.getPrototypeOf(h.element('div'));elementPrototype.hasAttribute=function(name){return this.getAttribute(name)!==null;};
  const elements={};for(const id of ['composition-tabs','tile-composition','furniture-composition','quote-paper']){elements[id]=h.element('div');elements[id].id=id;h.document.body.append(elements[id]);}
  const legal=h.element('p');legal.className='quote-legal';elements['quote-paper'].append(legal);
  for(const mode of ['furniture','tiles']){const button=h.element('button');button.dataset.composition=mode;elements['composition-tabs'].append(button);}
  const query=h.document.querySelector.bind(h.document);h.document.querySelector=selector=>selector==='#quote-paper .quote-legal'?legal:query(selector);
  let credential='customer-first',identity={client:{codeClient:'LRF-12345',email:'first@example.test'},isAdmin:false};
  const project=draftProject(initialDraft()),ui=mountTileComposition({getProject:()=>project,getCredential:()=>credential,getIdentity:()=>identity});
  globalThis.fetch=(_url,options)=>new Promise(resolve=>pending.push({resolve,rows:JSON.parse(options.body).rows}));
  const verify=(index,code)=>pending[index].resolve({ok:true,json:async()=>({success:true,privateCode:code,pricingStatus:'verified',rows:pending[index].rows.map(row=>({...row,packVerified:true,unitPublicTTC:20,publicTTC:100})),totals:{publicTTC:200,subtotal:190,energyTax:{area:10,rateTTC:.84,amountTTC:8.4}}})});
  elements['composition-tabs'].children[1].click();await until(()=>pending.length===1);verify(0,'LRF-12345-100.00.00');await until(()=>ui.model?.privateCode==='LRF-12345-100.00.00');
  credential='customer-second';identity={client:{codeClient:'LRF-54321',email:'second@example.test'},isAdmin:false};ui.identityChanged();
  assert.equal(ui.model.privateCode,'');assert.equal(ui.documentData().privateCode,'');assert.equal(ui.model.totals.publicTTC,null);assert(!elements['tile-composition'].textContent.includes('LRF-12345-100.00.00'));
  await until(()=>pending.length===2);
  credential='customer-third';identity={client:{codeClient:'LRF-99999',email:'third@example.test'},isAdmin:false};ui.identityChanged();await until(()=>pending.length===3);
  verify(1,'LRF-54321-200.00.00');await settle();await settle();assert.equal(ui.model.privateCode,'','An old response cannot price the newer account');
  verify(2,'LRF-99999-300.00.00');await until(()=>ui.model.privateCode==='LRF-99999-300.00.00');
  credential='';identity=null;ui.identityChanged();assert.equal(ui.model.privateCode,'');assert.equal(ui.documentData().privateCode,'');await until(()=>pending.length===4);pending[3].resolve({ok:false,status:401,json:async()=>({success:false,error:'Expired session'})});await settle();await settle();assert.equal(ui.model.privateCode,'');assert.equal(ui.model.totals.publicTTC,null);
 }finally{globalThis.fetch=originalFetch;if(originalNodeFilter===undefined)delete globalThis.NodeFilter;else globalThis.NodeFilter=originalNodeFilter;h.restore();}
});
