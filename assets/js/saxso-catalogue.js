import {normalizeCatalogueSearch} from './saxso-selection.mjs?v=20261112-saxso-hd2';
import {renderProductVisual, renderMaterialDetail, productThumbnail} from './saxso-product-visual.mjs?v=20261112-saxso-hd2';
import {readSaxsoNetPrices,netPriceLabel} from './saxso-net-prices.mjs?v=20261119-saxso-net1';

import {createSaxsoCheckout} from './saxso-checkout.mjs?v=20261119-saxso-order1';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = normalizeCatalogueSearch;
const number = v => Number(v).toLocaleString('fr-FR', {maximumFractionDigits:3});

export function variantPresentation(variant) {
  const label=String(variant?.label||variant?.reference||'');
  const dimensionMatch=label.match(/(?:\d+(?:[.,]\d+)?\s*[x×]\s*)+\d+(?:[.,]\d+)?(?:\s*(?:cm|mm))?/i);
  const thickness=label.match(/(?:ép\.|épaisseur|sp\.)\s*[\d.,/]+\s*(?:cm|mm)/i)?.[0];
  const format=dimensionMatch?[dimensionMatch[0],thickness].filter(Boolean).join(' · '):label.match(/(?:Mod\.|Module)\s*[^·]+/i)?.[0];
  return {
    finish:String(variant?.finish||variant?.visual?.finish||(dimensionMatch?label.slice(0,dimensionMatch.index).replace(/[·\s]+$/,''):'')),
    format:String(variant?.format||variant?.visual?.format||format||''),
    piece:String(variant?.piece||variant?.visual?.piece||'')
  };
}

export function variantMedia(collection,variant,formatVisual,materialDetail) {
  const media=[];
  const add=(image,group,fallback)=>{
    if(!image?.url||media.some(item=>item.url===image.url&&item.group===group))return;
    media.push({...image,group,label:image.label||fallback,kind:image.kind||'photo'});
  };
  add(variant?.productPhoto||(variant?.visual?.kind!=='illustration'?variant?.visual:null),'product',variant?.label||collection?.name||'Produit');
  add(formatVisual||(variant?.visual?.kind==='illustration'?variant.visual:null),'format',variant?.label||'Format');
  // A catalogue colour board must never be shown as though it were the
  // selected material: wait for its exact native crop when one is specified.
  if(materialDetail||!variant?.materialPhoto?.cropRect)add(materialDetail||variant?.materialPhoto,'material','Matière de référence');
  for(const image of collection?.images||[]) {
    // Small catalogue cutouts remain in the source PDF. An ambience never
    // substitutes for the selected reference, even on the same source page.
    if(collection.id==='desert-light-exterieur' && image.url!==collection.cover?.url) {
      if (variant?.productPhoto?.url?.includes('desert-light-margelle') && image.url.includes('desert-light-profil')) {
        add(image,'product',image.label);
      }
      continue;
    }
    if(Math.max(Number(image.width)||0,Number(image.height)||0)>=800) add(image,'ambience',collection.name+' · Ambiance');
  }
  return media;
}

export function preferredMediaGroup(variant,media) {
  const product=media.find(item=>item.group==='product');
  if(product&&Math.max(Number(product.width)||0,Number(product.height)||0)>=1000)return 'product';
  if(media.some(item=>item.group==='format'))return 'format';
  return 'format';
}

export function nativeImageLayout(width,height,viewportWidth,viewportHeight,zoom=1) {
  width=Number(width);height=Number(height);
  if(!(width>0&&height>0))return {width:0,height:0,scale:1};
  const fit=Math.min(1,Math.max(1,Number(viewportWidth)||1)/width,Math.max(1,Number(viewportHeight)||1)/height);
  const scale=Math.min(1,fit*Math.min(3,Math.max(1,Number(zoom)||1)));
  return {width:Math.round(width*scale),height:Math.round(height*scale),scale};
}

const categories = ['Tout', 'Extérieur', 'Parement', 'Intérieur'];
const terms = [
  {name:'Dalle', definition:'Pièce plate destinée au sol.', query:'dalle'},
  {name:'Lamelle', definition:'Bande de pierre étroite pour habiller un mur.', query:'lamelle'},
  {name:'Margelle', definition:'Pièce de finition posée sur le bord d’un bassin.', query:'margelle'},
  {name:'Marche', definition:'Pièce dimensionnée pour un escalier.', query:'marche'},
  {name:'Opus incertum', definition:'Dallage composé de pièces aux contours irréguliers.', query:'opus incertum'},
  {name:'Opus romain', definition:'Assemblage de dalles rectangulaires et carrées de plusieurs formats.', query:'opus romain'},
  {name:'Parement', definition:'Revêtement en pierre destiné à habiller une paroi.', category:'Parement'},
  {name:'Plinthe', definition:'Bande de finition placée au pied d’un mur.', query:'plinthe'}
];
const collator = new Intl.Collator('fr', {sensitivity:'base', numeric:true});
const searchKey = value => norm(value).replace(/(\d),(?=\d)/g, '$1.').replace(/['’]/g,' ');
const keywords = value => searchKey(value).trim().split(/\s+/).filter(Boolean);
const categoryName = category => category === 'Parement' ? 'Parements' : category;
const money = value => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(value);

let dataPromise;
const loadData = () => dataPromise ||= fetch(new URL('../data/saxso-catalogue.json?v=20261119-saxso-order1', import.meta.url)).then(r => {
  if (!r.ok) throw Error('Le catalogue SAXSO n’a pas pu être chargé.');
  return r.json();
}).catch(e => {dataPromise = null; throw e;});

export async function renderSaxsoCatalogue(root) {
  if (root.dataset.saxsoMounted) return;
  root.dataset.saxsoMounted = 'loading';
  root.classList.add('saxso');
  if (!document.querySelector('[data-saxso-style]')) {
    const style = document.createElement('link'); style.rel='stylesheet';
    style.href = new URL('../css/saxso-catalogue.css?v=20261119-saxso-order1', import.meta.url);
    style.dataset.saxsoStyle = ''; document.head.append(style);
  }
  root.innerHTML = '<p class="sx-loading" role="status">Ouverture du catalogue SAXSO…</p>';
  let data;
  try { data = await loadData(); }
  catch(e) {
    root.innerHTML = '<p class="sx-loading" role="alert">Le catalogue n’a pas pu être chargé. <button type="button" data-sx-retry>Réessayer</button></p>';
    root.querySelector('[data-sx-retry]').onclick = () => {delete root.dataset.saxsoMounted;renderSaxsoCatalogue(root);};
    return;
  }
  if (!root.isConnected) return;
  let netIndex;
  try {
    const response=await fetch(new URL('../data/saxso-net-index.json?v=20261119-saxso-order1',import.meta.url));
    if(!response.ok)throw Error('Index indisponible');
    netIndex=await response.json();
  }catch {netIndex=null;}
  if(!root.isConnected)return;
  let netPrices=null,netEpoch=0;
  const pricedIds=new Set(netIndex?.rows.flatMap(row=>row.variantIds)||[]);
  const variantPrice=v=>netPrices?netPriceLabel(netPrices.byVariant.get(v.id)):pricedIds.has(v.id)?'Prix nets · Accès PRO':'Tarif net sur demande';
  const findVariant = id => {
    for (const c of data.collections) { const v = c.variants.find(v => v.id === id); if (v) return {c,v}; }
  };
  let filter='Tout', search='', pricedOnly=false, active, photoIndex=0, mediaMode='product', currentMedia=[], displayedMedia, viewerZoom=1;
  const triggers=new WeakMap();
  let imageTrigger;
  const spotlight=data.collections.find(c=>c.id==='desert-light-exterieur') || data.collections[0];
  const collections=[...data.collections].sort((a,b)=>collator.compare(a.name,b.name)||collator.compare(a.category,b.category));
  const indexed=new Map(collections.flatMap(c=>c.variants.map(v=>[v.id,searchKey([c.name,c.category,v.reference,v.label,v.piece,v.finish,v.format,v.colour].filter(Boolean).join(' '))])));
  root.innerHTML = `
    <section class="sx-hero" aria-label="Catalogue SAXSO">
      <div class="sx-hero-copy">
        <div class="sx-eyebrow">SAXSO &nbsp; / &nbsp; Catalogue 2026</div>
        <h1>Pierres naturelles<br><em>&amp; parements</em></h1>
        <div class="sx-hero-actions"><button class="sx-button" data-sx-explore>Explorer le catalogue</button><button class="sx-outline" data-sx-lexicon>Lexique A–Z</button><a class="sx-text-link" href="tarifs-pro.html#saxso">Tarif illustré PDF</a></div>
      </div>
      <button class="sx-spotlight" data-sx-spotlight aria-label="Découvrir la collection ${esc(spotlight.name)}">
        <img src="${esc(spotlight.cover?.url)}" alt="" fetchpriority="high">
        <span class="sx-spotlight-copy"><small>À découvrir</small><strong>${esc(spotlight.name)}</strong><span>Voir la collection</span></span>
      </button>
    </section>
    <section id="sx-collections" class="sx-collections" aria-label="Rechercher des pierres">
      <div class="sx-section-heading"><h2>Les collections</h2><label class="sx-search"><span class="sx-sr-only">Rechercher une pierre, une référence ou un format</span><input type="search" data-sx-search placeholder="Pierre, parement, référence ou format…"></label></div>
      <div class="sx-tools"><div class="sx-tabs" role="group" aria-label="Usage">${categories.map(x=>`<button data-sx-filter="${x}" aria-pressed="${x==='Tout'}">${x==='Tout'?'Toutes':categoryName(x)}</button>`).join('')}</div>
      <label class="sx-only"><input type="checkbox" data-sx-priced> Références au tarif</label></div>
      <p class="sx-results" data-sx-results aria-live="polite"></p><div data-sx-grid class="sx-grid"></div>
    </section>
    <section class="sx-net-access" id="sx-tarifs" aria-label="Tarifs et documents">
      <div><div class="sx-eyebrow">Documents professionnels</div><h2>Tarifs et catalogue</h2><p>Tarif rendu – 4 palettes mix. Livraison non déchargée.</p><p data-sx-net-status role="status"></p></div>
      <div class="sx-net-actions"><a class="sx-button" href="tarifs-pro.html#saxso">Tarif illustré PDF</a><button class="sx-outline" type="button" data-sx-net-load>Afficher les prix nets</button><button class="sx-outline" data-sx-pdf>Catalogue général PDF</button></div>
      <details data-sx-net-details hidden><summary>Consulter la grille des prix nets</summary><div class="sx-net-table-wrap"><table class="sx-net-table"><thead><tr><th>Produit et format</th><th>Prix net HT</th></tr></thead><tbody data-sx-net-rows></tbody></table></div></details>
    </section>
    <div class="sx-selection-bar"><div><strong>Mon panier</strong><span data-sx-count>Panier vide</span></div><button class="sx-button" data-sx-cart>Voir le panier</button></div>
    <dialog class="sx-dialog sx-product-dialog" aria-label="Détails de la collection"><div class="sx-product-top"><span>SAXSO · Fiche produit</span><button class="sx-close-text" data-sx-close>Fermer</button></div><div data-sx-detail></div></dialog>
    <dialog class="sx-dialog sx-lex-dialog" aria-labelledby="sx-lex-title"><div class="sx-product-top"><span>Catalogue SAXSO</span><button class="sx-close-text" data-sx-close>Fermer</button></div>
      <div class="sx-lex-body"><h2 id="sx-lex-title">Lexique des pierres et parements</h2><label class="sx-field">Rechercher dans le lexique<input type="search" data-sx-lex-search placeholder="Nom d’une pierre, usage, type de pièce…"></label>
      <h3>Pièces et usages</h3><div class="sx-terms" data-sx-terms></div><h3>Collections de A à Z</h3><div data-sx-lex-list class="sx-lex-list"></div></div></dialog>
    <dialog class="sx-dialog sx-image-dialog" aria-label="Visuel du produit"><div class="sx-viewer-header"><div><strong data-sx-viewer-title></strong><span data-sx-viewer-note></span></div><div class="sx-viewer-tools"><button class="sx-outline" data-sx-viewer-minus aria-label="Réduire le visuel">−</button><output data-sx-viewer-level>1×</output><button class="sx-outline" data-sx-viewer-plus aria-label="Agrandir le visuel">+</button><button class="sx-close" data-sx-close aria-label="Fermer le visuel">×</button></div></div><div class="sx-viewer-stage" data-sx-viewer-stage><img data-sx-full-image alt=""></div></dialog>
    <dialog class="sx-dialog sx-pdf-dialog" aria-label="Catalogue PDF SAXSO en français"><div class="sx-pdf-header"><strong>SAXSO · Catalogue français 2026</strong><a href="${esc(data.pdf)}" download>Télécharger le PDF ↓</a><button class="sx-close" data-sx-close aria-label="Fermer le PDF">×</button></div><iframe title="Catalogue PDF SAXSO français 2026" data-sx-pdf-frame></iframe><p>Si la lecture ne s’affiche pas, <a href="${esc(data.pdf)}" target="_blank" rel="noopener">ouvrir le PDF dans un nouvel onglet →</a>.</p></dialog>`;

  const $ = s => root.querySelector(s);
  const productDialog = $('.sx-product-dialog'), lexDialog = $('.sx-lex-dialog'), imageDialog = $('.sx-image-dialog'), pdfDialog = $('.sx-pdf-dialog');
  function openDialog(dialog, trigger) {triggers.set(dialog,trigger || document.activeElement);dialog.showModal();dialog.scrollTop=0;}
  root.querySelectorAll('[data-sx-close]').forEach(button => button.onclick = () => button.closest('dialog').close());
  root.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', e => {if(e.target === dialog) {const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close', () => {if(dialog===imageDialog)imageTrigger?.focus({preventScroll:true});else triggers.get(dialog)?.focus?.({preventScroll:true});});
  });
  function updateCount({palettes=0, totalHT=0, priced=false, count=0, missing=0}={}) {
    const summary=count ? [`${number(palettes)} palette${palettes>1?'s':''}`, (priced||missing<count) && Number.isFinite(totalHT) ? `${money(totalHT)} HT${missing?' chiffrés':''}` : 'Montant à compléter'].join(' · ') : 'Panier vide';
    $('[data-sx-count]').textContent=summary;
  }
  const checkout=createSaxsoCheckout({root,catalogue:data,netIndex,getPrices:()=>netPrices,onChange:updateCount});
  $('[data-sx-cart]').onclick=e=>checkout.open(e.currentTarget);

  function eligible(c) {
    const query=keywords(search);
    return c.variants.filter(v=>(!pricedOnly||pricedIds.has(v.id))&&query.every(word=>indexed.get(v.id).includes(word)));
  }
  function renderGrid() {
    const results=collections.filter(c=>filter==='Tout'||c.category===filter)
      .map(c=>({c,matches:eligible(c)})).filter(result=>result.matches.length);
    $('[data-sx-results]').textContent=`${results.length} collection${results.length>1?'s':''} · ${results.reduce((n,r)=>n+r.matches.length,0)} références`;
    $('[data-sx-grid]').innerHTML=results.map(({c,matches})=>`
      <button type="button" class="sx-collection-card" data-sx-open="${esc(c.id)}" data-sx-start="${esc(matches[0].id)}">
        <span class="sx-card-photo"><img src="${esc(c.cover?.preview||c.cover?.url)}" alt="" loading="lazy" decoding="async"></span>
        <span class="sx-card-body"><small>${esc(categoryName(c.category))}</small><strong>${esc(c.name)}</strong><span>${matches.length} référence${matches.length>1?'s':''}${search.trim()&&matches.length===1?' · '+esc(matches[0].label):''}</span></span>
      </button>`).join('') || '<div class="sx-empty"><h3>Aucune référence trouvée</h3><p>Essayez un nom de pierre ou un format plus court.</p><button class="sx-outline" data-sx-reset>Effacer les filtres</button></div>';
    root.querySelectorAll('[data-sx-open]').forEach(button=>button.onclick=()=>openCollection(button.dataset.sxOpen,button,button.dataset.sxStart));
    $('[data-sx-reset]')?.addEventListener('click',()=>setSearch('','Tout',false));
  }
  function setSearch(value,category,withPrice) {
    search=value;filter=category;pricedOnly=withPrice;
    $('[data-sx-search]').value=value;$('[data-sx-priced]').checked=pricedOnly;
    root.querySelectorAll('[data-sx-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sxFilter===filter)));
    renderGrid();
  }
  function explore() {
    $('#sx-collections').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }
  root.querySelectorAll('[data-sx-filter]').forEach(b=>b.onclick=()=>setSearch(search,b.dataset.sxFilter,pricedOnly));
  $('[data-sx-search]').oninput=e=>{search=e.target.value;renderGrid();};
  $('[data-sx-priced]').onchange=e=>{pricedOnly=e.target.checked;renderGrid();};
  $('[data-sx-explore]').onclick=explore;
  $('[data-sx-spotlight]').onclick=e=>openCollection(spotlight.id,e.currentTarget);
  function renderLexicon() {
    const query=keywords($('[data-sx-lex-search]').value);
    const matches=text=>query.every(word=>searchKey(text).includes(word));
    const visibleTerms=terms.filter(term=>matches(term.name+' '+term.definition));
    $('[data-sx-terms]').innerHTML=visibleTerms.map(term=>`<button data-sx-term="${esc(term.name)}"><strong>${esc(term.name)}</strong><span>${esc(term.definition)}</span></button>`).join('')||'<p>Aucun terme trouvé.</p>';
    const visible=collections.filter(c=>matches(c.name+' '+categoryName(c.category)));
    $('[data-sx-lex-list]').innerHTML=visible.map(c=>`<button data-sx-lex-collection="${esc(c.id)}"><strong>${esc(c.name)}</strong><span>${esc(categoryName(c.category))}</span></button>`).join('')||'<p>Aucune collection trouvée.</p>';
    root.querySelectorAll('[data-sx-term]').forEach(button=>button.onclick=()=>{
      const term=terms.find(t=>t.name===button.dataset.sxTerm);
      lexDialog.close();setSearch(term.query||'',term.category||'Tout',false);explore();
    });
    root.querySelectorAll('[data-sx-lex-collection]').forEach(button=>button.onclick=()=>{
      lexDialog.close();openCollection(button.dataset.sxLexCollection,$('[data-sx-lexicon]'));
    });
  }
  $('[data-sx-lexicon]').onclick=e=>{renderLexicon();openDialog(lexDialog,e.currentTarget);};
  $('[data-sx-lex-search]').oninput=renderLexicon;

  const selectedVariant=()=>active?.variants.find(v=>v.id===$('[data-sx-variant]')?.value);
  const mediaGroupLabels={product:'Produit',format:'Format',material:'Matière',ambience:'Ambiances'};
  const formatPromises=new Map(),materialPromises=new Map(),thumbnailUrls=new Map();let mediaEpoch=0,variantThumbObserver;
  const getFormatVisual=variant=>{if(!formatPromises.has(variant.id))formatPromises.set(variant.id,renderProductVisual(variant,variant.materialPhoto).catch(error=>{formatPromises.delete(variant.id);throw error;}));return formatPromises.get(variant.id);};
  const mediaKindLabel=media=>media?.kind==='illustration'?'Illustration du format':media?.group==='material'?(media.label||'Matière de référence'):media?.group==='ambience'?(media.label||'Vue d’ambiance'):'Photographie du produit';
  const activeMedia=()=>currentMedia.filter(item=>item.group===mediaMode);
  const getMaterialDetail=photo=>{const key=photo.url+'|'+(photo.cropRect||[]).join(',');if(!materialPromises.has(key))materialPromises.set(key,renderMaterialDetail(photo).catch(error=>{materialPromises.delete(key);throw error;}));return materialPromises.get(key);};
  function setMediaMode(mode) {
    mediaMode=mode;photoIndex=0;
    root.querySelectorAll('[data-sx-media-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sxMediaMode===mode)));
    showPhoto(0);
  }
  function showPhoto(index) {
    const photos=activeMedia();
    photoIndex=photos.length?(index+photos.length)%photos.length:0;
    displayedMedia=photos[photoIndex];
    const image=$('[data-sx-detail-image]'),empty=$('[data-sx-media-empty]'),zoom=$('[data-sx-zoom]');
    image.hidden=!displayedMedia;empty.hidden=!!displayedMedia;zoom.disabled=!displayedMedia;
    if(displayedMedia){
      image.src=displayedMedia.preview||displayedMedia.url;image.alt=displayedMedia.label;
      image.style.maxWidth=Number(displayedMedia.width)>0?Math.min(Number(displayedMedia.width),10000)+'px':'';
      $('[data-sx-media-caption]').textContent=mediaKindLabel(displayedMedia);
      const note=displayedMedia.note||displayedMedia.disclaimer;
      $('[data-sx-photo-note]').textContent=note||(displayedMedia.kind==='illustration'?'Illustration du format, réalisée avec une matière photographique de référence. La teinte et la finition exactes se vérifient sur un échantillon.':displayedMedia.group==='ambience'?'Vue d’ambiance de la collection.':'Photographie de référence. Les nuances naturelles peuvent varier d’une pièce à l’autre.');
    }else{
      image.removeAttribute('src');$('[data-sx-media-caption]').textContent='';
      empty.textContent=mediaMode==='material'?'Préparation du détail matière…':mediaMode==='format'?'Préparation du visuel du format…':'Photographie non disponible pour cette référence';
      $('[data-sx-photo-note]').textContent=mediaMode==='material'?'Le détail reprend uniquement la zone de matière correspondant à la référence.':'Les photographies de collection restent accessibles dans Ambiances.';
    }
    $('[data-sx-photo-counter]').closest('.sx-photo-nav').hidden=photos.length<2;
    $('[data-sx-media-thumbs]').hidden=photos.length<2;
    $('[data-sx-photo-counter]').textContent=photos.length?`${photoIndex+1} / ${photos.length}`:'';
    $('[data-sx-prev]').disabled=photos.length<2;$('[data-sx-next]').disabled=photos.length<2;
    $('[data-sx-media-thumbs]').innerHTML=photos.map((photo,i)=>`<button type="button" data-sx-media-index="${i}" aria-pressed="${i===photoIndex}" aria-label="Afficher ${esc(photo.label)} · visuel ${i+1}"><img src="${esc(photo.preview||photo.url)}" alt="" loading="lazy" decoding="async"></button>`).join('');
    root.querySelectorAll('[data-sx-media-index]').forEach(button=>button.onclick=()=>showPhoto(Number(button.dataset.sxMediaIndex)));
  }
  function renderMediaModes() {
    const modes=['product','format','material','ambience'].filter(group=>group==='format'||group==='material'&&selectedVariant()?.materialPhoto?.url||currentMedia.some(item=>item.group===group));
    $('[data-sx-media-modes]').innerHTML=modes.map(group=>`<button type="button" data-sx-media-mode="${group}" aria-pressed="${group===mediaMode}">${mediaGroupLabels[group]}</button>`).join('');
    root.querySelectorAll('[data-sx-media-mode]').forEach(button=>button.onclick=()=>setMediaMode(button.dataset.sxMediaMode));
  }
  function renderMedia(variant) {
    const epoch=++mediaEpoch;
    let formatVisual,materialDetail;
    currentMedia=variantMedia(active,variant);mediaMode=preferredMediaGroup(variant,currentMedia);
    const redraw=()=>{
      if(epoch!==mediaEpoch||!productDialog.open)return;
      currentMedia=variantMedia(active,variant,formatVisual,materialDetail);
      renderMediaModes();showPhoto(photoIndex);
    };
    renderMediaModes();showPhoto(0);
    if(!currentMedia.some(item=>item.group==='format')) {
      getFormatVisual(variant).then(visual=>{
        if(epoch!==mediaEpoch||!productDialog.open)return;
        formatVisual=visual;thumbnailUrls.set(variant.id,visual.preview||visual.url);redraw();
      }).catch(()=>{if(epoch===mediaEpoch&&mediaMode==='format')$('[data-sx-media-empty]').textContent='Le visuel du format n’a pas pu être chargé.';});
    }
    if(variant.materialPhoto?.cropRect){
      getMaterialDetail(variant.materialPhoto).then(photo=>{
        if(epoch!==mediaEpoch||!productDialog.open)return;
        if(!photo?.cropApplied){if(mediaMode==='material')$('[data-sx-media-empty]').textContent='Le détail matière n’a pas pu être chargé.';return;}
        materialDetail=photo;redraw();
      }).catch(()=>{if(epoch===mediaEpoch&&mediaMode==='material')$('[data-sx-media-empty]').textContent='Le détail matière n’a pas pu être chargé.';});
    }
  }
  function matchingVariants() {
    const finish=$('[data-sx-finish-filter]').value,format=$('[data-sx-format-filter]').value;
    return active.variants.filter(v=>{
      const info=variantPresentation(v);
      return (finish==='*'||info.finish===finish)&&(format==='*'||info.format===format);
    });
  }
  function renderVariantChoices() {
    const variants=matchingVariants(),selected=$('[data-sx-variant]').value,grid=$('[data-sx-variant-choices]'),scrollTop=grid.scrollTop;
    variantThumbObserver?.disconnect();
    $('[data-sx-choice-count]').textContent=`${variants.length} référence${variants.length>1?'s':''}`;
    grid.innerHTML=variants.map(v=>{
      const info=variantPresentation(v),initial=v.productPhoto?.preview||v.productPhoto?.url||thumbnailUrls.get(v.id)||v.materialPhoto?.preview||v.materialPhoto?.url||productThumbnail(v);
      return `<button type="button" class="sx-variant-choice" data-sx-choice="${esc(v.id)}" aria-pressed="${v.id===selected}" aria-label="Choisir ${esc(v.label)}"><img src="${esc(initial)}" data-sx-format-thumb="${esc(v.id)}" alt="" loading="lazy" decoding="async"><strong>${esc(info.format||v.label)}</strong><span>${esc([info.piece,info.finish].filter(Boolean).join(' · ')||v.label)}</span><span class="sx-net-price" data-sx-price-id="${esc(v.id)}">${esc(variantPrice(v))}</span></button>`;
    }).join('')||'<p class="sx-choice-empty">Aucune référence pour cette combinaison.</p>';
    grid.scrollTop=scrollTop;
    root.querySelectorAll('[data-sx-choice]').forEach(button=>button.onclick=()=>{$('[data-sx-variant]').value=button.dataset.sxChoice;updateVariant();});
    const loadThumb=image=>{
      const id=image.dataset.sxFormatThumb,v=active.variants.find(v=>v.id===id);if(!v||v.productPhoto?.url||thumbnailUrls.has(id))return;
      getFormatVisual(v).then(visual=>{const url=visual.preview||visual.url;thumbnailUrls.set(id,url);if(image.isConnected&&image.dataset.sxFormatThumb===id&&!v.productPhoto?.url)image.src=url;}).catch(()=>{});
    };
    if(typeof IntersectionObserver!=='undefined') {
      variantThumbObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){variantThumbObserver.unobserve(entry.target);loadThumb(entry.target);}},{root:grid,rootMargin:'80px'});
      grid.querySelectorAll('[data-sx-format-thumb]').forEach(image=>{if(!thumbnailUrls.has(image.dataset.sxFormatThumb))variantThumbObserver.observe(image);});
    }else grid.querySelectorAll('[data-sx-format-thumb]').forEach(loadThumb);
  }
  function updateVariant() {
    const v=selectedVariant();if(!v)return;
    renderMedia(v);renderVariantChoices();
    const packName=v.packType==='caisse'?'caisse palettisée':'palette';
    const pack = v.perPallet>0 ? `${number(v.perPallet)} ${esc(v.unit)} / ${packName}` : 'Conditionnement à confirmer';
    const weight = v.weightPerUnit>0 ? ` · ${number(v.weightPerUnit)} kg/${esc(v.unit)}` : '';
    $('[data-sx-variant-info]').innerHTML=`<strong>${esc(v.label)}</strong>
      <span class="sx-net-product-price" data-sx-price-id="${esc(v.id)}">${esc(variantPrice(v))}</span><span>${pack}${weight}</span>`;
    const source=$('[data-sx-source]');
    source.hidden=(v.sourceDocument==='net-2026'||active.sourceDocument==='net-2026'||!v.page);
    source.dataset.sxSource=v.page||'';
    source.textContent=source.hidden?'':`Catalogue général · page ${v.page}`;
    $('[data-sx-add-status]').textContent='';
  }
  function resizeViewer() {
    const image=$('[data-sx-full-image]'),stage=$('[data-sx-viewer-stage]');
    if(!image.naturalWidth)return;
    const size=nativeImageLayout(image.naturalWidth,image.naturalHeight,stage.clientWidth-48,stage.clientHeight-48,viewerZoom);
    image.style.width=size.width+'px';image.style.height=size.height+'px';
    $('[data-sx-viewer-level]').textContent=number(viewerZoom)+'×';
    $('[data-sx-viewer-minus]').disabled=viewerZoom<=1;
    $('[data-sx-viewer-plus]').disabled=viewerZoom>=3||size.scale>=1;
    $('[data-sx-viewer-note]').textContent=mediaKindLabel(displayedMedia)+(size.scale>=1?' · Taille native':'');
  }
  function openImage(trigger) {
    if(!displayedMedia)return;
    imageTrigger=trigger;viewerZoom=1;
    const image=$('[data-sx-full-image]');image.onload=resizeViewer;image.src=displayedMedia.url;image.alt=displayedMedia.label;
    $('[data-sx-viewer-title]').textContent=displayedMedia.label;
    imageDialog.setAttribute('aria-label',displayedMedia.label);imageDialog.showModal();resizeViewer();
  }
  $('[data-sx-viewer-minus]').onclick=()=>{viewerZoom=Math.max(1,viewerZoom-.5);resizeViewer();};
  $('[data-sx-viewer-plus]').onclick=()=>{viewerZoom=Math.min(3,viewerZoom+.5);resizeViewer();};
  imageDialog.addEventListener('close',()=>{$('[data-sx-full-image]').removeAttribute('src');});
  function openCollection(id,trigger,startId) {
    active=data.collections.find(c=>c.id===id);if(!active)return;
    const options=items=>[...new Set(items.filter(Boolean))].sort(collator.compare).map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
    const finishOptions=options(active.variants.map(v=>variantPresentation(v).finish));
    $('[data-sx-detail]').innerHTML=`<div class="sx-detail-grid">
      <div class="sx-detail-gallery">
        <div class="sx-media-modes" data-sx-media-modes role="group" aria-label="Type de visuel"></div>
        <button class="sx-detail-zoom" data-sx-zoom aria-label="Agrandir le visuel"><img data-sx-detail-image alt=""><span class="sx-media-empty" data-sx-media-empty></span><span class="sx-image-action">Agrandir</span></button>
        <div class="sx-media-meta"><span data-sx-media-caption></span><div class="sx-photo-nav"><button class="sx-outline" data-sx-prev aria-label="Visuel précédent">‹</button><span data-sx-photo-counter></span><button class="sx-outline" data-sx-next aria-label="Visuel suivant">›</button></div></div>
        <div class="sx-media-thumbs" data-sx-media-thumbs aria-label="Vignettes"></div><p class="sx-photo-note" data-sx-photo-note></p>
      </div>
      <div class="sx-detail-copy"><div class="sx-eyebrow">${esc(categoryName(active.category))}</div><h2>${esc(active.name)}</h2>
        <div class="sx-choice-filters"><label>Finition<select data-sx-finish-filter><option value="*">Toutes les finitions</option>${finishOptions}</select></label><label>Format<select data-sx-format-filter></select></label></div>
        <label class="sx-field sx-reference-select">Référence<select data-sx-variant></select></label>
        <div class="sx-variant-info" data-sx-variant-info></div>
        <div class="sx-purchase"><label for="sx-pallets">Palettes</label><div class="sx-purchase-row"><input type="number" min="1" max="999" step="1" id="sx-pallets" data-sx-quantity value="1" inputmode="numeric"><button class="sx-button" data-sx-add>Ajouter au panier</button></div>
        <small>Minimum de commande de 4 palettes, collections panachables.</small>
        <p role="status" data-sx-add-status></p><button type="button" class="sx-text-link" data-sx-product-cart>Voir mon panier</button></div>
        <details class="sx-choice-disclosure"><summary>Comparer les références en images <span data-sx-choice-count></span></summary><div class="sx-variant-choices" data-sx-variant-choices></div></details>
        <button class="sx-text-link" data-sx-source></button>
      </div></div>`;
    const finish=$('[data-sx-finish-filter]'),format=$('[data-sx-format-filter]'),variant=$('[data-sx-variant]');
    function updateFormats() {
      const previous=format.value;
      const candidates=active.variants.filter(v=>finish.value==='*'||variantPresentation(v).finish===finish.value);
      format.innerHTML='<option value="*">Tous les formats</option>'+options(candidates.map(v=>variantPresentation(v).format));
      if([...format.options].some(o=>o.value===previous)) format.value=previous;
    }
    function updateOptions(preferred) {
      const available=matchingVariants();
      variant.innerHTML=available.map(v=>`<option value="${esc(v.id)}">${esc(v.label)}</option>`).join('');
      variant.value=available.some(v=>v.id===preferred)?preferred:available[0]?.id||'';
      updateVariant();
    }
    finish.onchange=()=>{updateFormats();updateOptions(variant.value);};
    format.onchange=()=>updateOptions(variant.value);
    variant.onchange=updateVariant;
    $('[data-sx-prev]').onclick=()=>showPhoto(photoIndex-1);
    $('[data-sx-next]').onclick=()=>showPhoto(photoIndex+1);
    $('[data-sx-zoom]').onclick=e=>openImage(e.currentTarget);
    $('[data-sx-source]').onclick=e=>openPdf(Number(e.currentTarget.dataset.sxSource),e.currentTarget);
    $('[data-sx-product-cart]').onclick=()=>{productDialog.close();checkout.open($('[data-sx-cart]'));};
    $('[data-sx-add]').onclick=()=>{
      const input=$('[data-sx-quantity]');
      if(!input.reportValidity()||!Number.isInteger(input.valueAsNumber)||input.valueAsNumber<1){
        $('[data-sx-add-status]').textContent='Choisissez un nombre entier de palettes.';return;
      }
      const result=checkout.add(variant.value,input.valueAsNumber);
      $('[data-sx-add-status]').textContent=result.message||'Palettes ajoutées au panier.';
    };
    openDialog(productDialog,trigger);
    updateFormats();updateOptions(startId);
  }
  function openPdf(page=1,trigger) {
    $('[data-sx-pdf-frame]').src=data.pdf+`#page=${page}&view=FitH`;
    openDialog(pdfDialog,trigger);
  }
  root.querySelectorAll('[data-sx-pdf]').forEach(b=>b.onclick=e=>openPdf(1,e.currentTarget));
  function refreshPrices(){
    checkout.refresh();
    root.querySelectorAll('[data-sx-price-id]').forEach(element=>{
      const found=findVariant(element.dataset.sxPriceId);if(found)element.textContent=variantPrice(found.v);
    });
    $('[data-sx-net-details]').hidden=!netPrices;
    $('[data-sx-net-rows]').innerHTML=netPrices?netPrices.rows.map(row=>`<tr><td>${esc(row.label)}</td><td>${esc(netPriceLabel(row))}</td></tr>`).join(''):'';
  }
  async function loadPrices(){
    const epoch=++netEpoch,button=$('[data-sx-net-load]');
    netPrices=null;refreshPrices();button.disabled=true;
    $('[data-sx-net-status]').textContent='Vérification de votre accès et chargement des prix nets…';
    try{
      if(!netIndex)throw Error('La grille est momentanément indisponible. Rechargez la page ou consultez le tarif PDF dans l’Accès PRO.');
      const loaded=await readSaxsoNetPrices(netIndex);
      if(epoch!==netEpoch||!root.isConnected)return;
      netPrices=loaded;refreshPrices();
      $('[data-sx-net-status]').textContent='Prix nets HT affichés sur les références correspondantes. Les autres produits restent sur demande.';
      button.textContent='Actualiser les prix nets';
    }catch(error){if(epoch===netEpoch&&root.isConnected)$('[data-sx-net-status]').textContent=/accès PRO a expiré/.test(error.message)?'Connectez-vous à l’Accès PRO avec votre code LRF pour consulter les prix nets SAXSO.':error.message;}
    finally{if(epoch===netEpoch&&root.isConnected)button.disabled=false;}
  }
  $('[data-sx-net-load]').onclick=loadPrices;
  window.addEventListener('lrf-pro-session-changed',()=>{
    ++netEpoch;netPrices=null;if(!root.isConnected)return;
    checkout.resetSession();
    refreshPrices();$('[data-sx-net-load]').disabled=false;
    $('[data-sx-net-status]').textContent='Votre session a changé. Affichez à nouveau les prix nets pour vérifier votre accès.';
  });
  renderGrid();updateCount(checkout.summary());root.dataset.saxsoMounted='ready';
  loadPrices();
  const requested=new URLSearchParams(location.search).get('collection');
  const requestedId=requested==='desert-light'?'desert-light-exterieur':requested;
  if(requestedId&&data.collections.some(c=>c.id===requestedId))openCollection(requestedId);
}

const root=typeof document==='undefined'?null:document.querySelector('[data-saxso-catalogue]');
if(root)renderSaxsoCatalogue(root);
