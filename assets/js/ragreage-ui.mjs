import { calculate, SUPPORTS } from './ragreage-core.mjs?v=20261103-1';

const $ = id => document.getElementById(id);
const form = $('project-form');
const storeKey = 'lrf-ragreage-v1';
const fields = ['support','location','condition','heating','finish','slope','porosity','area','thickness','minThickness','maxThickness','margin','product','rate','bag'];
const numberFields = new Set(['area','thickness','minThickness','maxThickness','rate','bag']);
const words = { location:{inside:'Intérieur',outside:'Extérieur'}, finish:{tile:'Carrelage',soft:'Sol souple',parquet:'Parquet',bare:'Nu — annexe / extérieur'}, heating:{none:'Sans chauffage au sol',water:'Chauffage à eau / réversible',electric:'Plancher rayonnant électrique'} };
const fmt = (n, digits = 1) => Number(n).toLocaleString('fr-FR', {maximumFractionDigits:digits});
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list = values => values.map(value => `<li>${esc(value)}</li>`).join('');
let lastResult;
let timer;

function readInput() {
  const data = Object.fromEntries(new FormData(form));
  for (const name of numberFields) {
    const raw = String(data[name] ?? '').trim();
    data[name] = raw === '' ? null : Number(raw.replace(',', '.'));
  }
  data.margin = Number(data.margin);
  return data;
}

function restore() {
  let saved;
  const query = new URLSearchParams(location.search);
  if (query.get('calc') === '1') saved = Object.fromEntries(query);
  else { try { saved = JSON.parse(localStorage.getItem(storeKey)); } catch {} }
  if (!saved || typeof saved !== 'object') return;
  for (const key of fields) {
    if (!Object.hasOwn(saved,key) || saved[key] === null || typeof saved[key] === 'object') continue;
    const control = form.elements.namedItem(key);
    if (!control) continue;
    const value = String(saved[key]).slice(0,60);
    if (control instanceof RadioNodeList) {
      if ([...control].some(item => item.value === value)) control.value = value;
    } else if (control.tagName === 'SELECT') {
      if ([...control.options].some(item => item.value === value)) control.value = value;
    } else control.value = value;
  }
  if (saved.product === 'custom') form.querySelector('.product-details').open = true;
  if (saved.minThickness != null || saved.maxThickness != null) form.querySelector('.measure-details').open = true;
}

function render() {
  const input = readInput();
  const result = calculate(input);
  lastResult = result;
  $('slope-field').hidden = input.location !== 'outside';
  $('porosity-field').hidden = !['cement','concrete'].includes(input.support);
  $('custom-fields').hidden = input.product !== 'custom';
  const support = SUPPORTS.find(item => item.id === input.support);
  $('support-note').textContent = support?.description ?? '';
  $('print').disabled = !result.valid || result.blocked;
  $('status-label').textContent = !result.valid ? 'Saisie à compléter' : result.blocked ? 'Diagnostic nécessaire' : 'Calcul en direct';
  for (const id of numberFields) $(id).removeAttribute('aria-invalid');
  if (!result.valid) {
    for (const id of numberFields) {
      if ((['area','thickness','rate','bag'].includes(id) && input[id] === null) || (input[id] !== null && (!Number.isFinite(input[id]) || input[id] <= 0))) $(id).setAttribute('aria-invalid','true');
    }
    $('result-body').innerHTML = `<div class="result-block"><h3>Précisons vos mesures.</h3><ul>${list(result.errors)}</ul><p>Le résultat se met à jour dès que les valeurs sont renseignées.</p></div>`;
  } else if (result.blocked) {
    $('result-body').innerHTML = `<div class="result-block"><h3>Un point à régler<br>avant de ragréer.</h3><ul>${list(result.blocks)}</ul><p>Le nombre de sacs sera affiché après résolution de ces points. Une quantité calculée ne garantit pas la compatibilité du système.</p>${result.product.url ? `<a class="result-source" href="${esc(result.product.url)}" target="_blank" rel="noopener">Consulter la fiche de ${esc(result.product.label)} ↗</a>` : ''}</div>`;
  } else {
    const r = result;
    const primaryQuantity = r.primaryMin === null ? '' : `<p><strong>${fmt(r.primaryMin,2)} à ${fmt(r.primaryMax,2)} kg</strong> pour ${fmt(r.area)} m², pour une passe. À ajuster selon l’absorption et le nombre de couches ; conditionnement à arrondir séparément.</p>`;
    $('result-body').innerHTML = `
      <div class="bag-number"><strong>${fmt(r.bags,0)}</strong><span>${r.bags === 1 ? 'sac' : 'sacs'}</span></div>
      <p class="bag-caption">de ${fmt(r.bag)} kg · réserve de ${fmt(r.margin,0)} % incluse</p>
      <dl class="result-metrics"><div><dt>Poudre, réserve incluse</dt><dd>${fmt(r.totalKg)} <small>kg</small></dd></div><div><dt>Quantité à commander</dt><dd>${fmt(r.purchasedKg)} <small>kg</small></dd></div></dl>
      <p class="result-product">${esc(r.product.type)}</p>
      <p class="result-type">${r.product.id === 'custom' ? 'Votre fiche technique' : `Base documentée : ${esc(r.product.label)}`}<br>${fmt(r.rate,2)} kg/m²/mm${r.product.min === null ? '' : ` · ${fmt(r.product.min)} à ${fmt(r.product.max)} mm`}</p>
      ${r.product.url ? `<a class="result-source" href="${esc(r.product.url)}" target="_blank" rel="noopener">Fiche fabricant du ragréage ↗</a>` : ''}
      <section class="primary-box" aria-label="Primaire adapté"><span class="small-label">LE PRIMAIRE</span><h3>${esc(r.primary.label)}</h3><p>${esc(r.primary.detail)}</p>${primaryQuantity}${r.primary.url ? `<a href="${esc(r.primary.url)}" target="_blank" rel="noopener">Vérifier la fiche du primaire ↗</a>` : ''}</section>
      ${r.warnings.length ? `<ul class="warnings">${list(r.warnings)}</ul>` : ''}
      <details class="calculation-details"><summary>Le détail du calcul</summary><p>${fmt(r.area)} m² × ${fmt(r.thickness)} mm × ${fmt(r.rate,2)} kg/m²/mm = <strong>${fmt(r.netKg)} kg</strong>.<br>Avec ${fmt(r.margin,0)} % de réserve : ${fmt(r.totalKg)} kg ÷ ${fmt(r.bag)} kg/sac → <strong>${fmt(r.bags,0)} sacs</strong>.<br>Masse de poudre par m² : ${fmt(r.loadKgM2)} kg/m², hors eau.<br>L’arrondi aux sacs ajoute ${fmt(r.surplusKg)} kg au besoin avec réserve.</p></details>
      <details class="calculation-details"><summary>Les conseils pour votre chantier</summary><ul>${list(r.tips)}</ul></details>
      <p class="bag-caption">${esc(words.location[input.location])} · ${esc(support?.label)} · ${esc(words.finish[input.finish])}<br>${esc(words.heating[input.heating])} · ${fmt(r.area)} m² à ${fmt(r.thickness)} mm${input.minThickness !== null || input.maxThickness !== null ? `<br>Épaisseurs locales : min. ${input.minThickness === null ? 'à vérifier' : fmt(input.minThickness)+' mm'} · max. ${input.maxThickness === null ? 'à vérifier' : fmt(input.maxThickness)+' mm'}` : ''}</p>`;
  }
  try { localStorage.setItem(storeKey,JSON.stringify(input)); } catch {}
}

restore();
render();
form.addEventListener('input', () => { clearTimeout(timer); $('action-status').textContent = ''; timer = setTimeout(render,200); });
form.addEventListener('change', () => { clearTimeout(timer); render(); });
form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); render(); if (matchMedia('(max-width:700px)').matches) $('result-card').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'}); });
$('print').addEventListener('click', () => { clearTimeout(timer); render(); if (lastResult.valid && !lastResult.blocked) window.print(); });
$('share').addEventListener('click', async () => {
  const input = readInput();
  const url = new URL(location.href);
  url.search = ''; url.hash = 'calculator';
  url.searchParams.set('calc','1');
  for (const key of fields) if (input[key] !== null && input[key] !== undefined) url.searchParams.set(key,input[key]);
  try {
    await navigator.clipboard.writeText(url.href);
    $('action-status').textContent = 'Lien copié. Il conserve vos choix et vos mesures.';
  } catch {
    const text = document.createElement('input');
    text.value = url.href; text.readOnly = true; text.setAttribute('aria-label','Lien de votre calcul');
    const container = $('action-status'); container.replaceChildren(document.createTextNode('Copiez ce lien : '),text); text.style.width='100%'; text.style.marginTop='8px'; text.select();
  }
});
