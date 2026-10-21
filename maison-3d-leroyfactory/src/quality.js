export const QUALITY={
 eco:{label:'Éco · petites configurations',ratio:1,pixels:850000,shadow:1024,mirror:192,mirrorDelay:650,mirrorDistance:3.5,lights:2,grass:2000,leaves:550,frame:40,ao:false,water:false},
 balanced:{label:'Équilibré · usage quotidien',ratio:1.35,pixels:1800000,shadow:2048,mirror:384,mirrorDelay:280,mirrorDistance:5,lights:4,grass:8000,leaves:1200,frame:30,ao:false,water:false},
 high:{label:'Haute qualité · PC puissant',ratio:1.8,pixels:3500000,shadow:4096,mirror:768,mirrorDelay:130,mirrorDistance:6,lights:6,grass:18000,leaves:2200,frame:30,ao:true,water:true},
};
const KEY='lrf-house-graphics-v1';
export function initialQuality(){try{const q=localStorage.getItem(KEY);if(QUALITY[q])return q;}catch{}return (navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)?'eco':'balanced';}
export function saveQuality(id){try{localStorage.setItem(KEY,id);}catch{}}
export function applySceneQuality(house,garden,id){
 const q=QUALITY[id];if(!q)throw Error('Réglage graphique inconnu.');
 for(const m of house.mirrors)m.mirror.getRenderTarget().setSize(q.mirror,q.mirror);
 garden.root.traverse(o=>{if(o.isInstancedMesh&&o.userData.qualityKind)o.count=Math.min(o.userData.fullCount,q[o.userData.qualityKind]);});
 return q;
}
