(() => {
  'use strict';
  if (window.__LRF_VIEW_ORDER_EMAIL_RECAP_FIX__) return;
  window.__LRF_VIEW_ORDER_EMAIL_RECAP_FIX__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();

  function recapFromPreview(overlay) {
    const rows = $$('.view-review-line', overlay).map((row, i) => {
      const title = clean($('.view-review-line-head strong', row)?.textContent) || `Article ${i + 1}`;
      const kind = clean($('.view-review-line-head span', row)?.textContent) || 'Article';
      const metas = $$('.view-review-meta > div', row).map(box => ({
        label: clean($('span', box)?.textContent),
        value: clean($('strong', box)?.textContent)
      })).filter(x => x.label || x.value);
      return {
        title,
        kind,
        metas
      };
    });

    const cards = $$('.view-review-card', overlay).map(card => ({
      label: clean($('span', card)?.textContent),
      value: clean($('strong', card)?.textContent)
    })).filter(x => x.label && x.value && x.value !== '—');

    return { rows, cards };
  }

  function metaValue(row, pattern) {
    return row.metas.find(x => pattern.test(x.label))?.value || '—';
  }

  function productBlock(row, i) {
    const color = metaValue(row, /^couleur$/i);
    const ref = metaValue(row, /^référence$/i);
    const qty = metaValue(row, /^quantité demandée$/i);
    const final = row.metas.find(x => !/^couleur$|^référence$|^quantité demandée$/i.test(x.label));
    return [
      `${i + 1}. ${row.title}`,
      `Type : ${row.kind}`,
      `Couleur : ${color}`,
      `Référence : ${ref}`,
      `Quantité demandée : ${qty}`,
      final ? `${final.label} : ${final.value}` : null
    ].filter(Boolean).join('\n');
  }

  function openMail(href) {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_self';
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 1200);
  }

  function sendMail(overlay) {
    const title = clean($('#view-review-title', overlay)?.textContent);
    const isOrder = /commande/i.test(title);
    const { rows, cards } = recapFromPreview(overlay);
    if (!rows.length) return false;

    const company = cards.find(x => /^société$/i.test(x.label))?.value || 'LE ROY FACTORY';
    const subject = `${isOrder ? '[COMMANDE VIEW]' : '[DISPONIBILITÉ VIEW]'} ${company} — ${rows.length} article${rows.length > 1 ? 's' : ''}`;
    const intro = isOrder
      ? 'Bonjour Maura,\n\nMerci de nous préparer la commande suivante :'
      : 'Bonjour Maura,\n\nMerci de nous confirmer la disponibilité des articles suivants :';

    const contactCards = cards.filter(x => !/^envoi$/i.test(x.label));
    const contactLines = contactCards.map(x => `${x.label} : ${x.value}`);
    const products = rows.map(productBlock).join('\n\n------------------------------\n\n');
    const body = [
      intro,
      '',
      'RÉCAPITULATIF DES PRODUITS SÉLECTIONNÉS',
      '========================================',
      '',
      products,
      '',
      'CLIENT / CONTACT',
      '----------------',
      ...contactLines,
      '',
      isOrder
        ? 'Merci de confirmer la prise en compte de cette commande.'
        : 'Merci de nous confirmer les disponibilités et délais.'
    ].join('\n');

    const to = 'maura@viewceramiche.com';
    const cc = 'jerome@leroyfactory.fr,coryne@leroyfactory.fr';
    const href = `mailto:${to}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // L'ouverture par lien est plus fiable que location.href sur Android/iOS :
    // le sujet ET le corps du message sont transmis ensemble au client mail.
    openMail(href);
    return true;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest?.('.view-review-send');
    if (!btn) return;
    const overlay = btn.closest('.view-review-overlay');
    if (!overlay?.classList.contains('open')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    sendMail(overlay);
  }, true);
})();
