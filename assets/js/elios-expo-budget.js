import {auth,verifiedAgentProfile} from './firebase.js?v=20260912-private3';
import {createBudgetYearGate} from './elios-expo-budget-state.mjs';

const API='https://us-central1-le-roy-factory.cloudfunctions.net/eliosExpoBudget';
const root=document.querySelector('#elios-expo-budget');
const $=selector=>root.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isFinite(n)?n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'À renseigner';
const labels={pending:'En attente Elios',approved:'Accordé par Elios',rejected:'Refusé par Elios'};
let data=null,entryId=crypto.randomUUID();
const yearGate=createBudgetYearGate(()=>$('#eeb-year').value);

async function api(action,payload={}){
 await auth.authStateReady();
 if(!await verifiedAgentProfile(auth.currentUser))throw Error('Connectez-vous avec votre compte agent LRF.');
 const token=await auth.currentUser.getIdToken();
 const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action,year:Number($('#eeb-year').value),...payload}),cache:'no-store',signal:AbortSignal.timeout(45000)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok||result.success!==true)throw Error(result.error||'Le suivi des expositions est momentanément indisponible.');
 return result;
}
function status(message,error=false){const el=$('#eeb-status');el.textContent=message;el.classList.toggle('is-error',error);}
function card(label,value,note='',tone=''){return `<article class="eeb-metric ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong>${note?`<small>${esc(note)}</small>`:''}</article>`;}
function render(){
 if(!data){$('#eeb-metrics').innerHTML=card('CA HT Elios de référence','—')+card('Enveloppe annuelle · 7 %','—')+card('Accordé · consommé','—')+card('Demandé · en attente','—')+card('Solde disponible','—');$('#eeb-clients').innerHTML='';$('#eeb-requests').innerHTML='';return;}
 const s=data.summary,b=data.budget,filter=$('#eeb-client').value;
 $('#eeb-year-label').textContent=String(data.year);
 $('#eeb-metrics').innerHTML=card('CA HT Elios de référence',money(s.turnoverHT),b.referencePeriod||'Période et source à renseigner')+card('Enveloppe annuelle · 7 %',money(s.allowanceHT),'Budget global agent, tous clients Elios')+card('Accordé · consommé',s.approvedUnknown?'Montant à confirmer':money(s.approvedHT),`Merchandising ${money(s.approvedMerchandisingHT)} + expos ${money(s.approvedExpoHT)}`)+card('Demandé · en attente',money(s.pendingHT),s.pendingUnknown?`${s.pendingUnknown} ligne(s) sans valeur confirmée`:'Hors budget consommé avant accord usine')+card('Solde disponible',money(s.remainingHT),s.overrunHT>0?`Dépassement de ${money(s.overrunHT)}`:'Enveloppe moins les montants accordés',s.overrunHT>0?'is-overrun':'');
 const form=$('#eeb-turnover');form.elements.turnoverHT.value=b.turnoverHT===null?'':b.turnoverHT;form.elements.referencePeriod.value=b.referencePeriod||'';form.elements.source.value=b.source||'';
 $('#eeb-ca-source').textContent=b.updatedAt?`Saisie agent · ${b.updatedBy} · ${new Date(b.updatedAt).toLocaleString('fr-FR')}`:'Aucun CA annuel Elios confirmé. Le cumul statistique partiel n’est pas utilisé comme CA annuel.';
 const select=$('#eeb-client');select.innerHTML='<option value="">Tous les clients</option>'+s.clients.map(c=>`<option value="${esc(c.key)}">${esc(c.client)}${c.codeClient?' · '+esc(c.codeClient):''}</option>`).join('');select.value=s.clients.some(c=>c.key===filter)?filter:'';
 renderClientDetails();
 const history=(b.history||[]).slice().reverse();
 $('#eeb-ca-history').innerHTML=history.length?`<details><summary>Historique du CA (${history.length} dernières saisies)</summary><ul>${history.map(h=>`<li>${esc(new Date(h.updatedAt).toLocaleString('fr-FR'))} · ${esc(h.updatedBy)} · ${money(h.turnoverHT)} · ${esc(h.referencePeriod)} · ${esc(h.source)}</li>`).join('')}</ul></details>`:'';
}
function renderClientDetails(){
 if(!data)return;const filter=$('#eeb-client').value,clients=data.summary.clients.filter(c=>!filter||c.key===filter),requests=data.requests.filter(r=>!filter||r.clientKey===filter);
 $('#eeb-clients').innerHTML=clients.length?`<div class="eeb-table-wrap"><table><caption>Consommation par client · aucun plafond individuel présumé</caption><thead><tr><th>Client</th><th>Merchandising accordé</th><th>50 % des expos</th><th>Total accordé</th><th>En attente</th></tr></thead><tbody>${clients.map(c=>`<tr><th>${esc(c.client)}${c.codeClient?`<small>${esc(c.codeClient)}</small>`:''}</th><td>${money(c.approvedMerchandisingHT)}</td><td>${money(c.approvedExpoHT)}</td><td>${c.approvedUnknown?'À confirmer':money(c.approvedHT)}</td><td>${money(c.pendingHT)}${c.pendingUnknown?'<small>+ valeurs à confirmer</small>':''}</td></tr>`).join('')}</tbody></table></div>`:'<p class="eeb-empty">Aucune demande Elios envoyée pour cette année.</p>';
 $('#eeb-requests').innerHTML=requests.map(requestCard).join('');
}
function requestCard(r){
 const d=r.decision;
 return `<details class="eeb-request"><summary><span><strong>${esc(r.client)}</strong><small>${r.source==='manual'?'Saisie agent · ':'Demande configurateur · '}${esc(r.reference)} · ${esc(r.title)}</small></span><span>${r.lines.filter(l=>l.status==='approved').length} / ${r.lines.length} ligne(s) accordée(s)</span></summary><form data-request="${esc(r.id)}"><div class="eeb-table-wrap"><table><thead><tr><th>Référence</th><th>Quantité</th><th>Imputation au budget</th><th>Décision usine</th></tr></thead><tbody>${r.lines.map(l=>`<tr><td><strong>${esc(l.reference||'Code à confirmer')}</strong><small>${esc(l.collection)} · ${esc(l.description)}</small><small>${l.type==='merchandising'?'Merchandising · valeur indicative, non facturée au client':l.type==='box'?'Box expo · 50 % du net HT avant remise':'Vrac · pièce offerte'}</small></td><td>${esc(l.quantity)} ${esc(l.unit)}</td><td>${l.budgetCostHT===null?'À confirmer':money(l.budgetCostHT)}</td><td><label class="eeb-sr">Décision pour ${esc(l.reference)}</label><select data-line="${esc(l.key)}" aria-label="Décision pour ${esc(l.reference)}">${Object.entries(labels).map(([key,label])=>`<option value="${key}"${l.status===key?' selected':''}>${label}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><div class="eeb-form-grid"><label>Référence de confirmation Elios<input name="factoryReference" maxlength="180" placeholder="Mail, accord, numéro de dossier…" value="${esc(d.factoryReference||'')}"></label><label>Date de confirmation Elios<input name="factoryDate" type="date" value="${esc(d.factoryDate||'')}"></label><label class="eeb-wide">Note interne<textarea name="note" maxlength="1000" rows="2">${esc(d.note||'')}</textarea></label></div><p class="eeb-help">Un envoi de demande reste en attente. Seul un accord confirmé par l’usine consomme le budget. Les montants proviennent de la demande enregistrée.</p><button class="btn" type="submit">Enregistrer la décision Elios</button><p data-status role="status"></p>${d.updatedAt?`<p class="eeb-help">Dernière mise à jour : ${esc(new Date(d.updatedAt).toLocaleString('fr-FR'))} · ${esc(d.updatedBy)}</p>`:''}${d.history?.length?`<details class="eeb-history"><summary>Historique des décisions (${d.history.length} dernières)</summary><ul>${d.history.slice().reverse().map(h=>`<li>${esc(new Date(h.updatedAt).toLocaleString('fr-FR'))} · ${esc(h.updatedBy)} · ${esc(h.factoryReference||'En attente')} · ${(h.lines||[]).filter(l=>l.status==='approved').length} ligne(s) accordée(s)</li>`).join('')}</ul></details>`:''}</form></details>`;
}
async function load(){const ticket=yearGate.beginLoad(),year=ticket.year;data=null;render();status('Chargement du budget Elios…');try{const result=await api('read',{year});if(!yearGate.isCurrent(ticket))return;data=result;render();status('Budget actualisé. Les indicateurs du haut restent globaux, même avec un filtre client.');}catch(e){if(yearGate.isCurrent(ticket))status(e.message,true);}}
function beginWrite(){if(yearGate.isWriting()){status('Un enregistrement est déjà en cours.',true);return null;}const write=yearGate.beginWrite(data);if(!write){status('Actualisez le suivi de l’année choisie avant de modifier une valeur.',true);return null;}$('#eeb-year').disabled=true;$('#eeb-refresh').disabled=true;return write.year;}
function endWrite(){yearGate.finishWrite();$('#eeb-year').disabled=false;$('#eeb-refresh').disabled=false;}
function applyResult(result,year){if(year!==Number($('#eeb-year').value)){load();return;}data=result;render();}
$('#eeb-refresh').addEventListener('click',load);
$('#eeb-year').addEventListener('change',load);
$('#eeb-client').addEventListener('change',renderClientDetails);
$('#eeb-turnover').addEventListener('submit',async event=>{
 event.preventDefault();const year=beginWrite();if(year===null)return;const form=event.target,button=form.querySelector('button');button.disabled=true;status('Enregistrement du CA de référence…');
 try{const result=await api('save-turnover',{year,revision:data.budget.revision,turnoverHT:Number(form.elements.turnoverHT.value),referencePeriod:form.elements.referencePeriod.value.trim(),source:form.elements.source.value.trim()});applyResult(result,year);status('CA de référence enregistré ; enveloppe de 7 % recalculée.');}catch(e){status(e.message,true);}finally{button.disabled=false;endWrite();}
});
$('#eeb-requests').addEventListener('submit',async event=>{
 const form=event.target;if(!form.matches('form[data-request]'))return;event.preventDefault();const request=data?.requests.find(r=>r.id===form.dataset.request);if(!request)return;const year=beginWrite();if(year===null)return;
 const button=form.querySelector('button[type="submit"]'),message=form.querySelector('[data-status]');button.disabled=true;message.textContent='Enregistrement de la décision…';
 try{const result=await api('decision',{year,requestId:request.id,source:request.source,revision:request.decision.revision,lines:[...form.querySelectorAll('[data-line]')].map(el=>({key:el.dataset.line,status:el.value})),factoryReference:form.elements.factoryReference.value.trim(),factoryDate:form.elements.factoryDate.value,note:form.elements.note.value.trim()});applyResult(result,year);status('Décision usine enregistrée ; budget et sous-totaux client actualisés.');}catch(e){message.textContent=e.message;message.classList.add('is-error');}finally{button.disabled=false;endWrite();}
});
const entryForm=$('#eeb-entry');
entryForm.elements.type.addEventListener('change',()=>{
 const isExpo=entryForm.elements.type.value==='box';
 $('#eeb-entry-amount-label').firstChild.textContent=isExpo?'Montant total net HT de l’expo AVANT remise (€)':'Valeur totale du merchandising HT (€)';
 $('#eeb-entry-rule').textContent=isExpo?'Le serveur impute la moitié de ce montant au budget après accord usine. Saisissez la base avant remise, sans la diviser vous-même.':'La valeur du merchandising est imputée à 100 % après accord usine ; elle reste hors montant à payer par le client.';
});
entryForm.addEventListener('submit',async event=>{
 event.preventDefault();const year=beginWrite();if(year===null)return;const button=entryForm.querySelector('button'),message=$('#eeb-entry-status');button.disabled=true;message.textContent='Enregistrement de la dotation…';
 const values=Object.fromEntries(new FormData(entryForm));
 try{const result=await api('save-entry',{entryId,...values,year,amountHT:Number(values.amountHT)});entryForm.reset();entryId=crypto.randomUUID();entryForm.elements.type.dispatchEvent(new Event('change'));applyResult(result,year);message.textContent='Dotation enregistrée dans le suivi annuel.';status('Budget et dotations actualisés.');}catch(e){message.textContent=e.message;message.classList.add('is-error');}finally{button.disabled=false;endWrite();}
});
window.addEventListener('lrf-agent-auth-ready',()=>{if(!data)load();});
render();
await auth.authStateReady();if(await verifiedAgentProfile(auth.currentUser))load();
