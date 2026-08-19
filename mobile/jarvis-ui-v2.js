(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(!native)return;

  const VOICE_KEY='lrfJarvisVoiceEnabled';
  const TTS_ENDPOINT='https://us-central1-le-roy-factory.cloudfunctions.net/jarvisVoice';
  let currentAudio=null;
  let currentUrl='';
  let lastSpoken='';
  let speakingId=0;

  const voiceEnabled=()=>localStorage.getItem(VOICE_KEY)!=='0';

  function stopVoice(){
    speakingId++;
    try{currentAudio?.pause?.()}catch{}
    currentAudio=null;
    if(currentUrl){try{URL.revokeObjectURL(currentUrl)}catch{}currentUrl=''}
    try{window.speechSynthesis?.cancel?.()}catch{}
  }

  async function speakPremium(text){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!voiceEnabled()||!clean||clean===lastSpoken)return;
    if(/^(jarvis ia réfléchit|jarvis réfléchit|je cherche|chargement)/i.test(clean))return;
    lastSpoken=clean;
    stopVoice();
    const myId=++speakingId;
    try{
      const r=await fetch(TTS_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:clean.slice(0,3900)})});
      if(!r.ok)throw new Error(`Voix serveur ${r.status}`);
      const blob=await r.blob();
      if(myId!==speakingId)return;
      currentUrl=URL.createObjectURL(blob);
      currentAudio=new Audio(currentUrl);
      currentAudio.volume=1;
      currentAudio.onended=()=>{if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=''}currentAudio=null};
      await currentAudio.play();
    }catch(e){console.warn('Voix premium Jarvis indisponible',e)}
  }
  window.__lrfJarvisSpeak=speakPremium;
  window.__lrfJarvisStopVoice=stopVoice;

  function style(){
    if(document.getElementById('lrf-jarvis-ui-v2-style'))return;
    const s=document.createElement('style');s.id='lrf-jarvis-ui-v2-style';s.textContent=`
      #lrf-jarvis-global-search{position:fixed;top:max(14px,env(safe-area-inset-top));left:86px;right:78px;height:50px;z-index:199450;display:flex;align-items:center;gap:8px;padding:0 8px 0 14px;background:#fff;border:1.5px solid #D4AF37;border-radius:16px;box-shadow:0 7px 20px rgba(0,0,0,.18);box-sizing:border-box}
      #lrf-jarvis-global-search .j-icon{font-size:1rem;flex:0 0 auto}
      #lrf-jarvis-global-input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#111;font:600 .92rem/1.2 Arial,sans-serif}
      #lrf-jarvis-global-input::placeholder{color:#666;opacity:1}
      #lrf-jarvis-global-send{width:36px;height:36px;border-radius:11px;border:0;background:#111;color:#D4AF37;font-size:1.05rem;font-weight:900;display:flex;align-items:center;justify-content:center}
      #lrf-jarvis-voice-toggle{width:auto!important;min-width:92px!important;height:38px!important;padding:0 10px!important;border-radius:12px!important;font-size:.78rem!important;font-weight:800!important;white-space:nowrap!important}
      #lrf-jarvis-card .lrf-jarvis-head strong{font-size:1rem!important}
      #lrf-jarvis-input{font-size:16px!important;min-height:46px!important}
      @media(max-width:390px){#lrf-jarvis-global-search{left:76px;right:70px;padding-left:10px}#lrf-jarvis-global-input{font-size:.84rem}}
    `;document.head.appendChild(s);
  }

  function configurePanel(){
    const panel=document.getElementById('lrf-jarvis-panel');if(!panel)return false;
    const head=panel.querySelector('.lrf-jarvis-head strong');if(head)head.textContent='Jarvis IA — Expert LE ROY FACTORY';
    const input=document.getElementById('lrf-jarvis-input');if(input){input.placeholder='Posez une question à Jarvis IA…';input.setAttribute('aria-label','Jarvis IA')}
    let b=document.getElementById('lrf-jarvis-voice-toggle');
    if(!b){
      b=document.createElement('button');b.id='lrf-jarvis-voice-toggle';b.type='button';
      const close=document.getElementById('lrf-jarvis-close');close?.parentElement?.insertBefore(b,close);
    }
    const refresh=()=>{const on=voiceEnabled();b.textContent=on?'🔊 Voix ON':'🔇 Voix OFF';b.title=on?'Couper la voix de Jarvis':'Activer la voix de Jarvis';b.setAttribute('aria-label',b.title)};
    refresh();
    b.onclick=()=>{const on=!voiceEnabled();localStorage.setItem(VOICE_KEY,on?'1':'0');refresh();if(!on)stopVoice();else speakPremium('Voix Jarvis activée.')};
    return true;
  }

  function installSearch(){
    if(document.getElementById('lrf-jarvis-global-search'))return true;
    const page=(location.pathname.split('/').pop()||'').toLowerCase();
    if(page==='agent.html'||page==='index.html')return true;
    const bar=document.createElement('div');bar.id='lrf-jarvis-global-search';
    bar.innerHTML='<span class="j-icon">✦</span><input id="lrf-jarvis-global-input" type="search" placeholder="Jarvis IA" autocomplete="off"><button id="lrf-jarvis-global-send" type="button" aria-label="Envoyer à Jarvis">➤</button>';
    document.body.appendChild(bar);
    const input=bar.querySelector('#lrf-jarvis-global-input'),send=bar.querySelector('#lrf-jarvis-global-send');
    const submit=()=>{const q=input.value.trim();if(!q)return;input.value='';document.getElementById('lrf-jarvis-panel')?.classList.add('open');if(typeof window.__lrfJarvis==='function')window.__lrfJarvis(q)};
    send.onclick=submit;
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});
    input.addEventListener('focus',()=>{document.getElementById('lrf-jarvis-panel')?.classList.add('open')});
    return true;
  }

  function watchAnswers(){
    const a=document.getElementById('lrf-jarvis-answer');if(!a||a.dataset.premiumVoiceWatch)return false;
    a.dataset.premiumVoiceWatch='1';
    let previous=(a.textContent||'').trim();
    new MutationObserver(()=>{
      const text=(a.textContent||'').trim();
      if(!text||text===previous)return;previous=text;
      setTimeout(()=>speakPremium(text),40);
    }).observe(a,{childList:true,subtree:true,characterData:true});
    return true;
  }

  style();
  let tries=0;const t=setInterval(()=>{tries++;configurePanel();installSearch();watchAnswers();if(tries>120)clearInterval(t)},100);
})();