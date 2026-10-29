// Private PDF bytes stay in memory. Only the explicit download button creates
// a document URL; displaying a tariff never invokes a browser PDF application.
let runtimePromise, activeClose, openingSequence=0, pendingHistoryMarker=null;
let historyReturn=Promise.resolve(true);
const supersededReader=Object.freeze({close(){}});

// History traversal is asynchronous. Finish returning to the underlying page
// before another reader pushes its marker, otherwise an old popstate could
// close the replacement. No private content is stored in the history entry.
function returnFromReader(marker, priorHistory) {
  pendingHistoryMarker=marker;
  historyReturn=new Promise(resolve=>{
    let finished=false, timeout;
    function finish(success) {
      if(finished) return;
      finished=true;clearTimeout(timeout);window.removeEventListener('popstate',onReturn);
      if(success && pendingHistoryMarker===marker) pendingHistoryMarker=null;
      resolve(success);
    }
    function onReturn() { if(history.state?.lrfPdfReader!==marker) finish(true); }
    window.addEventListener('popstate',onReturn);
    // If a browser refuses traversal without throwing, don't push a newer
    // marker into its still-pending transaction. A retry can proceed after the
    // user's Back action returns to the underlying page.
    timeout=setTimeout(()=>finish(history.state?.lrfPdfReader!==marker),3000);
    try { history.back(); }
    catch {
      // A thrown call has not queued a traversal; replacing this marker is safe.
      try { history.replaceState(priorHistory,'',location.href); } catch {}
      finish(history.state?.lrfPdfReader!==marker);
    }
  });
  return historyReturn;
}

async function compressedModule(path) {
  if (!globalThis.DecompressionStream) throw Error('Ce navigateur ne peut pas charger le lecteur. Mettez-le à jour puis réessayez.');
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw Error('Le lecteur PDF est momentanément indisponible. Réessayez.');
  return new Blob([await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()], {type:'text/javascript'});
}

function runtime() {
  if (!runtimePromise) runtimePromise = (async () => {
    const [moduleBlob, workerBlob] = await Promise.all([
      compressedModule('../vendor/lrf-plan-pose/pdf.min.mjs.gz'),
      compressedModule('../vendor/lrf-plan-pose/pdf.worker.min.mjs.gz')
    ]);
    const moduleURL = URL.createObjectURL(moduleBlob);
    try { return {library:await import(moduleURL), workerBlob}; }
    finally { URL.revokeObjectURL(moduleURL); }
  })().catch(error => { runtimePromise = null; throw error; });
  return runtimePromise;
}

const css = `
:host{all:initial;position:fixed;inset:0;z-index:2147483647;color:#202b30;font:15px/1.45 Arial,sans-serif}
*{box-sizing:border-box}dialog{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#eeeae2;color:#202b30;font:inherit}
dialog::backdrop{background:#202b30} .reader{height:100%;height:100dvh;display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:16px;padding:12px max(16px,env(safe-area-inset-right)) 12px max(16px,env(safe-area-inset-left));background:#fff;border-bottom:1px solid #d9d1c3;min-height:64px}
.brand{font-size:12px;letter-spacing:.12em;color:#746039;font-weight:700;white-space:nowrap}h1{font-size:16px;line-height:1.3;margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
button,a,input{font:inherit}button,a.action{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:8px 12px;border:1px solid #c8b99c;border-radius:7px;color:#202b30;background:#fff;text-decoration:none;cursor:pointer;white-space:nowrap}
button:hover,a.action:hover{background:#f5f0e5}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #9b7b31;outline-offset:2px}button:disabled{opacity:.42;cursor:default}
button.primary{background:#253239;color:#fff;border-color:#253239} .toolbar{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;padding:8px 12px;background:#fbf9f5;border-bottom:1px solid #d9d1c3}
.pages,.zoom{display:flex;align-items:center;gap:6px}.pages label{display:flex;align-items:center;gap:6px}.pages input{width:60px;height:40px;text-align:center;border:1px solid #c8b99c;border-radius:6px;color:#202b30;background:white}
.zoom-label{min-width:44px;text-align:center;font-size:13px}.search{display:flex;align-items:center;gap:6px;margin:0}.search input{width:190px;max-width:35vw;height:40px;padding:8px;border:1px solid #c8b99c;border-radius:6px}
.stage{position:relative;flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:16px;-webkit-overflow-scrolling:touch}.paper{width:max-content;min-width:100%;display:flex;justify-content:center;align-items:flex-start}canvas{display:block;background:#fff;box-shadow:0 4px 18px #202b3020}
.message{margin:20px auto;padding:20px;max-width:560px;background:#fff;border:1px solid #d9d1c3;border-radius:10px;text-align:center}.message p{margin:0 0 12px}.message[hidden],canvas[hidden]{display:none}.status{min-height:25px;padding:3px 14px calc(3px + env(safe-area-inset-bottom));background:#fbf9f5;font-size:12px;text-align:center;color:#505a5f}.page-text{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:pre-wrap}
@media(max-width:680px){header{padding-top:max(9px,env(safe-area-inset-top));gap:8px;flex-wrap:wrap}.brand{font-size:10px}h1{font-size:14px;flex-basis:calc(100% - 140px)}header button{padding:8px 10px}.toolbar{gap:6px;padding:6px}.toolbar button{min-height:40px;padding:7px 9px}.pages{gap:4px}.pages input{width:48px}.search{width:100%;justify-content:center}.search input{width:240px;max-width:70vw}.stage{padding:10px}.download-label{display:none}}
`;

/** Show an authenticated PDF in the current page, including on mobile browsers.
 * Resolves after the first render attempt. Failures stay in the reader with a
 * retry button, so no automatic native-viewer or download fallback is needed.
 */
export async function showSecurePdf(blob, {title='Tarif professionnel', filename='Tarif-LE-ROY-FACTORY.pdf', trigger=document.activeElement} = {}) {
  const opening=++openingSequence;
  if (!blob || typeof blob.arrayBuffer !== 'function' || !blob.size) throw Error('Le document tarifaire est vide. Réessayez.');
  if (await blob.slice(0,5).text() !== '%PDF-') throw Error('Le document reçu n’est pas un PDF valide. Réessayez.');
  if(opening!==openingSequence) return supersededReader;
  activeClose?.();
  await historyReturn;
  if(opening!==openingSequence) return supersededReader;
  if(pendingHistoryMarker && history.state?.lrfPdfReader===pendingHistoryMarker) throw Error('La fermeture du lecteur est encore en cours. Appuyez sur Retour puis réessayez.');
  pendingHistoryMarker=null;
  const host = document.createElement('div');
  host.dataset.lrfSecurePdfViewer = '';
  const shadow = host.attachShadow({mode:'open'});
  shadow.innerHTML = `<style>${css}</style><dialog aria-labelledby="pdf-title"><div class="reader"><header><span class="brand">LE ROY FACTORY</span><h1 id="pdf-title"></h1><button type="button" data-download disabled aria-label="Télécharger le PDF">↓<span class="download-label">&nbsp;Télécharger</span></button><button type="button" data-close class="primary">Fermer</button></header><div class="toolbar"><div class="pages"><button type="button" data-prev aria-label="Page précédente" disabled>←</button><label>Page <input data-page type="number" inputmode="numeric" min="1" value="1" aria-label="Numéro de page" disabled></label><span data-total>/ —</span><button type="button" data-next aria-label="Page suivante" disabled>→</button></div><div class="zoom"><button type="button" data-out aria-label="Réduire le zoom" disabled>−</button><span class="zoom-label" data-zoom>100 %</span><button type="button" data-in aria-label="Agrandir le zoom" disabled>+</button><button type="button" data-fit disabled>Adapter</button></div><form class="search" role="search"><input data-query type="search" placeholder="Collection, référence…" aria-label="Rechercher dans le tarif" disabled><button type="submit" data-search disabled>Rechercher</button></form></div><main class="stage" aria-label="Pages du tarif"><div class="message" role="status"><p data-message>Chargement du tarif…</p><button type="button" data-retry hidden>Réessayer</button></div><div class="paper"><canvas hidden aria-label="Page du tarif"></canvas></div></main><div class="status" role="status" aria-live="polite"></div></div></dialog>`;
  document.body.append(host);
  const $ = selector => shadow.querySelector(selector), dialog=$('dialog'), canvas=$('canvas'), stage=$('.stage'), message=$('.message'), retry=$('[data-retry]'), status=$('.status');
  $('#pdf-title').textContent=String(title);
  const priorOverflow=document.documentElement.style.overflow, priorBodyOverflow=document.body.style.overflow, priorHistory=history.state;
  const marker='lrf-pdf-'+Math.random().toString(36).slice(2);
  let historyAdded=false;
  try { history.pushState({...history.state,lrfPdfReader:marker},'',location.href); historyAdded=true; } catch {}
  document.documentElement.style.overflow='hidden'; document.body.style.overflow='hidden';
  dialog.showModal();
  $('[data-close]').focus();

  let closed=false, pdf=null, loadingTask=null, pdfWorker=null, nativeWorker=null, workerURL=null, downloadURL=null;
  let pageNumber=1, zoom=1, renderTask=null, renderSequence=0, renderChain=Promise.resolve(), loadSequence=0, searchSequence=0, resizeTimer=null, lastQuery='', lastMatch=0;
  const textCache=new Map();
  const pageText=document.createElement('div');pageText.className='page-text';pageText.setAttribute('aria-label','Texte de la page du tarif');stage.append(pageText);

  function controls() {
    const unavailable=!pdf || closed;
    for (const selector of ['[data-page]','[data-out]','[data-in]','[data-fit]','[data-query]','[data-search]']) $(selector).disabled=unavailable;
    $('[data-prev]').disabled=unavailable || pageNumber<=1;
    $('[data-next]').disabled=unavailable || pageNumber>=pdf.numPages;
    $('[data-out]').disabled=unavailable || zoom<=.5;
    $('[data-in]').disabled=unavailable || zoom>=3;
    $('[data-page]').value=pageNumber;
    $('[data-total]').textContent=pdf?'/ '+pdf.numPages:'/ —';
    $('[data-zoom]').textContent=Math.round(zoom*100)+' %';
    $('[data-download]').disabled=!blob || closed;
  }
  function announce(text, error=false) {
    if (closed) return;
    message.hidden=false; $('[data-message]').textContent=text; retry.hidden=!error;
  }
  function destroyPdf() {
    const oldTask=loadingTask; loadingTask=null; pdf=null;
    const oldWorker=pdfWorker; pdfWorker=null;
    // destroy() waits for PDF.js transport work to stop. The explicit Worker is
    // also terminated immediately, including when loading was interrupted.
    try { Promise.resolve(oldTask?.destroy()).catch(()=>{}); } catch {}
    try { oldWorker?.destroy(); } catch {}
    nativeWorker?.terminate(); nativeWorker=null;
    if (workerURL) URL.revokeObjectURL(workerURL); workerURL=null;
    textCache.clear();
  }
  function close({fromHistory=false}={}) {
    if (closed) return;
    closed=true; ++loadSequence; ++renderSequence; ++searchSequence;
    clearTimeout(resizeTimer); renderTask?.cancel(); destroyPdf();
    if(downloadURL) URL.revokeObjectURL(downloadURL); downloadURL=null; blob=null;
    window.removeEventListener('popstate',onPop); window.removeEventListener('resize',onResize);
    dialog.close(); canvas.width=canvas.height=0; host.remove();
    document.documentElement.style.overflow=priorOverflow; document.body.style.overflow=priorBodyOverflow;
    if(historyAdded && history.state?.lrfPdfReader===marker && !fromHistory) {
      returnFromReader(marker,priorHistory);
    }
    if(trigger?.isConnected) trigger.focus({preventScroll:true}); trigger=null;
    if(activeClose===close) activeClose=null;
  }
  function onPop() { if(history.state?.lrfPdfReader!==marker) close({fromHistory:true}); }
  function onResize() { clearTimeout(resizeTimer); resizeTimer=setTimeout(()=>requestRender(),160); }
  activeClose=close;
  window.addEventListener('popstate',onPop); window.addEventListener('resize',onResize);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  $('[data-close]').addEventListener('click',()=>close());

  function requestRender() {
    const sequence=++renderSequence;
    renderTask?.cancel();
    renderChain=renderChain.catch(()=>{}).then(async()=>{
      if(closed || !pdf || sequence!==renderSequence) return;
      const documentPdf=pdf, number=pageNumber;
      controls(); announce('Affichage de la page '+number+'…');
      canvas.hidden=true; canvas.width=canvas.height=0;pageText.textContent='';
      let page;
      try {
        page=await documentPdf.getPage(number);
        if(closed || sequence!==renderSequence) return;
        const natural=page.getViewport({scale:1});
        const available=Math.max(240,stage.clientWidth-(window.innerWidth<680?20:32));
        const viewport=page.getViewport({scale:available/natural.width*zoom});
        // One canvas, at most four megapixels/4096px on either side. Increasing
        // zoom changes the visible size without allocating an unbounded bitmap.
        const outputScale=Math.min(window.devicePixelRatio||1,2,Math.sqrt(4000000/(viewport.width*viewport.height)),4096/Math.max(viewport.width,viewport.height));
        canvas.width=Math.max(1,Math.floor(viewport.width*outputScale));
        canvas.height=Math.max(1,Math.floor(viewport.height*outputScale));
        canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
        canvas.setAttribute('aria-label','Page '+number+' sur '+documentPdf.numPages+' — '+String(title));
        renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:outputScale===1?undefined:[outputScale,0,0,outputScale,0,0],background:'#ffffff'});
        await renderTask.promise;
        if(closed || sequence!==renderSequence) return;
        canvas.hidden=false;message.hidden=true;stage.scrollTop=0;
        status.textContent='Page '+number+' sur '+documentPdf.numPages;
        try {
          const content=await page.getTextContent();
          if(!closed && sequence===renderSequence) pageText.textContent=content.items.map(item=>item.str||'').join(' ');
        } catch {}
      } catch(error) {
        if(closed || sequence!==renderSequence || error?.name==='RenderingCancelledException') return;
        announce('Cette page ne peut pas être affichée. Réessayez.',true);
      } finally {
        if(sequence===renderSequence) renderTask=null;
        try { page?.cleanup(); } catch {}
      }
    });
    return renderChain;
  }
  async function load() {
    const sequence=++loadSequence;
    ++renderSequence; ++searchSequence;renderTask?.cancel();
    destroyPdf();controls();announce('Chargement du tarif…');
    try {
      const {library,workerBlob}=await runtime();
      if(closed || sequence!==loadSequence) return;
      workerURL=URL.createObjectURL(workerBlob);
      nativeWorker=new Worker(workerURL,{type:'module'});
      pdfWorker=new library.PDFWorker({port:nativeWorker});
      const data=new Uint8Array(await blob.arrayBuffer());
      if(closed || sequence!==loadSequence) return;
      loadingTask=library.getDocument({data,worker:pdfWorker,isEvalSupported:false,useSystemFonts:true,isImageDecoderSupported:false});
      const loaded=await loadingTask.promise;
      if(closed || sequence!==loadSequence) { await loaded.destroy(); return; }
      pdf=loaded;pageNumber=Math.min(pageNumber,pdf.numPages);controls();
      await requestRender();
    } catch(error) {
      if(closed || sequence!==loadSequence) return;
      destroyPdf();controls();
      announce(error?.name==='PasswordException'?'Ce PDF est protégé par un mot de passe. Contactez votre agent.':error?.message?.startsWith('Ce navigateur')?error.message:'Le tarif n’a pas pu être affiché. Réessayez.',true);
    }
  }
  function go(number) {
    if(!pdf || closed) return;
    pageNumber=Math.max(1,Math.min(pdf.numPages,Math.round(Number(number)||1)));requestRender();
  }
  $('[data-prev]').addEventListener('click',()=>go(pageNumber-1));
  $('[data-next]').addEventListener('click',()=>go(pageNumber+1));
  $('[data-page]').addEventListener('change',event=>go(event.target.value));
  $('[data-page]').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();go(event.target.value);}});
  for(const [selector,change] of [['[data-in]',.25],['[data-out]',-.25]]) $(selector).addEventListener('click',()=>{zoom=Math.max(.5,Math.min(3,zoom+change));requestRender();});
  $('[data-fit]').addEventListener('click',()=>{zoom=1;requestRender();});
  retry.addEventListener('click',()=>pdf?requestRender():load());
  $('[data-download]').addEventListener('click',()=>{
    if(closed || !blob) return;
    if(!downloadURL) downloadURL=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=downloadURL;link.download=String(filename).replace(/[\\/\u0000-\u001f]/g,'_');
    shadow.append(link);link.click();link.remove();
  });
  const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
  $('.search').addEventListener('submit',async event=>{
    event.preventDefault();const query=normalize($('[data-query]').value.trim());
    if(!query || !pdf || closed) return;
    const sequence=++searchSequence, documentPdf=pdf;
    const start=query===lastQuery && pageNumber===lastMatch?pageNumber%documentPdf.numPages+1:pageNumber;
    lastQuery=query;
    $('[data-search]').disabled=true;
    try {
      for(let offset=0;offset<documentPdf.numPages;offset++) {
        if(closed || sequence!==searchSequence || pdf!==documentPdf) return;
        const number=(start-1+offset)%documentPdf.numPages+1;
        status.textContent='Recherche dans le tarif… '+(offset+1)+' / '+documentPdf.numPages;
        let text=textCache.get(number);
        if(text===undefined) {
          const page=await documentPdf.getPage(number), content=await page.getTextContent();
          text=normalize(content.items.map(item=>item.str||'').join(' '));
          if(closed || sequence!==searchSequence) return;
          textCache.set(number,text);if(textCache.size>12) textCache.delete(textCache.keys().next().value);
          if(number!==pageNumber) { try { page.cleanup(); } catch {} }
        }
        if(text.includes(query)) { lastMatch=number;go(number);await renderChain;if(!closed)status.textContent='Texte trouvé à la page '+number+'. Rechercher à nouveau pour continuer.';return; }
      }
      if(!closed) status.textContent='Aucun résultat pour « '+$('[data-query]').value.trim()+' ».';
    } catch { if(!closed) status.textContent='La recherche a été interrompue. Réessayez.'; }
    finally { if(!closed && sequence===searchSequence) $('[data-search]').disabled=!pdf; }
  });
  $('[data-query]').addEventListener('input',()=>{++searchSequence;if(!closed)$('[data-search]').disabled=!pdf;});
  controls();
  await load();
  return Object.freeze({close});
}
