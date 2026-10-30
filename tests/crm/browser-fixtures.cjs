/** Fictional-only browser integration fixtures. Every external request is fulfilled
 * locally or blocked; this harness cannot contact Firebase, mail, or production. */
const rows = {
  'fictional-client-a': { id: 'legacy-conflicting-id', societe: 'TEST — Atelier Démo', type: 'client', codeClient: 'LRF-00101', codesLRF: ['LRF-00088'], codePostal: '34000', ville: 'Montpellier', adresse: '1 rue Fictive', contact: 'Alice Test', email: 'alice@example.test', telephone: '0400000001', telephones: ['0400000001'], agent: 'Jérôme', latitude: 43.61, longitude: 3.88, partenaires: ['elios-ceramica'], contacts: [{ prenom: 'Alice', nom: 'Test', email: 'alice@example.test' }], documents: [], comptes_rendus: [{ date: '2026-10-20', author: 'Agent test', text: 'Historique fictif conservé : documents joints mentionnés dans le texte.' }], categorieActivite: 'carreleur' },
  'fictional-client-b': { societe: 'TEST — Atelier Démo', type: 'client', codeClient: 'LRF-00102', codePostal: '30000', ville: 'Nîmes', adresse: '2 rue Fictive', contact: 'Bruno Test', email: 'bruno@example.test', telephone: '0400000002', telephones: ['0400000002'], agent: 'Coryne', lat: 43.83, lng: 4.35, partenaires: [], contacts: [], documents: [], comptes_rendus: [] },
  'fictional-prospect-c': { societe: 'TEST — Prospect Azur', type: 'prospect', codeClient: 'LRF-00103', codePostal: '06000', ville: 'Nice', adresse: '3 rue Fictive', agent: 'Jérôme', latitude: 43.7, longitude: 7.26, partenaires: [], contacts: [], documents: [], comptes_rendus: [] },
  'fictional-no-location': { societe: 'TEST — Adresse sans coordonnées', type: 'prospect', codeClient: 'LRF-00104', codePostal: '13000', ville: 'Marseille', adresse: '4 rue Fictive', agent: 'Coryne', partenaires: [], contacts: [], documents: [], comptes_rendus: [] },
  'fictional-archived': { societe: 'TEST — Archive invisible', type: 'client', codeClient: 'LRF-00105', archived: true, codePostal: '34000', ville: 'Montpellier', latitude: 43.61, longitude: 3.88 },
};

function initializeFixture({ authMode = 'valid', authDelay = 80, seedRows = rows } = {}) {
  if (!location.protocol.startsWith('http')) return;
  const saved = sessionStorage.getItem('__crmOfflineStore');
  window.__crmTest = {
    store: saved ? JSON.parse(saved) : { clients: seedRows, crm_meta: { client_codes: { lastNumber: 105 } } },
    reads: JSON.parse(sessionStorage.getItem('__crmOfflineReads') || '[]'), writes: [], alerts: [], blocked: [], failedNext: false,
    delay: 100, authMode, authDelay, signedOut: 0, nextId: 1, runtimeErrors: [],
  };
  window.alert = message => window.__crmTest.alerts.push(String(message));
  window.confirm = () => false;
  window.addEventListener('error', event => window.__crmTest.runtimeErrors.push({message:event.message,filename:event.filename,line:event.lineno,column:event.colno}));
  // Never start automatic GPS requests in the test browser.
  Object.defineProperty(navigator, 'geolocation', { value: { watchPosition: () => 1, clearWatch: () => {}, getCurrentPosition: (_, reject) => reject?.({ code: 1, message: 'Offline fixture' }) } });
}

const appModule = `let apps=[];export const initializeApp=()=>{const app={name:'offline-fictional-only'};apps.push(app);return app};export const getApps=()=>apps;export const getApp=()=>apps[0];`;
const authModule = `
const state=window.__crmTest;
const user={uid:'fictional-agent',email:'jerome@leroyfactory.fr',getIdToken:async()=> 'fictional-token-never-sent'};
const auth={currentUser:null};
export const getAuth=()=>auth;
export const onAuthStateChanged=(_,cb)=>{const timer=setTimeout(()=>{auth.currentUser=state.authMode==='valid'?user:state.authMode==='foreign'?{...user,email:'unapproved@example.test'}:null;cb(auth.currentUser)},state.authDelay);return()=>clearTimeout(timer)};
export const signOut=async()=>{state.signedOut++;auth.currentUser=null};
export const signInWithEmailAndPassword=async()=>({user});
export const sendPasswordResetEmail=async()=>{};
export const setPersistence=async()=>{};
export const browserLocalPersistence={};
export const browserSessionPersistence={};
`;
const firestoreModule = `
const state=window.__crmTest;
const clone=v=>v===undefined?undefined:structuredClone(v);
const read=value=>{state.reads.push(value);sessionStorage.setItem('__crmOfflineReads',JSON.stringify(state.reads))};
const listeners=new Set();
const ref=(col,id)=>({col,id,path:id?col+'/'+id:col});
const documentSnapshot=r=>({id:r.id,ref:r,exists:()=>state.store[r.col]?.[r.id]!==undefined,data:()=>clone(state.store[r.col]?.[r.id])});
const snapshot=r=>{const docs=Object.entries(state.store[r.col]||{}).map(([id])=>documentSnapshot(ref(r.col,id)));return {docs,size:docs.length,empty:!docs.length,forEach:cb=>docs.forEach(cb)}};
const flush=()=>{sessionStorage.setItem('__crmOfflineStore',JSON.stringify(state.store));for(const x of listeners)queueMicrotask(()=>x.cb(snapshot(x.ref)))};
const apply=(op,r,data,options)=>{const group=state.store[r.col]||(state.store[r.col]={});group[r.id]=op==='update'||options?.merge?{...group[r.id],...clone(data)}:clone(data);state.writes.push({op,path:r.path,data:clone(data)});};
export const getFirestore=()=>({offline:true});
export function collection(db,col){return ref(col)}
export function doc(db,col,id){if(db?.col){return ref(db.col,col||'fictional-generated-'+state.nextId++)}return ref(col,id)}
export const getDoc=async r=>{read({op:'getDoc',path:r.path});return documentSnapshot(r)};
export const getDocs=async r=>{read({op:'getDocs',path:r.path});return snapshot(r)};
export const onSnapshot=(r,cb)=>{const entry={ref:r,cb};listeners.add(entry);read({op:'onSnapshot',path:r.path});queueMicrotask(()=>cb(snapshot(r)));return()=>listeners.delete(entry)};
export const updateDoc=async(r,data)=>{if(state.failedNext){state.failedNext=false;throw Error('Offline simulated save failure')}apply('update',r,data);flush()};
export const setDoc=async(r,data,options)=>{apply('set',r,data,options);flush()};
export const addDoc=async(r,data)=>{const d=doc(r);await setDoc(d,data);return d};
export const deleteDoc=async()=>{throw Error('Test forbids deletion')};
export const arrayUnion=(...v)=>v;
export const serverTimestamp=()=>new Date().toISOString();
export const query=r=>r;
export const where=(...v)=>v;
export const orderBy=(...v)=>v;
export const limit=(...v)=>v;
export const Timestamp={fromDate:d=>d};
let queue=Promise.resolve();
export const runTransaction=(db,fn)=>{const task=queue.then(async()=>{await new Promise(r=>setTimeout(r,state.delay));if(state.failedNext){state.failedNext=false;throw Error('Offline simulated save failure')}const pending=[];const tx={get:async r=>{read({op:'tx.get',path:r.path});return documentSnapshot(r)},set:(r,d,o)=>pending.push(['set',r,d,o]),update:(r,d)=>pending.push(['update',r,d])};const result=await fn(tx);for(const p of pending)apply(...p);if(pending.length)flush();return result});queue=task.catch(()=>{});return task};
`;

// Leaflet's network/geometry boundary is a deterministic local fake. This tests
// CRM filters, marker reuse, popup links and responsive controls, not map tiles.
const leafletScript = `
(()=>{const el=document.getElementById('map');el.style.background='#edf2ed';el.style.position='relative';el.innerHTML='<div style="padding:20px;color:#52645b">Carte de test hors ligne · données fictives</div>';
const all=[];const pos=x=>Array.isArray(x)?{lat:x[0],lng:x[1]}:x;
class Marker{constructor(ll,options={}){this.ll=pos(ll);this.options=options;all.push(this)}setLatLng(ll){this.ll=pos(ll);return this}setIcon(icon){this.options.icon=icon;return this}bindPopup(html){this.html=html;return this}getPopup(){return {getContent:()=>this.html}}getLatLng(){return this.ll}addTo(layer){layer.addLayer(this);return this}getElement(){return this.el}openPopup(){document.querySelector('.leaflet-popup')?.remove();const box=document.createElement('div');box.className='leaflet-popup';box.style='position:absolute;left:20px;top:80px;padding:14px;background:white;z-index:10;border:1px solid #ddd';box.innerHTML=this.html;el.appendChild(box);return this}remove(){this.map?.removeLayer(this)}}
class Map{constructor(){this.layers=new Set()}setView(){return this}fitBounds(){return this}invalidateSize(){return this}addLayer(x){this.layers.add(x);x.map=this;if(x instanceof Marker){x.el=document.createElement('button');x.el.className=x.options.icon?.options?.className||'';x.el.style='position:absolute;top:'+ (110+this.layers.size*35)+'px;left:'+ (50+this.layers.size*45)+'px;background:transparent;border:0';x.el.innerHTML=x.options.icon?.options?.html||'●';x.el.addEventListener('click',()=>x.openPopup());el.appendChild(x.el)}return this}removeLayer(x){this.layers.delete(x);x.el?.remove();x.map=null;return this}eachLayer(cb){this.layers.forEach(cb)}hasLayer(x){return this.layers.has(x)}on(){return this}getZoom(){return 10}}
class Group{constructor(){this.layers=new Set()}addTo(map){this.map=map;return this}hasLayer(x){return this.layers.has(x)}addLayer(x){this.layers.add(x);this.map?.addLayer(x);return this}removeLayer(x){this.layers.delete(x);this.map?.removeLayer(x);return this}remove(){this.layers.forEach(x=>this.map?.removeLayer(x))}}
window.L={map:()=>new Map(),Marker,marker:(ll,o)=>new Marker(ll,o),layerGroup:()=>new Group(),divIcon:options=>({options}),tileLayer:()=>({addTo:()=>{}}),latLngBounds:points=>({points,getNorthEast:()=>({equals:()=>false}),getSouthWest:()=>({}),getCenter:()=>({lat:43,lng:4})}),circle:()=>({addTo:()=>({setLatLng(){},setRadius(){}})})};window.__crmMarkers=all;})();
`;
module.exports = { rows, initializeFixture, appModule, authModule, firestoreModule, leafletScript };
