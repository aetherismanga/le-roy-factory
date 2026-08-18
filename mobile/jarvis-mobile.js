import { registerPlugin } from '@capacitor/core';

const VoiceNative = registerPlugin('VoiceNative');

(()=>{
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(!native)return;

  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const DYNAMIC_IMPORT=new Function('p','return import(p)');
  const PARTNERS={
    elios:{name:'Elios Ceramica',tarif:'assets/pdf/elios2026.pdf',catalogue:'catalogues.html?jarvis=elios'},
    view:{name:'View Ceramica',tarif:'assets/pdf/view2026.pdf',catalogue:'catalogues.html?jarvis=view'},
    reviglass:{name:'Reviglass',tarif:'assets/pdf/reviglass2026.pdf',catalogue:'catalogues.html?jarvis=reviglass'},
    biopietra:{name:'Biopietra',tarif:'assets/pdf/biopietra2026.pdf',catalogue:'catalogues.html?jarvis=biopietra'},
    bulbo:{name:'Bulbo',tarif:'assets/pdf/bulbo2026.pdf',catalogue:'catalogues.html?jarvis=bulbo'},
    randal:{name:'Randal Pro',tarif:'assets/pdf/RANDAL03.pdf',catalogue:'catalogues.html?jarvis=randal'},
    neobath:{name:'Neobath',tarif:'assets/pdf/neobathANIMA.pdf',catalogue:'catalogues.html?jarvis=neobath'},
    petracer:{name:"Petracer's",tarif:'assets/pdf/petracer2023.pdf',catalogue:'catalogues.html?jarvis=petracer'},
    pecchioli:{name:'Pecchioli Firenze',tarif:'assets/pdf/pecchioli2022.pdf',catalogue:'catalogues.html?jarvis=pecchioli'}
  };

  const style=document.createElement('style');
  style.textContent=`
    #lrf-top-mic{display:none!important}
    #lrf-jarvis-mic{position:fixed;top:max(14px,env(safe-area-inset-top));right:16px;width:50px;height:50px;border-radius:50%;border:1px solid #D4AF37;background:#111;color:#fff;font-size:1.38rem;display:flex;align-items:center;justify-content:center;z-index:199500;box-shadow:0 8px 22px rgba(0,0,0,.22)}
    #lrf-jarvis-mic.listening{background:#8B1E1E;animation:lrfJarvisPulse 1s infinite}
    #lrf-jarvis-panel{position:fixed;inset:0;z-index:310000;display:none;background:rgba(0,0,0,.38);align-items:flex-end}
    #lrf-jarvis-panel.open{display:flex}
    #lrf-jarvis-card{width:100%;max-height:72dvh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:14px 14px max(18px,env(safe-area-inset-bottom));box-shadow:0 -18px 45px rgba(0,0,0,.25);box-sizing:border-box;color:#17202A}
    .lrf-jarvis-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.lrf-jarvis-head strong{font-size:1.05rem}.lrf-jarvis-head button{border:0;background:#eee;width:38px;height:38px;border-radius:50%;font-size:1.2rem}
    #lrf-jarvis-answer{background:#F8F6F2;border:1px solid #E7E2D9;border-radius:14px;padding:12px;font-size:.9rem;line-height:1.42;min-height:48px;white-space:pre-wrap}
    #lrf-jarvis-heard{font-size:.72rem;color:#777;margin:8px 2px 0}.lrf-jarvis-actions{display:flex;gap:8px;margin-top:10px;overflow-x:auto}.lrf-jarvis-actions button{white-space:nowrap;border:1px solid #D4AF37;background:#111;color:#FFD700;border-radius:10px;padding:9px 11px;font-weight:800}
    @keyframes lrfJarvisPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  `;
  document.head.appendChild(style);

  const panel=document.createElement('div');panel.id='lrf-jarvis-panel';panel.innerHTML=`<div id="lrf-jarvis-card"><div class="lrf-jarvis-head"><strong>🎙️ Jarvis — LE ROY FACTORY</strong><button id="lrf-jarvis-close" type="button">×</button></div><div id="lrf-jarvis-answer">Je suis prêt.</div><div id="lrf-jarvis-heard"></div><div class="lrf-jarvis-actions"><button type="button" data-j="clients">Clients</button><button type="button" data-j="agenda">Agenda</button><button type="button" data-j="carte">Carte</button><button type="button" data-j="tarifs elios">Tarifs Elios</button></div></div>`;document.body.appendChild(panel);
  panel.querySelector('#lrf-jarvis-close').onclick=()=>panel.classList.remove('open');panel.addEventListener('click',e=>{if(e.target===panel)panel.classList.remove('open')});
  panel.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>handleCommand(b.dataset.j));

  const mic=document.createElement('button');mic.id='lrf-jarvis-mic';mic.type='button';mic.textContent='🎙️';mic.title='Parler à Jarvis';mic.setAttribute('aria-label','Parler à Jarvis');document.body.appendChild(mic);

  function show(answer,heard=''){panel.classList.add('open');panel.querySelector('#lrf-jarvis-answer').textContent=answer;panel.querySelector('#lrf-jarvis-heard').textContent=heard?`Vous : ${heard}`:''}
  function speak(text){
    try{if('speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text||''));u.lang='fr-FR';u.rate=1;window.speechSynthesis.speak(u)}}catch{}
  }
  function reply(text,heard=''){show(text,heard);speak(text)}
  function partnerFromText(t){const n=norm(t);return Object.entries(PARTNERS).find(([k,p])=>n.includes(k)||n.includes(norm(p.name)))?.[0]||null}
  function nav(url,text){reply(text);setTimeout(()=>location.href=url,450)}

  async function getClients(){
    const firebaseUrl=new URL('assets/js/firebase.js',location.href).href;
    const [{db},fs]=await Promise.all([DYNAMIC_IMPORT(firebaseUrl),DYNAMIC_IMPORT('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')]);
    const snap=await fs.getDocs(fs.collection(db,'clients'));
    return snap.docs.map(d=>({id:d.id,...d.data()})).filter(c=>c.archived!==true&&c.archive!==true);
  }
  async function findClient(query){
    const q=norm(query).replace(/^(ouvre|ouvrir|cherche|chercher|trouve|trouver|client|fiche|va chez|montre moi)\s+/,'').trim();
    if(!q)return null;
    const rows=await getClients();
    const scored=rows.map(c=>{const hay=norm([c.societe,c.enseigne,c.contact,c.ville,c.codeClient,c.codeLRF].filter(Boolean).join(' '));let s=0;if(hay===q)s=100;if(hay.startsWith(q))s=Math.max(s,80);if(hay.includes(q))s=Math.max(s,60);for(const w of q.split(/\s+/))if(w.length>2&&hay.includes(w))s+=8;return{c,s}}).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
    return scored[0]?.c||null;
  }
  async function weather(){
    const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:12000,maximumAge:60000}));
    const {latitude,longitude}=pos.coords;
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`);
    if(!r.ok)throw new Error('Météo indisponible');const d=await r.json(),c=d.current||{};
    const code=Number(c.weather_code);const state=code===0?'ciel dégagé':code<=3?'partiellement nuageux':code<=48?'brumeux':code<=67?'pluvieux':code<=77?'neigeux':code<=82?'averses':code<=99?'orageux':'variable';
    return `Il fait ${Math.round(c.temperature_2m)} degrés, ressenti ${Math.round(c.apparent_temperature)} degrés. Le temps est ${state}. Vent ${Math.round(c.wind_speed_10m||0)} kilomètres heure.`;
  }
  function extractDept(t){const m=String(t).match(/(?:departement|département|du|dans le|dans l[e'])\s*(\d{2,3})\b/i)||String(t).match(/\b(11|30|34|66)\b/);return m?.[1]||''}
  function prepareMailUrl(text){const dep=extractDept(text),partner=partnerFromText(text)||'',year=(String(text).match(/\b20\d{2}\b/)||[])[0]||'';const p=new URLSearchParams();if(dep)p.set('jarvisDept',dep);p.set('jarvisType','client');if(partner)p.set('jarvisPartner',partner);if(year)p.set('jarvisYear',year);p.set('jarvisPrepare','1');return `mails-groupes.html?${p.toString()}`}

  async function handleCommand(raw){
    const text=String(raw||'').trim(),t=norm(text);if(!t)return;
    show('Je cherche…',text);
    try{
      if(/\b(meteo|temps fait|temperature)\b/.test(t)){const ans=await weather();return reply(ans,text)}
      if(/\b(agenda|calendrier|rendez vous|rdv)\b/.test(t)&&!/ajoute|ajouter|mets|mettre|cree|crée/.test(t))return nav('agenda.html','J’ouvre l’agenda.');
      if(/\b(carte|autour de moi|proche|proximite|itineraire)\b/.test(t))return nav('carte.html','J’ouvre la carte.');
      if(/\b(statistique|chiffre d affaire|commission)\b/.test(t))return nav('statistiques.html','J’ouvre les statistiques.');
      if(/\b(compte rendu|compte-rendu|cr visite)\b/.test(t))return nav('comptes-rendus.html','J’ouvre les comptes-rendus.');
      if(/\b(mail groupe|mail groupé|mails groupes|mails groupés)\b/.test(t)&&/(envoie|envoyer|prepare|prépare|tarif|catalogue)/.test(t))return nav(prepareMailUrl(text),'Je prépare le mail groupé. Vous validerez l’envoi avant qu’il parte.');
      if(/\b(mail|email|e-mail)\b/.test(t)&&!/client/.test(t))return nav('mails-groupes.html','J’ouvre la rédaction des mails.');

      const partner=partnerFromText(t);
      if(partner&&/\b(tarif|prix|grille)\b/.test(t))return nav(`tarifs-pro.html?jarvis=${partner}`,`J’ouvre les tarifs ${PARTNERS[partner].name}.`);
      if(partner&&/\b(catalogue|collection)\b/.test(t))return nav(PARTNERS[partner].catalogue,`J’ouvre le catalogue ${PARTNERS[partner].name}.`);
      if(/\b(page|reference|référence|tarif|prix|catalogue)\b/.test(t)&&!partner){return reply('Je peux ouvrir les tarifs et catalogues. Pour répondre avec une page ou une référence exacte, le document doit être indexé dans la base Jarvis. Je n’inventerai jamais un numéro de page ou un prix.',text)}

      if(/\b(client|fiche|ouvre|cherche|trouve|montre moi|va chez)\b/.test(t)){
        const c=await findClient(text);if(c)return nav(`clients.html?edit=${encodeURIComponent(c.id)}`,`J’ai trouvé ${c.societe||c.enseigne||'le client'}. J’ouvre sa fiche.`);
        return reply('Je ne trouve pas ce client dans la base active.',text);
      }

      if(t==='clients'||t==='liste clients')return nav('clients.html','J’ouvre la liste clients.');
      return reply('Je n’ai pas encore compris cette demande. Je peux chercher un client, ouvrir les tarifs ou catalogues, préparer un mail groupé, ouvrir l’agenda, la carte, les statistiques et donner la météo.',text);
    }catch(e){console.error('Jarvis',e);reply(`Je n’ai pas pu exécuter cette demande : ${e?.message||e}`,text)}
  }
  window.__lrfJarvis=handleCommand;

  mic.onclick=async()=>{try{mic.classList.add('listening');const out=await VoiceNative.listen({language:'fr-FR'});const text=String(out?.text||'').trim();if(text)await handleCommand(text)}catch(e){if(!norm(e?.message||e).includes('annul'))reply(e?.message||'Je n’ai pas compris.')}finally{mic.classList.remove('listening')}};

  // Préparation automatique d'un mail demandé par Jarvis.
  async function prepareMailPage(){
    if(page!=='mails-groupes.html')return;const qs=new URLSearchParams(location.search);if(qs.get('jarvisPrepare')!=='1')return;
    const dep=qs.get('jarvisDept')||'',partner=qs.get('jarvisPartner')||'',year=qs.get('jarvisYear')||'2026';
    let tries=0;const timer=setInterval(async()=>{tries++;
      const type=document.getElementById('filter-type'),dept=document.getElementById('filter-dept'),sub=document.getElementById('email-subject'),body=document.getElementById('email-body'),selectAll=document.getElementById('btn-select-all');
      if(!type||!sub||tries>80){if(tries>80)clearInterval(timer);return}
      clearInterval(timer);type.value='client';type.dispatchEvent(new Event('change',{bubbles:true}));
      if(dep&&dept){dept.value=dep;dept.dispatchEvent(new Event('change',{bubbles:true}))}
      const p=partner?PARTNERS[partner]:null;sub.value=p?`Tarifs ${p.name} ${year}`:`Information LE ROY FACTORY ${year}`;sub.dispatchEvent(new Event('input',{bubbles:true}));
      if(body){body.value=p?`Bonjour,\n\nVeuillez trouver ci-joint les tarifs ${p.name} ${year}.\n\nCordialement,`:'Bonjour,\n\nVeuillez trouver ci-joint les informations demandées.\n\nCordialement,';body.dispatchEvent(new Event('input',{bubbles:true}))}
      setTimeout(()=>selectAll?.click(),650);
      if(p?.tarif){try{const input=document.getElementById('file-attachment');if(input){const res=await fetch(p.tarif);if(res.ok){const blob=await res.blob();const file=new File([blob],p.tarif.split('/').pop(),{type:blob.type||'application/pdf'});const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))}}}catch(e){console.warn('Pièce jointe Jarvis',e)}}
      reply(`Mail préparé${dep?' pour les clients du '+dep:''}${p?' avec les tarifs '+p.name:''}. Vérifiez puis confirmez l’envoi.`);
    },150)}
  prepareMailPage();
})();
