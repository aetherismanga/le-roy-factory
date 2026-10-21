// Compare business data, independently of JSON key order and transport metadata.
function ordered(value) {
 if(Array.isArray(value))return value.map(ordered);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,ordered(value[k])]));
 return value;
}
export async function projectSignature(record) {
 const data=JSON.stringify(ordered({title:record.title,customer:record.customer||{},data:record.data}));
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data));
 return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
export async function reconcileProject(local,remote,ownerKey) {
 if(local?.status==='validated'&&remote.status!=='validated'||(local?.revision||0)>(remote.revision||0))return local;
 const clean={...remote,thumbnail:remote.thumbnail||local?.thumbnail||null,remote:true,dirty:false,ownerKey};delete clean.pendingSync;delete clean.conflict;delete clean.serverCopy;
 if(!local?.dirty||remote.status!=='draft')return clean;
 const remoteSignature=await projectSignature(remote),same=await projectSignature(local)===remoteSignature;
 // A keepalive save may finish after the old page has gone away. Its receipt
 // belongs to this draft, so acknowledging it must not manufacture a conflict.
 const ownReceipt=local.pendingSync?.signature===remoteSignature;
 if(same)return clean;
 if(ownReceipt)return {...clean,data:local.data,title:local.title,customer:local.customer,date:local.date,updatedAt:local.updatedAt,dirty:true};
 if((local.revision||0)===(remote.revision||0))return {...local,remote:true,ownerKey,conflict:false};
 return {...local,remote:true,ownerKey,conflict:true,serverCopy:remote};
}
