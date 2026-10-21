import {quoteProject,money} from './pricing.js';
import {storeQuote} from './flow.js';
import {createIdentity,escapeHTML} from './identity.js';
export function bindQuoteReturn(link,getProject,storage,onError=()=>{}){link.onclick=e=>{try{storeQuote(storage,getProject(),'scene');}catch(error){e.preventDefault();onError(error);}};}
export function mountCommerce(getProject){
 const host=document.createElement('section');host.className='studio-commerce setting-section';
 host.innerHTML='<span class="commerce-label">Montant composition</span><strong class="commerce-total"></strong><small class="commerce-excluded"></small><a class="commerce-account" href="index.html?view=quote&account=1">Mon compte client LRF</a><p class="commerce-status" role="status"></p>';
 document.querySelector('#settings .panel-heading').after(host);const label=host.querySelector('.commerce-label'),total=host.querySelector('.commerce-total'),excluded=host.querySelector('.commerce-excluded'),status=host.querySelector('.commerce-status');
 for(const link of [document.querySelector('#back-to-quote'),host.querySelector('.commerce-account')])if(link)bindQuoteReturn(link,getProject,localStorage,()=>{status.textContent='Le devis ne peut pas être conservé. Enregistrez ou exportez le projet avant de quitter la 3D.';});
 const identity=createIdentity(getProject,s=>{const q=quoteProject(getProject());label.innerHTML=s.isAdmin?'<strong class="administrator">Administrateur</strong>':escapeHTML(s.client?(s.privateCode||s.client.codeClient):'Votre composition');total.textContent=money(q.publicTTC);excluded.textContent=q.excluded.length?q.excluded.length+' élément(s) sans tarif, hors montant mobilier.':'Mobilier de votre composition.';status.textContent=s.error|| (s.client&&s.randalAllowed===false?'Accès RANDAL non autorisé pour ce compte.':'');});
 let last='',timer;const render=()=>{const project=getProject(),key=JSON.stringify(project.items);if(key===last)return;last=key;const q=quoteProject(project);total.textContent=money(q.publicTTC);excluded.textContent=q.excluded.length?q.excluded.length+' élément(s) sans tarif, hors montant mobilier.':'Mobilier de votre composition.';identity.schedule();};
 addEventListener('focus',()=>identity.refresh());addEventListener('storage',e=>{if(e.key==='studio-one-auth-revision')identity.resync();});identity.load();render();return ()=>{if(timer)return;timer=setTimeout(()=>{timer=null;render();},120);};
}
