export const CLIENT_SCHEMA_VERSION = 2;

const clean=(value,max=500)=>String(value??'').trim().slice(0,max);
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value,250));

export function normalizeDepartment(value,codePostal=''){
  let dep=clean(value,3).toUpperCase().replace(/\s/g,'');
  if(dep)return dep;
  const cp=clean(codePostal,5).replace(/\s/g,'');
  if(!/^\d{5}$/.test(cp))return'';
  if(cp.startsWith('97')||cp.startsWith('98'))return cp.slice(0,3);
  if(cp.startsWith('20'))return Number(cp)>=20200?'2B':'2A';
  return cp.slice(0,2);
}

export function normalizeClient(raw={},id=''){
  const emails=[];const emailSeen=new Set();
  const addEmail=value=>{const email=clean(value,250);const key=email.toLowerCase();if(!validEmail(email)||emailSeen.has(key))return;emailSeen.add(key);emails.push(email)};
  addEmail(raw.email||raw.eMail||raw.mail||raw.Email||raw.Mail);
  for(const value of Array.isArray(raw.emails)?raw.emails:[])addEmail(value);
  for(const value of Array.isArray(raw.emails_contact)?raw.emails_contact:[])addEmail(value);
  for(const person of Array.isArray(raw.interlocuteurs)?raw.interlocuteurs:[])addEmail(person?.email||person?.mail);
  for(const person of Array.isArray(raw.contacts)?raw.contacts:[])addEmail(typeof person==='string'?person:person?.email||person?.mail||person?.eMail);

  const phones=[];const phoneSeen=new Set();
  const addPhone=value=>{const phone=clean(value,50);const key=phone.replace(/[^0-9+]/g,'');if(!phone||phoneSeen.has(key))return;phoneSeen.add(key);phones.push(phone)};
  addPhone(raw.telephone||raw.tel||raw.Telephone||raw.phone);
  for(const value of Array.isArray(raw.telephones)?raw.telephones:[])addPhone(value);
  for(const person of Array.isArray(raw.interlocuteurs)?raw.interlocuteurs:[])addPhone(person?.telephone||person?.tel);

  const codePostal=clean(raw.codePostal||raw.code_postal||raw.cp||raw.postalCode,5);
  const rawType=clean(raw.type||raw.Type||'client',30);
  const typeNormalized=rawType.toLowerCase().includes('prospect')?'prospect':'client';
  const societe=clean(raw.societe||raw.nomSociete||raw.entreprise||raw.enseigne||raw.nom,250);

  return {
    ...raw,
    ...(id?{id}:{}),
    schemaVersion:Number(raw.schemaVersion||0)||1,
    societe,
    contact:clean(raw.contact||raw.nomContact,250),
    type:rawType||'client',
    typeNormalized,
    agent:clean(raw.agent||raw.secteur||raw.Agent,100),
    email:emails[0]||'',
    emails,
    telephone:phones[0]||'',
    telephones:phones,
    adresse:clean(raw.adresse||raw.address,500),
    codePostal,
    ville:clean(raw.ville||raw.city,150),
    departement:normalizeDepartment(raw.departement||raw.Dept||raw.department,codePostal),
    partenaires:Array.isArray(raw.partenaires)?[...new Set(raw.partenaires.map(v=>clean(v,100)).filter(Boolean))]:[]
  };
}

export function canonicalClientPatch(input={}){
  const normalized=normalizeClient(input);
  return {
    schemaVersion:CLIENT_SCHEMA_VERSION,
    societe:normalized.societe,
    contact:normalized.contact,
    type:normalized.type,
    typeNormalized:normalized.typeNormalized,
    agent:normalized.agent,
    telephone:normalized.telephone,
    telephones:normalized.telephones,
    email:normalized.email,
    emails:normalized.emails,
    adresse:normalized.adresse,
    codePostal:normalized.codePostal,
    ville:normalized.ville,
    departement:normalized.departement,
    partenaires:normalized.partenaires
  };
}
