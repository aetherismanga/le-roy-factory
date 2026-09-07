(() => {
  'use strict';

  const API = 'https://us-central1-le-roy-factory.cloudfunctions.net/biltOrder';
  const $ = id => document.getElementById(id);
  const cart = new Map();
  let context = null;
  let catalog = { groups: [], products: [] };
  let activeGroup = 'Tous';
  let query = '';

  const money = n => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const dateFr = iso => { if (!iso) return '—'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR'); };
  const dateTimeFr = iso => { if (!iso) return '—'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR', { dateStyle:'short', timeStyle:'short' }); };

  function notice(message, mode = 'ok') {
    const el = $('notice');
    el.className = `notice show ${mode}`;
    el.innerHTML = message;
    el.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
  function clearNotice() { $('notice').className = 'notice'; $('notice').textContent = ''; }

  async function getSession() {
    let session = window.LRF_PRO_SESSION?.read?.() || null;
    if (!session && window.LRF_PRO_SESSION?.restore) session = await window.LRF_PRO_SESSION.restore();
    return session;
  }

  async function api(payload) {
    const session = await getSession();
    if (!session) throw new Error('Accès PRO expiré. Reconnectez-vous depuis la page Accès PRO.');
    if (session.isAdmin && !session.sessionToken) throw new Error('Pour tester une commande BILT, ouvrez une session avec un LRF client autorisé BILT. Le compte administrateur ne passe pas de commande client.');
    const response = await fetch(API, {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ ...payload, sessionToken: session.sessionToken })
    });
    let data = {}; try { data = await response.json(); } catch (_) {}
    if (!response.ok || !data?.success) throw new Error(data?.error || `Erreur ${response.status}`);
    return data;
  }

  function priceFor(product) {
    const percent = Number(context?.discount?.percent || 0);
    const final = Number((Number(product.net) * (1 - percent / 100)).toFixed(4));
    return { percent, final };
  }

  function renderAccount() {
    const c = context.customer;
    $('client-name').textContent = c.societe;
    $('client-meta').textContent = `${c.codeClient} · Compte professionnel BILT`;
    const d = context.discount || { percent:0 };
    const pill = $('discount-pill');
    if (d.percent) {
      pill.className = 'pill';
      pill.textContent = `✓ Avantage exceptionnel LRF — ${d.percent}%`;
      $('discount-expiry').textContent = `Valable jusqu’au ${dateFr(d.expiresAt)}`;
    } else {
      pill.className = 'pill base';
      pill.textContent = 'Tarif NET BILT';
      $('discount-expiry').textContent = 'Aucune remise automatique';
    }
  }

  function renderGroups() {
    const groups = ['Tous', ...(catalog.groups || [])];
    $('groups').innerHTML = groups.map(g => `<button type="button" class="group ${g === activeGroup ? 'active' : ''}" data-group="${esc(g)}">${esc(g)}</button>`).join('');
  }

  function filteredProducts() {
    return (catalog.products || []).filter(p => {
      if (activeGroup !== 'Tous' && p.group !== activeGroup) return false;
      if (!query) return true;
      return norm(`${p.ref} ${p.name} ${p.group} ${p.format}`).includes(norm(query));
    });
  }

  function renderCatalog() {
    const list = filteredProducts();
    $('catalog-content').className = 'tablewrap';
    $('catalog-content').innerHTML = `<table class="products"><thead><tr><th>Référence</th><th>Produit</th><th>Tarif NET HT</th><th>Minimum livraison</th><th>Quantité</th><th></th></tr></thead><tbody>${list.map(p => {
      const price = priceFor(p);
      const priceHtml = price.percent ? `<span class="oldprice">NET BILT ${money(p.net)}</span><span class="price finalprice">${money(price.final)} HT</span>` : `<span class="price">${money(p.net)} HT</span>`;
      return `<tr data-ref="${esc(p.ref)}"><td><span class="ref">${esc(p.ref)}</span></td><td><span class="pname">${esc(p.name)}</span><span class="sub">${esc(p.group)} · ${esc(p.format)}</span></td><td>${priceHtml}</td><td><span class="min">x ${p.minQty} ${esc(p.minUnit)}</span><span class="sub">Commande par multiples de ${p.minQty}</span></td><td><input class="qty" data-qty="${esc(p.ref)}" type="number" min="${p.minQty}" step="${p.minQty}" value="${cart.get(p.ref)?.quantity || p.minQty}"></td><td><button class="add" type="button" data-add="${esc(p.ref)}">${cart.has(p.ref) ? 'METTRE À JOUR' : 'AJOUTER'}</button></td></tr>`;
    }).join('')}</tbody></table>`;
    if (!list.length) $('catalog-content').innerHTML = '<div class="empty" style="padding:35px">Aucun produit BILT avec cette recherche.</div>';
  }

  function renderCart() {
    const lines = [...cart.values()];
    $('cart-count').textContent = String(lines.length);
    if (!lines.length) {
      $('cart-lines').className = 'empty'; $('cart-lines').textContent = 'Ajoutez des produits depuis le catalogue.';
      $('cart-summary').innerHTML = ''; $('order-form').hidden = true; return;
    }
    $('cart-lines').className = '';
    $('cart-lines').innerHTML = lines.map(line => {
      const p = catalog.products.find(x => x.ref === line.ref); const price = priceFor(p); const total = price.final * line.quantity;
      return `<div class="cartline"><div><strong>${esc(p.ref)} — ${esc(p.name)}</strong><small>${line.quantity} ${esc(p.minUnit)} · ${money(price.final)} HT / unité de vente</small><small><strong>${money(total)} HT</strong></small></div><button class="remove" data-remove="${esc(p.ref)}" type="button" title="Retirer">×</button></div>`;
    }).join('');
    const percent = Number(context.discount?.percent || 0);
    const totalNet = lines.reduce((s,line) => { const p=catalog.products.find(x=>x.ref===line.ref); return s + Number(p.net)*line.quantity; },0);
    const totalFinal = totalNet*(1-percent/100);
    $('cart-summary').innerHTML = `<div class="sum"><div class="sumrow"><span>NET BILT</span><strong>${money(totalNet)}</strong></div>${percent?`<div class="sumrow discountrow"><span>Remise exceptionnelle LRF ${percent}%</span><strong>-${money(totalNet-totalFinal)}</strong></div>`:''}<div class="sumrow total"><span>Total NET HT</span><strong>${money(totalFinal)}</strong></div></div>`;
    $('order-form').hidden = Boolean(context.pendingFirstOrder);
  }

  function fillCustomerForm() {
    const c = context.customer;
    $('contact').innerHTML = (c.contacts || []).map(x => `<option value="${esc(x.id)}">${esc(x.name)}${x.fonction ? ` — ${esc(x.fonction)}` : ''}</option>`).join('');
    $('email').innerHTML = (c.emails || []).map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
    $('phone').innerHTML = '<option value="">Aucun</option>' + (c.phones || []).map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
    const syncContact = () => {
      const selected = (c.contacts || []).find(x => x.id === $('contact').value);
      if (selected?.email && c.emails.includes(selected.email)) $('email').value = selected.email;
      if (selected?.telephone && c.phones.includes(selected.telephone)) $('phone').value = selected.telephone;
    };
    $('contact').addEventListener('change', syncContact); syncContact();
  }

  function renderPending() {
    const p = context.pendingFirstOrder;
    const box = $('pending-box');
    if (!p) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="pendingbox"><strong>⌛ Première commande en attente de validation LRF</strong><br>Commande ${esc(p.id)} · ${money(p.totalNet)} HT.<br>Échéance : ${dateTimeFr(p.approvalDeadline)}. Sans réponse, elle partira automatiquement à BILT au tarif NET.</div>`;
  }

  function statusClass(status) {
    if (status === 'sent') return 'sent'; if (status === 'pending_approval' || status === 'processing') return 'pending'; if (status === 'send_error') return 'error'; return '';
  }
  function renderHistory() {
    const rows = context.history || [];
    if (!rows.length) { $('history-content').innerHTML = '<div class="empty">Aucune commande BILT pour ce LRF.</div>'; return; }
    $('history-content').innerHTML = `<div style="overflow:auto"><table class="historytable"><thead><tr><th>Date</th><th>Commande</th><th>Statut</th><th>Remise LRF</th><th>Total NET HT</th><th>Envoi</th></tr></thead><tbody>${rows.map(r => `<tr><td>${dateTimeFr(r.createdAt)}</td><td><strong>${esc(r.id)}</strong><br><small>${r.itemCount} réf.</small></td><td><span class="status ${statusClass(r.status)}">${esc(r.statusLabel || r.status)}</span></td><td>${r.discountPercent ? `<strong style="color:#167344">${r.discountPercent}%</strong>` : '—'}</td><td><strong>${money(r.totalFinal || r.totalNet)}</strong>${r.discountPercent ? `<br><small>Base ${money(r.totalNet)}</small>` : ''}</td><td>${r.sentAt ? dateTimeFr(r.sentAt) : (r.autoReleased ? 'Auto 72h' : '—')}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function addProduct(ref) {
    const p = catalog.products.find(x => x.ref === ref); if (!p) return;
    const input = document.querySelector(`[data-qty="${CSS.escape(ref)}"]`); const quantity = Number(input?.value);
    if (!Number.isInteger(quantity) || quantity < p.minQty || quantity % p.minQty !== 0) { notice(`La référence <strong>${esc(ref)}</strong> se commande par multiples de ${p.minQty} ${esc(p.minUnit)}.`, 'warn'); return; }
    clearNotice(); cart.set(ref, { ref, quantity }); renderCatalog(); renderCart();
  }

  async function submitOrder() {
    if (!cart.size || context.pendingFirstOrder) return;
    const btn = $('submit-order'); btn.disabled = true; const old = btn.textContent; btn.textContent = 'ENVOI EN COURS…'; clearNotice();
    try {
      const result = await api({ action:'submit', items:[...cart.values()], contactId:$('contact').value, email:$('email').value, telephone:$('phone').value, note:$('note').value });
      cart.clear();
      if (result.pendingApproval) notice(`<strong>Commande enregistrée.</strong> Comme il s’agit de votre première commande BILT, elle est en validation LE ROY FACTORY. Sans réponse, elle partira automatiquement sous 3 jours au tarif NET.`, 'warn');
      else notice(`<strong>Commande BILT envoyée.</strong> Total NET HT : ${money(result.totalFinal)}${result.discountPercent ? ` avec votre remise exceptionnelle LRF de ${result.discountPercent}%.` : '.'}`, 'ok');
      await loadContext();
    } catch (error) { notice(esc(error.message || error), 'error'); }
    finally { btn.disabled = false; btn.textContent = old; }
  }

  function bind() {
    $('groups').addEventListener('click', e => { const b=e.target.closest('[data-group]'); if (!b) return; activeGroup=b.dataset.group; renderGroups(); renderCatalog(); });
    $('search').addEventListener('input', e => { query=e.target.value; renderCatalog(); });
    $('catalog-content').addEventListener('click', e => { const b=e.target.closest('[data-add]'); if (b) addProduct(b.dataset.add); });
    $('cart-lines').addEventListener('click', e => { const b=e.target.closest('[data-remove]'); if (!b) return; cart.delete(b.dataset.remove); renderCatalog(); renderCart(); });
    $('submit-order').addEventListener('click', submitOrder);
  }

  async function loadContext() {
    const data = await api({ action:'context' }); context=data; catalog=data.catalog || {groups:[],products:[]}; renderAccount(); renderGroups(); renderCatalog(); fillCustomerForm(); renderPending(); renderCart(); renderHistory();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bind();
    try { await loadContext(); if (location.hash === '#historique') setTimeout(() => $('historique').scrollIntoView({behavior:'smooth'}), 200); }
    catch (error) {
      $('catalog-content').className=''; $('catalog-content').innerHTML=`<div class="empty" style="padding:40px"><strong>Accès BILT indisponible</strong><br><br>${esc(error.message || error)}<br><br><a href="tarifs-pro.html">Retour à l’Accès PRO</a></div>`;
      $('history-content').innerHTML=''; notice(esc(error.message || error),'error');
    }
  });
})();
