(()=>{
  'use strict';
  if(window.__LRF_DASH_CLOCK_TOOLS__)return;
  window.__LRF_DASH_CLOCK_TOOLS__=true;

  const pad=n=>String(n).padStart(2,'0');
  const nowTime=()=>new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});

  const init=()=>{
    const clockBtn=document.getElementById('lrf-clock-btn');
    const pop=document.getElementById('lrf-clock-popover');
    const closeBtn=document.getElementById('lrf-clock-close');
    const liveClock=document.getElementById('current-time');
    if(!clockBtn||!pop)return;

    const updateClock=()=>{if(liveClock)liveClock.textContent=nowTime();};
    updateClock();
    setInterval(updateClock,1000);

    const open=()=>{pop.hidden=false;clockBtn.setAttribute('aria-expanded','true');};
    const close=()=>{pop.hidden=true;clockBtn.setAttribute('aria-expanded','false');};
    clockBtn.addEventListener('click',e=>{e.stopPropagation();pop.hidden?open():close();});
    closeBtn?.addEventListener('click',close);
    document.addEventListener('click',e=>{if(!pop.hidden&&!pop.contains(e.target)&&!clockBtn.contains(e.target))close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden)close();});

    const tabs=[...pop.querySelectorAll('.lrf-tool-tab')];
    const panels=[...pop.querySelectorAll('.lrf-tool-panel')];
    tabs.forEach(tab=>tab.addEventListener('click',()=>{
      const name=tab.dataset.tool;
      tabs.forEach(t=>t.classList.toggle('active',t===tab));
      panels.forEach(p=>p.hidden=p.dataset.panel!==name);
    }));

    let audioCtx=null;
    let localAudio=null;
    const ensureAudio=()=>audioCtx||(audioCtx=new (window.AudioContext||window.webkitAudioContext)());
    const playTone=(kind='chime')=>{
      try{
        const ctx=ensureAudio();
        if(ctx.state==='suspended')ctx.resume();
        const patterns={
          chime:[[659,.18],[880,.22],[1047,.34]],
          bell:[[784,.25],[1175,.35],[1568,.45]],
          digital:[[880,.12],[880,.12],[1175,.18]],
          soft:[[523,.3],[659,.3],[784,.42]]
        };
        let t=ctx.currentTime;
        (patterns[kind]||patterns.chime).forEach(([freq,dur])=>{
          const osc=ctx.createOscillator(),gain=ctx.createGain();
          osc.type=kind==='digital'?'square':'sine';osc.frequency.value=freq;
          gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.18,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
          osc.connect(gain).connect(ctx.destination);osc.start(t);osc.stop(t+dur+.03);t+=dur*.78;
        });
      }catch(_){ }
    };
    const ring=()=>{
      if(localAudio){try{localAudio.currentTime=0;localAudio.play();return;}catch(_){}}
      const sound=document.getElementById('lrf-alarm-sound')?.value||'chime';
      playTone(sound);
    };

    // Alarme
    const alarmTime=document.getElementById('lrf-alarm-time');
    const alarmStatus=document.getElementById('lrf-alarm-status');
    const alarmSet=document.getElementById('lrf-alarm-set');
    const alarmCancel=document.getElementById('lrf-alarm-cancel');
    const alarmFile=document.getElementById('lrf-alarm-file');
    if(alarmTime&&!alarmTime.value)alarmTime.value=nowTime();
    let alarmTarget=null,alarmTimer=null;
    const clearAlarm=()=>{if(alarmTimer)clearTimeout(alarmTimer);alarmTimer=null;alarmTarget=null;if(alarmStatus)alarmStatus.textContent='Aucune alarme active.';};
    alarmFile?.addEventListener('change',()=>{
      const file=alarmFile.files?.[0];
      if(!file){localAudio=null;return;}
      localAudio=new Audio(URL.createObjectURL(file));
      if(alarmStatus)alarmStatus.textContent=`Musique choisie : ${file.name}`;
    });
    alarmSet?.addEventListener('click',()=>{
      if(!alarmTime?.value)return;
      const [h,m]=alarmTime.value.split(':').map(Number);const now=new Date();
      const target=new Date(now);target.setHours(h,m,0,0);if(target<=now)target.setDate(target.getDate()+1);
      alarmTarget=target;
      if(alarmTimer)clearTimeout(alarmTimer);
      const delay=target-now;
      alarmTimer=setTimeout(()=>{ring();alarmTimer=null;if(alarmStatus)alarmStatus.textContent='⏰ Alarme déclenchée.';},delay);
      if(alarmStatus)alarmStatus.textContent=`Alarme réglée pour ${pad(h)}:${pad(m)}.`;
    });
    alarmCancel?.addEventListener('click',clearAlarm);
    document.getElementById('lrf-alarm-test')?.addEventListener('click',ring);

    // Chronomètre
    const swDisplay=document.getElementById('lrf-sw-display');
    let swStart=0,swElapsed=0,swRaf=null;
    const fmtMs=ms=>{const cs=Math.floor(ms/10)%100,s=Math.floor(ms/1000)%60,m=Math.floor(ms/60000)%60,h=Math.floor(ms/3600000);return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`;};
    const swTick=()=>{const value=swElapsed+(performance.now()-swStart);if(swDisplay)swDisplay.textContent=fmtMs(value);swRaf=requestAnimationFrame(swTick);};
    document.getElementById('lrf-sw-start')?.addEventListener('click',()=>{if(swRaf)return;swStart=performance.now();swRaf=requestAnimationFrame(swTick);});
    document.getElementById('lrf-sw-pause')?.addEventListener('click',()=>{if(!swRaf)return;swElapsed+=performance.now()-swStart;cancelAnimationFrame(swRaf);swRaf=null;if(swDisplay)swDisplay.textContent=fmtMs(swElapsed);});
    document.getElementById('lrf-sw-reset')?.addEventListener('click',()=>{if(swRaf){cancelAnimationFrame(swRaf);swRaf=null;}swElapsed=0;if(swDisplay)swDisplay.textContent='00:00:00.00';});

    // Minuterie
    const timerDisplay=document.getElementById('lrf-timer-display');
    const hEl=document.getElementById('lrf-timer-h'),mEl=document.getElementById('lrf-timer-m'),sEl=document.getElementById('lrf-timer-s');
    let remaining=0,timerEnd=0,timerId=null;
    const renderTimer=()=>{const sec=Math.max(0,Math.ceil(remaining/1000));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;if(timerDisplay)timerDisplay.textContent=`${pad(h)}:${pad(m)}:${pad(s)}`;};
    const timerTick=()=>{remaining=Math.max(0,timerEnd-Date.now());renderTimer();if(remaining<=0){clearInterval(timerId);timerId=null;ring();}};
    document.getElementById('lrf-timer-start')?.addEventListener('click',()=>{
      if(timerId)return;
      if(remaining<=0){remaining=((Number(hEl?.value)||0)*3600+(Number(mEl?.value)||0)*60+(Number(sEl?.value)||0))*1000;}
      if(remaining<=0)return;
      timerEnd=Date.now()+remaining;timerId=setInterval(timerTick,200);timerTick();
    });
    document.getElementById('lrf-timer-pause')?.addEventListener('click',()=>{if(!timerId)return;remaining=Math.max(0,timerEnd-Date.now());clearInterval(timerId);timerId=null;renderTimer();});
    document.getElementById('lrf-timer-reset')?.addEventListener('click',()=>{if(timerId)clearInterval(timerId);timerId=null;remaining=0;if(hEl)hEl.value=0;if(mEl)mEl.value=5;if(sEl)sEl.value=0;renderTimer();});
    renderTimer();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
