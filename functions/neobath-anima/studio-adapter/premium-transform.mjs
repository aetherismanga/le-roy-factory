// Applied after the ordinary Studio One/continuous-plan transforms. The
// original workspace, collision engine, inspector and project journal remain.
export const premiumAtelierPrelude=`
import {renderPremiumPlanControls as __animaPremiumControls} from '@anima-adapter/premium-controls.js';
import {continuousTopContext as __animaPremiumContext,continuousTopCompatible as __animaPremiumCompatible} from '@anima-adapter/projects.js';
function __animaPremiumProject(){return {items:composition?.items||[]};}
function __animaPremiumApply(settings){
 const item=composition?.selected;if(item?.type!=='cabinet')return false;
 const previous={...item.settings},oldDimensions={...item.dimensions};
 try{
  const project=collectProject(),next={...previous,...settings};
  validateProject({...project,items:project.items.map(raw=>raw.id===item.id?{...raw,settings:next}:raw)});
  const error=composition.resize(item,itemDimensions('cabinet',next));if(error){placementStatus(error);return false;}
  item.settings=next;for(const key of CABINET_KEYS)state[key]=next[key];
  if(!model.setTop(next.top,next))throw Error('Ce plan et cette vasque ne peuvent pas être assemblés.');
  paintAsset(item);model.setSurface?.(next,{onReady:()=>invalidate(false,false)});
  state.topDrawer=model.setTopDrawer(next.topDrawer);saveCabinetState();
  renderComposition();refreshWidthUI();refreshBasinUI();refreshInspector();invalidate();scheduleProjectCheckpoint();
  placementStatus('Plan Anima appliqué · dimensions, matière et vasque conservées.');return true;
 }catch(error){
  item.settings=previous;item.dimensions=oldDimensions;for(const key of CABINET_KEYS)state[key]=previous[key];
  try{model.setTop(previous.top,previous);paintAsset(item);}catch{}
  placementStatus(error.message||'Sélection de plan incompatible.');return false;
 }
}
function __animaRenderPremium(parent){return __animaPremiumControls(parent,{project:__animaPremiumProject(),host:composition?.selected,onPatch:__animaPremiumApply,onError:placementStatus});}
function __animaPremiumSidebar(){const parent=$('#top-options');if(!parent)return;parent.replaceChildren();if(composition?.selected?.type==='cabinet')__animaRenderPremium(parent);else {const hint=document.createElement('small');hint.textContent='Sélectionnez un meuble pour choisir son plan et sa vasque.';parent.append(hint);}const notes=$$('#top-section>.control-note');if(notes.length)notes.at(-1).textContent='Plans, matières et vasques du catalogue Neobath Anima.';}
`;

export function transformPremiumAtelier(source){
 if(!source.includes('function __animaTopContext(mode)'))throw Error('Anima premium controls require continuous plans first.');
 source=source.replace("'topSpan','topOffset'];","'topSpan','topOffset','topPlanId','topLength','topShift','topDepth','basinOffsetX','basinOffsetZ','topSurfaceId','topSurfaceNcs','topPriceKey','basinPriceKey'];");
 for(const object of ['s','state','settings'])source=source.replaceAll(`topSpan:${object}.topSpan,topOffset:${object}.topOffset,`,`topSpan:${object}.topSpan,topOffset:${object}.topOffset,topPlanId:${object}.topPlanId,topLength:${object}.topLength,topShift:${object}.topShift,topDepth:${object}.topDepth,basinOffsetX:${object}.basinOffsetX,basinOffsetZ:${object}.basinOffsetZ,topSurfaceId:${object}.topSurfaceId,topSurfaceNcs:${object}.topSurfaceNcs,`);
 source=source.replace('if(!model.setTop(id,{topSpan:state.topSpan,topOffset:state.topOffset}))','if(!model.setTop(id,{...state}))');
 source=source.replace('state.topSpan=context.span;state.topOffset=context.offset;',"state.topSpan=context.span;state.topOffset=context.offset;if(id==='bare')Object.assign(state,{topPlanId:'',topLength:state.width,topShift:0,topDepth:undefined,basinOffsetX:0,basinOffsetZ:0,topSurfaceId:'',topSurfaceNcs:'',topPriceKey:'',basinPriceKey:''});")
  .replace('const next=makeModel({width:cm/100,',"if(cm!==state.width){state.topSpan=cm;state.topOffset=0;state.topShift=0;if(!state.topLength||state.topLength<cm)state.topLength=cm;}const next=makeModel({width:cm/100,");
 // Selecting an existing cabinet must preserve its saved support group and
 // manufacturing length instead of silently choosing the widest available set.
 const contextReturn='return __animaPlanOption({items:composition.items.map(item=>item.id===host.id?host:item)},host,mode);';
 if(!source.includes(contextReturn))throw Error('Continuous plan context contract changed.');
 source=source.replace(contextReturn,`const project={items:composition.items.map(item=>item.id===host.id?host:item)};if(mode===state.top){const context=__animaPremiumContext(project,host);if(context&&__animaPremiumCompatible(project,host.id,mode,context.span,context.offset))return context;}return __animaPlanOption(project,host,mode);`);
 const start=source.indexOf("else if(editTarget==='basin'){");
 const end=source.indexOf('}else if(isOpening(editTarget))',start);
 if(start<0||end<0)throw Error('Studio One basin inspector contract changed.');
 source=source.slice(0,start)+"else if(editTarget==='basin'){grid.hidden=true;__animaRenderPremium(body);renderTapChooser(body,composition?.selected);\n "+source.slice(end);
 const loopStart=source.indexOf('for(const option of TOP_OPTIONS){',source.indexOf('function makeUI()'));
 const loopEnd=source.indexOf('for(const cm of WIDTH_PRESETS)',loopStart);
 if(loopStart<0||loopEnd<0)throw Error('Studio One sidebar plan control contract changed.');
 source=source.slice(0,loopStart)+'__animaPremiumSidebar();\n '+source.slice(loopEnd);
 // Forward the optional source worktop and manufacturing length through all
 // shared basin helpers. Their original call signatures remain valid elsewhere.
 source=source.replaceAll('state.basinLayout,state.topSpan)','state.basinLayout,state.topSpan,state.topPlanId,state.topLength,state)')
  .replaceAll('state.basinColor,state.topSpan)','state.basinColor,state.topSpan,state.topPlanId,state.topLength,state)')
  .replaceAll('s.basinLayout,s.topSpan)','s.basinLayout,s.topSpan,s.topPlanId,s.topLength,s)')
  .replaceAll('undefined,s.topSpan)','undefined,s.topSpan,s.topPlanId,s.topLength,s)')
  .replaceAll('item.settings.basinLayout,item.settings.topSpan)','item.settings.basinLayout,item.settings.topSpan,item.settings.topPlanId,item.settings.topLength,item.settings)')
  .replaceAll('host.settings.basinLayout,host.settings.topSpan)','host.settings.basinLayout,host.settings.topSpan,host.settings.topPlanId,host.settings.topLength,host.settings)');
 source=source.replace('function __animaTopColors(top,width,format,layout,span){const colors=basinColors(top,width,format,layout,span);','function __animaTopColors(top,width,format,layout,span,plan,length,options){const colors=basinColors(top,width,format,layout,span,plan,length,options);')
  .replace('top,width,format,layout,span),product=selection?.product','top,width,format,layout,span,plan,length,options),product=selection?.product');
 source=source.replace('function refreshBasinUI(){','function refreshBasinUI(){__animaPremiumSidebar();')
  .replace("$('#basin-color-section').hidden=!colors.length;","$('#basin-color-section').hidden=true;")
  .replace('installCabinetTap(item);}else item.asset.setHingeSide',"item.asset.setSurface?.(item.settings,{onReady:()=>invalidate(false,false)});installCabinetTap(item);}else item.asset.setHingeSide")
  .replace('saveCabinetState();if(composition?.selected?.type',"model.setSurface?.(composition?.selected?.settings||state,{onReady:()=>invalidate(false,false)});saveCabinetState();if(composition?.selected?.type")
  .replace('restoreProject,changeCabinetFormat,','restoreProject,setPlanSettings:__animaPremiumApply,changeCabinetFormat,')
  .replace('value+(host.settings.topOffset||0)/100+','value+((host.settings.topOffset||0)+(host.settings.topShift||0))/100+');
 // Any broken continuous plan returns to a clean bare cabinet, with no stale
 // manufacturing dimensions or material identifiers left in its saved record.
 source=source.replaceAll("{top:'bare',topSpan:item.settings.width,topOffset:0}","{top:'bare',topSpan:item.settings.width,topOffset:0,topPlanId:'',topLength:item.settings.width,topShift:0,topDepth:undefined,basinOffsetX:0,basinOffsetZ:0,topSurfaceId:'',topSurfaceNcs:'',topPriceKey:'',basinPriceKey:''}");
 return premiumAtelierPrelude+source;
}

export function transformPremiumPreview(source){
 for(const object of ['s','state','settings'])source=source.replaceAll(`topSpan:${object}.topSpan,topOffset:${object}.topOffset,`,`topSpan:${object}.topSpan,topOffset:${object}.topOffset,topPlanId:${object}.topPlanId,topLength:${object}.topLength,topShift:${object}.topShift,topDepth:${object}.topDepth,basinOffsetX:${object}.basinOffsetX,basinOffsetZ:${object}.basinOffsetZ,topSurfaceId:${object}.topSurfaceId,topSurfaceNcs:${object}.topSurfaceNcs,`);
 return source.replaceAll('s.basinLayout,s.topSpan)','s.basinLayout,s.topSpan,s.topPlanId,s.topLength,s)')
  .replaceAll('item.asset.setTop(s.top,s);','item.asset.setTop(s.top,s);item.asset.setSurface?.(s);')
  .replace(/(?<![\w.])asset\.setTop\(s\.top,s\);/g,'asset.setTop(s.top,s);asset.setSurface?.(s);');
}
