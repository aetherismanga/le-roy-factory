(()=>{
  'use strict';
  if(window.__LRF_DASH_AGENT_AVATAR__)return;
  window.__LRF_DASH_AGENT_AVATAR__=true;

  function install(){
    const topbar=document.querySelector('.crm-topbar');
    if(!topbar||document.getElementById('lrf-agent-avatar'))return;

    const email=String(localStorage.getItem('agentEmail')||'').toLowerCase();
    const name=String(localStorage.getItem('agentName')||'').toLowerCase();
    const isCoryne=email.includes('coryne@')||name.includes('coryne');
    const file=isCoryne?'assets/img/corynelogo.png':'assets/img/jeromelogo.png';
    const label=isCoryne?'Coryne':'Jérôme';

    const avatar=document.createElement('img');
    avatar.id='lrf-agent-avatar';
    avatar.src=file;
    avatar.alt=`Avatar de ${label}`;
    avatar.loading='eager';
    avatar.decoding='async';
    avatar.setAttribute('aria-label',`Profil de ${label}`);
    topbar.appendChild(avatar);

    if(!document.getElementById('lrf-agent-avatar-style')){
      const style=document.createElement('style');
      style.id='lrf-agent-avatar-style';
      style.textContent=`
        html body.crm-body .crm-topbar{position:relative!important}
        #lrf-agent-avatar{
          position:absolute;
          top:12px;
          right:14px;
          width:74px;
          height:74px;
          object-fit:cover;
          border-radius:50%;
          z-index:6;
          filter:drop-shadow(0 8px 16px rgba(84,54,10,.24));
          transition:transform .18s ease,filter .18s ease;
          user-select:none;
          -webkit-user-drag:none;
        }
        #lrf-agent-avatar:hover{transform:scale(1.04);filter:drop-shadow(0 10px 20px rgba(84,54,10,.3))}
        @media(max-width:760px){
          #lrf-agent-avatar{
            width:62px;
            height:62px;
            top:10px;
            right:10px;
          }
          html body.crm-body .crm-topbar .welcome-box{padding-right:70px!important}
          html body.crm-body #welcome-title{padding-right:0!important}
        }
        @media(max-width:420px){
          #lrf-agent-avatar{width:56px;height:56px;top:9px;right:9px}
          html body.crm-body .crm-topbar .welcome-box{padding-right:62px!important}
        }
      `;
      document.head.appendChild(style);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('lrf-agent-auth-ready',()=>setTimeout(install,0),{once:true});
})();
