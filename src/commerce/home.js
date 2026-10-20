import {CATALOG as C} from './catalog.js';
import {money,quoteProject,finish} from './pricing.js';
import {initialDraft,normalizeDraft,draftProject,DRAFT_KEY,TRANSFER_KEY} from './guided.js';
import {commercialRequest,statusText} from './client.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels=['Meuble','Vasque & plan','Colonne','Miroir','Votre projet'];
let draft=initialDraft(),session=null,storageAvailable=true;
try{const saved=localStorage.getItem(DRAFT_KEY);if(saved)draft=normalizeDraft(JSON.parse(saved));}catch{}
const savedValue=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
function persist(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));}catch{storageAvailable=false;$('#form-status').textContent='Enregistrement local indisponible. Gardez cette page ouverte pour conserver votre sélection.';}}
function image(url,alt,cls=''){return `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async" class="${cls}">`;}
function card(id,title,detail,url,selected,cls=''){return `<button type="button" class="product-card ${cls}${url?'':' none'}" data-choice="${esc(id)}" aria-pressed="${selected}">${url?image(url,title):''}<div><strong>${esc(title)}</strong><small>${esc(detail)}</small></div></button>`;}
function field(id,label,value,options){return `<label>${esc(label)}<select id="${id}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
function swatches(key,values,value){return `<div class="swatches" role="group" aria-label="${key==='basinColor'?'Couleur de la vasque':'Finition'}">${values.map(f=>`<button type="button" data-swatch="${key}" data-value="${esc(f.id||f.code)}" aria-pressed="${(f.id||f.code)===value}"><span class="chip" style="background:${esc(f.hex)}"></span>${esc(f.name)}</button>`).join('')}</div>`;}
function selectionPatch(patch){
 const next={...draft,...patch};
 if(Object.hasOwn(patch,'width')&&['sella','tampa'].includes(next.top)&&!C.inset[next.top]?.[next.basinColor]?.[next.width]){next.top='plain';next.basinColor='gloss';$('#form-status').textContent='Largeur hors format encastré : le plan assorti est sélectionné. Vous pouvez choisir une vasque à poser à l’étape suivante.';}
 if(next.top==='neris'&&next.width<50){next.top='plain';next.basinColor='gloss';}
 try{draft=normalizeDraft(next);persist();render();}catch(e){$('#form-status').textContent=e.message;}
}
function summary(){
 const q=quoteProject(draftProject(draft));
 $('#summary-lines').innerHTML=q.rows.map(r=>`<div class="summary-line"><strong>${esc(r.name)}</strong><small>${esc(r.detail)}<br>Réf. ${esc(r.ref)}${r.note?'<br>'+esc(r.note):''}</small><b>${money(r.publicTTC)}</b></div>`).join('');
 $('#summary-total').textContent=money(q.publicTTC);$('#summary-note').textContent='TVA 20 % incluse.'+(q.indicative?' Montant soumis aux confirmations indiquées.':'');
 $('#account-status').textContent=session?.randalAllowed===false?'Compte '+session.client.codeClient+' identifié. Accès RANDAL non autorisé pour ce compte.':statusText(session);
 $('#account-open').textContent=session?.client?.codeClient||'Compte PRO LRF';$('#logout').hidden=!session?.client;
}
function render(){
 $('#steps').innerHTML=labels.map((s,i)=>`<button type="button" data-step="${i}" class="${i===draft.step?'active':''}" aria-current="${i===draft.step?'step':'false'}"><span class="number">${i+1}</span>${s}</button>`).join('');
 $('#step-count').textContent='ÉTAPE '+(draft.step+1)+' / 5';
 const titles=['Choisissez votre meuble.','Le plan et la vasque qui vous vont.','Un rangement en plus.','Le miroir, touche finale.','Votre composition est prête.'];
 const descriptions=['Quatre formats STUDIO ONE, huit finitions et une largeur au centimètre.','Seuls les modèles compatibles avec votre largeur sont proposés.','Ajoutez la colonne STUDIO ONE, ou poursuivez sans colonne.','Choisissez un miroir du catalogue RANDAL, ou continuez sans miroir.','Retrouvez tous vos choix dans l’atelier et personnalisez la pièce autour de votre meuble.'];
 $('#step-title').textContent=titles[draft.step];$('#step-description').textContent=descriptions[draft.step];let html='';
 if(draft.step===0){
  html='<div class="product-grid models">'+C.models.map(m=>card(m.id,m.name,`H ${m.height} cm · P 46 cm · Réf. ${m.base}`,m.image,m.id===draft.format,'model')).join('')+'</div>';
  html+=`<div class="fields"><label>Largeur exacte (cm)<input id="width" type="number" min="40" max="120" step="1" inputmode="numeric" value="${draft.width}" required></label>${field('finish','Finition du meuble',draft.finish,C.finishes.map(f=>[f.id,f.name]))}</div>`+swatches('finish',C.finishes,draft.finish);
  if(draft.width===40)html+='<p class="notice">La largeur 40 cm doit être confirmée par l’usine, comme dans le configurateur d’origine.</p>';
 }else if(draft.step===1){
  const choices=[{id:'plain',name:'Plan assorti seul',detail:'Sans vasque · finition du meuble',image:null},...['sella','tampa','neris','torne'].filter(id=>id==='neris'?draft.width>=50:id==='torne'||C.inset[id]?.gloss?.[draft.width]).map(id=>({id,name:{sella:'Sella encastrée',tampa:'Tampa encastrée',neris:'Plan + Neris',torne:'Plan + Torne'}[id],detail:['neris','torne'].includes(id)?'Vasque à poser + plan assorti':'Vasque intégrée · '+draft.width+' cm',image:C.media+'accessories/hd/basin-'+id+'.webp'}))];
  html='<div class="product-grid">'+choices.map(c=>card(c.id,c.name,c.detail,c.image,c.id===draft.top)).join('')+'</div>';
  if(draft.top!=='plain'){const colors=['sella','tampa'].includes(draft.top)?C.insetColors.filter(c=>C.inset[draft.top][c.code]?.[draft.width]):C.vesselColors;html+='<label>Couleur de la vasque</label>'+swatches('basinColor',colors,draft.basinColor);}
  html+='<p class="fine">Les photos du catalogue présentent le modèle. La couleur choisie figure dans le récapitulatif et sera appliquée en 3D.</p>';
 }else if(draft.step===2){
  html='<div class="product-grid">'+card('none','Sans colonne','Conserver uniquement le meuble',null,!draft.column)+card('column','Colonne STUDIO ONE · 1 porte','38 × 132 × 27 cm · Réf. 14177 · '+money(C.column.ttc),null,draft.column)+'</div>';
  if(draft.column)html+=field('columnFinish','Finition de la colonne',draft.columnFinish,C.finishes.map(f=>[f.id,f.name]))+'<p class="no-image">Colonne STUDIO ONE · réf. 14177. Le visuel isolé officiel reste à raccorder. Dimensions et référence sont conservées dans votre projet.</p>';
 }else if(draft.step===3){
  html='<div class="product-grid">'+card('none','Sans miroir','Poursuivre sans miroir',null,draft.mirror===null)+C.mirrors.map(m=>card(m.id,m.name,m.sizes.length+' format(s) · tarifs indicatifs',m.image,draft.mirror===m.id)).join('')+'</div>';
  if(draft.mirror){const m=C.mirrors.find(m=>m.id===draft.mirror);html+='<div class="fields">'+field('mirrorSize','Dimensions',draft.mirrorSize,m.sizes.map((s,i)=>[i,s.label]))+(m.metal?field('mirrorFinish','Finition du cadre',draft.mirrorFinish,['Noir','Doré','Bronze','Argent'].map(s=>[s,s])):'')+'</div><p class="notice">Les prix des miroirs sont indicatifs dans le configurateur historique et nécessitent une confirmation usine.</p>';}
 }else{
  const m=C.models.find(m=>m.id===draft.format),f=finish(draft.finish),mirror=C.mirrors.find(m=>m.id===draft.mirror);
  html=`<div class="review-row">${image(m.image,m.name)}<div><strong>STUDIO ONE · ${esc(m.name)}</strong><small>${draft.width} × ${m.height} × 46 cm · ${esc(f.name)}</small></div></div>`;
  if(draft.top!=='plain')html+=`<div class="review-row">${image(C.media+'accessories/hd/basin-'+draft.top+'.webp','Vasque '+draft.top)}<div><strong>${esc(draft.top.toUpperCase())}</strong><small>${esc(draft.basinColor)} · ${['neris','torne'].includes(draft.top)?'Plan assorti + vasque à poser':'Vasque encastrée'}</small></div></div>`;
  if(draft.column)html+='<div class="review-row"><div><strong>Colonne STUDIO ONE · 14177</strong><small>38 × 132 × 27 cm · '+esc(finish(draft.columnFinish).name)+'</small></div></div>';
  if(mirror)html+=`<div class="review-row">${image(mirror.image,mirror.name)}<div><strong>${esc(mirror.name)}</strong><small>${esc(mirror.sizes[draft.mirrorSize].label)} · ${esc(draft.mirrorFinish)}</small></div></div>`;
  html+='<button class="primary full-cta" id="open-3d">PERSONNALISER MA SALLE DE BAINS EN 3D ↗</button><p class="fine">Votre composition reste enregistrée dans le parcours. Les modifications ultérieures de l’atelier restent dans votre projet 3D.</p>';
 }
 $('#step-content').innerHTML=html;$('#previous').disabled=draft.step===0;$('#next').hidden=draft.step===4;
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>go(Number(b.dataset.step)));
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const id=b.dataset.choice;selectionPatch(draft.step===0?{format:id}:draft.step===1?{top:id,basinColor:'gloss'}:draft.step===2?{column:id==='column'}:{mirror:id==='none'?null:id,mirrorSize:0});});
 document.querySelectorAll('[data-swatch]').forEach(b=>b.onclick=()=>selectionPatch({[b.dataset.swatch]:b.dataset.value}));
 for(const key of ['width','finish','columnFinish','mirrorSize','mirrorFinish']){const input=$('#'+key);if(input)input.onchange=()=>{if(!input.checkValidity()){input.reportValidity();return;}selectionPatch({[key]:key==='width'||key==='mirrorSize'?Number(input.value):input.value});};}
 $('#open-3d')?.addEventListener('click',()=>launch(draftProject(draft)));
 document.querySelectorAll('#step-content img').forEach(img=>img.onerror=()=>{img.classList.add('error-image');img.alt='Photo indisponible — vérifiez la connexion';});summary();
}
function go(step){const width=$('#width');if(width&&!width.checkValidity()){width.reportValidity();return;}draft.step=Math.min(4,Math.max(0,step));persist();$('#form-status').textContent='';render();$('#step-title').focus({preventScroll:true});}
function launch(project){
 try{localStorage.setItem(TRANSFER_KEY,JSON.stringify(project));location.href='atelier.html?guided=1';}catch{$('#form-status').textContent='Le transfert ne peut pas être enregistré sur cet appareil. Autorisez le stockage local pour ouvrir la scène sans perdre vos choix.';}
}
function showProjects(){
 const all=savedValue('studio-one-projects')||[],list=$('#projects-list');list.replaceChildren();
 for(const p of Array.isArray(all)?all.slice(0,20):[]){const card=document.createElement('article');card.className='saved-card';const title=document.createElement('div'),strong=document.createElement('strong'),date=document.createElement('small');strong.textContent=p.title||'Composition';date.textContent=p.date?new Date(p.date).toLocaleDateString('fr-FR'):'';title.append(strong,date);const open=document.createElement('button');open.textContent='Reprendre en 3D';open.onclick=()=>launch(p.data);card.append(title,open);list.append(card);}
 if(!list.children.length){const p=document.createElement('p');p.textContent='Aucune composition 3D enregistrée sur cette adresse. Vous pouvez importer un fichier de projet exporté depuis l’atelier.';list.append(p);}$('#projects-dialog').showModal();
}
function openAccount(){$('#account-dialog').showModal();$('#login-status').textContent=session?.client?statusText(session):'';}
$('#hero-image').src=C.media+'hero-meuble-hd.webp';$('#previous').onclick=()=>go(draft.step-1);$('#next').onclick=()=>go(draft.step+1);
$('#new-project').onclick=()=>{draft=initialDraft();persist();render();$('#configuration').scrollIntoView();};
$('#resume-project').onclick=()=>{const current=savedValue('studio-one-current-project');if(current)launch(current);else{render();$('#configuration').scrollIntoView();}};
for(const id of ['projects-open','saved-projects'])$('#'+id).onclick=showProjects;
$('#projects-close').onclick=()=>$('#projects-dialog').close();
for(const id of ['account-open','summary-account'])$('#'+id).onclick=openAccount;
$('#account-close').onclick=()=>$('#account-dialog').close();
$('#account-form').onsubmit=async e=>{e.preventDefault();const submit=e.target.querySelector('[type=submit]');submit.disabled=true;$('#login-status').textContent='Vérification du compte…';try{const values=Object.fromEntries(new FormData(e.target));session=await commercialRequest('identify',values);$('#login-status').textContent=session.randalAllowed===false?'Compte identifié, accès RANDAL non autorisé.':statusText(session);summary();}catch(e){session=null;summary();$('#login-status').textContent=e.message;}finally{submit.disabled=false;}};
$('#logout').onclick=async()=>{try{await commercialRequest('logout');session=null;summary();$('#login-status').textContent='Vous êtes déconnecté.';}catch(e){$('#login-status').textContent=e.message;}};
$('#project-import').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>100000)throw Error('Fichier trop volumineux.');const project=JSON.parse(await f.text());if(![1,2].includes(project.version)||!Array.isArray(project.items)||!project.room)throw Error('Ce fichier n’est pas un projet de la Bêta V2.');launch(project);}catch(e){$('#projects-status').textContent=e.message;}};
const connectivity=()=>{$('#connection-status').hidden=navigator.onLine;};addEventListener('offline',connectivity);addEventListener('online',connectivity);connectivity();
render();commercialRequest('session').then(result=>{session=result;summary();}).catch(()=>{});
