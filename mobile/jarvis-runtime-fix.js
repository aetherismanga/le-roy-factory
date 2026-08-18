import { registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const VoiceNative = registerPlugin('VoiceNative');

(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(!native)return;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  const VOICE_KEY='lrfJarvisVoiceEnabled';
  const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.min.mjs';
  const PDFWORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs';
  const ELIOS_GENERAL='https://eliosceramica.com/wp-content/uploads/2018/02/ELIOS_CATALOGO-GENERALE-2026-1.pdf';
  const partnerFiles={
    elios:{name:'Elios Ceramica',file:'assets/pdf/elios2026.pdf',catalogue:ELIOS_GENERAL},
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
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,"'").trim();

  function publicPdfUrl(href){
    const raw=String(href||'');
    if(/^https?:\/\//i.test(raw))return raw;
    const clean=raw.replace(/^\.\//,'').replace(/^\//,'');
    return `https://leroyfactory.fr/${clean}`;
  }

  document.addEventListener('click',async e=>{
    const a=e.target.closest('a[href]');
    if(!a)return;
    const href=a.getAttribute('href')||'';
    if(!/\.pdf(?:$|[?#])/i.test(href))return;
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
  async function say(text){if(!voiceEnabled())return;try{await VoiceNative.speak({text:String(text||''),language:'fr-FR'})}catch(e){console.warn('TTS Jarvis',e)}}
  function runtimeReply(text,heard=''){
    const panel=document.getElementById('lrf-jarvis-panel'),answer=document.getElementById('lrf-jarvis-answer'),heardEl=document.getElementById('lrf-jarvis-heard');
    panel?.classList.add('open');if(answer)answer.textContent=text;if(heardEl)heardEl.textContent=heard?`Vous : ${heard}`:'';
  }
  function watchJarvisAnswers(){
    const answer=document.getElementById('lrf-jarvis-answer');if(!answer||answer.dataset.lrfVoiceWatch)return false;
    answer.dataset.lrfVoiceWatch='1';lastAnswer=(answer.textContent||'').trim();
    const speakCurrent=async()=>{const text=(answer.textContent||'').trim();if(!text||text===lastAnswer){lastAnswer=text;return}lastAnswer=text;if(/^(je cherche|chargement)/i.test(text))return;await say(text)};
    new MutationObserver(()=>setTimeout(speakCurrent,20)).observe(answer,{childList:true,characterData:true,subtree:true});
    return true;
  }

  let pdfLibPromise=null;
  async function pdfLib(){
    if(!pdfLibPromise)pdfLibPromise=import(PDFJS).then(m=>{m.GlobalWorkerOptions.workerSrc=PDFWORKER;return m});
    return pdfLibPromise;
  }
  const pdfCache=new Map();
  async function loadPdf(url){
    const key=String(url);if(pdfCache.has(key))return pdfCache.get(key);
    const lib=await pdfLib();
    const task=lib.getDocument({url:key});const doc=await task.promise;pdfCache.set(key,doc);return doc;
  }
  async function pageText(doc,n){const p=await doc.getPage(n);const c=await p.getTextContent();return c.items.map(x=>x.str||'').join(' ').replace(/\s+/g,' ').trim()}
  async function findPdfPages(url,terms,{productMode=false,maxPages=9999}={}){
    const doc=await loadPdf(url);const wanted=terms.map(norm).filter(Boolean);const hits=[];
    for(let i=1;i<=Math.min(doc.numPages,maxPages);i++){
      const text=await pageText(doc,i),n=norm(text);let score=0;
      wanted.forEach(t=>{if(n.includes(t))score+=12});
      if(productMode){['aventino','celio','palatino','viminale'].forEach(t=>{if(n.includes(t))score+=7});if(n.includes('roma'))score+=20;if(n.includes('60x120')||n.includes('61x61'))score+=3}
      if(score>0)hits.push({page:i,score,text});
    }
    hits.sort((a,b)=>b.score-a.score||a.page-b.page);return{doc,hits};
  }
  function excerpt(text,terms){const n=norm(text),first=terms.map(norm).map(t=>n.indexOf(t)).filter(i=>i>=0).sort((a,b)=>a-b)[0]??0;const start=Math.max(0,first-130),end=Math.min(text.length,first+420);return text.slice(start,end).replace(/\s+/g,' ').trim()}

  async function documentCommand(text){
    const t=norm(text);
    const asksPage=/\b(page|quelle page|quel page|ou se trouve|où se trouve)\b/.test(t);
    const asksTariff=/\b(prix|tarif|tarifs|reference|référence|ref)\b/.test(t);
    const isElios=/\belios\b/.test(t)||norm(localStorage.getItem('lrfJarvisMemoryV2')||'').includes('elios');
    if(!isElios)return false;

    if(asksPage&&/\broma\b/.test(t)){
      runtimeReply('Je cherche Roma dans le catalogue général ELIOS 2026…',text);
      try{
        const {hits}=await findPdfPages(ELIOS_GENERAL,['roma'],{productMode:true});
        if(!hits.length){runtimeReply('Je n’ai pas trouvé Roma dans le catalogue général ELIOS 2026.',text);await say('Je n’ai pas trouvé Roma dans le catalogue général Elios 2026.');return true}
        const best=hits[0];const ans=`Roma se trouve dans le Catalogue Général ELIOS 2026 à la page PDF ${best.page}. J’ai identifié la page produit grâce aux mentions Roma, Aventino, Celio, Palatino et Viminale.`;
        runtimeReply(ans,text);await say(ans);return true;
      }catch(e){console.error('Recherche catalogue ELIOS',e);const ans='Je vois bien le Catalogue Général ELIOS 2026 dans LE ROY FACTORY, mais Android n’a pas réussi à lire le PDF distant pour cette recherche. Je peux quand même l’ouvrir.';runtimeReply(ans,text);await say(ans);return true}
    }

    if(asksTariff){
      const stop=new Set(['quel','quelle','quels','quelles','est','le','la','les','de','du','des','un','une','prix','tarif','tarifs','reference','référence','ref','chez','elios','ceramica','donne','moi','cherche','trouve','pour']);
      const terms=t.split(/[^a-z0-9x,.]+/).filter(x=>x.length>2&&!stop.has(x));
      if(!terms.length)return false;
      runtimeReply(`Je cherche ${terms.join(' ')} dans le tarif ELIOS 2026…`,text);
      try{
        const {hits}=await findPdfPages('assets/pdf/elios2026.pdf',terms,{maxPages:250});
        if(!hits.length){const ans=`Je n’ai pas trouvé ${terms.join(' ')} dans le tarif ELIOS 2026.`;runtimeReply(ans,text);await say(ans);return true}
        const best=hits[0],snip=excerpt(best.text,terms).slice(0,520);const ans=`Trouvé dans le tarif ELIOS 2026, page PDF ${best.page} : ${snip}`;
        runtimeReply(ans,text);await say(`J’ai trouvé la référence dans le tarif Elios 2026, page ${best.page}.`);return true;
      }catch(e){console.error('Recherche tarif ELIOS',e);const ans='Je n’ai pas pu lire le tarif ELIOS sur cette tentative. Le PDF est bien présent dans LE ROY FACTORY.';runtimeReply(ans,text);await say(ans);return true}
    }
    return false;
  }

  async function enhancedDispatch(text){if(await documentCommand(text))return;return window.__lrfJarvis?.(text)}
  function installEnhancedInput(){
    const mic=document.getElementById('lrf-jarvis-mic');if(mic&&!mic.dataset.lrfDocEnhanced){mic.dataset.lrfDocEnhanced='1';mic.onclick=async()=>{try{mic.classList.add('listening');const out=await VoiceNative.listen({language:'fr-FR'});const text=String(out?.text||'').trim();if(text)await enhancedDispatch(text)}catch(e){if(!/annul/i.test(String(e?.message||e))){runtimeReply(e?.message||'Je n’ai pas compris.');await say(e?.message||'Je n’ai pas compris.')}}finally{mic.classList.remove('listening')}}}
    const send=document.getElementById('lrf-jarvis-send'),input=document.getElementById('lrf-jarvis-text');if(send&&input&&!send.dataset.lrfDocEnhanced){send.dataset.lrfDocEnhanced='1';send.onclick=()=>{const v=input.value.trim();if(v){input.value='';enhancedDispatch(v)}};input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();send.click()}}}
    return !!mic;
  }

  let uiTries=0;const uiTimer=setInterval(()=>{uiTries++;installVoiceToggle();watchJarvisAnswers();installEnhancedInput();if(uiTries>80)clearInterval(uiTimer)},100);

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
      const depValue=`FR-${dep}`;const deptBox=dep?document.querySelector(`.dept-checkbox[value="${depValue}"]`):null;
      const subject=document.getElementById('email-subject');
      const editor=document.getElementById('email-body-editor');
      const fileInput=document.getElementById('file-attachment');
      const selectAll=document.getElementById('btn-select-all');
      if(!type||!subject||!editor||!fileInput||(dep&&!deptBox)){if(n>100)clearInterval(t);return}
      clearInterval(t);

      type.value='client';type.dispatchEvent(new Event('change',{bubbles:true}));
      document.getElementById('dept-all')?.click();
      if(dep&&deptBox&&!deptBox.checked)deptBox.click();

      subject.value=info?`Tarifs ${info.name} ${year}`:`Information LE ROY FACTORY ${year}`;
      subject.dispatchEvent(new Event('input',{bubbles:true}));
      const msg=info?`Bonjour,<br><br>Veuillez trouver ci-joint les tarifs ${info.name} ${year}.<br><br>Cordialement,`:`Bonjour,<br><br>Veuillez trouver ci-joint les informations demandées.<br><br>Cordialement,`;
      editor.innerHTML=msg;editor.dispatchEvent(new Event('input',{bubbles:true}));
      const hidden=document.getElementById('email-body');if(hidden){hidden.value=editor.innerHTML;hidden.dispatchEvent(new Event('input',{bubbles:true}))}

      if(info?.file){
        try{const res=await fetch(info.file,{cache:'no-store'});if(!res.ok)throw new Error(`PDF ${res.status}`);const blob=await res.blob();const filename=info.file.split('/').pop();const f=new File([blob],filename,{type:'application/pdf'});const dt=new DataTransfer();dt.items.add(f);fileInput.files=dt.files;fileInput.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){console.error('Jarvis pièce jointe',e)}
      }
      setTimeout(()=>selectAll?.click(),1000);
    },120);
  }
  repairMailPrep();
})();
