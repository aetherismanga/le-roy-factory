import {MINIMUM_PALLETS} from './saxso-selection.mjs';

const ORDER_URL = 'https://us-central1-le-roy-factory.cloudfunctions.net/saxsoOrder';
const MONEY = new Intl.NumberFormat('fr-FR', {style:'currency', currency:'EUR'});
const NUMBER = new Intl.NumberFormat('fr-FR', {maximumFractionDigits:3});
const FIELD_NAMES = ['store', 'email', 'address', 'contact', 'phone'];
const MAX_LINES = 100;
const MAX_PALLETS = 999;

function safe(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[c]);
}
function session() {
  return globalThis.window?.LRF_PRO_SESSION?.read?.() || null;
}
function accountKey(s) {
  if (!s) return 'visitor';
  return s.isAdmin ? 'agent-' + s.email : 'client-' + (s.clientId || s.codeClient);
}
function validPallets(n) {
  return Number.isInteger(n) && n > 0 && n <= MAX_PALLETS;
}
function copyCustomer(data) {
  return Object.fromEntries(FIELD_NAMES.map(key => [key, String(data?.[key] || '').trim()]));
}

// Quantities in the order are whole pallets. The net price unit (m² or ml)
// comes from the authorised tariff, which may differ from the catalogue unit.
export function calculateSaxsoCart(lines, resolve) {
  let palettes = 0, totalCents = 0, missing = 0;
  const items = lines.map(line => {
    const offer = resolve(line.variantId);
    const quantity = offer?.perPallet > 0 ? Number((line.palettes * offer.perPallet).toFixed(4)) : null;
    const cents = quantity !== null && offer?.orderable
      ? Math.round(Math.round(offer.amount * 100) * Math.round(quantity * 10000) / 10000) : null;
    palettes += line.palettes;
    if (cents === null) missing++;
    else totalCents += cents;
    return {...line, ...offer, quantity, cents};
  });
  return {items, palettes, count:items.length, priced:items.length > 0 && missing === 0,
    missing, totalCents, totalHT:totalCents / 100};
}

async function postOrder(action, payload, s) {
  if (!s) throw Error('Connectez-vous à votre espace PRO pour accéder à la commande.');
  const headers = {'Content-Type':'application/json'};
  const body = {action, ...payload};
  if (s.isAdmin) {
    const [{getApps}, {getAuth}] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
    ]);
    const app = getApps().find(a => a.options.projectId === 'le-roy-factory');
    if (!app) throw Error('Reconnectez-vous à votre espace agent.');
    const auth = getAuth(app);
    await auth.authStateReady();
    if (!auth.currentUser) throw Error('Reconnectez-vous à votre espace agent.');
    headers.Authorization = 'Bearer ' + await auth.currentUser.getIdToken();
  } else {
    body.codeClient = s.codeClient;
    body.departement = s.departement;
    if (s.sessionToken) body.sessionToken = s.sessionToken;
  }
  const response = await fetch(ORDER_URL, {method:'POST', headers, body:JSON.stringify(body), cache:'no-store'});
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Error(error.error || error.message || 'Le service de commandes ne répond pas. Réessayez dans un instant.');
  }
  if (action === 'pdf') {
    const blob = await response.blob();
    if (!blob.type.includes('pdf')) throw Error('Le bon PDF n’a pas pu être chargé.');
    return blob;
  }
  return response.json();
}

function defaultDraft() {
  return {lines:[], requestId:crypto.randomUUID(), customer:null, comment:'', profileId:'', orderId:''};
}
function draftKey(account) { return 'saxso-order-v1/' + account; }

function readDraft(account, products) {
  const fresh = defaultDraft();
  try {
    const stored = JSON.parse(sessionStorage.getItem(draftKey(account)));
    if (!Array.isArray(stored?.lines)) return fresh;
    const seen = new Set();
    const lines = stored.lines.filter(line => {
      if (!products.has(line?.variantId) || !validPallets(line?.palettes) || seen.has(line.variantId)) return false;
      seen.add(line.variantId);
      return true;
    }).slice(0, MAX_LINES).map(({variantId, palettes}) => ({variantId, palettes}));
    return {...fresh, lines, requestId:/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(stored.requestId) ? stored.requestId : fresh.requestId,
      customer:account !== 'visitor' && stored.customer ? copyCustomer(stored.customer) : null,
      comment:account === 'visitor' ? '' : String(stored.comment || '').slice(0, 1800),
      profileId:String(stored.profileId || ''), orderId:String(stored.orderId || '')};
  } catch { return fresh; }
}

// Earlier quotations contain quantities in sales units. Only accept a file
// chosen by the customer, and require them to approve the pallet counts.
export function readLegacyQuote(text, products, rows) {
  const blocks = String(text).replace(/\r/g, '').split(/^\d+\. /m).slice(1);
  const result = [];
  for (const block of blocks) {
    const reference = block.match(/^Référence catalogue : (.+)$/m)?.[1].trim();
    const label = block.match(/^Choix : (.+)$/m)?.[1].trim();
    const quantity = block.match(/^Quantité souhaitée : ([\d\s.,]+) ([^\n]+)$/m);
    const page = Number(block.match(/^Catalogue français 2026, page (\d+)/m)?.[1]);
    if (!reference || !label || !quantity) continue;
    const value = Number(quantity[1].replace(/\s/g, '').replace(',', '.'));
    const unit = quantity[2].trim();
    const matches = [...products.values()].filter(({variant:v}) => v.reference === reference &&
      v.label === label && v.unit === unit && (!page || v.page === page));
    const v = matches.length === 1 ? matches[0].variant : null;
    const row = v && rows.get(v.id);
    const perPallet = row?.unit === unit && row.perPallet > 0 ? row.perPallet : v?.perPallet;
    const pallets = perPallet > 0 ? Math.ceil(value / perPallet) : 0;
    result.push({id:v?.id || '', label, quantity:value, unit,
      suggested:validPallets(pallets) ? pallets : null});
  }
  return result;
}

function attachStyles() {
  if (document.querySelector('link[data-saxso-checkout-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../css/saxso-checkout.css?v=20261119-commande1', import.meta.url);
  link.dataset.saxsoCheckoutCss = '';
  document.head.append(link);
}

function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Opening the print window in the click handler preserves Safari’s user gesture.
// Render the authoritative PDF itself so every printed page matches the attachment.
async function printPdf(popup, blob) {
  if (popup.closed) return;
  const doc = popup.document;
  doc.title = 'Bon de commande SAXSO';
  const style = doc.createElement('style');
  style.textContent = `
    @page {size:A4; margin:0}
    * {box-sizing:border-box} body {margin:0; background:#e6e7e5; font:16px system-ui,sans-serif}
    header {position:sticky;top:0;background:#25332d;color:white;padding:14px;text-align:center}
    button {font:inherit;padding:10px 16px;cursor:pointer}
    canvas {display:block;width:min(100%,210mm);height:auto;margin:12px auto;background:white}
    @media print {header {display:none} body{background:white} canvas {width:100%;margin:0;break-after:page} canvas:last-child{break-after:auto}}
  `;
  doc.head.append(style);
  doc.body.replaceChildren();
  const bar = doc.createElement('header');
  const button = doc.createElement('button');
  button.textContent = 'Préparation des pages…';
  button.disabled = true;
  button.onclick = () => popup.print();
  bar.append(button);
  doc.body.append(bar);
  const {withSecurePdfDocument} = await import('./secure-pdf-viewer.mjs?v=20261119-commande1');
  await withSecurePdfDocument(blob, async pdf => {
    for (let i=1; i<=pdf.numPages && !popup.closed; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({scale:1.7});
      const canvas = doc.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.setAttribute('aria-label', 'Page ' + i);
      doc.body.append(canvas);
      await page.render({canvasContext:canvas.getContext('2d'), viewport}).promise;
      page.cleanup();
    }
  });
  if (!popup.closed) {
    button.textContent = 'Imprimer le bon de commande';
    button.disabled = false;
    popup.focus();
    popup.print();
  }
}

const dialogMarkup = `
  <header class="sxo-heading">
    <div><span>SAXSO · Commande professionnelle</span><h2>Mon panier</h2></div>
    <button type="button" data-close-cart aria-label="Fermer le panier">×</button>
  </header>
  <div class="sxo-content">
    <div class="sxo-metrics" aria-live="polite"><div><span>Volume</span><strong data-volume></strong></div><div><span data-total-label>Total net HT</span><strong data-money></strong></div></div>
    <p class="sxo-condition" data-condition></p>
    <a class="sxo-delivery-link" href="tarifs-pro.html#saxso" target="_blank" rel="noopener">Secteurs de livraison et conditions</a>
    <a class="sxo-secondary sxo-login" href="tarifs-pro.html" data-login hidden>Se connecter à l’espace PRO</a>
    <section data-items aria-label="Articles du panier"></section>
    <details data-legacy class="sxo-legacy" hidden>
      <summary>Reprendre une ancienne demande de chiffrage</summary>
      <label>Votre demande SAXSO au format texte<input data-legacy-file type="file" accept=".txt,text/plain"></label>
      <div data-legacy-lines></div><p data-legacy-note role="status"></p>
      <button type="button" class="sxo-secondary" data-legacy-import hidden>Confirmer les palettes et ajouter</button>
    </details>
    <button type="button" class="sxo-secondary" data-continue>Continuer ma sélection</button>
    <p class="sxo-message" data-confirmation role="status"></p>
    <form data-order-form>
      <fieldset data-customer>
        <legend>Magasin et livraison</legend>
        <div class="sxo-profile-row"><label>Profil vendeur<select data-profile><option value="">Coordonnées du magasin</option></select></label><button type="button" data-new-profile class="sxo-secondary">Nouveau vendeur</button></div>
        <p class="sxo-help" data-profile-status role="status"></p>
        <div class="sxo-fields">
          <label>Magasin<input name="store" maxlength="160" autocomplete="organization" required></label>
          <label>E-mail<input name="email" type="email" maxlength="254" autocomplete="email" required></label>
          <label class="sxo-wide">Adresse de livraison complète<textarea name="address" rows="2" maxlength="500" autocomplete="street-address" required></textarea></label>
          <label>Nom du contact<input name="contact" maxlength="120" autocomplete="name" required></label>
          <label>Téléphone du contact<input name="phone" type="tel" maxlength="40" autocomplete="tel" required></label>
        </div>
        <button type="button" data-save-profile class="sxo-secondary">Enregistrer ce profil vendeur</button>
      </fieldset>
      <label class="sxo-comment">Commentaire pour l’usine <small>(facultatif)</small><textarea name="comment" rows="3" maxlength="1800" placeholder="Accès livraison, horaires de réception, référence chantier…"></textarea></label>
      <div class="sxo-actions">
        <div class="sxo-print-row"><button type="button" data-download class="sxo-secondary">Enregistrer le PDF</button><button type="button" data-print class="sxo-secondary">Imprimer</button></div>
        <button type="button" class="sxo-secondary" data-quote hidden>Demander un chiffrage par e-mail</button>
        <p class="sxo-help">Le bon de commande PDF sera envoyé à Dora (export@saxso.it) et à jerome@leroyfactory.fr.</p>
        <button type="submit" class="sxo-primary" data-send>Envoyer la commande</button>
      </div>
    </form>
    <button type="button" class="sxo-primary" data-restart hidden>Commencer une nouvelle commande</button>
    <p class="sxo-message" data-status role="status" aria-live="polite"></p>
  </div>`;

export function createSaxsoCheckout({root, catalogue, netIndex, getPrices, onChange = () => {}}) {
  attachStyles();
  const products = new Map(catalogue.collections.flatMap(collection =>
    collection.variants.map(variant => [variant.id, {variant, collection}])));
  const rows = new Map((netIndex?.rows || []).flatMap(row => row.variantIds.map(id => [id,row])));
  const dialog = document.createElement('dialog');
  dialog.className = 'sxo-dialog';
  dialog.setAttribute('aria-label', 'Panier SAXSO');
  dialog.innerHTML = dialogMarkup;
  root.append(dialog);
  const field = selector => dialog.querySelector(selector);
  const form = field('[data-order-form]');
  let account = accountKey(session());
  let draft = readDraft(account, products);
  let baseCustomer = {}, profiles = [], busy = false, generation = 0;
  let profilesLoaded = false, pendingProfiles = false, invalidQuantity = false;
  let returnFocus = null;
  let legacyLines = [];
  let offerLegacyImport = false;
  try { offerLegacyImport = !!localStorage.getItem('lrf-saxso-selection-v1'); } catch {}

  function availability(id) {
    const row = rows.get(id);
    const price = getPrices()?.byVariant.get(id);
    const perPallet = Number(row?.perPallet);
    const amount = price?.amount;
    const reason = !row ? 'Tarif sur demande'
      : !price ? 'Prix réservé aux clients PRO autorisés'
      : !(perPallet > 0) ? 'Conditionnement à confirmer' : '';
    return {orderable:!reason && amount > 0, reason, perPallet:perPallet || null, unit:row?.unit || '',
      weightPerUnit:row?.weightPerUnit || null, amount:amount ?? null, packType:row?.packType || ''};
  }
  const summary = () => calculateSaxsoCart(draft.lines, availability);
  function persist() {
    try { sessionStorage.setItem(draftKey(account), JSON.stringify(draft)); } catch {}
  }
  function invalidateOrder() {
    draft.requestId = crypto.randomUUID();
    draft.orderId = '';
    field('[data-status]').textContent = '';
    persist();
  }
  function storeValues() {
    const values = Object.fromEntries(new FormData(form));
    draft.customer = copyCustomer(values);
    draft.comment = String(values.comment || '').trim();
    invalidateOrder();
  }
  function fillCustomer(source) {
    const customer = copyCustomer(source);
    for (const name of FIELD_NAMES) form.elements.namedItem(name).value = customer[name];
  }
  function fillDraft() {
    fillCustomer(draft.customer || baseCustomer);
    form.elements.comment.value = draft.comment;
  }
  function renderActions() {
    const totals = summary();
    const closed = !!draft.orderId;
    const shortfall = Math.max(0, MINIMUM_PALLETS - totals.palettes);
    const canCreatePdf = totals.priced && !invalidQuantity && !busy;
    form.hidden = !totals.count;
    field('[data-legacy]').hidden = !offerLegacyImport || !!totals.count;
    field('[data-login]').hidden = !!session();
    field('[data-send]').disabled = !canCreatePdf || shortfall > 0 || closed;
    field('[data-download]').disabled = !canCreatePdf;
    field('[data-print]').disabled = !canCreatePdf;
    field('[data-quote]').hidden = !totals.missing || closed;
    field('[data-quote]').disabled = busy || invalidQuantity;
    field('[data-customer]').disabled = busy || closed;
    form.elements.comment.disabled = busy || closed;
    field('[data-restart]').hidden = !closed;
    field('[data-confirmation]').textContent = closed
      ? 'Commande ' + draft.orderId + ' transmise à Dora et à Jérôme.' : '';
    field('[data-volume]').textContent = totals.palettes + ' palette' + (totals.palettes === 1 ? '' : 's');
    field('[data-total-label]').textContent = totals.missing ? 'Sous-total chiffré HT' : 'Total net HT';
    field('[data-money]').textContent = totals.missing === totals.count && totals.count > 0 ? 'À confirmer' : MONEY.format(totals.totalHT);
    const notes = [];
    if (shortfall) notes.push('Encore ' + shortfall + ' palette' + (shortfall > 1 ? 's' : '') + ' pour commander. Vous pouvez mélanger les références.');
    else notes.push('Minimum de 4 palettes atteint · Tarif rendu.');
    if (totals.missing) notes.push('Un prix net et un conditionnement confirmés sont nécessaires pour chaque ligne.');
    field('[data-condition]').textContent = notes.join(' ');
    field('[data-condition]').classList.toggle('sxo-ready', totals.priced && !shortfall);
    onChange(totals);
  }
  function renderLines() {
    invalidQuantity = false;
    const {items} = summary();
    field('[data-items]').innerHTML = items.length ? items.map(item => {
      const {variant, collection} = products.get(item.variantId);
      const display = rows.get(item.variantId)?.label || variant.label;
      const pack = item.perPallet ? NUMBER.format(item.perPallet) + ' ' + item.unit + ' / ' + (item.packType || 'palette') : '';
      const amount = item.amount ? MONEY.format(item.amount) + ' HT / ' + item.unit : '';
      return `<article class="sxo-line" data-line="${safe(item.variantId)}">
        <div class="sxo-description"><strong>${safe(collection.name)}</strong><span>${safe(display)}</span>
        <small>${safe([pack, amount].filter(Boolean).join(' · ') || item.reason)}</small></div>
        <div class="sxo-line-actions"><label>Palettes<input type="number" min="1" max="999" step="1" inputmode="numeric" data-quantity value="${item.palettes}" ${busy || draft.orderId ? 'disabled' : ''} aria-label="Palettes pour ${safe(display)}"></label>
        <div class="sxo-line-total"><strong data-line-money>${item.cents === null ? safe(item.reason) : MONEY.format(item.cents / 100)}</strong><small data-line-units>${item.quantity === null ? '' : NUMBER.format(item.quantity) + ' ' + safe(item.unit)}</small></div>
        <button class="sxo-remove" type="button" data-remove ${busy || draft.orderId ? 'disabled' : ''} aria-label="Retirer ${safe(display)}">Retirer</button></div>
      </article>`;
    }).join('') : '<p class="sxo-empty">Votre panier est vide. Choisissez une pierre, puis le nombre de palettes.</p>';
    renderActions();
  }
  function renderProfileOptions() {
    const select = field('[data-profile]');
    select.innerHTML = '<option value="">Coordonnées du magasin</option>' + profiles.map(p =>
      `<option value="${safe(p.id)}">${safe(p.contact || p.email)}${p.store ? ' · ' + safe(p.store) : ''}</option>`).join('');
    select.value = profiles.some(p => p.id === draft.profileId) ? draft.profileId : '';
  }
  async function loadProfiles() {
    const s = session();
    if (!s || busy || profilesLoaded || pendingProfiles) return;
    const version = generation;
    pendingProfiles = true;
    field('[data-profile-status]').textContent = 'Chargement des coordonnées du magasin…';
    try {
      const result = await postOrder('profile', {}, s);
      if (version !== generation || accountKey(session()) !== account) return;
      profiles = result.profiles || [];
      baseCustomer = {...copyCustomer(result.customer), store:result.customer?.store || s.societe || ''};
      profilesLoaded = true;
      renderProfileOptions();
      // A customer can begin typing while their CRM record is loading.
      if (!draft.customer) fillCustomer(baseCustomer);
      else for (const name of FIELD_NAMES) {
        const input = form.elements.namedItem(name);
        if (!input.value && !draft.customer[name] && !input.dataset.edited) input.value = baseCustomer[name] || '';
      }
      field('[data-profile-status]').textContent = '';
    } catch(error) {
      if (version === generation) field('[data-profile-status]').textContent = error.message;
    } finally {
      if (version === generation) pendingProfiles = false;
    }
  }
  function resetSession() {
    const next = accountKey(session());
    if (next === account) { renderLines(); if (dialog.open) loadProfiles(); return; }
    const visitorLines = account === 'visitor' ? draft.lines : [];
    generation++;
    clearLegacyImport();
    account = next;
    draft = readDraft(account, products);
    if (visitorLines.length && !draft.lines.length && account !== 'visitor') {
      draft.lines = visitorLines.map(line => ({...line}));
      persist();
      try { sessionStorage.removeItem(draftKey('visitor')); } catch {}
    }
    busy = false;
    pendingProfiles = false;
    profilesLoaded = false;
    profiles = [];
    baseCustomer = {store:session()?.societe || ''};
    renderProfileOptions();
    for (const input of form.elements) delete input.dataset.edited;
    fillDraft();
    field('[data-profile-status]').textContent = '';
    field('[data-status]').textContent = '';
    renderLines();
    if (dialog.open) loadProfiles();
  }
  function add(id, count) {
    const palettes = Number(count);
    if (busy || draft.orderId) return {ok:false, message:'Ouvrez le panier pour commencer une nouvelle commande.'};
    if (!products.has(id) || !validPallets(palettes)) return {ok:false, message:'Indiquez un nombre entier de palettes entre 1 et 999.'};
    const row = draft.lines.find(line => line.variantId === id);
    if (row && !validPallets(row.palettes + palettes)) return {ok:false, message:'Le maximum est de 999 palettes pour cette référence.'};
    if (!row && draft.lines.length >= MAX_LINES) return {ok:false, message:'Une commande peut contenir jusqu’à 100 références.'};
    if (row) row.palettes += palettes;
    else draft.lines.push({variantId:id, palettes});
    invalidateOrder();
    renderLines();
    return {ok:true, message:palettes + ' palette' + (palettes > 1 ? 's ajoutées' : ' ajoutée') + ' au panier.'};
  }
  function open(trigger) {
    returnFocus = trigger || document.activeElement;
    if (accountKey(session()) !== account) resetSession();
    baseCustomer.store ||= session()?.societe || '';
    fillDraft();
    renderLines();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    loadProfiles();
  }
  function validate() {
    const phone = form.elements.phone;
    phone.setCustomValidity(phone.value.replace(/\D/g, '').length < 6 ? 'Indiquez le numéro de téléphone de votre contact.' : '');
    return form.reportValidity();
  }
  async function saveProfile() {
    if (busy || !validate()) return;
    const version = generation;
    const customer = copyCustomer(Object.fromEntries(new FormData(form)));
    const profileId = draft.profileId || crypto.randomUUID();
    busy = true;
    renderLines();
    field('[data-profile-status]').textContent = 'Enregistrement du profil…';
    try {
      const saved = await postOrder('saveProfile', {customer, profileId}, session());
      if (version !== generation) return;
      const id = saved.profileId || profileId;
      profiles = [...profiles.filter(p => p.id !== id), {id, ...customer}];
      draft.profileId = id;
      draft.customer = customer;
      persist();
      renderProfileOptions();
      field('[data-profile-status]').textContent = 'Profil enregistré pour ce magasin.';
    } catch(error) {
      if (version === generation) field('[data-profile-status]').textContent = error.message;
    } finally {
      if (version === generation) { busy = false; renderLines(); }
    }
  }
  function requestQuote() {
    const totals = summary();
    if (busy || invalidQuantity || !totals.missing || !validate()) return;
    const customer = copyCustomer(Object.fromEntries(new FormData(form)));
    const subject = 'Demande de chiffrage SAXSO · ' + customer.store;
    const lines = totals.items.map(item => {
      const {variant, collection} = products.get(item.variantId);
      const ref = variant.reference || variant.label;
      return [
        collection.name + ' · ' + variant.label, 'Référence catalogue : ' + ref,
        item.palettes + ' palette(s)' + (item.quantity ? ' · ' + NUMBER.format(item.quantity) + ' ' + item.unit : '')
      ].join('\n');
    });
    const message = [
      'Bonjour Dora,', 'Merci de chiffrer les articles suivants et de confirmer leur disponibilité.',
      lines.join('\n\n'), 'Volume total : ' + totals.palettes + ' palette(s).',
      'Magasin : ' + customer.store, 'Livraison : ' + customer.address,
      'Contact : ' + customer.contact + ' · ' + customer.phone + ' · ' + customer.email,
      form.elements.comment.value.trim(), 'Merci,', customer.contact
    ].filter(Boolean).join('\n\n');
    const to = 'export@saxso.it', cc = 'jerome@leroyfactory.fr';
    const prefix = 'mailto:' + to + '?cc=' + cc + '&subject=' + encodeURIComponent(subject);
    const href = prefix + '&body=' + encodeURIComponent(message);
    if (href.length <= 7000) {
      location.href = href;
      field('[data-status]').textContent = 'Vérifiez puis envoyez la demande depuis votre messagerie.';
      return;
    }
    const attachment = new Blob([subject + '\n\n' + message], {type:'text/plain;charset=utf-8'});
    downloadFile(attachment, 'SAXSO-Demande-de-chiffrage.txt');
    location.href = prefix + '&body=' + encodeURIComponent('Bonjour Dora, veuillez trouver ma demande de chiffrage en pièce jointe.');
    field('[data-status]').textContent = 'La liste complète a été téléchargée. Joignez-la au message avant de l’envoyer.';
  }
  async function placeOrder(action) {
    const totals = summary();
    if (busy || invalidQuantity || !totals.priced || (!draft.orderId && !validate())) return;
    if (action === 'send' && (draft.orderId || totals.palettes < MINIMUM_PALLETS)) return;
    let popup;
    if (action === 'print') {
      popup = window.open('', '_blank');
      if (!popup) {
        field('[data-status]').textContent = 'Autorisez la fenêtre d’impression ou enregistrez le PDF pour l’imprimer.';
        return;
      }
      popup.opener = null;
      popup.document.body.textContent = 'Préparation du bon de commande…';
    }
    const version = generation;
    const customer = draft.orderId ? draft.customer : copyCustomer(Object.fromEntries(new FormData(form)));
    draft.customer = customer;
    draft.comment = form.elements.comment.value.trim();
    persist();
    busy = true;
    renderLines();
    const status = field('[data-status]');
    status.textContent = action === 'send' ? 'Envoi du bon PDF à Dora et à Jérôme…' : 'Préparation du bon PDF…';
    try {
      const result = await postOrder(action === 'send' ? 'send' : 'pdf', {
        requestId:draft.requestId, lines:draft.lines, customer, comment:draft.comment,
        expectedTotalCents:totals.totalCents
      }, session());
      if (version !== generation || accountKey(session()) !== account) { popup?.close(); return; }
      if (action === 'send') {
        if (!result?.success || !result.orderId) throw Error('L’envoi n’a pas été confirmé. Réessayez avec ce panier.');
        draft.orderId = result.orderId;
        persist();
        status.textContent = '';
        field('[data-confirmation]').scrollIntoView({block:'center'});
      } else if (action === 'download') {
        downloadFile(result, 'SAXSO-' + (draft.orderId || draft.requestId.slice(0,8)) + '.pdf');
        status.textContent = 'Le bon de commande PDF est prêt.';
      } else {
        await printPdf(popup, result);
        status.textContent = 'Le bon de commande est prêt à imprimer.';
      }
    } catch(error) {
      popup?.close();
      if (version === generation) status.textContent = error instanceof TypeError
        ? 'Connexion interrompue. Réessayez avec ce panier pour vérifier la même commande.' : error.message;
    } finally {
      if (version === generation) { busy = false; renderLines(); }
    }
  }
  function clearLegacyImport() {
    legacyLines = [];
    field('[data-legacy-file]').value = '';
    field('[data-legacy-lines]').replaceChildren();
    field('[data-legacy-note]').textContent = '';
    field('[data-legacy-import]').hidden = true;
    field('[data-legacy]').open = false;
  }
  field('[data-legacy-file]').onchange = async ({target}) => {
    const file = target.files?.[0], version = generation;
    legacyLines = [];
    field('[data-legacy-lines]').replaceChildren();
    field('[data-legacy-import]').hidden = true;
    if (!file || file.size > 2e6) {
      field('[data-legacy-note]').textContent = 'Choisissez le fichier texte SAXSO téléchargé précédemment (2 Mo maximum).';
      return;
    }
    try {
      const content = await file.text();
      if (version !== generation || target.files?.[0] !== file) return;
      legacyLines = readLegacyQuote(content, products, rows);
      const usable = legacyLines.filter(line => line.id);
      field('[data-legacy-note]').textContent = usable.length
        ? 'Vérifiez le nombre de palettes entières avant de les ajouter.'
        : 'Aucune référence de cette demande ne correspond au catalogue actuel.';
      field('[data-legacy-lines]').innerHTML = legacyLines.map((line,i) =>
        `<label>${safe(line.label)} · ${NUMBER.format(line.quantity)} ${safe(line.unit)}
        ${line.id ? `<input type="number" inputmode="numeric" min="1" max="999" step="1" data-legacy-count="${i}" value="${line.suggested || ''}" placeholder="Nombre de palettes">` : '<small>À rechercher dans le catalogue.</small>'}</label>`).join('');
      field('[data-legacy-import]').hidden = !usable.length;
    } catch {
      field('[data-legacy-note]').textContent = 'Ce fichier texte ne peut pas être lu.';
    }
  };
  field('[data-legacy-import]').onclick = () => {
    if (draft.lines.length || busy) return;
    const combined = new Map();
    for (const input of dialog.querySelectorAll('[data-legacy-count]')) {
      const id = legacyLines[Number(input.dataset.legacyCount)]?.id;
      if (!id || !input.value) continue;
      const pallets = (combined.get(id) || 0) + input.valueAsNumber;
      if (!validPallets(pallets) || !validPallets(input.valueAsNumber)) {
        field('[data-legacy-note]').textContent = 'Saisissez de 1 à 999 palettes entières par référence.';
        input.focus(); return;
      }
      combined.set(id,pallets);
    }
    if (!combined.size || combined.size > MAX_LINES) {
      field('[data-legacy-note]').textContent = 'Choisissez de 1 à 100 références.'; return;
    }
    draft.lines = [...combined].map(([variantId,palettes]) => ({variantId,palettes}));
    clearLegacyImport();
    invalidateOrder();
    renderLines();
  };
  field('[data-close-cart]').onclick = field('[data-continue]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => returnFocus?.focus?.({preventScroll:true}));
  dialog.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove]');
    if (!remove || busy || draft.orderId) return;
    draft.lines = draft.lines.filter(line => line.variantId !== remove.closest('[data-line]').dataset.line);
    invalidateOrder();
    renderLines();
  });
  field('[data-items]').addEventListener('input', event => {
    if (!event.target.matches('[data-quantity]') || busy || draft.orderId) return;
    const input = event.target;
    const palettes = input.valueAsNumber;
    input.setCustomValidity(validPallets(palettes) ? '' : 'De 1 à 999 palettes entières.');
    invalidQuantity = !!field('[data-quantity]:invalid');
    if (validPallets(palettes)) {
      const row = input.closest('[data-line]');
      const line = draft.lines.find(line => line.variantId === row.dataset.line);
      line.palettes = palettes;
      invalidateOrder();
      const item = summary().items.find(item => item.variantId === row.dataset.line);
      row.querySelector('[data-line-money]').textContent = item.cents === null ? item.reason : MONEY.format(item.cents / 100);
      row.querySelector('[data-line-units]').textContent = item.quantity === null ? '' : NUMBER.format(item.quantity) + ' ' + item.unit;
    }
    renderActions();
  });
  form.addEventListener('input', event => {
    if (busy || draft.orderId || !event.target.name) return;
    event.target.dataset.edited = 'true';
    event.target.setCustomValidity('');
    storeValues();
  });
  field('[data-profile]').onchange = event => {
    draft.profileId = event.target.value;
    fillCustomer(profiles.find(p => p.id === draft.profileId) || baseCustomer);
    storeValues();
    field('[data-profile-status]').textContent = '';
  };
  field('[data-new-profile]').onclick = () => {
    const {store, address} = copyCustomer(Object.fromEntries(new FormData(form)));
    draft.profileId = '';
    renderProfileOptions();
    fillCustomer({store, address, email:baseCustomer.email});
    storeValues();
    field('[data-profile-status]').textContent = 'Renseignez le contact, puis enregistrez son profil.';
    form.elements.contact.focus();
  };
  field('[data-save-profile]').onclick = saveProfile;
  field('[data-quote]').onclick = requestQuote;
  field('[data-download]').onclick = () => placeOrder('download');
  field('[data-print]').onclick = () => placeOrder('print');
  form.onsubmit = event => { event.preventDefault(); placeOrder('send'); };
  field('[data-restart]').onclick = () => {
    const {customer, profileId} = draft;
    draft = {...defaultDraft(), customer, profileId};
    persist();
    fillDraft();
    field('[data-status]').textContent = '';
    renderLines();
    dialog.close();
  };
  fillDraft();
  renderLines();
  return {open, add, availability, summary, refresh:renderLines, resetSession};
}
