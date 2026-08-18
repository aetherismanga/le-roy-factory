import { db } from './firebase.js';
import { collection, getDocs, query, where, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const SESSION_KEY = 'lrfProSession';
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = v => String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const depFromCp = cp => {
  const s = String(cp || '').replace(/\s/g, '');
  if (!/^\d{5}$/.test(s)) return '';
  if (s.startsWith('97') || s.startsWith('98')) return s.slice(0, 3);
  if (s.startsWith('20')) return Number(s) >= 20200 ? '2B' : '2A';
  return s.slice(0, 2);
};
const clientDep = c => String(c.departement || depFromCp(c.codePostal || c.code_postal) || '').trim().toUpperCase();
const hasElios = partners => (partners || []).some(p => norm(p).includes('elios'));

function setError(box, message) {
  if (!box) return;
  box.textContent = message || '';
  box.classList.toggle('show', !!message);
}

function currentProduct() {
  const name = $('#product-dialog .modal-info h2')?.textContent?.trim();
  return (window.ELIOS_CATALOGUE || []).find(p => p.name === name) || null;
}

function refreshPrices() {
  const api = window.LRF_INSPIRATIONS_PRICING;
  const product = currentProduct();
  if (!api || !product) return;
  $('#product-dialog')?.querySelectorAll('.formats-table tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) return;
    const format = cells[0].textContent.trim();
    const quote = api.getPrice('elios-ceramica', product, format);
    if (!quote || quote.locked) return;
    cells[1].innerHTML = quote.unavailable
      ? '<span class="price-unavailable">Sur demande</span>'
      : `<span class="price-ready">${esc(quote.label || quote.amount)}</span>${quote.note ? `<small class="price-note">${esc(quote.note)}</small>` : ''}`;
  });
  const callout = $('#product-dialog .price-access-callout');
  const session = api.getSession?.();
  if (callout) {
    callout.className = 'price-access-callout allowed';
    callout.innerHTML = `<strong>✓ Accès tarif ELIOS actif</strong>${session?.societe ? `<span>${esc(session.societe)}</span>` : ''}<span>Les tarifs sont affichés directement dans cette fiche.</span>`;
  }
}

async function authenticate(codeInput, depInput, button, errorBox) {
  const code = String(codeInput.value || '').trim().toUpperCase();
  const dep = String(depInput.value || '').trim().toUpperCase();
  setError(errorBox, '');
  if (!/^LRF-\d{5}$/.test(code) || !dep) {
    setError(errorBox, 'Vérifiez votre identifiant LRF et votre département.');
    return;
  }
  button.disabled = true;
  button.textContent = 'Vérification…';
  try {
    const snap = await getDocs(query(collection(db, 'clients'), where('codeClient', '==', code), limit(2)));
    if (snap.empty) throw new Error('Identifiant client inconnu.');
    const doc = snap.docs[0];
    const client = { id: doc.id, ...doc.data() };
    if (String(client.type || 'client').toLowerCase() === 'prospect') throw new Error('Cet accès est réservé aux clients professionnels actifs.');
    if (clientDep(client) !== dep) throw new Error('Le département ne correspond pas à ce compte client.');
    const partners = [...new Set(Array.isArray(client.partenaires) ? client.partenaires : [])];
    if (!hasElios(partners)) throw new Error('Votre compte ne dispose pas encore de l’accès tarif ELIOS. Contactez votre agent LE ROY FACTORY.');
    const activity = client.categorieActivite || client.sousCategorie || client.segmentation || 'Professionnel';
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      codeClient: client.codeClient || code,
      clientId: client.id || '',
      societe: client.societe || 'Client professionnel',
      departement: clientDep(client),
      activite: activity,
      partenaires: partners
    }));
    window.LRF_PRO_CONTEXT = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    refreshPrices();
  } catch (e) {
    console.error('Connexion PRO Inspirations', e);
    setError(errorBox, e?.message || 'Impossible de vérifier le compte pour le moment.');
  } finally {
    button.disabled = false;
    button.textContent = 'Afficher mes tarifs';
  }
}

function installInlineLogin() {
  const callout = $('#product-dialog .price-access-callout:not(.allowed)');
  if (!callout || callout.dataset.inlineReady === '1') return;
  callout.dataset.inlineReady = '1';
  callout.classList.add('inline-pro-access');
  callout.innerHTML = `
    <strong>🔒 Tarifs réservés aux comptes autorisés</strong>
    <span>Connectez-vous ici : vous restez sur cette fiche produit.</span>
    <div class="inline-pro-fields">
      <input id="inline-pro-code" type="text" autocomplete="off" placeholder="Identifiant LRF (ex. LRF-00235)" aria-label="Identifiant client LRF">
      <input id="inline-pro-dept" type="text" autocomplete="off" placeholder="Département (ex. 34)" aria-label="Département">
      <button id="inline-pro-submit" type="button">Afficher mes tarifs</button>
    </div>
    <div id="inline-pro-error" class="inline-pro-error" role="alert"></div>`;
  const code = $('#inline-pro-code', callout);
  const dep = $('#inline-pro-dept', callout);
  const btn = $('#inline-pro-submit', callout);
  const err = $('#inline-pro-error', callout);
  code.addEventListener('input', e => {
    let v = e.target.value.toUpperCase().replace(/\s/g, '');
    if (/^\d{1,5}$/.test(v)) v = `LRF-${v.padStart(5, '0')}`;
    e.target.value = v;
  });
  const submit = () => authenticate(code, dep, btn, err);
  btn.addEventListener('click', submit);
  [code, dep].forEach(input => input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
}

const dialog = document.getElementById('product-dialog');
if (dialog) new MutationObserver(installInlineLogin).observe(dialog, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', installInlineLogin, { once: true });
