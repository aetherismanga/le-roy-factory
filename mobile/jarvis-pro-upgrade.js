import { registerPlugin } from '@capacitor/core';

const VoiceNative = registerPlugin('VoiceNative');

(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(!native)return;
  const VOICE_KEY='lrfJarvisVoiceEnabled';

  function voiceEnabled(){return localStorage.getItem(VOICE_KEY)!=='0'}
  async function stopVoice(){try{await VoiceNative.stopSpeaking?.()}catch{} try{window.speechSynthesis?.cancel?.()}catch{}}

  function upgrade(){
    const panel=document.getElementById('lrf-jarvis-panel');
    const input=document.getElementById('lrf-jarvis-input');
    const send=document.getElementById('lrf-jarvis-send');
    const head=panel?.querySelector('.lrf-jarvis-head strong');
    if(!panel||!input||!send)return false;

    if(head)head.textContent='JARVIS IA — LE ROY FACTORY';
    input.placeholder='Jarvis IA — posez votre question métier…';
    input.setAttribute('aria-label','Jarvis IA');

    if(!document.getElementById('lrf-jarvis-voice-toggle')){
      const close=document.getElementById('lrf-jarvis-close');
      const b=document.createElement('button');
      b.id='lrf-jarvis-voice-toggle';b.type='button';
      b.style.cssText='margin-left:auto;border:0;background:#eee;width:38px;height:38px;border-radius:50%;font-size:1.05rem;display:flex;align-items:center;justify-content:center';
      const refresh=()=>{b.textContent=voiceEnabled()?'🔊':'🔇';b.title=voiceEnabled()?'Couper la voix de Jarvis':'Activer la voix de Jarvis';b.setAttribute('aria-label',b.title)};
      refresh();
      b.onclick=async()=>{const on=!voiceEnabled();localStorage.setItem(VOICE_KEY,on?'1':'0');refresh();if(!on)await stopVoice();else try{await VoiceNative.speak({text:'Voix Jarvis activée',language:'fr-FR',rate:0.94,pitch:0.82,preferMale:true})}catch{}};
      close?.parentElement?.insertBefore(b,close);
    }

    if(!send.dataset.jarvisPro){
      send.dataset.jarvisPro='1';
      const dispatch=()=>{const text=input.value.trim();if(!text)return;input.value='';if(typeof window.__lrfJarvis==='function')window.__lrfJarvis(text)};
      send.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();dispatch()},true);
      input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();dispatch()}},true);
    }
    return true;
  }

  let n=0;const t=setInterval(()=>{n++;if(upgrade()||n>120)clearInterval(t)},100);
})();
