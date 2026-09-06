(()=>{
  'use strict';
  if(window.__LRF_DASH_AGENT_AVATAR__)return;
  window.__LRF_DASH_AGENT_AVATAR__=true;

  function install(){
    const topbar=document.querySelector('.crm-topbar');
    if(!topbar)return;

    const email=String(localStorage.getItem('agentEmail')||'').toLowerCase();
    const name=String(localStorage.getItem('agentName')||'').toLowerCase();
    const isCoryne=email.includes('coryne@')||name.includes('coryne');
    const stamp='20260907-avatar4';
    const file=isCoryne?`assets/img/corynelogo.png?v=${stamp}`:`assets/img/jeromelogo.png?v=${stamp}`;
    const label=isCoryne?'Coryne':'Jérôme';

    let avatar=document.getElementById('lrf-agent-avatar');
    if(!avatar){
      avatar=document.createElement('img');
      avatar.id='lrf-agent-avatar';
      avatar.loading='eager';
      avatar.decoding='async';
      topbar.appendChild(avatar);
    }

    avatar.alt=`Avatar de ${label}`;
    avatar.setAttribute('aria-label',`Profil de ${label}`);
    avatar.src=file;
    avatar.dataset.agent=label.toLowerCase();
    avatar.dataset.fallbackTried='0';

    // Compatibilité avec les anciens déploiements où les avatars étaient à la racine de assets/.
    avatar.onerror=()=>{
      if(avatar.dataset.fallbackTried==='1')return;
      avatar.dataset.fallbackTried='1';
      avatar.src=isCoryne?`assets/corynelogo.png?v=${stamp}`:`assets/jeromelogo.png?v=${stamp}`;
    };

    if(!document.getElementById('lrf-agent-avatar-style')){
      const style=document.createElement('style');
      style.id='lrf-agent-avatar-style';
      style.textContent=`
        html body.crm-body .crm-topbar{position:relative!important;overflow:visible!important}

        #lrf-agent-avatar{
          position:absolute;
          top:8px;
          right:14px;
          width:94px;
          height:94px;
          object-fit:cover;
          border-radius:50%;
          z-index:12;
          filter:drop-shadow(0 9px 18px rgba(84,54,10,.28));
          transition:transform .18s ease,filter .18s ease;
          user-select:none;
          -webkit-user-drag:none;
        }
        #lrf-agent-avatar:hover{
          transform:scale(1.045);
          filter:drop-shadow(0 11px 22px rgba(84,54,10,.34));
        }

        /* Sur ordinateur, le bloc calendrier / horloge / météo se décale à gauche
           et réserve une vraie zone libre pour l'avatar. */
        @media(min-width:761px){
          html body.crm-body .crm-topbar .info-widgets,
          html body.crm-body .crm-topbar .info-widgets.lrf-premium-status{
            margin-right:118px!important;
            max-width:calc(100% - 118px)!important;
          }
        }

        @media(max-width:760px){
          #lrf-agent-avatar{
            width:72px;
            height:72px;
            top:9px;
            right:9px;
          }
          html body.crm-body .crm-topbar .welcome-box{
            padding-right:82px!important;
          }
          html body.crm-body #welcome-title{
            padding-right:0!important;
          }
          html body.crm-body .crm-topbar .info-widgets,
          html body.crm-body .crm-topbar .info-widgets.lrf-premium-status{
            margin-right:0!important;
            max-width:100%!important;
          }
        }

        @media(max-width:420px){
          #lrf-agent-avatar{
            width:66px;
            height:66px;
            top:8px;
            right:8px;
          }
          html body.crm-body .crm-topbar .welcome-box{
            padding-right:74px!important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('lrf-agent-auth-ready',()=>setTimeout(install,0));
})();
