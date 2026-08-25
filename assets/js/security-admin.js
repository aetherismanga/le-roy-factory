import { authReady, agentProfile, authFetch } from './firebase.js';

const BASE='https://us-central1-le-roy-factory.cloudfunctions.net';
const output=document.getElementById('security-output');
const status=document.getElementById('security-status');
const buttons=[...document.querySelectorAll('[data-action]')];

function print(title,data){
  const text=typeof data==='string'?data:JSON.stringify(data,null,2);
  output.textContent=`${new Date().toLocaleString('fr-FR')} — ${title}\n\n${text}`;
}
function setBusy(value){buttons.forEach(button=>button.disabled=value)}
function setStatus(label,type=''){if(status)status.innerHTML=`<span class="security-pill ${type}">${label}</span>`}

async function call(name,body={}){
  const res=await authFetch(`${BASE}/${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.success){const error=new Error(data.error||`Erreur ${res.status}`);error.status=res.status;throw error}
  return data;
}

async function run(action){
  setBusy(true);
  try{
    if(action==='migrate-stats'){
      if(!confirm('Migrer maintenant les statistiques historiques vers Firestore privé ? Les fichiers publics ne seront pas supprimés.'))return;
      print('Migration statistiques','Opération en cours…');const data=await call('migrateLegacyStatistics');print('Migration statistiques terminée',data);return;
    }
    if(action==='migrate-tariffs'){
      if(!confirm('Copier maintenant les tarifs publics vers Firebase Storage privé ? Les sources publiques ne seront pas supprimées.'))return;
      print('Migration tarifs','Opération en cours…');const data=await call('migrateProTariffs');print('Migration tarifs terminée',data);return;
    }
    if(action==='preview-clients'){
      print('Prévisualisation Client V2','Analyse en cours…');const data=await call('migrateClientsV2',{apply:false,limit:500});print('Prévisualisation Client V2',data);return;
    }
    if(action==='apply-clients'){
      const preview=await call('migrateClientsV2',{apply:false,limit:500});print('Prévisualisation avant application',preview);
      if(!preview.changed){alert('Aucune fiche à migrer.');return}
      const phrase=prompt(`La prévisualisation indique ${preview.changed} fiche(s) à harmoniser sur ${preview.scanned}. Tapez exactement APPLIQUER V2 pour confirmer.`);
      if(phrase!=='APPLIQUER V2')return;
      const data=await call('migrateClientsV2',{apply:true,limit:500});print('Migration Client V2 appliquée',data);return;
    }
  }catch(error){console.error(error);print('ERREUR',error.message||String(error));if(error.status===401)location.replace('agent.html?next=security-admin.html')}
  finally{setBusy(false)}
}

const user=await authReady;const profile=agentProfile(user);
if(!user||!profile){location.replace('agent.html?next=security-admin.html')}
else if(profile.role!=='admin'){
  setStatus('⛔ Accès administrateur requis','bad');buttons.forEach(button=>button.disabled=true);print('Accès refusé','Cette page est réservée à l’administrateur LE ROY FACTORY.');
}else{
  setStatus(`✓ Administrateur authentifié : ${user.email}`,'ok');buttons.forEach(button=>button.addEventListener('click',()=>run(button.dataset.action)));
}
