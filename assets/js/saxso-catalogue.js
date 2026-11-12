import {STORAGE_KEY, normalizeCatalogueSearch, quantity, restoreSelection, palletEstimate, buildQuote} from './saxso-selection.mjs?v=20261112-saxso-hd2';
import {renderProductVisual, renderMaterialDetail, productThumbnail} from './saxso-product-visual.mjs?v=20261112-saxso-hd2';

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

let dataPromise;
const loadData = () => dataPromise ||= fetch(new URL('../data/saxso-catalogue.json?v=20261112-saxso-hd2', import.meta.url)).then(r => {
  if (!r.ok) throw Error('Le catalogue SAXSO n’a pas pu être chargé.');
  return r.json();
}).catch(e => {dataPromise = null; throw e;});

export async function renderSaxsoCatalogue(root) {
  if (root.dataset.saxsoMounted) return;
  root.dataset.saxsoMounted = 'loading';
  root.classList.add('saxso');
  if (!document.querySelector('[data-saxso-style]')) {
    const style = document.createElement('link'); style.rel='stylesheet';
    style.href = new URL('../css/saxso-catalogue.css?v=20261112-saxso-hd2', import.meta.url);
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
  const findVariant = id => {
    for (const c of data.collections) { const v = c.variants.find(v => v.id === id); if (v) return {c,v}; }
  };
  let saved = []; try {saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');} catch {}
  let selection = restoreSelection(saved, data), filter = 'Tout', search = '', active, photoIndex = 0, mediaMode = 'product', currentMedia = [], displayedMedia, viewerZoom = 1;
  const triggers = new WeakMap(); let imageTrigger;
  const save = () => {try {localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));} catch {} updateCount();};
  const hero = data.collections[0].cover;
  const total = data.collections.reduce((sum,c) => sum + c.variants.length, 0);
  root.innerHTML = `
    <section class="sx-hero">
      <div class="sx-hero-copy"><div class="sx-eyebrow">SAXSO · PIERRES NATURELLES · 2026</div><h1>La matière.<br><em>L’émotion.</em></h1><p>La pierre dans toute sa vérité. Explorez les matières, composez votre sélection et donnez forme à votre prochain projet.</p><div class="sx-hero-actions"><button class="sx-button" data-sx-explore>Explorer les collections <span>↓</span></button><button class="sx-outline" data-sx-pdf>Feuilleter le PDF →</button></div><div class="sx-hero-note">Édition française <span>·</span> Minimum de commande : <strong>4 palettes</strong></div></div>
      <div class="sx-hero-photo"><img src="${esc(hero?.url)}" alt="Terrasse en pierre naturelle SAXSO" fetchpriority="high"><div class="sx-photo-caption">PIERRE DE LUSERNA <span>Naturellement singulière.</span></div></div>
    </section>
    <div class="sx-intro"><p>Un paysage de matières.</p><span>${data.collections.length} collections · ${total} choix documentés<br>Extérieur / Parements / Intérieur</span></div>
    <section id="sx-collections" class="sx-collections" aria-label="Collections SAXSO"><div class="sx-tools"><div class="sx-tabs" role="group" aria-label="Usage">${['Tout','Extérieur','Parement','Intérieur'].map((x,i)=>`<button data-sx-filter="${x}" aria-pressed="${!i}">${x==='Parement'?'Parements':x}</button>`).join('')}</div><label class="sx-search"><span class="sx-sr-only">Rechercher une collection, une référence ou un format</span><span aria-hidden="true">⌕</span><input data-sx-search type="search" placeholder="Matière, référence, format…"></label></div><p data-sx-results class="sx-results" aria-live="polite"></p><div data-sx-grid class="sx-grid"></div></section>
    <section class="sx-contact"><div><div class="sx-eyebrow">VOTRE PROJET, ACCOMPAGNÉ</div><h2>Parlons pierre.</h2><p>Sélectionnez vos articles et préparez votre demande de chiffrage.<br>Minimum de commande : <strong>4 palettes</strong>.</p></div><div class="sx-contact-details"><span>Dora · Service export SAXSO</span><a href="mailto:export@saxso.it">export@saxso.it →</a><a href="tel:+390175518090">+39 0175 518090</a><button class="sx-outline" data-sx-pdf>Catalogue PDF français · 2026 →</button></div></section>
    <div class="sx-selection-bar"><div><strong>Votre sélection</strong><span data-sx-count>Aucun article</span></div><button class="sx-button" data-sx-cart>Ma demande de chiffrage <span aria-hidden="true">→</span></button></div>
    <dialog class="sx-dialog sx-product-dialog" aria-label="Détails de la collection"><button class="sx-close" data-sx-close aria-label="Fermer les détails">×</button><div data-sx-detail></div></dialog>
    <dialog class="sx-dialog sx-cart-dialog" aria-label="Votre demande de chiffrage"><button class="sx-close" data-sx-close aria-label="Fermer la sélection">×</button><div class="sx-cart-head"><div class="sx-eyebrow">SAXSO · VOTRE PROJET</div><h2>Votre sélection.</h2><p>Demande de chiffrage · Minimum de commande : <strong>4 palettes</strong></p></div><div data-sx-cart-items></div><p data-sx-pack-estimate class="sx-pack-note"></p><form data-sx-quote><div class="sx-form-grid"><label>Société<input name="company" autocomplete="organization" maxlength="150"></label><label>Votre nom<input name="name" autocomplete="name" required maxlength="120"></label><label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="180"></label><label>Téléphone<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label><label class="sx-wide">Adresse ou ville de livraison<input name="delivery" autocomplete="street-address" required maxlength="300"></label><label>Volume envisagé (palettes)<input name="pallets" type="number" min="4" step="1" value="4" required></label><label class="sx-wide">Précisions sur votre projet<textarea name="notes" rows="3" maxlength="3000" placeholder="Formats, coloris, délai souhaité…"></textarea></label></div><p class="sx-mail-note">La demande sera préparée dans votre messagerie à destination de SAXSO, avec LE ROY FACTORY en copie. Vérifiez-la puis envoyez-la. Le conditionnement et le volume seront confirmés par l’usine.</p><div class="sx-form-actions"><button class="sx-button" type="submit">Préparer la demande par e-mail →</button><button class="sx-outline" type="button" data-sx-download>Télécharger la demande</button></div><p data-sx-quote-status role="status" class="sx-status"></p></form></dialog>
    <dialog class="sx-dialog sx-image-dialog" aria-label="Visuel du produit"><div class="sx-viewer-header"><div><strong data-sx-viewer-title></strong><span data-sx-viewer-note></span></div><div class="sx-viewer-tools"><button class="sx-outline" data-sx-viewer-minus aria-label="Réduire le visuel">−</button><output data-sx-viewer-level>1×</output><button class="sx-outline" data-sx-viewer-plus aria-label="Agrandir le visuel">+</button><button class="sx-close" data-sx-close aria-label="Fermer le visuel">×</button></div></div><div class="sx-viewer-stage" data-sx-viewer-stage><img data-sx-full-image alt=""></div></dialog>
    <dialog class="sx-dialog sx-pdf-dialog" aria-label="Catalogue PDF SAXSO en français"><div class="sx-pdf-header"><strong>SAXSO · Catalogue français 2026</strong><a href="${esc(data.pdf)}" download>Télécharger le PDF ↓</a><button class="sx-close" data-sx-close aria-label="Fermer le PDF">×</button></div><iframe title="Catalogue PDF SAXSO français 2026" data-sx-pdf-frame></iframe><p>Si la lecture ne s’affiche pas, <a href="${esc(data.pdf)}" target="_blank" rel="noopener">ouvrir le PDF dans un nouvel onglet →</a>.</p></dialog>`;

  const $ = s => root.querySelector(s);
  const productDialog = $('.sx-product-dialog'), cartDialog = $('.sx-cart-dialog'), imageDialog = $('.sx-image-dialog'), pdfDialog = $('.sx-pdf-dialog');
  function openDialog(dialog, trigger) {triggers.set(dialog,trigger || document.activeElement);dialog.showModal();dialog.scrollTop=0;}
  root.querySelectorAll('[data-sx-close]').forEach(button => button.onclick = () => button.closest('dialog').close());
  root.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', e => {if(e.target === dialog) {const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close', () => {if(dialog===imageDialog)imageTrigger?.focus({preventScroll:true});else triggers.get(dialog)?.focus?.({preventScroll:true});});
  });
  function renderGrid() {
    const q=norm(search).split(/\s+/).filter(Boolean);
    const found=data.collections.filter(c => (filter==='Tout'||c.category===filter) && q.every(t=>norm([c.name,c.category,...c.variants.map(v=>v.label+' '+v.reference)].join(' ')).includes(t)));
    $('[data-sx-results]').textContent=`${found.length} collection${found.length>1?'s':''}`;
    $('[data-sx-grid]').innerHTML=found.length ? found.map((c,i)=>`<article class="sx-card"><button class="sx-card-photo" data-sx-open="${esc(c.id)}" aria-label="Découvrir ${esc(c.name)} · ${c.category}"><img src="${esc(c.cover?.preview)}" alt="${esc(c.name)} · ${c.category} SAXSO" loading="lazy" decoding="async"><span class="sx-card-arrow" aria-hidden="true">→</span></button><div class="sx-card-meta"><span>${c.category}</span><span>${String(i+1).padStart(2,'0')}</span></div><button class="sx-card-title" data-sx-open="${esc(c.id)}">${esc(c.name)}</button><p>${c.variants.length} choix · Voir les matières et formats</p></article>`).join('') : '<div class="sx-empty"><h3>Aucune collection trouvée.</h3><p>Essayez un autre nom, une référence ou un format.</p><button class="sx-outline" data-sx-reset>Effacer la recherche</button></div>';
    root.querySelectorAll('[data-sx-open]').forEach(b=>b.onclick=()=>openCollection(b.dataset.sxOpen,b));
    $('[data-sx-reset]')?.addEventListener('click',()=>{search='';filter='Tout';$('[data-sx-search]').value='';updateTabs();renderGrid();});
  }
  const updateTabs=()=>root.querySelectorAll('[data-sx-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sxFilter===filter)));
  root.querySelectorAll('[data-sx-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.sxFilter;updateTabs();renderGrid();});
  $('[data-sx-search]').oninput=e=>{search=e.target.value;renderGrid();};
  $('[data-sx-explore]')?.addEventListener('click',()=>$('#sx-collections').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));

  const selectedVariant=()=>active?.variants.find(v=>v.id===$('[data-sx-variant]')?.value);
  const mediaGroupLabels={product:'Produit',format:'Format',material:'Matière',ambience:'Ambiances'};
  const formatPromises=new Map(),materialPromises=new Map(),thumbnailUrls=new Map();let mediaEpoch=0,variantThumbObserver;
  const getFormatVisual=variant=>{if(!formatPromises.has(variant.id))formatPromises.set(variant.id,renderProductVisual(variant,variant.materialPhoto).catch(error=>{formatPromises.delete(variant.id);throw error;}));return formatPromises.get(variant.id);};
  const mediaKindLabel=media=>media?.kind==='illustration'?'Illustration du format':media?.group==='material'?(media.label||'Matière de référence'):media?.group==='ambience'?'Photographie d’ambiance':'Photographie du produit';
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
      image.src=displayedMedia.url;image.alt=displayedMedia.label;
      image.style.maxWidth=Number(displayedMedia.width)>0?Math.min(Number(displayedMedia.width),10000)+'px':'';
      $('[data-sx-media-caption]').textContent=mediaKindLabel(displayedMedia);
      const note=displayedMedia.note||displayedMedia.disclaimer;
      $('[data-sx-photo-note]').textContent=note||(displayedMedia.kind==='illustration'?'Illustration du format, réalisée avec une matière photographique de référence. La teinte et la finition exactes se vérifient sur un échantillon.':displayedMedia.group==='ambience'?'Photographie d’ambiance de la collection. Consultez les onglets Produit et Format pour la référence sélectionnée.':'Photographie de référence. Les nuances naturelles peuvent varier d’une pièce à l’autre.');
    }else{
      image.removeAttribute('src');$('[data-sx-media-caption]').textContent='';
      empty.textContent=mediaMode==='material'?'Préparation du détail matière…':mediaMode==='format'?'Préparation du visuel du format…':'Photographie non disponible pour cette référence';
      $('[data-sx-photo-note]').textContent=mediaMode==='material'?'Le détail reprend uniquement la zone de matière correspondant à la référence.':'Les photographies de collection restent accessibles dans Ambiances.';
    }
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
      const info=variantPresentation(v),initial=thumbnailUrls.get(v.id)||v.productPhoto?.preview||v.productPhoto?.url||v.materialPhoto?.preview||v.materialPhoto?.url||productThumbnail(v);
      return `<button type="button" class="sx-variant-choice" data-sx-choice="${esc(v.id)}" aria-pressed="${v.id===selected}" aria-label="Choisir ${esc(v.label)}"><img src="${esc(initial)}" data-sx-format-thumb="${esc(v.id)}" alt="" loading="lazy" decoding="async"><strong>${esc(info.format||v.label)}</strong><span>${esc([info.piece,info.finish].filter(Boolean).join(' · ')||v.label)}</span></button>`;
    }).join('')||'<p class="sx-choice-empty">Aucune référence pour cette combinaison.</p>';
    grid.scrollTop=scrollTop;
    root.querySelectorAll('[data-sx-choice]').forEach(button=>button.onclick=()=>{$('[data-sx-variant]').value=button.dataset.sxChoice;updateVariant();});
    const loadThumb=image=>{
      const id=image.dataset.sxFormatThumb,v=active.variants.find(v=>v.id===id);if(!v||thumbnailUrls.has(id))return;
      getFormatVisual(v).then(visual=>{const url=visual.preview||visual.url;thumbnailUrls.set(id,url);if(image.isConnected&&image.dataset.sxFormatThumb===id)image.src=url;}).catch(()=>{});
    };
    if(typeof IntersectionObserver!=='undefined') {
      variantThumbObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){variantThumbObserver.unobserve(entry.target);loadThumb(entry.target);}},{root:grid,rootMargin:'80px'});
      grid.querySelectorAll('[data-sx-format-thumb]').forEach(image=>{if(!thumbnailUrls.has(image.dataset.sxFormatThumb))variantThumbObserver.observe(image);});
    }else grid.querySelectorAll('[data-sx-format-thumb]').forEach(loadThumb);
  }
  function updateVariant() {
    const v=selectedVariant();if(!v)return;
    const info=variantPresentation(v);
    renderMedia(v);renderVariantChoices();
    $('[data-sx-variant-info]').innerHTML=`<strong>${esc(v.label)}</strong>${info.finish?`<span><b>Finition</b> ${esc(info.finish)}</span>`:''}${info.format?`<span><b>Format</b> ${esc(info.format)}</span>`:''}<span>Unité de demande : ${esc(v.unit)}${v.packaging&&v.packaging!=='-'?` · ${esc(v.packaging)} ${esc(v.unit)}/palette`:''}</span>${v.note?`<small>${esc(v.note)}</small>`:''}`;
    $('[data-sx-unit]').textContent=v.unit||'';
    $('[data-sx-source]').dataset.sxSource=v.page||active.page;
    $('[data-sx-source]').textContent=`Voir la page ${v.page||active.page} du catalogue →`;
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
  function openCollection(id, trigger) {
    active=data.collections.find(c=>c.id===id);if(!active)return;
    const finishOptions=[...new Set(active.variants.map(v=>variantPresentation(v).finish).filter(Boolean))],formatOptions=[...new Set(active.variants.map(v=>variantPresentation(v).format).filter(Boolean))];
    $('[data-sx-detail]').innerHTML=`<div class="sx-detail-grid"><div class="sx-detail-gallery"><div class="sx-media-modes" data-sx-media-modes role="group" aria-label="Type de visuel"></div><button class="sx-detail-zoom" data-sx-zoom aria-label="Examiner le visuel"><img data-sx-detail-image alt=""><span class="sx-media-empty" data-sx-media-empty>Visuel de la référence en cours d’ajout</span><span class="sx-image-action">Examiner le visuel ↗</span></button><div class="sx-media-meta"><span data-sx-media-caption></span><div class="sx-photo-nav"><button class="sx-outline" data-sx-prev aria-label="Visuel précédent">←</button><span data-sx-photo-counter></span><button class="sx-outline" data-sx-next aria-label="Visuel suivant">→</button></div></div><div class="sx-media-thumbs" data-sx-media-thumbs aria-label="Vignettes des visuels"></div><p class="sx-photo-note" data-sx-photo-note></p></div><div class="sx-detail-copy"><div class="sx-eyebrow">SAXSO / ${esc(active.category)}</div><h2>${esc(active.name)}</h2><p>Choisissez votre finition, puis le format ou la pièce qui correspond à votre projet.</p><div class="sx-choice-filters"><label>Finition<select data-sx-finish-filter><option value="*">Toutes les finitions</option>${finishOptions.map(f=>`<option>${esc(f)}</option>`).join('')}</select></label><label>Format / pièce<select data-sx-format-filter><option value="*">Tous les formats</option>${formatOptions.map(f=>`<option>${esc(f)}</option>`).join('')}</select></label></div><div class="sx-choice-title"><strong>Choisir par image</strong><span data-sx-choice-count></span></div><div class="sx-variant-choices" data-sx-variant-choices aria-label="Références de la collection"></div><label class="sx-field sx-reference-select">Référence exacte<select data-sx-variant>${active.variants.map(v=>`<option value="${esc(v.id)}">${esc(v.label)}</option>`).join('')}</select></label><div data-sx-variant-info class="sx-variant-info"></div><label class="sx-field">Quantité souhaitée <span data-sx-unit></span><input data-sx-quantity type="text" inputmode="decimal" value="1" maxlength="12"></label><button class="sx-button sx-full" data-sx-add${active.variants.length?'':' disabled'}>Ajouter à ma sélection +</button><p data-sx-add-status role="status" class="sx-status"></p><button class="sx-text-link" data-sx-source></button><div class="sx-condition">Minimum de commande : <strong>4 palettes</strong><br>Les quantités et conditionnements seront confirmés par l’usine.</div></div></div>`;
    $('[data-sx-variant]').onchange=()=>{$('[data-sx-finish-filter]').value='*';$('[data-sx-format-filter]').value='*';updateVariant();};
    for(const name of ['finish','format'])$(`[data-sx-${name}-filter]`).onchange=()=>{
      const variants=matchingVariants();if(variants.length&&!variants.some(v=>v.id===$('[data-sx-variant]').value))$('[data-sx-variant]').value=variants[0].id;
      updateVariant();
    };
    $('[data-sx-prev]').onclick=()=>showPhoto(photoIndex-1);
    $('[data-sx-next]').onclick=()=>showPhoto(photoIndex+1);
    $('[data-sx-zoom]').onclick=e=>openImage(e.currentTarget);
    $('[data-sx-source]').onclick=e=>openPdf(Number(e.currentTarget.dataset.sxSource),e.currentTarget);
    $('[data-sx-add]').onclick=()=>{
      const amount=quantity($('[data-sx-quantity]').value),id=$('[data-sx-variant]').value;
      if(!amount){$('[data-sx-add-status]').textContent='Indiquez une quantité supérieure à zéro.';return;}
      const existing=selection.find(x=>x.id===id);
      if(existing){if(!quantity(existing.quantity+amount)){$('[data-sx-add-status]').textContent='La quantité totale est trop élevée.';return;}existing.quantity+=amount;}else selection.push({id,quantity:amount});
      save();$('[data-sx-add-status]').textContent='Article ajouté à votre sélection.';
    };
    updateVariant();openDialog(productDialog,trigger);
  }
  function updateCount() {const n=selection.length;$('[data-sx-count]').textContent=n?`${n} article${n>1?'s':''}`:'Aucun article';}
  function renderCart() {
    $('[data-sx-cart-items]').innerHTML=selection.length?selection.map(item=>{
      const found=findVariant(item.id);if(!found)return'';const {c,v}=found;
      return `<div class="sx-cart-item"><img src="${esc(thumbnailUrls.get(v.id)||v.productPhoto?.preview||v.productPhoto?.url||v.visual?.preview||v.visual?.url||v.materialPhoto?.preview||v.materialPhoto?.url||c.cover?.preview)}" alt="${esc(v.label)}"><div><strong>${esc(c.name)}</strong><span>${esc(v.label)}</span><small>Catalogue p. ${v.page} · ${esc(c.category)}</small></div><label>Quantité (${esc(v.unit)})<input data-sx-quantity-id="${esc(item.id)}" type="text" inputmode="decimal" value="${number(item.quantity)}" aria-label="Quantité pour ${esc(v.label)}"></label><button class="sx-remove" data-sx-remove="${esc(item.id)}" aria-label="Retirer ${esc(v.label)}">×</button></div>`;
    }).join(''):'<div class="sx-empty"><p>Votre sélection est encore vide. Choisissez une collection et ajoutez vos articles.</p><button class="sx-outline" data-sx-continue>Explorer les collections</button></div>';
    $('[data-sx-quote]').hidden=!selection.length;
    const estimate=palletEstimate(selection,data);
    $('[data-sx-pack-estimate]').textContent=selection.length?(estimate.unknown?`Le volume de ${estimate.unknown} article(s) reste à confirmer avec l’usine. Minimum de commande : 4 palettes.`:`Volume indicatif selon les conditionnements du catalogue : ${number(estimate.known)} palettes. Minimum de commande : 4 palettes. L’usine confirmera la composition.`):'';
    root.querySelectorAll('[data-sx-remove]').forEach(b=>b.onclick=()=>{selection=selection.filter(x=>x.id!==b.dataset.sxRemove);save();renderCart();});
    $('[data-sx-continue]')?.addEventListener('click',()=>cartDialog.close());
    root.querySelectorAll('[data-sx-quantity-id]').forEach(input=>input.onchange=()=>{const amount=quantity(input.value.replace(/[\s\u202f\u00a0]/g,''));if(!amount){input.setCustomValidity('Indiquez une quantité supérieure à zéro.');input.reportValidity();return;}input.setCustomValidity('');selection.find(x=>x.id===input.dataset.sxQuantityId).quantity=amount;save();renderCart();});
  }
  $('[data-sx-cart]').onclick=e=>{renderCart();$('[data-sx-quote-status]').textContent='';openDialog(cartDialog,e.currentTarget);};
  function openPdf(page=1,trigger) {
    $('[data-sx-pdf-frame]').src=data.pdf+`#page=${page}&view=FitH`;
    openDialog(pdfDialog,trigger);
  }
  root.querySelectorAll('[data-sx-pdf]').forEach(b=>b.onclick=e=>openPdf(1,e.currentTarget));
  const form=$('[data-sx-quote]');
  const quote=()=>{
    for(const input of root.querySelectorAll('[data-sx-quantity-id]')){
      const amount=quantity(input.value.replace(/[\s\u202f\u00a0]/g,''));
      if(!amount){input.setCustomValidity('Indiquez une quantité supérieure à zéro.');input.reportValidity();return;}
      selection.find(x=>x.id===input.dataset.sxQuantityId).quantity=amount;
    }
    if(!form.reportValidity())return;
    return buildQuote({catalogue:data,selection,customer:Object.fromEntries(new FormData(form))});
  };
  function download(q) {
    const bytes=new Blob([q.subject+'\r\n\r\nÀ : '+q.to+'\r\nCopie : '+q.cc+'\r\n\r\n'+q.body],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(bytes),a=document.createElement('a');a.href=url;a.download='SAXSO_Demande_de_chiffrage.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);
  }
  form.onsubmit=e=>{e.preventDefault();try{const q=quote();if(!q)return;const href=`mailto:${q.to}?cc=${encodeURIComponent(q.cc)}&subject=${encodeURIComponent(q.subject)}&body=${encodeURIComponent(q.body)}`;if(href.length>7000){download(q);$('[data-sx-quote-status]').textContent='Votre sélection est longue. La demande complète a été téléchargée : joignez-la à votre e-mail à export@saxso.it, avec jerome@leroyfactory.fr en copie.';return;}location.href=href;$('[data-sx-quote-status]').textContent='Demande préparée. Envoyez-la depuis votre messagerie. Si elle ne s’ouvre pas, téléchargez la demande.';}catch(error){$('[data-sx-quote-status]').textContent=error.message;}};
  $('[data-sx-download]').onclick=()=>{try{const q=quote();if(!q)return;download(q);$('[data-sx-quote-status]').textContent='Demande téléchargée. Vous pouvez la joindre à votre e-mail.';}catch(error){$('[data-sx-quote-status]').textContent=error.message;}};
  renderGrid();updateCount();root.dataset.saxsoMounted='ready';
  const requested=new URLSearchParams(location.search).get('collection');
  if(requested&&data.collections.some(c=>c.id===requested))openCollection(requested);
}

const root=typeof document==='undefined'?null:document.querySelector('[data-saxso-catalogue]');
if(root)renderSaxsoCatalogue(root);
