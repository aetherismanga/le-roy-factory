import {quoteProject,money} from './pricing.js';
import {storeQuote} from './flow.js';
export function bindQuoteReturn(link,getProject,storage,onError=()=>{}){
 link.onclick=e=>{try{storeQuote(storage,getProject(),'scene');}catch(error){e.preventDefault();onError(error);}};
}
export function mountCommerce(getProject){
 const host=document.createElement('section');host.className='studio-commerce setting-section';
 host.innerHTML='<span class="commerce-label">Prix public TTC · mobilier RANDAL</span><strong class="commerce-total"></strong><small class="commerce-excluded"></small><p class="commerce-status" role="status"></p>';
 document.querySelector('#settings .panel-heading').after(host);
 const total=host.querySelector('.commerce-total'),excluded=host.querySelector('.commerce-excluded'),status=host.querySelector('.commerce-status');
 const link=document.querySelector('#back-to-quote');
 if(link)bindQuoteReturn(link,getProject,localStorage,()=>{status.textContent='Le devis ne peut pas être conservé sur cet appareil. Enregistrez ou exportez votre projet avant de quitter la 3D.';});
 let last='',timer;
 const render=()=>{const project=getProject(),key=JSON.stringify(project.items);if(key===last)return;last=key;const q=quoteProject(project);total.textContent=money(q.publicTTC);excluded.textContent=q.excluded.length?q.excluded.length+' élément(s) sans tarif, hors montant mobilier. Voir le récapitulatif.':'TVA 20 % incluse. Détail dans le récapitulatif.';};
 render();return ()=>{if(timer)return;timer=setTimeout(()=>{timer=null;render();},120);};
}
