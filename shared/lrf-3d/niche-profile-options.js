import {METAL_FINISHES} from './taps.js';

export const NICHE_PROFILE_EDGES=Object.freeze(['left','right','top','bottom']);
export const NICHE_LEGACY_PROFILE_FINISHES=Object.freeze(['Argent','Noir','Doré','Bronze']);
export const NICHE_PROFILE_FINISHES=Object.freeze([...METAL_FINISHES.map(finish=>finish.id),...NICHE_LEGACY_PROFILE_FINISHES]);
export const isNicheProfileFinish=finish=>NICHE_PROFILE_FINISHES.includes(finish);
export const nicheMetalFinish=finish=>METAL_FINISHES.some(value=>value.id===finish)?finish:'Chrome brillant';

const hasProfileChoices=niche=>!!niche&&(niche.profileEnabled!==undefined||niche.profileFinish!==undefined||Object.keys(niche.profileEdges||{}).length>0);

// Older clicked-edge choices lived in the project's global overrides. Match the
// same stable geometry key as buildProfiles; unrelated/stale overrides do not
// turn an untouched niche into a deliberately configured one.
export function nicheProfileOverrideEdges(niche,settings={}){
 if(!niche)return {};
 const l=(niche.u-niche.width/2)/100,r=(niche.u+niche.width/2)/100,b=niche.bottom/100,t=(niche.bottom+niche.height)/100;
 const segments={left:[[l,b,0],[l,t,0]],right:[[r,b,0],[r,t,0]],bottom:[[l,b,0],[r,b,0]],top:[[l,t,0],[r,t,0]]},choices={};
 for(const [edge,points]of Object.entries(segments)){
  const id='niche-'+niche.id+'|niche_'+edge+'|'+points.map(point=>point.map(value=>value.toFixed(3)).join(',')).join('|'),override=settings?.overrides?.[id];
  if(!override||typeof override!=='object')continue;
  if(override.enabled!==undefined||override.color!==undefined)choices[edge]=override.enabled===true?(isNicheProfileFinish(override.color)?override.color:isNicheProfileFinish(settings.color)?settings.color:'Argent'):'none';
 }
 return choices;
}
export function nicheNeedsProfileDefaults(niche,settings={}){
 return !hasProfileChoices(niche)&&Object.keys(nicheProfileOverrideEdges(niche,settings)).length===0;
}

// Apply defaults only at an explicit validation. Callers may prepare a separate
// editor draft, but restoring or merely opening a project never changes it.
export function withDefaultNicheProfiles(niche,finish='Chrome brillant',prior=null,settings={}){
 if(hasProfileChoices(niche))return niche;
 if(hasProfileChoices(prior)){
  const saved=Object.fromEntries(['profileEnabled','profileFinish','profileEdges'].filter(key=>prior[key]!==undefined).map(key=>[key,key==='profileEdges'?{...prior[key]}:prior[key]]));
  return {...niche,...saved};
 }
 const overrideEdges=nicheProfileOverrideEdges(prior||niche,settings),profileFinish=nicheMetalFinish(finish);
 if(Object.keys(overrideEdges).length){
  const profileEdges=Object.fromEntries(NICHE_PROFILE_EDGES.map(edge=>[edge,overrideEdges[edge]||'none']));
  return {...niche,profileEnabled:Object.values(profileEdges).some(color=>color!=='none'),profileFinish,profileEdges};
 }
 return {...niche,profileEnabled:true,profileFinish,profileEdges:Object.fromEntries(NICHE_PROFILE_EDGES.map(edge=>[edge,profileFinish]))};
}

// Legacy niches keep their individual edge choices and old override fallback.
// New explicit on/off always wins over an older global profile override.
export function nicheProfileEdges(niche){
 if(niche.profileEnabled===false)return Object.fromEntries(NICHE_PROFILE_EDGES.map(edge=>[edge,'none']));
 if(niche.profileEnabled===true){const finish=isNicheProfileFinish(niche.profileFinish)?niche.profileFinish:'Chrome brillant';return Object.fromEntries(NICHE_PROFILE_EDGES.map(edge=>[edge,niche.profileEdges?.[edge]??finish]));}
 return {...niche.profileEdges};
}

export function nicheProfilesEnabled(niche){
 return niche.profileEnabled??Object.values(niche.profileEdges||{}).some(finish=>finish&&finish!=='none');
}

// Editor state is transient and deliberately absent from exported project data.
export function nicheGuideIsVisible(nicheId,{active=false,preview=false,editingId=null,enabled=true,hidden=false}={}){
 return !hidden&&enabled&&(preview?active:!!editingId&&nicheId===editingId);
}
