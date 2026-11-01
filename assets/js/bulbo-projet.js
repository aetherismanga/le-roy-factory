(() => {
  'use strict';
  const RECIPIENT = 'jerome@leroyfactory.fr';
  const VERSION = '20261101-bulbo1';
  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const clean = (value, max = 180) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const valueOf = item => typeof item === 'string' || typeof item === 'number' ? String(item) : String(item?.value ?? item?.id ?? item?.name ?? item?.label ?? '');
  const labelOf = item => typeof item === 'string' || typeof item === 'number' ? String(item) : String(item?.label ?? item?.name ?? item?.title ?? item?.value ?? item?.id ?? '');
  const choices = list => Array.isArray(list) ? list.map(item => ({value:valueOf(item), label:labelOf(item), original:item})).filter(item => item.value && item.label) : [];
  function exactChoice(list, input) {
    const value = clean(input);
    if (!value) return '';
    const options = choices(list);
    const exact = options.find(item => item.value === value || item.label === value);
    if (exact) return exact.value;
    const equivalent = options.filter(item => norm(item.value) === norm(value) || norm(item.label) === norm(value));
    return equivalent.length === 1 ? equivalent[0].value : '';
  }
  function quantityValue(input, furniture = false) {
    const raw = clean(input, 20);
    if (!raw) return {value:'', error:''};
    if (!/^\d+(?:[,.]\d+)?$/.test(raw)) return {value:'', error:'Indiquez une quantité positive en chiffres.'};
    const number = Number(raw.replace(',', '.'));
    if (!Number.isFinite(number) || number <= 0 || number > 100000) return {value:'', error:'La quantité doit être comprise entre 0 et 100 000.'};
    if (furniture && !Number.isInteger(number)) return {value:'', error:'Pour un meuble, indiquez un nombre entier de pièces.'};
    return {value:String(number), error:''};
  }
  const safeImage = input => {
    const value = typeof input === 'string' ? input : input?.src || input?.url || input?.image || input?.original || '';
    return /^(?:https:\/\/|assets\/|\/(?!\/))/.test(value) ? value : '';
  };
  const isConnected = s => !!s && ((/^LRF-\d{5}$/.test(String(s.codeClient || '').trim().toUpperCase()) && String(s.codeClient).trim().toUpperCase() !== 'LRF-00001') || ((s.isAdmin === true || s.admin === true) && ['jerome@leroyfactory.fr','coryne@leroyfactory.fr'].includes(String(s.email || '').trim().toLowerCase())));
  const productLink = slug => 'https://leroyfactory.fr/univers.html?partner=bulbo' + (slug ? '&collection=' + encodeURIComponent(slug) : '');
  const supportsSecondColor = product => product?.productType === 'surface' && /deux codes couleur/i.test((Array.isArray(product.technicalNotes) ? product.technicalNotes : [product.technicalNotes]).filter(Boolean).join(' '));
  const colorLabels = product => ['splendore','lysoform','confetto'].includes(product?.slug) ? ['Couleur de départ','Couleur d’arrivée'] : ['Couleur du fond','Couleur du motif'];
  window.LRF_BULBO_PROJECT_UTILS = Object.freeze({exactChoice, quantityValue, safeImage, isConnected, productLink, supportsSecondColor, colorLabels});
  const $ = id => document.getElementById(id);
  const form = $('bulbo-project-form');
  if (!form) return;
  const params = new URLSearchParams(location.search);
  const touched = new Set(), hydrated = new Map();
  let products = [], selected = null, prepared = null, previousConnected = false;
  const session = () => { try { return window.LRF_PRO_SESSION?.read?.() || window.LRF_PRO_CONTEXT || null; } catch { return null; } };
  const professional = () => isConnected(session()) || form.elements.profile.value === 'professional';
  const furniture = () => selected?.productType === 'furniture';
  const monolith = () => furniture() && norm(selected?.slug || selected?.name).includes('monolith');
  function invalidate() {
    prepared = null;
    $('request-preview').hidden = true;
    $('open-email').removeAttribute('href');
    $('request-feedback').textContent = '';
    $('form-error').hidden = true;
  }
  function fillOptions(id, list, wanted = '') {
    const select = $(id), values = choices(list);
    select.replaceChildren(new Option('À définir avec Jérôme', ''));
    values.forEach(item => select.add(new Option(item.label, item.value)));
    select.value = exactChoice(list, wanted);
    select.disabled = !values.length;
    return !wanted || !!select.value;
  }
  function updateReturnLinks() {
    const href = 'univers.html?partner=bulbo' + (selected ? '&collection=' + encodeURIComponent(selected.slug) : '');
    document.querySelectorAll('[data-product-return]').forEach(link => { link.href = href; });
  }
  function updatePhoto() {
    const color = $('color').value;
    const swatch = (Array.isArray(selected?.swatches) ? selected.swatches : []).find(item => [item.id,item.value,item.name,item.label].filter(Boolean).some(value => norm(value) === norm(color)));
    const photo = safeImage(swatch) || safeImage(selected?.coverImage) || safeImage(selected?.images?.[0]);
    const link = $('product-image-link'), image = $('product-image');
    link.hidden = !photo;
    if (photo) {
      image.src = photo;
      image.alt = 'BULBO ' + selected.name + (color && swatch ? ' · ' + $('color').selectedOptions[0].textContent : '');
      link.href = safeImage(swatch?.originalUrl) || photo;
      link.setAttribute('aria-label', 'Agrandir le visuel ' + selected.name);
    } else { image.removeAttribute('src'); link.removeAttribute('href'); }
  }
  function renderProduct(wanted = {}) {
    selected = products.find(product => product.slug === $('collection').value) || null;
    const isFurniture = furniture(), isMonolith = monolith(), twoColors = supportsSecondColor(selected);
    fillOptions('color', isMonolith ? [] : selected?.colors, wanted.color);
    fillOptions('color2', twoColors ? selected?.colors : [], wanted.color2);
    fillOptions('format', selected?.formats, wanted.format);
    fillOptions('finish', selected?.finishes, wanted.finish);
    $('color-field').hidden = isMonolith;
    $('color2-field').hidden = !twoColors;
    $('finish-field').hidden = isMonolith && !choices(selected?.finishes).length;
    $('color-field').firstChild.textContent = isFurniture ? 'Couleur du plan' : twoColors ? colorLabels(selected)[0] : 'Coloris';
    $('color2-field').firstChild.textContent = colorLabels(selected)[1];
    $('format-field').firstChild.textContent = isFurniture ? 'Largeur / format' : 'Format';
    $('finish-field').firstChild.textContent = isFurniture ? 'Plan / finition' : 'Finition';
    $('quantity-label').textContent = isFurniture ? 'Quantité souhaitée (pièces)' : 'Surface souhaitée (m²)';
    $('quantity').inputMode = isFurniture ? 'numeric' : 'decimal';
    $('quantity-note').textContent = isFurniture ? 'Nombre de meubles souhaités.' : 'Quantité indicative, coupes à préciser ensemble.';
    $('decor-label').textContent = isFurniture ? 'Décor de façade souhaité' : 'Dimensions du mur / précisions sur le décor';
    $('decor').placeholder = isFurniture ? 'Nom du décor BULBO, couleurs, continuité avec le mur…' : 'Largeur × hauteur, emplacement, couleur ou détail souhaité…';
    $('selection-note').textContent = isMonolith ? 'MONOLITH se prépare sur mesure. Précisez votre décor, les dimensions et les détails souhaités : l’agence confirmera les possibilités et le chiffrage.' : isFurniture ? 'Le coloris ci-dessus concerne le plan. Précisez séparément le décor souhaité pour la façade. Les associations et dimensions seront confirmées par l’agence.' : 'Vous pouvez laisser les choix ouverts : ils seront définis avec l’agence. Les surfaces BULBO se préparent selon les dimensions de votre projet.';
    if (twoColors) $('selection-note').textContent = 'Précisez les deux codes couleur dans l’ordre souhaité. La composition et cet ordre seront validés par l’agence. Le visuel présenté illustre la collection et ne simule pas cette combinaison.';
    $('summary-kind').textContent = isFurniture ? 'AQUERELLE · MEUBLE COORDONNÉ' : 'BULBO · SURFACE D’EXCEPTION';
    $('summary-name').textContent = selected?.name || 'Choisissez votre collection';
    $('summary-description').textContent = selected ? clean(selected.description || selected.summary || (isFurniture ? 'Un meuble habillé du décor de votre choix, pour une salle de bains coordonnée.' : 'Une surface décorative à composer pour votre intérieur.'), 400) : 'Les finitions et dimensions seront confirmées pour votre projet.';
    updatePhoto(); updateReturnLinks();
  }
  function hydrate(s) {
    const values = {'company':s?.societe || '', 'contact-name':s?.name || s?.contact || '', email:s?.email || '', phone:s?.telephone || s?.tel || '', postcode:s?.codePostal || s?.cp || '', city:s?.ville || ''};
    Object.entries(values).forEach(([id,value]) => {
      const field = $(id), previous = hydrated.get(id);
      if (touched.has(id) && field.value !== previous) return;
      if (!field.value || field.value === previous) { field.value = clean(value); hydrated.set(id, field.value); }
    });
  }
  function updateProfile() {
    const s = session(), connected = isConnected(s);
    if (connected || previousConnected) form.elements.profile.value = connected ? 'professional' : 'private';
    previousConnected = connected;
    $('profile-choice').hidden = connected;
    form.querySelectorAll('[name="profile"]').forEach(input => { input.disabled = connected; });
    $('connected-profile').hidden = !connected;
    $('connected-profile').textContent = connected ? 'Compte professionnel connecté · ' + (s.codeClient ? clean(s.codeClient) : 'Administration') : '';
    const pro = professional();
    $('company-field').hidden = !pro;
    $('postcode').required = !pro; $('city').required = !pro;
    $('postcode-label').textContent = 'Code postal du projet' + (!pro ? ' *' : '');
    $('city-label').textContent = 'Ville / secteur du projet' + (!pro ? ' *' : '');
    $('profile-note').textContent = pro ? 'L’agence vous accompagne dans la définition des références et du chiffrage.' : 'Précisez le secteur de votre projet pour être orienté vers un magasin revendeur.';
    hydrate(s);
  }
  const fieldText = id => clean($(id).value, id === 'message' ? 2500 : id === 'decor' ? 1200 : 180);
  const chosenLabel = id => $(id).value ? $(id).selectedOptions[0].textContent : 'À définir avec Jérôme';
  function messageText() {
    const s = session(), pro = professional(), qty = quantityValue(fieldText('quantity'), furniture());
    return [
      'Bonjour Jérôme,', '',
      pro ? 'Je souhaite préparer le chiffrage de mon projet BULBO.' : 'Je souhaite être conseillé sur mon projet BULBO et être orienté vers un magasin revendeur.', '',
      'MA SÉLECTION BULBO', 'Collection / meuble : ' + selected.name,
      !monolith() ? (furniture() ? 'Couleur du plan' : supportsSecondColor(selected) ? colorLabels(selected)[0] : 'Coloris') + ' : ' + chosenLabel('color') : '',
      supportsSecondColor(selected) ? colorLabels(selected)[1] + ' : ' + chosenLabel('color2') : '',
      supportsSecondColor(selected) ? 'Ordre de composition : ' + colorLabels(selected)[0] + ' → ' + colorLabels(selected)[1] + '. Placement et combinaison à confirmer avec l’agence.' : '',
      (furniture() ? 'Largeur / format : ' : 'Format : ') + chosenLabel('format'),
      choices(selected.finishes).length ? (furniture() ? 'Plan / finition : ' : 'Finition : ') + chosenLabel('finish') : '',
      'Quantité souhaitée : ' + (qty.value ? Number(qty.value).toLocaleString('fr-FR') + (furniture() ? ' pièce(s)' : ' m²') : 'À préciser'),
      (furniture() ? 'Décor de façade souhaité : ' : 'Dimensions / précisions décor : ') + (fieldText('decor') || 'À définir avec Jérôme'),
      'Lien de la sélection : ' + productLink(selected.slug), '',
      'MON PROJET', 'Profil : ' + (pro ? 'Professionnel' : 'Particulier'),
      pro && s?.codeClient && isConnected(s) ? 'Code client : ' + clean(s.codeClient) : '',
      pro && fieldText('company') ? 'Société : ' + fieldText('company') : '',
      'Nom / contact : ' + (fieldText('contact-name') || 'Non renseigné'),
      'E-mail : ' + (fieldText('email') || 'Non renseigné'),
      'Téléphone : ' + (fieldText('phone') || 'Non renseigné'),
      'Secteur : ' + ([fieldText('postcode'),fieldText('city')].filter(Boolean).join(' ') || 'À préciser'),
      'Projet / questions : ' + (fieldText('message') || 'À préciser'), '',
      'Merci de confirmer les références, dimensions, finitions, prix, disponibilités et conditions avant toute commande.'
    ].filter((line,index,array) => line !== '' || array[index - 1] !== '').join('\n');
  }
  form.addEventListener('input', event => { if (event.target.id) touched.add(event.target.id); invalidate(); });
  $('collection').addEventListener('change', () => { invalidate(); $('query-note').hidden = true; renderProduct(); });
  $('color').addEventListener('change', updatePhoto);
  form.querySelectorAll('[name="profile"]').forEach(input => input.addEventListener('change', () => { invalidate(); updateProfile(); }));
  form.addEventListener('submit', event => {
    event.preventDefault(); invalidate();
    if (!form.reportValidity()) return;
    if (!selected) return;
    const qty = quantityValue(fieldText('quantity'), furniture());
    if (qty.error) { $('form-error').textContent = qty.error; $('form-error').hidden = false; $('quantity').focus(); return; }
    const text = messageText();
    prepared = {text, identity:JSON.stringify(session())};
    $('request-text').value = text;
    $('open-email').href = 'mailto:' + RECIPIENT + '?subject=' + encodeURIComponent('Projet BULBO — ' + selected.name) + '&body=' + encodeURIComponent(text);
    $('request-preview').hidden = false;
    $('request-preview').focus();
    $('request-preview').scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
  });
  $('open-email').addEventListener('click', event => {
    if (!prepared || prepared.identity !== JSON.stringify(session())) { event.preventDefault(); invalidate(); updateProfile(); return; }
    $('request-feedback').textContent = 'Le message est préparé pour votre messagerie. Son envoi reste à valider dans votre application e-mail.';
  });
  $('copy-request').addEventListener('click', async () => {
    if (!prepared || prepared.identity !== JSON.stringify(session())) { invalidate(); updateProfile(); return; }
    try {
      if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(prepared.text);
      $('request-feedback').textContent = 'Demande copiée. Collez-la dans votre e-mail à ' + RECIPIENT + '.';
    } catch {
      const field = $('request-text'); field.focus(); field.select();
      let copied = false; try { copied = document.execCommand('copy'); } catch {}
      $('request-feedback').textContent = copied ? 'Demande copiée. Collez-la dans votre e-mail à ' + RECIPIENT + '.' : 'Le récapitulatif est sélectionné. Utilisez « Copier », puis collez-le dans votre messagerie.';
    }
  });
  $('edit-request').addEventListener('click', () => { invalidate(); $('collection').focus(); });
  window.addEventListener('lrf-pro-session-changed', () => { invalidate(); updateProfile(); });
  window.addEventListener('storage', event => { if (['lrfProSession','lrfProSessionToken','lrfProRememberToken'].includes(event.key)) { invalidate(); updateProfile(); } });
  window.addEventListener('pageshow', () => { if (prepared && prepared.identity !== JSON.stringify(session())) invalidate(); updateProfile(); });
  $('product-image').addEventListener('error', () => { $('product-image-link').hidden = true; });
  async function init() {
    updateProfile();
    try {
      const response = await fetch('assets/data/bulbo-catalogue.json?v=' + VERSION, {cache:'no-cache'});
      if (!response.ok) throw Error('Catalogue indisponible');
      const data = await response.json();
      products = (Array.isArray(data.collections) ? data.collections : []).filter(product => product && typeof product.slug === 'string' && typeof product.name === 'string' && ['surface','furniture'].includes(product.productType));
      if (!products.length) throw Error('Catalogue vide');
      const collection = $('collection');
      const surfaces = document.createElement('optgroup'); surfaces.label = 'Surfaces décoratives';
      const furnishings = document.createElement('optgroup'); furnishings.label = 'AQUERELLE · Meubles';
      products.forEach(product => (product.productType === 'furniture' ? furnishings : surfaces).append(new Option(product.name, product.slug)));
      if (surfaces.children.length) collection.append(surfaces);
      if (furnishings.children.length) collection.append(furnishings);
      const wantedSlug = clean(params.get('collection'));
      const product = products.find(item => item.slug === wantedSlug || item.id === wantedSlug);
      collection.value = product?.slug || '';
      const wanted = {color:clean(params.get('color')), color2:clean(params.get('color2')), format:clean(params.get('format')), finish:clean(params.get('finish'))};
      renderProduct(wanted);
      const quantity = clean(params.get('quantity'), 20), validated = quantityValue(quantity, furniture());
      if (!validated.error) $('quantity').value = validated.value;
      $('decor').value = clean(params.get('decor'), 1200);
      const rejected = (wantedSlug && !product) || Object.entries(wanted).some(([key,value]) => value && !$(key).value) || validated.error;
      if (rejected) { $('query-note').textContent = 'Certains choix du lien ne correspondent pas aux options documentées. Vérifiez la collection et précisez les détails avec Jérôme.'; $('query-note').hidden = false; }
      $('catalogue-status').hidden = true; form.hidden = false;
    } catch {
      $('catalogue-status').replaceChildren(document.createTextNode('La sélection BULBO est momentanément indisponible. '));
      const link = document.createElement('a'); link.href = 'mailto:' + RECIPIENT; link.textContent = 'Contacter Jérôme pour votre projet'; $('catalogue-status').append(link);
    }
  }
  init();
})();
