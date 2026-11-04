// Anima uses the same crisp office-PC budget as the two Randal ateliers.
// Manufacturer identities and full Ultra/HD exports remain independent.
import {AdaptiveQuality as StudioAdaptiveQuality,QUALITY_PROFILES as STUDIO_PROFILES,MOBILE_STANDARD as SHARED_MOBILE_STANDARD,MOBILE_LIGHT} from '../../../shared/lrf-3d/performance.js';
export {renderPixelRatio,profileSizes,ReflectionSchedule,interactionProfile} from '../../../shared/lrf-3d/performance.js';

const freeze=Object.freeze;
export const QUALITY_PROFILES=freeze([
 STUDIO_PROFILES[0],
 freeze({...STUDIO_PROFILES[1],label:'Haute définition'}),
 STUDIO_PROFILES[2]
]);
export const MOBILE_STANDARD=freeze({...SHARED_MOBILE_STANDARD,label:'Haute définition'});
export const AUTO_ECONOMY=freeze({...STUDIO_PROFILES[2],label:'Détail adaptatif',description:'Relief et grain préservés · reflets et effets simplifiés'});
export const MOBILE_ECONOMY=freeze({...MOBILE_LIGHT,label:'Détail adaptatif',description:AUTO_ECONOMY.description});
export class AdaptiveQuality extends StudioAdaptiveQuality{
 get profile(){
  if(this.level===2)return this.mode==='auto'?(this.mobile?MOBILE_ECONOMY:AUTO_ECONOMY):(this.mobile?MOBILE_LIGHT:QUALITY_PROFILES[2]);
  if(this.level===1)return this.mobile?MOBILE_STANDARD:QUALITY_PROFILES[1];
  return QUALITY_PROFILES[this.level];
 }
}
