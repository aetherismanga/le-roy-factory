import { registerPlugin } from '@capacitor/core';

const VoiceNative = registerPlugin('VoiceNative');

(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(!native)return;

  const ENDPOINT='https://us-central1-le-roy-factory.cloudfunctions.net/jarvisAi';
  const MEMORY_KEY='lrfJarvisMemoryV2';
  const HISTORY_MAX=30;

  function loadMemory(){
    try{return JSON.parse(localStorage.getItem(MEMORY_KEY)||'{}')||{}}
    catch{return{}}
  }
  function saveMemory(m){
    m.updatedAt=new Date().toISOString();
    m.history=(Array.isArray(m.history)?m.history:[]).slice(-HISTORY_MAX);
    localStorage.setItem(MEMORY_KEY,JSON.stringify(m));
  }
  function remember(user,assistant){const m=loadMemory();m.history=Array.isArray(m.history)?m.history:[];m.history.push({at:new Date().toISOString(),user,assistant,intent:'ai'});saveMemory(m)}

  function ui(){return{panel:document.getElementById('lrf-jarvis-panel'),answer:document.getElementById('lrf-jarvis-answer'),heard:document.getElementById('lrf-jarvis-heard'),input:document.getElementById('lrf-jarvis-input'),send:document.getElementById('lrf-jarvis-send'),mic:document.getElementById('lrf-jarvis-mic')}}
  function show(text,heard=''){const x=ui();x.panel?.classList.add('open');if(x.answer)x.answer.textContent=text;if(x.heard)x.heard.textContent=heard?`Vous : ${heard}`:''}

  function partnerKey(v){const n=String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(n.includes('elios'))return'elios';if(n.includes('view'))return'view';if(n.includes('fenice'))return'lafenice';if(n.includes('reviglass'))return'reviglass';if(n.includes('biopietra'))return'biopietra';if(n.includes('bulbo'))return'bulbo';if(n.includes('randal'))return'randal';if(n.includes('neobath'))return'neobath';if(n.includes('petracer'))return'petracer';if(n.includes('pecchioli'))return'pecchioli';if(n.includes('koibath'))return'koibath';if(n.includes('aquahome'))return'aquahome';if(n.includes('opal'))return'opal';if(n.includes('bilt'))return'bilt';return n.replace(/\s+/g,'')}

  function executeAction(a){
    if(!a||!a.type)return false;
    if(a.type==='open_app_page'){
      const p=partnerKey(a.partner||'');
      const map={clients:'clients.html',agenda:'agenda.html',carte:'carte.html',statistiques:'statistiques.html','comptes-rendus':'comptes-rendus.html',mails:'mails-groupes.html',partenaires:'partenaires.html'};
      let url=map[a.page]||'';
      if(a.page==='client'&&a.clientId)url=`clients.html?edit=${encodeURIComponent(a.clientId)}`;
      if(a.page==='tarifs')url=`tarifs-pro.html${p?`?jarvis=${encodeURIComponent(p)}`:''}`;
      if(a.page==='catalogues')url=`catalogues.html${p?`?jarvis=${encodeURIComponent(p)}`:''}`;
      if(url){setTimeout(()=>location.href=url,650);return true}
    }
    if(a.type==='prepare_group_mail'){
      const q=new URLSearchParams();q.set('jarvisPrepare','1');q.set('jarvisType',a.recipientType||'client');if(a.partner)q.set('jarvisPartner',partnerKey(a.partner));if(a.year)q.set('jarvisYear',a.year);if(a.departement)q.set('jarvisDept',String(a.departement).replace(/^FR-/i,''));if(a.documentType)q.set('jarvisDocumentType',a.documentType);setTimeout(()=>location.href=`mails-groupes.html?${q.toString()}`,750);return true;
    }
    return false;
  }

  async function askAi(raw){
    const text=String(raw||'').trim();if(!text)return;
    show('Jarvis réfléchit…',text);
    const memory=loadMemory();
    try{
      const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:Array.isArray(memory.history)?memory.history.slice(-16):[],page:(location.pathname.split('/').pop()||'')})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data.success)throw new Error(data.error||`Serveur ${r.status}`);
      const answer=String(data.answer||'Demande traitée.');
      show(answer,text);remember(text,answer);
      const actions=Array.isArray(data.actions)?data.actions:[];
      if(actions.length)executeAction(actions[0]);
      return data;
    }catch(err){
      console.warn('Jarvis AI indisponible, secours local',err);
      const fallback=window.__lrfJarvisLegacy;
      if(typeof fallback==='function')return fallback(text);
      show(`Le cerveau IA n'est pas encore disponible : ${err?.message||err}`,text);
    }
  }

  function install(){
    const x=ui();if(!x.mic||!x.send||!x.input)return false;
    if(!window.__lrfJarvisLegacy&&typeof window.__lrfJarvis==='function')window.__lrfJarvisLegacy=window.__lrfJarvis;
    window.__lrfJarvis=askAi;

    x.mic.onclick=async()=>{
      x.mic.classList.add('listening');
      try{const out=await VoiceNative.listen({language:'fr-FR'});const text=String(out?.text||'').trim();if(text)await askAi(text)}
      catch(e){if(!String(e?.message||e).toLowerCase().includes('annul'))show(e?.message||'Je n’ai pas compris.','')}
      finally{x.mic.classList.remove('listening')}
    };
    x.send.onclick=()=>{const v=x.input.value.trim();if(!v)return;x.input.value='';askAi(v)};
    x.input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();const v=x.input.value.trim();if(v){x.input.value='';askAi(v)}}},true);
    x.mic.dataset.jarvisAi='1';return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},80);
})();
