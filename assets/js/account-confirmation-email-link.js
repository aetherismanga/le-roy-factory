(()=>{
  if (window.__lrfAccountConfirmationLinkInstalled) return;
  window.__lrfAccountConfirmationLinkInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  const SEND_URL = 'https://us-central1-le-roy-factory.cloudfunctions.net/sendGroupEmail';
  const TARIFFS_URL = 'https://leroyfactory.fr/tarifs-pro.html';
  const SUBJECT = 'Votre compte professionnel LE ROY FACTORY est actif';

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    if (url === SEND_URL && typeof init.body === 'string') {
      try {
        const payload = JSON.parse(init.body);
        if (payload?.subject === SUBJECT) {
          let html = String(payload.htmlContent || '');
          const simpleLink = `<p><a href="${TARIFFS_URL}">Accéder aux tarifs professionnels</a></p>`;
          const prominentLink = `<p style="margin:24px 0"><a href="${TARIFFS_URL}" style="display:inline-block;background:#111;color:#FFD700;border:1px solid #D4AF37;border-radius:8px;padding:12px 18px;text-decoration:none;font-weight:800">Accéder aux tarifs professionnels</a></p><p style="font-size:13px;color:#666">Si le bouton ne s'ouvre pas, utilisez ce lien : <a href="${TARIFFS_URL}">${TARIFFS_URL}</a></p>`;

          if (html.includes(simpleLink)) html = html.replace(simpleLink, prominentLink);
          else if (!html.includes(TARIFFS_URL)) html += prominentLink;

          payload.htmlContent = html;
          init = { ...init, body: JSON.stringify(payload) };
        }
      } catch (error) {
        console.warn('Lien Tarifs PRO : impossible d’enrichir le mail de confirmation', error);
      }
    }
    return nativeFetch(input, init);
  };
})();
