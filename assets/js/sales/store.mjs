import { db, auth, getAgentProfile } from '../firebase.js';
import { collection,getDocs,doc,getDoc,runTransaction } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {validateBatch,digest,canonical,coverage,conflictIds,overlaps} from './core.mjs';
// Dedicated TEST namespace. Never write clients, existing statistics, or authentication.
const NS='lrf_sales_test_v1';
const ref=doc(db,NS,'workspace');
const empty=()=>({active:[],imports:{},mappings:{},revision:0});
function actor(){const p=getAgentProfile(auth.currentUser);if(!p)throw Error('Connexion agent requise');return p.email;}
export async function load(){
  actor();const [clients,snap]=await Promise.all([getDocs(collection(db,'clients')),getDoc(ref)]);
  const index=snap.exists()?snap.data():empty();
  const imports=await Promise.all(index.active.map(id=>getDoc(doc(db,NS+'_imports',id)).then(s=>{if(!s.exists())throw Error('Import introuvable : '+id);return {...s.data(),id:s.id};})));
  return {clients:clients.docs.map(d=>({...d.data(),id:d.id})),index,imports};
}
export async function prepare(batch){
  const rows=validateBatch(batch);const contentHash=await digest(canonical(rows));
  return {...batch,rows,contentHash,coverage:coverage(rows)};
}
export async function commit(batch,expectedRevision,replace=false){
  const email=actor(), prepared=await prepare(batch),id=crypto.randomUUID();
  return runTransaction(db,async tx=>{
    const snap=await tx.get(ref),index=snap.exists()?snap.data():empty();
    if(index.revision!==expectedRevision)throw Error('Les données ont changé. Actualisez et vérifiez à nouveau l’aperçu.');
    const duplicate=index.active.find(k=>index.imports[k].contentHash===prepared.contentHash || (prepared.fileHash&&index.imports[k].fileHash===prepared.fileHash));
    if(duplicate)throw Error('Ce document ou ces lignes sont déjà importés : aucun montant ajouté.');
    const conflicts=conflictIds(index,prepared);
    if(conflicts.length&&!replace)throw Error('Chevauchement détecté. Choisissez le remplacement contrôlé après vérification.');
    const now=new Date().toISOString();
    const meta={id,name:String(prepared.name||'Import').slice(0,180),contentHash:prepared.contentHash,fileHash:prepared.fileHash||'',coverage:prepared.coverage,createdAt:now,by:email,replaces:conflicts,count:prepared.rows.length};
    const next={...index,revision:index.revision+1,active:[...index.active.filter(k=>!conflicts.includes(k)),id],imports:{...index.imports,[id]:meta}};
    if(JSON.stringify(next).length>750000)throw Error('Historique volumineux : archivage nécessaire avant le prochain import.');
    tx.set(doc(db,NS+'_imports',id),{...meta,rows:prepared.rows,note:prepared.note||''});
    tx.set(doc(db,NS+'_events',crypto.randomUUID()),{type:'import',importId:id,by:email,at:now,replaces:conflicts});
    tx.set(ref,next);return id;
  });
}
export async function undo(id,revision){
 const email=actor();return runTransaction(db,async tx=>{
  const snap=await tx.get(ref),index=snap.data();if(index.revision!==revision)throw Error('Actualisez les données avant d’annuler.');
  if(!index.active.includes(id))throw Error('Cet import n’est plus actif.');
  const restore=index.imports[id].replaces||[],remaining=index.active.filter(k=>k!==id);
  if(restore.some(k=>remaining.some(j=>overlaps(index.imports[k].coverage,index.imports[j].coverage))))throw Error('Un import plus récent chevauche les données à restaurer. Annulez-le d’abord.');
  tx.set(ref,{...index,revision:index.revision+1,active:[...new Set([...remaining,...restore])]});
  tx.set(doc(db,NS+'_events',crypto.randomUUID()),{type:'undo',importId:id,restored:restore,by:email,at:new Date().toISOString()});
 });
}
export async function linkClient(key,clientKey,revision){
 const email=actor();return runTransaction(db,async tx=>{
  const snap=await tx.get(ref),index=snap.exists()?snap.data():empty();if(index.revision!==revision)throw Error('Actualisez avant de rapprocher ce client.');
  const old=index.mappings[key]||null;
  const value={clientKey,by:email,at:new Date().toISOString()};
  tx.set(ref,{...index,revision:index.revision+1,mappings:{...index.mappings,[key]:value}});
  tx.set(doc(db,NS+'_events',crypto.randomUUID()),{type:'mapping',key,before:old,after:value,by:email,at:value.at});
 });
}
