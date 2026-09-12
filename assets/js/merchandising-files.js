import { db, auth, getAgentProfile } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const UPLOAD_URL='https://us-central1-le-roy-factory.cloudfunctions.net/crmFilesUpload';
const input=document.getElementById('merch-files');
const list=document.getElementById('merch-docs');
const status=document.getElementById('merch-status');
const count=document.getElementById('merch-count');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const size=n=>n>1048576?`${(n/1048576).toFixed(1)} Mo`:n>1024?`${(n/1024).toFixed(1)} Ko`:`${n||0} o`;

function show(t){if(status){status.textContent=t;status.style.display=t?'block':'none'}}
function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const result=String(reader.result||'');resolve(result.includes(',')?result.slice(result.indexOf(',')+1):result)};reader.onerror=()=>reject(new Error(`Impossible de lire ${file.name}`));reader.readAsDataURL(file)})}
async function uploadOne(file,profile){
  if(file.size>20*1024*1024)throw new Error(`${file.name} dépasse 20 Mo.`);
  const user=auth.currentUser;if(!user)throw new Error('Session expirée. Reconnectez-vous.');
  const token=await user.getIdToken();
  const base64=await fileToBase64(file);
  const response=await fetch(UPLOAD_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({scope:'merchandising',parentId:'elios',fileName:file.name,contentType:file.type||'application/octet-stream',base64})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload.success||!payload.file)throw new Error(payload.error||`Échec de l’envoi de ${file.name}.`);
  return {...payload.file,uploadedBy:profile.name};
}

input?.addEventListener('change',async()=>{
  const files=[...(input.files||[])];
  if(!files.length)return;
  const profile=getAgentProfile(auth.currentUser);
  if(!profile){show('Session expirée. Reconnectez-vous.');return}
  try{
    for(let i=0;i<files.length;i+=1){
      const file=files[i];
      show(`Envoi ${i+1}/${files.length} : ${file.name}…`);
      const uploaded=await uploadOne(file,profile);
      await addDoc(collection(db,'merchandisingFiles'),{manufacturer:'elios',name:uploaded.name,type:uploaded.type||'',size:uploaded.size||file.size,path:uploaded.path,url:uploaded.url,createdAt:serverTimestamp(),createdBy:profile.name});
    }
    input.value='';show('Fichier(s) ajouté(s).');setTimeout(()=>show(''),1800);
  }catch(err){console.error(err);show(err?.message||'Envoi impossible.')}
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
