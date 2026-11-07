import {COUNTRIES,calculate,calculateQuick,matchesSearch,resolveSelection,numberValue,jointRangeLabel,productCompatibility,groupManufacturers,preferredCatalogue}from'./joints-core.mjs?v=20261107-joints3';
const $=id=>document.getElementById(id),form=$('project-form'),quickForm=$('quick-form');
const projectKey='lrf-joints-project-v1',favoriteKey='lrf-joints-favorite-v1',quickKey='lrf-joints-quick-v1';
const dimensions=['area','length','width','thickness','joint'],fields=[...dimensions,'kind','location','packageKg','margin','manualGrams'];
const fmt=(n,d=2)=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:d});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const items=values=>(values||[]).map(v=>`<li>${esc(v)}</li>`).join('');
const read=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
const write=(key,value)=>{try{value===null?localStorage.removeItem(key):localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
const image=(path,alt,css='')=>`<img src="${esc(path)}" alt="${esc(alt)}" class="${esc(css)}" loading="lazy" decoding="async">`;
const countryLabel=id=>COUNTRIES.find(c=>c.id===id)?.label||id;
const kindLabel=kind=>({ciment:'Ciment / résine-ciment',epoxy:'Époxy',ready:'Prêt à l’emploi',acrylique:'Prêt à l’emploi',dispersion:'Prêt à l’emploi'}[kind]||'Joint');
const family=kind=>['acrylique','dispersion'].includes(kind)?'ready':kind;
const scrollTo=element=>element?.scrollIntoView({behavior:'instant',block:'start'});
let BRANDS=[],manufacturers=[],mode='',country='fr',manufacturerCountry='fr',brand=null,product=null,favorite=null,entered=false,lastResult=null,timer,quickTimer,catalogueError=false,notice='',transfer=null;
const currentManufacturer=()=>manufacturers.find(m=>m.id===brand?.manufacturerId)||null;
const isFavorite=()=>!!brand&&BRANDS.find(b=>b.id===favorite?.brand)?.manufacturerId===brand.manufacturerId;
function bindImages(root){root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;const note=document.createElement('span');note.className='image-unavailable';note.textContent='Visuel indisponible';img.parentElement?.append(note);},{once:true}));}
function applyFields(values,keys=fields){if(!values||typeof values!=='object')return;for(const key of keys){const control=$(key);if(!control||values[key]==null||typeof values[key]==='object')continue;const value=String(values[key]).slice(0,50);if(control.tagName==='SELECT'){if([...control.options].some(o=>o.value===value))control.value=value;}else control.value=value;}}
function input(){return {...Object.fromEntries(new FormData(form)),country,brand:brand?.id||'',productId:product?.id||'',mode:'precise'};}
function quickInput(){return Object.fromEntries(new FormData(quickForm));}
function renderBrands(){
  const visible=manufacturers.filter(m=>m.country===manufacturerCountry&&matchesSearch(m.name,$('brand-search').value)),favoriteManufacturer=BRANDS.find(b=>b.id===favorite?.brand)?.manufacturerId;
  $('brands-status').textContent=catalogueError?'Catalogue fabricant momentanément indisponible.':visible.length?`${visible.length} fabricant${visible.length>1?'s':''} · ${countryLabel(manufacturerCountry)}`:'Aucun fabricant ne correspond à votre recherche.';
  $('brand-grid').innerHTML=visible.map(m=>{const b=preferredCatalogue(m),counts=m.catalogues.map(c=>c.products.length),min=Math.min(...counts),max=Math.max(...counts),selected=brand?.manufacturerId===m.id;return `<button type="button" class="brand-card${selected?' selected':''}" data-manufacturer-id="${esc(m.id)}" aria-pressed="${selected}"><span class="brand-image${b.logoTone==='light-on-dark'?' brand-logo-dark':''}">${image(b.logoPath,m.name)}</span><strong>${esc(m.name)}</strong><small>${min===max?min:min+' à '+max} référence${max>1?'s':''}${min!==max?' selon le pays de vente':''}</small>${favoriteManufacturer===m.id?'<span class="brand-favorite" aria-label="Favori">★</span>':''}</button>`;}).join('');
  $('favorite-shortcut').hidden=!favorite;$('start-calculator').disabled=!brand;
  $('start-calculator').innerHTML=brand?`Continuer avec ${esc(brand.name)} <span aria-hidden="true">→</span>`:'Choisissez un fabricant <span aria-hidden="true">→</span>';
  bindImages($('brand-grid'));
}
function renderIdentity(){if(!brand)return;const m=currentManufacturer();$('selected-brand-identity').innerHTML=`${image(brand.logoPath,brand.name,brand.logoTone==='light-on-dark'?'brand-logo-dark':'')}<div><span class="small-label">FABRICANT · ${esc(countryLabel(m.country))}</span><strong>${esc(brand.name)}</strong><span class="catalogue-identity-note">Fiches et conditionnements : ${esc(countryLabel(country))}</span></div>`;$('favorite-toggle').textContent=isFavorite()?'★ Mon fabricant favori':'☆ Mémoriser ce fabricant';$('favorite-toggle').setAttribute('aria-pressed',String(isFavorite()));$('catalogue-market-control').hidden=m.catalogues.length<2;$('catalogue-market').innerHTML=m.catalogues.map(b=>`<option value="${esc(b.id)}"${b.id===brand.id?' selected':''}>${esc(countryLabel(b.country))}</option>`).join('');bindImages($('selected-brand-identity'));}
function save(){if(!entered||!brand)return;write(projectKey,input());if(isFavorite()){const next={country,brand:brand.id,productId:product?.id||''};if(write(favoriteKey,next))favorite=next;}}
function sourceLinks(){$('technical-sources').innerHTML=(brand?`<li><a href="${esc(brand.manufacturerSource)}" target="_blank" rel="noopener noreferrer">Pays du fabricant : ${esc(countryLabel(brand.manufacturerCountry))} · source officielle ↗</a></li>`:'')+(brand?.products||[]).map(p=>`<li><a href="${esc(p.technicalUrl)}" target="_blank" rel="noopener noreferrer">${esc(brand.name+' — '+p.name)} · fiche technique ↗</a><br>${esc(p.coefficientNote)}</li>`).join('');}
function productCard(p,reasons=[]){
  const disabled=reasons.length>0,chosen=product?.id===p.id;
  return `<article class="joint-product-card${chosen?' is-selected':''}${disabled?' is-unavailable':''}"><button type="button" class="product-select" data-product-id="${esc(p.id)}" aria-pressed="${chosen}"${disabled?' disabled':''}><span class="joint-product-image">${image(p.imagePath,p.name+' — visuel fabricant')}</span><span class="product-kind">${esc(kindLabel(p.kind))}</span><strong>${esc(p.name)}</strong><span class="product-description">${esc(p.description)}</span><span class="product-range">Joints : ${esc(jointRangeLabel(p))}<br>${p.packages.map(n=>fmt(n)+' kg').join(' · ')}</span>${p.legacy?'<span class="usage-note">Ancienne gamme · disponibilité à confirmer</span>':''}${p.usageNote?`<span class="usage-note">${esc(p.usageNote)}</span>`:''}<span class="product-picked">${disabled?'Autres critères requis':chosen?'✓ Référence sélectionnée':'Choisir ce joint →'}</span></button>${disabled?`<ul class="product-exclusions">${items(reasons)}</ul>`:''}<a class="card-technical-link" href="${esc(p.technicalUrl)}" target="_blank" rel="noopener noreferrer">Fiche technique ↗</a></article>`;
}
function renderProducts(){
  if(!brand)return;
  const data=input(),query=$('product-search').value,matching=[],excluded=[];
  for(const p of brand.products){if(!matchesSearch(p.name+' '+p.description,query))continue;const reasons=productCompatibility(p,data);reasons.length?excluded.push({p,reasons}):matching.push(p);}
  $('criteria-summary').textContent=`${kindLabel(data.kind)} · ${data.location==='inside'?'intérieur':'extérieur'} · joint ${data.joint||'à préciser'} mm`;
  $('product-count').textContent=`${matching.length} référence${matching.length>1?'s':''} correspondant à vos critères · ${brand.products.length} au catalogue ${brand.name} · ${countryLabel(country)}`;
  const familyNote=brand.missingFamilies?.[data.kind];
  $('product-grid').innerHTML=matching.map(p=>productCard(p)).join('')||(familyNote?`<p class="empty-products">${esc(familyNote.note)} <a href="${esc(familyNote.sourceUrl)}" target="_blank" rel="noopener noreferrer">Consulter le catalogue fabricant ↗</a></p>`:'<p class="empty-products">Aucune référence ne correspond à ces critères. Vérifiez le type, l’usage et la largeur du joint. Les autres références restent consultables ci-dessous.</p>');
  $('other-products').hidden=!excluded.length;$('other-products-title').textContent=`Autres références de ${brand.name} (${excluded.length})`;
  $('other-product-grid').innerHTML=excluded.map(({p,reasons})=>productCard(p,reasons)).join('');
  $('selection-notice').textContent=notice;$('selection-notice').hidden=!notice;
  bindImages($('product-grid'));bindImages($('other-product-grid'));
}
function configureProduct(next,{restore=null}={}){
  product=next||null;$('product-settings').hidden=!product;
  if(!product)return;
  $('selected-product-name').textContent=product.name;
  $('packageKg').innerHTML=product.packages.map(n=>`<option value="${n}">${product.kind==='epoxy'?'Kit':product.kind==='ciment'?'Sac / boîte':'Seau / tube'} de ${fmt(n)} kg</option>`).join('');
  $('joint-range').textContent=`Plage de la référence : ${jointRangeLabel(product)}.`;
  const known=Number.isFinite(product.coefficient)&&product.coefficient>0,control=form.querySelector('input[name="method"][value="manufacturer"]');
  control.disabled=!known;$('manufacturer-method-label').textContent=known?'Méthode du fabricant':'Consommation fabricant à renseigner en g/m²';form.elements.method.value=known?'manufacturer':'manual';$('manualGrams').value='';$('margin').value=product.consumptionIncludesWaste?'0':'10';
  if(restore){applyFields(restore,['packageKg','margin','manualGrams']);if(restore.method==='manual'||known&&restore.method==='manufacturer')form.elements.method.value=restore.method;}
}
function render(){
  clearTimeout(timer);if(!entered||!brand)return;
  const data=input();
  if(product&&productCompatibility(product,data).length){notice='La référence précédemment choisie ne correspond plus à vos critères. Choisissez un autre joint.';configureProduct(null);}
  renderProducts();$('print').disabled=true;$('share').disabled=!product;
  if(!product){lastResult=null;$('status-label').textContent='Choix du produit';$('result-body').innerHTML='<div class="result-block"><h3>Choisissez votre joint.</h3><p>Renseignez vos critères, puis sélectionnez l’une des références affichées.</p></div>';save();return;}
  const values=input(),r=calculate(values,BRANDS);lastResult=r;$('manual-field').hidden=values.method!=='manual';
  $('margin-help').textContent=values.method==='manual'?'Réserve ajoutée à votre consommation saisie.':product.consumptionIncludesWaste?'La méthode fabricant inclut déjà des déchets. Réserve complémentaire facultative.':'Ajoutée séparément pour les pertes de mise en œuvre.';
  for(const key of dimensions)$(key).removeAttribute('aria-invalid');for(const key of dimensions)if(numberValue(values[key])===null||numberValue(values[key])<=0)$(key).setAttribute('aria-invalid','true');
  const identity=`<div class="joint-selected-product">${image(product.imagePath,product.name)}<div><span class="small-label">${esc(brand.name)} · fabricant ${esc(countryLabel(brand.manufacturerCountry))}</span><h3>${esc(product.name)}</h3><p>${esc(kindLabel(product.kind))}<br>Fiches et conditionnements : ${esc(countryLabel(country))}</p></div></div><a class="result-source" href="${esc(product.technicalUrl)}" target="_blank" rel="noopener noreferrer">Ouvrir la fiche technique ↗</a>`;
  if(!r.valid||r.blocked){$('status-label').textContent='Saisie à compléter';$('result-body').innerHTML=identity+`<div class="result-block"><h3>Précisons votre estimation.</h3><ul>${items(r.blocked?r.blocks:r.errors)}</ul></div>`;}
  else{
    $('status-label').textContent='Calcul en direct';$('print').disabled=false;
    const noun=product.kind==='epoxy'?'kit':product.kind==='ciment'?'sac / boîte':'seau / tube',plural=product.kind==='epoxy'?'kits':product.kind==='ciment'?'sacs / boîtes':'seaux / tubes';
    const base=r.manual?'Consommation saisie':product.consumptionIncludesWaste?'Besoin selon tableau fabricant':'Besoin théorique hors réserve';
    const formula=r.manual?`${fmt(r.gramsM2,3)} g/m² × ${fmt(r.area)} m² ÷ 1 000 = ${fmt(r.netKg,3)} kg.`:`[(${fmt(r.length*10)} + ${fmt(r.width*10)}) ÷ (${fmt(r.length*10)} × ${fmt(r.width*10)})] × ${fmt(r.thickness)} × ${fmt(r.joint)} × ${fmt(product.coefficient,4)} × ${fmt(r.area)} = ${fmt(r.netKg,3)} kg.`;
    const warnings=[...r.warnings,...(product.usageNote?[product.usageNote]:[]),...(product.legacy?['Ancienne gamme : vérifiez la disponibilité et la fiche correspondant à votre emballage.']:[])];
    $('result-body').innerHTML=`<div class="bag-number"><strong>${fmt(r.units,0)}</strong><span>${r.units===1?noun:plural}</span></div><p class="bag-caption">de ${fmt(r.packageKg)} kg · ${fmt(r.purchasedKg)} kg à prévoir</p>${identity}<dl class="result-metrics"><div><dt>${base}</dt><dd>${fmt(r.netKg)} <small>kg</small></dd></div><div><dt>Réserve de ${fmt(r.margin,0)} %</dt><dd>+ ${fmt(r.reserveKg)} <small>kg</small></dd></div><div><dt>Besoin avec réserve</dt><dd>${fmt(r.totalKg)} <small>kg</small></dd></div><div><dt>Consommation de base</dt><dd>${fmt(r.gramsM2,1)} <small>g/m²</small></dd></div></dl><p class="bag-caption">${fmt(r.area)} m² · ${fmt(r.length)} × ${fmt(r.width)} cm<br>Épaisseur ${fmt(r.thickness)} mm · joint ${fmt(r.joint)} mm<br>${values.location==='inside'?'Intérieur':'Extérieur'}</p>${warnings.length?`<p class="notice">${warnings.map(esc).join('<br>')}</p>`:''}<details class="calculation-details"><summary>Voir le détail du calcul</summary><p class="formula">${esc(formula)}</p><p>${r.manual?'La consommation saisie remplace la formule pour cette configuration.':esc(product.coefficientNote)}</p><p>Réserve incluse : ${fmt(r.totalKg,3)} kg ÷ ${fmt(r.packageKg)} kg/${noun} → ${r.units} ${r.units>1?'unités':'unité'}.<br>Surplus d’arrondi : ${fmt(r.surplusKg,3)} kg.</p></details>${product.notes?.length?`<details class="calculation-details"><summary>Les précisions de cette référence</summary><ul>${items(product.notes)}</ul></details>`:''}`;
  }
  bindImages($('result-body'));save();
}
function enterCalculator({remember=false,scroll=true,restore=null}={}){
  if(!brand)return;manufacturerCountry=brand.manufacturerCountry;mode='precise';entered=true;displayMode();notice='';
  if(remember){const next={country,brand:brand.id,productId:product?.id||''};if(write(favoriteKey,next))favorite=next;else $('action-status').textContent='La mémorisation est bloquée dans ce navigateur.';}
  if(restore){applyFields(restore,dimensions.concat(['kind','location']));if(!restore.kind&&product)$('kind').value=family(product.kind);}
  if(transfer){applyFields(transfer,dimensions.concat(['kind']));transfer=null;}
  $('product-search').value='';renderIdentity();sourceLinks();configureProduct(product,{restore});render();
  if(scroll)scrollTo($('selected-manufacturer'));
}
function displayMode(){
  $('mode-choice').hidden=!!mode;$('mode-bar').hidden=!mode;$('mode-name').textContent=mode==='quick'?'Calcul rapide':'Calcul précis par fabricant';
  $('quick-calculator').hidden=mode!=='quick';$('manufacturer-choice').hidden=mode!=='precise'||entered;$('selected-manufacturer').hidden=mode!=='precise'||!entered;$('calculator').hidden=mode!=='precise'||!entered;$('sources-panel').hidden=mode!=='precise'||!entered;$('load-error').hidden=!catalogueError||mode!=='precise';
}
function chooseMode(next,{scroll=true}={}){
  mode=next;if(next==='quick'){displayMode();renderQuick(false);if(scroll)scrollTo($('quick-calculator'));return;}
  if(entered&&brand){if(transfer){applyFields(transfer,dimensions.concat(['kind']));transfer=null;}displayMode();render();if(scroll)scrollTo($('selected-manufacturer'));return;}
  const selection=resolveSelection(favorite,BRANDS),saved=read(projectKey);
  if(selection){country=selection.country;brand=selection.brand;product=selection.product;const exact=resolveSelection(saved,BRANDS);if(exact?.brand.id===brand.id)product=exact.product;enterCalculator({scroll,restore:exact?.brand.id===brand.id?saved:null});}
  else{entered=false;displayMode();renderBrands();if(scroll)scrollTo($('manufacturer-choice'));}
}
function renderQuick(showErrors=false){
  clearTimeout(quickTimer);const data=quickInput(),r=calculateQuick(data);write(quickKey,data);
  if(!r.valid){$('quick-result-body').innerHTML=showErrors?`<div class="result-block"><h3>Vérifiez vos mesures.</h3><ul>${items(r.errors)}</ul></div>`:'<h3>Renseignez vos mesures.</h3><p>La quantité estimée s’affichera ici.</p>';return;}
  $('quick-result-body').innerHTML=`<div class="quick-kg"><strong>${fmt(r.totalKg,1)}</strong><span>kg</span></div><p class="bag-caption">${kindLabel(r.kind)} · ${fmt(r.gramsM2,1)} g/m²<br>${fmt(r.area)} m² · ${fmt(r.length)} × ${fmt(r.width)} cm<br>Épaisseur ${fmt(r.thickness)} mm · joint ${fmt(r.joint)} mm</p><details class="calculation-details"><summary>Voir la méthode</summary><p>Coefficient indicatif : ${fmt(r.coefficient)}. Dimensions converties en millimètres.<br>[(L + l) ÷ (L × l)] × épaisseur × largeur du joint × coefficient × surface.</p></details>`;
}
function restoreState(){
  const savedQuick=read(quickKey);if(savedQuick&&typeof savedQuick==='object'){for(const key of dimensions)if(typeof savedQuick[key]==='string')$('q-'+key).value=savedQuick[key].slice(0,50);if(['ciment','epoxy'].includes(savedQuick.kind))quickForm.elements.kind.value=savedQuick.kind;}
  const stored=read(favoriteKey);favorite=resolveSelection(stored,BRANDS)?stored:null;renderBrands();
  const query=new URLSearchParams(location.search);if(query.get('calc')!=='1')return;
  const saved=Object.fromEntries(query);if(saved.mode==='quick'){for(const key of dimensions)if(saved[key])$('q-'+key).value=saved[key].slice(0,50);if(['ciment','epoxy'].includes(saved.kind))quickForm.elements.kind.value=saved.kind;chooseMode('quick',{scroll:false});return;}
  const selected=resolveSelection(saved,BRANDS);if(selected){country=selected.country;brand=selected.brand;product=selected.product;enterCalculator({scroll:false,restore:saved});}
  else{mode='precise';displayMode();renderBrands();}
}
async function load(){try{({BRANDS}=await import('./joints-catalog.mjs?v=20261107-joints3'));if(!BRANDS.length)throw Error('Empty catalogue');manufacturers=groupManufacturers(BRANDS);catalogueError=false;restoreState();}catch{catalogueError=true;renderBrands();displayMode();}}
$('mode-choice').addEventListener('click',event=>{const button=event.target.closest('[data-mode]');if(button)chooseMode(button.dataset.mode);});
$('change-mode').addEventListener('click',()=>{mode='';displayMode();scrollTo($('mode-choice'));});
$('refine-quick').addEventListener('click',()=>{transfer=quickInput();chooseMode('precise');});
$('retry-load').addEventListener('click',()=>location.reload());
$('brand-grid').addEventListener('click',event=>{const button=event.target.closest('[data-manufacturer-id]');if(!button)return;const m=manufacturers.find(m=>m.id===button.dataset.manufacturerId&&m.country===manufacturerCountry);brand=preferredCatalogue(m);if(brand)country=brand.country;product=null;renderBrands();});
document.querySelectorAll('input[name="manufacturer-country"]').forEach(control=>control.addEventListener('change',()=>{manufacturerCountry=control.value;brand=null;product=null;$('brand-search').value='';renderBrands();}));
$('brand-search').addEventListener('input',renderBrands);
$('start-calculator').addEventListener('click',()=>{if(!$('remember-brand').checked&&isFavorite()){if(write(favoriteKey,null))favorite=null;}enterCalculator({remember:$('remember-brand').checked});});
$('favorite-shortcut').addEventListener('click',()=>{const next=resolveSelection(favorite,BRANDS);if(next){country=next.country;brand=next.brand;product=next.product;const saved=read(projectKey);enterCalculator({restore:saved?.brand===brand.id?saved:null});}});
$('favorite-toggle').addEventListener('click',()=>{const next=isFavorite()?null:{country,brand:brand.id,productId:product?.id||''};if(write(favoriteKey,next)){favorite=next;renderIdentity();$('action-status').textContent=next?'Fabricant mémorisé sur cet appareil.':'Favori retiré.';}else $('action-status').textContent='La mémorisation est bloquée dans ce navigateur.';});
$('change-manufacturer').addEventListener('click',()=>{entered=false;manufacturerCountry=brand.manufacturerCountry;displayMode();document.querySelector(`input[name="manufacturer-country"][value="${manufacturerCountry}"]`).checked=true;$('brand-search').value='';$('remember-brand').checked=true;renderBrands();scrollTo($('manufacturer-choice'));});
$('catalogue-market').addEventListener('change',()=>{const next=BRANDS.find(b=>b.id===$('catalogue-market').value&&b.manufacturerId===brand?.manufacturerId);if(!next)return;brand=next;country=next.country;configureProduct(null);notice='Fiches et conditionnements mis à jour : '+countryLabel(country)+'. Choisissez une référence de ce catalogue.';$('product-search').value='';renderIdentity();sourceLinks();render();});
$('product-grid').addEventListener('click',event=>{const button=event.target.closest('[data-product-id]');if(!button||button.disabled)return;const next=brand.products.find(p=>p.id===button.dataset.productId);if(next&&next.id!==product?.id){notice='';configureProduct(next);render();}if(next)scrollTo($('product-settings'));});
$('product-search').addEventListener('input',renderProducts);
$('show-products').addEventListener('click',()=>{render();scrollTo($('products-panel'));});
form.addEventListener('input',event=>{if(event.target.id==='product-search')return;clearTimeout(timer);$('action-status').textContent='';timer=setTimeout(render,200);});
form.addEventListener('change',event=>{if(event.target.id!=='product-search')render();});
form.addEventListener('submit',event=>{event.preventDefault();render();if(product&&matchMedia('(max-width:800px)').matches)scrollTo($('result-card'));});
quickForm.addEventListener('input',()=>{clearTimeout(quickTimer);quickTimer=setTimeout(()=>renderQuick(false),200);});
quickForm.addEventListener('submit',event=>{event.preventDefault();renderQuick(true);if(matchMedia('(max-width:800px)').matches)scrollTo($('quick-result-card'));});
$('print').addEventListener('click',()=>{render();if(lastResult?.valid&&!lastResult.blocked){$('result-body').querySelectorAll('details').forEach(d=>d.open=true);window.print();}});
$('share').addEventListener('click',async()=>{render();if(!product)return;const url=new URL(location.href);url.search='';url.hash='calculator';url.searchParams.set('calc','1');for(const[key,value]of Object.entries(input()))if(['country','brand','productId','method','mode',...fields].includes(key))url.searchParams.set(key,value);try{await navigator.clipboard.writeText(url.href);$('action-status').textContent='Lien copié avec la référence, les critères et les mesures.';}catch{const field=document.createElement('input');field.value=url.href;field.readOnly=true;field.style.width='100%';field.setAttribute('aria-label','Lien de votre calcul');$('action-status').replaceChildren(document.createTextNode('Copiez ce lien : '),field);field.select();}});
load();
