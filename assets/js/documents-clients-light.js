(() => {
  'use strict';
  if (!/documents-clients\.html$/i.test(location.pathname)) return;

  const apply = () => {
    if (document.getElementById('lrf-docs-clients-light')) return;

    const style = document.createElement('style');
    style.id = 'lrf-docs-clients-light';
    style.textContent = `
      :root{--lrf-gold:#caa632;--lrf-gold-dark:#786018;--lrf-ink:#17202a;--lrf-muted:#747b84;--lrf-line:#ebe7de}
      body{background:linear-gradient(180deg,#fff 0%,#faf9f6 100%)!important;color:var(--lrf-ink)!important}
      .page{max-width:1080px!important;padding:28px 24px 44px!important}
      .back{display:inline-flex!important;align-items:center!important;gap:7px!important;color:var(--lrf-gold-dark)!important;font-weight:800!important;font-size:.94rem!important}
      .hero{margin:22px 0 18px!important;padding:22px 24px!important;background:#fff!important;color:var(--lrf-ink)!important;border:1px solid var(--lrf-line)!important;border-radius:20px!important;border-bottom:1px solid var(--lrf-line)!important;box-shadow:0 8px 26px rgba(35,39,45,.045)!important;position:relative!important}
      .hero:before{content:'📁';display:grid;place-items:center;width:46px;height:46px;border-radius:13px;background:#fff8df;border:1px solid #ead99a;font-size:1.25rem;margin-bottom:12px}
      .hero h1{margin:0!important;font-size:1.7rem!important;line-height:1.05!important;letter-spacing:-.025em!important;color:var(--lrf-ink)!important}
      .hero p{margin:7px 0 0!important;color:var(--lrf-muted)!important;font-size:.92rem!important;line-height:1.4!important}
      .searchBox{background:#fff!important;border:1px solid var(--lrf-line)!important;border-radius:20px!important;padding:18px!important;box-shadow:0 8px 26px rgba(35,39,45,.045)!important}
      .searchBox label{font-size:.95rem!important;margin-bottom:9px!important;color:var(--lrf-ink)!important}
      .searchBox input{padding:14px 15px!important;border:1.5px solid #ddd8cc!important;border-radius:14px!important;background:#fff!important;color:var(--lrf-ink)!important;outline:none!important}
      .searchBox input:focus{border-color:var(--lrf-gold)!important;box-shadow:0 0 0 4px rgba(202,166,50,.11)!important}
      .results{margin-top:8px!important;gap:7px!important}.result{border-color:#eeeae1!important;border-radius:12px!important;background:#fff!important}.result:hover,.result:focus{border-color:#d8bd63!important;background:#fffdf6!important}
      .empty{padding:12px 14px!important;background:#fbfaf7!important;color:#94908a!important;border-radius:11px!important;font-size:.84rem!important}
      .workspace{margin-top:16px!important;grid-template-columns:290px minmax(0,1fr)!important;gap:14px!important}
      .clientCard,.docsCard{border:1px solid var(--lrf-line)!important;border-radius:18px!important;box-shadow:0 8px 26px rgba(35,39,45,.045)!important;background:#fff!important}
      .clientCard{padding:17px!important}.docsCard{padding:18px!important}.docsTop h2{font-size:1.04rem!important}.count{background:#fff9e7!important;border-color:#eadba7!important;color:#7d651d!important}
      .drop{border:1.5px dashed #d9c77f!important;background:#fffdf7!important;border-radius:14px!important;padding:18px!important}.drop:hover,.drop.drag{border-color:#b58d18!important;background:#fff9e6!important}
      .note{border:1px solid #ddd8cc!important;border-radius:11px!important}.btn{background:#a98218!important;border-radius:11px!important}.doc{background:#faf9f6!important;border:1px solid #f0ece3!important;border-radius:11px!important}
      .iosHint{display:none!important}
      @media(max-width:820px){.page{padding:18px 14px 34px!important}.hero{margin:16px 0 14px!important;padding:17px!important}.hero:before{width:42px;height:42px;margin-bottom:10px}.hero h1{font-size:1.45rem!important}.hero p{font-size:.82rem!important;margin-top:5px!important}.searchBox{padding:14px!important;border-radius:17px!important}.workspace{grid-template-columns:1fr!important}.drop{padding:17px 12px!important}}
    `;
    document.head.appendChild(style);

    const hero = document.querySelector('.hero');
    if (hero) {
      const p = hero.querySelector('p');
      if (p) p.textContent = 'Retrouvez et ajoutez les documents d’un client.';
    }

    const searchInput = document.querySelector('#search');
    if (searchInput) searchInput.placeholder = 'Nom, ville ou code LRF…';

    const dropStrong = document.querySelector('#drop strong');
    if (dropStrong) dropStrong.textContent = '📎 Ajouter des fichiers';
    const dropSmall = document.querySelector('#drop small');
    if (dropSmall) dropSmall.textContent = '20 Mo maximum par fichier';

    const note = document.querySelector('#note');
    if (note) note.placeholder = 'Note facultative';

    const upload = document.querySelector('#upload');
    if (upload) upload.textContent = 'Enregistrer';

    const docsTitle = document.querySelector('.docsTop h2');
    if (docsTitle) docsTitle.textContent = 'Documents';

    const results = document.querySelector('#results');
    if (results && /Commencez à écrire/i.test(results.textContent || '')) results.innerHTML = '';
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, {once:true});
  else apply();
  setTimeout(apply, 150);
})();