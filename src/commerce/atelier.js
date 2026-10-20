import {quoteProject,money} from './pricing.js';
import {commercialRequest,statusText} from './client.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountCommerce(getProject){
 const host=document.createElement('section');host.className='studio-commerce setting-section';
 host.innerHTML='<a class="commerce-home" href="/">← Accueil STUDIO ONE</a><details><summary><span>Prix public TTC</span><strong class="commerce-total"></strong></summary><div class="commerce-lines"></div><p class="commerce-notes"></p><p class="commerce-excluded"></p><p class="commerce-account"></p><form class="commerce-login"><label>Code client LRF<input name="codeClient" placeholder="LRF-XXXXX" pattern="LRF-[0-9]{5}" maxlength="9" required autocomplete="username"></label><label>Département<input name="departement" pattern="[0-9]{2,3}|2A|2B" maxlength="3" required></label><button type="submit">Identifier mon compte</button></form><button class="commerce-logout" hidden>Déconnecter ce compte</button><p class="commerce-status" role="status"></p></details>';
 document.querySelector('#settings .panel-heading').after(host);
 const select=s=>host.querySelector(s);let session=null,last='',timer;
 const account=()=>{select('.commerce-account').textContent=session?.randalAllowed===false?'Compte '+session.client.codeClient+' : accès RANDAL non autorisé.':statusText(session);select('.commerce-logout').hidden=!session?.client;};
 const render=()=>{
  const project=getProject(),key=JSON.stringify(project.items);if(key===last)return;last=key;
  const q=quoteProject(project);select('.commerce-total').textContent=money(q.publicTTC);
  select('.commerce-lines').innerHTML=q.rows.map(r=>`<article><strong>${escape(r.name)}</strong><small>${escape(r.detail)}<br>Réf. ${escape(r.ref)}</small><b>Prix public TTC : ${money(r.publicTTC)}</b>${r.note?'<small>'+escape(r.note)+'</small>':''}</article>`).join('')||'<p>Aucun meuble chiffré dans la composition.</p>';
  select('.commerce-notes').textContent='TVA 20 % incluse.'+(q.missing.length?' Sous-total des articles renseignés : '+money(q.subtotal)+'. Total : Prix sur demande.':'')+(q.indicative?' Confirmations usine indiquées par article.':'');
  select('.commerce-excluded').textContent='Mobilier RANDAL uniquement. '+(q.excluded.length?q.excluded.length+' autre(s) équipement(s) sans tarif intégré. ':'')+'Revêtements et accessoires sans tarif exclus du total.';
 };
 select('form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;select('.commerce-status').textContent='Vérification…';try{session=await commercialRequest('identify',Object.fromEntries(new FormData(e.target)));account();select('.commerce-status').textContent=session.randalAllowed?'Compte vérifié. Conditions PRO individuelles à raccorder.':'Compte vérifié, accès RANDAL non autorisé.';}catch(e){session=null;account();select('.commerce-status').textContent=e.message;}finally{b.disabled=false;}};
 select('.commerce-logout').onclick=async()=>{try{await commercialRequest('logout');session=null;account();select('.commerce-status').textContent='Vous êtes déconnecté.';}catch(e){select('.commerce-status').textContent=e.message;}};
 commercialRequest('session').then(r=>{session=r;account();}).catch(()=>{select('.commerce-status').textContent='Service LRF indisponible. Le prix public reste disponible.';});
 render();account();return ()=>{clearTimeout(timer);timer=setTimeout(render,120);};
}
