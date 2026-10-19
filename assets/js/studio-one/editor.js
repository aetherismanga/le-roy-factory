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
      const icons=['basic','zen-led','ilse-led','capsula-led','metal-rectangular','metal-round'];html+='<div class="rv-mirrors">'+Object.keys(C.mirrors).map((name,i)=>'<button type="button" data-mirror-choice="'+esc(name)+'" aria-pressed="'+(name===item.mirror)+'"><img src="https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/accessories/mirror-'+icons[i]+'.webp" alt="">'+esc(name)+'</button>').join('')+'</div>';
      if(/LED/.test(item.mirror))html+='<button id="edit-mirror-led" type="button" aria-pressed="'+!!item.ledOn+'">'+(item.ledOn?'Éteindre LED':'Allumer LED')+'</button>';
      if(item.mirror==='Basic'&&item.mirrorSize==='60 × 80 cm')html+='<button id="edit-mirror-rotation" type="button" aria-pressed="'+!!item.mirrorRotated+'">Pivoter le miroir</button><p>Basic réversible · '+(item.mirrorRotated?'80 × 60':'60 × 80')+' cm</p>';

      html+=detail('Modèle et dimensions',`<label>Modèle de miroir<select id="edit-mirror">${Object.keys(C.mirrors).map(n=>option(n,n,item.mirror)).join('')}</select></label><label>Format du miroir<select id="edit-mirror-size">${C.mirrors[item.mirror].map(r=>option(r[0],r[0],item.mirrorSize)).join('')}</select></label>${item.mirror.includes('métallique')?`<label>Cadre<select id="edit-mirror-finish">${['Noir','Doré','Bronze','Argent'].map(n=>option(n,n,item.mirrorFinish)).join('')}</select></label>`:''}`);
    }else html+=detail('Dimensions et porte',`<div class="dimension-facts">L 38 × H 132 × P 27 cm</div><p class="help">Une porte articulée à 90° et deux étagères intérieures. Dimensions de la colonne STUDIO ONE référencée 14177.</p><label>Sens d’ouverture de la porte<select id="edit-door-side">${option('left','Charnières à gauche · ouverture à gauche',item.doorSide||'left')}${option('right','Charnières à droite · ouverture à droite',item.doorSide||'left')}</select></label>`);
    if(item.kind!=='mirror')html+=detail('Finition du meuble',swatches(C.finishes,item.finish,'data-finish')+`<label class="check-label"><input id="apply-all" type="checkbox" ${applyAll?'checked':''}>Appliquer cette finition à toute la composition</label>`);
    if(item.kind==='cabinet'){
      const insetAllowed=[60,70,80,90,100,120].includes(item.width),surface=item.option==='top'&&item.sink?'vessel':item.option;
      html+=detail('Plateau et vasque',`<label>Équipement du meuble<select id="edit-surface">${option('bare','Meuble seul · sans plateau ni vasque',surface)}${option('top','Plateau sur mesure · sans vasque',surface)}${option('vessel','Plateau sur mesure + vasque à poser',surface)}${option('basin',insetAllowed?'Vasque encastrée · Sella ou Tampa':'Vasque encastrée indisponible à cette largeur',surface,!insetAllowed)}</select></label>${!insetAllowed?'<p class="help">Formats encastrés : 60, 70, 80, 90, 100 et 120 cm uniquement.</p>':''}${item.sink?`<div class="sink-models">${(item.option==='basin'?['Sella','Tampa']:['Neris','Torne']).map(name=>{const disabled=item.option==='top'&&item.width<C.vessels[name].minWidth;return `<button data-sink="${name}" aria-pressed="${name===item.sink.model}" ${disabled?'disabled':''} title="${disabled?'Meuble de 50 cm minimum pour Neris':name}"><img src="https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/accessories/hd/basin-${name.toLowerCase()}.webp" alt="Vasque ${name}">${name}${disabled?' · 50 cm minimum':''}</button>`;}).join('')}</div>${item.option==='basin'&&item.width===120?`<label>Nombre de cuves<select id="edit-sink-layout">${option('single','Simple vasque',item.sink.layout)}${option('double','Double vasque · 120 cm',item.sink.layout)}</select></label>`:''}<label>Couleur de la vasque</label>${swatches(item.option==='basin'?C.insetColors.filter(c=>C.inset[item.sink.model][c.code]):C.vesselColors,item.sink.color,'data-sink-color')}<p class="help">${esc(item.sink.model)} · ${item.sink.width} × ${item.sink.depth} × ${item.sink.height} cm. ${item.sink.model==='Sella'?'Sella : blanc brillant uniquement.':''}</p><button id="remove-sink">Retirer la vasque</button>`:'<p class="help">Aucune vasque. Le plateau est fabriqué à la largeur exacte du meuble, dans sa finition.</p>'}`);
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
    $('selected-options').querySelectorAll('[data-mirror-choice]').forEach(b=>b.onclick=()=>{update({mirror:b.dataset.mirrorChoice,mirrorSize:C.mirrors[b.dataset.mirrorChoice][0][0],mirrorRotated:false});view?.fit();});if($('edit-mirror-led'))$('edit-mirror-led').onclick=()=>update({ledOn:!item.ledOn});if($('edit-mirror-rotation'))$('edit-mirror-rotation').onclick=()=>{update({mirrorRotated:!item.mirrorRotated});view?.fit();};
    bind('edit-mirror',e=>{update({mirror:e.target.value,mirrorSize:C.mirrors[e.target.value][0][0],mirrorRotated:false});view?.fit();});
    bind('edit-mirror-size',e=>{update({mirrorSize:e.target.value,mirrorRotated:false});view?.fit();});bind('edit-mirror-finish',e=>update({mirrorFinish:e.target.value}));
    const move=()=>{if(!store.move(item.id,Number($('position-x').value),Number($('position-y').value))){notice('Position refusée : collision avec un élément ou dépassement des limites de la scène.');$('position-x').value=store.selected.position.x;$('position-y').value=store.selected.position.y;}else view?.fit();};
    bind('position-x',move);bind('position-y',move);
    $('duplicate').onclick=()=>{store.duplicate(item.id);applyAll=false;view?.fit();};$('delete').onclick=()=>{store.remove(item.id);applyAll=false;view?.fit();};if($('toggle-selected'))$('toggle-selected').onclick=()=>update({open:!item.open});
  }
  function renderQuote(){
     $('quote-list').innerHTML=store.project.items.map(item=>{const rows=M.lines(item),main=rows[0],art=window.StudioOneTechnical?.drawing(item)||'';return `<article class="item-card ${store.selectedId===item.id?'selected':''}" data-item-id="${esc(item.id)}"><div class="studio-quote-item-layout"><div class="studio-quote-item-description"><h3><button data-select="${esc(item.id)}">${esc(main.title)}</button></h3><p>${esc(main.detail)}</p><p>Réf. ${esc(main.ref)} · Qté 1</p>${rows.slice(1).map(r=>`<p>${esc(r.title)} · ${esc(r.detail)}<br>Réf. ${esc(r.ref)} · ${euros(r.unit)}</p>`).join('')}<p class="item-price">${euros(rows.reduce((s,r)=>s+r.unit,0))}</p><p>${esc(main.basis)}</p></div><div class="studio-quote-item-visual">${art}</div></div><div class="item-actions"><button data-edit="${item.id}">Modifier</button><button data-duplicate="${item.id}">Dupliquer</button><button data-delete="${item.id}">Supprimer</button></div></article>`;}).join('')||'<p class="empty">Votre composition est vide.</p>';
    $('quote-total').textContent=euros(store.total());$('item-count').textContent='('+store.project.items.length+')';
    $('quote-list').querySelectorAll('[data-select],[data-edit]').forEach(b=>b.onclick=()=>{applyAll=false;store.select(b.dataset.select||b.dataset.edit);if(b.dataset.edit)panel('config');});
    $('quote-list').querySelectorAll('[data-duplicate]').forEach(b=>b.onclick=()=>{store.duplicate(b.dataset.duplicate);view?.fit();});
    $('quote-list').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{store.remove(b.dataset.delete);view?.fit();});
  }
  function render(){renderOptions();renderQuote();const open=store.project.items.some(i=>i.kind!=='mirror'&&!i.open);$('open-all').textContent=open?'Ouvrir toute la composition':'Fermer toute la composition';$('open-all').setAttribute('aria-pressed',String(!open));$('undo').disabled=!store.history.length;$('redo').disabled=!store.future.length;const i=store.selected;if(i&&$('position-x')){$('position-x').value=i.position.x;$('position-y').value=i.position.y;}}
  function publish(){if(embedded)window.parent.postMessage({type:'studio-one-project-change',project:store.snapshot()},location.origin);}
  store.subscribe((project,meta)=>{if(meta.notices.length)notice(meta.notices.join(' '));try{sessionStorage.setItem(storageKey,JSON.stringify(project));}catch(e){}publish();render();});
  for(const [id,kind] of [['add-cabinet','cabinet'],['add-column','column'],['add-mirror','mirror']])$(id).onclick=()=>window.StudioOneChooseItem({kind,finish:store.selected?.finish||'ROBLE',model:store.selected?.kind==='cabinet'?store.selected.model:0,onAdd:options=>{const item=store.add(kind,options);if(item){applyAll=false;view?.fit();}return item;}});
  $('open-all').onclick=()=>store.openAll(store.project.items.some(i=>i.kind!=='mirror'&&!i.open));
  $('dimensions').onclick=()=>{if(view){view.dimensionsVisible=!view.dimensionsVisible;if(view.dimensionsVisible)store.select(null);view.drawDimensions();$('dimensions').setAttribute('aria-pressed',String(view.dimensionsVisible));}};
  $('reset').onclick=()=>view?.fit();$('front').onclick=()=>view?.fit(true);$('invert').checked=true;$('invert').onchange=()=>{if(view)view.reverse=$('invert').checked;};
  function fullscreenState(){const active=!!document.fullscreenElement||app.classList.contains('is-fullscreen');$('fullscreen').textContent=active?'✕ Quitter':'⛶ Plein écran';$('fullscreen').setAttribute('aria-pressed',String(active));requestAnimationFrame(()=>{view?.resize();view?.fit();});}
  $('fullscreen').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();else if(app.classList.contains('is-fullscreen'))app.classList.remove('is-fullscreen');else{try{if(!app.requestFullscreen)throw Error();await app.requestFullscreen();}catch(e){app.classList.add('is-fullscreen');}}fullscreenState();};document.addEventListener('fullscreenchange',fullscreenState);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&app.classList.contains('is-fullscreen')){app.classList.remove('is-fullscreen');fullscreenState();}});
  $('undo').onclick=()=>{store.undo();view?.fit();};$('redo').onclick=()=>{store.redo();view?.fit();};
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);}
  function captureViews(){
    if(!view)throw Error('Vue 3D indisponible.');
    const old={yaw:view.yaw,pitch:view.pitch,distance:view.distance,target:view.target.clone(),dimensions:view.dimensionsVisible,selectedId:store.selectedId};
    if(store.selectedId)store.select(null);
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
      view.yaw=old.yaw;view.pitch=old.pitch;view.distance=old.distance;view.target.copy(old.target);view.dimensionsVisible=old.dimensions;if(old.selectedId)store.select(old.selectedId);view.drawDimensions();
    }
    return result;
  }
  const savedProjectsPrefix='lrf-studio-one-saved-projects-v2-';
  function currentAccount(){
    const session=window.LRF_PRO_SESSION?.read?.();
    if(!session)return null;
    const id=String(session.codeClient||session.email||'').trim().toLowerCase();
    return id||null;
  }
  function savedProjectsKey(){const account=currentAccount();return account?savedProjectsPrefix+encodeURIComponent(account):null;}
  function savedProjects(){const key=savedProjectsKey();if(!key)return [];try{return JSON.parse(localStorage.getItem(key)||'[]');}catch(e){return [];}}
  function projectPreview(){
    if(!view)return null;
    try{view.renderer.render(view.scene,view.camera);const canvas=document.createElement('canvas');canvas.width=480;canvas.height=300;const ctx=canvas.getContext('2d');ctx.fillStyle='#e9e5dc';ctx.fillRect(0,0,480,300);const source=view.canvas,scale=Math.min(480/source.width,300/source.height),w=source.width*scale,h=source.height*scale;ctx.drawImage(source,(480-w)/2,(300-h)/2,w,h);return canvas.toDataURL('image/jpeg',.75);}catch(e){return null;}
  }
  function showProjects(){
    if(!currentAccount())return notice('Connectez-vous à votre compte professionnel pour consulter vos projets.');
    if(document.querySelector('.studio-project-modal'))return;
    const projects=savedProjects(),previousFocus=document.activeElement,wasInert=app.inert;
    const modal=document.createElement('div');modal.className='studio-project-modal';
    const card=document.createElement('section');card.className='studio-project-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','studio-projects-title');card.setAttribute('aria-describedby','studio-projects-description');
    const close=()=>{document.removeEventListener('keydown',keys);modal.remove();app.inert=wasInert;previousFocus?.focus();};
    const header=document.createElement('div');header.className='studio-projects-heading';
    const titles=document.createElement('div');titles.innerHTML='<span class="kicker">STUDIO ONE · ESPACE PRO</span><h2 id="studio-projects-title">Mes projets</h2><p id="studio-projects-description">Retrouvez vos compositions et poursuivez votre création.</p>';
    const x=document.createElement('button');x.className='studio-projects-close';x.textContent='×';x.setAttribute('aria-label','Fermer mes projets');x.onclick=close;header.append(titles,x);card.append(header);
    const tools=document.createElement('div');tools.className='studio-projects-tools';
    const count=document.createElement('span');count.className='studio-projects-count';
    const search=document.createElement('input');search.type='search';search.placeholder='Rechercher un client ou un projet';search.setAttribute('aria-label','Rechercher dans mes projets');tools.append(count,search);card.append(tools);
    const list=document.createElement('div');list.className='studio-projects-grid';card.append(list);
    function render(){
      list.replaceChildren();const query=search.value.trim().toLocaleLowerCase('fr');
      const entries=projects.map((project,index)=>({project,index})).filter(({project})=>(String(project.client)+' '+String(project.name)).toLocaleLowerCase('fr').includes(query));
      count.textContent=entries.length+' projet'+(entries.length>1?'s':'');
      if(!entries.length){const empty=document.createElement('div');empty.className='studio-projects-empty';const title=document.createElement('h3');title.textContent=projects.length?'Aucun projet trouvé':'Votre prochain projet commence ici';const text=document.createElement('p');text.textContent=projects.length?'Essayez un autre nom de client ou de projet.':'Composez votre salle de bains, puis enregistrez-la pour la retrouver ici.';empty.append(title,text);list.append(empty);return;}
      entries.forEach(({project,index})=>{
        const row=document.createElement('article');row.className='studio-project-row';
        const cover=document.createElement('div');cover.className='studio-project-cover';
        if(typeof project.preview==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/.test(project.preview)&&project.preview.length<300000){const image=document.createElement('img');image.src=project.preview;image.alt='Aperçu de '+String(project.name||'la composition');cover.append(image);}
        else{const item=project.data?.items?.find(i=>i.kind==='cabinet')||project.data?.items?.[0];try{cover.innerHTML=window.StudioOneTechnical.drawing(item);}catch(e){}const tag=document.createElement('span');tag.textContent='Composition enregistrée';cover.append(tag);}
        const body=document.createElement('div');body.className='studio-project-body';const client=document.createElement('p');client.className='studio-project-client';client.textContent=project.client||'Projet personnel';const name=document.createElement('h3');name.textContent=project.name||'Salle de bains';
        const meta=document.createElement('p');meta.className='studio-project-meta';const items=project.data?.items?.length||0,date=new Date(project.date);meta.textContent=items+' élément'+(items>1?'s':'')+(Number.isNaN(date.getTime())?'':' · '+new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric'}).format(date));
        const actions=document.createElement('div');actions.className='studio-project-actions';
        const open=document.createElement('button');open.className='studio-project-open';open.textContent='Ouvrir le projet';open.setAttribute('aria-label','Ouvrir le projet '+String(project.name));open.onclick=()=>{try{store.load(project.data,project.ambience?.room||ambience.room);if(project.ambience)ambience={...defaults,...project.ambience};ambience.room={width:store.room.width/100,depth:store.room.depth/100,height:store.room.height/100};view?.setRoom(ambience.room);roomControls.set(ambience.room);if(project.ambience)for(const surface of ['floor','wall'])setAmbience(surface,ambience[surface]);persistAmbience();view?.fit();close();notice('Projet '+project.name+' ouvert.');}catch(e){notice('Ouverture impossible : '+e.message);}};
        const del=document.createElement('button');del.className='studio-project-delete';del.textContent='Supprimer';del.setAttribute('aria-label','Supprimer le projet '+String(project.name));del.onclick=()=>{if(!confirm('Supprimer le projet « '+project.name+' » ?'))return;try{const next=savedProjects();next.splice(index,1);localStorage.setItem(savedProjectsKey(),JSON.stringify(next));close();showProjects();}catch(e){notice('Suppression impossible : '+e.message);}};
        actions.append(open,del);body.append(client,name,meta,actions);row.append(cover,body);list.append(row);
      });
    }
    const footer=document.createElement('div');footer.className='studio-projects-footer';const note=document.createElement('p');note.textContent='Projets de votre compte enregistrés sur cet appareil.';const done=document.createElement('button');done.textContent='Retour à la composition';done.onclick=close;footer.append(note,done);card.append(footer);
    function keys(e){if(e.key==='Escape'){e.preventDefault();close();}else if(e.key==='Tab'){const focusable=[...card.querySelectorAll('button,input')].filter(e=>!e.disabled&&e.offsetParent!==null),first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
    modal.onclick=e=>{if(e.target===modal)close();};search.oninput=render;modal.append(card);document.body.append(modal);app.inert=true;document.addEventListener('keydown',keys);render();x.focus();
  }
  $('save-project').onclick=()=>{
    if(!currentAccount())return notice('Connectez-vous à votre compte professionnel pour enregistrer un projet.');
    const client=prompt('Nom du client :');if(client===null)return;
    if(!client.trim())return notice('Indiquez un nom de client.');
    const name=prompt('Nom du projet :','Salle de bains');if(name===null)return;
    if(!name.trim())return notice('Indiquez un nom de projet.');
    try{
      const projects=savedProjects();projects.unshift({client:client.trim(),name:name.trim(),date:new Date().toISOString(),data:store.snapshot(),ambience:{...ambience},preview:projectPreview()});
      try{localStorage.setItem(savedProjectsKey(),JSON.stringify(projects));}catch(error){delete projects[0].preview;localStorage.setItem(savedProjectsKey(),JSON.stringify(projects));}notice('Projet enregistré pour votre compte sur cet appareil.');
    }catch(e){notice('Enregistrement local impossible : '+e.message);}
  };
  const myProjectsButton=document.createElement('button');myProjectsButton.id='my-projects';myProjectsButton.textContent='Voir mes projets';myProjectsButton.onclick=showProjects;$('save-project').before(myProjectsButton);
  $('load-project').onclick=()=>$('project-file').click();$('project-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>16000000)throw Error('Fichier trop volumineux.');store.load(JSON.parse(await file.text()),ambience.room);ambience.room={width:store.room.width/100,depth:store.room.depth/100,height:store.room.height/100};roomControls.set(ambience.room);view?.setRoom(ambience.room);view?.fit();notice('Projet ouvert.');}catch(err){notice('Impossible d’ouvrir le projet : '+err.message);}e.target.value='';};
  $('new-project').onclick=()=>{if(confirm('Créer une nouvelle composition ? Enregistrez votre projet pour le conserver.')){ambience={...defaults,room:{...A.room}};store.load({version:2,items:[M.make('cabinet')]},ambience.room);roomControls.set(ambience.room);view?.setRoom(ambience.room);for(const surface of ['floor','wall'])setAmbience(surface,ambience[surface]);persistAmbience();applyAll=false;view?.fit();}};
  const A=window.StudioOneAmbience,ambienceKey='lrf-studio-one-elios-ambience-v2',defaults={floor:A.floor,wall:A.wall,floorOrientation:'horizontal',wallOrientation:'horizontal',room:{...A.room}};
  let ambience={...defaults};try{ambience={...ambience,...JSON.parse(sessionStorage.getItem(ambienceKey)||'{}')};}catch(e){}
  const initialRoom=window.RandalRoomSize(ambience.room||A.room);if(!store.setRoom(initialRoom,true))notice('Composition trop large : déplacez un élément.');
   ambience.room={width:store.room.width/100,depth:store.room.depth/100,height:store.room.height/100};
   const roomControls=window.RandalRoomControls($('config-panel'),'studio',ambience.room,value=>{
     if(!store.setRoom(value)){notice('Pièce trop petite pour cette composition. Augmentez la largeur ou retirez un meuble.');roomControls.set(ambience.room);return;}
     ambience.room={width:store.room.width/100,depth:store.room.depth/100,height:store.room.height/100};
     roomControls.set(ambience.room);view?.setRoom(ambience.room);
     for(const surface of ['floor','wall'])setAmbience(surface,ambience[surface]);
     persistAmbience();
   });
  const roomButton=document.createElement('button');roomButton.id='room-dimensions';roomButton.textContent='Cotes pièce';roomButton.setAttribute('aria-pressed','false');roomButton.onclick=()=>{const v=roomButton.getAttribute('aria-pressed')!=='true';roomButton.setAttribute('aria-pressed',String(v));view?.setRoomDimensions(v);};$('dimensions').after(roomButton);
  const CSurface=window.RandalSurfaceCatalogue,surfacePickers={};
  const findTile=key=>{const v=CSurface.resolve(key);return v?{name:v.label,factory:v.brand,size:[v.width*100,v.height*100],colors:[v.color]}:null;};
  function persistAmbience(){try{sessionStorage.setItem(ambienceKey,JSON.stringify(ambience));}catch(e){}}
  function setAmbience(surface,value){
    const requested=CSurface.resolve(value,surface);
    if(!requested&&CSurface.isView(value))notice('Ce visuel VIEW ne répond pas à la qualité requise. Choisissez un autre carrelage.');
    const v=requested||CSurface.resolve(ambience[surface+'Selection'],surface)||CSurface.resolve(defaults[surface]);
    ambience[surface]=CSurface.key(v);ambience[surface+'Selection']=v;ambience[surface+'Orientation']=v.orientation;
    view?.setTile(surface,v);surfacePickers[surface]?.set(v);persistAmbience();
  }
  for(const surface of ['floor','wall']){
    surfacePickers[surface]=window.RandalSurfacePicker($(surface+'-surfaces'),{prefix:'studio-'+surface,surface,value:ambience[surface+'Selection']||ambience[surface],onChange:v=>setAmbience(surface,v)});
  }
  function openAmbienceMenu(surface){const host=$(surface+'-surfaces');host.closest('details').open=true;panel('config');host.scrollIntoView({block:'center',behavior:'smooth'});}
  $('image').onclick=async()=>{if(!view)return notice('La visualisation 3D n’est pas disponible.');await view.settled();view.renderer.render(view.scene,view.camera);view.canvas.toBlob(blob=>{if(blob)download(blob,'STUDIO-ONE-composition.png');});};
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
  async function photoExport(service){
    if(!view)return notice('La visualisation 3D doit être chargée avant l’export.');
    const destination='https://chatgpt.com/';
    try{
      await view.settled();view.renderer.render(view.scene,view.camera);
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

  $('print').onclick=async()=>{
    try{
      const popup=window.open('','_blank');if(!popup)return notice('Autorisez les fenêtres surgissantes pour imprimer le dossier.');
      popup.document.body.textContent='Préparation des textures…';await view?.settled();popup.document.body.replaceChildren();const views=captureViews(),rows=store.quote(),doc=popup.document;
      doc.title='RANDAL STUDIO ONE — Récapitulatif et vues 3D';
      const style=doc.createElement('style');
      style.textContent='@page{size:A4 portrait;margin:12mm}body{font:12px Arial,sans-serif;color:#24362f;margin:0}h1{font-size:20px;border-bottom:3px solid #345348;padding-bottom:12px}h2{font-size:17px}.page{page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}table{border-collapse:collapse;width:100%}th{background:#e8ede8}td,th{border-bottom:1px solid #ddd;padding:10px 7px;text-align:left}.right{text-align:right}.total{font-size:18px;font-weight:bold;text-align:right;margin-top:20px}.views{display:grid;grid-template-columns:1fr 1fr;gap:12px}.view{break-inside:avoid}.view h3{font-size:12px;margin:8px 0}.view img{width:100%;max-height:108mm;object-fit:contain;border:1px solid #ddd}.note{font-size:10px;color:#666;margin-top:16px}@media print{.page{min-height:0}}';
      doc.head.append(style);
      const first=doc.createElement('section');first.className='page';doc.body.append(first);
      const title=doc.createElement('h1');title.textContent='LE ROY FACTORY · RANDAL STUDIO ONE';first.append(title);
      const heading=doc.createElement('h2');heading.textContent='Récapitulatif de configuration';first.append(heading);
      const table=doc.createElement('table'),head=doc.createElement('tr');
      ['Produit / Référence','Qté','Prix unit.','Total'].forEach(v=>{const th=doc.createElement('th');th.textContent=v;head.append(th);});table.append(head);
      rows.forEach(row=>{const tr=doc.createElement('tr');[row.title+' — '+row.detail+' — Réf. '+row.ref,String(row.qty),euros(row.unit),euros(row.unit*row.qty)].forEach((v,i)=>{const td=doc.createElement('td');td.textContent=v;if(i>1)td.className='right';tr.append(td);});table.append(tr);});first.append(table);
      const total=doc.createElement('div');total.className='total';total.textContent='TOTAL GÉNÉRAL : '+euros(rows.reduce((n,r)=>n+r.unit*r.qty,0));first.append(total);
      const note=doc.createElement('p');note.className='note';note.textContent='Prix indicatifs hors transport et pose, sous réserve de confirmation des références et disponibilités.';first.append(note);
      const second=doc.createElement('section');second.className='page';doc.body.append(second);
      const title2=doc.createElement('h1');title2.textContent='STUDIO ONE · Vues 3D du projet';second.append(title2);
      const grid=doc.createElement('div');grid.className='views';views.forEach(v=>{const cell=doc.createElement('div');cell.className='view';const h=doc.createElement('h3');h.textContent=v.title;const img=doc.createElement('img');img.src=v.image;cell.append(h,img);grid.append(cell);});second.append(grid);
      const foot=doc.createElement('p');foot.className='note';foot.textContent='Vues indicatives. Dimensions et références à confirmer auprès de RANDAL.';second.append(foot);
      doc.close();notice('Dossier sur deux pages prêt : récapitulatif puis quatre vues 3D. Imprimez ou enregistrez en PDF.');
    }catch(e){notice('Impression impossible : '+e.message);}
  };
  function requestText(){return ['Bonjour Juan Carlos,','','Veuillez confirmer la composition STUDIO ONE suivante :','',...store.quote().flatMap(r=>[r.title,r.detail,'Référence : '+r.ref,'Quantité : '+r.qty,'']),'Merci de confirmer les références, compatibilités, disponibilités, délais et conditions de transport.','Cette demande ne constitue pas une commande ferme.','','Cordialement,','Agence Le Roy Factory'].join('\n');}
  $('request-quote').onclick=()=>window.RandalMailChooser.show({to:'juancarlos.segura@randal.group',cc:'jerome@leroyfactory.fr,coryne@leroyfactory.fr',subject:'Demande de devis RANDAL STUDIO ONE',body:requestText()});
  function close(e){e?.preventDefault();publish();if(embedded)window.parent.postMessage({type:'studio-one-close-3d'},location.origin);else location.href='randal-studio-one.html?resume=studio-one';}
  $('back').onclick=close;$('return-summary').onclick=close;
  window.addEventListener('message',e=>{if(!embedded||e.origin!==location.origin||e.source!==window.parent||e.data?.type!=='studio-one-project-init')return;try{store.load(e.data.project,ambience.room);ambience.room={width:store.room.width/100,depth:store.room.depth/100,height:store.room.height/100};roomControls.set(ambience.room);view?.setRoom(ambience.room);view?.fit();}catch(err){notice('Projet reçu invalide : '+err.message);}});
  try{if(!window.THREE)throw Error('Moteur 3D indisponible. Rechargez la page.');view=new window.StudioOneScene($('stage'),store,notice);view.onAmbienceLongPress=openAmbienceMenu;view.setRoom(ambience.room);roomControls.set(ambience.room);setAmbience('floor',ambience.floor);setAmbience('wall',ambience.wall);$('scene-status').hidden=true;}catch(e){$('scene-status').textContent=e.message;}
  // Diagnostics for browser regression tests and support.
  window.StudioOneDiagnostics=Object.freeze({setSurface:(surface,value)=>setAmbience(surface,value),settled:()=>view?.settled(),snapshot:()=>store.snapshot(),quote:()=>store.quote(),inspect:()=>view?.inspect(),outsideWalls:()=>store.project.items.filter(i=>!M.roomInside(i,store.room)).map(i=>i.id),collisions:()=>store.project.items.flatMap((a,i)=>store.project.items.slice(i+1).filter(b=>M.overlaps(a,b)).map(b=>[a.id,b.id]))});
  if(embedded)window.parent.postMessage({type:'studio-one-project-ready'},location.origin);render();
  if(new URLSearchParams(location.search).get('projects')==='1')showProjects();
})();
