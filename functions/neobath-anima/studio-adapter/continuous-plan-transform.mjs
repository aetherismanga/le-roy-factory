const prelude=`
import {continuousPlanOption as __animaPlanOption,validContinuousPlan as __animaValidPlan} from '@anima-adapter/continuous-plan-ui.js';
function __animaCombinationFormat(width,format=state.format){const current=cabinetFormat(format);return (current.allowedWidths.includes(width)?current:CABINET_FORMATS.find(form=>form.facade===current.facade&&form.height===current.height&&form.depth===current.depth&&form.allowedWidths.includes(width)))?.id||null;}
function __animaTopContext(mode){
 const selected=composition?.selected;
 if(selected?.type!=='cabinet')return topAvailable(mode,state.width,state.format)?{span:state.width,offset:0}:null;
 const host={...selected,settings:{...selected.settings,...Object.fromEntries(CABINET_KEYS.map(key=>[key,state[key]]))}};
 return __animaPlanOption({items:composition.items.map(item=>item.id===host.id?host:item)},host,mode);
}
function __animaSyncContinuousTops(){
 if(!composition)return;
 for(const item of composition.items){
  if(item.type!=='cabinet'||!(item.settings.topSpan>item.settings.width)||__animaValidPlan(composition,item))continue;
  Object.assign(item.settings,{top:'bare',topSpan:item.settings.width,topOffset:0});item.asset.setTop('bare',item.settings);item.dimensions=itemDimensions('cabinet',item.settings);
  if(composition.selectedId===item.id)Object.assign(state,{top:'bare',topSpan:item.settings.width,topOffset:0});
  installCabinetTap(item);
 }
 for(const item of composition.items){
  if(item.type!=='cabinet'||cabinetFormat(item.settings.format).subtype!=='vanity'||!item.asset.setBasinCenters)continue;
  const positions=[];
  for(const host of composition.items){
   if(host.type!=='cabinet'||host.settings.top==='bare'||host.placement.wall!==item.placement.wall||host.id!==item.id&&!(host.settings.topSpan>host.settings.width))continue;
   const spec=__animaTopSelection(host.settings.top,host.settings.width,host.settings.format,host.settings.basinLayout,host.settings.topSpan,host.settings.topPlanId,host.settings.topLength,host.settings);
   if(!spec?.positions.length)continue;
   const form=cabinetFormat(host.settings.format),baseZ=form.depth/2-.23+(spec.previewDepth-(spec.referenceDepth??spec.previewDepth))/200;
   const actual=host.asset.getBasinPositions?.()||spec.positions.map((value,i)=>({x:value+((host.settings.topOffset||0)+(host.settings.topShift||0))/100,z:(spec.positionsZ?.[i]??.020)+baseZ}));
   for(const point of actual){const x=point.x+(host.placement.u-item.placement.u)/100,z=point.z+((host.placement.offset||0)-(item.placement.offset||0))/100;if(Math.abs(x)<item.settings.width/200-.09&&!positions.some(position=>Math.abs(position.x-x)<.000001&&Math.abs(position.z-z)<.000001))positions.push({x,z});}
  }
  positions.sort((a,b)=>a.x-b.x);const key=positions.map(point=>point.x+','+point.z).join('|');if(item.asset.__animaPlumbingKey===key)continue;item.asset.__animaPlumbingKey=key;item.asset.setBasinCenters(positions.map(point=>point.x),positions.map(point=>point.z));item.asset.setTopDrawer(positions.length?'siphon':'full');

 }
}
`;

export function transformContinuousPlans(source){
 source=source.replace("'grass','ncsCode'];","'grass','ncsCode','topSpan','topOffset'];");
 // All factories receive the plan context, while their width remains stock.
 source=source.replaceAll('basinTop:s.top,','basinTop:s.top,topSpan:s.topSpan,topOffset:s.topOffset,')
  .replaceAll('basinTop:state.top,','basinTop:state.top,topSpan:state.topSpan,topOffset:state.topOffset,')
  .replaceAll('basinTop:settings.top,','basinTop:settings.top,topSpan:settings.topSpan,topOffset:settings.topOffset,');
 const before="if(!selectedCabinet()||!TOP_OPTIONS.some(o=>o.id===id)||!topAvailable(id,state.width,state.format))return false;const selected=composition?.selected;if(selected){const dimensions=itemDimensions('cabinet',{...selected.settings,top:id});";
 const after="const context=__animaTopContext(id);if(!selectedCabinet()||!TOP_OPTIONS.some(o=>o.id===id)||!context)return false;const selected=composition?.selected;if(selected){const dimensions=itemDimensions('cabinet',{...selected.settings,top:id,topSpan:context.span,topOffset:context.offset});";
 if(!source.includes(before))throw Error('Studio One continuous plan selection contract changed.');source=source.replace(before,after);
 source=source.replace('const nextLayout=resolveBasinLayout(id,state.width,state.format,state.basinLayout);','state.topSpan=context.span;state.topOffset=context.offset;const nextLayout=resolveBasinLayout(id,state.width,state.format,state.basinLayout,state.topSpan);')
  .replace('if(!model.setTop(id))','if(!model.setTop(id,{topSpan:state.topSpan,topOffset:state.topOffset}))')
  .replace("decorateAsset(model,'cabinet',composition?.selected?.settings||state);refreshWidthUI();","saveCabinetState();decorateAsset(model,'cabinet',composition?.selected?.settings||state);refreshWidthUI();refreshBasinUI();");
 source=source.replaceAll('topAvailable(t.id,state.width,state.format)','!!__animaTopContext(t.id)')
  .replaceAll('topAvailable(b.dataset.top,state.width,state.format)','!!__animaTopContext(b.dataset.top)')
  .replaceAll('topAvailable(id,state.width,state.format)','!!__animaTopContext(id)')
  .replaceAll('topAvailable(wantedTop,cm,state.format)','!!__animaTopContext(wantedTop)')
  .replaceAll('topAvailable(s.top,s.width,s.format)','topAvailable(s.top,s.width,s.format,s.topSpan)');
 source=source.replace('TOP_OPTIONS.filter(t=>!!__animaTopContext(t.id))',"TOP_OPTIONS.filter(t=>!!__animaTopContext(t.id)).map(t=>{const context=__animaTopContext(t.id);return context.span>state.width?{...t,description:t.description+' · plan continu '+context.span+' cm'}:t;})");
 source=source.replace('b.disabled=!allowed;b.setAttribute(\'aria-disabled\'',"b.disabled=!allowed;b.hidden=!allowed;b.setAttribute('aria-disabled'");
 source=source.replace('choices=cabinetCombinations(total);','choices=cabinetCombinations(total).filter(widths=>widths.every(width=>__animaCombinationFormat(width)));')
  .replace('widths.some(w=>!validWidth(w))','widths.some(w=>!__animaCombinationFormat(w,selected.settings.format))')
  .replace("for(const width of widths){const settings={...selected.settings,width,top:topAvailable(selected.settings.top,width)?selected.settings.top:'plain',drawers:[...selected.settings.drawers]}","for(const width of widths){const form=cabinetFormat(__animaCombinationFormat(width,selected.settings.format)),settings={...selected.settings,format:form.id,width,topSpan:width,topOffset:0,top:topAvailable(selected.settings.top,width,form.id)?selected.settings.top:'bare',drawers:Array(form.drawers).fill(0)}")
  .replace("' caissons · modèle et finition conservés · plans séparés'","' caissons Anima disponibles · finition conservée'");
 for(const fn of ['basinColors','basinEntry','resolveBasinLayout','basinLayouts']){
  // The original engine keeps these public signatures; only Anima gains span.
  source=source.replaceAll(`${fn}(state.top,state.width,state.format,state.basinLayout)`,`${fn}(state.top,state.width,state.format,state.basinLayout,state.topSpan)`)
   .replaceAll(`${fn}(state.top,state.width,state.format,state.basinColor)`,`${fn}(state.top,state.width,state.format,state.basinColor,state.topSpan)`)
   .replaceAll(`${fn}(id,state.width,state.format,state.basinLayout)`,`${fn}(id,state.width,state.format,state.basinLayout,state.topSpan)`)
   .replaceAll(`${fn}(s.top,s.width,s.format,s.basinLayout)`,`${fn}(s.top,s.width,s.format,s.basinLayout,s.topSpan)`)
   .replaceAll(`${fn}(s.top,s.width,s.format)`,`${fn}(s.top,s.width,s.format,undefined,s.topSpan)`);
 }
 source=source.replace("basinEntry(s.top,s.basinColor||'gloss',s.width,s.format,s.basinLayout)","basinEntry(s.top,s.basinColor||'gloss',s.width,s.format,s.basinLayout,s.topSpan)")
  .replace('basinReference(state.top,state.basinColor,state.width,state.format,state.basinLayout)','basinReference(state.top,state.basinColor,state.width,state.format,state.basinLayout,state.topSpan)')
  .replace('item.asset.setTop(item.settings.top);','item.asset.setTop(item.settings.top,item.settings);')
  .replace('basinColors(item.settings.top,item.settings.width,item.settings.format,item.settings.basinLayout)','basinColors(item.settings.top,item.settings.width,item.settings.format,item.settings.basinLayout,item.settings.topSpan)')
  .replace('if(!composition)return;for(const item of composition.items){applySupportMaterial','if(!composition)return;__animaSyncContinuousTops();for(const item of composition.items){applySupportMaterial')
  .replace('function collectProject(){return publicProjectData','function collectProject(){__animaSyncContinuousTops();return publicProjectData');
 return prelude+source;
}

export function transformContinuousPreview(source){
 return source.replaceAll('basinTop:s.top,','basinTop:s.top,topSpan:s.topSpan,topOffset:s.topOffset,')
  .replaceAll('item.asset.setTop(s.top);','item.asset.setTop(s.top,s);').replaceAll('asset.setTop(s.top);','asset.setTop(s.top,s);')
  .replaceAll('basinColors(s.top,s.width,s.format,s.basinLayout)','basinColors(s.top,s.width,s.format,s.basinLayout,s.topSpan)')
  .replace("i.settings.basinLayout,i.settings.facadeMode||'overlay'","i.settings.basinLayout,i.settings.facadeMode||'overlay',i.settings.topSpan,i.settings.topOffset");
}
