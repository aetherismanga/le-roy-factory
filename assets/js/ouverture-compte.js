const FUNCTION_BASE='https://us-central1-le-roy-factory.cloudfunctions.net';
const API=`${FUNCTION_BASE}/submitAccountRequest`;
const PREFILL_API=`${FUNCTION_BASE}/getAccountClientPrefill`;
const REQUEST_VERIFY_API=`${FUNCTION_BASE}/requestClientVerification`;
const VERIFY_API=`${FUNCTION_BASE}/verifyClientVerification`;
const ALLOWED_FILE_TYPES=new Set(['application/pdf','image/jpeg','image/png','image/webp']);
const MAX_SINGLE_FILE=8*1024*1024;
const MAX_TOTAL_SIZE=12*1024*1024;

const PARTNERS=[
  {name:'Elios Ceramica',logo:'elios.png'},{name:'View Ceramica',logo:'view.png'},{name:'La Fenice',logo:'lafenice.png'},
  {name:'Reviglass',logo:'reviglass.png'},{name:'Biopietra',logo:'biopietra.png'},{name:"Petracer's",logo:'petracer.png'},
  {name:'Pecchioli Firenze',logo:'pecchioli.png'},{name:'Bulbo',logo:'bulbo.png'},{name:'Randal Pro',logo:'randal.png'},
  {name:'Neobath',logo:'neobath.png'},{name:'Koibath',logo:'koibath.png'},{name:'Aquahome',logo:'aquahome.png'},
  {name:'Opal',logo:'opal.png'},{name:'Bilt',logo:'bilt.png'}
];

const $=s=>document.querySelector(s);
let challengeId='';
let verificationToken='';
let verifiedIdentityKey='';
let prefillLoadedKey='';

function renderPartners(selected=[]){
  const set=new Set((selected||[]).map(String));
  $('#partners').innerHTML=PARTNERS.map(p=>`<label class="partner"><input type="checkbox" name="partner" value="${p.name.replace(/"/g,'&quot;')}" ${set.has(p.name)?'checked':''}><span class="partner-main"><img class="partner-logo" src="assets/img/${p.logo}" alt="${p.name.replace(/"/g,'&quot;')}" onerror="this.style.display='none'"><span class="partner-name">${p.name}</span></span></label>`).join('');
}

function requestType(){return document.querySelector('input[name="requestType"]:checked')?.value||'ouverture'}
function normalizeCode(v){let s=String(v||'').trim().toUpperCase().replace(/\s/g,'');if(/^\d{1,5}$/.test(s))s=`LRF-${s.padStart(5,'0')}`;return s}
function normalizeDept(v){return String(v||'').trim().toUpperCase().replace(/\s/g,'').slice(0,3)}
function currentIdentity(){const code=normalizeCode($('#codeClient')?.value),dep=normalizeDept($('#departementAuth')?.value);return{code,dep,key:`${code}|${dep}`}}
function validIdentity(i){return /^LRF-\d{5}$/.test(i.code)&&/^(?:\d{2,3}|2A|2B)$/i.test(i.dep)}

function ensureVerificationUi(){
  const wrap=$('#update-auth');if(!wrap||$('#update-security'))return;
  const box=document.createElement('div');box.id='update-security';box.className='full';box.innerHTML=`
    <div style="border:1px solid #e2d9c5;background:#fffdf7;border-radius:10px;padding:.9rem">
      <div style="display:flex;gap:.65rem;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div><strong style="font-size:.86rem">Vérification de sécurité</strong><div style="font-size:.76rem;color:#6f675b;margin-top:.2rem">Un code à 6 chiffres sera envoyé à l’e-mail déjà enregistré dans votre fiche client.</div></div>
        <button id="request-update-code" type="button" style="border:1px solid #D4AF37;background:#111;color:#FFD700;border-radius:8px;padding:.65rem .8rem;font-weight:800;cursor:pointer">Recevoir le code</button>
      </div>
      <div id="update-otp-wrap" style="display:none;margin-top:.8rem;padding-top:.8rem;border-top:1px solid #eee4ce">
        <div id="update-otp-info" style="font-size:.8rem;color:#5d574e;margin-bottom:.55rem"></div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.6rem">
          <input id="update-otp-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="Code à 6 chiffres" style="padding:.75rem;border:1px solid #d5d0c7;border-radius:8px;font:inherit;text-align:center;letter-spacing:.2em;font-weight:800">
          <button id="verify-update-code" type="button" style="border:1px solid #D4AF37;background:#111;color:#FFD700;border-radius:8px;padding:.65rem .9rem;font-weight:800;cursor:pointer">Vérifier</button>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:.55rem"><button id="resend-update-code" type="button" style="border:0;background:transparent;color:#8a6d12;text-decoration:underline;font-weight:700;cursor:pointer">Renvoyer un code</button></div>
      </div>
      <div id="update-verified" style="display:none;margin-top:.75rem;background:#eaf7ef;color:#17623a;border:1px solid #b8dec6;border-radius:8px;padding:.7rem;font-size:.8rem;font-weight:800"></div>
    </div>`;
  const notice=wrap.querySelector('.notice');if(notice)wrap.insertBefore(box,notice);else wrap.appendChild(box);
  $('#request-update-code')?.addEventListener('click',requestUpdateCode);
  $('#resend-update-code')?.addEventListener('click',requestUpdateCode);
  $('#verify-update-code')?.addEventListener('click',verifyUpdateCode);
  $('#update-otp-code')?.addEventListener('input',e=>{e.target.value=String(e.target.value||'').replace(/\D/g,'').slice(0,6)});
  $('#update-otp-code')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();verifyUpdateCode()}});
}

function setIdentityLocked(locked){
  if($('#codeClient'))$('#codeClient').disabled=locked;
  if($('#departementAuth'))$('#departementAuth').disabled=locked;
  const requestBtn=$('#request-update-code');if(requestBtn){requestBtn.disabled=locked;requestBtn.textContent=locked?'Identité vérifiée':'Recevoir le code'}
}

function resetUpdateVerification({clearState=true}={}){
  if(clearState){challengeId='';verificationToken='';verifiedIdentityKey='';prefillLoadedKey=''}
  setIdentityLocked(false);
  const otp=$('#update-otp-code');if(otp)otp.value='';
  if($('#update-otp-wrap'))$('#update-otp-wrap').style.display='none';
  if($('#update-verified')){$('#update-verified').style.display='none';$('#update-verified').textContent=''}
  if(requestType()==='mise_a_jour')setPrefillState('Votre identité doit être vérifiée par e-mail avant le préremplissage.','loading');
  else setPrefillState('','');
}

function toggleUpdate(){
  ensureVerificationUi();
  const update=requestType()==='mise_a_jour';
  $('#update-auth').style.display=update?'grid':'none';
  $('#codeClient').required=update;$('#departementAuth').required=update;
  resetUpdateVerification();
  if(!update){renderPartners();}
}

function depFromCp(cp){
  const s=String(cp||'').replace(/\s/g,'');if(!/^\d{5}$/.test(s))return'';
  if(s.startsWith('97')||s.startsWith('98'))return s.slice(0,3);
  if(s.startsWith('20'))return Number(s)>=20200?'2B':'2A';
  return s.slice(0,2);
}

function normalizedFileType(file){
  if(ALLOWED_FILE_TYPES.has(file.type))return file.type;
  const n=String(file.name||'').toLowerCase();if(n.endsWith('.pdf'))return'application/pdf';if(/\.jpe?g$/.test(n))return'image/jpeg';if(n.endsWith('.png'))return'image/png';if(n.endsWith('.webp'))return'image/webp';return'';
}
function fileToPayload(file,contentType){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({filename:file.name,contentType,content:String(r.result).split(',')[1]||''});r.onerror=reject;r.readAsDataURL(file)})}
async function collectFiles(){
  if(!$('#rib').files[0])throw new Error('Le RIB est obligatoire.');
  if(!$('#kbis').files[0])throw new Error('Le Kbis est obligatoire.');
  const files=[{role:'rib',file:$('#rib').files[0]},{role:'kbis',file:$('#kbis').files[0]}];
  [...$('#autresFichiers').files].slice(0,6).forEach(file=>files.push({role:'autre',file}));
  let total=0;const out=[];
  for(const x of files){
    const type=normalizedFileType(x.file);if(!type)throw new Error(`Format non autorisé : ${x.file.name}. Utilisez PDF, JPG, PNG ou WEBP.`);
    if(x.file.size<=0||x.file.size>MAX_SINGLE_FILE)throw new Error(`${x.file.name} dépasse la taille maximale de 8 Mo.`);
    total+=x.file.size;if(total>MAX_TOTAL_SIZE)throw new Error('La taille totale des pièces jointes dépasse 12 Mo.');
    const p=await fileToPayload(x.file,type);out.push({...p,role:x.role,size:x.file.size});
  }
  return out;
}

function showMsg(text,ok=false){const el=$('#form-msg');el.textContent=text;el.className=`msg ${ok?'ok':'err'}`}
function setPrefillState(text,type=''){const el=$('#prefill-state');if(!el)return;el.textContent=text;el.className=`full prefill-state ${type}`}
function setSelectValue(select,value){if(!value)return;const exact=[...select.options].find(o=>o.value.toLowerCase()===String(value).toLowerCase());if(exact)select.value=exact.value;else select.value='Autre'}
function fillExisting(c){
  $('#societe').value=c.societe||'';setSelectValue($('#activite'),c.activite||c.categorieActivite||'');$('#adresse').value=c.adresse||'';$('#codePostal').value=c.codePostal||c.code_postal||'';$('#ville').value=c.ville||'';$('#siret').value=c.siret||'';$('#tva').value=c.tva||'';$('#chiffreAffaires').value=c.chiffreAffaires||c.chiffre_affaires||'';$('#contact').value=c.contact||'';$('#fonction').value=c.fonction||'';$('#telephone').value=c.telephone||(Array.isArray(c.telephones)?c.telephones[0]:'')||'';$('#email').value=c.email||'';$('#emailsAutres').value=Array.isArray(c.emails)?c.emails.join(', '):Array.isArray(c.emailsAutres)?c.emailsAutres.join(', '):'';$('#contactsAutres').value=c.contactsAutres||'';renderPartners(c.partenaires||[]);
}

async function jsonPost(url,payload){
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload||{})});const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.success)throw new Error(data.error||'Service momentanément indisponible.');return data;
}

async function requestUpdateCode(){
  const identity=currentIdentity();if(!validIdentity(identity)){setPrefillState('Vérifiez le code client et le département.','err');return}
  const requestBtn=$('#request-update-code'),resend=$('#resend-update-code');
  try{
    if(requestBtn){requestBtn.disabled=true;requestBtn.textContent='Envoi…'}if(resend)resend.disabled=true;
    challengeId='';verificationToken='';verifiedIdentityKey='';prefillLoadedKey='';
    const d=await jsonPost(REQUEST_VERIFY_API,{purpose:'account_update',codeClient:identity.code,departement:identity.dep});
    challengeId=d.challengeId;verifiedIdentityKey=identity.key;
    $('#update-otp-wrap').style.display='block';
    $('#update-otp-info').textContent=`Code envoyé à ${d.maskedEmail||'l’adresse enregistrée'}.`;
    setPrefillState(`Un code de sécurité a été envoyé à ${d.maskedEmail||'votre adresse enregistrée'}.`,'loading');
    $('#update-otp-code').value='';$('#update-otp-code').focus();
  }catch(err){challengeId='';setPrefillState(err.message||'Impossible d’envoyer le code.','err')}
  finally{if(requestBtn){requestBtn.disabled=false;requestBtn.textContent='Recevoir le code'}if(resend)resend.disabled=false}
}

async function verifyUpdateCode(){
  const identity=currentIdentity();const code=String($('#update-otp-code')?.value||'').replace(/\D/g,'');
  if(!challengeId||verifiedIdentityKey!==identity.key){setPrefillState('Demandez un nouveau code de sécurité.','err');return}
  if(!/^\d{6}$/.test(code)){setPrefillState('Saisissez le code à 6 chiffres reçu par e-mail.','err');return}
  const btn=$('#verify-update-code');
  try{
    if(btn){btn.disabled=true;btn.textContent='Vérification…'}
    const verified=await jsonPost(VERIFY_API,{challengeId,code});if(verified.purpose!=='account_update')throw new Error('Vérification invalide.');
    verificationToken=verified.verificationToken;
    const prefill=await jsonPost(PREFILL_API,{verificationToken});
    fillExisting(prefill.client||{});prefillLoadedKey=identity.key;setIdentityLocked(true);
    $('#update-otp-wrap').style.display='none';
    $('#update-verified').style.display='block';$('#update-verified').textContent='✓ Identité vérifiée par e-mail. Votre fiche a été chargée en toute sécurité.';
    setPrefillState('✓ Fiche client chargée. Vérifiez les informations puis modifiez uniquement ce qui doit l’être.','ok');
  }catch(err){verificationToken='';prefillLoadedKey='';setPrefillState(err.message||'Code incorrect ou expiré.','err')}
  finally{if(btn){btn.disabled=false;btn.textContent='Vérifier'}}
}

const params=new URLSearchParams(location.search);if(params.get('type')==='mise_a_jour')document.querySelector('input[name="requestType"][value="mise_a_jour"]').checked=true;
renderPartners();ensureVerificationUi();toggleUpdate();
document.querySelectorAll('input[name="requestType"]').forEach(r=>r.addEventListener('change',toggleUpdate));
$('#codeClient').addEventListener('input',e=>{e.target.value=normalizeCode(e.target.value);if(challengeId||verificationToken)resetUpdateVerification()});
$('#departementAuth').addEventListener('input',e=>{e.target.value=normalizeDept(e.target.value);if(challengeId||verificationToken)resetUpdateVerification()});
$('#codePostal').addEventListener('input',e=>{if(/^\d{5}$/.test(e.target.value)){fetch(`https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(e.target.value)}&fields=nom&format=json`).then(r=>r.json()).then(d=>{if(d?.[0]?.nom&&!$('#ville').value)$('#ville').value=d[0].nom}).catch(()=>{})}});

$('#account-form').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('#submit-btn');btn.disabled=true;showMsg('Envoi de votre demande en cours…',true);
  try{
    const type=requestType();const cp=$('#codePostal').value.trim();const tva=$('#tva').value.trim();
    if(!$('#consent').checked)throw new Error('Veuillez accepter l’utilisation des informations pour traiter votre demande.');
    if(type==='mise_a_jour'){
      const identity=currentIdentity();
      if(!verificationToken||prefillLoadedKey!==identity.key)throw new Error('Votre identité doit être vérifiée par e-mail avant l’envoi de la mise à jour.');
    }
    const payload={
      requestType:type,
      verificationToken:type==='mise_a_jour'?verificationToken:'',
      societe:$('#societe').value.trim(),activite:$('#activite').value.trim(),adresse:$('#adresse').value.trim(),codePostal:cp,ville:$('#ville').value.trim(),departement:depFromCp(cp),
      siret:$('#siret').value.trim(),tva,chiffreAffaires:$('#chiffreAffaires').value.trim(),contact:$('#contact').value.trim(),fonction:$('#fonction').value.trim(),telephone:$('#telephone').value.trim(),email:$('#email').value.trim(),
      emailsAutres:$('#emailsAutres').value.split(',').map(x=>x.trim()).filter(Boolean),contactsAutres:$('#contactsAutres').value.trim(),
      partenaires:[...document.querySelectorAll('input[name="partner"]:checked')].map(x=>x.value),demande:$('#demande').value.trim(),consent:true,
      attachments:await collectFiles(),source:'formulaire_public',submittedAt:new Date().toISOString()
    };
    const data=await jsonPost(API,payload);
    $('#account-form').reset();challengeId='';verificationToken='';verifiedIdentityKey='';prefillLoadedKey='';renderPartners();toggleUpdate();
    showMsg(`Votre demande a bien été transmise à LE ROY FACTORY. Référence : ${data.reference||data.id||''}`,true);window.scrollTo({top:0,behavior:'smooth'});
  }catch(err){console.error(err);showMsg(err.message||'Une erreur est survenue.');}
  finally{btn.disabled=false}
});
