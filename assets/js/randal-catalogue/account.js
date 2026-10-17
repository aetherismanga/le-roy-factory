/* Lecture du contrat de session PRO existant, sans charger les extensions tarifaires ou analytiques des autres pages. */
(()=>{'use strict';
const KEY='lrfProSession',BACKUP='lrfProSession1h',MAX_AGE=12*60*60*1000,ADMINS=['jerome@leroyfactory.fr','coryne@leroyfactory.fr'];let restoring;
const parse=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}};
function token(){try{return sessionStorage.getItem('lrfProSessionToken')||localStorage.getItem('lrfProRememberToken')||''}catch{return ''}}
function valid(s){if(!s||!Number.isFinite(Number(s.verifiedAt))||Date.now()-Number(s.verifiedAt)>=MAX_AGE)return null;if(s.isAdmin||s.admin)return ADMINS.includes(String(s.email||'').toLowerCase())?s:null;if(!/^LRF-\d{5}$/.test(s.codeClient||'')||s.codeClient==='LRF-00001'||!s.departement||!(s.sessionToken||token()))return null;return s}
function read(){return valid(parse(KEY))||valid(parse(BACKUP))}
async function restore(){if(read())return read();const value=token();if(!value)return null;if(restoring)return restoring;restoring=(async()=>{try{const r=await fetch('https://us-central1-le-roy-factory.cloudfunctions.net/validateProSession',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionToken:value})});if(!r.ok)return null;const d=await r.json();if(!d?.success||!d.client)return null;const s={codeClient:d.client.codeClient,clientId:d.client.id,societe:d.client.societe,departement:d.client.departement,partenaires:d.client.partenaires||[],sessionToken:value,verifiedAt:Date.now()};if(!valid(s))return null;sessionStorage.setItem(KEY,JSON.stringify(s));sessionStorage.setItem(BACKUP,JSON.stringify(s));window.dispatchEvent(new CustomEvent('lrf-pro-session-changed',{detail:s}));return s}catch{return null}finally{restoring=null}})();return restoring}
window.RandalCatalogueAccount={read,restore};window.addEventListener('focus',()=>{window.dispatchEvent(new CustomEvent('lrf-pro-session-changed'));restore()});restore();
})();
