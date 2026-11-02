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
  let centres=null;
  for(const host of composition.items){
   if(host.type!=='cabinet'||!(host.settings.topSpan>host.settings.width)||host.settings.top==='bare'||host.placement.wall!==item.placement.wall)continue;
   const spec=__animaTopSelection(host.settings.top,host.settings.width,host.settings.format,host.settings.basinLayout,host.settings.topSpan);
   if(!spec?.positions.length)continue;
   const values=spec.positions.map(value=>value+(host.settings.topOffset||0)/100+(host.placement.u-item.placement.u)/100).filter(value=>Math.abs(value)<item.settings.width/200-.09);
   if(values.length)centres=values;
  }
  if(!centres&&item.settings.top==='bare')centres=[0];if(!centres)continue;
  const key=centres.join('|');if(item.asset.__animaPlumbingKey===key)continue;item.asset.__animaPlumbingKey=key;item.asset.setBasinCenters(centres);
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
