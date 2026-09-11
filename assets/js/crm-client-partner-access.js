import { db } from './firebase.js';
import { collection, doc, onSnapshot, updateDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

if (!window.__LRF_CLIENT_PARTNER_ACCESS__) {
  window.__LRF_CLIENT_PARTNER_ACCESS__ = true;

  const PARTNERS = {
    'elios-ceramica':['Elios Ceramica','elios.png'], 'view-ceramica':['View Ceramica','view.png'], 'la-fenice':['La Fenice','lafenice.png'],
    'reviglass':['Reviglass','reviglass.png'], 'biopietra':['Biopietra','biopietra.png'], 'petracers':["Petracer's",'petracer.png'],
    'pecchioli-firenze':['Pecchioli Firenze','pecchioli.png'], 'bulbo':['Bulbo','bulbo.png'], 'randal-pro':['Randal Pro','randal.png'],
    'neobath':['Neobath','neobath.png'], 'koibath':['Koibath','koibath.png'], 'aquahome':['Aquahome','aquahome.png'],
    'opal':['Opal','opal.png'], 'bilt':['BILT','bilt.png']
  };

  let clients = [];
  let activeClientId = '';
  let draft = new Set();
  let saving = false;
  const clean = v => String(v ?? '').trim();
  const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const esc = v => clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function currentClient() {
    if (activeClientId) {
      const c = clients.find(x => x.id === activeClientId);
      if (c) return c;
    }
    const code = clean(document.querySelector('#edit-code-client')?.value).toUpperCase();
    if (code) {
      const c = clients.find(x => clean(x.codeClient).toUpperCase() === code);
      if (c) { activeClientId = c.id; return c; }
    }
    const company = norm(document.querySelector('#edit-societe')?.value);
    if (company) {
      const c = clients.find(x => norm(x.societe) === company);
      if (c) { activeClientId = c.id; return c; }
    }
    return null;
  }

  function installStyles() {
    if (document.querySelector('#lrf-client-partner-access-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-client-partner-access-style';
    style.textContent = `
      #lrf-partner-access-section{margin:18px 0 0;padding:16px;border:1px solid #e1d7c3;border-radius:16px;background:#fffdf8}
      #lrf-partner-access-section h3{margin:0 0 5px;font-size:1rem;color:#27231d}#lrf-partner-access-section p{margin:0 0 12px;color:#766d60;font-size:.78rem;line-height:1.4}
      #crm-partner-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px}
      #crm-partner-grid .partner-card-mini{border:1px solid #ddd4c5;background:#fff;border-radius:12px;min-height:58px;padding:9px;display:flex;align-items:center;gap:8px;cursor:pointer;transition:.15s;text-align:left}
      #crm-partner-grid .partner-card-mini img{width:50px;height:34px;object-fit:contain;background:#fff;border-radius:6px}
      #crm-partner-grid .partner-card-mini .partner-name{font-size:.72rem;font-weight:800;color:#39342c}
      #crm-partner-grid .partner-card-mini.active{border:2px solid #d4af37;background:#fff7dc;box-shadow:0 0 0 2px rgba(212,175,55,.12)}
      .opal-mirror-logo{width:50px;height:34px;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#f9fbff,#dce8ef);border-radius:8px;position:relative;flex:0 0 auto;box-shadow:inset 0 0 0 1px #d7e0e6}
      .opal-mirror-logo::before{content:'';width:20px;height:25px;border:2px solid #788a96;border-radius:50% 50% 46% 46%;background:linear-gradient(135deg,#ffffff 0 35%,#cfe0e9 36% 60%,#f8fbfd 61%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.55)}
      .opal-mirror-logo::after{content:'';position:absolute;width:10px;height:2px;background:#788a96;border-radius:2px;bottom:3px;left:20px;box-shadow:0 -3px 0 -1px #788a96}
      .lrf-partner-save-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}.lrf-partner-state{font-size:.75rem;color:#6f6659}.lrf-partner-save{border:1px solid #c5a12d;background:#fff4c8;color:#6f5510;border-radius:10px;padding:10px 13px;font-weight:850;cursor:pointer}
      .lrf-client-partners-open{border:1px solid #d8c57d!important;background:linear-gradient(180deg,#fffdf6,#f7edcb)!important;color:#5f4a0d!important;box-shadow:0 5px 14px rgba(124,94,24,.10)!important}
      .lrf-client-focus{outline:3px solid rgba(212,175,55,.52)!important;outline-offset:4px!important;box-shadow:0 10px 28px rgba(126,91,14,.14)!important}
      @media(max-width:900px){
        #lrf-client-mobile-quick-actions{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;margin:12px 14px 8px!important}
        #lrf-client-mobile-quick-actions .lrf-client-quick-btn{min-width:0!important;min-height:50px!important;border-radius:14px!important;padding:8px 5px!important;font-size:0!important;font-weight:800!important;letter-spacing:-.01em!important;box-shadow:0 5px 14px rgba(70,58,30,.08)!important}
        #lrf-client-mobile-quick-actions .lrf-client-quick-btn span{font-size:.83rem!important;line-height:1.05!important;white-space:nowrap!important}
        #lrf-client-mobile-quick-actions .lrf-client-call{border:1px solid #b8d9cf!important;background:linear-gradient(180deg,#f1fbf8,#dff3ed)!important;color:#176a58!important}
        #lrf-client-mobile-quick-actions .lrf-client-go{border:1px solid #dfd0a5!important;background:linear-gradient(180deg,#fffdf8,#f6eedc)!important;color:#6b571c!important}
        #lrf-client-mobile-quick-actions .lrf-client-partners-open{border:1px solid #d8c57d!important;background:linear-gradient(180deg,#fff8dc,#f6e8b5)!important;color:#654f12!important}
        #lrf-client-mobile-quick-actions .lrf-client-quick-btn:active{transform:scale(.985)}
        #lrf-partner-access-section{margin:14px 12px;padding:13px;border-radius:14px}
        #lrf-partner-access-section h3{font-size:1.08rem;line-height:1.18;margin-bottom:7px}
        #crm-partner-grid{grid-template-columns:1fr 1fr;gap:8px}
        #crm-partner-grid .partner-card-mini{min-height:60px;padding:8px;border-radius:14px;gap:7px}
        #crm-partner-grid .partner-card-mini img,.opal-mirror-logo{width:44px;height:32px}
        #crm-partner-grid .partner-card-mini .partner-name{font-size:.78rem;line-height:1.1}
        #lrf-partner-access-section[data-collapsed="1"] #crm-partner-grid,#lrf-partner-access-section[data-collapsed="1"] .lrf-partner-save-row,#lrf-partner-access-section[data-collapsed="1"] p{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSection() {
    const form = document.querySelector('#client-form');
    if (!form) return null;
    let section = document.querySelector('#lrf-partner-access-section');
    if (!section) {
      section = document.createElement('section');
      section.id = 'lrf-partner-access-section';
      section.dataset.collapsed = window.matchMedia('(max-width:900px)').matches ? '1' : '0';
      section.innerHTML = `
        <h3>Partenaires / autorisations tarifs</h3>
        <p>Sélectionnez les fabricants autorisés pour ce client. Les tarifs PRO suivent exactement cette sélection.</p>
        <div id="crm-partner-grid"></div>
        <div class="lrf-partner-save-row"><span class="lrf-partner-state">Aucune modification.</span><button class="lrf-partner-save" type="button">Enregistrer les autorisations</button></div>`;
      const grid = form.querySelector('.modal-grid-edit');
      if (grid) grid.insertAdjacentElement('afterend', section); else form.prepend(section);
      section.querySelector('.lrf-partner-save').addEventListener('click', saveDraft);
    }
    return section;
  }

  function partnerVisual(id, logo) {
    if (id === 'opal') return '<span class="opal-mirror-logo" aria-label="Opal — miroir"></span>';
    return `<img src="assets/img/${esc(logo)}" alt="">`;
  }

  function renderPartners() {
    const section = ensureSection();
    const grid = section?.querySelector('#crm-partner-grid');
    const client = currentClient();
    if (!grid || !client) return;
    draft = new Set(Array.isArray(client.partenaires) ? client.partenaires.filter(id => PARTNERS[id]) : []);
    grid.innerHTML = Object.entries(PARTNERS).map(([id,[name,logo]]) => `
      <button type="button" class="partner-card-mini${draft.has(id)?' active':''}" data-pid="${esc(id)}" aria-pressed="${draft.has(id)?'true':'false'}">
        ${partnerVisual(id,logo)}<span class="partner-name">${esc(name)}</span>
      </button>`).join('');
    grid.querySelectorAll('.partner-card-mini').forEach(btn => btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const id = btn.dataset.pid;
      if (draft.has(id)) draft.delete(id); else draft.add(id);
      btn.classList.toggle('active', draft.has(id));
      btn.setAttribute('aria-pressed', draft.has(id) ? 'true' : 'false');
      const state = section.querySelector('.lrf-partner-state');
      if (state) state.textContent = `${draft.size} partenaire${draft.size>1?'s':''} sélectionné${draft.size>1?'s':''} — à enregistrer`;
    }));
    const state = section.querySelector('.lrf-partner-state');
    if (state) state.textContent = `${draft.size} partenaire${draft.size>1?'s':''} autorisé${draft.size>1?'s':''}`;
    ensureMobilePartnerButton();
  }

  async function saveDraft() {
    const client = currentClient();
    const state = document.querySelector('#lrf-partner-access-section .lrf-partner-state');
    if (!client || saving) return;
    saving = true;
    if (state) state.textContent = 'Enregistrement…';
    try {
      const next = [...draft];
      await updateDoc(doc(db,'clients',client.id), { partenaires:next, partenairesUpdatedAt:new Date().toISOString() });
      client.partenaires = next;
      if (state) state.textContent = `✓ ${next.length} partenaire${next.length>1?'s':''} enregistré${next.length>1?'s':''} — accès tarifs mis à jour`;
      window.dispatchEvent(new CustomEvent('lrf-client-partners-saved',{detail:{clientId:client.id,partenaires:next}}));
    } catch (error) {
      console.error('Enregistrement partenaires', error);
      if (state) state.textContent = 'Erreur lors de l’enregistrement.';
    } finally { saving = false; }
  }

  function ensureMobilePartnerButton() {
    const box = document.querySelector('#lrf-client-mobile-quick-actions');
    const section = document.querySelector('#lrf-partner-access-section');
    if (!box || !section || box.querySelector('.lrf-client-partners-open')) return;
    const btn = document.createElement('button');
    btn.type='button'; btn.className='lrf-client-quick-btn lrf-client-partners-open'; btn.innerHTML='<span>Partenaires</span>';
    btn.addEventListener('click', () => {
      section.dataset.collapsed = '0';
      section.scrollIntoView({behavior:'smooth',block:'start'});
    });
    box.appendChild(btn);
  }

  function modalOpen() {
    const modal = document.querySelector('#client-modal');
    return modal && getComputedStyle(modal).display !== 'none';
  }

  function refreshModal() {
    if (!modalOpen()) return;
    ensureSection();
    renderPartners();
    ensureMobilePartnerButton();
  }

  function findClientForRow(row) {
    const id = clean(row?.dataset?.clientId || row?.dataset?.id || row?.getAttribute?.('data-client-id'));
    if (id) return clients.find(c => c.id === id) || null;
    const cells = row?.querySelectorAll?.('td') || [];
    const company = norm(cells[1]?.childNodes?.[0]?.textContent || cells[1]?.textContent || '');
    return clients.find(c => norm(c.societe) === company) || null;
  }

  function focusMainCard(clientId) {
    const target = [...document.querySelectorAll('#clients-table-body tr')].find(row => {
      const c = findClientForRow(row);
      return c?.id === clientId;
    });
    if (!target) return false;
    target.classList.add('lrf-client-focus');
    target.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(() => target.classList.remove('lrf-client-focus'), 4200);
    return true;
  }

  function handleFocusQuery() {
    const id = new URLSearchParams(location.search).get('focus');
    if (!id) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (focusMainCard(id) || tries > 30) clearInterval(timer);
    }, 120);
  }

  installStyles();
  document.addEventListener('click', e => {
    const row = e.target.closest('#clients-table-body tr');
    if (row) {
      const c = findClientForRow(row);
      if (c) activeClientId = c.id;
    }
  }, true);

  const modal = document.querySelector('#client-modal');
  if (modal) new MutationObserver(() => { if (modalOpen()) setTimeout(refreshModal, 20); }).observe(modal,{attributes:true,attributeFilter:['style'],childList:true,subtree:true});
  const quickObserver = new MutationObserver(() => { if (modalOpen()) ensureMobilePartnerButton(); });
  quickObserver.observe(document.body,{childList:true,subtree:true});

  document.querySelector('#client-form')?.addEventListener('submit', () => { if (activeClientId) saveDraft(); }, true);
  window.addEventListener('lrf-client-opened', e => { if (e.detail?.clientId) activeClientId = clean(e.detail.clientId); setTimeout(refreshModal,30); });

  onSnapshot(collection(db,'clients'), snap => {
    clients = [];
    snap.forEach(d => {
      const c = {id:d.id,...d.data()};
      if (c.archived === true || c.archive === true || clean(c.codeClient).toUpperCase() === 'LRF-00001') return;
      clients.push(c);
    });
    if (activeClientId && !clients.some(c => c.id === activeClientId)) activeClientId = '';
    if (modalOpen()) setTimeout(refreshModal,30);
    handleFocusQuery();
  });
}
