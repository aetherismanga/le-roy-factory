// Ready-made straight partitions; all dimensions are centimetres.
export const PARTITION_PRESETS=[
 {id:'full',name:'Cloison standard',description:'Épaisseur 8 cm · largeur 120 cm · hauteur du mur',fullHeight:true},
 {id:'low',name:'Cloison basse · 120 × 120 cm',description:'Épaisseur 8 cm · profilés chrome inclus',fullHeight:false}
];
export function partitionCandidates(config,presetId,wallIndex=0){
 const preset=PARTITION_PRESETS.find(p=>p.id===presetId);if(!preset)throw Error('Modèle de cloison inconnu.');
 const points=config.points,index=wallIndex<points.length?wallIndex:0,a=points[index],b=points[(index+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),sign=Math.sign(points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-q[0]*p[1];},0)),normal=[-dy/length*sign,dx/length*sign],tangent=[dx/length,dy/length],id='p-'+crypto.randomUUID();
 const result=[];
 const add=(start,vector)=>{const p={id,a:start.map(Math.round),b:start.map((v,i)=>Math.round(v+vector[i]*120)),thickness:8,height:preset.fullHeight?config.height:120,fullHeight:preset.fullHeight,positionUnlocked:true,profileEdges:preset.fullHeight?{}:{a:'Argent',b:'Argent',top:'Argent'}};result.push({...JSON.parse(JSON.stringify(config)),partitions:[...(config.partitions||[]),p]});};
 // Try attached to the chosen wall first, then other free positions.
 for(const fraction of [.5,.25,.75,.15,.85])add(a.map((v,i)=>v+tangent[i]*length*fraction),normal);
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 for(const fy of [.5,.25,.75])for(const fx of [.5,.25,.75])for(const vector of [[0,1],[1,0]])add([minX+(maxX-minX)*fx-vector[0]*60,minY+(maxY-minY)*fy-vector[1]*60],vector);
 return result;
}
