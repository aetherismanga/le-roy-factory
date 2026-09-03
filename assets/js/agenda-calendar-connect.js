// Aide connexion de calendriers Google — LE ROY FACTORY
(() => {
  const $ = (s) => document.querySelector(s);
  const clean = (v) => String(v ?? '').trim();

  function injectStyles() {
    if ($('#lrf-calendar-connect-style')) return;
    const style = document.createElement('style');
    style.id = 'lrf-calendar-connect-style';
    style.textContent = `
      .agenda-add-calendar-btn{border:1px solid #18a69d;background:linear-gradient(180deg,#e8fffc,#bfeee9);color:#075b56;border-radius:10px;padding:9px 12px;font-weight:850;cursor:pointer;min-height:42px;box-shadow:inset 0 1px 0 #fff,0 4px 10px rgba(18,130,124,.10)}
      .agenda-add-calendar-btn:hover{transform:translateY(-1px)}
      .calendar-connect-modal{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;background:rgba(12,15,18,.58);padding:18px}
      .calendar-connect-modal.open{display:flex}
      .calendar-connect-card{width:min(620px,100%);max-height:88vh;overflow:auto;background:#fffaf3;border:1px solid #dfc26b;border-radius:18px;box-shadow:0 22px 70px rgba(0,0,0,.24);padding:20px;color:#26313b}
      .calendar-connect-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
      .calendar-connect-head h2{margin:0;font-size:1.2rem}.calendar-connect-close{border:0;background:#191919;color:#ffd54a;border-radius:9px;width:40px;height:40px;font-size:1.2rem;cursor:pointer}
      .calendar-connect-step{display:grid;grid-template-columns:34px 1fr;gap:10px;margin:11px 0;padding:10px;border-radius:12px;background:#fff;border:1px solid #ebe1d3}
      .calendar-connect-num{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:#111;color:#ffd54a;font-weight:900}
      .calendar-connect-step strong{display:block;margin-bottom:3px}.calendar-connect-note{background:#eafff9;border-left:4px solid #19a79f;padding:10px 12px;border-radius:8px;margin:12px 0;font-size:.84rem}
      .calendar-connect-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.calendar-connect-actions button{min-height:42px;border-radius:10px;padding:9px 12px;font-weight:850;cursor:pointer}
      .calendar-open-google{background:#111;color:#ffd54a;border:1px solid #cfa52b}.calendar-refresh{background:#19a79f;color:white;border:1px solid #0e827b}.calendar-cancel{background:#fff;border:1px solid #d8d0c6;color:#4c443b}
      @media(max-width:760px){.agenda-actions{grid-template-columns:1fr!important}.agenda-add-calendar-btn{width:100%}.calendar-connect-card{padding:16px}.calendar-connect-step{grid-template-columns:30px 1fr}.calendar-connect-actions{display:grid;grid-template-columns:1fr}.calendar-connect-actions button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function agentInfo() {
    const email = clean(localStorage.getItem('agentEmail')).toLowerCase();
    const name = clean(localStorage.getItem('agentName')) || 'Agent';
    const isJerome = email === 'jerome@leroyfactory.fr' || name.toLowerCase().includes('jérôme') || name.toLowerCase().includes('jerome');
    return {
      email,
      name,
      otherName: isJerome ? 'Coryne' : 'Jérôme',
      otherEmail: isJerome ? 'coryne@leroyfactory.fr' : 'jerome@leroyfactory.fr'
    };
  }

  function buildModal() {
    if ($('#calendar-connect-modal')) return $('#calendar-connect-modal');
    const info = agentInfo();
    const modal = document.createElement('div');
    modal.id = 'calendar-connect-modal';
    modal.className = 'calendar-connect-modal';
    modal.innerHTML = `
      <div class="calendar-connect-card" role="dialog" aria-modal="true" aria-labelledby="calendar-connect-title">
        <div class="calendar-connect-head">
          <div><h2 id="calendar-connect-title">➕ Ajouter un calendrier Google</h2><p style="margin:5px 0 0;color:#74695d;font-size:.84rem">Le partage se fait une seule fois. Ensuite le calendrier reste visible dans le CRM.</p></div>
          <button type="button" class="calendar-connect-close" aria-label="Fermer">✕</button>
        </div>
        <div class="calendar-connect-note"><strong>Compte CRM actuel :</strong> ${info.email || info.name}<br>Pour voir les calendriers de Jérôme et Coryne quel que soit l’agent connecté, faites le partage dans les deux sens une seule fois.</div>
        <div class="calendar-connect-step"><span class="calendar-connect-num">1</span><div><strong>Ouvrir Google Calendar du calendrier à ajouter</strong>Par exemple, pour ajouter l’agenda de ${info.otherName}, ouvrez Google Calendar connecté à <b>${info.otherEmail}</b>.</div></div>
        <div class="calendar-connect-step"><span class="calendar-connect-num">2</span><div><strong>Paramètres et partage</strong>Dans Google Calendar : Paramètres → choisissez le calendrier → <b>Partager avec des personnes ou des groupes</b>.</div></div>
        <div class="calendar-connect-step"><span class="calendar-connect-num">3</span><div><strong>Partager avec ${info.email || 'le compte professionnel connecté au CRM'}</strong>Donnez de préférence l’autorisation <b>Apporter des modifications aux événements</b>. Ainsi le calendrier sera visible et modifiable depuis le CRM.</div></div>
        <div class="calendar-connect-step"><span class="calendar-connect-num">4</span><div><strong>Actualiser l’agenda Leroy Factory</strong>Revenez ici et cliquez sur « J’ai partagé — Actualiser ». Le nouveau calendrier apparaîtra dans « Calendriers visibles » avec sa propre couleur.</div></div>
        <div class="calendar-connect-note"><b>Pour une interconnexion complète Jérôme ↔ Coryne :</b><br>• Jérôme partage son agenda avec <b>coryne@leroyfactory.fr</b><br>• Coryne partage son agenda avec <b>jerome@leroyfactory.fr</b></div>
        <div class="calendar-connect-actions">
          <button type="button" class="calendar-open-google">📅 Ouvrir Google Calendar</button>
          <button type="button" class="calendar-refresh">🔄 J’ai partagé — Actualiser</button>
          <button type="button" class="calendar-cancel">Fermer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.classList.remove('open');
    modal.querySelector('.calendar-connect-close').addEventListener('click', close);
    modal.querySelector('.calendar-cancel').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('.calendar-open-google').addEventListener('click', () => window.open('https://calendar.google.com/calendar/u/0/r/settings', '_blank', 'noopener'));
    modal.querySelector('.calendar-refresh').addEventListener('click', () => location.reload());
    return modal;
  }

  function init() {
    injectStyles();
    const actions = $('.agenda-actions');
    if (!actions || $('#btn-add-calendar')) return;
    const btn = document.createElement('button');
    btn.id = 'btn-add-calendar';
    btn.type = 'button';
    btn.className = 'agenda-add-calendar-btn';
    btn.textContent = '➕ Ajouter un calendrier';
    btn.addEventListener('click', () => buildModal().classList.add('open'));
    actions.appendChild(btn);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
