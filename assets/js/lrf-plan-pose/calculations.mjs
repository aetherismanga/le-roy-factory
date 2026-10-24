import {roomTransform} from './core.mjs?v=20261024-2';

export function restoreLayout(data,room,scale){
 const transform=roomTransform(room,scale),vertical=room.layout.rotation===90;
 return {...data,transform,gridPoint:p=>{const q=transform.to(p),{x,y}=data.origin;return vertical?[q[1]-y,-q[0]+x]:[q[0]-x,q[1]-y];}};
}

export class CalculationQueue{
 constructor({workerFactory=()=>new Worker(new URL('./calculation-worker.mjs',import.meta.url),{type:'module'}),onProgress=()=>{}}={}){
  this.workerFactory=workerFactory;this.onProgress=onProgress;this.jobs=new Map();this.queue=[];this.active=null;this.sequence=0;
 }
 request(key,signature,input){
  const old=this.jobs.get(key);if(old?.signature===signature)return old.promise;
  if(old)this.cancel(key);
  const job={key,signature,id:++this.sequence,input};
  job.promise=new Promise((resolve,reject)=>Object.assign(job,{resolve,reject}));job.promise.catch(()=>{});
  this.jobs.set(key,job);this.queue.push(job);this.drain();return job.promise;
 }
 cancel(key){
  const job=this.jobs.get(key);if(!job)return;
  this.jobs.delete(key);this.queue=this.queue.filter(j=>j!==job);
  if(this.active===job){job.worker?.terminate();clearTimeout(job.timer);this.active=null;}
  job.reject(Object.assign(Error('Calcul annulé.'),{name:'AbortError'}));this.drain();
 }
 clear(){for(const key of [...this.jobs.keys()])this.cancel(key);}
 drain(){
  if(this.active)return;const job=this.queue.shift();if(!job)return;
  this.active=job;
  const finish=(error,result)=>{
   if(this.active!==job)return;job.worker?.terminate();clearTimeout(job.timer);this.jobs.delete(job.key);this.active=null;
   error?job.reject(error):job.resolve(result);this.drain();
  };
  try{
   job.worker=this.workerFactory();job.worker.onmessage=event=>{
    const message=event.data;if(this.active!==job||message.id!==job.id)return;
    if(message.progress!==undefined){this.onProgress(job.key,message.progress);return;}
    finish(message.error?Error(message.error):null,message.result);
   };
   job.worker.onerror=()=>finish(Error('Le calcul en arrière-plan a été interrompu. Réessayez ou divisez le plan en pièces.'));
   job.timer=setTimeout(()=>finish(Error('Ce calcul prend trop de temps. Divisez le plan en pièces ou réessayez.')),120000);
   job.worker.postMessage({id:job.id,...job.input});
  }catch{finish(Error('Ce navigateur ne permet pas le calcul en arrière-plan. Utilisez un navigateur récent ou divisez le plan en pièces.'));}
 }
}
