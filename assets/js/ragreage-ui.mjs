import { calculate, SUPPORTS, matchesBrandSearch } from './ragreage-core.mjs?v=20261103-5';
import { BRANDS, COUNTRIES } from './ragreage-catalog.mjs?v=20261103-5';

const $ = id => document.getElementById(id);
const form = $('project-form');
const storeKey = 'lrf-ragreage-v2';
const favoriteKey = 'lrf-ragreage-favorite-v1';
const fields = ['brand','country','productId','support','location','condition','heating','finish','slope','porosity','waterproofing','woodType','area','thickness','minThickness','maxThickness','margin'];
const numberFields = new Set(['area','thickness','minThickness','maxThickness']);
const words = {location:{inside:'Intérieur',outside:'Extérieur'},finish:{tile:'Carrelage',soft:'Sol souple',parquet:'Parquet',bare:'Nu — annexe / extérieur'},heating:{none:'Sans chauffage au sol',water:'Chauffage à eau / réversible',electric:'Plancher rayonnant électrique'}};
const fmt = (n,digits=1) => Number(n).toLocaleString('fr-FR',{maximumFractionDigits:digits});
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list = values => (values||[]).map(value=>`<li>${esc(value)}</li>`).join('');
const readStored = key => {try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
const writeStored = (key,value) => {try{value===null?localStorage.removeItem(key):localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
const countryLabel = id => COUNTRIES.find(item=>item.id===id)?.label || id;
const media = (url,alt,css='') => url ? `<img src="${esc(url)}" alt="${esc(alt)}" class="${css}" loading="lazy" decoding="async">` : '';
let selectedCountry='fr', selectedBrand=null, entered=false, lastResult=null, timer;
let selectedProductId='', productBrandId='', selectionNotice='';
let favorite=readStored(favoriteKey);
if(!favorite || !BRANDS.some(b=>b.id===favorite.brand && b.country===favorite.country)) favorite=null;

function readInput(){
  const data=Object.fromEntries(new FormData(form));
  for(const name of numberFields){const raw=String(data[name]??'').trim();data[name]=raw===''?null:Number(raw.replace(',','.'));}
  data.margin=Number(data.margin);data.brand=selectedBrand?.id || '';data.country=selectedCountry;data.productId=selectedProductId;
  return data;
}
function syncImages(root=document){
  root.querySelectorAll('img').forEach(img=>{if(img.dataset.errorBound)return;img.dataset.errorBound='1';img.addEventListener('error',()=>{img.hidden=true;const box=img.closest('.brand-image,.product-image');if(box){box.classList.add('image-unavailable');const note=document.createElement('span');note.className='media-unavailable';note.textContent=box.classList.contains('product-image')?'Visuel fabricant indisponible':'';box.append(note);}});});
}
function renderBrands(){
  const query=$('brand-search').value;
  const visible=BRANDS.filter(b=>b.country===selectedCountry && matchesBrandSearch(b,query));
  $('brands-status').textContent=visible.length ? `${visible.length} fabricant${visible.length>1?'s':''} · ${countryLabel(selectedCountry)}` : 'Aucun fabricant ne correspond à cette recherche.';
  $('brand-grid').innerHTML=visible.map(b=>`<button type="button" class="brand-card${selectedBrand?.id===b.id?' selected':''}" data-brand-id="${esc(b.id)}" aria-pressed="${selectedBrand?.id===b.id}" aria-label="Choisir ${esc(b.name)}"><span class="brand-image">${media(b.logoPath||b.logoUrl,b.name)}</span><strong>${esc(b.name)}</strong>${favorite?.brand===b.id?'<span class="brand-favorite" aria-label="Favori">★</span>':''}<small>${b.products?.length?`${b.products.length} référence${b.products.length>1?'s':''} vérifiée${b.products.length>1?'s':''}`:'Fiches à compléter'}</small></button>`).join('');
  $('favorite-shortcut').hidden=!favorite;
  $('remember-brand').checked=!!selectedBrand && favorite?.brand===selectedBrand.id;
  $('start-calculator').disabled=!selectedBrand;
  $('start-calculator').innerHTML=selectedBrand ? `Continuer avec ${esc(selectedBrand.name)} <span aria-hidden="true">→</span>`:'Choisissez un fabricant <span aria-hidden="true">→</span>';
  syncImages($('brand-grid'));
}
function renderIdentity(){
  if(!selectedBrand)return;
  if(productBrandId!==selectedBrand.id){selectedProductId='';selectionNotice='';productBrandId=selectedBrand.id;}
  $('selected-brand-identity').innerHTML=`${media(selectedBrand.logoPath||selectedBrand.logoUrl,selectedBrand.name)}<div><span class="small-label">VOTRE FABRICANT · ${esc(countryLabel(selectedCountry))}</span><strong>${esc(selectedBrand.name)}</strong></div>`;
  $('favorite-toggle').textContent=favorite?.brand===selectedBrand.id?'★ Mon favori':'☆ Mettre en favori';
  $('favorite-toggle').setAttribute('aria-pressed',String(favorite?.brand===selectedBrand.id));
  $('brand-id').value=selectedBrand.id;
  syncImages($('selected-brand-identity'));
}
function enterCalculator({scroll=true,remember=false}={}){
  if(!selectedBrand)return;
  if(remember){const next={brand:selectedBrand.id,country:selectedCountry};if(writeStored(favoriteKey,next))favorite=next;else $('brands-status').textContent='La mémorisation est bloquée dans ce navigateur. Vous pouvez continuer votre calcul.';}
  entered=true;$('manufacturer-choice').hidden=true;$('selected-manufacturer').hidden=false;$('calculator').hidden=false;$('support-guide').hidden=false;
  renderIdentity();render();
  $('selected-manufacturer').tabIndex=-1;$('selected-manufacturer').focus({preventScroll:true});
  if(scroll)$('selected-manufacturer').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
}
function renderSources(){
  $('technical-sources').innerHTML=(selectedBrand?.products||[]).map(p=>`<li><a href="${esc(p.technicalUrl||p.sourceUrl)}" target="_blank" rel="noopener">${esc(selectedBrand.name)} — ${esc(p.name)} · fiche fabricant</a></li>`).join('')||'<li>Consultez le fabricant pour compléter les références techniques de ce catalogue.</li>';
}
function renderSolutions(result){
  const box=$('solution-options');
  const options=result.alternatives||[];
  if(!selectedBrand?.products?.length){box.hidden=true;box.replaceChildren();return;}
  const excluded=result.excludedProducts||[];
  const catalogueWasOpen=box.querySelector('.manufacturer-range')?.open;
  const catalogue=`${excluded.length?`<details class="manufacturer-range"${catalogueWasOpen?' open':''}><summary>Autres références de ${esc(selectedBrand.name)} (${excluded.length})</summary><p>Ces références ne conviennent pas à vos critères actuels. Le motif précise ce qui les écarte du calcul.</p>${excluded.length?excluded.map(({product:p,reasons})=>`<article class="excluded-product"><strong>${esc(p.label||p.name)}</strong><ul>${list(reasons)}</ul><a href="${esc(p.technicalUrl||p.url)}" target="_blank" rel="noopener">Vérifier la fiche fabricant ↗</a></article>`).join(''):'<p>Toutes les références vérifiées de cette marque correspondent à vos critères.</p>'}</details>`:''}<p class="range-coverage">${selectedBrand.products.length} références vérifiées dans ce catalogue. <a href="${esc(selectedBrand.rangeUrl||selectedBrand.website)}" target="_blank" rel="noopener">Consulter la gamme fabricant ↗</a></p>`;
  if(!result.valid||options.length<2){box.hidden=false;box.innerHTML=`<div class="solution-heading"><h3>${options.length===1?'1 solution compatible':options.length+' solutions compatibles'}</h3>${options.length===1?'<p>Les autres références restent visibles ci-dessous avec leur motif d’exclusion.</p>':''}</div>${catalogue}`;return;}
  const wasOpen=box.querySelector('.solution-comparison')?.open;
  const range=p=>p.min===p.max?`${fmt(p.min)} mm`:`${fmt(p.min)} à ${fmt(p.max)} mm`;
  const summary=p=>p.comparison?.summary||p.type||'Référence documentée pour cette configuration.';
  const priceLabel=p=>p.bags==null?'Quantité après validation':`${fmt(p.bags,0)} ${p.bags===1?'sac':'sacs'} de ${fmt(p.bag)} kg`;
  const cards=options.map(option=>{
    const p=option.product||option;
    const chosen=result.product?.id===option.id;
    const highlights=(p.comparison?.highlights||[]).slice(0,2);
    return `<button type="button" class="solution-choice${chosen?' is-selected':''}" data-solution-id="${esc(option.id)}" aria-pressed="${chosen}" aria-label="Choisir ${esc(p.label||p.name)}"><span class="solution-thumb">${media(p.imagePath||p.imageUrl,`Sac ${p.label||p.name}`)}</span><span class="solution-copy"><strong>${esc(p.label||p.name)}</strong><span class="solution-summary">${esc(summary(p))}</span><span class="solution-chips"><span>${esc(range(p))}</span><span>${esc(priceLabel(option))}</span></span>${highlights.length?`<span class="solution-highlights">${highlights.map(esc).join(' · ')}</span>`:''}${option.requirements?.length?`<span class="solution-requirement">${esc(option.requirements[0])}</span>`:''}<span class="solution-selected-label">${chosen?'✓ Produit sélectionné':'Choisir cette solution'}</span></span></button>`;
  }).join('');
  const timing=(p,key)=>(key==='covering'?p.comparison?.coveringByFinish?.[form.elements.finish.value]:null)||p.comparison?.[key]||'Non renseigné dans la fiche vérifiée';
  const rows=[
    ['Différence principale',o=>summary(o.product||o)],
    ['Épaisseur pour vos critères',o=>range(o.product||o)],
    ['Quantité pour votre chantier',o=>priceLabel(o)],
    ['Poudre, réserve incluse',o=>o.totalKg==null?'Après validation':`${fmt(o.totalKg)} kg`],
    ['Primaire pour votre support',o=>o.primary?.label||'À confirmer'],
    ['Marche à pied',o=>timing(o.product||o,'walkable')],
    ['Pose du revêtement',o=>timing(o.product||o,'covering')],
    ['Temps de travail',o=>timing(o.product||o,'workingTime')],
    ['Points de vigilance',o=>(o.requirements?.length?o.requirements:(o.product||o).comparison?.highlights||[]).join(' · ')||'Consulter les précautions de la fiche'],
  ];
  const tableRows=rows.map(([label,value])=>`<tr><th scope="row">${esc(label)}</th>${options.map(o=>`<td>${esc(value(o))}</td>`).join('')}</tr>`).join('');
  box.hidden=false;
  box.innerHTML=`<div class="solution-heading"><h3>${options.length} solutions possibles</h3><p>Comparez leurs différences, puis choisissez. Les quantités et le primaire se mettent à jour.</p></div><div class="solution-choices" role="group" aria-label="Produits compatibles de ${esc(selectedBrand.name)}">${cards}</div><details class="solution-comparison"${wasOpen?' open':''}><summary>Comparer les différences en détail</summary><p class="comparison-hint">Faites glisser le tableau pour voir les autres produits.</p><div class="solution-table-wrap" tabindex="0" aria-label="Tableau comparatif des solutions"><table><caption class="sr-only">Comparaison des ragréages pour votre chantier</caption><thead><tr><th scope="col">Critère</th>${options.map(o=>`<th scope="col">${esc(o.label||o.name)}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></div><p class="comparison-note">Délais indicatifs dans les conditions précisées par le fabricant. Épaisseur, température, humidité et revêtement peuvent les modifier. Circulable ne signifie pas prêt à recouvrir.</p><div class="comparison-sources">${options.map(o=>{const p=o.product||o;return `<a href="${esc(p.technicalUrl||p.url||p.sourceUrl)}" target="_blank" rel="noopener">Fiche ${esc(p.label||p.name)} ↗</a>`;}).join('')}</div></details>`;
  box.insertAdjacentHTML('beforeend',catalogue);
  syncImages(box);
}
function render(){
  if(!entered||!selectedBrand)return;
  const input=readInput();const result=calculate(input,BRANDS);lastResult=result;
  if(result.selectionChanged)selectionNotice=result.selectionMessage||'La sélection a été adaptée à vos nouveaux critères.';
  selectedProductId=result.product?.id||'';$('product-id').value=selectedProductId;
  $('selection-status').textContent=selectionNotice;$('selection-status').hidden=!selectionNotice;
  renderSolutions(result);
  $('slope-field').hidden=input.location!=='outside';
  $('waterproofing-field').hidden=input.location!=='outside';
  $('porosity-field').hidden=!['cement','concrete'].includes(input.support);
  $('wood-type-field').hidden=input.support!=='wood';
  const support=SUPPORTS.find(item=>item.id===input.support);
  $('support-note').textContent=support?.description||'';
  $('print').disabled=!result.valid||result.blocked;
  $('status-label').textContent=!result.valid?'Saisie à compléter':result.blocked?'À vérifier':'Calcul en direct';
  for(const id of numberFields){$(id).removeAttribute('aria-invalid');if((['area','thickness'].includes(id)&&input[id]===null)||(input[id]!==null&&(!Number.isFinite(input[id])||(id==='minThickness'?input[id]<0:input[id]<=0))))$(id).setAttribute('aria-invalid','true');}
  if(!result.valid){
    $('result-body').innerHTML=`<div class="result-block"><h3>Précisons vos mesures.</h3><ul>${list(result.errors)}</ul></div>`;
  }else if(result.blocked){
    $('result-body').innerHTML=`<div class="result-block"><h3>Un point à vérifier.</h3><ul>${list(result.blocks)}</ul>${selectedBrand.website?`<a class="result-source" href="${esc(selectedBrand.website)}" target="_blank" rel="noopener">Consulter ${esc(selectedBrand.name)} ↗</a>`:''}${result.product?.url?`<a class="result-source" href="${esc(result.product.url)}" target="_blank" rel="noopener">Fiche de ${esc(result.product.label||result.product.name)} ↗</a>`:''}</div>`;
  }else{
    const r=result,p=r.product;
    const image=p.imagePath||p.imageUrl;
    const primaryQuantity=r.primaryMin==null?'':`<p><strong>${fmt(r.primaryMin,2)} à ${fmt(r.primaryMax,2)} kg</strong> pour ${fmt(r.area)} m², pour une passe. Conditionnement et absorption à vérifier.</p>`;
    const warnings=(r.warnings||[]).filter(Boolean);
    $('result-body').innerHTML=`
      <div class="bag-number"><strong>${fmt(r.bags,0)}</strong><span>${r.bags===1?'sac':'sacs'}</span></div>
      <p class="bag-caption">de ${fmt(r.bag)} kg · réserve de ${fmt(r.margin,0)} % incluse</p>
      <dl class="result-metrics"><div><dt>Poudre, réserve incluse</dt><dd>${fmt(r.totalKg)} <small>kg</small></dd></div><div><dt>Quantité à commander</dt><dd>${fmt(r.purchasedKg)} <small>kg</small></dd></div></dl>
      <div class="recommended-product"><div class="product-image">${image?media(image,`Sac ${selectedBrand.name} ${p.label||p.name}`):'<span class="media-unavailable">Visuel fabricant à compléter</span>'}</div><div><span class="small-label">VOTRE RAGRÉAGE</span><h3>${esc(p.label||p.name)}</h3><p>${esc(selectedBrand.name)}</p>${p.imageNote?`<small class="product-image-note">${esc(p.imageNote)}</small>`:''}${p.url?`<a class="result-source" href="${esc(p.url)}" target="_blank" rel="noopener">Fiche fabricant ↗</a>`:''}</div></div>
      <section class="primary-box" aria-label="Primaire adapté"><span class="small-label">LE PRIMAIRE</span><h3>${esc(r.primary.label)}</h3><p>${esc(r.primary.detail)}</p>${primaryQuantity}${r.primary.url?`<a href="${esc(r.primary.url)}" target="_blank" rel="noopener">Vérifier la fiche du primaire ↗</a>`:''}</section>
      ${warnings.length?`<p class="result-type">${esc(warnings[0])}</p>${warnings.length>1?`<details class="calculation-details"${input.support==='wood'||input.location==='outside'||input.heating!=='none'?' open':''}><summary>Précautions du produit (${warnings.length-1})</summary><ul>${list(warnings.slice(1))}</ul></details>`:''}`:''}
      <details class="calculation-details"><summary>Le détail du calcul</summary><p>${fmt(r.area)} m² × ${fmt(r.consumptionPerM2,3)} kg/m² à ${fmt(r.thickness)} mm = <strong>${fmt(r.netKg)} kg</strong>.<br>${esc(r.consumptionDescription||'Consommation de la fiche fabricant.')}<br>Avec ${fmt(r.margin,0)} % de réserve : ${fmt(r.totalKg)} kg ÷ ${fmt(r.bag)} kg/sac → <strong>${fmt(r.bags,0)} sacs</strong>.<br>Masse de poudre : ${fmt(r.loadKgM2)} kg/m², hors eau.<br>L’arrondi aux sacs ajoute ${fmt(r.surplusKg)} kg au besoin avec réserve.</p></details>
      <details class="calculation-details"><summary>Les conseils pour votre chantier</summary><ul>${list(r.tips)}</ul></details>
      <p class="bag-caption">${esc(words.location[input.location])} · ${esc(support?.label)} · ${esc(words.finish[input.finish])}<br>${fmt(r.area)} m² à ${fmt(r.thickness)} mm${input.minThickness!==null||input.maxThickness!==null?`<br>Épaisseurs locales : min. ${input.minThickness===null?'à vérifier':fmt(input.minThickness)+' mm'} · max. ${input.maxThickness===null?'à vérifier':fmt(input.maxThickness)+' mm'}`:''}</p>`;
  }
  syncImages($('result-body'));renderSources();writeStored(storeKey,{...input,productId:selectedProductId});
}
function restore(){
  const query=new URLSearchParams(location.search);const shared=query.get('calc')==='1';
  const saved=shared?Object.fromEntries(query):readStored(storeKey);
  if(saved&&typeof saved==='object')for(const key of fields){
    if(!Object.hasOwn(saved,key)||saved[key]===null||typeof saved[key]==='object')continue;
    const control=form.elements.namedItem(key);if(!control)continue;const value=String(saved[key]).slice(0,80);
    if(control instanceof RadioNodeList){if([...control].some(item=>item.value===value))control.value=value;}
    else if(control.tagName==='SELECT'){if([...control.options].some(item=>item.value===value))control.value=value;}
    else control.value=value;
  }
  if(saved&&typeof saved==='object'){selectedProductId=typeof saved.productId==='string'?saved.productId.slice(0,100):'';productBrandId=typeof saved.brand==='string'?saved.brand:'';}
  if(saved?.minThickness!=null||saved?.maxThickness!=null)form.querySelector('.measure-details').open=true;
  const initial=shared&&saved?.brand?BRANDS.find(b=>b.id===saved.brand):favorite?BRANDS.find(b=>b.id===favorite.brand):null;
  if(initial){selectedBrand=initial;selectedCountry=initial.country;document.querySelector(`input[name="catalogue-country"][value="${selectedCountry}"]`).checked=true;enterCalculator({scroll:false});}
  renderBrands();
}
$('brand-grid').addEventListener('click',event=>{const button=event.target.closest('[data-brand-id]');if(!button)return;selectedBrand=BRANDS.find(b=>b.id===button.dataset.brandId)||null;renderBrands();});
document.querySelectorAll('input[name="catalogue-country"]').forEach(control=>control.addEventListener('change',()=>{selectedCountry=control.value;selectedBrand=null;$('brand-search').value='';renderBrands();}));
$('brand-search').addEventListener('input',renderBrands);
$('start-calculator').addEventListener('click',()=>enterCalculator({remember:$('remember-brand').checked}));
$('favorite-shortcut').addEventListener('click',()=>{selectedBrand=BRANDS.find(b=>b.id===favorite?.brand);if(selectedBrand){selectedCountry=selectedBrand.country;enterCalculator();}});
$('change-manufacturer').addEventListener('click',()=>{entered=false;$('manufacturer-choice').hidden=false;$('selected-manufacturer').hidden=true;$('calculator').hidden=true;$('support-guide').hidden=true;document.querySelector(`input[name="catalogue-country"][value="${selectedCountry}"]`).checked=true;$('brand-search').value='';renderBrands();$('manufacturer-choice').scrollIntoView({behavior:'smooth',block:'start'});});
$('favorite-toggle').addEventListener('click',()=>{const next=favorite?.brand===selectedBrand?.id?null:{brand:selectedBrand.id,country:selectedCountry};if(writeStored(favoriteKey,next)){favorite=next;renderIdentity();$('action-status').textContent=next?'Fabricant enregistré. Il sera choisi automatiquement à votre prochaine visite.':'Favori retiré.';}else $('action-status').textContent='La mémorisation est bloquée dans ce navigateur.';});
form.addEventListener('input',()=>{clearTimeout(timer);selectionNotice='';$('action-status').textContent='';timer=setTimeout(render,200);});
form.addEventListener('change',()=>{clearTimeout(timer);selectionNotice='';render();});
form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);render();if(matchMedia('(max-width:700px)').matches)$('result-card').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});});
$('print').addEventListener('click',()=>{clearTimeout(timer);render();if(lastResult?.valid&&!lastResult.blocked)window.print();});
$('share').addEventListener('click',async()=>{clearTimeout(timer);render();const input=readInput();const url=new URL(location.href);url.search='';url.hash='calculator';url.searchParams.set('calc','1');for(const key of fields)if(input[key]!==null&&input[key]!==undefined)url.searchParams.set(key,input[key]);try{await navigator.clipboard.writeText(url.href);$('action-status').textContent='Lien copié. Il conserve le produit choisi, le fabricant et vos mesures.';}catch{const text=document.createElement('input');text.value=url.href;text.readOnly=true;text.setAttribute('aria-label','Lien de votre calcul');$('action-status').replaceChildren(document.createTextNode('Copiez ce lien : '),text);text.style.width='100%';text.select();}});
$('solution-options').addEventListener('click',event=>{const button=event.target.closest('[data-solution-id]');if(!button)return;const candidate=lastResult?.alternatives?.find(item=>item.id===button.dataset.solutionId);if(!candidate)return;selectedProductId=candidate.id;selectionNotice='';render();$('solution-options').querySelectorAll('[data-solution-id]').forEach(item=>{if(item.dataset.solutionId===selectedProductId)item.focus({preventScroll:true});});});
restore();syncImages();
