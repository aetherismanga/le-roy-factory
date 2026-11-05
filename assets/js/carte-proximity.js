const isCartePage=(location.pathname.split('/').pop()||'').toLowerCase()==='carte.html';
if(isCartePage){
  const waitForMap=()=>new Promise(resolve=>{let n=0;const t=setInterval(()=>{const m=window.__lrfCarteMap;if(m||n++>80){clearInterval(t);resolve(m||null)}},100)});
  const hav=(a,b)=>{const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lng-a.lng),la1=toRad(a.lat),la2=toRad(b.lat);const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const route=(lat,lng)=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  let map,userMarker,userCircle,userPos=null,unvisitedVisible=true,clientsVisible=true,prospectsVisible=true;
  const nearTourKey='lrf:nearby-tour-v1';
  const nearbySelection=new Set();
  let gpsWatchId=null, firstGpsFix=false, focusNextGpsFix=true;
  const distanceLabel=km=>km<1?Math.round(km*1000)+' m':km.toFixed(1).replace('.',',')+' km';
  function gpsMessage(message,active=false){
    const status=document.getElementById('lrf-gps-status');
    if(status){status.textContent=message;status.classList.toggle('active',active)}
    const loc=document.getElementById('map-mobile-locate')||document.getElementById('lrf-desktop-locate');
    if(loc){loc.setAttribute('title',message);loc.setAttribute('aria-label',message);loc.classList.toggle('gps-on',active)}
  }

  function styles(){if(document.getElementById('lrf-proximity-style'))return;const s=document.createElement('style');s.id='lrf-proximity-style';s.textContent=`
    .lrf-near-btn{border:1px solid #D4AF37;background:#111;color:#FFD700;border-radius:12px;min-height:43px;padding:0 .72rem;font-weight:900;cursor:pointer}
    .lrf-near-sheet{position:fixed;left:0;right:0;bottom:0;z-index:12100;background:#fff;border-radius:20px 20px 0 0;border:1px solid #D4AF37;box-shadow:0 -18px 50px rgba(0,0,0,.28);padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom));max-height:76vh;overflow:auto;transform:translateY(110%);transition:.2s}.lrf-near-sheet.open{transform:translateY(0)}
    .lrf-near-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.7rem}.lrf-near-head strong{font-size:1rem}.lrf-near-close{width:38px;height:38px;border:0;border-radius:10px;background:#eee;font-size:1.1rem}
    .lrf-near-row{display:grid;grid-template-columns:1fr auto;gap:.7rem;align-items:center;padding:.72rem 0;border-bottom:1px solid #eee}.lrf-near-row b{display:block;font-size:.9rem}.lrf-near-row small{color:#777}.lrf-go{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:.45rem .65rem;border-radius:9px;background:#111;color:#FFD700;text-decoration:none;font-weight:800}
    .lrf-legend{display:flex;gap:.55rem;flex-wrap:wrap;font-size:.72rem;color:#555;margin:.35rem 0 .7rem}.lrf-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:.25rem}.lrf-dot.crm{background:#047857}.lrf-dot.prospect{background:#D4AF37}.lrf-dot.unvisited{background:#DC2626}.lrf-dot.me{background:#2563EB}
    .lrf-user-pin div{background:#2563EB;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 5px rgba(37,99,235,.22),0 2px 7px rgba(0,0,0,.35)}
    .lrf-layer-chooser{display:grid;grid-template-columns:repeat(3,1fr);gap:.45rem;margin:.2rem 0 .3rem}.lrf-layer-toggle{min-height:46px;border-radius:10px;border:2px solid currentColor;background:#fff;font-weight:900;cursor:pointer;padding:.45rem .3rem}.lrf-layer-toggle.client{color:#047857}.lrf-layer-toggle.prospect{color:#A77F00}.lrf-layer-toggle.unvisited{color:#DC2626}.lrf-layer-toggle.off{opacity:.38;filter:grayscale(.5);text-decoration:line-through}.lrf-layer-toggle span{display:block;font-size:.68rem;margin-top:2px}
    body.lrf-hide-clients .custom-pin-green{display:none!important}body.lrf-hide-prospects .custom-pin-gold{display:none!important}body.lrf-hide-unvisited .custom-pin-red{display:none!important}
    .lrf-gps-status{font-size:.76rem;font-weight:800;line-height:1.3;color:#865516;border:1px solid #eed5a2;background:#fff9eb;padding:9px 12px;border-radius:10px;margin:0 0 8px;display:block}
    .lrf-gps-status.active{color:#1356a2;background:#edf5ff;border-color:#93b7f5}
    .lrf-user-pin{background:none;border:none}
    .lrf-user-pin div{width:19px;height:19px;border:3px solid #fff;background:#2563eb;border-radius:50%;box-shadow:0 0 0 6px rgba(37,99,235,.25),0 2px 10px rgba(0,0,0,.4)}
    .lrf-map-locate.gps-on{color:#fff!important;background:#2563eb!important;border-color:#1e4eb1!important}
    .lrf-near-row{grid-template-columns:auto minmax(0,1fr) auto}
    .lrf-near-row .lrf-near-select{width:20px;height:20px;accent-color:#0f766e}
    .lrf-near-row b{overflow-wrap:anywhere}
    .lrf-near-row .lrf-near-meta{display:block;margin-top:4px;font-size:.75rem;color:#586174}
    .lrf-near-actions{display:flex;gap:5px;align-items:center;flex-wrap:wrap;justify-content:end}
    .lrf-near-actions a{font-size:.72rem;padding:8px}
    .lrf-near-footer{position:sticky;bottom:-16px;background:#fff;padding:12px 0 4px;border-top:1px solid #ddd;margin-top:10px}
    .lrf-create-near-tour{width:100%;min-height:44px;border:0;border-radius:10px;background:#0f766e;color:#fff;font-weight:900;font-size:.88rem;cursor:pointer}
    .lrf-create-near-tour:disabled{background:#9baca9;cursor:not-allowed}
    .lrf-near-summary{display:block;margin:0 0 8px;font-size:.75rem;color:#52616c}
    @media(max-width:420px){.lrf-layer-toggle{font-size:.72rem}.lrf-near-row{grid-template-columns:22px minmax(0,1fr)}.lrf-near-actions{grid-column:2;justify-content:start}}
  `;document.head.appendChild(s)}

  function markerType(layer){
    if(layer===userMarker)return 'me';
    if(layer.__lrfClientType)return layer.__lrfClientType;
    const html=String(layer.getPopup?.()?.getContent?.()||'').toLowerCase();
    if(html.includes('badge-unvisited'))return 'unvisited';
    if(html.includes('badge-prospect')||html.includes('>prospect'))return 'prospect';
    if(html.includes('badge-client')||html.includes('>client'))return 'client';
    const iconClass=String(layer.options?.icon?.options?.className||'');
    if(iconClass.includes('gold'))return 'prospect';if(iconClass.includes('green'))return 'client';return 'other';
  }
  function crmMarkers(){const out=[];if(!map)return out;map.eachLayer(layer=>{if(layer instanceof L.Marker&&layer!==userMarker){const ll=layer.getLatLng?.();if(ll)out.push({layer,ll,type:markerType(layer),html:String(layer.getPopup?.()?.getContent?.()||'')})}});return out}
  function nearestItems(limit=20){
    if(!map||!userPos)return[];
    const out=[];
    for(const x of crmMarkers()){
      if(x.type==='client'&&!clientsVisible)continue;
      if(x.type==='prospect'&&!prospectsVisible)continue;
      if(x.type==='unvisited'&&!unvisitedVisible)continue;
      const layer=x.layer;
      const id=String(layer.__lrfClientId||'');
      if(!id)continue;
      out.push({id,name:layer.__lrfClientName||'Client / prospect',town:layer.__lrfClientTown||'',lat:x.ll.lat,lng:x.ll.lng,d:hav(userPos,x.ll),type:x.type});
    }
    return out.sort((a,b)=>a.d-b.d).slice(0,limit);
  }

  function updateTourButton(){
    const btn=document.getElementById('lrf-create-near-tour');
    if(!btn)return;
    btn.disabled=nearbySelection.size===0;
    btn.textContent='🧭 Préparer ma tournée ('+nearbySelection.size+')';
    const summary=document.getElementById('lrf-near-summary');
    if(summary)summary.textContent=nearbySelection.size+' client(s) / prospect(s) sélectionné(s) · distances à vol d’oiseau';
  }

  function ensureSheet(){
    if(document.getElementById('lrf-near-sheet'))return;
    document.body.insertAdjacentHTML('beforeend',
      '<div id="lrf-near-sheet" class="lrf-near-sheet" role="dialog" aria-label="Clients proches de ma position">'+
      '<div class="lrf-near-head"><strong>📍 Clients les plus proches</strong><button class="lrf-near-close" type="button" aria-label="Fermer">✕</button></div>'+
      '<div class="lrf-legend"><span><i class="lrf-dot crm"></i>Clients</span><span><i class="lrf-dot prospect"></i>Prospects</span><span><i class="lrf-dot unvisited"></i>Non visités</span><span><i class="lrf-dot me"></i>Ma position</span></div>'+
      '<div id="lrf-near-content"></div>'+
      '<div class="lrf-near-footer"><small class="lrf-near-summary" id="lrf-near-summary"></small><button type="button" id="lrf-create-near-tour" class="lrf-create-near-tour" disabled>🧭 Préparer ma tournée (0)</button></div></div>');
    document.querySelector('.lrf-near-close').onclick=()=>document.getElementById('lrf-near-sheet').classList.remove('open');
    document.getElementById('lrf-create-near-tour').onclick=prepareNearbyTour;
  }

  function showNearest(){
    ensureSheet();
    const box=document.getElementById('lrf-near-content');
    if(!userPos){
      box.innerHTML='<p>Position GPS indisponible. Appuie sur 📍 et autorise la localisation du navigateur pour connaître les clients les plus proches.</p>';
    }else{
      const rows=nearestItems(30);
      box.innerHTML=rows.length?rows.map(x=>
        '<div class="lrf-near-row"><input type="checkbox" class="lrf-near-select" aria-label="Choisir '+esc(x.name)+'" value="'+esc(x.id)+'" '+(nearbySelection.has(x.id)?'checked':'')+'>'+
        '<div><b><i class="lrf-dot '+(x.type==='client'?'crm':x.type==='unvisited'?'unvisited':'prospect')+'"></i>'+esc(x.name)+'</b>'+
        '<small class="lrf-near-meta">'+esc(x.town)+' · '+distanceLabel(x.d)+' à vol d’oiseau</small></div>'+
        '<div class="lrf-near-actions"><a class="lrf-go" href="clients.html?edit='+encodeURIComponent(x.id)+'">Fiche</a>'+
        '<a class="lrf-go" target="_blank" rel="noopener" href="'+route(x.lat,x.lng)+'">Y aller</a></div></div>'
      ).join(''):'<p>Aucun client géolocalisé visible dans les filtres actuels.</p>';
      box.querySelectorAll('.lrf-near-select').forEach(input=>input.onchange=()=>{
        if(input.checked)nearbySelection.add(input.value);else nearbySelection.delete(input.value);
        updateTourButton();
      });
    }
    updateTourButton();
    document.getElementById('lrf-near-sheet').classList.add('open');
  }

  function prepareNearbyTour(){
    if(!nearbySelection.size)return;
    const payload={createdAt:Date.now(),ids:[...nearbySelection],origin:userPos?{lat:userPos.lat,lng:userPos.lng}:null};
    try{sessionStorage.setItem(nearTourKey,JSON.stringify(payload))}
    catch(err){console.warn('Sélection de tournée indisponible',err);alert('Impossible de transmettre la sélection. Autorise le stockage de session du navigateur.');return}
    window.location.href='tournees.html?source=carte';
  }

  function addToTourFromPopup(e){
    const btn=e.target.closest('.lrf-add-tour-map');
    if(!btn)return;
    const id=decodeURIComponent(btn.dataset.clientId||'');
    if(!id)return;
    nearbySelection.add(id);
    btn.textContent='✓ Dans ma tournée';
    showNearest();
  }

  function gpsSuccess(position){
    if(!map||!position||!Number.isFinite(position.coords.latitude)||!Number.isFinite(position.coords.longitude))return;
    userPos={lat:position.coords.latitude,lng:position.coords.longitude};
    const accuracy=Math.max(1,position.coords.accuracy||25);
    if(!userMarker){
      const icon=L.divIcon({className:'lrf-user-pin',html:'<div></div>',iconSize:[26,26],iconAnchor:[13,13]});
      userMarker=L.marker(userPos,{icon,zIndexOffset:2000}).addTo(map).bindPopup('<strong>📍 Ma position actuelle</strong>');
    }else userMarker.setLatLng(userPos);
    if(!userCircle)userCircle=L.circle(userPos,{radius:accuracy,weight:1,color:'#2563eb',fillColor:'#60a5fa',fillOpacity:.12,interactive:false}).addTo(map);
    else userCircle.setLatLng(userPos).setRadius(accuracy);
    userMarker.bringToFront?.();
    window.__lrfCarteUserPos={...userPos};
    gpsMessage('🔵 Position GPS active · précision ±'+Math.round(accuracy)+' m',true);
    if(!firstGpsFix||focusNextGpsFix){
      map.invalidateSize();
      map.setView(userPos,Math.max(map.getZoom(),12));
      window.__lrfGpsCentered=true;
      firstGpsFix=true;focusNextGpsFix=false;
    }
    if(document.getElementById('lrf-near-sheet')?.classList.contains('open'))showNearest();
  }
  function gpsFailure(error){
    const denied=error?.code===1;
    gpsMessage(denied?'GPS refusé : autorise la localisation pour ce site puis touche 📍.':error?.code===3?'Signal GPS trop lent. Réessaie avec 📍.':'GPS indisponible. Vérifie le signal et les autorisations.');
  }
  function locate(center=true){
    if(!map)return;
    if(!window.isSecureContext||!navigator.geolocation){
      gpsMessage('GPS indisponible : ouvre la page en HTTPS sur un navigateur compatible.');
      return;
    }
    if(center&&userPos){
      map.invalidateSize();map.setView(userPos,Math.max(map.getZoom(),12));
    }else if(center)focusNextGpsFix=true;
    if(gpsWatchId===null){
      gpsMessage('📍 Recherche de ta position GPS…');
      gpsWatchId=navigator.geolocation.watchPosition(gpsSuccess,gpsFailure,{enableHighAccuracy:true,timeout:20000,maximumAge:10000});
    }else if(center&&!userPos){
      navigator.geolocation.getCurrentPosition(gpsSuccess,gpsFailure,{enableHighAccuracy:true,timeout:15000,maximumAge:0});
    }
  }

  function addGpsControls(){
    const toolbar=document.querySelector('.map-mobile-toolbar');
    const bar=document.querySelector('.filter-bar');
    const host=toolbar||bar;
    if(!host)return;
    if(!toolbar&&!document.getElementById('lrf-desktop-locate')){
      const button=document.createElement('button');
      button.id='lrf-desktop-locate';button.type='button';
      button.className='lrf-near-btn lrf-map-locate';
      button.textContent='🔵 Ma position';
      host.appendChild(button);
    }
    const btn=document.getElementById('map-mobile-locate')||document.getElementById('lrf-desktop-locate');
    if(btn&&!btn.dataset.lrfGpsBound){
      btn.dataset.lrfGpsBound='1';btn.classList.add('lrf-map-locate');
      btn.textContent=toolbar?'🔵':'🔵 Ma position';
      btn.addEventListener('click',e=>{e.preventDefault();locate(true)});
    }
    const card=document.getElementById('map-card-container');
    if(card&&!document.getElementById('lrf-gps-status')){
      const el=document.createElement('div');
      el.id='lrf-gps-status';el.className='lrf-gps-status';
      el.setAttribute('role','status');el.setAttribute('aria-live','polite');
      el.textContent='📍 Recherche de ta position GPS…';
      card.insertBefore(el,document.getElementById('map'));
    }
  }

  function updateLayerButtons(){
    document.body.classList.toggle('lrf-hide-clients',!clientsVisible);
    document.body.classList.toggle('lrf-hide-prospects',!prospectsVisible);
    document.body.classList.toggle('lrf-hide-unvisited',!unvisitedVisible);
    for(const [id,visible] of [['lrf-toggle-clients',clientsVisible],['lrf-toggle-prospects',prospectsVisible],['lrf-toggle-unvisited',unvisitedVisible]]){
      const button=document.getElementById(id);button?.classList.toggle('off',!visible);button?.setAttribute('aria-pressed',String(visible));
    }
    window.__lrfCarteLayerVisibility={clients:clientsVisible,prospects:prospectsVisible,unvisited:unvisitedVisible};
    window.dispatchEvent(new CustomEvent('lrf-map-layer-filter'));
    if(document.getElementById('lrf-near-sheet')?.classList.contains('open'))showNearest();
  }
  function injectLayerChooser(){
    const filter=document.querySelector('.filter-bar');
    if(!filter||document.getElementById('lrf-layer-chooser'))return;
    const box=document.createElement('div');box.id='lrf-layer-chooser';box.className='lrf-layer-chooser';
    box.innerHTML='<button id="lrf-toggle-clients" class="lrf-layer-toggle client" type="button">🟢 Clients<span>Afficher / masquer</span></button><button id="lrf-toggle-prospects" class="lrf-layer-toggle prospect" type="button">🟡 Prospects<span>Afficher / masquer</span></button><button id="lrf-toggle-unvisited" class="lrf-layer-toggle unvisited" type="button">🔴 Non visités<span>Sans code LRF</span></button>';
    const head=filter.querySelector('.map-filter-sheet-head');if(head)head.after(box);else filter.prepend(box);
    document.getElementById('lrf-toggle-clients').onclick=()=>{clientsVisible=!clientsVisible;updateLayerButtons()};
    document.getElementById('lrf-toggle-prospects').onclick=()=>{prospectsVisible=!prospectsVisible;updateLayerButtons()};
    document.getElementById('lrf-toggle-unvisited').onclick=()=>{unvisitedVisible=!unvisitedVisible;updateLayerButtons()};
    updateLayerButtons();
  }

  function addUi(){
    styles();ensureSheet();addGpsControls();
    const toolbar=document.querySelector('.map-mobile-toolbar');
    const host=toolbar||document.querySelector('.filter-bar');
    if(host&&!document.getElementById('lrf-near-btn')){
      const btn=document.createElement('button');btn.id='lrf-near-btn';btn.className='lrf-near-btn';
      btn.type='button';btn.textContent='🧭 Proches';
      btn.onclick=()=>{if(!userPos)locate(false);showNearest()};
      if(toolbar)toolbar.insertBefore(btn,toolbar.querySelector('#btn-fullscreen-toggle')||null);
      else host.appendChild(btn);
    }
    injectLayerChooser();
    document.getElementById('lrf-external-toggle')?.remove();
  }

  document.addEventListener('click',addToTourFromPopup);
  waitForMap().then(m=>{
    map=m;
    if(!map)return;
    addUi();
    locate(false);
    setInterval(addUi,1500);
    window.addEventListener('pagehide',()=>{
      if(gpsWatchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(gpsWatchId);
      gpsWatchId=null;
    },{once:true});
  })
}
