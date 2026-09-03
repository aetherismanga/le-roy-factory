(()=>{
  'use strict';
  if(window.__LRF_DASH_CLOCK_TOOLS__)return;
  window.__LRF_DASH_CLOCK_TOOLS__=true;

  const pad=n=>String(n).padStart(2,'0');
  const nowTime=()=>new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});

  const installCss=()=>{
    if(document.getElementById('lrf-dashboard-clock-tools-css'))return;
    const link=document.createElement('link');
    link.id='lrf-dashboard-clock-tools-css';link.rel='stylesheet';
    link.href='assets/css/dashboard-clock-tools.css?v=20260903-1';
    document.head.appendChild(link);
  };

  const installWelcomeHand=()=>{
    const title=document.getElementById('welcome-title');
    if(!title||title.querySelector('.lrf-wave-hand'))return;
    const txt=title.textContent.replace(/👋/g,'').trim();
    title.textContent=txt+' ';
    const hand=document.createElement('span');
    hand.className='lrf-wave-hand';hand.setAttribute('aria-label','Bonjour');hand.setAttribute('role','img');
    title.appendChild(hand);
  };

  const buildUi=()=>{
    const host=document.querySelector('.info-widgets');
    if(!host||host.classList.contains('lrf-premium-status'))return;
    host.classList.add('lrf-premium-status');
    host.innerHTML=`
      <button class="lrf-status-btn" id="lrf-calendar-btn" type="button" aria-label="Ouvrir le calendrier">
        <span class="lrf-status-icon">📅</span>
        <span class="lrf-status-copy"><strong>Calendrier</strong><span class="lrf-date-long" id="current-date">--</span></span>
      </button>
      <button class="lrf-status-btn" id="lrf-clock-btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="lrf-clock-popover">
        <span class="lrf-status-copy"><strong>Horloge</strong></span>
        <span class="lrf-digital-screen" id="current-time">--:--</span>
      </button>
      <div class="lrf-weather-chip" aria-label="Météo actuelle">
        <span class="lrf-status-icon">🌤️</span>
        <span class="lrf-status-copy"><strong>26°C</strong><span>Ensoleillé</span></span>
      </div>
      <div class="lrf-clock-popover" id="lrf-clock-popover" role="dialog" aria-label="Outils horloge" hidden>
        <div class="lrf-clock-head"><strong>⏱ Outils de l’horloge</strong><button class="lrf-clock-close" id="lrf-clock-close" type="button" aria-label="Fermer">×</button></div>
        <div class="lrf-tool-tabs" role="tablist">
          <button class="lrf-tool-tab active" data-tool="alarm" type="button"><span>⏰</span>Alarme</button>
          <button class="lrf-tool-tab" data-tool="stopwatch" type="button"><span>⏱️</span>Chronomètre</button>
          <button class="lrf-tool-tab" data-tool="timer" type="button"><span>⌛</span>Minuterie</button>
        </div>
        <section class="lrf-tool-panel" data-panel="alarm">
          <h4>Régler une alarme</h4>
          <div class="lrf-tool-row"><input id="lrf-alarm-time" type="time" aria-label="Heure de l’alarme"><select id="lrf-alarm-sound" aria-label="Son de l’alarme"><option value="chime">Carillon doré</option><option value="bell">Cloche classique</option><option value="digital">Bip digital</option><option value="soft">Son doux</option></select></div>
          <div class="lrf-tool-row"><input id="lrf-alarm-file" type="file" accept="audio/*" aria-label="Choisir une musique personnelle"></div>
          <div class="lrf-tool-row"><button class="lrf-tool-btn" id="lrf-alarm-set" type="button">Activer l’alarme</button><button class="lrf-tool-btn secondary" id="lrf-alarm-test" type="button">Tester le son</button><button class="lrf-tool-btn secondary" id="lrf-alarm-cancel" type="button">Annuler</button></div>
          <div class="lrf-alarm-status" id="lrf-alarm-status">Aucune alarme active.</div>
          <p class="lrf-tool-note">L’alarme sonne tant que le tableau de bord reste ouvert dans le navigateur. Vous pouvez utiliser un son intégré ou choisir votre propre fichier audio.</p>
        </section>
        <section class="lrf-tool-panel" data-panel="stopwatch" hidden>
          <h4>Chronomètre</h4><div class="lrf-tool-display" id="lrf-sw-display">00:00:00.00</div>
          <div class="lrf-tool-row"><button class="lrf-tool-btn" id="lrf-sw-start" type="button">Démarrer</button><button class="lrf-tool-btn secondary" id="lrf-sw-pause" type="button">Pause</button><button class="lrf-tool-btn secondary" id="lrf-sw-reset" type="button">Remise à zéro</button></div>
        </section>
        <section class="lrf-tool-panel" data-panel="timer" hidden>
          <h4>Minuterie</h4>
          <div class="lrf-tool-row"><input class="lrf-number" id="lrf-timer-h" type="number" min="0" max="23" value="0" aria-label="Heures"><span>h</span><input class="lrf-number" id="lrf-timer-m" type="number" min="0" max="59" value="5" aria-label="Minutes"><span>min</span><input class="lrf-number" id="lrf-timer-s" type="number" min="0" max="59" value="0" aria-label="Secondes"><span>s</span></div>
          <div class="lrf-tool-display" id="lrf-timer-display">00:00:00</div>
          <div class="lrf-tool-row"><button class="lrf-tool-btn" id="lrf-timer-start" type="button">Démarrer</button><button class="lrf-tool-btn secondary" id="lrf-timer-pause" type="button">Pause</button><button class="lrf-tool-btn secondary" id="lrf-timer-reset" type="button">Remise à zéro</button></div>
        </section>
      </div>`;
  };

  const init=()=>{
    installCss();buildUi();
    setTimeout(installWelcomeHand,30);setTimeout(installWelcomeHand,300);
    const clockBtn=document.getElementById('lrf-clock-btn');
    const pop=document.getElementById('lrf-clock-popover');
    const closeBtn=document.getElementById('lrf-clock-close');
    const liveClock=document.getElementById('current-time');
    const dateEl=document.getElementById('current-date');
    if(!clockBtn||!pop)return;

    document.getElementById('lrf-calendar-btn')?.addEventListener('click',()=>{location.href='agenda.html';});

    const updateClock=()=>{
      const now=new Date();
      if(liveClock)liveClock.textContent=nowTime();
      if(dateEl){let formatted=now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});dateEl.textContent=formatted.charAt(0).toUpperCase()+formatted.slice(1);}
    };
    updateClock();setInterval(updateClock,1000);

    const open=()=>{pop.hidden=false;clockBtn.setAttribute('aria-expanded','true');};
    const close=()=>{pop.hidden=true;clockBtn.setAttribute('aria-expanded','false');};
    clockBtn.addEventListener('click',e=>{e.stopPropagation();pop.hidden?open():close();});
    closeBtn?.addEventListener('click',close);
    document.addEventListener('click',e=>{if(!pop.hidden&&!pop.contains(e.target)&&!clockBtn.contains(e.target))close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden)close();});

    const tabs=[...pop.querySelectorAll('.lrf-tool-tab')],panels=[...pop.querySelectorAll('.lrf-tool-panel')];
    tabs.forEach(tab=>tab.addEventListener('click',()=>{const name=tab.dataset.tool;tabs.forEach(t=>t.classList.toggle('active',t===tab));panels.forEach(p=>p.hidden=p.dataset.panel!==name);}));

    let audioCtx=null,localAudio=null;
    const ensureAudio=()=>audioCtx||(audioCtx=new (window.AudioContext||window.webkitAudioContext)());
    const playTone=(kind='chime')=>{try{const ctx=ensureAudio();if(ctx.state==='suspended')ctx.resume();const patterns={chime:[[659,.18],[880,.22],[1047,.34]],bell:[[784,.25],[1175,.35],[1568,.45]],digital:[[880,.12],[880,.12],[1175,.18]],soft:[[523,.3],[659,.3],[784,.42]]};let t=ctx.currentTime;(patterns[kind]||patterns.chime).forEach(([freq,dur])=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=kind==='digital'?'square':'sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.18,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);osc.connect(gain).connect(ctx.destination);osc.start(t);osc.stop(t+dur+.03);t+=dur*.78;});}catch(_){}};
    const ring=()=>{if(localAudio){try{localAudio.currentTime=0;localAudio.play();return;}catch(_){}}playTone(document.getElementById('lrf-alarm-sound')?.value||'chime');};

    const alarmTime=document.getElementById('lrf-alarm-time'),alarmStatus=document.getElementById('lrf-alarm-status'),alarmFile=document.getElementById('lrf-alarm-file');
    if(alarmTime&&!alarmTime.value)alarmTime.value=nowTime();
    let alarmTimer=null;
    const clearAlarm=()=>{if(alarmTimer)clearTimeout(alarmTimer);alarmTimer=null;if(alarmStatus)alarmStatus.textContent='Aucune alarme active.';};
    alarmFile?.addEventListener('change',()=>{const file=alarmFile.files?.[0];if(!file){localAudio=null;return;}localAudio=new Audio(URL.createObjectURL(file));if(alarmStatus)alarmStatus.textContent=`Musique choisie : ${file.name}`;});
    document.getElementById('lrf-alarm-set')?.addEventListener('click',()=>{if(!alarmTime?.value)return;const [h,m]=alarmTime.value.split(':').map(Number),now=new Date(),target=new Date(now);target.setHours(h,m,0,0);if(target<=now)target.setDate(target.getDate()+1);if(alarmTimer)clearTimeout(alarmTimer);alarmTimer=setTimeout(()=>{ring();alarmTimer=null;if(alarmStatus)alarmStatus.textContent='⏰ Alarme déclenchée.';},target-now);if(alarmStatus)alarmStatus.textContent=`Alarme réglée pour ${pad(h)}:${pad(m)}.`;});
    document.getElementById('lrf-alarm-cancel')?.addEventListener('click',clearAlarm);document.getElementById('lrf-alarm-test')?.addEventListener('click',ring);

    const swDisplay=document.getElementById('lrf-sw-display');let swStart=0,swElapsed=0,swRaf=null;
    const fmtMs=ms=>{const cs=Math.floor(ms/10)%100,s=Math.floor(ms/1000)%60,m=Math.floor(ms/60000)%60,h=Math.floor(ms/3600000);return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`;};
    const swTick=()=>{const value=swElapsed+(performance.now()-swStart);if(swDisplay)swDisplay.textContent=fmtMs(value);swRaf=requestAnimationFrame(swTick);};
    document.getElementById('lrf-sw-start')?.addEventListener('click',()=>{if(swRaf)return;swStart=performance.now();swRaf=requestAnimationFrame(swTick);});
    document.getElementById('lrf-sw-pause')?.addEventListener('click',()=>{if(!swRaf)return;swElapsed+=performance.now()-swStart;cancelAnimationFrame(swRaf);swRaf=null;if(swDisplay)swDisplay.textContent=fmtMs(swElapsed);});
    document.getElementById('lrf-sw-reset')?.addEventListener('click',()=>{if(swRaf){cancelAnimationFrame(swRaf);swRaf=null;}swElapsed=0;if(swDisplay)swDisplay.textContent='00:00:00.00';});

    const timerDisplay=document.getElementById('lrf-timer-display'),hEl=document.getElementById('lrf-timer-h'),mEl=document.getElementById('lrf-timer-m'),sEl=document.getElementById('lrf-timer-s');let remaining=0,timerEnd=0,timerId=null;
    const renderTimer=()=>{const sec=Math.max(0,Math.ceil(remaining/1000)),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;if(timerDisplay)timerDisplay.textContent=`${pad(h)}:${pad(m)}:${pad(s)}`;};
    const timerTick=()=>{remaining=Math.max(0,timerEnd-Date.now());renderTimer();if(remaining<=0){clearInterval(timerId);timerId=null;ring();}};
    document.getElementById('lrf-timer-start')?.addEventListener('click',()=>{if(timerId)return;if(remaining<=0)remaining=((Number(hEl?.value)||0)*3600+(Number(mEl?.value)||0)*60+(Number(sEl?.value)||0))*1000;if(remaining<=0)return;timerEnd=Date.now()+remaining;timerId=setInterval(timerTick,200);timerTick();});
    document.getElementById('lrf-timer-pause')?.addEventListener('click',()=>{if(!timerId)return;remaining=Math.max(0,timerEnd-Date.now());clearInterval(timerId);timerId=null;renderTimer();});
    document.getElementById('lrf-timer-reset')?.addEventListener('click',()=>{if(timerId)clearInterval(timerId);timerId=null;remaining=0;if(hEl)hEl.value=0;if(mEl)mEl.value=5;if(sEl)sEl.value=0;renderTimer();});renderTimer();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
