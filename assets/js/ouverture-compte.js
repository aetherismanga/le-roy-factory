const API='https://us-central1-le-roy-factory.cloudfunctions.net/submitAccountRequest';
const PREFILL_API='https://us-central1-le-roy-factory.cloudfunctions.net/getAccountClientPrefill';
const PARTNERS=[
  {name:'Elios Ceramica',logo:'elios.png'},
  {name:'View Ceramica',logo:'view.png'},
  {name:'La Fenice',logo:'lafenice.png'},
  {name:'Reviglass',logo:'reviglass.png'},
  {name:'Biopietra',logo:'biopietra.png'},
  {name:"Petracer's",logo:'petracer.png'},
  {name:'Pecchioli Firenze',logo:'pecchioli.png'},
  {name:'Bulbo',logo:'bulbo.png'},
  {name:'Randal Pro',logo:'randal.png'},
  {name:'Neobath',logo:'neobath.png'},
  {name:'Koibath',logo:'koibath.png'},
  {name:'Aquahome',logo:'aquahome.png'},
  {name:'Opal',logo:'opal.png'},
  {name:'Bilt',logo:'bilt.png'}
];
const $=s=>document.querySelector(s);
let prefillTimer=null,prefillLoadedKey='';

function renderPartners(selected=[]){
  const set=new Set((selected||[]).map(String));
  $('#partners').innerHTML=PARTNERS.map(p=>`<label class="partner"><input type="checkbox" name="partner" value="${p.name.replace(/"/g,'&quot;')}" ${set.has(p.name)?'checked':''}><span class="partner-main"><img class="partner-logo" src="assets/img/${p.logo}" alt="${p.name.replace(/"/g,'&quot;')}" onerror="this.style.display='none'"><span class="partner-name">${p.name}</span></span></label>`).join('');
}
function requestType(){return document.querySelector('input[name="requestType"]:checked')?.value||'ouverture'}
function toggleUpdate(){
  const update=requestType()==='mise_a_jour';
  $('#update-auth').style.display=update?'grid':'none';
  $('#codeClient').required=update;$('#departementAuth').required=update;
  if(!update){prefillLoadedKey='';setPrefillState('','');}
  else schedulePrefill();
}
function depFromCp(cp){
  const s=String(cp||'').replace(/\s/g,'');if(!/^\d{5}$/.test(s))return'';
  if(s.startsWith('97')||s.startsWith('98'))return s.slice(0,3);
  if(s.startsWith('20'))return Number(s)>=20200?'2B':'2A';
  return s.slice(0,2);
}
function fileToPayload(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({filename:file.name,contentType:file.type||'application/octet-stream',content:String(r.result).split(',')[1]||''});r.onerror=reject;r.readAsDataURL(file)})}
async function collectFiles(){
  if(!$('#rib').files[0])throw new Error('Le RIB est obligatoire.');
  if(!$('#kbis').files[0])throw new Error('Le Kbis est obligatoire.');
  const files=[{role:'rib',file:$('#rib').files[0]},{role:'kbis',file:$('#kbis').files[0]}];
  [...$('#autresFichiers').files].forEach(file=>files.push({role:'autre',file}));
  const total=files.reduce((n,x)=>n+x.file.size,0);
  if(total>12*1024*1024)throw new Error('La taille totale des pièces jointes dépasse 12 Mo.');
  const out=[];for(const x of files){const p=await fileToPayload(x.file);out.push({...p,role:x.role,size:x.file.size})}return out;
}
function showMsg(text,ok=false){const el=$('#form-msg');el.textContent=text;el.className=`msg ${ok?'ok':'err'}`}
function normalizeCode(v){let s=String(v||'').trim().toUpperCase().replace(/\s/g,'');if(/^\d{1,5}$/.test(s))s=`LRF-${s.padStart(5,'0')}`;return s}
function setPrefillState(text,type=''){const el=$('#prefill-state');if(!el)return;el.textContent=text;el.className=`full prefill-state ${type}`}
function setSelectValue(select,value){if(!value)return;const exact=[...select.options].find(o=>o.value.toLowerCase()===String(value).toLowerCase());if(exact)select.value=exact.value;else{select.value='Autre'}}
function fillExisting(c){
  $('#societe').value=c.societe||'';setSelectValue($('#activite'),c.activite||c.categorieActivite||'');$('#adresse').value=c.adresse||'';$('#codePostal').value=c.codePostal||c.code_postal||'';$('#ville').value=c.ville||'';$('#siret').value=c.siret||'';$('#tva').value=c.tva||'';$('#chiffreAffaires').value=c.chiffreAffaires||c.chiffre_affaires||'';$('#contact').value=c.contact||'';$('#fonction').value=c.fonction||'';$('#telephone').value=c.telephone||(Array.isArray(c.telephones)?c.telephones[0]:'')||'';$('#email').value=c.email||'';$('#emailsAutres').value=Array.isArray(c.emails)?c.emails.join(', '):Array.isArray(c.emailsAutres)?c.emailsAutres.join(', '):'';$('#contactsAutres').value=c.contactsAutres||'';renderPartners(c.partenaires||[]);
}
function schedulePrefill(){clearTimeout(prefillTimer);if(requestType()!=='mise_a_jour')return;prefillTimer=setTimeout(loadExisting,450)}
async function loadExisting(){
  const code=normalizeCode($('#codeClient').value),dep=$('#departementAuth').value.trim().toUpperCase();
  if(!/^LRF-\d{5}$/.test(code)||!dep){setPrefillState('','');return}
  const key=`${code}|${dep}`;if(key===prefillLoadedKey)return;
  setPrefillState('Recherche de votre fiche client…','loading');
  try{
    const res=await fetch(PREFILL_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({codeClient:code,departement:dep})});const d=await res.json().catch(()=>({}));
    if(!res.ok||!d.success)throw new Error(d.error||'Compte introuvable.');
    fillExisting(d.client||{});prefillLoadedKey=key;setPrefillState('✓ Votre fiche a été retrouvée. Vérifiez les informations et complétez uniquement ce qui doit être mis à jour.','ok');
  }catch(err){prefillLoadedKey='';setPrefillState(err.message||'Impossible de retrouver votre fiche.','err')}
}

const params=new URLSearchParams(location.search);if(params.get('type')==='mise_a_jour')document.querySelector('input[name="requestType"][value="mise_a_jour"]').checked=true;
renderPartners();toggleUpdate();
document.querySelectorAll('input[name="requestType"]').forEach(r=>r.addEventListener('change',toggleUpdate));
$('#codeClient').addEventListener('input',e=>{e.target.value=normalizeCode(e.target.value);prefillLoadedKey='';schedulePrefill()});
$('#departementAuth').addEventListener('input',()=>{prefillLoadedKey='';schedulePrefill()});
$('#codePostal').addEventListener('input',e=>{if(/^\d{5}$/.test(e.target.value)){fetch(`https://geo.api.gouv.fr/communes?codePostal=${e.target.value}&fields=nom&format=json`).then(r=>r.json()).then(d=>{if(d?.[0]?.nom&&!$('#ville').value)$('#ville').value=d[0].nom}).catch(()=>{})}});

$('#account-form').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('#submit-btn');btn.disabled=true;showMsg('Envoi de votre demande en cours…',true);
  try{
    const type=requestType();const cp=$('#codePostal').value.trim();const tva=$('#tva').value.trim();
    if(type==='mise_a_jour'&&!prefillLoadedKey)await loadExisting();
    if(type==='mise_a_jour'&&!prefillLoadedKey)throw new Error('Votre code client et votre département doivent être reconnus avant l’envoi.');
    const payload={
      requestType:type,
      codeClient:type==='mise_a_jour'?normalizeCode($('#codeClient').value):'',
      departementAuth:type==='mise_a_jour'?$('#departementAuth').value.trim().toUpperCase():'',
      societe:$('#societe').value.trim(),activite:$('#activite').value.trim(),adresse:$('#adresse').value.trim(),codePostal:cp,ville:$('#ville').value.trim(),departement:depFromCp(cp),
      siret:$('#siret').value.trim(),tva,chiffreAffaires:$('#chiffreAffaires').value.trim(),contact:$('#contact').value.trim(),fonction:$('#fonction').value.trim(),telephone:$('#telephone').value.trim(),email:$('#email').value.trim(),
      emailsAutres:$('#emailsAutres').value.split(',').map(x=>x.trim()).filter(Boolean),contactsAutres:$('#contactsAutres').value.trim(),
      partenaires:[...document.querySelectorAll('input[name="partner"]:checked')].map(x=>x.value),demande:$('#demande').value.trim(),consent:true,
      attachments:await collectFiles(),source:'formulaire_public',submittedAt:new Date().toISOString()
    };
    if(type==='mise_a_jour'&&!/^LRF-\d{5}$/.test(payload.codeClient))throw new Error('Le code client doit être au format LRF-00000.');
    const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.success)throw new Error(data.error||'Impossible d’envoyer la demande.');
    $('#account-form').reset();prefillLoadedKey='';toggleUpdate();renderPartners();showMsg(`Votre demande a bien été transmise à LE ROY FACTORY. Référence : ${data.reference||data.id||''}`,true);window.scrollTo({top:0,behavior:'smooth'});
  }catch(err){console.error(err);showMsg(err.message||'Une erreur est survenue.');}
  finally{btn.disabled=false}
});