// Clients CRM — retire l'ancien import Moovago et ajoute le planificateur de tournées.
function injectStyle(){
  if(document.getElementById('lrf-tournee-client-style'))return;
  const s=document.createElement('style');s.id='lrf-tournee-client-style';s.textContent=`
    #btn-import-moovago,#moovago-overlay{display:none!important}
    #btn-create-tournee{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;min-height:44px;padding:.65rem 1rem;border-radius:11px;border:1px solid #118b82;background:linear-gradient(180deg,#37c6bd,#159c91 55%,#087d76);color:#fff;text-decoration:none;font-weight:850;box-shadow:inset 0 1px rgba(255,255,255,.48),0 7px 15px rgba(13,133,124,.2)}
    #btn-create-tournee:hover{transform:translateY(-1px);filter:brightness(1.03)}
    @media(max-width:900px){#btn-create-tournee{width:100%}}
  `;document.head.appendChild(s);
}
function removeMoovago(){document.getElementById('btn-import-moovago')?.remove();document.getElementById('moovago-overlay')?.remove();}
function addTourButton(){
  const add=document.getElementById('btn-add-client');if(!add||document.getElementById('btn-create-tournee'))return;
  const a=document.createElement('a');a.id='btn-create-tournee';a.href='tournees.html';a.textContent='🧭 Créer une tournée';add.insertAdjacentElement('afterend',a);
}
function addSidebarLink(){
  const menu=document.querySelector('.sidebar-menu');if(!menu||menu.querySelector('a[href="tournees.html"]'))return;
  const agenda=menu.querySelector('a[href="agenda.html"]')?.closest('li');const li=document.createElement('li');li.innerHTML='<a href="tournees.html"><span class="icon">🧭</span><span class="menu-text">Tournées</span></a>';agenda?.insertAdjacentElement('afterend',li);
}
function refresh(){injectStyle();removeMoovago();addTourButton();addSidebarLink();}
function init(){refresh();let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(refresh,25)}).observe(document.body,{childList:true,subtree:true});setTimeout(refresh,300);setTimeout(refresh,1000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
