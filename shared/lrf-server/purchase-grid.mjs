// Server-only confidential price storage. The decryption key is supplied by
// the deployment environment, never by a client, project or public asset.
import {createDecipheriv} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';

const MAX_BYTES=2*1024*1024;
const VARIANTS=new Set(['studio-one','randal-general']);
const forbidden=new Set(['__proto__','constructor','prototype']);
let cachedKey='',cache=new Map();

function bytes(value,length){
 if(typeof value!=='string'||value.length>MAX_BYTES*2||!value||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('Invalid encrypted grid');
 const result=Buffer.from(value,'base64');
 if(result.toString('base64')!==value||length&&result.length!==length)throw Error('Invalid encrypted grid');
 return result;
}

export function decodePurchaseGrid(envelope,keyHex,variant){
 if(!VARIANTS.has(variant)||typeof keyHex!=='string'||!/^[a-f0-9]{64}$/i.test(keyHex))throw Error('Purchase grid unavailable');
 if(!envelope||envelope.version!==1||envelope.algorithm!=='A256GCM'||envelope.variant!==variant)throw Error('Invalid encrypted grid');
 const cipher=bytes(envelope.ciphertext),iv=bytes(envelope.iv,12),tag=bytes(envelope.tag,16);
 if(cipher.length>MAX_BYTES)throw Error('Invalid encrypted grid');
 const decipher=createDecipheriv('aes-256-gcm',Buffer.from(keyHex,'hex'),iv);
 decipher.setAAD(Buffer.from('lrf-purchase-grid/v1/'+variant));decipher.setAuthTag(tag);
 const clear=Buffer.concat([decipher.update(cipher),decipher.final()]);
 if(clear.length>MAX_BYTES)throw Error('Invalid encrypted grid');
 const grid=JSON.parse(clear.toString('utf8'));
 if(!grid||!grid.prices||typeof grid.prices!=='object'||Array.isArray(grid.prices)||Object.keys(grid.prices).length>10000)throw Error('Invalid purchase grid');
 const prices=Object.create(null);
 for(const [reference,amount] of Object.entries(grid.prices)){
  if(!reference||reference.length>240||forbidden.has(reference)||!Number.isSafeInteger(amount)||amount<0||amount>100000000)throw Error('Invalid purchase grid');
  prices[reference]=amount;
 }
 return {prices,source:typeof grid.source==='string'?grid.source.slice(0,500):''};
}

export function readPurchaseGrid(url,variant){
 // A missing or invalid key must not take down login or the public quote.
 // Never log keys, plaintext, file content or decryption errors.
 const key=process.env.LRF_PURCHASE_GRID_KEY||'';
 if(key!==cachedKey){cachedKey=key;cache.clear();}
 if(!key)return null;
 const id=String(url)+'|'+variant;
 if(cache.has(id))return cache.get(id);
 try{
  if(statSync(url).size>MAX_BYTES*2)throw Error('Grid unavailable');
  const grid=decodePurchaseGrid(JSON.parse(readFileSync(url,'utf8')),key,variant);
  cache.set(id,grid);return grid;
 }catch{return null;}
}
