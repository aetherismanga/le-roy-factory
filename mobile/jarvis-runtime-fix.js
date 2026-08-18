import { registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const VoiceNative = registerPlugin('VoiceNative');

(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(!native)return;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  const VOICE_KEY='lrfJarvisVoiceEnabled';
  const partnerFiles={
    elios:{name:'Elios Ceramica',file:'assets/pdf/elios2026.pdf'},
    view:{name:'View Ceramica',file:'assets/pdf/view2026.pdf'},
    lafenice:{name:'La Fenice',file:'assets/pdf/lafenice2026.pdf'},
    reviglass:{name:'Reviglass',file:'assets/pdf/reviglass2026.pdf'},
    biopietra:{name:'Biopietra',file:'assets/pdf/biopietra2026.pdf'},
    bulbo:{name:'Bulbo',file:'assets/pdf/bulbo2026.pdf'},
    petracer:{name:"Petracer's",file:'assets/pdf/petracer2023.pdf'},
    pecchioli:{name:'Pecchioli Firenze',file:'assets/pdf/pecchioli2022.pdf'},
    randal:{name:'Randal Pro',file:'assets/pdf/RANDAL03.pdf'},
    neobath:{name:'Neobath',file:'assets/pdf/neobathANIMA.pdf'},
    aquahome:{name:'Aquahome',file:'assets/pdf/AQUAHOME.pdf'},
    bilt:{name:'Bilt',file:'assets/pdf/bilt.pdf'}
  };
  const voiceEnabled=()=>localStorage.getItem(VOICE_KEY)!=='0';

  function publicPdfUrl(href){
    const raw=String(href||'');
    if(/^https?:\/\//i.test(raw))return raw;
    const clean=raw.replace(/^\.\//,'').replace(/^\//,'');
    return `https://leroyfactory.fr/${clean}`;
  }

  // Les PDF locaux ne sont pas rendus par Android WebView. On les ouvre dans un Custom Tab Android.
  document.addEventListener('click',async e=>{
    const a=e.target.closest('a[href]');
    if(!a)return;
    const href=a.getAttribute('href')||'';
    const pdf=/\.pdf(?:$|[?#])/i.test(href);
    if(!pdf)return;
    if(page!=='tarifs-pro.html'&&page!=='catalogues.html')return;
    e.preventDefault();e.stopPropagation();
    try{await Browser.open({url:publicPdfUrl(href),presentationStyle:'popover'})}
    catch(err){console.warn('Ouverture PDF Android',err);location.href=publicPdfUrl(href)}
  },true);

  function installVoiceToggle(){
    const panel=document.getElementById('lrf-jarvis-panel');
    if(!panel||document.getElementById('lrf-jarvis-voice-toggle'))return false;
    const head=panel.querySelector('.lrf-jarvis-head');if(!head)return false;
    const close=panel.querySelector('#lrf-jarvis-close');
    const b=document.createElement('button');
    b.id='lrf-jarvis-voice-toggle';b.type='button';b.style.cssText='margin-left:auto;border:0;background:#eee;width:38px;height:38px;border-radius:50%;font-size:1.05rem;display:flex;align-items:center;justify-content:center';
    const refresh=()=>{b.textContent=voiceEnabled()?'🔊':'🔇';b.title=voiceEnabled()?'Voix Jarvis activée':'Voix Jarvis désactivée';b.setAttribute('aria-label',b.title)};
    refresh();
    b.onclick=async()=>{const next=!voiceEnabled();localStorage.setItem(VOICE_KEY,next?'1':'0');refresh();if(!next)await VoiceNative.stopSpeaking?.().catch(()=>{});else await VoiceNative.speak?.({text:'Voix Jarvis activée',language:'fr-FR'}).catch(()=>{})};
    head.insertBefore(b,close||null);
    return true;
  }

  let lastAnswer='';
  function watchJarvisAnswers(){
    const answer=document.getElementById('lrf-jarvis-answer');if(!answer||answer.dataset.lrfVoiceWatch)return false;
    answer.dataset.lrfVoiceWatch='1';lastAnswer=(answer.textContent||'').trim();
    const speakCurrent=async()=>{
      const text=(answer.textContent||'').trim();
      if(!text||text===lastAnswer){lastAnswer=text;return}
      lastAnswer=text;
      if(!voiceEnabled())return;
      if(/^(je cherche|chargement)/i.test(text))return;
      try{await VoiceNative.speak({text,language:'fr-FR'})}
      catch(e){console.warn('TTS Jarvis',e)}
    };
    new MutationObserver(()=>setTimeout(speakCurrent,20)).observe(answer,{childList:true,characterData:true,subtree:true});
    return true;
  }

  let uiTries=0;const uiTimer=setInterval(()=>{uiTries++;const ok1=installVoiceToggle(),ok2=watchJarvisAnswers();if((ok1||document.getElementById('lrf-jarvis-voice-toggle'))&&(ok2||document.getElementById('lrf-jarvis-answer')?.dataset.lrfVoiceWatch)||uiTries>80)clearInterval(uiTimer)},100);

  // Répare la préparation des mails Jarvis sur la vraie UI actuelle (multi-départements + éditeur riche).
  async function repairMailPrep(){
    if(page!=='mails-groupes.html')return;
    const qs=new URLSearchParams(location.search);if(qs.get('jarvisPrepare')!=='1')return;
    const dep=(qs.get('jarvisDept')||'').replace(/^FR-/i,'');
    const partner=(qs.get('jarvisPartner')||'').toLowerCase();
    const year=qs.get('jarvisYear')||'2026';
    const info=partnerFiles[partner]||null;
    let n=0;const t=setInterval(async()=>{
      n++;
      const type=document.getElementById('filter-type');
      const deptBox=document.querySelector(`.dept-checkbox[value="FR-${CSS.escape(dep)}"]`);
      const subject=document.getElementById('email-subject');
      const editor=document.getElementById('email-body-editor');
      const fileInput=document.getElementById('file-attachment');
      const selectAll=document.getElementById('btn-select-all');
      if(!type||!subject||!editor||!fileInput||(dep&&!deptBox)){if(n>100)clearInterval(t);return}
      clearInterval(t);

      type.value='client';type.dispatchEvent(new Event('change',{bubbles:true}));
      if(dep&&deptBox&&!deptBox.checked){deptBox.click()}

      subject.value=info?`Tarifs ${info.name} ${year}`:`Information LE ROY FACTORY ${year}`;
      subject.dispatchEvent(new Event('input',{bubbles:true}));
      const msg=info
        ? `Bonjour,<br><br>Veuillez trouver ci-joint les tarifs ${info.name} ${year}.<br><br>Cordialement,`
        : `Bonjour,<br><br>Veuillez trouver ci-joint les informations demandées.<br><br>Cordialement,`;
      editor.innerHTML=msg;editor.dispatchEvent(new Event('input',{bubbles:true}));
      const hidden=document.getElementById('email-body');if(hidden){hidden.value=editor.innerHTML;hidden.dispatchEvent(new Event('input',{bubbles:true}))}

      if(info?.file){
        try{
          const res=await fetch(info.file,{cache:'no-store'});if(!res.ok)throw new Error(`PDF ${res.status}`);
          const blob=await res.blob();const filename=info.file.split('/').pop();
          const f=new File([blob],filename,{type:'application/pdf'});const dt=new DataTransfer();dt.items.add(f);fileInput.files=dt.files;fileInput.dispatchEvent(new Event('change',{bubbles:true}));
        }catch(e){console.error('Jarvis pièce jointe',e)}
      }
      // Laisse le temps au filtre département de recalculer la liste avant de sélectionner.
      setTimeout(()=>selectAll?.click(),900);
    },120);
  }
  repairMailPrep();
})();
