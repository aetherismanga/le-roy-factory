import {parse} from 'acorn';

// This module changes the original Studio One source at build time. It keeps
// its DOM, five-step wizard, quote, project workspace and live-preview engine.
function officialPhoto(model) {
  const url=model?.photoImage||model?.image;
  return url?`<img class="product-photo model-photo" src="${esc(url)}" width="${model.photoWidth||242}" height="${model.photoHeight||167}" alt="Visuel NEOBATH ANIMA · ${esc(model.name)}" decoding="async">`:'<span class="empty-product">Visuel fabricant en cours de chargement</span>';
}
function facadeChoice() {
  const selected=C.models.find(m=>m.id===draft.format)?.facade||'PURA';
  return '<div class="facade-choice anima-facade-choice"><label>Façade ANIMA</label><div class="preset-widths" role="group" aria-label="Façade Anima">'+[['PURA','Pura · lisse'],['RIBELLE','Ribelle · cannelée']].map(([id,label])=>`<button type="button" data-anima-facade="${id}" aria-pressed="${selected===id}">${label}</button>`).join('')+'</div></div>';
}
function patchDraft(patch) {
  const next={...draft,...patch},m=C.models.find(m=>m.id===next.format);let note='';
  if(!m){error('Choisissez un meuble Anima.');return;}
  if(!m.allowedWidths.includes(next.width))next.width=m.allowedWidths.includes(80)?80:m.allowedWidths[0];
  if(!animaTopAvailable(next.top,next.width,next.format)){next.top='bare';next.basinLayout=null;note='Choisissez un plan et une vasque disponibles pour ce nouveau format.';}
  const colors=basinColors(next.top,next.width,next.format,next.basinLayout);
  if(colors.length&&!colors.some(c=>c.id===next.basinColor))next.basinColor=colors[0].id;
  if(!Object.hasOwn(patch,'columnModel')&&Object.hasOwn(patch,'format'))next.columnModel=m.facade==='RIBELLE'?'ribelle-column':'pura-column';
  try {
    const normalized=normalizeDraft(next);if(JSON.stringify(normalized)===JSON.stringify(draft))return;
    draft=normalized;project=null;persistDraft();const scroll=$('#step-content').scrollTop;
    renderWizard();$('#step-content').scrollTop=scroll;error(note);
  } catch(e){error(e.message);}
}
function animaTopChoices() {
  return ANIMA_TOP_OPTIONS.filter(option=>animaTopAvailable(option.id,draft.width,draft.format)).map(option=>{
    const selection=animaTopSelection(option.id,draft.width,draft.format),p=selection?.product;
    return {...option,url:animaProductImage(p),selection,
      name:option.id==='bare'?'Meuble seul — sans plan':option.name,
      detail:option.id==='bare'?'Caisson Anima seul · sans plan ni vasque':(option.description||'')+(selection?.basin?' · Plan '+selection.top.label+' H '+selection.top.height+' cm inclus au devis':'')};
  });
}
function animaColourChoices() {
  const selection=animaTopSelection(draft.top,draft.width,draft.format),p=selection?.product;
  const known=basinColors(draft.top,draft.width,draft.format,draft.basinLayout);
  return known.length?known:(p?.prices||[]).map(v=>({id:v.key,name:v.label,hex:/black|noir/i.test(v.key)?'#292c2a':'#f6f5f1'}));
}
function renderWizard() {
  const names=['Le modèle','Dimensions & finition','Le plan & la vasque','La colonne','Le miroir'];
  const hints=['Choisissez votre façade et votre format ANIMA.','Les dimensions et les six finitions du fabricant.','Uniquement les plans et vasques compatibles avec votre meuble.','Ajoutez une colonne Pura ou Ribelle, ou continuez sans colonne.','Les miroirs Neobath, avec ou sans éclairage LED.'];
  $('#step-count').textContent=`0${step+1} / 06`;$('#step-title').textContent=names[step];$('#step-description').textContent=hints[step];
  $('#progress-dots').innerHTML=Array.from({length:6},(_,i)=>`<span class="${i===step?'active':i<step?'done':''}"></span>`).join('');
  $('#bevel-open').hidden=true;$('#previous').textContent=step===0?'← Accueil':'← Précédent';$('#next').textContent=step===4?'Voir mon récapitulatif →':'Continuer →';
  const content=$('#step-content');content.className='step-content'+(step===0?' model-step':'');let html='';
  const selectedModel=C.models.find(m=>m.id===draft.format);
  if(step===0) {
    const models=C.models.filter(m=>m.facade===selectedModel.facade);
    html='<div class="model-backdrop" aria-hidden="true">'+officialPhoto(models.find(m=>m.height===26)||models[0])+'</div>'+facadeChoice()+'<div class="model-grid">'+models.map(m=>`<button type="button" class="model-card" data-model="${esc(m.id)}" aria-label="Choisir ${esc(m.name)}" aria-pressed="${m.id===draft.format}"><span class="official-photo">${officialPhoto(m)}</span><span class="model-art">${cabinetDrawing(m,{range:true,facadeMode:'overlay'})}</span><span class="model-caption"><strong>${esc(m.name)}</strong><small>H ${m.height} · P ${m.depth} · L ${m.allowedWidths.join(' / ')} cm</small></span>${m.id===draft.format?'<span class="selected-mark" aria-hidden="true">✓</span>':''}</button>`).join('')+'</div>';
  } else if(step===1) {
    const m=selectedModel,f=finish(draft.finish),p=animaModelProduct(draft.format,draft.width);
    html=`<div class="dimension-layout"><p class="selected-finish-name">${esc(m.name)} · ${esc(f.name)}</p><div class="dimension-fields"><label>Largeur du meuble en cm<input id="width" type="number" inputmode="numeric" min="${Math.min(...m.allowedWidths)}" max="${Math.max(...m.allowedWidths)}" step="20" value="${draft.width}" required></label><div class="preset-widths" aria-label="Largeurs disponibles">${m.allowedWidths.map(n=>`<button type="button" data-width="${n}" aria-pressed="${n===draft.width}">${n}</button>`).join('')}</div><label>Finition du meuble</label>${swatches('finish',C.finishes,draft.finish)}${m.trueDrawers?'<label class="top-drawer-choice"><input id="anima-grass" type="checkbox" '+(draft.grass?'checked':'')+'> Coulisses GRASS · supplément '+(m.height===26?'15':'20')+' %</label>':''}<p class="selection-note">${esc(p?.ref||'Référence fabricant à confirmer')} · ${draft.width} × ${m.height} × ${m.depth} cm · ${m.facade==='RIBELLE'?'façade cannelée Ribelle':'façade lisse Pura'}. Les dimensions proposées sont celles du catalogue Neobath.</p></div></div>`;
  } else if(step===2) {
    const choices=animaTopChoices();
    html='<div class="product-grid">'+choices.map(c=>productCard(c.id,c.name,c.detail,c.url,c.id===draft.top,c.id==='bare'?'<div class="empty-product">Meuble seul<br>Sans plan</div>':'')).join('')+'</div>';
    const colors=animaColourChoices();
    if(colors.length)html+='<label>Finition du plan / de la vasque</label>'+swatches('basinColor',colors,draft.basinColor);
    const colorAccuracy=colors.find(color=>color.id===draft.basinColor);if(colorAccuracy?.colorAccuracy)html+='<p class="selection-note">'+esc(colorAccuracy.colorNote||'Rendu indicatif : cette teinte n’est pas calibrée sur un nuancier fabricant.')+'</p>';
    const layouts=basinLayouts(draft.top,draft.width,draft.format,draft.basinColor);
    if(layouts.length>1)html+=field('basinLayout','Implantation de la vasque',draft.basinLayout,layouts.map(o=>[o.layout,o.name+' · réf. '+o.ref]));
    if(/ncs/i.test(draft.basinColor||''))html+='<label>Code NCS demandé<input id="anima-ncs" maxlength="40" value="'+esc(draft.ncsCode||'')+'" placeholder="Ex. S 2010-G10Y"></label><p class="selection-note">Le code NCS sera indiqué sur le récapitulatif. La couleur personnalisée ne remplace pas un échantillon fabricant.</p>';
    html+='<p class="selection-note">Les photos et visuels proviennent du catalogue Neobath. Le plan et la vasque sont chiffrés séparément lorsqu’ils constituent deux articles.</p>';
  } else if(step===3) {
    html='<div class="column-grid">'+productCard('none','Sans colonne','Poursuivre sans rangement supplémentaire',null,!draft.column)+C.columns.map(c=>productCard(c.id,c.name,'40 × 140 × 22 cm · réf. '+c.ref,c.image,draft.column&&draft.columnModel===c.id)).join('')+'</div>';
    if(draft.column)html+='<div class="column-settings"><label>Finition de la colonne</label>'+swatches('columnFinish',C.finishes,draft.columnFinish)+'<p class="selection-note">Colonne avec porte réversible et quatre étagères en verre.</p></div>';
  } else {
    html='<div class="product-grid mirror-grid">'+productCard('none','Sans miroir','Continuer sans miroir',null,draft.mirror===null)+C.mirrors.map(m=>productCard(m.id,m.name,m.sizes[0].label,m.image,m.id===draft.mirror)).join('')+'</div>';
    if(draft.mirror){const m=C.mirrors.find(m=>m.id===draft.mirror);html+='<div class="fields">'+field('mirrorSize','Dimensions du miroir',draft.mirrorSize,m.sizes.map((s,i)=>[i,s.label]))+'</div><p class="selection-note">Tarif catalogue NEOBATH ANIMA.</p>';}
  }
  content.innerHTML=html;error('');
  content.querySelectorAll('[data-anima-facade]').forEach(b=>b.onclick=()=>{const m=C.models.find(m=>m.facade===b.dataset.animaFacade&&m.subtype===selectedModel.subtype&&m.height===selectedModel.height&&m.trueDrawers===selectedModel.trueDrawers&&m.doors===selectedModel.doors)||C.models.find(m=>m.facade===b.dataset.animaFacade);patchDraft({format:m.id});});
  content.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>patchDraft({format:b.dataset.model}));
  content.querySelectorAll('[data-width]').forEach(b=>b.onclick=()=>patchDraft({width:Number(b.dataset.width)}));
  content.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const id=b.dataset.choice;patchDraft(step===2?{top:id,basinColor:animaTopSelection(id,draft.width,draft.format)?.product?.prices?.[0]?.key||'standard'}:step===3?{column:id!=='none',columnModel:id==='none'?draft.columnModel:id}:{mirror:id==='none'?null:id,mirrorSize:0});});
  content.querySelectorAll('[data-swatch]').forEach(b=>b.onclick=()=>patchDraft({[b.dataset.swatch]:b.dataset.value}));
  for(const key of ['width','basinLayout','columnFinish','mirrorSize','mirrorFinish']){const field=$('#'+key);if(field)field.onchange=()=>{if(!field.checkValidity()){field.reportValidity();return;}patchDraft({[key]:key==='width'||key==='mirrorSize'?Number(field.value):field.value});};}
  const grass=$('#anima-grass');if(grass)grass.onchange=()=>patchDraft({grass:grass.checked});
  const ncs=$('#anima-ncs');if(ncs)ncs.onchange=()=>patchDraft({ncsCode:ncs.value});
  content.querySelectorAll('img').forEach(img=>{img.onerror=()=>{img.alt='Visuel fabricant indisponible — vérifiez la connexion';};if(img.classList.contains('product-photo'))img.decode().then(()=>img.parentElement.dataset.photoReady='true').catch(()=>img.parentElement.dataset.photoReady='error');});
  attachPreview();
}
function rowVisual(row) {
  if(row.image)return image(row.image,row.name);
  const item=project.items.find(i=>i.id===row.itemId);if(!item)return '';
  if(item.type==='cabinet')return officialPhoto(C.models.find(m=>m.id===item.settings.format));
  if(item.type==='column')return image(C.columns.find(c=>c.id===item.settings.columnModel)?.image||'',row.name);
  if(item.type==='mirror'){const m=C.mirrors.find(m=>m.id===item.settings.mirrorModel);return m?image(m.image,m.name):'';}return '';
}

const replacements={officialPhoto,facadeChoice,patchDraft,renderWizard,rowVisual};
export function transformHomeSource(source) {
  const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
  const edits=[];
  for(const node of ast.body)if(node.type==='FunctionDeclaration'&&replacements[node.id?.name])edits.push({start:node.start,end:node.end,text:replacements[node.id.name].toString()});
  if(edits.length!==Object.keys(replacements).length)throw Error('Studio One home source changed: Anima adaptation anchors no longer match.');
  for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
  source=source.replace("C.media+'hero-meuble-hd.webp'",'C.hero');
  source=source.replace("'Colonne STUDIO ONE · réf. 14177'","'Colonne NEOBATH ANIMA · 40 × 140 × 22 cm'");
  source=source.replace("if(view==='wizard'&&step===3){","if(false&&view==='wizard'&&step===3){");
  // Start with a source-valid cabinet in the actual workshop. The detailed
  // choices belong beside the live scene rather than in a preliminary wizard.
  const previousNew="$('#new-project').onclick=()=>projectNavigation.request(()=>{for(const key of [DRAFT_KEY,TRANSFER_KEY,CURRENT_KEY,QUOTE_KEY,QUOTE_CONTEXT,FLOW_KEY,ACTIVE_ID])localStorage.removeItem(key);draft=initialDraft();project=null;projectTitle=t('Ma salle de bains');siteReference='';guest=null;quoteMode='guided';switchView('wizard',0);},'new');";
  if(!source.includes(previousNew))throw Error('Studio One new-project control changed.');
  source=source.replace(previousNew,"$('#new-project').onclick=()=>projectNavigation.request(()=>{for(const key of [DRAFT_KEY,TRANSFER_KEY,CURRENT_KEY,QUOTE_KEY,QUOTE_CONTEXT,FLOW_KEY,ACTIVE_ID])localStorage.removeItem(key);draft=initialDraft();project=null;projectTitle=t('Ma salle de bains');siteReference='';guest=null;quoteMode='guided';const initial={...draftProject(draft),title:projectTitle,siteReference};localStorage.setItem(TRANSFER_KEY,JSON.stringify(initial));localStorage.setItem(FLOW_KEY,JSON.stringify({view:'atelier',step:0}));location.href=demoRoute('atelier.html?guided=1');},'new');");
  source=source.replace("$('#resume-project').onclick=()=>{const previous=resumeStudioEntry(localStorage);if(previous){launch(previous);return;}const flow=read(FLOW_KEY,{view:'wizard',step:0});if(flow.view==='wizard'){project=null;switchView('wizard',flow.step);return;}const data=read(CURRENT_KEY)||read(QUOTE_KEY);if(data){if(flow.view==='atelier'){launch(data);return;}try{project=checkedProject(data);quoteMode=read(QUOTE_CONTEXT,{mode:'scene'}).mode;switchView('quote');return;}catch{}}switchView('wizard',0);};", "$('#resume-project').onclick=()=>{const previous=resumeStudioEntry(localStorage),data=previous||read(CURRENT_KEY)||read(QUOTE_KEY);if(data){launch(data);return;}try{launch(draftProject(draft));}catch(e){error(e.message);}};");
  source=source.replace("$('#edit-choices').onclick=()=>switchView('wizard',4);", "$('#edit-choices').onclick=()=>{try{persistQuote();launch(project);}catch(e){error(e.message,'#quote-status');}};");
  const imports="import {topAvailable as animaTopAvailable} from '../configuration.js';\nimport {TOP_OPTIONS as ANIMA_TOP_OPTIONS,topSelection as animaTopSelection,modelProduct as animaModelProduct,productImage as animaProductImage} from './catalog.js';\n";
  return imports+[animaTopChoices,animaColourChoices].map(f=>f.toString()).join('\n')+'\n'+source;
}
