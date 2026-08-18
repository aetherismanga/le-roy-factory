import { registerPlugin } from '@capacitor/core';

const VoiceNative = registerPlugin('VoiceNative');

(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(!native)return;

  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  const DYNAMIC_IMPORT=new Function('p','return import(p)');
  const MEMORY_KEY='lrfJarvisMemoryV2';
  const HISTORY_MAX=30;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim();

  const PARTNERS={
    elios:{name:'Elios Ceramica',aliases:['elios','elio','elios ceramica','elios ceramics']},
    view:{name:'View Ceramica',aliases:['view','view ceramica','vue ceramica']},
    lafenice:{name:'La Fenice',aliases:['la fenice','fenice']},
    reviglass:{name:'Reviglass',aliases:['reviglass','revi glass']},
    biopietra:{name:'Biopietra',aliases:['biopietra','bio pietra']},
    bulbo:{name:'Bulbo',aliases:['bulbo']},
    randal:{name:'Randal Pro',aliases:['randal','randal pro']},
    neobath:{name:'Neobath',aliases:['neobath','neo bath']},
    petracer:{name:"Petracer's",aliases:['petracer','petracers',"petracer's"]},
    pecchioli:{name:'Pecchioli Firenze',aliases:['pecchioli','pecchioli firenze']},
    koibath:{name:'Koibath',aliases:['koibath','koi bath']},
    aquahome:{name:'Aquahome',aliases:['aquahome','aqua home']},
    opal:{name:'Opal',aliases:['opal']},
    bilt:{name:'Bilt',aliases:['bilt']}
  };

  function loadMemory(){
    try{return JSON.parse(localStorage.getItem(MEMORY_KEY)||'{}')||{}}
    catch{return{}}
  }
  let memory=loadMemory();
  memory.history=Array.isArray(memory.history)?memory.history:[];
  function saveMemory(){
    memory.updatedAt=new Date().toISOString();
    memory.history=memory.history.slice(-HISTORY_MAX);
    localStorage.setItem(MEMORY_KEY,JSON.stringify(memory));
  }
  function remember(turn){memory.history.push({at:new Date().toISOString(),...turn});saveMemory()}

  const style=document.createElement('style');
  style.textContent=`
    #lrf-top-mic,#lrf-agenda-mic{display:none!important}
    #lrf-jarvis-mic{position:fixed;top:max(14px,env(safe-area-inset-top));right:16px;width:50px;height:50px;border-radius:50%;border:1px solid #D4AF37;background:#111;color:#fff;font-size:1.38rem;display:flex;align-items:center;justify-content:center;z-index:199500;box-shadow:0 8px 22px rgba(0,0,0,.22)}
    #lrf-jarvis-mic.listening{background:#8B1E1E;animation:lrfJarvisPulse 1s infinite}
    #lrf-jarvis-panel{position:fixed;inset:0;z-index:310000;display:none;background:rgba(0,0,0,.38);align-items:flex-end}
    #lrf-jarvis-panel.open{display:flex}
    #lrf-jarvis-card{width:100%;max-height:76dvh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:14px 14px max(18px,env(safe-area-inset-bottom));box-shadow:0 -18px 45px rgba(0,0,0,.25);box-sizing:border-box;color:#17202A}
    .lrf-jarvis-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.lrf-jarvis-head strong{font-size:1.05rem}.lrf-jarvis-head button{border:0;background:#eee;width:38px;height:38px;border-radius:50%;font-size:1.2rem}
    #lrf-jarvis-answer{background:#F8F6F2;border:1px solid #E7E2D9;border-radius:14px;padding:12px;font-size:.9rem;line-height:1.42;min-height:48px;white-space:pre-wrap}
    #lrf-jarvis-heard{font-size:.72rem;color:#777;margin:8px 2px 0}
    .lrf-jarvis-entry{display:grid;grid-template-columns:1fr 46px;gap:7px;margin-top:10px}.lrf-jarvis-entry input{min-width:0;border:1px solid #D1D5DB;border-radius:11px;padding:11px;font:inherit}.lrf-jarvis-entry button{border:1px solid #D4AF37;background:#111;color:#FFD700;border-radius:11px;font-weight:900}
    .lrf-jarvis-actions{display:flex;gap:8px;margin-top:10px;overflow-x:auto}.lrf-jarvis-actions button{white-space:nowrap;border:1px solid #D4AF37;background:#111;color:#FFD700;border-radius:10px;padding:9px 11px;font-weight:800}
    @keyframes lrfJarvisPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  `;
  document.head.appendChild(style);

  const panel=document.createElement('div');
  panel.id='lrf-jarvis-panel';
  panel.innerHTML=`<div id="lrf-jarvis-card">
    <div class="lrf-jarvis-head"><strong>🎙️ Jarvis — LE ROY FACTORY</strong><button id="lrf-jarvis-close" type="button">×</button></div>
    <div id="lrf-jarvis-answer">Je suis prêt.</div>
    <div id="lrf-jarvis-heard"></div>
    <div class="lrf-jarvis-entry"><input id="lrf-jarvis-input" type="text" placeholder="Écrire aussi une commande…"><button id="lrf-jarvis-send" type="button">➤</button></div>
    <div class="lrf-jarvis-actions"><button type="button" data-j="clients">Clients</button><button type="button" data-j="agenda">Agenda</button><button type="button" data-j="carte">Carte</button><button type="button" data-j="ouvre les tarifs Elios">Tarifs Elios</button></div>
  </div>`;
  document.body.appendChild(panel);
  panel.querySelector('#lrf-jarvis-close').onclick=()=>panel.classList.remove('open');
  panel.addEventListener('click',e=>{if(e.target===panel)panel.classList.remove('open')});

  const mic=document.createElement('button');mic.id='lrf-jarvis-mic';mic.type='button';mic.textContent='🎙️';mic.title='Parler à Jarvis';mic.setAttribute('aria-label','Parler à Jarvis');document.body.appendChild(mic);

  function show(answer,heard=''){panel.classList.add('open');panel.querySelector('#lrf-jarvis-answer').textContent=answer;panel.querySelector('#lrf-jarvis-heard').textContent=heard?`Vous : ${heard}`:''}
  function speak(text){try{if('speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text||''));u.lang='fr-FR';u.rate=1;window.speechSynthesis.speak(u)}}catch{}}
  function reply(text,heard='',intent='answer'){
    show(text,heard);speak(text);if(heard)remember({user:heard,assistant:text,intent,partner:memory.lastPartner||null,clientId:memory.lastClientId||null});
  }
  function nav(url,text,heard='',intent='navigation'){
    if(heard)remember({user:heard,assistant:text,intent,url,partner:memory.lastPartner||null,clientId:memory.lastClientId||null});
    show(text,heard);speak(text);setTimeout(()=>location.href=url,500);
  }

  function partnerFromText(text){
    const n=norm(text);
    for(const [key,p] of Object.entries(PARTNERS))for(const a of p.aliases)if(n.includes(norm(a)))return key;
    if(/\b(son|ses|leur|leurs|les)\s+(tarif|prix|catalogue|collection)/.test(n)&&memory.lastPartner)return memory.lastPartner;
    if((/\b(tarif|prix|catalogue|collection)\b/.test(n))&&memory.lastPartner&&!Object.keys(PARTNERS).some(k=>n.includes(k)))return memory.lastPartner;
    return null;
  }

  function hasAny(t,words){return words.some(w=>t.includes(w))}
  function isTariffIntent(t){return hasAny(t,['tarif','tarifs','prix','grille tarifaire','grille de prix','conditions tarifaires'])}
  function isCatalogueIntent(t){return hasAny(t,['catalogue','catalogues','collection','collections','book'])}
  function isOpenIntent(t){return hasAny(t,['ouvre','ouvrir','affiche','afficher','montre','montrer','fais voir','fait voir','va sur','emmene moi','amene moi','voir'])}
  function extractDept(t){const m=String(t).match(/(?:departement|département|du|dans le|dans l[e'])\s*(\d{2,3})\b/i)||String(t).match(/\b(01|02|03|04|05|06|07|08|09|10|11|12|13|14|15|16|17|18|19|2A|2B|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55|56|57|58|59|60|61|62|63|64|65|66|67|68|69|70|71|72|73|74|75|76|77|78|79|80|81|82|83|84|85|86|87|88|89|90|91|92|93|94|95)\b/i);return m?.[1]?.toUpperCase()||''}

  async function getClients(){
    const firebaseUrl=new URL('assets/js/firebase.js',location.href).href;
    const [{db},fs]=await Promise.all([DYNAMIC_IMPORT(firebaseUrl),DYNAMIC_IMPORT('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')]);
    const snap=await fs.getDocs(fs.collection(db,'clients'));
    return snap.docs.map(d=>({id:d.id,...d.data()})).filter(c=>c.archived!==true&&c.archive!==true);
  }
  async function findClient(query){
    let q=norm(query);
    q=q.replace(/\b(ouvre|ouvrir|affiche|montre|chercher|cherche|trouve|trouver|fiche|client|prospect|va chez|emmene moi chez|amene moi chez|la fiche de|le client)\b/g,' ').replace(/\s+/g,' ').trim();
    if(!q&&memory.lastClientName)q=norm(memory.lastClientName);
    if(!q)return null;
    const rows=await getClients();
    const scored=rows.map(c=>{const name=[c.societe,c.enseigne,c.contact,c.ville,c.codeClient,c.codeLRF].filter(Boolean).join(' ');const hay=norm(name);let s=0;if(hay===q)s=120;if(hay.startsWith(q))s=Math.max(s,95);if(hay.includes(q))s=Math.max(s,75);for(const w of q.split(/\s+/))if(w.length>2&&hay.includes(w))s+=10;return{c,s}}).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
    return scored[0]?.c||null;
  }

  async function weather(){
    const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:60000}));
    const {latitude,longitude}=pos.coords;
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`);
    if(!r.ok)throw new Error('Météo indisponible');
    const d=await r.json(),c=d.current||{};const code=Number(c.weather_code);
    const state=code===0?'dégagé':code<=3?'partiellement nuageux':code<=48?'brumeux':code<=67?'pluvieux':code<=77?'neigeux':code<=82?'avec des averses':code<=99?'orageux':'variable';
    return `Aujourd’hui, il fait ${Math.round(c.temperature_2m)} degrés, ressenti ${Math.round(c.apparent_temperature)}. Le temps est ${state}. Vent ${Math.round(c.wind_speed_10m||0)} kilomètres heure.`;
  }

  function prepareMailUrl(text){
    const dep=extractDept(text),partner=partnerFromText(text)||memory.lastPartner||'',year=(String(text).match(/\b20\d{2}\b/)||[])[0]||'2026';
    const p=new URLSearchParams();if(dep)p.set('jarvisDept',dep);p.set('jarvisType','client');if(partner)p.set('jarvisPartner',partner);p.set('jarvisYear',year);p.set('jarvisPrepare','1');return `mails-groupes.html?${p.toString()}`;
  }

  async function handleCommand(raw){
    const text=String(raw||'').trim(),t=norm(text);if(!t)return;
    show('Je cherche…',text);
    try{
      let partner=partnerFromText(text);
      if(partner){memory.lastPartner=partner;memory.lastPartnerName=PARTNERS[partner].name;saveMemory()}

      if(/\b(meteo|météo|quel temps|temps fait|temperature|température|il fait combien)\b/.test(t)){
        const ans=await weather();return reply(ans,text,'weather');
      }

      if(/\b(oublie|efface|vide)\b.*\b(memoire|mémoire|historique)\b/.test(t)){
        memory={history:[]};saveMemory();return reply('Ma mémoire de conversation locale a été effacée.',text,'memory_clear');
      }
      if(/\b(que sais tu|que sais-tu|tu te souviens|memoire|mémoire)\b/.test(t)&&/\b(dernier|derniere|dernière|quoi|sujet|partenaire)\b/.test(t)){
        const last=memory.lastPartnerName?`Dernier partenaire : ${memory.lastPartnerName}. `:'';const client=memory.lastClientName?`Dernier client : ${memory.lastClientName}.`:'';return reply((last+client).trim()||'Je n’ai pas encore de contexte mémorisé.',text,'memory_read');
      }

      const mailAction=hasAny(t,['envoie','envoyer','prepare','prépare','preparer','préparer'])&&hasAny(t,['mail','email','e-mail','aux clients','au client']);
      if(mailAction&&(isTariffIntent(t)||isCatalogueIntent(t)||partner||memory.lastPartner)){
        return nav(prepareMailUrl(text),'Je prépare le mail groupé. Vous garderez la validation finale avant envoi.',text,'prepare_group_mail');
      }

      if(partner&&isTariffIntent(t)){
        memory.lastIntent='tarifs';saveMemory();return nav(`tarifs-pro.html?jarvis=${partner}`,`J’ouvre les tarifs ${PARTNERS[partner].name}.`,text,'open_tariffs');
      }
      if(!partner&&memory.lastPartner&&isTariffIntent(t)){
        partner=memory.lastPartner;return nav(`tarifs-pro.html?jarvis=${partner}`,`J’ouvre les tarifs ${PARTNERS[partner].name}.`,text,'open_tariffs_context');
      }
      if(partner&&isCatalogueIntent(t)){
        memory.lastIntent='catalogue';saveMemory();return nav(`catalogues.html?jarvis=${partner}`,`J’ouvre le catalogue ${PARTNERS[partner].name}.`,text,'open_catalogue');
      }
      if(!partner&&memory.lastPartner&&isCatalogueIntent(t)){
        partner=memory.lastPartner;return nav(`catalogues.html?jarvis=${partner}`,`J’ouvre le catalogue ${PARTNERS[partner].name}.`,text,'open_catalogue_context');
      }

      if(/\b(agenda|calendrier)\b/.test(t)&&!/\b(ajoute|ajouter|mets|mettre|cree|crée|creer|créer)\b/.test(t))return nav('agenda.html','J’ouvre l’agenda.',text,'open_agenda');
      if(/\b(carte|autour de moi|proche|proximite|proximité|itineraire|itinéraire)\b/.test(t))return nav('carte.html','J’ouvre la carte.',text,'open_map');
      if(/\b(statistique|statistiques|chiffre d affaire|chiffre d’affaires|commission|commissions)\b/.test(t))return nav('statistiques.html','J’ouvre les statistiques.',text,'open_stats');
      if(/\b(compte rendu|compte-rendu|cr visite|comptes rendus)\b/.test(t))return nav('comptes-rendus.html','J’ouvre les comptes-rendus.',text,'open_report');
      if(/\b(mail|email|e-mail|mails)\b/.test(t))return nav('mails-groupes.html','J’ouvre les mails.',text,'open_mail');
      if(t==='clients'||t==='liste clients'||/ouvre.*liste.*client/.test(t))return nav('clients.html','J’ouvre la liste clients.',text,'open_clients');

      if(/\b(page|reference|référence|ref|tarif|prix|catalogue)\b/.test(t)&&!partner){
        return reply('Je comprends la demande, mais pour donner une page, une référence ou un prix exact je dois encore indexer les documents LE ROY FACTORY. Je préfère ne rien inventer.',text,'knowledge_pending');
      }

      if(isOpenIntent(t)||/\b(client|fiche|cherche|chercher|trouve|trouver)\b/.test(t)){
        const c=await findClient(text);
        if(c){memory.lastClientId=c.id;memory.lastClientName=c.societe||c.enseigne||c.contact||'Client';saveMemory();return nav(`clients.html?edit=${encodeURIComponent(c.id)}`,`J’ai trouvé ${memory.lastClientName}. J’ouvre sa fiche.`,text,'open_client')}
      }

      if(memory.lastPartner&&/\b(ouvre|montre|affiche|fais voir|fait voir)\b/.test(t)&&/\b(les|ses|ca|ça)\b/.test(t)){
        const p=PARTNERS[memory.lastPartner];if(memory.lastIntent==='catalogue')return nav(`catalogues.html?jarvis=${memory.lastPartner}`,`J’ouvre le catalogue ${p.name}.`,text,'context_repeat');return nav(`tarifs-pro.html?jarvis=${memory.lastPartner}`,`J’ouvre les tarifs ${p.name}.`,text,'context_repeat');
      }

      return reply('Je n’ai pas encore compris cette formulation. Reformule simplement, par exemple : “ouvre les tarifs Elios”, “météo aujourd’hui”, “cherche DM Home”, “ouvre les statistiques” ou “prépare les tarifs Elios aux clients du 34”.',text,'unknown');
    }catch(e){console.error('Jarvis',e);reply(`Je n’ai pas pu exécuter cette demande : ${e?.message||e}`,text,'error')}
  }
  window.__lrfJarvis=handleCommand;

  async function listen(){
    mic.classList.add('listening');
    try{const out=await VoiceNative.listen({language:'fr-FR'});const text=String(out?.text||'').trim();if(text)await handleCommand(text)}
    catch(e){if(!norm(e?.message||e).includes('annul'))reply(e?.message||'Je n’ai pas compris.','','voice_error')}
    finally{mic.classList.remove('listening')}
  }
  mic.onclick=listen;
  panel.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>handleCommand(b.dataset.j));
  const input=panel.querySelector('#lrf-jarvis-input');
  const send=()=>{const v=input.value.trim();if(!v)return;input.value='';handleCommand(v)};
  panel.querySelector('#lrf-jarvis-send').onclick=send;input.addEventListener('keydown',e=>{if(e.key==='Enter')send()});

  async function prepareMailPage(){
    if(page!=='mails-groupes.html')return;const qs=new URLSearchParams(location.search);if(qs.get('jarvisPrepare')!=='1')return;
    const dep=qs.get('jarvisDept')||'',partner=qs.get('jarvisPartner')||'',year=qs.get('jarvisYear')||'2026';
    let tries=0;const timer=setInterval(()=>{tries++;
      const type=document.getElementById('filter-type'),dept=document.getElementById('filter-dept'),sub=document.getElementById('email-subject'),body=document.getElementById('email-body'),selectAll=document.getElementById('btn-select-all');
      if(!type||!sub){if(tries>100)clearInterval(timer);return}
      clearInterval(timer);type.value='client';type.dispatchEvent(new Event('change',{bubbles:true}));
      if(dep&&dept){dept.value=dep;dept.dispatchEvent(new Event('change',{bubbles:true}))}
      const p=partner?PARTNERS[partner]:null;sub.value=p?`Tarifs ${p.name} ${year}`:`Information LE ROY FACTORY ${year}`;sub.dispatchEvent(new Event('input',{bubbles:true}));
      if(body){body.value=p?`Bonjour,\n\nVeuillez trouver les tarifs ${p.name} ${year}.\n\nCordialement,`:'Bonjour,\n\nVeuillez trouver les informations demandées.\n\nCordialement,';body.dispatchEvent(new Event('input',{bubbles:true}))}
      setTimeout(()=>selectAll?.click(),700);
      reply(`Mail préparé${dep?' pour les clients du '+dep:''}${p?' concernant '+p.name:''}. Vérifiez les destinataires et la pièce jointe puis confirmez l’envoi.`, '', 'mail_ready');
    },150)
  }
  prepareMailPage();
})();
