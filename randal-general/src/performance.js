export const QUALITY_PROFILES=Object.freeze([
 Object.freeze({id:'max',label:'Ultra HD',description:'Textures HD · contacts renforcés et reflets très fins',pixelRatio:2.5,supersampling:1.5,pixels:8300000,shadow:4096,reflection:2048,reflectionFps:60,reflectionSamples:4,transmission:1,anisotropy:16,ao:true}),
 Object.freeze({id:'balanced',label:'Standard',description:'Textures adaptées · équilibre entre détail et fluidité',pixelRatio:2,pixels:3000000,shadow:2048,reflection:1024,reflectionFps:30,reflectionSamples:0,transmission:1,anisotropy:8,ao:false}),
 Object.freeze({id:'fluid',label:'Léger',description:'Textures légères · pour smartphone et petites configurations',pixelRatio:.8,pixels:500000,shadow:0,reflection:128,reflectionFps:6,reflectionSamples:0,transmission:.35,anisotropy:1,ao:false})
]);
export function renderPixelRatio(profile,width,height,deviceRatio=1){const budget=Math.sqrt(profile.pixels/Math.max(1,width*height));return Math.max(.1,Math.min(Math.max(deviceRatio,profile.supersampling||0),profile.pixelRatio,budget));}
export function profileSizes(profile,mobile=false,maxTextureSize=16384){return {shadow:Math.min(profile.shadow,mobile?(profile.ao?2048:1536):4096,maxTextureSize),reflection:Math.min(profile.reflection,mobile?(profile.ao?1024:512):2048,maxTextureSize)};}
export class AdaptiveQuality{
 constructor(){this.level=1;this.mode='auto';this.previous=null;this.samples=[];this.lastChange=0;this.lastEvaluation=0;this.frameMs=0;}
 get profile(){return QUALITY_PROFILES[this.level];}
 setMode(mode,now=0){if(!['auto','fluid','balanced','max'].includes(mode))return false;this.mode=mode;this.level=mode==='fluid'?2:mode==='max'?0:1;this.samples=[];this.previous=null;this.lastChange=now;return true;}
 pause(){this.previous=null;this.samples=[];}
 sample(now){if(this.previous===null){this.previous=now;return false;}const dt=now-this.previous;this.previous=now;if(dt<3||dt>1000)return false;this.samples.push(dt);if(this.samples.length>48)this.samples.shift();if(this.samples.length<12||now-this.lastEvaluation<900)return false;this.lastEvaluation=now;const sorted=[...this.samples].sort((a,b)=>a-b);this.frameMs=sorted[Math.floor(sorted.length*.75)];if(this.mode!=='auto')return false;
  if(this.frameMs>38&&this.level<2&&now-this.lastChange>1800){this.level++;this.changed(now);return true;}
  if(this.frameMs<19&&this.level>0&&this.samples.length===48&&now-this.lastChange>20000){this.level--;this.changed(now);return true;}return false;
 }
 changed(now){this.lastChange=now;this.samples=[];this.previous=null;}
}
export class ReflectionSchedule{
 constructor(){this.reset();}
 reset(){this.key=null;this.last=-Infinity;}
 shouldCapture(now,key,fps){if(key===this.key)return false;if(now-this.last<1000/fps)return false;this.key=key;this.last=now;return true;}
}
