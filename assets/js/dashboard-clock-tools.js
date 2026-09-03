(()=>{
  'use strict';
  if(window.__LRF_DASH_CLOCK_TOOLS_V2__)return;
  window.__LRF_DASH_CLOCK_TOOLS_V2__=true;

  const pad=n=>String(n).padStart(2,'0');
  const nowTime=()=>new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  let audioCtx=null,localAudio=null,alarmTimer=null;
  let swStart=0,swElapsed=0,swRaf=null;
  let remaining=0,timerEnd=0,timerId=null;

  function installCss(){
    if(!document.getElementById('lrf-dashboard-clock-tools-css')){
      const link=document.createElement('link');
      link.id='lrf-dashboard-clock-tools-css';link.rel='stylesheet';
      link.href='assets/css/dashboard-clock-tools.css?v=20260903-3';
      document.head.appendChild(link);
    }
    if(!document.getElementById('lrf-dashboard-clock-fix-css')){
      const style=document.createElement('style');
      style.id='lrf-dashboard-clock-fix-css';
      style.textContent=`
        html body.crm-body .crm-topbar{overflow:visible!important}
        html body.crm-body .lrf-clock-popover{position:fixed!important;z-index:2147483000!important}
        @media(max-width:760px){
          html body.crm-body .crm-main-content{padding-top:8px!important}
          html body.crm-body .crm-topbar{margin-top:0!important;padding:14px 12px!important;align-items:center!important;text-align:center!important;gap:12px!important}
          html body.crm-body .crm-topbar .welcome-box{width:100%!important;padding-left:0!important;border-left:0!important;text-align:center!important}
          html body.crm-body #welcome-title{justify-content:center!important;text-align:center!important;width:100%!important;margin:0 auto 5px!important}
          html body.crm-body .crm-topbar .welcome-box p{text-align:center!important;margin:0 auto!important;max-width:94%!important}
          html body.crm-body .info-widgets.lrf-premium-status{width:100%!important;justify-content:center!important;gap:7px!important;margin:0 auto!important}
          html body.crm-body .lrf-status-btn,html body.crm-body .lrf-weather-chip{flex:0 1 auto!important;min-width:82px!important;height:54px!important;padding:7px 10px!important}
          html body.crm-body .lrf-status-copy{display:none!important}
          html body.crm-body .lrf-digital-screen{min-width:112px!important;font-size:21px!important}
          html body.crm-body .lrf-wave-hand{width:34px!important;height:34px!important;flex-basis:34px!important}
        }
      `;
      document.head.appendChild(style);
    }
  }

  function installWelcomeHand(){
    const title=document.getElementById('welcome-title');
    if(!title)return;
    const firstName=(localStorage.getItem('agentName')||'Jérôme').split(' ')[0];
    const hasHand=title.querySelector('.lrf-wave-hand');
    if(hasHand)return;
    title.textContent=`Bonjour ${firstName} `;
    const hand=document.createElement('span');
    hand.className='lrf-wave-hand';
    hand.setAttribute('aria-label','Bonjour');hand.setAttribute('role','img');
    title.appendChild(hand);
  }

  function popMarkup(){
    return `<div class="lrf-clock-head"><strong>⏱ Outils de l’horloge</strong><button class="lrf-clock-close" id="lrf-clock-close" type="button" aria-label="Fermer">×</button></div>
      <div class="lrf-tool-tabs" role="tablist">
        <button class="lrf-tool-tab active" data-tool="alarm" type="button"><span>⏰</span>Alarme</button>
        <button class="lrf-tool-tab" data-tool="stopwatch" type="button"><span>⏱️</span>Chronomètre</button>
        <button class="lrf-tool-tab" data-tool="timer" type="button"><span>⌛</span>Minuterie</button>
      </div>
      <section class="lrf-tool-panel" data-panel="alarm">
        <h4>Régler une alarme</h4>
        <div class="lrf-tool-row"><input id="lrf-alarm-time" type="time" aria-label="Heure de l’alarme"><select id="lrf-alarm-sound" aria-label="Son de l’alarme"><option value="chime">Carillon doré</option><option value="bell">Cloche classique</option><option value="digital">Bip numérique</option><option value="soft">Son doux</option></select></div>
        <div class="lrf-tool-row"><input id="lrf-alarm-file" type="file" accept="audio/*" aria-label="Choisir une musique personnelle"></div>
        <div class="lrf-tool-row"><button class="lrf-tool-btn" id="lrf-alarm-set" type="button">Activer l’alarme</button><button class="lrf-tool-btn secondary" id="lrf-alarm-test" type="button">Tester le son</button><button class="lrf-tool-btn secondary" id="lrf-alarm-cancel" type="button">Annuler</button></div>
        <div class="lrf-alarm-status" id="lrf-alarm-status">Aucune alarme active.</div>
        <p class="lrf-tool-note">Choisis un son intégré ou une musique depuis ton appareil. L’alarme fonctionne tant que le CRM reste ouvert.</p>
      </section>
      <section class="lrf-tool-panel" data-panel="stopwatch" hidden>
        <h4>Chronomètre</h4><div class="lrf-tool-display" id="lrf-sw-display">00:00:00.00</div>
        <div class="lrf-tool-row"><button class="lrf-tool-btn" id="lrf-sw-start" type="button">Démarrer</button><button class="lrf-tool-btn secondary" id="lrf-sw-pause" type="button">Pause</button><button class="lrf-tool-btn secondary" id="lrf-sw-reset" type="button">Remise à zéro</button></div>
      </section>
      <section class="lrf-tool-panel" data-panel="timer" hidden>
        <h4>Minuterie</h4>
        <div class="lrf-tool-row"><input class="lrf-number" id="lrf-timer-h" type="number" min="0" max="23" value="0" aria-label="Heures"><span>h</span><input class="lrf-number" id="lrf-timer-m" type="number" min="0" max="59" value="5" aria-label="Minutes"><span>min</span><input class="lrf-number" id="lrf-timer-s" type="number" min="0" max="59" value="0" aria-label="Secondes"><span>s</span></div>
        <div class="lrf-tool-display" id="lrf-timer-display">00:05:00</div>
        <div class="lrf-tool-row"><button class="lrf-tool-btn" id="lrf-timer-start" type="button">Démarrer</button><button class="lrf-tool-btn secondary" id="lrf-timer-pause" type="button">Pause</button><button class="lrf-tool-btn secondary" id="lrf-timer-reset" type="button">Remise à zéro</button></div>
      </section>`;
  }

  function ensureUi(){
    const host=document.querySelector('.info-widgets');
    if(!host)return false;
    if(!host.querySelector('#lrf-clock-btn')){
      host.classList.add('lrf-premium-status');
      host.innerHTML=`
        <button class="lrf-status-btn" id="lrf-calendar-btn" type="button" aria-label="Ouvrir le calendrier"><span class="lrf-status-icon">📅</span><span class="lrf-status-copy"><strong>Calendrier</strong><span class="lrf-date-long" id="current-date">--</span></span></button>
        <button class="lrf-status-btn" id="lrf-clock-btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="lrf-clock-popover"><span class="lrf-status-copy"><strong>Horloge</strong></span><span class="lrf-digital-screen" id="current-time">--:--</span></button>
        <div class="lrf-weather-chip" aria-label="Météo actuelle"><span class="lrf-status-icon">🌤️</span><span class="lrf-status-copy"><strong>26°C</strong><span>Ensoleillé</span></span></div>`;
    }
    let pop=document.getElementById('lrf-clock-popover');
    if(!pop){pop=document.createElement('div');pop.id='lrf-clock-popover';pop.className='lrf-clock-popover';pop.hidden=true;pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Outils horloge');pop.innerHTML=popMarkup();document.body.appendChild(pop);}
    else if(pop.parentElement!==document.body)document.body.appendChild(pop);
    return true;
  }

  function updateDateTime(){
    const now=new Date(),time=document.getElementById('current-time'),date=document.getElementById('current-date');
    if(time)time.textContent=now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    if(date){let d=now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});date.textContent=d.charAt(0).toUpperCase()+d.slice(1);}
  }

  function positionPop(){
    const btn=document.getElementById('lrf-clock-btn'),pop=document.getElementById('lrf-clock-popover');if(!btn||!pop)return;
    const r=btn.getBoundingClientRect(),mobile=innerWidth<=760;
    pop.style.top=`${Math.min(innerHeight-120,Math.max(74,r.bottom+10))}px`;
    if(mobile){pop.style.left='10px';pop.style.right='10px';pop.style.width='auto';}
    else{pop.style.left='auto';pop.style.right=`${Math.max(12,innerWidth-r.right)}px`;pop.style.width='min(430px, 92vw)';}
  }

  const ensureAudio=()=>audioCtx||(audioCtx=new (window.AudioContext||window.webkitAudioContext)());
  function playTone(kind='chime'){
    try{const ctx=ensureAudio();if(ctx.state==='suspended')ctx.resume();const patterns={chime:[[659,.18],[880,.22],[1047,.34]],bell:[[784,.25],[1175,.35],[1568,.45]],digital:[[880,.12],[880,.12],[1175,.18]],soft:[[523,.3],[659,.3],[784,.42]]};let t=ctx.currentTime;(patterns[kind]||patterns.chime).forEach(([freq,dur])=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=kind==='digital'?'square':'sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.18,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);osc.connect(gain).connect(ctx.destination);osc.start(t);osc.stop(t+dur+.03);t+=dur*.78;});}catch(_){}}
  function ring(){if(localAudio){try{localAudio.currentTime=0;localAudio.play();return;}catch(_){}}playTone(document.getElementById('lrf-alarm-sound')?.value||'chime');}
  function fmtMs(ms){const cs=Math.floor(ms/10)%100,s=Math.floor(ms/1000)%60,m=Math.floor(ms/60000)%60,h=Math.floor(ms/3600000);return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`;}
  function swTick(){const el=document.getElementById('lrf-sw-display');if(el)el.textContent=fmtMs(swElapsed+(performance.now()-swStart));swRaf=requestAnimationFrame(swTick);}
  function renderTimer(){const el=document.getElementById('lrf-timer-display'),sec=Math.max(0,Math.ceil(remaining/1000)),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;if(el)el.textContent=`${pad(h)}:${pad(m)}:${pad(s)}`;}
  function timerTick(){remaining=Math.max(0,timerEnd-Date.now());renderTimer();if(remaining<=0){clearInterval(timerId);timerId=null;ring();}}

  function bindDelegatedEvents(){
    if(window.__LRF_DASH_CLOCK_EVENTS__)return;window.__LRF_DASH_CLOCK_EVENTS__=true;
    document.addEventListener('click',e=>{
      if(e.target.closest('#lrf-calendar-btn')){location.href='agenda.html';return;}
      const pop=document.getElementById('lrf-clock-popover');
      if(e.target.closest('#lrf-clock-btn')){if(!pop)return;e.stopPropagation();pop.hidden=!pop.hidden;document.getElementById('lrf-clock-btn')?.setAttribute('aria-expanded',String(!pop.hidden));if(!pop.hidden)positionPop();return;}
      if(e.target.closest('#lrf-clock-close')){if(pop){pop.hidden=true;document.getElementById('lrf-clock-btn')?.setAttribute('aria-expanded','false');}return;}
      const tab=e.target.closest('.lrf-tool-tab');if(tab&&pop?.contains(tab)){const name=tab.dataset.tool;pop.querySelectorAll('.lrf-tool-tab').forEach(t=>t.classList.toggle('active',t===tab));pop.querySelectorAll('.lrf-tool-panel').forEach(p=>p.hidden=p.dataset.panel!==name);return;}
      if(pop&&!pop.hidden&&!pop.contains(e.target)&&!e.target.closest('#lrf-clock-btn')){pop.hidden=true;document.getElementById('lrf-clock-btn')?.setAttribute('aria-expanded','false');}
      if(e.target.closest('#lrf-alarm-test'))ring();
      if(e.target.closest('#lrf-alarm-cancel')){if(alarmTimer)clearTimeout(alarmTimer);alarmTimer=null;const s=document.getElementById('lrf-alarm-status');if(s)s.textContent='Aucune alarme active.';}
      if(e.target.closest('#lrf-alarm-set')){const input=document.getElementById('lrf-alarm-time'),status=document.getElementById('lrf-alarm-status');if(!input?.value)return;const [h,m]=input.value.split(':').map(Number),now=new Date(),target=new Date(now);target.setHours(h,m,0,0);if(target<=now)target.setDate(target.getDate()+1);if(alarmTimer)clearTimeout(alarmTimer);alarmTimer=setTimeout(()=>{ring();alarmTimer=null;if(status)status.textContent='⏰ Alarme déclenchée.';},target-now);if(status)status.textContent=`Alarme réglée pour ${pad(h)}:${pad(m)}.`;}
      if(e.target.closest('#lrf-sw-start')){if(!swRaf){swStart=performance.now();swRaf=requestAnimationFrame(swTick);}}
      if(e.target.closest('#lrf-sw-pause')){if(swRaf){swElapsed+=performance.now()-swStart;cancelAnimationFrame(swRaf);swRaf=null;const el=document.getElementById('lrf-sw-display');if(el)el.textContent=fmtMs(swElapsed);}}
      if(e.target.closest('#lrf-sw-reset')){if(swRaf){cancelAnimationFrame(swRaf);swRaf=null;}swElapsed=0;const el=document.getElementById('lrf-sw-display');if(el)el.textContent='00:00:00.00';}
      if(e.target.closest('#lrf-timer-start')){if(timerId)return;if(remaining<=0){const h=Number(document.getElementById('lrf-timer-h')?.value)||0,m=Number(document.getElementById('lrf-timer-m')?.value)||0,s=Number(document.getElementById('lrf-timer-s')?.value)||0;remaining=(h*3600+m*60+s)*1000;}if(remaining>0){timerEnd=Date.now()+remaining;timerId=setInterval(timerTick,200);timerTick();}}
      if(e.target.closest('#lrf-timer-pause')){if(timerId){remaining=Math.max(0,timerEnd-Date.now());clearInterval(timerId);timerId=null;renderTimer();}}
      if(e.target.closest('#lrf-timer-reset')){if(timerId)clearInterval(timerId);timerId=null;remaining=5*60*1000;const h=document.getElementById('lrf-timer-h'),m=document.getElementById('lrf-timer-m'),s=document.getElementById('lrf-timer-s');if(h)h.value=0;if(m)m.value=5;if(s)s.value=0;renderTimer();}
    },true);
    document.addEventListener('change',e=>{if(e.target?.id==='lrf-alarm-file'){const file=e.target.files?.[0],status=document.getElementById('lrf-alarm-status');if(!file){localAudio=null;return;}localAudio=new Audio(URL.createObjectURL(file));if(status)status.textContent=`Musique choisie : ${file.name}`;}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){const pop=document.getElementById('lrf-clock-popover');if(pop&&!pop.hidden){pop.hidden=true;document.getElementById('lrf-clock-btn')?.setAttribute('aria-expanded','false');}}});
    addEventListener('resize',()=>{const pop=document.getElementById('lrf-clock-popover');if(pop&&!pop.hidden)positionPop();},{passive:true});
  }

  function heal(){installWelcomeHand();ensureUi();updateDateTime();const alarm=document.getElementById('lrf-alarm-time');if(alarm&&!alarm.value)alarm.value=nowTime();if(remaining===0)remaining=5*60*1000;renderTimer();}
  function init(){installCss();heal();bindDelegatedEvents();setInterval(updateDateTime,1000);setTimeout(heal,250);setTimeout(heal,900);setTimeout(heal,1800);let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;heal();},80);}).observe(document.body,{childList:true,subtree:true});}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
