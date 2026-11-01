(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const labels = values => [...new Set((values || []).map(value => typeof value === 'string' ? value : value?.name).filter(Boolean))];
  const form = $('#fenice-request-form'), container = $('#fenice-request-lines');
  if (!form || !container) return;
  let products = [], lines = [], sequence = 0, preparedText = '', preparedSubject = '';
  const params = new URLSearchParams(location.search);
  const profile = () => $('input[name="profile"]:checked', form)?.value || 'private';
  const productOf = line => products.find(product => product.slug === line.slug);
  const pieceOnly = product => norm(product?.unit) === 'piece' || norm(product?.unit) === 'pieces';
  const session = () => { try { return window.LRF_PRO_SESSION?.read?.() || JSON.parse(sessionStorage.getItem('lrfProSession') || 'null'); } catch { return null; } };
  function options(values, selected, placeholder) {
    return `<option value="">${esc(placeholder)}</option>${labels(values).map(value => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(value)}</option>`).join('')}`;
  }
  function hidePreview() { $('#request-preview').hidden = true; }
  function updateMode() {
    const professional = profile() === 'professional';
    $('#company').required = professional;
    $('#company-required').textContent = professional ? '*' : '(facultatif)';
    $('#mode-note').textContent = professional ? 'Préparez votre demande de commande : l’agence confirmera les références, tarifs et conditions avant validation.' : 'Nous vous renseignons et vous orientons vers un négoce partenaire pour votre projet.';
    container.querySelectorAll('[data-field="format"]').forEach(select => { select.required = professional && select.options.length > 1; });
    container.querySelectorAll('[data-field="qty"]').forEach(input => { input.required = professional; });
    hidePreview();
  }
  function render() {
    container.innerHTML = lines.map((line, index) => {
      const product = productOf(line), formats = labels(product?.formats), colors = labels(product?.colors), onlyPieces = pieceOnly(product);
      if (onlyPieces) line.unit = 'pièces';
      return `<article class="product-line" data-line="${line.key}"><div class="line-head"><h3>Produit ${index + 1}</h3>${lines.length > 1 ? '<button type="button" class="remove-line" data-remove>Retirer ce produit</button>' : ''}</div><div class="line-grid"><label class="wide" for="collection-${line.key}">Collection <span aria-hidden="true">*</span><select id="collection-${line.key}" data-field="slug" required><option value="">Choisir une collection</option>${products.map(item => `<option value="${esc(item.slug)}"${line.slug === item.slug ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label><label for="format-${line.key}">Format${profile() === 'professional' && formats.length ? ' *' : ''}<select id="format-${line.key}" data-field="format"${!product || !formats.length ? ' disabled' : ''}${profile() === 'professional' && formats.length ? ' required' : ''}>${options(formats, line.format, formats.length ? 'Choisir le format' : 'À confirmer avec l’agence')}</select></label><label for="color-${line.key}">Coloris<select id="color-${line.key}" data-field="color"${!product || !colors.length ? ' disabled' : ''}>${options(colors, line.color, 'À préciser / à confirmer')}</select></label><label for="quantity-${line.key}">Quantité souhaitée${profile() === 'professional' ? ' *' : ''}<span class="quantity-field"><input id="quantity-${line.key}" data-field="qty" type="number" min="${onlyPieces ? 1 : 0.01}" max="100000" step="${onlyPieces ? 1 : 'any'}" inputmode="${onlyPieces ? 'numeric' : 'decimal'}" value="${esc(line.qty)}"${profile() === 'professional' ? ' required' : ''}><select data-field="unit" aria-label="Unité de la quantité du produit ${index + 1}">${onlyPieces ? '<option value="pièces">pièces</option>' : `<option value="m²"${line.unit === 'm²' ? ' selected' : ''}>m²</option><option value="pièces"${line.unit === 'pièces' ? ' selected' : ''}>pièces</option><option value="ml"${line.unit === 'ml' ? ' selected' : ''}>ml</option>`}</select></span></label><label for="finish-${line.key}">Finition / référence, si connue<input id="finish-${line.key}" data-field="reference" value="${esc(line.reference)}" maxlength="220" placeholder="À confirmer si vous ne la connaissez pas"></label></div></article>`;
    }).join('');
  }
  function addLine(initial = {}) {
    if (lines.length >= 30) { $('#catalogue-status').textContent = 'Vous pouvez préparer jusqu’à 30 lignes dans une demande.'; return; }
    lines.push({key: ++sequence, slug: '', format: '', color: '', qty: '', unit: 'm²', reference: '', ...initial});
    render(); hidePreview();
  }
  container.addEventListener('input', event => {
    const field = event.target.dataset.field, key = Number(event.target.closest('[data-line]')?.dataset.line);
    const line = lines.find(item => item.key === key);
    if (!line || !field) return;
    line[field] = event.target.value; hidePreview();
  });
  container.addEventListener('change', event => {
    if (event.target.dataset.field !== 'slug') return;
    const line = lines.find(item => item.key === Number(event.target.closest('[data-line]')?.dataset.line));
    if (!line) return;
    line.slug = event.target.value; line.format = ''; line.color = '';
    line.unit = pieceOnly(productOf(line)) ? 'pièces' : 'm²';
    if (line.unit === 'pièces' && line.qty && !Number.isInteger(Number(line.qty))) line.qty = '';
    render();
    $(`#format-${line.key}`, container)?.focus();
  });
  container.addEventListener('click', event => {
    if (!event.target.closest('[data-remove]')) return;
    const key = Number(event.target.closest('[data-line]')?.dataset.line);
    lines = lines.filter(line => line.key !== key); render(); hidePreview(); $('#add-line').focus();
  });
  $('#add-line').addEventListener('click', () => { addLine(); $(`#collection-${sequence}`)?.focus(); });
  form.addEventListener('input', event => { if (!event.target.closest('#fenice-request-lines')) hidePreview(); });
  form.querySelectorAll('input[name="profile"]').forEach(input => input.addEventListener('change', () => { render(); updateMode(); }));
  function requestText() {
    const professional = profile() === 'professional', s = session();
    const blocks = lines.map((line, index) => {
      const product = productOf(line);
      return [`PRODUIT ${index + 1} — ${product.name}`, `Format : ${line.format || 'à confirmer'}`, `Coloris : ${line.color || 'à confirmer'}`, `Quantité souhaitée : ${line.qty ? Number(line.qty).toLocaleString('fr-FR', {maximumFractionDigits: 3}) + ' ' + line.unit : 'à préciser'}`, `Finition / référence : ${line.reference || 'à confirmer'}`, product.sourceUrl || product.url ? `Fiche fabricant : ${product.sourceUrl || product.url}` : ''].filter(Boolean).join('\n');
    });
    return [professional ? 'DEMANDE DE COMMANDE LA FENICE' : 'DEMANDE DE RENSEIGNEMENT LA FENICE', '', ...blocks.flatMap(block => [block, '']), 'MES COORDONNÉES', `Profil : ${professional ? 'professionnel' : 'particulier'}`, `Société : ${$('#company').value.trim() || '—'}`, `Contact : ${$('#contact').value.trim()}`, `E-mail : ${$('#email').value.trim()}`, `Téléphone : ${$('#phone').value.trim() || '—'}`, `Projet : ${$('#postcode').value.trim()} ${$('#city').value.trim()}`.trim(), professional && /^LRF-\d{5}$/i.test(s?.codeClient || '') ? `Code client : ${s.codeClient}` : '', '', 'MON PROJET / MES QUESTIONS', $('#message').value.trim() || '—', '', 'Merci de confirmer les références, tarifs, disponibilité et conditionnements avant toute validation.'].filter(value => value !== undefined).join('\n');
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const error = $('#request-error'); error.hidden = true;
    if (!form.reportValidity()) return;
    if (!lines.length || lines.some(line => !productOf(line))) { error.textContent = 'Choisissez une collection pour chaque produit.'; error.hidden = false; return; }
    if (lines.some(line => line.qty && (!Number.isFinite(Number(line.qty)) || Number(line.qty) <= 0 || (line.unit === 'pièces' && !Number.isInteger(Number(line.qty)))))) { error.textContent = 'Vérifiez les quantités. Le nombre de pièces doit être entier.'; error.hidden = false; return; }
    preparedText = requestText();
    preparedSubject = `[LA FENICE — ${profile() === 'professional' ? 'DEMANDE DE COMMANDE' : 'RENSEIGNEMENT'}] ${$('#company').value.trim() || $('#contact').value.trim()} — ${lines.length} produit${lines.length > 1 ? 's' : ''}`;
    $('#request-text').value = preparedText;
    $('#open-email').href = `mailto:jerome@leroyfactory.fr?cc=${encodeURIComponent('coryne@leroyfactory.fr')}&subject=${encodeURIComponent(preparedSubject)}&body=${encodeURIComponent(preparedText)}`;
    $('#request-feedback').textContent = 'La demande n’a pas encore été envoyée. Envoyez-la depuis votre messagerie.';
    $('#request-preview').hidden = false; $('#request-preview').focus({preventScroll: true}); $('#request-preview').scrollIntoView({behavior: 'smooth', block: 'start'});
  });
  $('#open-email').addEventListener('click', () => { $('#request-feedback').textContent = 'Votre messagerie va s’ouvrir. Vérifiez le texte et les destinataires, puis envoyez la demande depuis votre messagerie.'; });
  $('#copy-request').addEventListener('click', async () => {
    const text = `À : jerome@leroyfactory.fr\nCopie : coryne@leroyfactory.fr\nObjet : ${preparedSubject}\n\n${preparedText}`;
    try { await navigator.clipboard.writeText(text); $('#request-feedback').textContent = 'Récapitulatif copié. Collez-le dans votre e-mail pour l’envoyer.'; }
    catch { $('#request-text').focus(); $('#request-text').select(); $('#request-feedback').textContent = 'Sélectionnez « Copier » dans le menu du texte, puis collez-le dans votre e-mail.'; }
  });
  $('#download-request').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([`À : jerome@leroyfactory.fr\nCopie : coryne@leroyfactory.fr\nObjet : ${preparedSubject}\n\n${preparedText}`], {type: 'text/plain;charset=utf-8'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'demande-la-fenice.txt'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  async function init() {
    updateMode();
    try {
      const response = await fetch('assets/data/fenice-catalogue.json?v=20261101');
      if (!response.ok) throw Error('Catalogue indisponible');
      const data = await response.json();
      products = (data.collections || []).map(product => ({...product, slug: product.slug || String(product.id || '').replace(/^fenice-/, '')})).filter(product => product.slug && product.name).sort((a,b) => a.name.localeCompare(b.name, 'fr', {sensitivity: 'base'}));
      if (!products.length) throw Error('Catalogue vide');
      const s = session(), isProfessional = s && (s.isAdmin || s.admin || (s.partenaires || []).some(partner => norm(partner) === 'lafenice'));
      if (isProfessional) $('input[value="professional"][name="profile"]').checked = true;
      if (s?.societe) $('#company').value = s.societe;
      if (s?.email) $('#email').value = s.email;
      if (s?.telephone) $('#phone').value = s.telephone;
      const wanted = params.get('collection') || '', product = products.find(item => item.slug === wanted || item.id === wanted || norm(item.name) === norm(wanted));
      const format = params.get('format') || '';
      addLine(product ? {slug: product.slug, format: labels(product.formats).includes(format) ? format : '', unit: pieceOnly(product) ? 'pièces' : 'm²'} : {});
      $('#catalogue-status').textContent = `${products.length} collections La Fenice · choix par ordre alphabétique`;
      $('#add-line').disabled = false; $('#prepare-email').disabled = false; updateMode();
    } catch {
      $('#catalogue-status').textContent = 'Les collections ne peuvent pas être chargées. Contactez l’agence à jerome@leroyfactory.fr ou réessayez en rechargeant cette page.';
    }
  }
  init();
})();
