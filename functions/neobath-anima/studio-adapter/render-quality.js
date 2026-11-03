// Anima-only working profiles. The original Studio One policy, manual minimum
// and native HD export remain unchanged. Auto first reduces expensive optical
// effects, while retaining enough pixels to read fine front relief and grain.
import {AdaptiveQuality as StudioAdaptiveQuality,QUALITY_PROFILES as STUDIO_PROFILES} from '../../../shared/lrf-3d/performance.js';
export {renderPixelRatio,profileSizes,ReflectionSchedule} from '../../../shared/lrf-3d/performance.js';

const freeze=Object.freeze;
export const QUALITY_PROFILES=freeze([
 STUDIO_PROFILES[0],
 freeze({...STUDIO_PROFILES[1],label:'Haute définition',supersampling:1.35,pixels:4000000}),
 STUDIO_PROFILES[2]
]);
export const MOBILE_STANDARD=freeze({...QUALITY_PROFILES[1],pixelRatio:1.65,supersampling:1.35,pixels:1500000,shadow:1024,reflection:256,reflectionFps:15,transmission:.5,anisotropy:8});
export const AUTO_ECONOMY=freeze({...STUDIO_PROFILES[2],label:'Détail adaptatif',description:'Relief et grain préservés · reflets et effets simplifiés',pixelRatio:1.25,supersampling:1.05,pixels:2000000,shadow:512,anisotropy:8});
export const MOBILE_ECONOMY=freeze({...AUTO_ECONOMY,pixelRatio:1.2,pixels:1000000});
export class AdaptiveQuality extends StudioAdaptiveQuality{
 get profile(){
  if(this.mode==='auto'&&this.level===2)return this.mobile?MOBILE_ECONOMY:AUTO_ECONOMY;
  if(this.level===1)return this.mobile?MOBILE_STANDARD:QUALITY_PROFILES[1];
  return QUALITY_PROFILES[this.level];
 }
}
