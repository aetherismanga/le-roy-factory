// Editing keeps furniture edges and grain readable. Reduce optical effects
// before reducing display definition; explicit Ultra and HD capture stay full.
export const QUALITY_PROFILES=Object.freeze([
 Object.freeze({id:'max',label:'Ultra HD',description:'Textures HD · contacts renforcés et reflets très fins',pixelRatio:2.5,supersampling:1.5,pixels:8300000,shadow:4096,reflection:2048,reflectionFps:60,reflectionSamples:4,transmission:1,anisotropy:16,ao:true}),
 Object.freeze({id:'balanced',label:'Standard',description:'Image nette · ombres et reflets optimisés',pixelRatio:1.5,pixels:3000000,shadow:1024,reflection:512,reflectionFps:15,reflectionSamples:0,transmission:.5,anisotropy:8,ao:false}),
 Object.freeze({id:'fluid',label:'Léger',description:'Meubles nets · effets réduits pour PC bureautique',pixelRatio:1.25,pixels:2400000,shadow:512,reflection:512,reflectionFps:12,reflectionSamples:0,transmission:.35,anisotropy:8,ao:false})
]);
// Phone density is bounded independently of desktop buffers. Both working
// profiles keep enough samples for small screens without enabling Ultra.
export const MOBILE_STANDARD=Object.freeze({...QUALITY_PROFILES[1],pixelRatio:1.5,supersampling:1.35,pixels:1400000,shadow:1024,reflection:256,reflectionFps:12,transmission:.35});
export const MOBILE_LIGHT=Object.freeze({...QUALITY_PROFILES[2],pixelRatio:1.4,supersampling:1.35,pixels:1100000,shadow:512,reflection:256,reflectionFps:8,transmission:.35});
export function renderPixelRatio(profile,width,height,deviceRatio=1){const budget=Math.sqrt(profile.pixels/Math.max(1,width*height));return Math.max(.1,Math.min(Math.max(deviceRatio,profile.supersampling||0),profile.pixelRatio,budget));}
export function profileSizes(profile,mobile=false,maxTextureSize=16384){return {shadow:Math.min(profile.shadow,mobile?(profile.ao?2048:1536):4096,maxTextureSize),reflection:Math.min(profile.reflection,mobile?(profile.ao?1024:512):2048,maxTextureSize)};}

// Gesture phases must not resize the canvas or change texture identity. The
// renderer can retain settled render-target allocations and only throttle
// updates while the pointer, camera or furniture is moving.
const interactionProfiles=new WeakMap();
export function interactionProfile(profile,{mobile=false}={}){
 let pair=interactionProfiles.get(profile);if(!pair){pair={};interactionProfiles.set(profile,pair);}
 const key=mobile?'mobile':'desktop';
 return pair[key]||(pair[key]=Object.freeze({...profile,shadow:profile.id==='fluid'?0:Math.min(profile.shadow,512),reflection:Math.min(profile.reflection,256),reflectionFps:profile.id==='fluid'?6:8,reflectionSamples:0,transmission:Math.min(profile.transmission,.35),ao:false}));
}
export class AdaptiveQuality{
 constructor({mobile=false}={}){this.mobile=mobile;this.level=1;this.mode='auto';this.previous=null;this.samples=[];this.lastChange=0;this.lastEvaluation=0;this.frameMs=0;}
 get profile(){return this.mobile&&this.level===1?MOBILE_STANDARD:this.mobile&&this.level===2?MOBILE_LIGHT:QUALITY_PROFILES[this.level];}
 setMobile(mobile){if(this.mobile===mobile)return;this.mobile=mobile;if(mobile&&this.mode==='auto'&&this.level===0)this.level=1;this.pause();}
 setMode(mode,now=0){if(!['auto','fluid','balanced','max'].includes(mode))return false;this.mode=mode;this.level=mode==='fluid'?2:mode==='max'?0:1;this.samples=[];this.previous=null;this.lastChange=now;this.lastEvaluation=now;return true;}
 pause(){this.previous=null;this.samples=[];}
 sample(now){if(this.previous===null){this.previous=now;return false;}const dt=now-this.previous;this.previous=now;if(dt<3||dt>1000)return false;this.samples.push(dt);if(this.samples.length>48)this.samples.shift();if(this.samples.length<12||now-this.lastEvaluation<900)return false;this.lastEvaluation=now;const sorted=[...this.samples].sort((a,b)=>a-b);this.frameMs=sorted[Math.floor(sorted.length*.75)];if(this.mode!=='auto')return false;
  if(this.frameMs>30&&this.level<2&&now-this.lastChange>1800){this.level++;this.changed(now);return true;}
  // A fluent working view is not evidence that full Ultra will fit in memory.
  // Recover to Standard only; Ultra is a deliberate choice or an HD capture.
  if(this.frameMs<19&&this.level>1&&this.samples.length===48&&now-this.lastChange>20000){this.level--;this.changed(now);return true;}return false;
 }
 changed(now){this.lastChange=now;this.samples=[];this.previous=null;}
}
export class ReflectionSchedule{
 constructor(){this.reset();}
 reset(){this.key=null;this.last=-Infinity;}
 shouldCapture(now,key,fps){if(key===this.key)return false;if(now-this.last<1000/fps)return false;this.key=key;this.last=now;return true;}
}
