// Public catalogue projections contain no purchase rates. Only a live verified
// Firebase agent can obtain the private enrichment, which stays in memory.
const ADMINS=new Set(['jerome@leroyfactory.fr','coryne@leroyfactory.fr']);
const ENDPOINT='https://randal-catalogue-general-3d.vercel.app/api/agent-tariffs';
let verified=false,elios=Object.create(null),view=[],epoch=0,currentAuth=null;
const normalise=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const keyFor=(p,f)=>{const value=String(f||'').replaceAll(',','.').replace(/[×*]/g,'x'),m=value.match(/\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?/i);return normalise(p?.slug||p?.id)+'|'+(m?m[0].replace(/\s/g,'').toLowerCase():normalise(value))+'|'+(/20\s*mm/i.test(value)?'20':'standard');};
const safeKey=v=>typeof v==='string'&&v&&v.length<240&&!['__proto__','constructor','prototype'].includes(v);
function clear(){
 verified=false;elios=Object.create(null);view=[];
 for(const p of window.VIEW_CATALOGUE||[])for(const v of p.variants||[])for(const k of ['proPrice','proDetail','proPalette'])delete v[k];
}
function enrich(){
 if(!verified)return;
 const rows=new Map(view.map(r=>[r.productId+'|'+r.variantKey,r]));
 for(const p of window.VIEW_CATALOGUE||[])for(const v of p.variants||[]){const row=rows.get(p.id+'|'+v.key);if(row)for(const k of ['proPrice','proDetail','proPalette'])if(Number.isFinite(row[k]))v[k]=row[k];}
}
function redraw(){
 enrich();
 if(!verified){
  for(const node of document.querySelectorAll('.view-safe-price'))node.textContent='Connexion agent requise';
  const box=document.getElementById('product-modal-v2-card');
  if(box?.querySelector('[data-view-gallery],.view-safe-stage')){document.getElementById('product-modal-v2')?.classList.remove('open');box.innerHTML='';document.body.style.overflow='';}
 }
 window.dispatchEvent(new CustomEvent('lrf-agent-tariffs-ready',{detail:{verified}}));window.dispatchEvent(new CustomEvent('lrf-pro-session-changed'));
 const modal=document.getElementById('product-modal-v2-card'),title=modal?.querySelector('h2')?.textContent;
 const product=(window.ELIOS_CATALOGUE||[]).find(p=>p.name===title);if(!product)return;
 for(const row of modal.querySelectorAll('.formats-table tbody tr')){const cells=row.querySelectorAll('td');if(cells.length<2)continue;const q=window.LRF_AGENT_TARIFFS.eliosPrice(product,cells[0].textContent);cells[1].textContent=q.locked?'Connexion agent requise':q.label||'Sur demande';}
}
Object.defineProperty(window,'LRF_AGENT_TARIFFS',{value:Object.freeze({get verified(){return verified;},eliosPrice(product,format){if(!verified)return {locked:true};const k=keyFor(product,format);return safeKey(k)&&Object.hasOwn(elios,k)?elios[k]:{unavailable:true};}}),configurable:false,writable:false});
const config={apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory'};
async function connect(){
 const [apps,auths]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]);
 const auth=auths.getAuth(apps.getApps().length?apps.getApp():apps.initializeApp(config));currentAuth=auth;
 auths.onAuthStateChanged(auth,async user=>{
  const id=++epoch;clear();redraw();
  if(!user||user.emailVerified!==true||!ADMINS.has(String(user.email||'').toLowerCase()))return;
  try{
   const token=await user.getIdToken(true),response=await fetch(ENDPOINT,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'bootstrap'}),signal:AbortSignal.timeout(15000)}),data=await response.json();
   if(id!==epoch||!response.ok||data.success!==true||data.version!==1||!Array.isArray(data.view)||!data.elios||typeof data.elios!=='object')return;
   elios=Object.assign(Object.create(null),data.elios);view=data.view;verified=true;redraw();
  }catch{if(id===epoch){clear();redraw();}}
 });
}
window.addEventListener('lrf-view-tariff-updated',enrich);
document.addEventListener('click',async event=>{
 const anchor=event.target.closest?.('a[href]');if(!anchor)return;
 let path;try{path=decodeURIComponent(new URL(anchor.href,location.href).pathname);}catch{return;}
 if(!path.endsWith('/assets/pdf/RANDAL-STUDIO-ONE-VASQUES-TARIF-PRO-HT.pdf'))return;
 event.preventDefault();event.stopImmediatePropagation();
 const user=currentAuth?.currentUser;
 if(!user||user.emailVerified!==true||!ADMINS.has(String(user.email||'').toLowerCase())){alert('Ce tarif d’achat est réservé aux agents. Connectez-vous à l’Espace Agent.');return;}
 const popup=window.open('about:blank','_blank');
 try{
  const token=await user.getIdToken(true),response=await fetch(ENDPOINT,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'document',id:'randal-studio-one-basins'}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Le document agent n’est pas disponible. Réessayez après connexion.');
  const url=URL.createObjectURL(await response.blob());if(popup)popup.location.replace(url);else location.href=url;setTimeout(()=>URL.revokeObjectURL(url),300000);
 }catch(error){popup?.close();alert(error.message||'Le document agent n’est pas disponible.');}
},true);
connect().catch(()=>{clear();redraw();});
