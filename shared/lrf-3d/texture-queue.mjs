// One queue for both material and furniture textures. Individual failures free
// their slot; higher-quality exports use the same untouched original URLs.
const pending=[];let active=0;const concurrency=3;
export function textureAbortError(signal){return signal?.reason instanceof Error?signal.reason:Object.assign(Error('Chargement de matière remplacé.'),{name:'AbortError'});}
function pump(){while(active<concurrency&&pending.length){const item=pending.shift();item.signal?.removeEventListener('abort',item.cancel);active++;const finish=(callback,value)=>{active--;pump();callback(value);};Promise.resolve().then(()=>{if(item.signal?.aborted)throw textureAbortError(item.signal);return item.task();}).then(value=>finish(item.resolve,value),error=>finish(item.reject,error));}}
// A cancelled choice must leave the waiting list immediately, rather than
// downloading every face of each intermediate colour selected on a phone.
export function runTextureTask(task,{signal}={}){return new Promise((resolve,reject)=>{if(signal?.aborted){reject(textureAbortError(signal));return;}const item={task,resolve,reject,signal,cancel:null};item.cancel=()=>{const index=pending.indexOf(item);if(index<0)return;pending.splice(index,1);signal.removeEventListener('abort',item.cancel);reject(textureAbortError(signal));};signal?.addEventListener('abort',item.cancel,{once:true});pending.push(item);pump();});}
export function textureQueueState(){return {active,pending:pending.length,concurrency};}
