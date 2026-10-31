(() => {
  'use strict';
  if(window.__LRF_VIEW_DISCOVERY__) return;
  window.__LRF_VIEW_DISCOVERY__=true;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const workspace=document.getElementById('partner-workspace');
  const title=document.getElementById('workspace-title');
  if(!workspace||!title) return;
  const tools=document.createElement('section');
  tools.className='view-discovery';
  tools.hidden=true;
  tools.setAttribute('aria-label','Explorer les collections VIEW');
  tools.innerHTML=`<div class="view-discovery-top"><div><strong data-view-summary></strong><p>Ambiances, coloris et catalogues à feuilleter.</p></div><button type="button" data-view-index>Index A–Z des collections</button></div><details class="view-finish-guide"><summary>Comprendre les finitions et les formats</summary><dl><div><dt>Rectifié</dt><dd>Bords usinés pour obtenir des dimensions régulières. Le format et le joint se choisissent dans la fiche technique.</dd></div><div><dt>Naturel</dt><dd>Aspect de surface naturel, sans finition polie. Le classement indiqué dépend de la référence.</dd></div><div><dt>Grip</dt><dd>Surface structurée. Les mentions R et A/B/C correspondent aux classements de glissance indiqués par le fabricant.</dd></div><div><dt>20 mm</dt><dd>Épaisseur de la dalle. Les usages et modes de pose figurent dans le catalogue de la collection.</dd></div><div><dt>Vintage / Burattato+</dt><dd>Finitions à l’aspect patiné ou aux bords vieillis, selon la collection.</dd></div><div><dt>Modulo / Opus</dt><dd>Composition de plusieurs formats. Le catalogue précise les modules et leur agencement.</dd></div></dl></details>`;
  workspace.querySelector('#v2-filters')?.before(tools);
  tools.querySelector('[data-view-index]').addEventListener('click',()=>document.getElementById('lrf-product-lexicon-btn')?.click());
  function update(){
    tools.hidden=!/^view\s+ceramica$/i.test(title.textContent.trim());
    if(!tools.hidden) tools.querySelector('[data-view-summary]').textContent=`VIEW · ${(window.VIEW_CATALOGUE||[]).length} collections`;
  }
  function enhance(product){
    const card=document.getElementById('product-modal-v2-card');
    const info=card?.querySelector('.view-safe-info');
    if(!info||!product||info.querySelector('.view-collection-resources')) return;
    const catalogues=window.VIEW_SELECTION_MEDIA?.catalogues?.[product.slug]||product.catalogues||[];
    if(!catalogues.length) return;
    const section=document.createElement('section');
    section.className='view-collection-resources';
    section.setAttribute('aria-label',`Catalogue ${product.name}`);
    section.innerHTML=`<h3>Le catalogue en images</h3><p>Parcourez les ambiances, les déclinaisons et les pages techniques.</p>${catalogues.map((catalogue,i)=>`<a class="view-catalogue-open" href="${esc(catalogue.url)}" data-view-catalogue="${i}" target="_blank" rel="noopener">Feuilleter le catalogue ${esc(product.name)} <span aria-hidden="true">↗</span></a>`).join('')}`;
    const headings=[...info.querySelectorAll('h4')];
    const priceHeading=headings.find(node=>node.textContent.includes('Tarifs'));
    if(priceHeading) priceHeading.before(section); else info.appendChild(section);
    section.addEventListener('click',event=>{
      const link=event.target.closest('[data-view-catalogue]');
      if(!link||!window.LRF_VIEW_CATALOGUE_READER) return;
      event.preventDefault();
      const catalogue=catalogues[Number(link.dataset.viewCatalogue)];
      window.LRF_VIEW_CATALOGUE_READER.open({url:catalogue.url,parts:catalogue.parts,originalUrl:catalogue.originalUrl||catalogue.sourceUrl,title:`VIEW · ${product.name}`,trigger:link});
    });
  }
  function enhanceCurrent(){
    const name=document.querySelector('#product-modal-v2-card .view-safe-info h2')?.textContent;
    if(name) enhance((window.VIEW_CATALOGUE||[]).find(p=>p.name===name));
  }
  new MutationObserver(update).observe(title,{childList:true,characterData:true,subtree:true});
  window.addEventListener('lrf-view-product-opened',event=>enhance(event.detail?.product));
  window.addEventListener('lrf-view-media-ready',()=>{update();enhanceCurrent();});
  update();enhanceCurrent();
})();
