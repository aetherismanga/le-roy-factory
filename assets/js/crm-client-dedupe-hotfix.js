import { db } from './firebase.js';
import { collection, getDocs, doc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const arr=v=>Array.isArray(v)?v:[];
const active=c=>c&&c.archived!==true&&c.archive!==true;
const phone=v=>clean(v).replace(/\D/g,'').replace(/^33/,'0');
const cp=c=>clean(c.codePostal||c.code_postal).replace(/\D/g,'');
const city=c=>norm(c.ville);
const company=c=>norm(c.societe||c.enseigne||c.nom);
const code=c=>clean(c.codeClient).toUpperCase();

function richness(c){
  let s=0;
  if(clean(c.telephone)||arr(c.telephones).length)s+=8;
  if(clean(c.adresse))s+=6;
  if(cp(c))s+=5;
  if(clean(c.ville))s+=5;
  if(clean(c.email)||arr(c.emails).length)s+=4;
  if(clean(c.contact))s+=3;
  s+=Math.min(8,arr(c.partenaires).length*2);
  s+=Math.min(8,arr(c.contacts).length*2);
  s+=Math.min(8,arr(c.comptes_rendus||c.comptesRendus).length);
  s+=Math.min(5,arr(c.documents).length);
  return s;
}
function uniquePrimitive(values,key=v=>clean(v)){
  const out=[],seen=new Set();
  for(const v of values){const k=key(v);if(k&&!seen.has(k)){seen.add(k);out.push(v)}}return out;
}
function uniqueObjects(values,keyFn){
  const out=[],seen=new Set();
  for(const v of values){if(!v||typeof v!=='object')continue;const k=keyFn(v)||JSON.stringify(v);if(!seen.has(k)){seen.add(k);out.push(v)}}return out;
}
const objKey=x=>clean(x.moovagoId)||clean(x.url)||`${clean(x.date)}|${norm(x.text||x.note||x.nom||x.name||'')}`||JSON.stringify(x);

function shouldMerge(a,b){
  if(!active(a)||!active(b)||a.id===b.id)return false;
  // Même code LRF = même fiche, même si le nom comporte de petites variantes.
  if(code(a)&&code(a)===code(b))return true;
  if(!company(a)||company(a)!==company(b))return false;
  const pa=cp(a),pb=cp(b),va=city(a),vb=city(b);
  const samePlace=(pa&&pb&&pa===pb)||(va&&vb&&va===vb);
  if(!samePlace)return false;
  const phonesA=uniquePrimitive([a.telephone,...arr(a.telephones)].map(phone).filter(Boolean));
  const phonesB=uniquePrimitive([b.telephone,...arr(b.telephones)].map(phone).filter(Boolean));
  if(phonesA.length&&phonesB.length&&phonesA.some(x=>phonesB.includes(x)))return true;
  // Autoriser le doublon typique : une fiche riche + une fiche quasi vide au même magasin.
  return Math.min(richness(a),richness(b))<=8;
}

function merged(group,canonical){
  const ranked=[...group].sort((a,b)=>richness(b)-richness(a));
  const pick=(...keys)=>{for(const r of ranked)for(const k of keys)if(clean(r[k]))return r[k];return ''};
  const phones=uniquePrimitive(group.flatMap(r=>[r.telephone,...arr(r.telephones)]).filter(Boolean),phone);
  const emails=uniquePrimitive(group.flatMap(r=>[r.email,...arr(r.emails)]).filter(Boolean),v=>clean(v).toLowerCase());
  const partenaires=uniquePrimitive(group.flatMap(r=>arr(r.partenaires)));
  const contacts=uniqueObjects(group.flatMap(r=>arr(r.contacts)),objKey);
  const cr=uniqueObjects(group.flatMap(r=>arr(r.comptes_rendus||r.comptesRendus)),objKey);
  const documents=uniqueObjects(group.flatMap(r=>arr(r.documents)),objKey);
  return {
    type: group.some(r=>norm(r.type)==='client')?'client':(pick('type')||'client'),
    societe:pick('societe','enseigne','nom'),
    adresse:pick('adresse','address'),
    codePostal:pick('codePostal','code_postal'),
    ville:pick('ville'),
    departement:pick('departement','Dept'),
    contact:pick('contact'),
    telephone:phones[0]||pick('telephone'),telephones:phones,
    email:emails[0]||pick('email'),emails,
    partenaires,contacts,comptes_rendus:cr,documents,
    notes:uniquePrimitive(group.map(r=>clean(r.notes)).filter(Boolean),norm).join('\n\n---\n'),
    codeClient:clean(canonical.codeClient)||pick('codeClient'),
    archived:false,archive:false,
    canonicalClientId:canonical.id,
    duplicateCleanupAt:new Date().toISOString()
  };
}

async function run(){
  try{
    const snap=await getDocs(collection(db,'clients'));
    const all=[];snap.forEach(d=>all.push({id:d.id,...d.data()}));
    const rows=all.filter(active);
    const seen=new Set();let groups=0,archived=0;
    for(const seed of rows){
      if(seen.has(seed.id))continue;
      const group=[seed];seen.add(seed.id);
      let changed=true;
      while(changed){changed=false;for(const candidate of rows){if(seen.has(candidate.id))continue;if(group.some(x=>shouldMerge(x,candidate))){group.push(candidate);seen.add(candidate.id);changed=true;}}}
      if(group.length<2)continue;
      const canonical=[...group].sort((a,b)=>richness(b)-richness(a))[0];
      const payload=merged(group,canonical);
      const aliases=group.filter(x=>x.id!==canonical.id);
      const batch=writeBatch(db);
      batch.set(doc(db,'clients',canonical.id),{...payload,duplicateAliasIds:uniquePrimitive([...(canonical.duplicateAliasIds||[]),...aliases.map(x=>x.id)])},{merge:true});
      for(const alias of aliases){
        batch.set(doc(db,'clients',alias.id),{
          archived:true,archive:true,duplicateOf:canonical.id,canonicalClientId:canonical.id,
          duplicateArchivedAt:new Date().toISOString(),duplicateReason:'doublon CRM fusionné automatiquement'
        },{merge:true});
      }
      await batch.commit();groups++;archived+=aliases.length;
    }
    console.info(`CRM doublons: ${groups} groupe(s) fusionné(s), ${archived} fiche(s) archivée(s).`);
    window.dispatchEvent(new CustomEvent('lrf-client-dedupe-complete',{detail:{groups,archived}}));
  }catch(e){console.error('Contrôle global doublons CRM',e)}
}

run();
