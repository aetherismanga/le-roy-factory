import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const SEND_URL='https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail';
const originalFetch=window.fetch.bind(window);

function selectedClientIds(){
  const ids=new Set();
  document.querySelectorAll('#recipients-tbody .contact-checkbox:checked').forEach(cb=>{
    const key=cb.dataset.key||'';
    const id=key.split('|')[0];
    if(id)ids.add(id);
  });
  return [...ids];
}

// Ajoute les IDs clients aux envois immédiats sans modifier l'interface existante.
window.fetch=async function(input,init={}){
  const url=typeof input==='string'?input:(input?.url||'');
  if(url===SEND_URL&&String(init?.method||'GET').toUpperCase()==='POST'&&init?.body){
    try{
      const payload=JSON.parse(init.body);
      if(!Array.isArray(payload.clientIds)||!payload.clientIds.length)payload.clientIds=selectedClientIds();
      init={...init,body:JSON.stringify(payload)};
    }catch(e){console.warn('Ajout clientIds impossible',e)}
  }
  return originalFetch(input,init);
};

const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function asDate(v){
  if(!v)return null;
  if(v?.toDate)return v.toDate();
  if(v?.seconds)return new Date(v.seconds*1000);
  const d=new Date(v);return Number.isNaN(d.getTime())?null:d;
}
function keyOf(x){
  const d=asDate(x.date)||asDate(x.sentAt)||asDate(x.scheduledAt)||new Date(0);
  const minute=Math.floor(d.getTime()/60000);
  return `${String(x.objet||x.subject||'').trim().toLowerCase()}|${String(x.expediteur||x.senderMode||'').trim().toLowerCase()}|${minute}`;
}
function badgeClass(status=''){
  const s=status.toLowerCase();
  if(s.includes('erreur'))return 'background:#FDECEC;color:#B42318;border:1px solid #F4B8B4';
  if(s.includes('program'))return 'background:#FFF7DF;color:#8A6500;border:1px solid #E9CF76';
  if(s.includes('cours')||s.includes('tentative'))return 'background:#EAF2FD;color:#245A9B;border:1px solid #B8D2EF';
  return 'background:#E8F7EF;color:#08734A;border:1px solid #B7E2CC';
}

async function loadReliableHistory(){
  const tbody=document.getElementById('history-tbody');if(!tbody)return;
  try{
    const [historySnap,scheduledSnap]=await Promise.all([
      getDocs(collection(db,'historique_mails')),
      getDocs(collection(db,'scheduled_mails'))
    ]);
    const rows=[];
    historySnap.forEach(d=>rows.push({id:d.id,...d.data(),_source:'history'}));
    const historyScheduledIds=new Set(rows.map(x=>x.scheduledMailId).filter(Boolean));
    scheduledSnap.forEach(d=>{
      if(historyScheduledIds.has(d.id))return;
      const x=d.data();
      rows.push({
        id:d.id,
        objet:x.subject||'',
        expediteur:x.senderMode==='coryne'?'coryne@leroyfactory.fr':x.senderMode==='both'?'jerome@leroyfactory.fr & coryne@leroyfactory.fr':'jerome@leroyfactory.fr',
        nbDestinataires:x.nbDestinataires||0,
        date:x.sentAt||x.scheduledAt||x.createdAt,
        scheduledAt:x.scheduledAt,
        statut:x.status==='envoye'?'Succès — programmé':x.status==='erreur'?'Erreur — programmé':x.status==='en_cours'?'Envoi en cours':'Programmé',
        erreur:x.error||x.lastError||'',
        _source:'scheduled'
      });
    });

    // Déduplique les anciennes écritures navigateur + nouvelles écritures serveur.
    rows.sort((a,b)=>(asDate(b.date)?.getTime()||0)-(asDate(a.date)?.getTime()||0));
    const unique=[];const seen=new Set();
    for(const r of rows){
      const k=keyOf(r);
      if(seen.has(k)&&!r.scheduledMailId)continue;
      seen.add(k);unique.push(r);
    }

    if(!unique.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px">Aucun envoi enregistré.</td></tr>';return}
    tbody.innerHTML=unique.map(i=>{
      const d=asDate(i.date)||asDate(i.scheduledAt);
      const status=i.statut||'Envoyé';
      const scheduled=asDate(i.scheduledAt);
      const detail=scheduled&&status.toLowerCase().includes('programm')?`<small style="display:block;color:#777;margin-top:3px">Prévu : ${scheduled.toLocaleString('fr-FR')}</small>`:'';
      const err=i.erreur?`<small style="display:block;color:#B42318;margin-top:3px">${esc(i.erreur)}</small>`:'';
      return `<tr><td>${d?d.toLocaleString('fr-FR'):'—'}${detail}</td><td>${esc(i.expediteur||'—')}</td><td><strong>${esc(i.objet||'')}</strong>${err}</td><td>${Number(i.nbDestinataires||0)} contact(s)</td><td><span style="display:inline-flex;padding:.3rem .5rem;border-radius:999px;font-size:.72rem;font-weight:800;${badgeClass(status)}">${esc(status)}</span></td></tr>`;
    }).join('');
  }catch(e){console.error('Historique mails fiable',e)}
}

function init(){
  const tab=document.getElementById('tab-history-btn');
  tab?.addEventListener('click',()=>setTimeout(loadReliableHistory,80));
  setTimeout(loadReliableHistory,600);
  // Actualise automatiquement l'historique si on reste sur la page.
  setInterval(()=>{if(document.getElementById('section-history')?.style.display!=='none')loadReliableHistory()},30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
