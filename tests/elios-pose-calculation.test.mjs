import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const orderItems=createRequire(import.meta.url)('../functions/elios-pose-order-helpers.js').items;
const plain=value=>JSON.parse(JSON.stringify(value));

function calculator(){
 const elements=new Map(),element=selector=>{const node={value:'',textContent:'',innerHTML:'',disabled:false,classList:{add(){},remove(){},toggle(){}}};elements.set(selector,node);return node;};
 const root=element('#elios-pose-app');
 for(const selector of ['#ep-surface','#ep-waste','#ep-order','#ep-r-surface','#ep-r-target','#ep-r-boxes','#ep-r-ordered','#ep-result-body'])element(selector);
 elements.get('#ep-surface').value='30';elements.get('#ep-waste').value='10';
 const document={getElementById:id=>elements.get('#'+id)||null,querySelector:selector=>elements.get(selector)||null,querySelectorAll:()=>[]},context=vm.createContext({window:{},document,console,URLSearchParams});
 for(const file of ['assets/js/elios-pose-data-v1.js','assets/js/elios-pose-v2-base.js','assets/js/elios-pose-v2-finishes.js','assets/js/elios-pose-v2-selection.js','assets/js/elios-pose-v2-calc.js'])vm.runInContext(read(file),context,{filename:file});
 const S=context.window.LRF_ELIOS_POSE_V2;S.state.group='small';S.state.pattern='23';
 return {S,state:S.state,context,elements,element,root,$:selector=>elements.get(selector)||null};
}

const segmentoRow=(share=100)=>({share,series:'Segmento',color:'Duplex C',ref:'04I15C0',key:'15x15',label:'15 × 15 cm',pcs:46,boxM2:1.04,finish:'R9 · 8,5 mm'});
function segmento(h,rows=[segmentoRow()]){h.state.group='segmento';h.state.pattern='S01';h.S.segmentoReady=true;h.S.segmentoRows=()=>rows;}

test('invalid surfaces discard an earlier valid calculation and disable ordering',()=>{
 const h=calculator();
 for(const invalid of ['', '0', '-2', 'NaN', 'Infinity']){
  h.$('#ep-surface').value='30';h.S.calculate();assert(h.state.last?.rows.length,'A prior valid order exists');assert.equal(h.$('#ep-order').disabled,false);
  h.$('#ep-surface').value=invalid;h.S.calculate();assert.equal(h.state.last,null,'Invalid surface '+JSON.stringify(invalid)+' clears the old order');assert.equal(h.$('#ep-order').disabled,true,'Invalid surface '+JSON.stringify(invalid)+' blocks ordering');assert.doesNotMatch(h.$('#ep-result-body').innerHTML,/NaN|Infinity/);
 }
 h.$('#ep-surface').value='1';h.S.calculate();assert(h.state.last);assert.equal(h.$('#ep-order').disabled,false,'Correcting the surface restores normal calculation');
});

test('a positive need always orders a box, an exact box stays one and a real excess requires two',()=>{
 const h=calculator();segmento(h);h.$('#ep-waste').value='0';
 for(const [surface,boxes,pieces,ordered]of [['1e-12',1,46,1.04],['1.04',1,46,1.04],['1.040001',2,92,2.08]]){
  h.$('#ep-surface').value=surface;h.S.calculate();const row=h.state.last.rows[0];assert.equal(row.boxes,boxes);assert.equal(row.pieces,pieces);assert.equal(row.ordered,ordered);assert(row.ordered>=row.need);
  const server=orderItems([{ref:row.ref,requestedQty:row.ordered}])[0];assert.equal(server.boxes,boxes);assert.equal(server.pieces,pieces);assert.equal(server.orderQty,ordered,'Server ordering preserves the client’s complete-box quantity');
 }
});

test('recolouring both S01-C populations to one SKU groups their needs before rounding',()=>{
 const h=calculator();segmento(h,[segmentoRow(20/36*100),segmentoRow(16/36*100)]);h.S.calculate();
 const result=h.state.last;assert.equal(result.target,33);assert.equal(result.rows.length,1);const row=result.rows[0];assert.equal(row.ref,'04I15C0');assert(Math.abs(row.need-33)<1e-9);assert.equal(row.boxes,32,'Two source colour slots become one physical reference, rather than 18 + 15 separately rounded boxes');assert.equal(row.pieces,1472);assert.equal(row.ordered,33.28);assert.equal(result.totalBoxes,32);assert.equal(result.totalOrdered,33.28);
});

test('the optional small-format palette hook uses real source references without changing the old single-colour path',()=>{
 const h=calculator();h.$('#ep-surface').value='0.96';h.$('#ep-waste').value='0';h.S.calculate();const original=plain(h.state.last.rows);assert.equal(original.length,1);assert.equal(original[0].ref,'0996B00');assert.equal(original[0].boxes,2);
 const family=h.S.D.tropical,rows=family.colors.slice(0,2).map(color=>({share:50,series:family.series,color:color.color,ref:color.ref,key:family.format,label:family.formatLabel,pcs:family.pcs,boxM2:family.boxM2,finish:''}));let calls=0;
 h.S.smallRows=()=>{calls++;return rows;};h.S.calculate();assert.equal(calls,1);assert.deepEqual(Array.from(h.state.last.rows,row=>[row.ref,row.boxes,row.pieces]),[['0996B00',1,32],['0996B70',1,32]]);assert.equal(h.state.last.totalBoxes,2);
 h.state.group='modular';h.state.pattern='1';h.S.calculate();assert.equal(calls,1,'The small-format hook does not affect modular products');
 delete h.S.smallRows;h.state.group='small';h.state.pattern='23';h.S.calculate();assert.deepEqual(plain(h.state.last.rows),original,'Without a palette hook the established one-colour result is preserved');
 h.S.smallRows=()=>undefined;h.S.calculate();assert.deepEqual(plain(h.state.last.rows),original,'An optional hook that does not handle this product also preserves the old path');
});

test('Sedimenti slot assignments survive absent controls and persist explicit DOM changes',()=>{
 const h=calculator();h.state.group='sedimenti';h.state.pattern='30';h.state.colorsSedimenti={A:'Grey Selected',B:'Sand Selected'};h.S.calculate();
 assert.deepEqual(Array.from(h.state.last.rows,row=>[row.ref,row.need,row.boxes]),[['03Z7304',16.5,17],['03Z7303',16.5,17]],'A/B source assignments, rather than default colours, determine the exported references');
 const control=h.element('#ep-sed-color-0');control.value='Beige Selected';h.S.calculate();assert.equal(h.state.colorsSedimenti.A,'Beige Selected','An explicit on-screen value is saved for later renders');assert.deepEqual(Array.from(h.state.last.rows,row=>row.ref),['03Z7302','03Z7303']);
 h.elements.delete('#ep-sed-color-0');h.S.calculate();assert.deepEqual(Array.from(h.state.last.rows,row=>row.ref),['03Z7302','03Z7303'],'Removing the old select cannot restore its earlier default colour');
 h.state.colorsSedimenti=['Grey Selected','Sand Selected'];h.S.calculate();assert.deepEqual(Array.from(h.state.last.rows,row=>row.ref),['03Z7304','03Z7303']);assert.equal(Array.isArray(h.state.colorsSedimenti),false);assert.equal(h.state.colorsSedimenti.A,'Grey Selected');assert.equal(h.state.colorsSedimenti.B,'Sand Selected','Legacy indexed assignments migrate to durable named slots');
});

test('a missing or unready Segmento provider never silently orders one hundred percent of the legacy colour',()=>{
 const h=calculator();segmento(h);h.S.calculate();assert(h.state.last?.rows.length);
 delete h.S.segmentoRows;h.S.calculate();assert.equal(h.state.last,null);assert.equal(h.$('#ep-order').disabled,true);
 h.S.segmentoRows=()=>[segmentoRow()];h.S.segmentoReady=false;h.S.calculate();assert.equal(h.state.last,null);assert.equal(h.$('#ep-order').disabled,true);
 h.S.segmentoReady=true;h.S.calculate();assert.equal(h.state.last.rows[0].ref,'04I15C0');assert.equal(h.$('#ep-order').disabled,false);
});

test('malformed palette quantities cannot produce a stale or non-finite order',()=>{
 const h=calculator();segmento(h);
 for(const patch of [{ref:''},{boxM2:0},{boxM2:Infinity},{pcs:0},{pcs:NaN},{share:NaN},{share:-1}]){
  h.S.segmentoRows=()=>[segmentoRow()];h.S.calculate();assert(h.state.last);
  h.S.segmentoRows=()=>[{...segmentoRow(),...patch}];h.S.calculate();assert.equal(h.state.last,null,'Invalid physical product metadata '+Object.keys(patch)[0]+' clears the prior order');assert.equal(h.$('#ep-order').disabled,true);assert.doesNotMatch(h.$('#ep-result-body').innerHTML,/NaN|Infinity/);
 }
});

test('every legacy collection, finish, colour and compatible scheme keeps its real references and server box quantities',t=>{
 const h=calculator(),coverage={separate:0,module:0,small:0,sedimenti:0};let checkedRows=0;
 const verify=(expectedReferences,label)=>{
  h.S.calculate();const result=h.state.last;assert(result,label+' produces a valid order');assert.equal(h.$('#ep-order').disabled,false,label);
  assert.deepEqual(Array.from(result.rows,row=>row.ref).sort(),[...new Set(expectedReferences)].sort(),label+' keeps the chosen physical SKUs');
  assert(Math.abs(result.rows.reduce((sum,row)=>sum+row.need,0)-33)<1e-9,label+' allocates the entire surface plus margin');assert(result.totalOrdered>=33-1e-9,label+' orders enough complete boxes');
  const server=orderItems(Array.from(result.rows,row=>({ref:row.ref,requestedQty:row.ordered,format:row.label,color:row.color,kind:row.series,finish:row.finish})));
  for(const [index,row]of Array.from(result.rows).entries()){
   assert(row.need>0&&Number.isFinite(row.need),label);assert.equal(server[index].ref,row.ref,label);assert.equal(server[index].boxes,row.boxes,label+' client/server boxes');assert.equal(server[index].pieces,row.pieces,label+' client/server pieces');assert.equal(server[index].boxM2,row.boxM2,label+' uses the server’s actual carton');assert.equal(server[index].pcsBox,row.pcs,label+' uses the server’s actual piece count');assert(Math.abs(server[index].orderQty-row.ordered)<1e-9,label+' client/server ordered area');checkedRows++;
  }
 };
 h.state.group='modular';assert.equal(h.S.D.modularOptions.length,12,'Both Roma finishes, the two R10 module-only colours and all Sedimenti Tumbled combinations are covered');
 for(const product of h.S.D.modularOptions){
  h.state.modularId=product.id;h.state.packaging='separate';
  for(const pattern of h.S.eligible()){
   h.state.pattern=pattern.id;verify(Array.from(pattern.parts,([key])=>product.formats[key].ref),product.id+' separate '+pattern.id);coverage.separate++;
  }
  h.state.packaging='module';
  for(const pattern of h.S.eligible()){
   h.state.pattern=pattern.id;verify([h.S.modules[product.id].ref],product.id+' module '+pattern.id);coverage.module++;
  }
 }
 h.state.group='small';
 for(const family of h.S.smallFamilies)for(const color of family.colors){
  h.state.smallSeries=family.series;h.state.smallColor=color.color;
  for(const pattern of h.S.eligible()){h.state.pattern=pattern.id;verify([color.ref],family.series+' '+color.color+' '+pattern.id);coverage.small++;}
 }
 h.state.group='sedimenti';const selected=h.S.D.sedimentiSelected;
 for(const pattern of h.S.groupPatterns('sedimenti'))for(const palette of [{A:'Grey Selected',B:'Sand Selected',C:'Beige Selected'},{A:'White Selected',B:'White Selected',C:'White Selected'}]){
  h.state.pattern=pattern.id;h.state.colorsSedimenti={...palette};verify(Array.from(pattern.parts,([key,,letter])=>selected.data[palette[letter]][key].ref),'Sedimenti '+pattern.id+' '+Object.values(palette).join('/'));coverage.sedimenti++;
 }
 assert.deepEqual(coverage,{separate:180,module:48,small:64,sedimenti:8},'Every supported historical combination and the same-colour merge case actually ran');assert.equal(checkedRows,775,'The comparison covers every material line, including the eight new Roma module orders');
 t.diagnostic('Compared '+checkedRows+' client/server material lines across 300 historical configurations.');
});

test('Viminale and Palatino use only their verified Roma R10 module references and formats',()=>{
 const h=calculator();h.state.group='modular';
 for(const [name,reference]of [['Viminale','085M100'],['Palatino','085M170']]){
  const options=h.S.D.modularOptions.filter(product=>product.series==='Roma'&&product.color===name);
  assert.equal(options.length,1,name+' is offered only in its verified R10 finish');
  const product=options[0];assert.equal(product.finish,'R10');assert.equal(product.moduleOnly,true);
  assert.deepEqual(Object.keys(product.formats).sort(),['40.6x60.9','61x61'],name+' does not invent other individual formats');
  h.state.modularId=product.id;h.state.packaging='separate';
  assert.equal(h.S.eligible().length,0,'None of the 22 separate-format drawings can be made from these two formats');
  h.state.pattern='19';h.S.calculate();assert.equal(h.state.last,null,'An unavailable separate-format recipe cannot reach ordering');
  h.state.packaging='module';assert.deepEqual(Array.from(h.S.eligible(),pattern=>pattern.id),['19','20','21','22']);
  const module=h.S.modules[product.id];assert.equal(module.ref,reference);assert.equal(module.boxM2,.75);assert.equal(module.pcs,6);assert.match(module.finish,/R10/);assert.doesNotMatch(module.finish,/R11/);
  h.S.calculate();const row=h.state.last.rows[0];assert.equal(row.ref,reference);assert.equal(row.boxM2,.75);assert.equal(row.pcs,6);assert.equal(row.boxes,44);assert.equal(row.pieces,264);assert.equal(row.ordered,33);
  const server=orderItems([{ref:reference,requestedQty:row.ordered}])[0];assert.equal(server.boxM2,.75);assert.equal(server.pcsBox,6);assert.equal(server.boxes,row.boxes);assert.equal(server.pieces,row.pieces);
 }
});
