import {tileLayout,quantity} from './core.mjs?v=20261024-2';

// The UI keeps its small synchronous budget. Larger exact calculations run here,
// in a disposable worker, and never publish partial ordering quantities.
export function calculateExact({room,scale,loss},onProgress=()=>{}){
 const layout=tileLayout(room,scale,{limit:250000,onProgress});
 if(layout.error)throw Error(layout.code==='layout-budget'?'Ce plan dépasse 250 000 emplacements. Divisez-le en pièces pour calculer chaque zone exactement.':layout.error);
 const q=quantity(room,scale,loss,layout);
 if(q.error)throw Error(q.error);
 const {transform,gridPoint,...data}=layout;
 return {layout:data,q};
}

if(typeof self!=='undefined'&&typeof self.postMessage==='function')self.onmessage=event=>{
 const {id,...input}=event.data;let previous=-1;
 try{
  const result=calculateExact(input,progress=>{const percent=Math.floor(progress*100);if(percent!==previous){previous=percent;self.postMessage({id,progress:percent});}});
  self.postMessage({id,result});
 }catch(error){self.postMessage({id,error:error.message||'Calcul interrompu. Réessayez.'});}
};
