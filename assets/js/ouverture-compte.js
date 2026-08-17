const API='https://us-central1-le-roy-factory.cloudfunctions.net/submitAccountRequest';
const PARTNERS=['Elios Ceramica','View Ceramica','La Fenice','Reviglass','Biopietra',"Petracer's",'Pecchioli Firenze','Bulbo','Randal Pro','Neobath','Koibath','Aquahome','Opal','Bilt'];
const $=s=>document.querySelector(s);

function renderPartners(){
  $('#partners').innerHTML=PARTNERS.map(p=>`<label class="partner"><input type="checkbox" name="partner" value="${p.replace(/"/g,'&quot;')}"> ${p}</label>`).join('');
}
function requestType(){return document.querySelector('input[name="requestType"]:checked')?.value||'ouverture'}
function toggleUpdate(){
  const update=requestType()==='mise_a_jour';
  $('#update-auth').style.display=update?'grid':'none';
  $('#codeClient').required=update;$('#departementAuth').required=update;
}
function depFromCp(cp){
  const s=String(cp||'').replace(/\s/g,'');if(!/^\d{5}$/.test(s))return'';
  if(s.startsWith('97')||s.startsWith('98'))return s.slice(0,3);
  if(s.startsWith('20'))return Number(s)>=20200?'2B':'2A';
  return s.slice(0,2);
}
function fileToPayload(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({filename:file.name,contentType:file.type||'application/octet-stream',content:String(r.result).split(',')[1]||''});r.onerror=reject;r.readAsDataURL(file)})}
async function collectFiles(){
  const files=[];
  if($('#rib').files[0])files.push({role:'rib',file:$('#rib').files[0]});
  if($('#kbis').files[0])files.push({role:'kbis',file:$('#kbis').files[0]});
  [...$('#autresFichiers').files].forEach(file=>files.push({role:'autre',file}));
  const total=files.reduce((n,x)=>n+x.file.size,0);
  if(total>12*1024*1024)throw new Error('La taille totale des pièces jointes dépasse 12 Mo.');
  const out=[];for(const x of files){const p=await fileToPayload(x.file);out.push({...p,role:x.role,size:x.file.size})}return out;
}
function showMsg(text,ok=false){const el=$('#form-msg');el.textContent=text;el.className=`msg ${ok?'ok':'err'}`}
function normalizeCode(v){let s=String(v||'').trim().toUpperCase().replace(/\s/g,'');if(/^\d{1,5}$/.test(s))s=`LRF-${s.padStart(5,'0')}`;return s}

renderPartners();toggleUpdate();
document.querySelectorAll('input[name="requestType"]').forEach(r=>r.addEventListener('change',toggleUpdate));
$('#codeClient').addEventListener('input',e=>e.target.value=normalizeCode(e.target.value));
$('#codePostal').addEventListener('input',e=>{if(/^\d{5}$/.test(e.target.value)){fetch(`https://geo.api.gouv.fr/communes?codePostal=${e.target.value}&fields=nom&format=json`).then(r=>r.json()).then(d=>{if(d?.[0]?.nom&&!$('#ville').value)$('#ville').value=d[0].nom}).catch(()=>{})}});

$('#account-form').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('#submit-btn');btn.disabled=true;showMsg('Envoi de votre demande en cours…',true);
  try{
    const type=requestType();const cp=$('#codePostal').value.trim();
    const payload={
      requestType:type,
      codeClient:type==='mise_a_jour'?normalizeCode($('#codeClient').value):'',
      departementAuth:type==='mise_a_jour'?$('#departementAuth').value.trim().toUpperCase():'',
      societe:$('#societe').value.trim(),activite:$('#activite').value.trim(),adresse:$('#adresse').value.trim(),codePostal:cp,ville:$('#ville').value.trim(),departement:depFromCp(cp),
      siret:$('#siret').value.trim(),tva:$('#tva').value.trim(),contact:$('#contact').value.trim(),fonction:$('#fonction').value.trim(),telephone:$('#telephone').value.trim(),email:$('#email').value.trim(),
      emailsAutres:$('#emailsAutres').value.split(',').map(x=>x.trim()).filter(Boolean),contactsAutres:$('#contactsAutres').value.trim(),
      partenaires:[...document.querySelectorAll('input[name="partner"]:checked')].map(x=>x.value),demande:$('#demande').value.trim(),consent:true,
      attachments:await collectFiles(),source:'formulaire_public',submittedAt:new Date().toISOString()
    };
    if(type==='mise_a_jour'&&!/^LRF-\d{5}$/.test(payload.codeClient))throw new Error('Le code client doit être au format LRF-00000.');
    const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.success)throw new Error(data.error||'Impossible d’envoyer la demande.');
    $('#account-form').reset();toggleUpdate();renderPartners();showMsg(`Votre demande a bien été transmise à LE ROY FACTORY. Référence : ${data.reference||data.id||''}`,true);window.scrollTo({top:0,behavior:'smooth'});
  }catch(err){console.error(err);showMsg(err.message||'Une erreur est survenue.');}
  finally{btn.disabled=false}
});