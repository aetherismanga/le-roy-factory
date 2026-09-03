(()=>{
  'use strict';
  if(window.__LRF_CRM_RADIO__)return;
  window.__LRF_CRM_RADIO__=true;

  const STATIONS=[
    {id:'bfm-business',name:'BFM Business',tag:'INFO & ÉCO',stream:'https://audio.bfmtv.com/bfmbusiness_128.mp3'},
    {id:'europe1',name:'Europe 1',tag:'INFO & DÉBATS',stream:'https://europe1.lmn.fm/europe1.mp3'},
    {id:'cherie-fm',name:'Chérie FM',tag:'MUSIQUE',stream:'https://streaming.nrjaudio.fm/ouuku85n3nje?origine=fluxradios'},
    {id:'fun-radio',name:'Fun Radio',tag:'MUSIQUE',stream:'https://icecast.funradio.fr/fun-1-44-128'},
    {id:'rire-chansons',name:'Rire & Chansons',tag:'HUMOUR',stream:'https://streaming.nrjaudio.fm/oug7girb92oc?origine=fluxradios'}
  ];

  let currentId='';
  let panel=null;
  let audio=null;

  function installCss(){
    if(document.getElementById('lrf-crm-radio-css'))return;
    const style=document.createElement('style');
    style.id='lrf-crm-radio-css';
    style.textContent=`
      #lrf-radio-btn{cursor:pointer!important}
      #lrf-radio-btn .lrf-radio-mini{display:flex;align-items:center;gap:7px;font-weight:800;white-space:nowrap}
      #lrf-radio-btn .lrf-radio-dot{width:8px;height:8px;border-radius:50%;background:#d5a126;box-shadow:0 0 0 3px rgba(213,161,38,.16)}
      #lrf-radio-btn.playing .lrf-radio-dot{background:#13ad78;box-shadow:0 0 0 4px rgba(19,173,120,.16)}
      .lrf-radio-panel{position:fixed;z-index:2147483000;width:min(390px,calc(100vw - 20px));background:rgba(255,253,248,.985);border:1px solid rgba(205,155,35,.5);border-radius:22px;box-shadow:0 24px 60px rgba(64,43,13,.22);padding:14px;color:#211d16}
      .lrf-radio-panel[hidden]{display:none!important}
      .lrf-radio-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(188,145,44,.22)}
      .lrf-radio-head strong{font-size:16px}.lrf-radio-close{width:34px;height:34px;border:0;border-radius:50%;background:#171713;color:#f5bb2f;font-size:20px;cursor:pointer}
      .lrf-radio-list{display:grid;gap:8px}.lrf-radio-station{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;border:1px solid rgba(191,150,56,.27);background:linear-gradient(180deg,#fffefa,#faf1df);border-radius:15px;padding:11px 12px}
      .lrf-radio-station.active{border-color:#c89416;box-shadow:0 0 0 2px rgba(210,164,48,.12) inset}
      .lrf-radio-name{display:flex;flex-direction:column;gap:2px}.lrf-radio-name b{font-size:14px}.lrf-radio-name span{font-size:10px;font-weight:800;color:#8a6a25;letter-spacing:.05em}
      .lrf-radio-play{border:1px solid #d0a238;border-radius:999px;background:linear-gradient(180deg,#f7cf66,#e8aa18);color:#17130a;font-weight:900;padding:8px 11px;cursor:pointer;min-width:76px}
      .lrf-radio-play.playing{background:linear-gradient(180deg,#31c99b,#169f78);border-color:#118963;color:white}
      .lrf-radio-footer{display:flex;align-items:center;gap:10px;margin-top:11px;padding-top:10px;border-top:1px solid rgba(188,145,44,.2)}
      .lrf-radio-footer span{font-size:11px;font-weight:700;color:#6f6250}.lrf-radio-volume{flex:1;accent-color:#d6a629}
      @media(max-width:760px){
        #lrf-radio-btn{display:none!important}
        .lrf-radio-panel{left:10px!important;right:10px!important;bottom:18px!important;top:auto!important;width:auto!important;max-height:72vh;overflow:auto;padding:14px;border-radius:22px}
        #lrf-agent-avatar{cursor:pointer!important}
        #lrf-agent-avatar:active{transform:scale(.96)!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureAudio(){
    if(audio)return audio;
    audio=document.createElement('audio');
    audio.id='lrf-crm-radio-audio';
    audio.preload='none';
    audio.volume=.75;
    document.body.appendChild(audio);
    audio.addEventListener('playing',syncUi);
    audio.addEventListener('pause',syncUi);
    audio.addEventListener('error',()=>{
      const status=panel?.querySelector(`[data-radio-status="${currentId}"]`);
      if(status)status.textContent='Indisponible';
      syncUi();
    });
    return audio;
  }

  function ensurePanel(){
    if(panel)return panel;
    panel=document.createElement('section');
    panel.id='lrf-radio-panel';
    panel.className='lrf-radio-panel';
    panel.hidden=true;
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Radios en direct');
    panel.innerHTML=`
      <div class="lrf-radio-head"><strong>📻 Radios en direct</strong><button type="button" class="lrf-radio-close" aria-label="Fermer">×</button></div>
      <div class="lrf-radio-list">
        ${STATIONS.map(s=>`<div class="lrf-radio-station" data-radio-card="${s.id}"><div class="lrf-radio-name"><b>${s.name}</b><span data-radio-status="${s.id}">${s.tag}</span></div><button type="button" class="lrf-radio-play" data-radio-play="${s.id}">▶ Écouter</button></div>`).join('')}
      </div>
      <div class="lrf-radio-footer"><span>Volume</span><input class="lrf-radio-volume" type="range" min="0" max="1" step="0.05" value="0.75" aria-label="Volume radio"><span id="lrf-radio-now">Prêt</span></div>`;
    document.body.appendChild(panel);
    panel.querySelector('.lrf-radio-close').addEventListener('click',()=>togglePanel(false));
    panel.querySelectorAll('[data-radio-play]').forEach(btn=>btn.addEventListener('click',()=>playStation(btn.dataset.radioPlay)));
    panel.querySelector('.lrf-radio-volume').addEventListener('input',e=>{ensureAudio().volume=Number(e.target.value);});
    return panel;
  }

  function ensureDesktopButton(){
    const host=document.querySelector('.info-widgets.lrf-premium-status,.info-widgets');
    if(!host||document.getElementById('lrf-radio-btn'))return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='lrf-radio-btn';
    btn.className='lrf-status-btn';
    btn.setAttribute('aria-haspopup','dialog');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<span class="lrf-radio-mini"><span class="lrf-radio-dot"></span><span>📻 Radio</span></span>';
    const calendar=host.querySelector('#lrf-calendar-btn');
    if(calendar)host.insertBefore(btn,calendar);else host.prepend(btn);
    btn.addEventListener('click',e=>{e.stopPropagation();togglePanel();});
  }

  function positionPanel(){
    if(!panel||panel.hidden||innerWidth<=760)return;
    const btn=document.getElementById('lrf-radio-btn');
    if(!btn)return;
    const r=btn.getBoundingClientRect();
    panel.style.top=`${Math.min(innerHeight-panel.offsetHeight-12,r.bottom+10)}px`;
    panel.style.left=`${Math.max(12,Math.min(innerWidth-panel.offsetWidth-12,r.left))}px`;
    panel.style.right='auto';
    panel.style.bottom='auto';
  }

  function togglePanel(force){
    ensurePanel();
    const open=typeof force==='boolean'?force:panel.hidden;
    panel.hidden=!open;
    document.getElementById('lrf-radio-btn')?.setAttribute('aria-expanded',String(open));
    if(open)requestAnimationFrame(positionPanel);
  }

  async function playStation(id){
    const station=STATIONS.find(s=>s.id===id);if(!station)return;
    const a=ensureAudio();
    if(currentId===id&&!a.paused){a.pause();return;}
    currentId=id;
    panel?.querySelectorAll('[data-radio-status]').forEach(el=>{const s=STATIONS.find(x=>x.id===el.dataset.radioStatus);if(s)el.textContent=s.tag;});
    const status=panel?.querySelector(`[data-radio-status="${id}"]`);if(status)status.textContent='Connexion…';
    a.pause();a.src=station.stream;a.load();
    try{await a.play();}catch(_){if(status)status.textContent='Direct indisponible';}
    syncUi();
  }

  function syncUi(){
    if(!panel)return;
    const playing=audio&&currentId&&!audio.paused&&!audio.ended;
    panel.querySelectorAll('[data-radio-card]').forEach(card=>{
      const id=card.dataset.radioCard,on=playing&&id===currentId;
      card.classList.toggle('active',on);
      const btn=card.querySelector('.lrf-radio-play');if(btn){btn.classList.toggle('playing',on);btn.textContent=on?'❚❚ Pause':'▶ Écouter';}
      const status=card.querySelector('[data-radio-status]');const s=STATIONS.find(x=>x.id===id);if(status&&s)status.textContent=on?'EN DIRECT':s.tag;
    });
    const now=panel.querySelector('#lrf-radio-now');if(now)now.textContent=playing?(STATIONS.find(s=>s.id===currentId)?.name||'En direct'):'Prêt';
    document.getElementById('lrf-radio-btn')?.classList.toggle('playing',!!playing);
  }

  function bindAvatar(){
    document.addEventListener('click',e=>{
      const avatar=e.target.closest('#lrf-agent-avatar');
      if(avatar&&innerWidth<=760){e.preventDefault();e.stopPropagation();togglePanel();return;}
      if(panel&&!panel.hidden&&!panel.contains(e.target)&&!e.target.closest('#lrf-radio-btn')&&!e.target.closest('#lrf-agent-avatar'))togglePanel(false);
    },true);
  }

  function install(){
    installCss();ensurePanel();ensureDesktopButton();bindAvatar();
    const observer=new MutationObserver(()=>ensureDesktopButton());
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',positionPanel,{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
