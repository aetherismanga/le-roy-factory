import {TOP_PRODUCTS,BASIN_PRODUCTS,PRODUCT_BY_ID,topSelection,firstPriceKey} from './anima-data.js';
import {continuousPlanGroups,continuousTopContext,continuousTopCompatible} from './projects.js';
import {surfaceFamilyForSelection,surfaceOptions,normalizeTopSurface,normalizeNcsCode} from './premium-materials.js';
import {cabinetFormat} from './configuration.js';
import {basinLayouts,basinColors,BASIN_LAYOUT_NAMES} from './basins.js';
import VISUALS from '../../../assets/data/neobath-anima-visuals.json' with {type:'json'};

export const PREMIUM_FAMILIES=Object.freeze([
 {id:'bare',name:'Meuble seul'},
 {id:'fenix',name:'Fenix · sur mesure'},
 {id:'hpl',name:'HPL · sur mesure'},
 {id:'gres',name:'Grès · sur mesure'},
 {id:'geacril',name:'Geacril · sur mesure'},
 {id:'geacril-stone',name:'Geacril Stone · sur mesure'},
 {id:'integrated',name:'Plans-vasques · formats catalogue'},
 {id:'furniture',name:'Plans assortis au meuble'}
]);
const round=n=>Math.round(n*100)/100;
const number=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:2});
const money=n=>Number.isFinite(n)?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n):'Sur devis';
const dataVisuals=()=>globalThis.NEOBATH_ANIMA_VISUALS||VISUALS;
const photo=p=>{const value=dataVisuals().products?.[p?.id];return typeof value==='string'?value:value?.image;};
const mainColor=(product,current)=>product?.prices?.some(p=>p.key===current)?current:firstPriceKey(product);
export const worktopFamily=p=>p?.subtype==='integrated'&&!p.configurableWidth?'integrated':surfaceFamilyForSelection({top:p})||'furniture';
const selectionFor=s=>topSelection(s.top,s.width,s.format,s.basinLayout,s.topSpan||s.width,s.topPlanId,s.topLength,s);

function groupsFor(project,host){
 const groups=continuousPlanGroups(project,host.id);
 return groups.length?groups:[{span:host.settings.width,offset:0,ids:[host.id],min:host.placement.u-host.settings.width/2,max:host.placement.u+host.settings.width/2}];
}
function prospective(project,host,settings){return {...project,items:project.items.map(item=>item.id===host.id?{...host,settings}:item)};}
function fits(project,host,settings){
 const next=prospective(project,host,settings),candidate=next.items.find(item=>item.id===host.id),selection=selectionFor(settings);
 return !!selection&&!!continuousTopContext(next,candidate)&&continuousTopCompatible(next,host.id,settings.top,settings.topSpan||settings.width,settings.topOffset||0);
}
function surfaceFields(settings,selection){
 const choices=surfaceOptions(settings,selection),old=choices.find(surface=>surface.id===settings.topSurfaceId),surface=old||choices.find(surface=>!surface.customNcs)||choices[0];
 if(!surface)return {topSurfaceId:'',topSurfaceNcs:''};
 const normalized=normalizeTopSurface({...settings,topSurfaceId:surface.id},selection);
 const linked=selection.basin?.subtype==='integrated'&&selection.basin.prices?.some(entry=>entry.key===normalized.priceKey);
 return {topSurfaceId:surface.id,topSurfaceNcs:surface.customNcs?settings.topSurfaceNcs||'':'',topPriceKey:normalized.priceKey,...(linked?{basinColor:normalized.priceKey,basinPriceKey:normalized.priceKey}:{})};
}

// Produces serializable settings only; callers still use the original Studio
// One collision checks and project validator before changing the live model.
export function planSettings(project,host,planId,group,basinId=null){
 const old=host.settings,plan=PRODUCT_BY_ID.get(planId),span=group.span;
 if(!plan||plan.category!=='worktop')return null;
 const basin=basinId&&PRODUCT_BY_ID.get(basinId),top=basin?.id||plan.id,oldSelection=selectionFor(old),sameBasin=basin?.id===oldSelection?.basin?.id;
 const length=plan.configurableWidth?Math.max(span,Math.min(plan.maxWidth||span,old.topLength||span)):span;
 const unchangedPlan=selectionFor(old)?.top?.id===plan.id&&span===(old.topSpan||old.width)&&group.offset===(old.topOffset||0);
 let settings={...old,topDepth:plan.configurableWidth&&oldSelection?.top?.id===plan.id?old.topDepth:undefined,basinOffsetX:sameBasin?old.basinOffsetX||0:0,basinOffsetZ:sameBasin?old.basinOffsetZ||0:0,top,topPlanId:plan.id,topSpan:span,topOffset:group.offset,topLength:length,topShift:unchangedPlan?old.topShift||0:0,basinLayout:'center',
  basinColor:mainColor(basin||plan,old.basinColor),topPriceKey:mainColor(plan,old.topPriceKey),basinPriceKey:basin?mainColor(basin,old.basinPriceKey||old.basinColor):''};
 if(settings.topDepth==null)delete settings.topDepth;
 const selection=selectionFor(settings);if(!selection)return null;
 settings.basinLayout=selection.layout||'center';Object.assign(settings,surfaceFields(settings,selection));
 const layouts=basin&&Number(basin.basinCount||1)===1?[...new Set([old.basinLayout,'center','left','right'].filter(layout=>['center','left','right'].includes(layout)))]:[settings.basinLayout];
 for(const layout of layouts){const candidate={...settings,basinLayout:layout};if(fits(project,host,candidate))return candidate;}
 return null;
}

export function premiumPlanChoices(project,host){
 if(!host||host.type!=='cabinet')return [];
 const groups=groupsFor(project,host),choices=[];
 for(const product of TOP_PRODUCTS){
  const contexts=groups.flatMap(group=>{const settings=planSettings(project,host,product.id,group);return settings?[{...group,settings}]:[];});
  if(contexts.length)choices.push({product,family:worktopFamily(product),contexts});
 }
 return choices;
}

export function premiumBasinChoices(project,host,settings=host.settings){
 const selection=selectionFor(settings),plan=selection?.top;
 if(!plan?.configurableWidth)return [];
 const group={span:settings.topSpan||settings.width,offset:settings.topOffset||0};
 return BASIN_PRODUCTS.flatMap(product=>{
  if(!product.compatibleTopIds?.includes(plan.id))return [];
  const next=planSettings(project,{...host,settings},plan.id,group,product.id);
  return next?[{product,settings:next}]:[];
 });
}

function styles(document){
 if(document.getElementById('anima-premium-controls-style'))return;
 const style=document.createElement('style');style.id='anima-premium-controls-style';
 style.textContent=`
.anima-premium{display:grid;gap:14px;min-width:0;width:100%;grid-column:1/-1;box-sizing:border-box}
.anima-premium label{display:grid;gap:7px;min-width:0;font:600 13px/1.4 Arial,sans-serif;color:#29483e}
.anima-premium select,.anima-premium input{box-sizing:border-box;width:100%;min-width:0;min-height:44px;border:1px solid #cbd2c5;border-radius:7px;background:#fffdf7;padding:10px;color:#29483e;font:14px Arial,sans-serif}
.anima-premium .anima-plan-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.anima-premium .anima-plan-fields button{align-self:end;grid-column:1/-1;min-height:44px}
.anima-premium small,.anima-premium p{margin:0;font:12px/1.5 Arial,sans-serif;color:#65715f}
.anima-premium h4{margin:4px 0 0;font:600 13px Arial,sans-serif;color:#29483e}
.anima-premium .anima-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0}
.anima-premium .anima-photo-choice{display:grid;align-content:start;gap:6px;min-width:0;border:1px solid #cbd2c5;border-radius:8px;background:#fffdf7;color:#29483e;padding:9px;text-align:left;cursor:pointer}
.anima-premium .anima-photo-choice[aria-pressed=true]{border-color:#29483e;background:#e9efdf;box-shadow:inset 0 0 0 1px #29483e}
.anima-premium .anima-photo-choice img{width:100%;height:96px;object-fit:contain;display:block;background:#fff}
.anima-premium .anima-photo-choice strong{font:600 12px/1.4 Arial,sans-serif;overflow-wrap:anywhere}
.anima-premium .anima-palette{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.anima-premium .anima-palette .anima-photo-choice img{height:55px;object-fit:cover}
.anima-premium .anima-surface-sample{height:55px;display:block;border-radius:4px}
.anima-premium .anima-plan-summary{display:grid;gap:8px;padding:12px;border-radius:8px;background:#edf0e6}
.anima-premium .anima-plan-photo{display:block;max-height:150px;object-fit:contain;width:100%;background:#fff;border-radius:8px}
.anima-premium [role=alert]{color:#9b493e}
.anima-premium .anima-plan-cards{max-height:360px;overflow-y:auto;overscroll-behavior:contain;padding:1px 4px 2px 1px}
.anima-premium .anima-plan-diagram{position:relative;display:grid;place-items:center;isolation:isolate;min-height:104px;overflow:hidden;background:#f1f0e9;border-radius:5px}
.anima-premium .anima-plan-slab{display:block;width:80%;height:55px;transform:skewY(-9deg);background-size:cover;box-shadow:0 5px 0 #b8b9b1,4px 12px 14px #24342a1f;border:1px solid #e8e8df;border-radius:2px}
.anima-premium .anima-plan-diagram small{position:absolute;bottom:6px;font-size:10px;letter-spacing:.02em;color:#435647;background:#fffef8e8;padding:1px 4px;border-radius:3px}
.anima-premium .anima-basin-cards{max-height:350px;overflow-y:auto;overscroll-behavior:contain;padding:1px 4px 2px 1px}
.anima-premium button{min-height:44px;touch-action:manipulation;font-size:14px}
.anima-premium [hidden]{display:none!important}
`;
 document.head.append(style);
}
function element(document,tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function field(parent,label,entries,value,onChange,key){
 const document=parent.ownerDocument,wrap=element(document,'label',label),select=element(document,'select');select.setAttribute('aria-label',label);select.dataset.premiumControl=key;
 for(const entry of entries){const option=element(document,'option',entry.name);option.value=String(entry.id);option.selected=String(value)===String(entry.id);select.append(option);}
 select.value=String(value??entries[0]?.id??'');select.onchange=()=>onChange(select.value);wrap.append(select);parent.append(wrap);return select;
}
function photoButton(parent,product,selected,action,detail){
 const document=parent.ownerDocument,button=element(document,'button',undefined,'anima-photo-choice');button.type='button';button.dataset.premiumBasin=product.id;button.setAttribute('aria-pressed',String(selected));
 const src=photo(product);if(src){const image=element(document,'img');image.src=src;image.alt='NEOBATH ANIMA · '+product.label+' · '+product.ref;image.width=242;image.height=167;image.loading='lazy';image.decoding='async';button.append(image);}
 button.append(element(document,'strong',product.label+' · '+product.ref),element(document,'small',detail));button.onclick=action;parent.append(button);return button;
}

function planDiagram(document,product,settings){
 const selection={top:product},candidate={...settings,top:product.id,topPlanId:product.id},material=normalizeTopSurface(candidate,selection),root=element(document,'div',undefined,'anima-plan-diagram'),slab=element(document,'span',undefined,'anima-plan-slab');
 slab.style.backgroundColor=material?.surface?.hex||'#eeeae0';const texture=material?.surface?.texture||material?.surface?.swatch;if(texture)slab.style.backgroundImage='url("'+texture+'")';
 root.dataset.premiumPlanDiagram=product.id;root.setAttribute('role','img');root.setAttribute('aria-label','Plan seul · '+product.label+' · sans vasque');root.append(slab,element(document,'small','Plan seul · sans vasque'));return root;
}
function planCard(parent,choice,settings,selected,action,{family=false}={}){
 const document=parent.ownerDocument,p=choice.product,button=element(document,'button',undefined,'anima-photo-choice');button.type='button';button.dataset.premiumPlan=p.id;if(family)button.dataset.premiumPlanFamily=choice.family;button.setAttribute('aria-label','Choisir '+(family?(PREMIUM_FAMILIES.find(entry=>entry.id===choice.family)?.name||p.label):p.label+' · '+p.ref));button.setAttribute('aria-pressed',String(selected));
 if(p.configurableWidth)button.append(planDiagram(document,p,settings));else {const src=photo(p);if(src){const image=element(document,'img');image.src=src;image.alt='NEOBATH ANIMA · '+p.label+' · '+p.ref;image.width=242;image.height=167;image.loading='lazy';image.decoding='async';button.append(image);}}
 button.append(element(document,'strong',family?(PREMIUM_FAMILIES.find(entry=>entry.id===choice.family)?.name||p.label):p.label),element(document,'small',p.ref+' · H '+number(p.height)+' cm'+(p.configurableWidth?' · sur mesure':'')));button.onclick=action;parent.append(button);return button;
}

export function renderPremiumPlanControls(parent,{project,host,onPatch,onError=()=>{}}={}){
 const document=parent.ownerDocument||globalThis.document;styles(document);
 const root=element(document,'div',undefined,'anima-premium');root.dataset.premiumPlans='true';parent.append(root);
 if(!host||host.type!=='cabinet')return root;
 const settings=host.settings,selection=selectionFor(settings),plan=selection?.top,choices=premiumPlanChoices(project,host),family=plan?worktopFamily(plan):'bare';
 const status=element(document,'small');status.setAttribute('role','alert');
 const apply=next=>{if(!next)return false;const ok=onPatch(next);if(ok===false){status.textContent='Cette sélection ne peut pas être appliquée. Vérifiez les supports et la position des vasques.';return false;}return true;};
 const validFamilies=PREMIUM_FAMILIES.filter(item=>item.id==='bare'||choices.some(choice=>choice.family===item.id));
 field(root,'Famille du plan',validFamilies,family,value=>{
  if(value==='bare'){apply({...settings,top:'bare',topDepth:undefined,basinOffsetX:0,basinOffsetZ:0,topPlanId:'',topSurfaceId:'',topSurfaceNcs:'',topPriceKey:'',basinPriceKey:'',topSpan:settings.width,topOffset:0,topLength:settings.width,topShift:0,basinColor:'standard'});return;}
  const choice=choices.find(choice=>choice.family===value),context=choice?.contexts.find(context=>context.span===(settings.topSpan||settings.width))||choice?.contexts[0];apply(context?.settings);
 },'family');
 const choosePlan=choice=>{const context=choice?.contexts.find(context=>context.span===(settings.topSpan||settings.width)&&context.offset===(settings.topOffset||0))||choice?.contexts[0];if(!context)return;const keepBasin=selection?.basin&&planSettings(project,host,choice.product.id,context,selection.basin.id);apply(keepBasin||context.settings);};
 root.append(element(document,'h4',plan?'Choisir le modèle du plan':'Choisir un plan ou une vasque'));
 const planCards=element(document,'div',undefined,'anima-choice-grid anima-plan-cards');
 const visiblePlans=plan?choices.filter(choice=>choice.family===family):validFamilies.filter(entry=>entry.id!=='bare').map(entry=>choices.find(choice=>choice.family===entry.id)).filter(Boolean);
 for(const choice of visiblePlans)planCard(planCards,choice,settings,choice.product.id===plan?.id,()=>choosePlan(choice),{family:!plan});root.append(planCards);
 if(!plan){root.append(element(document,'p','Plans seuls et plans-vasques du catalogue. Pour un plan sur mesure, choisissez ensuite la vasque compatible.'),status);return root;}
 const familyChoices=choices.filter(choice=>choice.family===family),activeChoice=familyChoices.find(choice=>choice.product.id===plan.id);
 const planSelector=field(root,'Modèle / épaisseur du plan',familyChoices.map(choice=>({id:choice.product.id,name:choice.product.label+' · '+choice.product.ref+' · H '+number(choice.product.height)+' cm · '+money((choice.product.prices?.[0]?.price??NaN)*1.2)+(choice.product.unit==='cm'?' / cm':'')})),plan.id,id=>{
  const choice=choices.find(choice=>choice.product.id===id),context=choice?.contexts.find(context=>context.span===(settings.topSpan||settings.width)&&context.offset===(settings.topOffset||0))||choice?.contexts[0];
  if(!context)return;const keepBasin=selection.basin&&planSettings(project,host,id,context,selection.basin.id);apply(keepBasin||context.settings);
 },'plan');planSelector.parentNode.hidden=true;
 const contexts=activeChoice?.contexts||[];
 if(contexts.length>1)field(root,'Meubles supports du plan',contexts.map((context,index)=>({id:index,name:context.ids.length+' meuble'+(context.ids.length>1?'s':'')+' · '+number(context.span)+' cm'+(context.offset?' · décalage '+number(context.offset)+' cm':'')})),contexts.findIndex(context=>context.span===(settings.topSpan||settings.width)&&context.offset===(settings.topOffset||0)),id=>{
  const group=contexts[Number(id)];apply(planSettings(project,host,plan.id,group,selection.basin?.id)||group.settings);
 },'supports');
 const summary=element(document,'div',undefined,'anima-plan-summary');
 summary.append(element(document,'strong',(selection.basin?'Plan + vasque':selection.integrated?'Plan-vasque intégré':'Plan seul · sans vasque')+' · '+plan.ref),element(document,'p','L '+number(selection.topWidth)+' × P '+number(settings.topDepth||plan.depth||selection.previewDepth||46.2)+' × H '+number(plan.height)+' cm · supports '+number(settings.topSpan||settings.width)+' cm'));
 if(plan.configurableWidth){
  const overhang=(selection.topLength-(settings.topSpan||settings.width))/2,shift=settings.topShift||0;
  summary.append(element(document,'p','Débord gauche '+number(overhang-shift)+' cm · débord droit '+number(overhang+shift)+' cm.'));
  const fields=element(document,'div',undefined,'anima-plan-fields'),lengthWrap=element(document,'label','Longueur du plan (cm)'),length=element(document,'input');length.type='number';length.step='.1';length.min=Math.max(settings.topSpan||settings.width,plan.minWidth||1);length.max=plan.maxWidth||600;length.value=selection.topLength;length.dataset.premiumControl='length';lengthWrap.append(length);
  const shiftWrap=element(document,'label','Décalage du plan (cm)'),move=element(document,'input');move.type='number';move.step='.1';move.min=-overhang;move.max=overhang;move.value=shift;move.dataset.premiumControl='shift';shiftWrap.append(move);
  const depthWrap=element(document,'label','Profondeur du plan (cm)'),depth=element(document,'input');depth.type='number';depth.step='.1';depth.min=Math.round(cabinetFormat(settings.format).depth*1000)/10;depth.max=90;depth.value=settings.topDepth||plan.depth||selection.previewDepth||46.2;depth.dataset.premiumControl='depth';depthWrap.append(depth);
  const commit=element(document,'button','Appliquer les dimensions');commit.type='button';commit.dataset.premiumControl='dimensions';commit.onclick=()=>{
   const next={...settings,topLength:Number(length.value),topShift:Number(move.value),topDepth:Number(depth.value)};
   if(!Number.isFinite(next.topLength)||next.topLength<Number(length.min)||next.topLength>Number(length.max)){status.textContent='Merci de demander une validation usine pour une longueur hors '+number(plan.minWidth||60)+'–'+number(plan.maxWidth||240)+' cm. Le plan doit aussi couvrir les '+number(settings.topSpan||settings.width)+' cm de supports.';onError(status.textContent);return;}
   if(!Number.isFinite(next.topDepth)||next.topDepth<Number(depth.min)||next.topDepth>Number(depth.max)){status.textContent='La profondeur doit couvrir les '+number(depth.min)+' cm du caisson et rester inférieure ou égale à '+depth.max+' cm.';onError(status.textContent);return;}
   if(!fits(project,host,next)){status.textContent='Le plan doit couvrir les supports et les cuves rester au-dessus de vrais sous-vasques. Vérifiez le décalage et la position des vasques.';onError(status.textContent);return;}
   apply(next);
  };fields.append(lengthWrap,shiftWrap,depthWrap,commit);summary.append(fields);summary.append(element(document,'small','Une profondeur différente du catalogue nécessite un devis fabricant.'));
  if(plan.requiresWidthConfirmation)summary.append(element(document,'p','Fabrication sur mesure : longueur et débords à confirmer avec le fabricant.'));
 }
 if(!plan.depth)summary.append(element(document,'p','Profondeur de prévisualisation '+number(selection.previewDepth||46.2)+' cm · implantation à confirmer avant fabrication.'));
 root.append(summary);
 const surfaces=surfaceOptions(settings,selection),material=normalizeTopSurface(settings,selection);
 const useSurfaceImage=plan.configurableWidth&&material?.surface,planImage=useSurfaceImage?(material.surface.swatch||material.surface.texture):photo(plan);
 if(planImage){const image=element(document,'img',undefined,'anima-plan-photo');image.src=planImage;image.width=242;image.height=167;image.alt=useSurfaceImage?'Matière du plan sélectionnée · '+material.surface.name:'Plan-vasque NEOBATH · '+plan.label+' · '+plan.ref;image.dataset.premiumPlanImage=useSurfaceImage?material.surface.id:plan.id;root.append(image);}

 if(surfaces.length){
  root.append(element(document,'h4','Couleur et matière du plan'));
  const palette=element(document,'div',undefined,'anima-palette');
  for(const surface of surfaces){
   const button=element(document,'button',undefined,'anima-photo-choice');button.type='button';button.dataset.premiumSurface=surface.id;button.setAttribute('aria-pressed',String(material?.id===surface.id));
   if(surface.swatch||surface.texture){const image=element(document,'img');image.src=surface.swatch||surface.texture;image.alt=surface.name;image.width=96;image.height=55;image.loading='lazy';button.append(image);}else{const sample=element(document,'span',undefined,'anima-surface-sample');sample.style.backgroundColor=surface.hex||'#f6f5f1';button.append(sample);}
   button.append(element(document,'strong',surface.name));button.onclick=()=>{
    if(surface.customNcs){ncsSection.hidden=false;ncs.value=settings.topSurfaceNcs||'';ncs.dataset.surfaceId=surface.id;ncs.focus();return;}
    const next={...settings,topSurfaceId:surface.id,topSurfaceNcs:''};Object.assign(next,surfaceFields(next,selection));if(!selection.basin)next.basinColor=next.topPriceKey;apply(next);
   };palette.append(button);
  }root.append(palette);
  const ncsSection=element(document,'div',undefined,'anima-plan-fields'),ncsWrap=element(document,'label','Code NCS sur mesure'),ncs=element(document,'input');ncs.type='text';ncs.maxLength=40;ncs.placeholder='S 2010-G10Y';ncs.value=settings.topSurfaceNcs||'';ncs.dataset.premiumControl='ncs';ncs.dataset.surfaceId=material?.surface.customNcs?material.id:'';ncsWrap.append(ncs);const confirm=element(document,'button','Appliquer le NCS');confirm.type='button';confirm.onclick=()=>{
   const code=normalizeNcsCode(ncs.value);if(! /^(?:S\s*)?\d{4}-(?:[YRGB](?:\d{2}[YRGB])?|N)$/.test(code)){status.textContent='Renseignez un code NCS complet, par exemple S 2010-G10Y.';return;}
   const next={...settings,topSurfaceId:ncs.dataset.surfaceId,topSurfaceNcs:code,ncsCode:code};Object.assign(next,surfaceFields(next,selection));if(!selection.basin)next.basinColor=next.topPriceKey;apply(next);
  };ncsSection.append(ncsWrap,confirm,element(document,'small','Teinte NCS sur commande · couleur à valider sur un échantillon fabricant.'));ncsSection.hidden=!material?.surface.customNcs;root.append(ncsSection);
 }
 if(plan.configurableWidth){
  const basins=premiumBasinChoices(project,host),kinds=[{id:'none',name:'Plan seul · sans vasque'},...(basins.some(choice=>choice.product.subtype==='integrated')?[{id:'integrated',name:'Vasque intégrée · supplément'}]:[]),...(basins.some(choice=>choice.product.subtype!=='integrated')?[{id:'countertop',name:'Vasque à poser / semi-encastrée · supplément'}]:[])];
  const kind=selection.basin?(selection.basin.subtype==='integrated'?'integrated':'countertop'):'none',cards=element(document,'div',undefined,'anima-choice-grid anima-basin-cards');
  const renderCards=value=>{cards.replaceChildren();for(const choice of basins.filter(choice=>value==='integrated'?choice.product.subtype==='integrated':value==='countertop'?choice.product.subtype!=='integrated':true)){
   const p=choice.product,entry=p.prices.find(entry=>entry.key===choice.settings.basinColor)||p.prices[0];
   photoButton(cards,p,p.id===selection.basin?.id,()=>apply(choice.settings),(p.width?number(p.width)+' × '+number(p.depth)+' cm · ':'')+(p.basinCount===2?'2 cuves · ':'')+'supplément '+money(entry?.price==null?NaN:entry.price*1.2));
  }};
  field(root,'Équipement du plan',kinds,kind,value=>{if(value==='none'){const context={span:settings.topSpan||settings.width,offset:settings.topOffset||0};apply(planSettings(project,host,plan.id,context));}else renderCards(value);},'basin-kind');
  root.append(element(document,'h4','Choisir une vasque compatible'));renderCards(kind);root.append(cards);
 }
 if(plan.configurableWidth&&selection.basin){
  const positionFields=element(document,'div',undefined,'anima-plan-fields');positionFields.dataset.premiumBasinPosition='true';root.append(element(document,'h4','Déplacer la vasque sur le plan'));
  const offsetInputs={};for(const [key,title] of [['basinOffsetX','Gauche / droite (cm)'],['basinOffsetZ','Avant / arrière (cm)']]){const wrap=element(document,'label',title),input=element(document,'input');input.type='number';input.step='.1';input.value=settings[key]||0;input.dataset.premiumControl=key;wrap.append(input);positionFields.append(wrap);offsetInputs[key]=input;}
  const moveBasin=element(document,'button','Appliquer la position');moveBasin.type='button';moveBasin.dataset.premiumControl='basin-position-xy';moveBasin.onclick=()=>{const next={...settings,basinOffsetX:Number(offsetInputs.basinOffsetX.value),basinOffsetZ:Number(offsetInputs.basinOffsetZ.value)};if(!Number.isFinite(next.basinOffsetX)||!Number.isFinite(next.basinOffsetZ)){status.textContent='Renseignez deux déplacements en centimètres.';return;}if(!fits(project,host,next)){status.textContent='La cuve doit rester dans le plan et au-dessus d’un sous-vasque. Réduisez le déplacement.';onError(status.textContent);return;}apply(next);};positionFields.append(moveBasin,element(document,'small','0 cm correspond à la position du modèle. Les limites dépendent du plan, de la cuve et des caissons.'));root.append(positionFields);
 }
 if(selection.positions.length){
  const layoutOptions=basinLayouts(settings.top,settings.width,settings.format,undefined,settings.topSpan||settings.width,settings.topPlanId,settings.topLength,settings).filter(option=>fits(project,host,{...settings,basinLayout:option.layout}));
  if(layoutOptions.length>1)field(root,'Position de la vasque',layoutOptions.map(option=>({id:option.layout,name:BASIN_LAYOUT_NAMES[option.layout]||option.layout})),settings.basinLayout||selection.layout,layout=>apply({...settings,basinLayout:layout}),'basin-position');
  const main=selection.basin||selection.top;
  const linkedMaterial=selection.basin?.subtype==='integrated'&&surfaces.length&&main.prices?.some(entry=>entry.key===material?.priceKey);
  if(main.prices?.length>1&&(!surfaces.length||selection.basin)&&!linkedMaterial)field(root,'Finition de la vasque',main.prices.map(entry=>({id:entry.key,name:entry.label+' · '+money(entry.price==null?NaN:entry.price*1.2)})),settings.basinPriceKey||settings.basinColor,key=>apply({...settings,basinColor:key,basinPriceKey:selection.basin?key:'',...(!selection.basin?{topPriceKey:key}:{})}),'basin-color');
  const color=basinColors(settings.top,settings.width,settings.format,settings.basinLayout,settings.topSpan||settings.width,settings.topPlanId,settings.topLength,settings).find(color=>color.id===(settings.basinPriceKey||settings.basinColor));
  if(color?.swatch){const sample=element(document,'img');sample.src=color.swatch;sample.alt='Référence de matière Ocritech · '+color.name;sample.width=112;sample.height=72;sample.style.cssText='display:block;width:112px;height:72px;object-fit:cover;border-radius:6px';sample.loading='lazy';root.append(sample);}
  if(color?.colorAccuracy){const note=element(document,'small',color.colorNote||'Rendu indicatif : cette teinte n’est pas calibrée sur un nuancier fabricant.');note.dataset.basinColorAccuracy=String(color.colorAccuracy);root.append(note);}
 }
 root.append(status);return root;
}
