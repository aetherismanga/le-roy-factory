import {randomBytes,verify} from 'node:crypto';
export const REGISTRY='https://us-central1-le-roy-factory.cloudfunctions.net/unrealHostRegistry';
export function validOrigin(origin){
 try{const u=new URL(origin);return u.origin===origin&&u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&/^[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/.test(u.hostname);}catch{return false;}
}
export function leaseMessage(d){return Buffer.from(`LRF-UNREAL-LEASE-1\n${d.host}\n${d.origin}\n${d.issuedAt}\n${d.expiresAt}\n${d.nonce}\n`);}
export function proofMessage(origin,challenge){return Buffer.from(`LRF-UNREAL-PROOF-1\n${origin}\n${challenge}\n`);}
export function validLease(d,key,now=Date.now()){
 if(!d||d.host!==key.host||!validOrigin(d.origin)||!Number.isSafeInteger(d.issuedAt)||!Number.isSafeInteger(d.expiresAt)||d.issuedAt>now+30000||d.issuedAt<now-180000||d.expiresAt<=now||d.expiresAt>d.issuedAt+180000||d.expiresAt<=d.issuedAt||!/^[0-9a-f]{32}$/.test(d.nonce)||!/^[A-Za-z0-9+/]{86}==$/.test(d.signature||''))return false;
 try{return verify(null,leaseMessage(d),key.publicKey,Buffer.from(d.signature,'base64'));}catch{return false;}
}
export async function verifyLiveHost(origin,key,request=fetch){
 if(!validOrigin(origin))throw Error('Invalid host origin');
 const challenge=randomBytes(32).toString('hex');
 const response=await request(`${origin}/hosting-proof?challenge=${challenge}`,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});
 const proof=await response.json();
 if(!response.ok||proof.origin!==origin||proof.challenge!==challenge||!verify(null,proofMessage(origin,challenge),key.publicKey,Buffer.from(proof.signature||'','base64')))throw Error('Host identity not verified');
 return origin;
}
export async function resolveGateway(key,request=fetch){
 const response=await request(REGISTRY,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});
 const record=await response.json();
 if(!response.ok||!validLease(record,key))throw Error('Host offline');
 return verifyLiveHost(record.origin,key,request);
}
