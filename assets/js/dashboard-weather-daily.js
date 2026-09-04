(()=>{
  'use strict';
  if(window.__LRF_DASH_WEATHER_DAILY__) return;
  window.__LRF_DASH_WEATHER_DAILY__=true;

  const $=s=>document.querySelector(s);
  const clean=v=>String(v??'').trim();
  const pad=n=>String(n).padStart(2,'0');
  const WEATHER_TTL=8*60*1000;
  let weatherData=null;
  let coords=null;
  let refreshTimer=null;

  const LEO_MESSAGES=[
    {h:"Votre énergie est franche aujourd’hui : privilégiez une décision claire plutôt que dix petites hésitations.",q:"L’élan vient quand la direction devient claire."},
    {h:"Une conversation professionnelle peut débloquer quelque chose. Écoutez d’abord, puis allez droit au but.",q:"La confiance se construit dans les actes simples."},
    {h:"Votre sens de l’initiative est votre meilleur atout. Utilisez-le sur le dossier qui compte vraiment.",q:"Une priorité bien choisie vaut mieux qu’une journée dispersée."},
    {h:"Vous aurez intérêt à garder un rythme régulier. Le résultat viendra davantage de la constance que de la précipitation.",q:"Avancer calmement, c’est toujours avancer."},
    {h:"Le relationnel est favorisé : un appel, une visite ou un message bien placé peut produire un effet positif.",q:"Le bon contact au bon moment change une journée."},
    {h:"Votre créativité commerciale peut faire la différence. Osez présenter les choses autrement, sans perdre votre objectif.",q:"Se distinguer commence souvent par une idée simple."},
    {h:"Une journée utile pour remettre de l’ordre dans les priorités et finir ce qui traîne avant d’ouvrir un nouveau chantier.",q:"Terminer libère autant d’énergie que commencer."},
    {h:"Votre présence sera remarquée. Restez naturel et précis : inutile d’en faire trop pour convaincre.",q:"La crédibilité parle plus fort que le bruit."},
    {h:"Un imprévu peut modifier le programme, mais vous saurez le transformer en occasion si vous gardez de la souplesse.",q:"S’adapter n’est pas renoncer à son cap."},
    {h:"Bon moment pour relancer un contact ou reprendre un dossier laissé en attente. La persévérance est favorisée.",q:"Une relance intelligente ouvre parfois une porte fermée hier."},
    {h:"Votre intuition est bonne, mais vérifiez les détails avant de conclure. Le mélange instinct + méthode sera gagnant.",q:"L’intuition choisit la direction, la méthode sécurise le chemin."},
    {h:"La journée pousse à l’action concrète. Concentrez-vous sur ce qui peut être réellement bouclé avant ce soir.",q:"Le concret transforme les intentions en résultats."},
    {h:"Une personne peut vous apporter une information utile. Gardez l’esprit ouvert aux échanges imprévus.",q:"Une bonne information arrive souvent par une conversation ordinaire."},
    {h:"Votre ambition est stimulée, mais gardez de la place pour les pauses : un esprit reposé négocie mieux.",q:"L’efficacité n’est pas une course sans arrêt."},
    {h:"Vous pourrez obtenir davantage en simplifiant votre message. Un objectif, une proposition, une prochaine étape.",q:"La simplicité rend l’action évidente."},
    {h:"Le climat du jour vous encourage à montrer votre savoir-faire. Mettez en avant ce que vous maîtrisez vraiment.",q:"La maîtrise crée naturellement la confiance."},
    {h:"Une petite victoire peut donner le ton à toute la journée. Commencez par une tâche importante mais réalisable.",q:"Le premier résultat entraîne souvent le suivant."},
    {h:"Attention à ne pas vouloir tout contrôler. Laissez une marge aux autres et concentrez-vous sur votre rôle.",q:"Diriger son énergie vaut mieux que vouloir tout diriger."},
    {h:"Votre sens du contact est fort aujourd’hui. C’est une bonne journée pour les visites terrain et les échanges directs.",q:"Le terrain rappelle toujours ce qui compte vraiment."},
    {h:"Une décision ancienne mérite peut-être d’être réévaluée avec les informations d’aujourd’hui.",q:"Changer d’avis avec de meilleures données est une force."},
    {h:"Vous gagnerez à protéger votre concentration. Coupez les distractions pendant les moments importants.",q:"L’attention est une ressource commerciale précieuse."}
  ];

  const CORYNE_MOTIVATION=[
    "Aujourd’hui, une priorité bien menée vaut mieux qu’une longue liste commencée.",
    "Chaque échange client est une occasion de faire avancer la relation, même d’un petit pas.",
    "Commence par le dossier le plus important : le reste de la journée paraîtra plus léger.",
    "La régularité fait la différence : un appel, une relance, un compte-rendu, puis le suivant.",
    "Une bonne journée commerciale se construit avec des actions simples faites au bon moment.",
    "Garde le cap sur l’essentiel et laisse les petites urgences attendre leur tour.",
    "Aujourd’hui, vise le progrès plutôt que la perfection : avancer est déjà gagner.",
    "Un contact bien préparé vaut souvent plusieurs relances improvisées.",
    "Ta meilleure énergie est celle que tu mets sur les clients qui comptent vraiment.",
    "Fais simple, fais clair, fais avancer : c’est une excellente méthode pour la journée.",
    "Une réponse négative n’arrête pas la journée ; elle libère du temps pour la prochaine opportunité.",
    "Prends le temps de bien écouter : les meilleures informations commerciales viennent souvent du client lui-même.",
    "Aujourd’hui, transforme chaque tâche terminée en espace mental disponible pour la suivante.",
    "La constance est une force discrète : continue à avancer, dossier après dossier.",
    "Un bon compte-rendu aujourd’hui évite une question demain.",
    "Mets de l’énergie là où tu peux créer un résultat concret avant ce soir.",
    "Reste disponible aux opportunités sans perdre la priorité de la journée.",
    "Le meilleur rythme est celui que tu peux tenir toute la journée avec qualité.",
    "Une relance faite maintenant peut devenir le rendez-vous de demain.",
    "Aujourd’hui, garde une chose en tête : chaque action utile rapproche du résultat.",
    "Travaille avec méthode, mais garde assez de souplesse pour saisir l’imprévu intéressant."
  ];

  function dayIndex(length){
    const n=new Date();
    const start=new Date(n.getFullYear(),0,0);
    const doy=Math.floor((n-start)/86400000);
    return (doy+n.getFullYear())%length;
  }

  function weatherMeta(code,isDay=true){
    const c=Number(code);
    if(c===0)return{icon:isDay?'☀️':'🌙',label:'Ciel dégagé'};
    if(c===1)return{icon:isDay?'🌤️':'🌙',label:'Peu nuageux'};
    if(c===2)return{icon:'⛅',label:'Partiellement nuageux'};
    if(c===3)return{icon:'☁️',label:'Couvert'};
    if([45,48].includes(c))return{icon:'🌫️',label:'Brouillard'};
    if([51,53,55,56,57].includes(c))return{icon:'🌦️',label:'Bruine'};
    if([61,63,65,66,67].includes(c))return{icon:'🌧️',label:'Pluie'};
    if([71,73,75,77].includes(c))return{icon:'🌨️',label:'Neige'};
    if([80,81,82].includes(c))return{icon:'🌦️',label:'Averses'};
    if([85,86].includes(c))return{icon:'🌨️',label:'Averses de neige'};
    if([95,96,99].includes(c))return{icon:'⛈️',label:'Orage'};
    return{icon:'🌤️',label:'Météo'};
  }

  function installStyles(){
    if($('#lrf-weather-daily-style'))return;
    const s=document.createElement('style');
    s.id='lrf-weather-daily-style';
    s.textContent=`
      .lrf-mini-calendar{width:38px;height:38px;border-radius:10px;overflow:hidden;display:grid;grid-template-rows:14px 1fr;background:#fffaf0;border:1px solid rgba(125,77,0,.44);box-shadow:inset 0 1px 1px #fff,0 2px 5px rgba(89,54,0,.17);font-family:Inter,system-ui,sans-serif;text-shadow:none}
      .lrf-mini-calendar-month{display:grid;place-items:center;background:linear-gradient(#e75045,#bd3028);color:white;font-size:7px;font-weight:900;letter-spacing:.08em}
      .lrf-mini-calendar-day{display:grid;place-items:center;color:#24180a;font-size:16px;font-weight:950;line-height:1}
      .lrf-weather-chip.lrf-weather-button{cursor:pointer!important;appearance:none;text-align:left;min-width:78px}
      .lrf-weather-chip.lrf-weather-button:hover{transform:translateY(-2px);filter:saturate(1.06)}
      .lrf-weather-icon-wrap{position:relative;display:grid;place-items:center}
      .lrf-weather-temp-badge{position:absolute;right:-9px;bottom:-7px;min-width:31px;height:18px;padding:0 4px;display:grid;place-items:center;border-radius:999px;background:#16120c;color:#ffd05a;border:1px solid #c68e1e;font:900 9px/1 Inter,sans-serif;box-shadow:0 3px 7px rgba(0,0,0,.28);text-shadow:none;z-index:2}
      .lrf-weather-modal{position:fixed;inset:0;z-index:2147483500;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(12,14,16,.62);backdrop-filter:blur(4px)}
      .lrf-weather-modal.open{display:flex}
      .lrf-weather-card{width:min(520px,100%);max-height:90dvh;overflow:auto;border:1px solid #c79224;border-radius:22px;padding:16px;background:linear-gradient(155deg,#fffdf7,#f8edcf 64%,#edd59a);color:#2e2416;box-shadow:0 26px 80px rgba(0,0,0,.32),inset 0 1px 0 #fff}
      .lrf-weather-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}.lrf-weather-hero-icon{width:58px;height:58px;border-radius:17px;display:grid;place-items:center;font-size:34px;background:radial-gradient(circle at 35% 25%,#fffef7,#f6d675 60%,#ca8f16);border:1px solid #a87410;box-shadow:inset 0 1px 2px #fff,0 6px 14px rgba(111,71,0,.16)}
      .lrf-weather-head-copy{flex:1;min-width:0}.lrf-weather-head-copy h3{margin:0;font-size:1.02rem}.lrf-weather-head-copy p{margin:3px 0 0;color:#736349;font-size:.75rem}.lrf-weather-now{font-size:1.65rem;font-weight:950;color:#20180d;white-space:nowrap}.lrf-weather-close{width:38px;height:38px;border-radius:50%;border:1px solid #c8a35a;background:#fff9ed;color:#5b3d08;font-size:22px;cursor:pointer}
      .lrf-weather-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}.lrf-weather-metric{padding:9px 7px;border-radius:12px;background:rgba(255,255,255,.74);border:1px solid rgba(186,140,48,.28);text-align:center}.lrf-weather-metric span{display:block;font-size:.63rem;color:#7b6a4f;font-weight:800}.lrf-weather-metric strong{display:block;margin-top:3px;font-size:.88rem;color:#302416}
      .lrf-weather-hours{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.lrf-weather-hour{padding:8px 5px;border-radius:11px;background:#fff;border:1px solid #e3d5b9;text-align:center}.lrf-weather-hour b,.lrf-weather-hour span{display:block}.lrf-weather-hour b{font-size:.68rem;color:#74571e}.lrf-weather-hour .wi{font-size:20px;margin:4px 0}.lrf-weather-hour span{font-size:.72rem;font-weight:850}
      .lrf-daily-message{margin-top:12px;padding:13px;border-radius:15px;background:linear-gradient(145deg,#fff9df,#ffeaaa);border:1px solid #dab24b;box-shadow:inset 0 1px 0 #fff}.lrf-daily-message h4{margin:0 0 7px;font-size:.9rem}.lrf-daily-message p{font-size:.78rem;line-height:1.45;margin:0;color:#574520}.lrf-daily-quote{margin-top:8px!important;padding-top:8px;border-top:1px solid rgba(151,109,20,.2);font-weight:850;font-style:italic;color:#44320f!important}
      .lrf-weather-location{font-size:.67rem;color:#7b6b51;margin-top:8px;text-align:center}.lrf-weather-error{padding:14px;border-radius:12px;background:#fff7ef;border:1px solid #e1b595;color:#8b3e25;font-size:.78rem;line-height:1.45}.lrf-weather-retry{margin-top:9px;min-height:38px;border-radius:10px;border:1px solid #b98318;background:#111;color:#ffd052;font-weight:850;padding:0 12px;cursor:pointer}
      @media(max-width:760px){.lrf-weather-modal{align-items:flex-end;padding:8px}.lrf-weather-card{width:100%;max-height:86dvh;border-radius:22px 22px 14px 14px;padding:14px}.lrf-weather-metrics{grid-template-columns:repeat(2,1fr)}.lrf-weather-hours{grid-template-columns:repeat(4,1fr)}html body.crm-body .lrf-weather-chip.lrf-weather-button{min-width:82px!important}}
      @media(max-width:390px){.lrf-weather-hours{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(s);
  }

  function agentKind(){
    const email=clean(localStorage.getItem('agentEmail')).toLowerCase();
    const name=clean(localStorage.getItem('agentName')).toLowerCase();
    if(email==='coryne@leroyfactory.fr'||name.includes('coryne'))return'coryne';
    return'jerome';
  }

  function updateMiniCalendar(){
    const btn=$('#lrf-calendar-btn');if(!btn)return;
    const icon=btn.querySelector('.lrf-status-icon');if(!icon)return;
    const n=new Date();
    const month=n.toLocaleDateString('fr-FR',{month:'short'}).replace('.','').toUpperCase();
    icon.innerHTML=`<span class="lrf-mini-calendar" aria-hidden="true"><span class="lrf-mini-calendar-month">${month}</span><span class="lrf-mini-calendar-day">${pad(n.getDate())}</span></span>`;
    icon.style.background='transparent';icon.style.border='0';icon.style.boxShadow='none';icon.style.width='40px';icon.style.height='40px';
    btn.setAttribute('aria-label',`Ouvrir l'agenda — ${n.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}`);
  }

  function weatherButton(){
    let chip=$('.lrf-weather-chip');if(!chip)return null;
    if(chip.tagName!=='BUTTON'){
      const b=document.createElement('button');
      b.type='button';b.className=chip.className+' lrf-weather-button';b.id='lrf-weather-btn';b.setAttribute('aria-label','Ouvrir la météo du jour');
      while(chip.firstChild)b.appendChild(chip.firstChild);chip.replaceWith(b);chip=b;
    }else{chip.classList.add('lrf-weather-button');chip.id='lrf-weather-btn';}
    let icon=chip.querySelector('.lrf-status-icon');
    if(icon&&!icon.querySelector('.lrf-weather-icon-wrap'))icon.innerHTML='<span class="lrf-weather-icon-wrap"><span class="lrf-weather-glyph">🌤️</span><span class="lrf-weather-temp-badge">--°</span></span>';
    return chip;
  }

  function getStoredCoords(){
    try{const c=JSON.parse(localStorage.getItem('lrf-weather-location')||'null');if(Number.isFinite(c?.lat)&&Number.isFinite(c?.lon))return c;}catch{}
    return null;
  }
  function locate(force=false){
    return new Promise(resolve=>{
      const saved=getStoredCoords();if(saved&&!force){resolve(saved);return;}
      if(!navigator.geolocation){resolve(saved);return;}
      navigator.geolocation.getCurrentPosition(p=>{
        const c={lat:p.coords.latitude,lon:p.coords.longitude,at:Date.now()};
        try{localStorage.setItem('lrf-weather-location',JSON.stringify(c));}catch{}
        resolve(c);
      },()=>resolve(saved),{enableHighAccuracy:false,timeout:9000,maximumAge:10*60*1000});
    });
  }

  async function fetchWeather(force=false){
    const c=await locate(force);coords=c;
    if(!c)throw new Error('LOCALISATION');
    const cacheKey=`lrf-weather-cache:${c.lat.toFixed(2)},${c.lon.toFixed(2)}`;
    if(!force){try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached?.at&&Date.now()-cached.at<WEATHER_TTL)return cached.data;}catch{}}
    const params=new URLSearchParams({
      latitude:String(c.lat),longitude:String(c.lon),timezone:'auto',forecast_days:'1',
      current:'temperature_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m',
      daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,wind_speed_10m_max',
      hourly:'temperature_2m,weather_code,precipitation_probability'
    });
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`,{cache:'no-store'});
    if(!r.ok)throw new Error('WEATHER');
    const data=await r.json();
    try{localStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),data}));}catch{}
    return data;
  }

  function hhmm(iso){if(!iso)return'--:--';const d=new Date(iso);return Number.isNaN(d.getTime())?String(iso).slice(-5):d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}
  function nearestHours(data){
    const times=data.hourly?.time||[],temps=data.hourly?.temperature_2m||[],codes=data.hourly?.weather_code||[],rain=data.hourly?.precipitation_probability||[];
    const wanted=[8,12,16,20];
    return wanted.map(hour=>{
      let idx=times.findIndex(t=>new Date(t).getHours()===hour);if(idx<0)idx=0;
      return{hour:`${pad(hour)}h`,temp:Math.round(temps[idx]??0),code:codes[idx],rain:Math.round(rain[idx]??0)};
    });
  }

  function ensureModal(){
    let modal=$('#lrf-weather-modal');if(modal)return modal;
    modal=document.createElement('div');modal.id='lrf-weather-modal';modal.className='lrf-weather-modal';modal.innerHTML='<div class="lrf-weather-card" role="dialog" aria-modal="true" aria-label="Météo du jour"><div id="lrf-weather-content"><div class="lrf-weather-error">Chargement de la météo…</div></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.lrf-weather-close'))modal.classList.remove('open');});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.classList.remove('open');});
    return modal;
  }

  function personalizedBlock(){
    if(agentKind()==='coryne'){
      const line=CORYNE_MOTIVATION[dayIndex(CORYNE_MOTIVATION.length)];
      return `<div class="lrf-daily-message"><h4>💼 Motivation du jour</h4><p>${line}</p></div>`;
    }
    const m=LEO_MESSAGES[dayIndex(LEO_MESSAGES.length)];
    return `<div class="lrf-daily-message"><h4>♌ Horoscope du jour — Lion</h4><p>${m.h}</p><p class="lrf-daily-quote">« ${m.q} »</p></div>`;
  }

  function renderModal(data){
    const cur=data.current||{},daily=data.daily||{},meta=weatherMeta(cur.weather_code,!!cur.is_day),hours=nearestHours(data);
    const content=$('#lrf-weather-content');if(!content)return;
    content.innerHTML=`
      <div class="lrf-weather-head">
        <div class="lrf-weather-hero-icon">${meta.icon}</div>
        <div class="lrf-weather-head-copy"><h3>Météo de la journée</h3><p>${meta.label} · mise à jour ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</p></div>
        <div class="lrf-weather-now">${Math.round(cur.temperature_2m)}°</div>
        <button type="button" class="lrf-weather-close" aria-label="Fermer">×</button>
      </div>
      <div class="lrf-weather-metrics">
        <div class="lrf-weather-metric"><span>Ressenti</span><strong>${Math.round(cur.apparent_temperature)}°C</strong></div>
        <div class="lrf-weather-metric"><span>Mini / Maxi</span><strong>${Math.round(daily.temperature_2m_min?.[0])}° / ${Math.round(daily.temperature_2m_max?.[0])}°</strong></div>
        <div class="lrf-weather-metric"><span>Pluie max.</span><strong>${Math.round(daily.precipitation_probability_max?.[0]??0)} %</strong></div>
        <div class="lrf-weather-metric"><span>Vent actuel</span><strong>${Math.round(cur.wind_speed_10m??0)} km/h</strong></div>
        <div class="lrf-weather-metric"><span>Lever du soleil</span><strong>${hhmm(daily.sunrise?.[0])}</strong></div>
        <div class="lrf-weather-metric"><span>Coucher du soleil</span><strong>${hhmm(daily.sunset?.[0])}</strong></div>
      </div>
      <div class="lrf-weather-hours">${hours.map(h=>{const m=weatherMeta(h.code,true);return `<div class="lrf-weather-hour"><b>${h.hour}</b><span class="wi">${m.icon}</span><span>${h.temp}° · ${h.rain}%</span></div>`}).join('')}</div>
      ${personalizedBlock()}
      <div class="lrf-weather-location">📍 Météo calculée à partir de la position de cet appareil.</div>`;
  }

  function renderError(err){
    const content=$('#lrf-weather-content');if(!content)return;
    const isLoc=String(err?.message)==='LOCALISATION';
    content.innerHTML=`<div class="lrf-weather-head"><div class="lrf-weather-hero-icon">🌤️</div><div class="lrf-weather-head-copy"><h3>Météo de la journée</h3><p>LE ROY FACTORY</p></div><button type="button" class="lrf-weather-close" aria-label="Fermer">×</button></div><div class="lrf-weather-error">${isLoc?'Autorisez la localisation sur cet appareil pour afficher la température précise de l’endroit où vous vous trouvez.':'La météo est momentanément indisponible.'}<br><button type="button" class="lrf-weather-retry">🔄 Réessayer</button></div>${personalizedBlock()}`;
    content.querySelector('.lrf-weather-retry')?.addEventListener('click',()=>refreshWeather(true,true));
  }

  function updateChip(data){
    const chip=weatherButton();if(!chip)return;
    const cur=data.current||{},meta=weatherMeta(cur.weather_code,!!cur.is_day),temp=Math.round(cur.temperature_2m);
    const glyph=chip.querySelector('.lrf-weather-glyph'),badge=chip.querySelector('.lrf-weather-temp-badge');
    if(glyph)glyph.textContent=meta.icon;if(badge)badge.textContent=`${temp}°`;
    const copy=chip.querySelector('.lrf-status-copy');if(copy)copy.innerHTML=`<strong>${temp}°C</strong><span>${meta.label}</span>`;
    chip.setAttribute('aria-label',`Météo actuelle : ${temp} degrés, ${meta.label}. Ouvrir les détails.`);
  }

  async function refreshWeather(force=false,openAfter=false){
    try{const data=await fetchWeather(force);weatherData=data;updateChip(data);if(openAfter){ensureModal().classList.add('open');renderModal(data);}}
    catch(err){console.warn('[Dashboard météo]',err);weatherData=null;if(openAfter){ensureModal().classList.add('open');renderError(err);}}
  }

  function bind(){
    if(window.__LRF_DASH_WEATHER_EVENTS__)return;window.__LRF_DASH_WEATHER_EVENTS__=true;
    document.addEventListener('click',e=>{
      if(!e.target.closest('#lrf-weather-btn'))return;
      e.preventDefault();e.stopPropagation();const modal=ensureModal();modal.classList.add('open');
      if(weatherData)renderModal(weatherData);else{const c=$('#lrf-weather-content');if(c)c.innerHTML='<div class="lrf-weather-error">Chargement de la météo…</div>';refreshWeather(false,true);}
    },true);
  }

  function heal(){updateMiniCalendar();weatherButton();}
  function init(){
    installStyles();heal();bind();
    setTimeout(heal,300);setTimeout(heal,1000);setTimeout(()=>refreshWeather(false,false),1100);
    refreshTimer=setInterval(()=>refreshWeather(true,false),10*60*1000);
    let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;heal();if(weatherData)updateChip(weatherData);},120);}).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
