// One queue for both material and furniture textures. Individual failures free
// their slot; higher-quality exports use the same untouched original URLs.
const pending=[];let active=0;const concurrency=3;
function pump(){while(active<concurrency&&pending.length){const item=pending.shift();active++;Promise.resolve().then(item.task).then(item.resolve,item.reject).finally(()=>{active--;pump();});}}
export function runTextureTask(task){return new Promise((resolve,reject)=>{pending.push({task,resolve,reject});pump();});}
export function textureQueueState(){return {active,pending:pending.length,concurrency};}
