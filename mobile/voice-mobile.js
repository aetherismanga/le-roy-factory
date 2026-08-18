import { registerPlugin } from '@capacitor/core';

const VoiceNative = registerPlugin('VoiceNative');

(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(!native)return;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();

  const style=document.createElement('style');
  style.textContent=`
    .lrf-voice-round{width:48px;height:48px;border-radius:50%;border:1px solid #D4AF37;background:#111;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:1.35rem;box-shadow:0 7px 18px rgba(0,0,0,.18);z-index:180000}
    .lrf-voice-round.listening{animation:lrfMicPulse 1s infinite;background:#8B1E1E}
    .lrf-voice-top{position:fixed;top:max(14px,env(safe-area-inset-top));right:16px}
    .lrf-voice-inline{width:42px;height:42px;box-shadow:none;margin-left:8px;vertical-align:middle;flex:0 0 auto}
    .lrf-voice-field-row{display:flex;align-items:flex-start;gap:7px}.lrf-voice-field-row textarea{flex:1;min-width:0}
    @keyframes lrfMicPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  `;
  document.head.appendChild(style);

  async function listen(button){
    try{
      button?.classList.add('listening');
      const out=await VoiceNative.listen({language:'fr-FR'});
      return String(out?.text||'').trim();
    }finally{button?.classList.remove('listening')}
  }
  window.__lrfVoiceListen=()=>listen(null);

  function addTopMic(handler,title='Commande vocale'){
    if(document.getElementById('lrf-top-mic'))return;
    const b=document.createElement('button');
    b.id='lrf-top-mic';b.type='button';b.className='lrf-voice-round lrf-voice-top';b.innerHTML='🎙️';b.setAttribute('aria-label',title);b.title=title;
    b.onclick=async()=>{try{const text=await listen(b);if(text)await handler(text)}catch(e){if(!String(e?.message||e).includes('annul'))alert(e?.message||'Dictée vocale impossible')}};
    document.body.appendChild(b);
  }

  function addTextareaMic(textarea,label='Dicter le texte'){
    if(!textarea||textarea.dataset.lrfVoice)return;
    textarea.dataset.lrfVoice='1';
    const parent=textarea.parentElement;
    const row=document.createElement('div');row.className='lrf-voice-field-row';
    parent.insertBefore(row,textarea);row.appendChild(textarea);
    const b=document.createElement('button');b.type='button';b.className='lrf-voice-round lrf-voice-inline';b.innerHTML='🎙️';b.title=label;b.setAttribute('aria-label',label);row.appendChild(b);
    b.onclick=async()=>{try{const text=await listen(b);if(!text)return;const current=textarea.value.trim();textarea.value=current?`${current} ${text}`:text;textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.focus()}catch(e){if(!String(e?.message||e).includes('annul'))alert(e?.message||'Dictée vocale impossible')}};
  }

  if(page==='dashboard.html'){
    addTopMic(async text=>{
      location.href=`clients.html?voiceClient=${encodeURIComponent(text)}`;
    },'Rechercher un client à la voix');
  }

  if(page==='comptes-rendus.html'){
    let tries=0;const t=setInterval(()=>{tries++;const el=document.getElementById('cr-input-text');if(el){clearInterval(t);addTextareaMic(el,'Dicter le compte-rendu')}else if(tries>80)clearInterval(t)},100);
  }

  if(page==='mails-groupes.html'){
    let tries=0;const t=setInterval(()=>{tries++;const el=document.getElementById('email-body');if(el){clearInterval(t);addTextareaMic(el,'Dicter le mail')}else if(tries>80)clearInterval(t)},100);
  }
})();
