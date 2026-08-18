// Navigation optimisée pour l'application Android LE ROY FACTORY.
(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(!native)return;

  const page=(location.pathname.split('/').pop()||'').toLowerCase();

  const style=document.createElement('style');
  style.textContent=`
    html.lrf-native-app body.crm-body{padding-bottom:22px!important}
    html.lrf-native-app .lrf-mobile-actions{display:none!important}
    html.lrf-native-app #lrf-mobile-fab{bottom:18px!important}
    html.lrf-native-app .lrf-mobile-action-sheet{bottom:82px!important;right:14px!important;max-height:62vh!important;overflow:auto!important}
    html.lrf-native-app body[data-lrf-page="clients"] .stats-grid{display:none!important}
    #lrf-tarifs-back{position:fixed;top:14px;left:14px;z-index:200000;width:48px;height:48px;border-radius:14px;border:1px solid #D4AF37;background:#111;color:#FFD700;font-size:1.35rem;box-shadow:0 7px 20px rgba(0,0,0,.2)}
    html.lrf-native-app body[data-lrf-page="tarifs-pro"] main{padding-top:62px!important}
  `;
  document.head.appendChild(style);

  function removeProspectLinks(){
    document.querySelectorAll('.sidebar-menu li').forEach(li=>{
      const a=li.querySelector('a');
      const txt=(a?.textContent||'').trim().toLowerCase();
      const href=(a?.getAttribute('href')||'').toLowerCase();
      if(txt==='prospects'||href.includes('filter=prospect'))li.remove();
    });
  }

  function addTarifsPro(){
    const menu=document.querySelector('.sidebar-menu');
    if(!menu||menu.querySelector('[data-lrf-tarifs-pro]'))return;
    const items=[...menu.querySelectorAll('li')];
    const ref=items.find(li=>/fabricants|partenaires/.test((li.textContent||'').toLowerCase())) || items.find(li=>/catalogues/.test((li.textContent||'').toLowerCase()));
    const li=document.createElement('li');
    li.dataset.lrfTarifsPro='1';
    li.innerHTML='<a href="tarifs-pro.html"><span class="icon">💶</span><span class="menu-text">Tarifs pro</span></a>';
    if(ref)ref.insertAdjacentElement('afterend',li); else menu.appendChild(li);
  }

  function simplifyClients(){
    if(page!=='clients.html')return;
    document.querySelector('.stats-grid')?.remove();
    document.getElementById('nav-prospects')?.closest('li')?.remove();
  }

  function rebuildQuickActions(){
    document.querySelector('.lrf-mobile-actions')?.remove();
    const fab=document.getElementById('lrf-mobile-fab');
    const sheet=document.querySelector('.lrf-mobile-action-sheet');
    if(!fab||!sheet)return;
    sheet.innerHTML=`
      <a href="clients.html?action=new-client"><span>➕</span><span>Nouveau client</span></a>
      <a href="mails-groupes.html"><span>✉️</span><span>Envoyer un mail</span></a>
      <a href="comptes-rendus.html"><span>📝</span><span>Compte-rendu</span></a>
      <a href="agenda.html"><span>📅</span><span>Agenda</span></a>
      <a href="carte.html"><span>🗺️</span><span>Carte</span></a>`;
  }

  function unlockTarifs(){
    if(page!=='tarifs-pro.html')return;
    const login=document.getElementById('login-section');
    const content=document.getElementById('pro-content');
    if(login)login.style.display='none';
    if(content)content.style.display='block';
    try{if(typeof window.renderTarifs==='function')window.renderTarifs();else if(typeof renderTarifs==='function')renderTarifs();}catch(e){console.warn('Tarifs pro',e)}
    document.querySelector('header')?.remove();
    document.querySelector('footer')?.remove();
    if(!document.getElementById('lrf-tarifs-back')){
      const back=document.createElement('button');back.id='lrf-tarifs-back';back.type='button';back.textContent='←';back.setAttribute('aria-label','Retour au CRM');back.onclick=()=>location.href='dashboard.html';document.body.appendChild(back);
    }
  }

  function apply(){removeProspectLinks();addTarifsPro();simplifyClients();rebuildQuickActions();unlockTarifs();}
  apply();
  let n=0;const timer=setInterval(()=>{n++;apply();if(n>40)clearInterval(timer)},150);
})();
