/** TEST ONLY. Firebase-compatible local adapter. Contains no Firebase SDK or credentials. */
const root = typeof window === 'undefined' ? globalThis : window;
const STORE_KEY = 'lrf:crm-v2:fictional-store:v1';
const ACTOR_KEY = 'lrf:crm-v2:fictional-actor:v1';
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const today = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export function createFixtureStore() {
  const make = (name, code, town, postal, agent, partners, latitude, longitude, extra={}) => ({ societe:name, codeClient:code, type:'client', ville:town, codePostal:postal, adresse:'1 avenue de démonstration', agent, partenaires:partners, latitude, longitude, telephone:'0400000000', telephones:['0400000000'], email:'contact@example.test', contact:'Camille Démo', contacts:[{prenom:'Camille',nom:'Démo',email:'contact@example.test',telephone:'0400000000'}], documents:[], comptes_rendus:[], categorieActivite:'negoce', ...extra });
  return { clients: {
    'demo-client-montpellier': make('DÉMO · Céramique Méditerranée','LRF-00101','Montpellier','34000','Jérôme',['elios-ceramica','view-ceramica','randal-pro'],43.611,3.877,{comptes_rendus:[{id:'demo-cr-1',date:today(-2),author:'Jérôme',text:'Visite de démonstration. Présentation des nouveautés et préparation du prochain rendez-vous.',type:'Visite'}],prochaineRelance:today(),dateRelance:today()}),
    'demo-client-nimes': make('DÉMO · Maison des Matières','LRF-00102','Nîmes','30000','Coryne',['la-fenice','biopietra'],43.837,4.36,{comptes_rendus:[{id:'demo-cr-2',date:today(-70),author:'Coryne',text:'Échange de démonstration : prévoir un suivi commercial.',type:'Appel'}]}),
    'demo-client-aubagne': make('DÉMO · Atelier Provence','LRF-00103','Aubagne','13400','Jérôme',['randal-pro','neobath'],43.292,5.572,{comptes_rendus:[{id:'demo-cr-3',date:today(-3),author:'Jérôme',text:'Compte-rendu fictif à compléter.',type:'Visite',statut:'brouillon',status:'draft'}]}),
    'demo-client-beziers': make('DÉMO · Espace Habitat','LRF-00104','Béziers','34500','Coryne',['elios-ceramica','la-fenice'],43.344,3.215,{comptes_rendus:[{date:today(-6),author:'Coryne',text:'Envoi d’échantillons simulé.',type:'Suivi'}]}),
    'demo-prospect-nice': make('DÉMO · Projet Azur','LRF-00105','Nice','06000','Jérôme',['view-ceramica'],43.704,7.262,{type:'prospect'}),
    'demo-prospect-avignon': make('DÉMO · Matières & Design','LRF-00106','Avignon','84000','Coryne',[],43.95,4.806,{type:'prospect'}),
    'demo-archive': make('DÉMO · Archive conservée','LRF-00107','Montpellier','34000','Jérôme',[],43.6,3.8,{archived:true}),
  }, crm_meta:{client_codes:{lastNumber:107}}, tournees:{'demo-tour-1':{date:today(1),departement:'34',startTime:'09:00',agent:'Jérôme',owner:'jerome@leroyfactory.fr',createdBy:'jerome@leroyfactory.fr',partners:['Elios Ceramica','Randal Pro'],stops:[{clientId:'demo-client-montpellier',societe:'DÉMO · Céramique Méditerranée',ville:'Montpellier',arrival:'09:00',latitude:43.611,longitude:3.877},{clientId:'demo-client-beziers',societe:'DÉMO · Espace Habitat',ville:'Béziers',arrival:'11:00',latitude:43.344,longitude:3.215}],metrics:{distanceMeters:77000,driveSeconds:3900}}}, agenda_events:{'demo-event-1':{title:'DÉMO · Présentation nouveautés',titre:'DÉMO · Présentation nouveautés',start:`${today()}T10:00:00`,end:`${today()}T11:00:00`,date:today(),heure:'10:00',agent:'Jérôme',ownerKey:'jerome',ownerName:'Jérôme',ownerEmail:'jerome@leroyfactory.fr',clientId:'demo-client-montpellier'}}, account_requests:{'demo-request-1':{societe:'DÉMO · Nouveau projet',ville:'Nîmes',departement:'30',status:'pending',statut:'en_attente',requestType:'ouverture',email:'prospect@example.test',createdAt:new Date().toISOString()}}, mail_history:{}, documents_clients:{} };
}
function safeRead(key) { try { return root.localStorage?.getItem(key); } catch { return null; } }
function safeWrite(key,value) { if(!root.localStorage)return; root.localStorage.setItem(key,value); }
function initRuntime() {
  let store; try { store=JSON.parse(safeRead(STORE_KEY)); } catch {}
  if (!store || !store.clients) store=createFixtureStore();
  const actor=safeRead(ACTOR_KEY)==='coryne'?'coryne':'jerome';
  return {store,listeners:new Set(),actor,writes:[],queue:Promise.resolve(),authListeners:new Set()};
}
const runtime=root.__LRF_CRM_PREVIEW_RUNTIME__ ||= initRuntime();
export const previewRuntime=runtime;
export const db=Object.freeze({fictional:true});
function actorUser(actor){return {uid:`fictional-${actor}`,email:`${actor}@leroyfactory.fr`,displayName:actor==='coryne'?'Coryne':'Jérôme',getIdToken:async()=>{throw new Error('Version test : aucun jeton réel disponible.');}};}
export const auth=runtime.auth ||= {currentUser:actorUser(runtime.actor)};
export function selectPreviewActor(actor){if(!['jerome','coryne'].includes(actor))throw Error('Compte de démonstration inconnu');runtime.actor=actor;safeWrite(ACTOR_KEY,actor);auth.currentUser=actorUser(actor);runtime.authListeners.forEach(cb=>cb(auth.currentUser));return auth.currentUser;}
export function getAgentProfile(user=auth.currentUser){if(!user?.uid?.startsWith('fictional-'))return null;return {uid:user.uid,email:user.email,name:user.displayName,displayName:user.displayName,fictional:true};}
export const waitForAgent=async()=>getAgentProfile();
export const waitForAgentAuth=waitForAgent;
export const getAuth=()=>auth;
export const getFirestore=()=>db;
export const getStorage=()=>({fictional:true});
export const initializeApp=()=>({name:'CRM V2 — TEST LOCAL'});
export const getApps=()=>[{name:'CRM V2 — TEST LOCAL'}];
export const getApp=()=>getApps()[0];
export function onAuthStateChanged(_,cb){runtime.authListeners.add(cb);queueMicrotask(()=>cb(auth.currentUser));return()=>runtime.authListeners.delete(cb);}
export async function signOut(){auth.currentUser=null;runtime.authListeners.forEach(cb=>cb(null));}
export async function signInWithEmailAndPassword(_,email){const actor=String(email).split('@')[0];if(!['jerome','coryne'].includes(actor))throw Error('Utilisez les comptes fictifs Jérôme ou Coryne.');return {user:selectPreviewActor(actor)};}
export const sendPasswordResetEmail=async()=>{throw Error('Version test : aucun e-mail envoyé.');};
export const setPersistence=async()=>{};
export const browserLocalPersistence={};
export const browserSessionPersistence={};
const ref=(col,id)=>({col,id,path:id?`${col}/${id}`:col});
export function collection(parent,...segments){const base=parent?.path?parent.path+'/':'';return ref(base+segments.join('/'));}
export function doc(parent,...segments){if(parent?.col && !parent.id)return ref(parent.col,segments[0]||`fictional-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);const path=[parent?.path,...segments].filter(Boolean).join('/');const parts=path.split('/');return ref(parts.slice(0,-1).join('/'),parts.at(-1));}
const dataAt=(r,store=runtime.store)=>store[r.col]?.[r.id];
const snapDoc=(r,store=runtime.store)=>({id:r.id,ref:r,exists:()=>dataAt(r,store)!==undefined,data:()=>clone(dataAt(r,store)),get:key=>clone(dataAt(r,store)?.[key])});
const field=(o,k)=>String(k).split('.').reduce((v,key)=>v?.[key],o);
function matches(data,c){const v=field(data,c.field);switch(c.op){case '==':return v===c.value;case '!=':return v!==c.value;case 'array-contains':return Array.isArray(v)&&v.includes(c.value);case 'in':return c.value.includes(v);case '>':return v>c.value;case '>=':return v>=c.value;case '<':return v<c.value;case '<=':return v<=c.value;default:return true;}}
function snapshot(r){if(r.id)return snapDoc(r);let docs=Object.keys(runtime.store[r.col]||{}).map(id=>snapDoc(ref(r.col,id)));for(const c of r.constraints||[]){if(c.kind==='where')docs=docs.filter(d=>matches(d.data(),c));if(c.kind==='order')docs.sort((a,b)=>String(a.get(c.field)||'').localeCompare(String(b.get(c.field)||''))*(c.direction==='desc'?-1:1));if(c.kind==='limit')docs=docs.slice(0,c.value);}return {docs,size:docs.length,empty:!docs.length,forEach:cb=>docs.forEach(cb),docChanges:()=>docs.map(d=>({type:'added',doc:d}))};}
export const query=(r,...constraints)=>({...r,constraints:[...(r.constraints||[]),...constraints]});
export const where=(name,op,value)=>({kind:'where',field:name,op,value});
export const orderBy=(name,direction='asc')=>({kind:'order',field:name,direction});
export const limit=value=>({kind:'limit',value});
export const startAfter=()=>({kind:'cursor'});
export const getDoc=async r=>snapDoc(r);
export const getDocs=async r=>snapshot(r);
export function onSnapshot(r,cb){const entry={r,cb};runtime.listeners.add(entry);queueMicrotask(()=>cb(snapshot(r)));return()=>runtime.listeners.delete(entry);}
export const serverTimestamp=()=>new Date().toISOString();
export const arrayUnion=(...values)=>({__localTransform:'union',values});
export const arrayRemove=(...values)=>({__localTransform:'remove',values});
export const increment=value=>({__localTransform:'increment',value});
export const deleteField=()=>({__localTransform:'delete'});
function apply(store,op,r,data,options){if(!r.id)throw Error('Identifiant fictif manquant');const group=store[r.col] ||= {};if(op==='delete'){delete group[r.id];return;}if(op==='update'&&!group[r.id])throw Error('La fiche de test est introuvable.');const result=op==='update'||options?.merge?clone(group[r.id]||{}):{};for(const [key,value]of Object.entries(data||{})){const parts=key.split('.'),last=parts.pop();let target=result;for(const p of parts)target=target[p] ||= {};const previous=target[last];if(value?.__localTransform==='union')target[last]=[...(Array.isArray(previous)?previous:[]),...value.values.filter(x=>!(previous||[]).some(y=>JSON.stringify(y)===JSON.stringify(x)))];else if(value?.__localTransform==='remove')target[last]=(previous||[]).filter(x=>!value.values.some(y=>JSON.stringify(y)===JSON.stringify(x)));else if(value?.__localTransform==='increment')target[last]=(Number(previous)||0)+value.value;else if(value?.__localTransform==='delete')delete target[last];else target[last]=clone(value);}group[r.id]=result;}
function commit(operations){const candidate=clone(runtime.store);operations.forEach(x=>apply(candidate,...x));safeWrite(STORE_KEY,JSON.stringify(candidate));runtime.store=candidate;runtime.writes.push(...operations.map(([op,r])=>({op,path:r.path})));runtime.listeners.forEach(x=>queueMicrotask(()=>x.cb(snapshot(x.r))));}
export async function setDoc(r,data,options){commit([['set',r,data,options]]);}
export async function updateDoc(r,data){commit([['update',r,data]]);}
export async function deleteDoc(r){commit([['delete',r]]);}
export async function addDoc(r,data){const d=doc(r);await setDoc(d,data);return d;}
export function runTransaction(_,callback){const task=runtime.queue.then(async()=>{const pending=[];const transaction={get:async r=>snapDoc(r),set:(r,d,o)=>pending.push(['set',r,d,o]),update:(r,d)=>pending.push(['update',r,d]),delete:r=>pending.push(['delete',r])};const result=await callback(transaction);if(pending.length)commit(pending);return result;});runtime.queue=task.catch(()=>{});return task;}
export function writeBatch(){const pending=[];return {set:(r,d,o)=>pending.push(['set',r,d,o]),update:(r,d)=>pending.push(['update',r,d]),delete:r=>pending.push(['delete',r]),commit:async()=>commit(pending)};}
export const Timestamp={fromDate:d=>d.toISOString(),now:()=>new Date().toISOString(),fromMillis:n=>new Date(n).toISOString()};
export const refStorage=()=>({fictional:true});
export const uploadBytes=async()=>{throw Error('Version test : téléversement distant désactivé.');};
export const uploadBytesResumable=()=>{throw Error('Version test : téléversement distant désactivé.');};
export const getDownloadURL=async()=>{throw Error('Version test : téléchargement distant désactivé.');};
export const deleteObject=async()=>{throw Error('Version test : suppression distante désactivée.');};

export {refStorage as ref};
