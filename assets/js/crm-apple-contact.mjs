import { toContactDraft } from './crm-contact-import.mjs?v=20261125-contacts5';

export function isAppleMobile(browser = navigator) {
  return /iPad|iPhone|iPod/i.test(browser.userAgent) ||
    (browser.platform === 'MacIntel' && browser.maxTouchPoints > 1);
}

export function openAppleContactForm({ onSelect, onFile, onClose }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'crm-apple-contact-dialog';
  dialog.setAttribute('aria-labelledby', 'crm-apple-contact-title');
  // Safari must see an independent form so the selected person cannot autofill
  // the main contact, company details, or another salesperson's fields.
  dialog.innerHTML = `
    <form autocomplete="on">
      <h3 id="crm-apple-contact-title">Choisir un contact</h3>
      <p>Touche <strong>Préremplir le contact</strong> au-dessus du clavier, puis <strong>Autre contact</strong> pour choisir dans ton carnet.</p>
      <label>Nom et prénom <input name="name" autocomplete="name" type="text" autofocus></label>
      <label>Téléphone <input name="tel" autocomplete="tel" type="tel"></label>
      <label>E-mail <input name="email" autocomplete="email" type="email" autocapitalize="off"></label>
      <div class="crm-contact-file-actions">
        <button type="submit" class="btn-primary-gold">Ajouter à la fiche</button>
        <button type="button" data-cancel class="filter-btn">Annuler</button>
        <button type="button" data-file class="btn-add-phone-link">Importer un fichier .vcf</button>
      </div>
      <p data-feedback role="status"></p>
    </form>`;
  const form = dialog.querySelector('form');
  const name = form.elements.namedItem('name');
  const phone = form.elements.namedItem('tel');
  const email = form.elements.namedItem('email');
  const fields = [name, phone, email];
  let timer;

  const close = () => {
    if (!dialog.isConnected) return;
    clearInterval(timer);
    dialog.close();
    dialog.remove();
    onClose();
  };

  const importContact = () => {
    const contact = toContactDraft({
      displayName: name.value,
      phones: [{ value: phone.value }],
      emails: [email.value]
    });
    if (!Object.values(contact).some(Boolean)) {
      dialog.querySelector('[data-feedback]').textContent = 'Choisis un contact ou renseigne ses coordonnées.';
      name.focus();
      return;
    }
    close();
    onSelect(contact);
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    importContact();
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  dialog.querySelector('[data-cancel]').onclick = close;
  dialog.querySelector('[data-file]').onclick = () => {
    close();
    onFile();
  };

  document.body.appendChild(dialog);
  try {
    dialog.showModal();
  } catch (error) {
    dialog.remove();
    throw error;
  }
  name.focus();

  // Safari may complete several fields separately or omit a change event.
  // Read the form after autofilled values have settled while the sheet is open.
  let previous = '';
  let changedAt = 0;
  timer = setInterval(() => {
    if (document.hidden || !fields.some(field => field.value && field.matches(':-webkit-autofill'))) return;
    const current = JSON.stringify(fields.map(field => field.value));
    if (current !== previous) {
      previous = current;
      changedAt = Date.now();
    } else if (Date.now() - changedAt >= 300 && form.checkValidity()) {
      importContact();
    }
  }, 100);

  return close;
}
