import {Box3} from 'three';
import {MeshBVH} from 'three-mesh-bvh';

export class PresentationBVHWorker{
 constructor({createWorker=url=>new Worker(url,{type:'module'}),url=new URL('randal-presentation-bvh.worker.js',document.baseURI),timeout=30000}={}){
  this.worker=createWorker(url);this.timeout=timeout;this.pending=null;this.serial=0;this.disposed=false;
  this.worker.onmessage=({data})=>{const pending=this.pending;if(!pending||data.id!==pending.id)return;if(data.error)this.finish(Error(data.error));else if(data.serialized){try{const bvh=MeshBVH.deserialize(data.serialized,pending.geometry,{setIndex:true});pending.geometry.boundingBox=bvh.getBoundingBox(new Box3());this.finish(null,bvh);}catch(error){this.finish(error);}}else pending.onProgress?.(data.progress);};
  this.worker.onerror=event=>this.finish(Error(event.message||'Calcul géométrique indisponible.'));
 }
 finish(error,value){const pending=this.pending;if(!pending)return;this.pending=null;clearTimeout(pending.timer);if(error)pending.reject(error);else pending.resolve(value);}
 generate(geometry,{onProgress,...options}={}){
  if(this.disposed)return Promise.reject(Error('Calcul géométrique fermé.'));if(this.pending)return Promise.reject(Error('Un calcul géométrique est déjà en cours.'));
  const position=geometry.attributes.position.array.slice(),index=geometry.index?.array.slice()||null,id=++this.serial;
  return new Promise((resolve,reject)=>{this.pending={id,geometry,onProgress,resolve,reject,timer:setTimeout(()=>{this.finish(Error('Le calcul géométrique a dépassé le délai disponible.'));this.worker.terminate();this.disposed=true;},this.timeout)};try{this.worker.postMessage({id,position,index,groups:geometry.groups,options},[position.buffer,...(index?[index.buffer]:[])]);}catch(error){this.finish(error);}});
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.finish(Error('Calcul géométrique fermé.'));this.worker.terminate();}
}
