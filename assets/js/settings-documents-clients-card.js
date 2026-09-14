(() => {
  function install(){
    if(!location.pathname.toLowerCase().endsWith('parametres.html')) return;
    const grid=document.querySelector('.settings-grid');
    if(!grid || grid.querySelector('[data-lrf-client-documents]')) return;
    const card=document.createElement('a');
    card.className='settings-folder';
    card.href='documents-clients.html';
    card.dataset.lrfClientDocuments='1';
    card.setAttribute('aria-label','Ouvrir Documents clients');
    card.innerHTML='<div class="settings-folder-top"><div class="settings-folder-icon">📁</div><span class="settings-badge">Clients</span></div><h3>Documents clients</h3><p>Recherchez un client et classez ses Kbis, RIB, attestations TVA, devis, images, tableaux et autres documents privés.</p><div class="settings-folder-open"><span>Ouvrir</span><span>→</span></div>';
    const usine=[...grid.querySelectorAll('.settings-folder')].find(a=>(a.getAttribute('href')||'').includes('document-usines.html'));
    if(usine) grid.insertBefore(card,usine); else grid.appendChild(card);
    const count=document.querySelector('.settings-count');
    if(count) count.textContent=`${grid.querySelectorAll('.settings-folder').length} DOSSIERS`;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  window.addEventListener('pageshow',install);
  setTimeout(install,350);
})();