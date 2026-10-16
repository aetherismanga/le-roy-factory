(function(){
  'use strict';
  const C=window.StudioOneCatalog,M=window.StudioOneModel,$=id=>document.getElementById(id),app=$('studio-app');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const euros=v=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.round(Number(v)*240)/100);
  const query=new URLSearchParams(location.search),embedded=window.parent!==window,storageKey='lrf-studio-one-project-v2';
  let view,noticeTimer,lastOptions='',applyAll=false;
  function notice(text){$('notice').replaceChildren(document.createTextNode(text));const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Fermer le message');close.onclick=()=>{$('notice').hidden=true;};$('notice').append(close);$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,13000);}
  let store;
  try{store=new M.Store(M.legacy(query));}catch(e){store=new M.Store({version:2,items:[M.make('cabinet')]});notice('Configuration initiale non reconnue : nouveau meuble de 60 cm.');}
  function panel(name){app.dataset.panel=name;document.querySelectorAll('.mobile-nav [data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===name)));requestAnimationFrame(()=>{view?.resize();view?.fit();});}
  document.querySelectorAll('[data-panel]').forEach(b=>{if(b!==app)b.onclick=()=>panel(b.dataset.panel);});
  function option(value,text,selected,disabled=false){return `<option value="${esc(value)}" ${selected===value?'selected':''} ${disabled?'disabled':''}>${esc(text)}</option>`;}
  function detail(title,content,open=true){return `<details ${open?'open':''}><summary>${title}</summary><div class="section-content">${content}</div></details>`;}
  function swatches(colors,current,attr){return `<div class="swatches">${colors.map(c=>`<button type="button" class="swatch-button" ${attr}="${esc(c.code)}" aria-pressed="${c.code===current}" title="${esc(c.name)}"><span class="sample" style="background-color:${c.hex};${c.texture?'background-image:url('+esc(c.texture)+')':''}"></span>${esc(c.name)}</button>`).join('')}</div>`;}
  function renderOptions(force=false){
    const item=store.selected,signature=JSON.stringify(item?{...item,position:null}:null);if(!force&&signature===lastOptions)return;lastOptions=signature;
    const oldDetails=[...$('selected-options').querySelectorAll('details')].map(d=>[d.querySelector('summary').textContent,d.open]);
    if(!item){$('selected-options').innerHTML='<p class="empty">Ajoutez un élément ou sélectionnez un meuble dans la scène ou dans la composition.</p>';return;}
    const d=M.dimensions(item),row=M.lines(item)[0];let html=`<div class="selected-title"><strong>${esc(row.title)}</strong><small>Élément sélectionné · ${esc(item.id.slice(0,8))}</small></div>`;
    if(item.kind==='cabinet'){
      html+=detail('Modèle et dimensions',`<label>Modèle<select id="edit-model">${C.models.map((m,i)=>option(i,m.name+' · H '+m.height+' cm',item.model)).join('')}</select></label><label>Largeur exacte (cm)<input id="edit-width" type="number" inputmode="numeric" min="40" max="120" step="1" value="${item.width}"></label><div class="dimension-facts">H ${d.height} × P ${d.depth} cm · ${esc(item.facade)}</div>`);
    }else if(item.kind==='mirror'){
      html+=detail('Modèle et dimensions',`<label>Modèle de miroir<select id="edit-mirror">${Object.keys(C.mirrors).map(n=>option(n,n,item.mirror)).join('')}</select></label><label>Format du miroir<select id="edit-mirror-size">${C.mirrors[item.mirror].map(r=>option(r[0],r[0],item.mirrorSize)).join('')}</select></label>${item.mirror.includes('métallique')?`<label>Cadre<select id="edit-mirror-finish">${['Noir','Doré','Bronze','Argent'].map(n=>option(n,n,item.mirrorFinish)).join('')}</select></label>`:''}`);
    }else html+=detail('Dimensions et porte',`<div class="dimension-facts">L 38 × H 132 × P 27 cm</div><p class="help">Une porte articulée à 90° et deux étagères intérieures. Dimensions de la colonne STUDIO ONE référencée 14177.</p><label>Sens d’ouverture de la porte<select id="edit-door-side">${option('left','Charnières à gauche · ouverture à gauche',item.doorSide||'left')}${option('right','Charnières à droite · ouverture à droite',item.doorSide||'left')}</select></label>`);
    if(item.kind!=='mirror')html+=detail('Finition du meuble',swatches(C.finishes,item.finish,'data-finish')+`<label class="check-label"><input id="apply-all" type="checkbox" ${applyAll?'checked':''}>Appliquer cette finition à toute la composition</label>`);
    if(item.kind==='cabinet'){
      const insetAllowed=[60,70,80,90,100,120].includes(item.width),surface=item.option==='top'&&item.sink?'vessel':item.option;
      html+=detail('Plateau et vasque',`<label>Équipement du meuble<select id="edit-surface">${option('bare','Meuble seul · sans plateau ni vasque',surface)}${option('top','Plateau sur mesure · sans vasque',surface)}${option('vessel','Plateau sur mesure + vasque à poser',surface)}${option('basin',insetAllowed?'Vasque encastrée · Sella ou Tampa':'Vasque encastrée indisponible à cette largeur',surface,!insetAllowed)}</select></label>${!insetAllowed?'<p class="help">Formats encastrés : 60, 70, 80, 90, 100 et 120 cm uniquement.</p>':''}${item.sink?`<div class="sink-models">${(item.option==='basin'?['Sella','Tampa']:['Neris','Torne']).map(name=>{const disabled=item.option==='top'&&item.width<C.vessels[name].minWidth;return `<button data-sink="${name}" aria-pressed="${name===item.sink.model}" ${disabled?'disabled':''} title="${disabled?'Meuble de 50 cm minimum pour Neris':name}"><img src="assets/img/randal/accessories/hd/basin-${name.toLowerCase()}.webp" alt="Vasque ${name}">${name}${disabled?' · 50 cm minimum':''}</button>`;}).join('')}</div>${item.option==='basin'&&item.width===120?`<label>Nombre de cuves<select id="edit-sink-layout">${option('single','Simple vasque',item.sink.layout)}${option('double','Double vasque · 120 cm',item.sink.layout)}</select></label>`:''}<label>Couleur de la vasque</label>${swatches(item.option==='basin'?C.insetColors.filter(c=>C.inset[item.sink.model][c.code]):C.vesselColors,item.sink.color,'data-sink-color')}<p class="help">${esc(item.sink.model)} · ${item.sink.width} × ${item.sink.depth} × ${item.sink.height} cm. ${item.sink.model==='Sella'?'Sella : blanc brillant uniquement.':''}</p><button id="remove-sink">Retirer la vasque</button>`:'<p class="help">Aucune vasque. Le plateau est fabriqué à la largeur exacte du meuble, dans sa finition.</p>'}`);
    }
    html+=detail('Position dans la composition',`<div class="field-row"><label>Position X (cm)<input id="position-x" type="number" step="0.1" value="${item.position.x}"></label><label>Bas depuis le sol (cm)<input id="position-y" type="number" step="0.1" min="0" max="300" value="${item.position.y}"></label></div><p class="help">Déplacez aussi l’objet dans la scène. Les positions occupées sont refusées. Flèches du clavier : 1 cm ; Maj : 10 cm.</p>`,false);
    html+=`<div class="action-grid"><button id="duplicate">Dupliquer</button><button id="delete" class="danger">Supprimer</button></div>${item.kind!=='mirror'?`<button id="toggle-selected" class="primary" style="width:100%">${item.open?'Fermer':'Ouvrir'} ${item.kind==='column'?'la porte':'les tiroirs'}</button>`:''}`;
    $('selected-options').innerHTML=html;
    if(!force)oldDetails.forEach(([name,open])=>{[...$('selected-options').querySelectorAll('details')].find(d=>d.querySelector('summary').textContent===name)?.toggleAttribute('open',open);});
    const bind=(id,fn)=>{const el=$(id);if(el)el.onchange=fn;};
    const update=patch=>store.update(item.id,patch);
    bind('edit-door-side',e=>update({doorSide:e.target.value}));
    bind('edit-model',e=>{update({model:Number(e.target.value)});view?.fit();});
    bind('edit-width',e=>{const n=Number(e.target.value);if(!/^\d{2,3}$/.test(e.target.value)||!Number.isInteger(n)||n<40||n>120){notice('Saisissez une largeur entière de 40 à 120 cm, sans virgule.');e.target.value=item.width;return;}if(!update({width:n}))e.target.value=item.width;else view?.fit();});
    bind('apply-all',e=>applyAll=e.target.checked);
    $('selected-options').querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>applyAll?store.finishAll(b.dataset.finish):update({finish:b.dataset.finish}));
    bind('edit-surface',e=>{const v=e.target.value;update(v==='bare'?{option:'bare',sink:null}:v==='top'?{option:'top',sink:null}:v==='vessel'?{option:'top',sink:{model:item.width>=50?'Neris':'Torne',color:'gloss',layout:'single'}}:{option:'basin',sink:{model:'Sella',color:'gloss',layout:'single'}});});
    $('selected-options').querySelectorAll('[data-sink]').forEach(b=>b.onclick=()=>update({sink:{model:b.dataset.sink,color:'gloss',layout:item.sink.layout}}));
    $('selected-options').querySelectorAll('[data-sink-color]').forEach(b=>b.onclick=()=>update({sink:{...item.sink,color:b.dataset.sinkColor}}));
    bind('edit-sink-layout',e=>update({sink:{...item.sink,layout:e.target.value}}));
    if($('remove-sink'))$('remove-sink').onclick=()=>update({sink:null,option:item.option==='top'?'top':'bare'});
    bind('edit-mirror',e=>{update({mirror:e.target.value,mirrorSize:C.mirrors[e.target.value][0][0]});view?.fit();});
    bind('edit-mirror-size',e=>{update({mirrorSize:e.target.value});view?.fit();});bind('edit-mirror-finish',e=>update({mirrorFinish:e.target.value}));
    const move=()=>{if(!store.move(item.id,Number($('position-x').value),Number($('position-y').value))){notice('Position refusée : collision avec un élément ou dépassement des limites de la scène.');$('position-x').value=store.selected.position.x;$('position-y').value=store.selected.position.y;}else view?.fit();};
    bind('position-x',move);bind('position-y',move);
    $('duplicate').onclick=()=>{store.duplicate(item.id);applyAll=false;view?.fit();};$('delete').onclick=()=>{store.remove(item.id);applyAll=false;view?.fit();};if($('toggle-selected'))$('toggle-selected').onclick=()=>update({open:!item.open});
  }
  function renderQuote(){
    $('quote-list').innerHTML=store.project.items.map(item=>{const rows=M.lines(item),main=rows[0];return `<article class="item-card ${store.selectedId===item.id?'selected':''}" data-item-id="${esc(item.id)}"><h3><button data-select="${esc(item.id)}">${esc(main.title)}</button></h3><p>${esc(main.detail)}</p><p>Réf. ${esc(main.ref)} · Qté 1</p>${rows.slice(1).map(r=>`<p>${esc(r.title)} · ${esc(r.detail)}<br>Réf. ${esc(r.ref)} · ${euros(r.unit)}</p>`).join('')}<p class="item-price">${euros(rows.reduce((s,r)=>s+r.unit,0))}</p><p>${esc(main.basis)}</p><div class="item-actions"><button data-edit="${item.id}">Modifier</button><button data-duplicate="${item.id}">Dupliquer</button><button data-delete="${item.id}">Supprimer</button></div></article>`;}).join('')||'<p class="empty">Votre composition est vide.</p>';
    $('quote-total').textContent=euros(store.total());$('item-count').textContent='('+store.project.items.length+')';
    $('quote-list').querySelectorAll('[data-select],[data-edit]').forEach(b=>b.onclick=()=>{applyAll=false;store.select(b.dataset.select||b.dataset.edit);if(b.dataset.edit)panel('config');});
    $('quote-list').querySelectorAll('[data-duplicate]').forEach(b=>b.onclick=()=>{store.duplicate(b.dataset.duplicate);view?.fit();});
    $('quote-list').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{store.remove(b.dataset.delete);view?.fit();});
  }
  function render(){renderOptions();renderQuote();const open=store.project.items.some(i=>i.kind!=='mirror'&&!i.open);$('open-all').textContent=open?'Ouvrir toute la composition':'Fermer toute la composition';$('open-all').setAttribute('aria-pressed',String(!open));$('undo').disabled=!store.history.length;$('redo').disabled=!store.future.length;const i=store.selected;if(i&&$('position-x')){$('position-x').value=i.position.x;$('position-y').value=i.position.y;}}
  function publish(){if(embedded)window.parent.postMessage({type:'studio-one-project-change',project:store.snapshot()},location.origin);}
  store.subscribe((project,meta)=>{if(meta.notices.length)notice(meta.notices.join(' '));try{sessionStorage.setItem(storageKey,JSON.stringify(project));}catch(e){}publish();render();});
  $('add-cabinet').onclick=()=>{store.add('cabinet');applyAll=false;view?.fit();};$('add-column').onclick=()=>{store.add('column',{finish:store.selected?.finish||'ROBLE'});applyAll=false;view?.fit();};$('add-mirror').onclick=()=>{store.add('mirror');view?.fit();};
  $('open-all').onclick=()=>store.openAll(store.project.items.some(i=>i.kind!=='mirror'&&!i.open));
  $('dimensions').onclick=()=>{if(view){view.dimensionsVisible=!view.dimensionsVisible;if(view.dimensionsVisible)store.select(null);view.drawDimensions();$('dimensions').setAttribute('aria-pressed',String(view.dimensionsVisible));}};
  $('reset').onclick=()=>view?.fit();$('front').onclick=()=>view?.fit(true);$('invert').checked=true;$('invert').onchange=()=>{if(view)view.reverse=$('invert').checked;};
  function fullscreenState(){const active=!!document.fullscreenElement||app.classList.contains('is-fullscreen');$('fullscreen').textContent=active?'✕ Quitter':'⛶ Plein écran';$('fullscreen').setAttribute('aria-pressed',String(active));requestAnimationFrame(()=>{view?.resize();view?.fit();});}
  $('fullscreen').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();else if(app.classList.contains('is-fullscreen'))app.classList.remove('is-fullscreen');else{try{if(!app.requestFullscreen)throw Error();await app.requestFullscreen();}catch(e){app.classList.add('is-fullscreen');}}fullscreenState();};document.addEventListener('fullscreenchange',fullscreenState);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&app.classList.contains('is-fullscreen')){app.classList.remove('is-fullscreen');fullscreenState();}});
  $('undo').onclick=()=>{store.undo();view?.fit();};$('redo').onclick=()=>{store.redo();view?.fit();};
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);}
  function captureViews(){
    if(!view)throw Error('Vue 3D indisponible.');
    const old={yaw:view.yaw,pitch:view.pitch,distance:view.distance,target:view.target.clone(),dimensions:view.dimensionsVisible};
    const result=[];
    try{
      for(const angle of [{name:'Face',yaw:0},{name:'Côté',yaw:Math.PI/2}]){
        view.fit(true);view.yaw=angle.yaw;view.pitch=.02;
        for(const withCotes of [false,true]){
          view.dimensionsVisible=withCotes;view.drawDimensions();
          view.camera.position.set(view.target.x+Math.sin(view.yaw)*view.distance,view.target.y+Math.sin(view.pitch)*view.distance,view.target.z+Math.cos(view.yaw)*Math.cos(view.pitch)*view.distance);
          view.camera.lookAt(view.target);view.renderer.render(view.scene,view.camera);
          result.push({title:angle.name+(withCotes?' avec cotes':' sans cotes'),image:view.canvas.toDataURL('image/jpeg',.8)});
        }
      }
    }finally{
      view.yaw=old.yaw;view.pitch=old.pitch;view.distance=old.distance;view.target.copy(old.target);view.dimensionsVisible=old.dimensions;view.drawDimensions();
    }
    return result;
  }
  $('save-project').onclick=()=>{try{const project={...store.snapshot(),ambience:{...ambience},report:{views:captureViews()}};download(new Blob([JSON.stringify(project)],{type:'application/json'}),'STUDIO-ONE-dossier-3D.json');notice('Projet enregistré avec 4 vues 3D.');}catch(e){notice('Enregistrement impossible : '+e.message);}};

  $('load-project').onclick=()=>$('project-file').click();$('project-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>16000000)throw Error('Fichier trop volumineux.');store.load(JSON.parse(await file.text()));view?.fit();notice('Projet ouvert.');}catch(err){notice('Impossible d’ouvrir le projet : '+err.message);}e.target.value='';};
  $('new-project').onclick=()=>{if(confirm('Créer une nouvelle composition ? Enregistrez votre projet pour le conserver.')){store.load({version:2,items:[M.make('cabinet')]});view?.fit();}};
  const tileCollections=[
    {factory:'elios',id:'creta',name:'Creta',size:[60,60],colors:['Ginepro','Zucchero','Avena','Biscotto','Caramello','Matcha','Malto','Pepe'],surfaces:['floor','wall']},
    {factory:'elios',id:'venere',name:'Venere',size:[33.3,100],colors:['Perla','Aura','Seta','Flora','Rugiada','Zefiro','Mare','Atlante'],surfaces:['floor','wall']},
    {factory:'elios',id:'azuli-mood-5',name:'Azuli Mood',size:[5,15],colors:['Bone','Bottle Green','Burgundy','Chalk','Coffee Bean','Dawn','Dusk','Sand','Thyme Green','Turquoise','Blue'],surfaces:['wall']},
    {factory:'elios',id:'azuli-mood-10',name:'Azuli Mood',size:[10,10],colors:['Bone','Bottle Green','Burgundy','Chalk','Coffee Bean','Dawn','Dusk','Sand','Thyme Green','Turquoise','Blue'],surfaces:['wall']},
    {factory:'elios',id:'yosemite',name:'Yosemite',size:[23.4,119.5],colors:['Honey','Amber','Natural','White'],surfaces:['floor','wall']},
    {factory:'elios',id:'roma',name:'Roma',size:[40,60],colors:[],surfaces:['floor','wall']},
    {factory:'elios',id:'dynasty',name:'Dynasty',size:[60,120],colors:[],surfaces:['floor','wall']},
    {factory:'view',id:'corso',name:'Corso',size:[60,90],colors:['Avorio','Beige'],surfaces:['floor','wall']},
    {factory:'view',id:'golden-stone',name:'Golden Stone',size:[60,120],colors:['Ivory','Sand','Pearl','Oxid','Carbon'],surfaces:['floor','wall']}
  ];
  const ambienceKey='lrf-studio-one-elios-ambience-v2',defaults={floor:'creta:ginepro',wall:'venere:perla',floorOrientation:'horizontal',wallOrientation:'horizontal'};
  let ambience={...defaults};try{ambience={...ambience,...JSON.parse(sessionStorage.getItem(ambienceKey)||'{}')};}catch(e){}
  const findTile=key=>tileCollections.find(c=>c.colors.some(color=>c.id+':'+color.toLowerCase().replace(/\s+/g,'-')===key));
  function persistAmbience(){try{sessionStorage.setItem(ambienceKey,JSON.stringify(ambience));}catch(e){}}
  function refreshTiles(surface){
    const factory=$(surface+'-factory').value,select=$(surface+'-color'),previous=ambience[surface];select.replaceChildren();
    tileCollections.filter(c=>c.factory===factory&&c.surfaces.includes(surface)).forEach(c=>{
      const group=document.createElement('optgroup');group.label=c.name+' · '+c.size.join(' × ')+' cm';
      if(!c.colors.length){const option=document.createElement('option');option.disabled=true;option.textContent='Coloris en attente de vérification catalogue';group.append(option);}
      c.colors.forEach(color=>{const option=document.createElement('option');option.value=c.id+':'+color.toLowerCase().replace(/\s+/g,'-');option.textContent=c.name+' '+color+' · '+c.size.join(' × ');group.append(option);});select.append(group);
    });
    const values=[...select.options].filter(o=>!o.disabled).map(o=>o.value);const chosen=values.includes(previous)?previous:values[0];if(chosen)setAmbience(surface,chosen);
  }
  function setAmbience(surface,key){
    const c=findTile(key);if(!c||!c.surfaces.includes(surface))return;
    ambience[surface]=key;$(surface+'-factory').value=c.factory;$(surface+'-color').value=key;
    view?.setTile(surface,key,ambience[surface+'Orientation']||'horizontal',c.size);persistAmbience();
  }
  ['floor','wall'].forEach(surface=>{
    const selected=findTile(ambience[surface]);$(surface+'-factory').value=selected?.factory||'elios';
    refreshTiles(surface);$(surface+'-orientation').value=ambience[surface+'Orientation']||'horizontal';
    $(surface+'-factory').onchange=()=>refreshTiles(surface);
    $(surface+'-color').onchange=event=>setAmbience(surface,event.target.value);
    $(surface+'-orientation').onchange=event=>{ambience[surface+'Orientation']=event.target.value;setAmbience(surface,ambience[surface]);};
  });
  function openAmbienceMenu(surface,x,y){
    document.getElementById('elios-context-menu')?.remove();
    const menu=document.createElement('div');menu.id='elios-context-menu';menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Carrelage '+(surface==='floor'?'sol':'mur'));
    Object.assign(menu.style,{position:'fixed',zIndex:'99999',left:Math.max(10,Math.min(x,innerWidth-300))+'px',top:Math.max(10,Math.min(y,innerHeight-350))+'px',width:'290px',padding:'14px',background:'#fff',color:'#29332e',border:'1px solid #c7c2b7',borderRadius:'14px',boxShadow:'0 12px 32px #0004'});
    const title=document.createElement('strong');title.textContent='☰ Carrelage · '+(surface==='floor'?'Sol':'Mur');menu.append(title);
    for(const id of [surface+'-factory',surface+'-color',surface+'-orientation']){
      const label=document.createElement('label');label.style.display='block';label.style.marginTop='10px';label.textContent=id.endsWith('factory')?'Usine':id.endsWith('orientation')?'Sens de pose':'Collection et couleur';
      const select=$(id).cloneNode(true);select.id='popup-'+id;select.style.width='100%';select.style.padding='9px';select.onchange=()=>{
        if(id.endsWith('factory')){$(id).value=select.value;refreshTiles(surface);menu.remove();openAmbienceMenu(surface,x,y);}
        else if(id.endsWith('orientation')){ambience[surface+'Orientation']=select.value;$(id).value=select.value;setAmbience(surface,ambience[surface]);}
        else setAmbience(surface,select.value);
      };label.append(select);menu.append(label);
    }
    const close=document.createElement('button');close.textContent='Fermer';close.style.marginTop='10px';close.onclick=()=>menu.remove();menu.append(close);document.body.append(menu);
    const outside=event=>{if(!menu.contains(event.target)){menu.remove();document.removeEventListener('pointerdown',outside,true);}};
    setTimeout(()=>document.addEventListener('pointerdown',outside,true),0);
  }
  $('image').onclick=()=>{if(!view)return notice('La visualisation 3D n’est pas disponible.');view.renderer.render(view.scene,view.camera);view.canvas.toBlob(blob=>{if(blob)download(blob,'STUDIO-ONE-composition.png');});};
  // Free photorealistic hand-off: all instructions remain visible in the exported PNG.
  // No external API, user account, hidden PNG metadata or automatic file upload.
  function photoBrief(){
    const out=['INSTRUCTION POUR CHATGPT — CRÉATION D’IMAGE',
      'Génère une photographie architecturale photoréaliste à partir de la vue 3D ci-dessus.',
      'ACTION IMMÉDIATE : génère directement l’image finale maintenant, sans poser de question,',
      'sans demander de confirmation, sans proposer de variantes et sans répondre par une description.',
      'Toutes les informations nécessaires sont présentes dans cette image et sa fiche technique.',
      'Si un détail manque, choisis une solution discrète et cohérente avec la vue 3D sans interrompre la génération.',
      'La vue 3D est la référence prioritaire : conserve le cadrage, les emplacements, le nombre',
      'd’éléments, leurs dimensions, leurs proportions et leurs finitions. Ne change aucun modèle.',
      'Remplace uniquement le rendu informatique par des matériaux et lumières photographiques.',
      'RANDAL STUDIO ONE — COMPOSITION EXACTE :'];
    store.project.items.forEach((item,i)=>{
      const d=M.dimensions(item),f=C.finishes.find(c=>c.code===item.finish);
      const p=item.position,position='centre X '+p.x+' cm, bas '+p.y+' cm, profondeur Z '+p.z+' cm';
      const ref=M.lines(item)[0]?.ref||'';
      if(item.kind==='cabinet'){
        out.push((i+1)+'. MEUBLE RANDAL STUDIO ONE : '+C.models[item.model].name+
          ', L '+d.width+' × H '+d.height+' × P '+d.depth+' cm ; finition '+f.name+
          ' ('+item.finish+'), façade '+item.facade+', réf. '+ref+'.');
        out.push('   '+(item.option==='bare'?'Sans plateau':item.option==='basin'?'Vasque encastrée':'Plateau assorti')+
          (item.sink?'; vasque '+item.sink.model+', '+item.sink.width+' × '+item.sink.depth+
          ' cm, couleur '+((item.option==='basin'?C.insetColors:C.vesselColors).find(c=>c.code===item.sink.color)?.name||item.sink.color)+
          ', '+(item.sink.layout==='double'?'double cuve':'simple cuve'):'')+' ; '+position+'.');
      }else if(item.kind==='column'){
        out.push((i+1)+'. COLONNE RANDAL STUDIO ONE : L 38 × H 132 × P 27 cm, réf. '+
          ref+', finition '+f.name+' ('+item.finish+'), étagères, dessus et dessous assortis, porte ouvrant à '+(item.doorSide==='right'?'droite':'gauche')+' ; '+position+'.');
      }else{
        out.push((i+1)+'. MIROIR RANDAL : '+item.mirror+', format '+item.mirrorSize+
          ', cadre '+item.mirrorFinish+', réf. '+ref+
          (/LED/i.test(item.mirror)?', éclairage LED réaliste et diffus':'')+' ; '+position+'.');
      }
    });
    for(const surface of ['floor','wall']){
      const key=ambience[surface],tile=findTile(key),shade=key.split(':')[1];
      const color=tile?.colors.find(c=>c.toLowerCase().replace(/\s+/g,'-')===shade)||shade;
      out.push((surface==='floor'?'SOL':'MUR')+' : '+(tile?.factory||'').toUpperCase()+
        ' '+(tile?.name||'')+' '+color+', format '+(tile?.size.join(' × ')||'?')+
        ' cm, pose '+(ambience[surface+'Orientation']||'horizontal')+'.');
    }
    out.push('Rendu : salle de bains contemporaine crédible, reflets naturels du miroir,',
      'ombres douces, lumière du jour, textures réalistes, joints de carrelage précis.',
      'FIDÉLITÉ PRODUIT OBLIGATOIRE : aucune invention ni transformation des produits RANDAL.',
      'Respecte exactement le nombre de tiroirs, les lignes des façades, la géométrie du meuble,',
      'la forme et la couleur de la vasque, le cadre du miroir, les finitions, les proportions,',
      'la disposition des éléments, les étagères et le sens d’ouverture de la colonne.',
      'N’ajoute ni tiroir, ni poignée, ni porte, ni étagère, ni robinetterie inexistante dans la vue 3D.',
      'Ne modifie pas les références, couleurs, formats ou sens de pose des carrelages.',
      'Si une porte est ouverte dans la vue 3D, conserve-la ouverte sur toute sa hauteur.',
      'Les façades des tiroirs doivent être strictement identiques à la vue 3D :',
      'aucune diagonale, découpe, moulure, poignée ou ligne décorative inventée.',
      'Conserve la hauteur de suspension exacte : un meuble suspendu ne doit pas toucher le sol.',
      'DÉCORATION LÉGÈRE AUTORISÉE : une plante discrète, une serviette ou un petit accessoire',
      'peuvent rendre la pièce vivante, mais ne doivent jamais cacher ou modifier les produits.',
      'Évite les grandes fenêtres, tapis, accessoires nombreux et mises en scène fantaisistes.',
      'Si la vue 3D est simplifiée, conserve sa géométrie plutôt que d’inventer des détails.',
      'Ce visuel est une illustration d’ambiance et non un plan technique contractuel.');
    return out.join('\n');
  }
  function photoExport(service){
    if(!view)return notice('La visualisation 3D doit être chargée avant l’export.');
    const destination='https://chatgpt.com/';
    try{
      view.renderer.render(view.scene,view.camera);
      const source=view.canvas,scale=Math.min(1,1500/Math.max(1,source.width));
      const w=1500,photoW=w-100,photoH=Math.max(400,Math.round(source.height*photoW/Math.max(1,source.width)));
      const lines=[],ctx=document.createElement('canvas').getContext('2d');
      ctx.font='26px Arial, sans-serif';
      const maxWidth=w-110;
      for(const paragraph of photoBrief().split('\n')){
        let current='';
        for(const word of paragraph.split(/\s+/)){
          const candidate=current?current+' '+word:word;
          if(current&&ctx.measureText(candidate).width>maxWidth){lines.push(current);current=word;}else current=candidate;
        }
        lines.push(current);
      }
      const lineHeight=37,top=photoH+160,h=Math.max(950,top+lines.length*lineHeight+100);
      const exportCanvas=document.createElement('canvas');exportCanvas.width=w;exportCanvas.height=h;
      const x=exportCanvas.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,w,h);
      x.fillStyle='#24362f';x.fillRect(0,0,w,76);
      x.fillStyle='#ffffff';x.font='bold 33px Arial, sans-serif';x.fillText('RANDAL STUDIO ONE  |  MON PROJET PHOTORÉALISTE',48,50);
      x.drawImage(source,50,96,photoW,photoH);
      x.fillStyle='#24362f';x.font='bold 28px Arial, sans-serif';x.fillText('CONSIGNES POUR L’IA — LIRE ET GÉNÉRER LE RENDU',50,top-35);
      x.font='26px Arial, sans-serif';
      lines.forEach((line,i)=>{x.fillStyle=i===0?'#17634b':'#24362f';x.fillText(line,55,top+i*lineHeight);});
      const link=document.createElement('a');link.href=exportCanvas.toDataURL('image/png');link.download='RANDAL-STUDIO-ONE-projet-photorealiste.png';
      document.body.append(link);link.click();link.remove();
      const tab=window.open(destination,'_blank','noopener,noreferrer');
      if(!tab)notice('Image enregistrée. Autorisez les fenêtres surgissantes puis ouvrez '+destination+' pour joindre le PNG.');
      else notice('Image enregistrée. Joignez simplement le PNG dans '+'ChatGPT'+' pour demander votre rendu.');
    }catch(error){notice('Impossible de préparer l’image : '+error.message);}
  }
  $('photo-chatgpt').onclick=()=>photoExport('chatgpt');

  $('print').onclick=()=>{
    try{
      const popup=window.open('','_blank');if(!popup)return notice('Autorisez les fenêtres surgissantes pour imprimer le dossier.');
      const views=captureViews(),rows=store.quote();
      const doc=popup.document;doc.title='RANDAL STUDIO ONE — Dossier';
      const style=doc.createElement('style');style.textContent='body{font:13px Arial,sans-serif;color:#24362f;margin:24px}h1{border-bottom:3px solid #345348;padding-bottom:12px}.views{display:grid;grid-template-columns:1fr 1fr;gap:15px}.view{break-inside:avoid}.view img{width:100%;border:1px solid #ddd}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:9px;text-align:left}@media print{.view{break-inside:avoid}}';doc.head.append(style);
      const title=doc.createElement('h1');title.textContent='RANDAL STUDIO ONE — Dossier projet';doc.body.append(title);
      const table=doc.createElement('table');const head=doc.createElement('tr');['Produit','Dimensions et finition','Référence'].forEach(v=>{const th=doc.createElement('th');th.textContent=v;head.append(th);});table.append(head);
      rows.forEach(row=>{const tr=doc.createElement('tr');[row.title,row.detail,row.ref].forEach(v=>{const td=doc.createElement('td');td.textContent=v;tr.append(td);});table.append(tr);});doc.body.append(table);
      const heading=doc.createElement('h2');heading.textContent='Vues 3D du projet';doc.body.append(heading);
      const grid=doc.createElement('div');grid.className='views';views.forEach(v=>{const cell=doc.createElement('div');cell.className='view';const h=doc.createElement('h3');h.textContent=v.title;const img=doc.createElement('img');img.src=v.image;cell.append(h,img);grid.append(cell);});doc.body.append(grid);
      const footer=doc.createElement('p');footer.textContent='Vues indicatives — références et dimensions à confirmer auprès de RANDAL.';doc.body.append(footer);
      notice('Dossier prêt avec 4 vues : utilisez Imprimer / Enregistrer en PDF dans le nouvel onglet.');
    }catch(e){notice('Impression impossible : '+e.message);}
  };
  function requestText(){return ['Bonjour Juan Carlos,','','Veuillez confirmer la composition STUDIO ONE suivante :','',...store.quote().flatMap(r=>[r.title,r.detail,'Référence : '+r.ref,'Quantité : '+r.qty,'']),'Merci de confirmer les références, compatibilités, disponibilités, délais et conditions de transport.','Cette demande ne constitue pas une commande ferme.','','Cordialement,','Agence Le Roy Factory'].join('\n');}
  $('request-quote').onclick=()=>window.RandalMailChooser.show({to:'juancarlos.segura@randal.group',cc:'jerome@leroyfactory.fr,coryne@leroyfactory.fr',subject:'Demande de devis RANDAL STUDIO ONE',body:requestText()});
  function close(e){e?.preventDefault();publish();if(embedded)window.parent.postMessage({type:'studio-one-close-3d'},location.origin);else location.href='randal-studio-one.html?resume=studio-one';}
  $('back').onclick=close;$('return-summary').onclick=close;
  window.addEventListener('message',e=>{if(!embedded||e.origin!==location.origin||e.source!==window.parent||e.data?.type!=='studio-one-project-init')return;try{store.load(e.data.project);view?.fit();}catch(err){notice('Projet reçu invalide : '+err.message);}});
  try{if(!window.THREE)throw Error('Moteur 3D indisponible. Rechargez la page.');view=new window.StudioOneScene($('stage'),store,notice);view.onAmbienceLongPress=openAmbienceMenu;setAmbience('floor',ambience.floor);setAmbience('wall',ambience.wall);$('scene-status').hidden=true;}catch(e){$('scene-status').textContent=e.message;}
  // Read-only diagnostics for browser regression tests and support.
  window.StudioOneDiagnostics=Object.freeze({snapshot:()=>store.snapshot(),quote:()=>store.quote(),inspect:()=>view?.inspect(),collisions:()=>store.project.items.flatMap((a,i)=>store.project.items.slice(i+1).filter(b=>M.overlaps(a,b)).map(b=>[a.id,b.id]))});
  if(embedded)window.parent.postMessage({type:'studio-one-project-ready'},location.origin);render();
})();
