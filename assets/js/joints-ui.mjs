import {COUNTRIES,calculate,matchesSearch,resolveSelection,numberValue}from'./joints-core.mjs?v=20261107-joints1';
const $=id=>document.getElementById(id),form=$('project-form');
const projectKey='lrf-joints-project-v1',favoriteKey='lrf-joints-favorite-v1';
const fields=['area','length','width','thickness','joint','packageKg','margin','manualGrams'];
const fmt=(n,d=2)=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:d});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const items=values=>(values||[]).map(v=>`<li>${esc(v)}</li>`).join('');
const read=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
const write=(key,value)=>{try{value===null?localStorage.removeItem(key):localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
const image=(path,alt)=>`<img src="${esc(path)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
const countryLabel=id=>COUNTRIES.find(c=>c.id===id)?.label||id;
const smoothTo=element=>{element.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});};
let BRANDS=[],country='fr',brand=null,product=null,favorite=null,entered=false,lastResult=null,timer;

function bindImages(root){
  root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;const box=img.parentElement;if(box){const text=document.createElement('span');text.className='image-unavailable';text.textContent='Visuel indisponible';box.append(text);}}, {once:true}));
}
function renderBrands(){
  const visible=BRANDS.filter(b=>b.country===country&&matchesSearch(b.name,$('brand-search').value));
  $('brands-status').textContent=visible.length?`${visible.length} fabricants · catalogue ${countryLabel(country)}`:'Aucun fabricant ne correspond à votre recherche.';
  $('brand-grid').innerHTML=visible.map(b=>`<button type="button" class="brand-card${brand?.id===b.id?' selected':''}" data-brand-id="${esc(b.id)}" aria-pressed="${brand?.id===b.id}"><span class="brand-image">${image(b.logoPath,b.name)}</span><strong>${esc(b.name)}</strong><small>${b.products.length} référence${b.products.length>1?'s':''}</small>${favorite?.brand===b.id?'<span class="brand-favorite" aria-label="Favori">★</span>':''}</button>`).join('');
  $('favorite-shortcut').hidden=!favorite;
  $('start-calculator').disabled=!brand;
  $('start-calculator').innerHTML=brand?`Continuer avec ${esc(brand.name)} <span aria-hidden="true">→</span>`:'Choisissez un fabricant <span aria-hidden="true">→</span>';
  bindImages($('brand-grid'));
}
function renderIdentity(){
  if(!brand)return;
  $('selected-brand-identity').innerHTML=`${image(brand.logoPath,brand.name)}<div><span class="small-label">VOTRE FABRICANT · ${esc(countryLabel(country))}</span><strong>${esc(brand.name)}</strong></div>`;
  $('favorite-toggle').textContent=favorite?.brand===brand.id?'★ Mon fabricant favori':'☆ Mémoriser ce fabricant';
  $('favorite-toggle').setAttribute('aria-pressed',String(favorite?.brand===brand.id));
  bindImages($('selected-brand-identity'));
}
function renderProducts(){
  if(!brand)return;
  const query=$('product-search').value,kind=$('kind-filter').value;
  const visible=brand.products.filter(p=>(kind==='all'||p.kind===kind)&&matchesSearch(p.name+' '+p.description,query));
  $('product-count').textContent=`${visible.length} référence${visible.length>1?'s':''} · ${brand.name} · ${countryLabel(country)}`;
  $('product-grid').innerHTML=visible.map(p=>`<button type="button" class="joint-product-card" data-product-id="${esc(p.id)}" aria-pressed="${product?.id===p.id}"><span class="joint-product-image">${image(p.imagePath,p.name+' — visuel fabricant')}</span><span class="product-kind">${p.kind==='epoxy'?'Joint époxy':'Joint ciment / résine-ciment'}</span><strong>${esc(p.name)}</strong><span class="product-description">${esc(p.description)}</span><span class="product-range">Joints : ${fmt(p.jointMin)} à ${fmt(p.jointMax)} mm<br>${p.packages.map(n=>fmt(n)+' kg').join(' · ')}</span><span class="product-picked">${product?.id===p.id?'✓ Référence sélectionnée':'Choisir ce joint →'}</span></button>`).join('')||'<p class="empty-products">Aucune référence ne correspond. Modifiez votre recherche ou le type de joint.</p>';
  bindImages($('product-grid'));
}
function input(){
  const data=Object.fromEntries(new FormData(form));
  return {...data,country,brand:brand?.id||'',productId:product?.id||''};
}
function save(){
  if(!product)return;
  write(projectKey,input());
  if(favorite?.brand===brand.id){const next={country,brand:brand.id,productId:product.id};if(write(favoriteKey,next))favorite=next;}
}
function sourceLinks(){
  $('technical-sources').innerHTML=(brand?.products||[]).map(p=>`<li><a href="${esc(p.technicalUrl)}" target="_blank" rel="noopener noreferrer">${esc(brand.name+' — '+p.name)} · fiche technique ↗</a><br>${esc(p.coefficientNote)}</li>`).join('');
}
function setProduct(next,{restore=null,scroll=false}={}){
  product=next||null;
  $('dimensions-panel').hidden=!product;
  if(product){
    $('packageKg').innerHTML=product.packages.map(n=>`<option value="${n}">${product.kind==='epoxy'?'Kit':'Sac / boîte'} de ${fmt(n)} kg</option>`).join('');
    $('joint-range').textContent=`Plage de la référence : ${fmt(product.jointMin)} à ${fmt(product.jointMax)} mm. 0,5 mm = un demi-millimètre.`;
    const known=Number.isFinite(product.coefficient)&&product.coefficient>0;
    const manufacturer=form.querySelector('input[name="method"][value="manufacturer"]');
    manufacturer.disabled=!known;
    $('manufacturer-method-label').textContent=known?'Méthode du fabricant':'Méthode automatique non documentée — saisir les g/m²';
    form.elements.method.value=known?'manufacturer':'manual';
    $('manualGrams').value='';
    $('margin').value=product.consumptionIncludesWaste?'0':'10';
    $('margin-help').textContent=product.consumptionIncludesWaste?'La méthode fabricant inclut déjà des déchets. Réserve complémentaire facultative.':'Ajoutée séparément pour les pertes de mise en œuvre.';
    if(restore){
      for(const key of fields){
        if(restore[key]==null||typeof restore[key]==='object')continue;
        const value=String(restore[key]).slice(0,50),control=$(key);
        if(control.tagName==='SELECT'){if([...control.options].some(o=>o.value===value))control.value=value;}else control.value=value;
      }
      if(restore.method==='manual'||(known&&restore.method==='manufacturer'))form.elements.method.value=restore.method;
    }
  }
  renderProducts();render();
  if(scroll&&product){$('dimensions-title').tabIndex=-1;$('dimensions-title').focus({preventScroll:true});smoothTo($('dimensions-panel'));}
}
function render(){
  clearTimeout(timer);
  if(!entered)return;
  $('print').disabled=true;$('share').disabled=!product;
  if(!product){lastResult=null;$('status-label').textContent='Choix du produit';$('result-body').innerHTML='<div class="result-block"><h3>Quel joint utilisez-vous ?</h3><p>Sélectionnez sa référence pour retrouver ses caractéristiques et calculer vos sacs.</p></div>';return;}
  const data=input(),r=calculate(data,BRANDS);lastResult=r;
  $('manual-field').hidden=data.method!=='manual';
  $('margin-help').textContent=data.method==='manual'?'Réserve ajoutée à votre consommation saisie.':product.consumptionIncludesWaste?'La méthode fabricant inclut déjà des déchets. Réserve complémentaire facultative.':'Ajoutée séparément pour les pertes de mise en œuvre.';
  for(const key of fields){$(key).removeAttribute('aria-invalid');}
  for(const key of ['area','length','width','thickness','joint'])if(numberValue(data[key])===null||numberValue(data[key])<=0)$(key).setAttribute('aria-invalid','true');
  if(data.method==='manual'&&(numberValue(data.manualGrams)===null||numberValue(data.manualGrams)<=0))$('manualGrams').setAttribute('aria-invalid','true');
  const identity=`<div class="joint-selected-product">${image(product.imagePath,product.name)}<div><span class="small-label">${esc(brand.name)} · ${esc(countryLabel(country))}</span><h3>${esc(product.name)}</h3><p>${product.kind==='epoxy'?'Kit époxy A + B':'Poudre de joint ciment / résine-ciment'}</p></div></div><a class="result-source" href="${esc(product.technicalUrl)}" target="_blank" rel="noopener noreferrer">Ouvrir la fiche fabricant ↗</a>`;
  if(!r.valid||r.blocked){
    $('status-label').textContent=r.blocked?'Largeur à vérifier':'Saisie à compléter';
    $('result-body').innerHTML=identity+`<div class="result-block"><h3>${r.blocked?'Vérifiez la largeur du joint.':'Précisons votre estimation.'}</h3><ul>${items(r.blocked?r.blocks:r.errors)}</ul></div>`;
  }else{
    $('status-label').textContent='Calcul en direct';$('print').disabled=false;
    const noun=product.kind==='epoxy'?'kit':'sac / boîte';
    const base=r.manual?'Consommation saisie':product.consumptionIncludesWaste?'Besoin selon tableau fabricant':'Besoin théorique hors réserve';
    const formula=r.manual?`${fmt(r.gramsM2,3)} g/m² × ${fmt(r.area)} m² ÷ 1 000 = ${fmt(r.netKg,3)} kg.`:`[(${fmt(r.length*10)} + ${fmt(r.width*10)}) ÷ (${fmt(r.length*10)} × ${fmt(r.width*10)})] × ${fmt(r.thickness)} × ${fmt(r.joint)} × ${fmt(product.coefficient,4)} × ${fmt(r.area)} = ${fmt(r.netKg,3)} kg.`;
    $('result-body').innerHTML=`<div class="bag-number"><strong>${fmt(r.units,0)}</strong><span>${product.kind==='epoxy'?(r.units===1?'kit':'kits'):(r.units===1?'sac / boîte':'sacs / boîtes')}</span></div><p class="bag-caption">de ${fmt(r.packageKg)} kg · ${fmt(r.purchasedKg)} kg à prévoir</p>${identity}<dl class="result-metrics"><div><dt>${base}</dt><dd>${fmt(r.netKg,2)} <small>kg</small></dd></div><div><dt>Réserve de ${fmt(r.margin,0)} %</dt><dd>+ ${fmt(r.reserveKg,2)} <small>kg</small></dd></div><div><dt>Besoin avec réserve</dt><dd>${fmt(r.totalKg,2)} <small>kg</small></dd></div><div><dt>Consommation de base</dt><dd>${fmt(r.gramsM2,1)} <small>g/m²</small></dd></div></dl><p class="bag-caption">${fmt(r.area)} m² · carreaux ${fmt(r.length)} × ${fmt(r.width)} cm<br>Épaisseur ${fmt(r.thickness)} mm · joint ${fmt(r.joint)} mm</p>${r.warnings.length?`<p class="notice">${r.warnings.map(esc).join('<br>')}</p>`:''}<details class="calculation-details" id="calculation-details"><summary>Voir le détail du calcul</summary><p class="formula">${esc(formula)}</p><p>${r.manual?'La consommation saisie remplace la formule pour cette configuration.':esc(product.coefficientNote)}</p><p>Avec ${fmt(r.margin)} % de réserve : ${fmt(r.totalKg,3)} kg.<br>${fmt(r.totalKg,3)} ÷ ${fmt(r.packageKg)} kg/${noun} → ${r.units} ${r.units>1?'unités':'unité'}.<br>L’arrondi au conditionnement ajoute ${fmt(r.surplusKg,3)} kg au besoin avec réserve.</p></details>${product.notes?.length?`<details class="calculation-details"><summary>Les précisions de cette référence</summary><ul>${items(product.notes)}</ul></details>`:''}`;
  }
  bindImages($('result-body'));save();
}
function enter({remember=false,scroll=true,restore=null}={}){
  if(!brand)return;
  if(remember){const next={country,brand:brand.id,productId:product?.id||''};if(write(favoriteKey,next))favorite=next;else $('action-status').textContent='La mémorisation est bloquée dans ce navigateur. Vous pouvez continuer votre calcul.';}
  entered=true;$('manufacturer-choice').hidden=true;$('selected-manufacturer').hidden=false;$('calculator').hidden=false;$('sources-panel').hidden=false;
  $('product-search').value='';$('kind-filter').value='all';renderIdentity();sourceLinks();setProduct(product,{restore});
  if(scroll){$('selected-manufacturer').tabIndex=-1;$('selected-manufacturer').focus({preventScroll:true});smoothTo($('selected-manufacturer'));}
}
function restoreState(){
  const storedFavorite=read(favoriteKey);favorite=resolveSelection(storedFavorite,BRANDS)?storedFavorite:null;
  const query=new URLSearchParams(location.search),shared=query.get('calc')==='1',saved=shared?Object.fromEntries(query):read(projectKey);
  const selection=resolveSelection(shared?saved:favorite,BRANDS);
  if(selection){country=selection.country;brand=selection.brand;product=selection.product;
    const exact=resolveSelection(saved,BRANDS);
    if(exact&&exact.brand.id===brand.id&&(!product||exact.product?.id===product.id)){product=exact.product;}
    document.querySelector(`input[name="catalogue-country"][value="${country}"]`).checked=true;
    enter({scroll:false,restore:exact?.product?.id===product?.id?saved:null});
  }else if(shared)$('brands-status').textContent='La référence de ce lien n’est plus disponible. Choisissez un fabricant.';
  renderBrands();
}
async function load(){
  try{({BRANDS}=await import('./joints-catalog.mjs?v=20261107-joints1'));if(!Array.isArray(BRANDS)||!BRANDS.length)throw Error('Empty catalogue');$('load-error').hidden=true;restoreState();}
  catch{$('load-error').hidden=false;$('brands-status').textContent='Catalogue indisponible pour le moment.';}
}
$('retry-load').addEventListener('click',()=>location.reload());
$('brand-grid').addEventListener('click',event=>{const button=event.target.closest('[data-brand-id]');if(!button)return;brand=BRANDS.find(b=>b.id===button.dataset.brandId&&b.country===country)||null;product=null;renderBrands();});
document.querySelectorAll('input[name="catalogue-country"]').forEach(control=>control.addEventListener('change',()=>{country=control.value;brand=null;product=null;$('brand-search').value='';renderBrands();}));
$('brand-search').addEventListener('input',renderBrands);
$('start-calculator').addEventListener('click',()=>{if(!$('remember-brand').checked&&favorite?.brand===brand?.id){if(write(favoriteKey,null))favorite=null;}enter({remember:$('remember-brand').checked});});
$('favorite-shortcut').addEventListener('click',()=>{const next=resolveSelection(favorite,BRANDS);if(next){country=next.country;brand=next.brand;product=next.product;const saved=read(projectKey);enter({restore:saved?.productId===product?.id?saved:null});}});
$('favorite-toggle').addEventListener('click',()=>{const next=favorite?.brand===brand.id?null:{country,brand:brand.id,productId:product?.id||''};if(write(favoriteKey,next)){favorite=next;renderIdentity();$('action-status').textContent=next?'Choix mémorisé sur cet appareil pour votre prochaine visite.':'Favori retiré.';}else $('action-status').textContent='La mémorisation est bloquée dans ce navigateur.';});
$('change-manufacturer').addEventListener('click',()=>{entered=false;$('manufacturer-choice').hidden=false;$('selected-manufacturer').hidden=true;$('calculator').hidden=true;$('sources-panel').hidden=true;document.querySelector(`input[name="catalogue-country"][value="${country}"]`).checked=true;$('brand-search').value='';$('remember-brand').checked=true;renderBrands();smoothTo($('manufacturer-choice'));});
$('product-grid').addEventListener('click',event=>{const button=event.target.closest('[data-product-id]');if(!button)return;const next=brand.products.find(p=>p.id===button.dataset.productId);if(next?.id===product?.id){smoothTo($('dimensions-panel'));return;}if(next)setProduct(next,{scroll:matchMedia('(max-width:800px)').matches});});
$('product-search').addEventListener('input',renderProducts);$('kind-filter').addEventListener('change',renderProducts);
form.addEventListener('input',event=>{if(event.target.matches('#product-search,#kind-filter'))return;clearTimeout(timer);$('action-status').textContent='';timer=setTimeout(render,220);});
form.addEventListener('change',event=>{if(!event.target.matches('#product-search,#kind-filter'))render();});
form.addEventListener('submit',event=>{event.preventDefault();render();if(product&&matchMedia('(max-width:800px)').matches)smoothTo($('result-card'));});
$('print').addEventListener('click',()=>{render();if(lastResult?.valid&&!lastResult.blocked){$('result-body').querySelectorAll('details').forEach(d=>d.open=true);window.print();}});
$('share').addEventListener('click',async()=>{render();if(!product)return;const url=new URL(location.href);url.search='';url.hash='calculator';url.searchParams.set('calc','1');for(const [key,value]of Object.entries(input()))if(['country','brand','productId','method',...fields].includes(key))url.searchParams.set(key,value);try{await navigator.clipboard.writeText(url.href);$('action-status').textContent='Lien copié avec la référence, le pays et vos mesures.';}catch{const field=document.createElement('input');field.value=url.href;field.readOnly=true;field.style.width='100%';field.setAttribute('aria-label','Lien de votre calcul');$('action-status').replaceChildren(document.createTextNode('Copiez ce lien : '),field);field.select();}});
load();
