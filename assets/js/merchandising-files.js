import { db, auth, getAgentProfile } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

const storage=getStorage(auth.app);
const input=document.getElementById('merch-files');
const list=document.getElementById('merch-docs');
const status=document.getElementById('merch-status');
const count=document.getElementById('merch-count');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const size=n=>n>1048576?`${(n/1048576).toFixed(1)} Mo`:n>1024?`${(n/1024).toFixed(1)} Ko`:`${n||0} o`;

function show(t){if(status){status.textContent=t;status.style.display=t?'block':'none'}}

input?.addEventListener('change',async()=>{
  const files=[...(input.files||[])];
  if(!files.length)return;
  const profile=getAgentProfile(auth.currentUser);
  if(!profile){show('Session expirée. Reconnectez-vous.');return}
  show(`Envoi de ${files.length} fichier${files.length>1?'s':''}…`);
  try{
    for(const file of files){
      const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'_');
      const path=`merchandising/elios/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
      const r=ref(storage,path);
      await uploadBytes(r,file,{contentType:file.type||'application/octet-stream'});
      const url=await getDownloadURL(r);
      await addDoc(collection(db,'merchandisingFiles'),{manufacturer:'elios',name:file.name,type:file.type||'',size:file.size,path,url,createdAt:serverTimestamp(),createdBy:profile.name});
    }
    input.value='';show('Fichier(s) ajouté(s).');setTimeout(()=>show(''),1800);
  }catch(err){console.error(err);show('Envoi impossible : vérifiez les droits Firebase Storage.')}
});

onSnapshot(query(collection(db,'merchandisingFiles'),orderBy('createdAt','desc')),snap=>{
  const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.manufacturer==='elios');
  if(count)count.textContent=`${rows.length} fichier${rows.length>1?'s':''}`;
  if(!list)return;
  if(!rows.length){list.innerHTML='<div class="merch-empty">Aucun fichier ajouté.</div>';return}
  list.innerHTML=rows.map(x=>{
    const img=(x.type||'').startsWith('image/');
    const preview=img?`<img src="${esc(x.url)}" alt="">`:`<span>${(x.name||'').toLowerCase().endsWith('.pdf')?'PDF':'DOC'}</span>`;
    return `<a class="merch-file" href="${esc(x.url)}" target="_blank" rel="noopener"><div class="merch-preview">${preview}</div><div><strong>${esc(x.name||'Document')}</strong><small>${size(x.size)}${x.createdBy?' • '+esc(x.createdBy):''}</small></div></a>`;
  }).join('');
},err=>{console.error(err);if(list)list.innerHTML='<div class="merch-empty">Impossible de charger les fichiers.</div>'});
