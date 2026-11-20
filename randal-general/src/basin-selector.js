import {mountBasinPlacement} from '../../shared/lrf-3d/basin-placement.js';
import {TOP_OPTIONS} from './basin-options.js';
import {topAvailable} from './configuration.js';
import {basinLayouts,resolveBasinLayout} from './basins.js';
import {solidPlan,solidDescription,defaultBasinColor} from '../../shared/lrf-3d/solid-surface-catalog.js';
import {basinChoicePrice} from './commerce/basin-price.js';
import {money} from './commerce/pricing.js';

export function basinChoices(settings){
 return TOP_OPTIONS.filter(o=>topAvailable(o.id,settings.width,settings.format)).map(o=>{
  const active=o.id===settings.top,layout=resolveBasinLayout(o.id,settings.width,settings.format,active?settings.basinLayout:undefined);
  const plan=solidPlan(o.id,settings.width,layout),price=basinChoicePrice(settings,o.id);
  const name=plan?plan.name+(plan.layout==='double'?' double':'')+' · Solid Surface':o.name;
  return {...o,name,image:plan?.image||o.image,description:plan?solidDescription(plan):o.description,price};
 });
}

export function renderBasinPlacement(parent,settings,{onModel,onLayout,id}){
 const layouts=basinLayouts(settings.top,settings.width,settings.format,settings.basinColor||defaultBasinColor(settings.top));
 const alternatives=basinChoices(settings).filter(o=>o.id!==settings.top&&!['plain','none'].includes(o.id));
 return mountBasinPlacement(parent,settings,{onModel,onLayout,id,layouts,alternatives,money});
}
