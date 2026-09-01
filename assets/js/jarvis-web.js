(()=>{
  if (window.Capacitor?.isNativePlatform?.()) return;
  const currentPage=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const crmPages=new Set(['dashboard.html','clients.html','agenda.html','comptes-rendus.html','mails-groupes.html','carte.html','statistiques.html','demandes-clients.html','nouveau-compte-rendu.html']);
  if (crmPages.has(currentPage) || document.body?.classList.contains('crm-body')) {
    document.getElementById('lrf-web-jarvis')?.remove();
    return;
  }
  if (document.getElementById('lrf-web-jarvis')) return;

  const ENDPOINT='https://us-central1-le-roy-factory.cloudfunctions.net/jarvisAi';
  const MEMORY_KEY='lrfJarvisWebMemoryV1';
  const HISTORY_MAX=20;

  const readMemory=()=>{try{return JSON.parse(localStorage.getItem(MEMORY_KEY)||'{"history":[]}')||{history:[]}}catch{return{history:[]}}};
  const saveMemory=m=>{m.history=(Array.isArray(m.history)?m.history:[]).slice(-HISTORY_MAX);m.updatedAt=new Date().toISOString();localStorage.setItem(MEMORY_KEY,JSON.stringify(m))};
  const remember=(user,assistant)=>{const m=readMemory();m.history=Array.isArray(m.history)?m.history:[];m.history.push({user,assistant,at:new Date().toISOString()});saveMemory(m)};

  const style=document.createElement('style');
  style.textContent=`
    #lrf-web-jarvis{position:relative;z-index:50;width:100%;box-sizing:border-box;padding:10px 16px;background:rgba(17,17,17,.96);border-top:1px solid #D4AF37;border-bottom:1px solid #D4AF37;box-shadow:0 4px 14px rgba(0,0,0,.14);font-family:Inter,Arial,sans-serif}
    #lrf-web-jarvis.lrf-jw-offset{margin-top:130px}
    #lrf-web-jarvis .lrf-jw-inner{width:min(860px,100%);margin:0 auto}
    #lrf-web-jarvis .lrf-jw-form{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;background:#fff;border:1px solid #D4AF37;border-radius:999px;padding:5px 6px 5px 14px;box-shadow:0 3px 12px rgba(0,0,0,.16)}
    #lrf-web-jarvis .lrf-jw-label{font-size:.83rem;font-weight:900;color:#111;white-space:nowrap;letter-spacing:.01em}
    #lrf-web-jarvis input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#17202A;font-size:.95rem;padding:8px 2px;font-family:inherit}
    #lrf-web-jarvis input::placeholder{color:#7A7F85}
    #lrf-web-jarvis button{width:38px;height:38px;border-radius:50%;border:1px solid #D4AF37;background:#111;color:#FFD700;font-weight:900;font-size:1rem;cursor:pointer;display:grid;place-items:center}
    #lrf-web-jarvis button:disabled{opacity:.5;cursor:wait}
    #lrf-web-jarvis .lrf-jw-answer{display:none;margin:8px auto 0;background:#fff;color:#17202A;border:1px solid #E4D7A8;border-radius:14px;padding:12px 14px;line-height:1.48;font-size:.92rem;white-space:pre-wrap;box-shadow:0 3px 12px rgba(0,0,0,.12)}
    #lrf-web-jarvis .lrf-jw-answer.open{display:block}
    #lrf-web-jarvis .lrf-jw-meta{display:block;margin-top:7px;font-size:.7rem;color:#777}
    @media(max-width:700px){#lrf-web-jarvis{padding:8px 10px}#lrf-web-jarvis.lrf-jw-offset{margin-top:130px}#lrf-web-jarvis .lrf-jw-form{grid-template-columns:1fr auto;padding-left:12px;gap:5px}#lrf-web-jarvis .lrf-jw-label{grid-column:1/-1;font-size:.72rem;color:#9A7A00;padding:3px 4px 0}#lrf-web-jarvis input{font-size:.9rem;padding:5px 3px 8px}#lrf-web-jarvis button{width:36px;height:36px}#lrf-web-jarvis .lrf-jw-answer{font-size:.88rem}}
  `;
  document.head.appendChild(style);

  const root=document.createElement('section');
  root.id='lrf-web-jarvis';
  root.setAttribute('aria-label','Jarvis IA');
  root.innerHTML=`<div class="lrf-jw-inner"><form class="lrf-jw-form" autocomplete="off"><span class="lrf-jw-label">JARVIS IA</span><input type="search" maxlength="1200" placeholder="Posez votre question métier…" aria-label="Question à Jarvis IA"><button type="submit" aria-label="Envoyer à Jarvis">➤</button></form><div class="lrf-jw-answer" role="status" aria-live="polite"></div></div>`;

  const main=document.querySelector('main');
  if(main){
    const paddingTop=parseFloat(getComputedStyle(main).paddingTop)||0;
    if(paddingTop<100)root.classList.add('lrf-jw-offset');
    main.insertBefore(root,main.firstChild);
  } else {
    const header=document.querySelector('header');
    if(header?.parentNode){root.classList.add('lrf-jw-offset');header.insertAdjacentElement('afterend',root)}
    else document.body.insertBefore(root,document.body.firstChild);
  }

  const form=root.querySelector('form');const input=root.querySelector('input');const button=root.querySelector('button');const answer=root.querySelector('.lrf-jw-answer');
  const setAnswer=(text,meta='')=>{answer.textContent=String(text||'');if(meta){const small=document.createElement('span');small.className='lrf-jw-meta';small.textContent=meta;answer.appendChild(small)}answer.classList.add('open')};

  function executeAction(a){if(!a||!a.type)return;if(a.type==='open_app_page'){const map={clients:'clients.html',agenda:'agenda.html',carte:'carte.html',statistiques:'statistiques.html','comptes-rendus':'comptes-rendus.html',mails:'mails-groupes.html',partenaires:'partenaires.html',tarifs:'tarifs-pro.html',catalogues:'catalogues.html'};let url=map[a.page]||'';if(a.page==='client'&&a.clientId)url=`clients.html?edit=${encodeURIComponent(a.clientId)}`;if(url&&a.partner&&(a.page==='tarifs'||a.page==='catalogues'))url+=`?jarvis=${encodeURIComponent(a.partner)}`;if(url)setTimeout(()=>location.href=url,700)}if(a.type==='prepare_group_mail'){const q=new URLSearchParams({jarvisPrepare:'1',jarvisType:a.recipientType||'client'});if(a.partner)q.set('jarvisPartner',a.partner);if(a.year)q.set('jarvisYear',a.year);if(a.departement)q.set('jarvisDept',String(a.departement).replace(/^FR-/i,''));if(a.documentType)q.set('jarvisDocumentType',a.documentType);setTimeout(()=>location.href=`mails-groupes.html?${q}`,800)}}

  form.addEventListener('submit',async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;button.disabled=true;setAnswer('Jarvis réfléchit…');const memory=readMemory();try{const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:(memory.history||[]).slice(-12),page:currentPage,surface:'public_web'})});const data=await r.json().catch(()=>({}));if(!r.ok||!data.success)throw new Error(data.error||`Serveur ${r.status}`);setAnswer(data.answer||'Demande traitée.',data.model?`Modèle : ${data.model.replace('gpt-5.6-','')}`:'');remember(text,data.answer||'Demande traitée.');input.value='';const actions=Array.isArray(data.actions)?data.actions:[];if(actions.length)executeAction(actions[0])}catch(err){setAnswer(`Jarvis IA est momentanément indisponible : ${err?.message||err}`)}finally{button.disabled=false;input.focus()}});
})();