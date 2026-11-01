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

// Render the visible part at the current zoom, never stretch a whole-page bitmap.
// This keeps a dense tariff sharp on high-DPI phones without giant canvases.
export function pdfTileGeometry(page, view, deviceScale=1, budget=4000000) {
  const margin=128, grid=64;
  const left=Math.max(0,Math.floor((view.left-page.left-margin)/grid)*grid);
  const top=Math.max(0,Math.floor((view.top-page.top-margin)/grid)*grid);
  const right=Math.min(page.width,Math.ceil((view.left+view.width-page.left+margin)/grid)*grid);
  const bottom=Math.min(page.height,Math.ceil((view.top+view.height-page.top+margin)/grid)*grid);
  if(right<=left || bottom<=top) return null;
  const width=right-left,height=bottom-top;
  const scale=Math.min(Math.max(1,deviceScale||1),3,Math.sqrt(budget/(width*height)),4096/Math.max(width,height));
  return {left,top,width,height,scale,pixelWidth:Math.max(1,Math.floor(width*scale)),pixelHeight:Math.max(1,Math.floor(height*scale))};
}

export function pdfZoomTarget(page, anchor, viewport) {
  return {
    left:Math.max(0,page.left+anchor.x*page.width-anchor.screenX),
    top:Math.max(0,Math.min(viewport.documentHeight-viewport.height,page.top+anchor.y*page.height-anchor.screenY))
  };
}

const css = `
:host{all:initial;position:fixed;inset:0;z-index:2147483647;color:#252c30;font:14px/1.4 Arial,sans-serif}
*{box-sizing:border-box}dialog{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#dddcd8;color:#252c30;font:inherit}dialog::backdrop{background:#dddcd8}
.reader{position:relative;display:flex;flex-direction:column;height:100%;height:100dvh;overflow:hidden}
header{position:relative;z-index:4;flex:none;display:flex;align-items:center;gap:6px;height:48px;padding:2px max(6px,env(safe-area-inset-right)) 2px max(12px,env(safe-area-inset-left));background:#fff;border-bottom:1px solid #dedbd4}
h1{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:1.2;margin:0;font-weight:650}
button,input{font:inherit}button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:7px 11px;border:1px solid #d3cec4;border-radius:8px;background:#fff;color:#252c30;cursor:pointer;white-space:nowrap}button:disabled{opacity:.4;cursor:default}button:focus-visible,input:focus-visible{outline:3px solid #8b6940;outline-offset:2px}button:hover{background:#f2f0eb}
.icon-button{flex:none;width:42px;height:42px;min-height:42px;padding:8px;border:0;background:transparent}.icon-button svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
[hidden]{display:none!important}.tools{position:absolute;z-index:5;top:52px;right:max(8px,env(safe-area-inset-right));width:min(360px,calc(100% - 16px));padding:14px;border:1px solid #d5cec0;border-radius:12px;background:#fff;box-shadow:0 12px 36px #0003}.tools h2{font-size:14px;margin:0 0 10px}.tools-row{display:flex;align-items:center;gap:8px;margin:10px 0}.tools-row label{display:flex;align-items:center;gap:8px}.tools input{height:42px;min-width:0;padding:7px 9px;border:1px solid #bdb7ac;border-radius:7px;background:#fff;color:#252c30;font-size:16px}.tools [data-page]{width:65px}.tools .search{display:flex;gap:7px}.tools [data-query]{flex:1;width:100%}.tools [data-zoom]{min-width:46px;text-align:center}.tools [data-download]{width:100%}.tools-hint{margin:12px 0;color:#655f56;font-size:12px}.status{margin:6px 0 0;color:#655f56;font-size:12px;min-height:0}.status:empty{display:none}
.stage{position:relative;flex:1;min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-gutter:stable;outline:none}.pages-stack{position:relative;transform-origin:0 0;will-change:auto}.pdf-page{position:absolute;background:#fff;box-shadow:0 2px 7px #0002;overflow:hidden;contain:layout paint}.pdf-page canvas{display:block;position:absolute;user-select:none;-webkit-user-select:none;touch-action:pan-x pan-y}.page-placeholder{position:absolute;top:12px;left:12px;color:#aaa;font-size:12px;pointer-events:none}.pdf-page.has-render .page-placeholder{display:none}.page-text{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:pre-wrap}
.page-indicator{position:absolute;z-index:3;bottom:max(8px,env(safe-area-inset-bottom));right:max(10px,env(safe-area-inset-right));min-height:30px;padding:4px 10px;border:1px solid #ddd8ce;border-radius:999px;background:#fffE;box-shadow:0 1px 6px #0001;font-size:12px;opacity:.8}.page-indicator:hover{opacity:1}
.message{position:absolute;z-index:3;top:72px;left:50%;transform:translateX(-50%);width:min(440px,calc(100% - 32px));padding:18px;border:1px solid #ddd5c5;border-radius:12px;background:#fff;text-align:center;box-shadow:0 6px 20px #0002}.message p{margin:0 0 10px}.message p:last-child{margin:0}
@supports(padding-top:env(safe-area-inset-top)){header{height:calc(48px + env(safe-area-inset-top));padding-top:env(safe-area-inset-top)}.tools{top:calc(52px + env(safe-area-inset-top))}}
@media(min-width:900px){h1{font-size:15px}.stage{cursor:auto}.stage.zoomed{cursor:grab}.stage.dragging{cursor:grabbing}}
`;

/** Private bytes remain in memory. Opening never downloads or changes origin. */
export async function showSecurePdf(blob, {title='Tarif professionnel',filename='Tarif-LE-ROY-FACTORY.pdf',trigger=document.activeElement}={}) {
  const opening=++openingSequence;
  if(!blob || typeof blob.arrayBuffer!=='function' || !blob.size)throw Error('Le document tarifaire est vide. Réessayez.');
  if(await blob.slice(0,5).text()!=='%PDF-')throw Error('Le document reçu n’est pas un PDF valide. Réessayez.');
  if(opening!==openingSequence)return supersededReader;
  activeClose?.();await historyReturn;
  if(opening!==openingSequence)return supersededReader;
  if(pendingHistoryMarker && history.state?.lrfPdfReader===pendingHistoryMarker)throw Error('La fermeture du lecteur est encore en cours. Appuyez sur Retour puis réessayez.');
  pendingHistoryMarker=null;
  const host=document.createElement('div');host.dataset.lrfSecurePdfViewer='';
  const shadow=host.attachShadow({mode:'open'});
  shadow.innerHTML=`<style>${css}</style><dialog aria-labelledby="pdf-title"><div class="reader"><header><h1 id="pdf-title"></h1><button class="icon-button" type="button" data-tools-toggle aria-label="Outils du PDF" aria-expanded="false" aria-controls="pdf-tools"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></button><button class="icon-button" type="button" data-close aria-label="Fermer le tarif"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></header><section class="tools" id="pdf-tools" aria-label="Outils du PDF" hidden><h2>Rechercher dans le tarif</h2><form class="search" role="search"><input data-query type="search" placeholder="Collection, référence…" aria-label="Rechercher dans le tarif" disabled><button data-search type="submit" disabled>Chercher</button></form><div class="tools-row"><label>Page <input data-page type="number" inputmode="numeric" min="1" value="1" aria-label="Numéro de page" disabled></label><span data-total>/ —</span></div><div class="tools-row"><button type="button" data-out aria-label="Réduire le zoom" disabled>−</button><span data-zoom>100 %</span><button type="button" data-in aria-label="Agrandir le zoom" disabled>+</button><button type="button" data-fit disabled>Adapter</button></div><p class="tools-hint">Écartez deux doigts pour agrandir. Touchez deux fois pour zoomer. Faites défiler pour changer de page.</p><button type="button" data-download>Télécharger le PDF original</button><p class="status" role="status" aria-live="polite"></p></section><main class="stage" tabindex="0" aria-label="Pages du tarif : faites défiler et zoomez avec deux doigts"><div class="pages-stack"></div></main><button class="page-indicator" type="button" data-page-indicator aria-label="Aller à une page" hidden>1 / —</button><div class="message" role="status"><p data-message>Chargement du tarif…</p><button type="button" data-retry hidden>Réessayer</button></div></div></dialog>`;
  document.body.append(host);
  const $=s=>shadow.querySelector(s),dialog=$('dialog'),stage=$('.stage'),stack=$('.pages-stack'),message=$('.message'),retry=$('[data-retry]'),status=$('.status'),tools=$('.tools');
  $('#pdf-title').textContent=String(title);
  const priorOverflow=document.documentElement.style.overflow,priorBodyOverflow=document.body.style.overflow,priorHistory=history.state;
  const marker='lrf-pdf-'+Math.random().toString(36).slice(2);
  let historyAdded=false;
  try{history.pushState({...history.state,lrfPdfReader:marker},'',location.href);historyAdded=true;}catch{}
  document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';dialog.showModal();$('[data-close]').focus();
  let closed=false,pdf=null,loadingTask=null,pdfWorker=null,nativeWorker=null,workerURL=null,downloadURL=null;
  let records=[],zoom=1,pageNumber=1,fitScale=1,documentHeight=0,renderTask=null,renderSequence=0,renderChain=Promise.resolve(),loadSequence=0,searchSequence=0;
  let renderTimer=null,resizeTimer=null,ignoreScrollUntil=0,lastQuery='',lastMatch=0,gesture=null,lastTap=null,drag=null,pinchTapSuppressed=false;
  const textCache=new Map();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const view=()=>({left:stage.scrollLeft,top:stage.scrollTop,width:stage.clientWidth,height:stage.clientHeight});

  function controls(){
    const unavailable=!pdf||closed;
    for(const s of ['[data-page]','[data-in]','[data-out]','[data-fit]','[data-query]','[data-search]'])$(s).disabled=unavailable;
    $('[data-out]').disabled=unavailable||zoom<=.75;$('[data-in]').disabled=unavailable||zoom>=8;
    $('[data-page]').value=pageNumber;$('[data-page]').max=pdf?.numPages||1;
    $('[data-total]').textContent=pdf?'/ '+pdf.numPages:'/ —';
    $('[data-zoom]').textContent=Math.round(zoom*100)+' %';
    $('[data-page-indicator]').textContent=pageNumber+' / '+(pdf?.numPages||'—');$('[data-page-indicator]').hidden=!pdf;
    $('[data-download]').disabled=!blob||closed;
    stage.classList.toggle('zoomed',zoom>1.05);
  }
  function announce(text,error=false){if(closed)return;message.hidden=false;$('[data-message]').textContent=text;retry.hidden=!error;}
  function toggleTools(open=!tools.hidden){tools.hidden=open;$('[data-tools-toggle]').setAttribute('aria-expanded',String(!open));if(!open)$('[data-query]').focus();else if(tools.contains(shadow.activeElement))$('[data-tools-toggle]').focus({preventScroll:true});}
  $('[data-tools-toggle]').addEventListener('click',()=>toggleTools(!tools.hidden));
  $('[data-page-indicator]').addEventListener('click',()=>{toggleTools(false);$('[data-page]').focus();$('[data-page]').select();});

  function anchorAt(x=stage.clientWidth/2,y=stage.clientHeight/2){
    const pos=view(),pointY=pos.top+y;
    const record=records.find(p=>pointY>=p.top&&pointY<p.top+p.height)||records.reduce((best,p)=>Math.abs(p.top-pointY)<Math.abs((best?.top??Infinity)-pointY)?p:best,null);
    if(!record)return null;
    return {number:record.number,x:clamp((pos.left+x-record.left)/record.width,0,1),y:clamp((pointY-record.top)/record.height,0,1),screenX:x,screenY:y};
  }
  function placeCanvas(record){
    if(!record.canvas||!record.tile)return;
    const ratio=record.width/record.renderedWidth;
    Object.assign(record.canvas.style,{left:record.tile.left*ratio+'px',top:record.tile.top*ratio+'px',width:record.tile.width*ratio+'px',height:record.tile.height*ratio+'px'});
  }
  function layout(anchor){
    if(!records.length)return;
    const gutter=6,maxNatural=Math.max(...records.map(p=>p.naturalWidth));
    fitScale=Math.max(1,stage.clientWidth-gutter*2)/maxNatural;
    const maxWidth=maxNatural*fitScale*zoom,width=Math.max(stage.clientWidth,maxWidth+gutter*2);
    let top=gutter;
    for(const p of records){
      p.width=p.naturalWidth*fitScale*zoom;p.height=p.naturalHeight*fitScale*zoom;p.left=(width-p.width)/2;p.top=top;
      Object.assign(p.element.style,{width:p.width+'px',height:p.height+'px',left:p.left+'px',top:p.top+'px'});placeCanvas(p);top+=p.height+10;
    }
    documentHeight=top;const measuredWidth=stage.clientWidth;stack.style.width=width+'px';stack.style.height=top+'px';
    if(Math.abs(stage.clientWidth-measuredWidth)>.5){layout(anchor);return;}
    if(anchor){const p=records[anchor.number-1];if(p){const target=pdfZoomTarget(p,anchor,{height:stage.clientHeight,documentHeight});ignoreScrollUntil=performance.now()+70;stage.scrollLeft=target.left;stage.scrollTop=target.top;}}
    updatePage();
  }
  function updatePage(){
    if(!records.length)return;
    const mid=stage.scrollTop+stage.clientHeight*.5;
    pageNumber=(records.find(p=>p.top+p.height>mid)||records.at(-1)).number;controls();
  }
  function destroyPdf(){
    const oldTask=loadingTask;loadingTask=null;pdf=null;
    const oldWorker=pdfWorker;pdfWorker=null;
    try{Promise.resolve(oldTask?.destroy()).catch(()=>{});}catch{}
    try{oldWorker?.destroy();}catch{}
    nativeWorker?.terminate();nativeWorker=null;
    if(workerURL)URL.revokeObjectURL(workerURL);workerURL=null;textCache.clear();
    for(const p of records)if(p.canvas)p.canvas.width=p.canvas.height=0;
    records=[];stack.replaceChildren();
  }
  function close({fromHistory=false}={}){
    if(closed)return;closed=true;++loadSequence;++renderSequence;++searchSequence;
    clearTimeout(resizeTimer);clearTimeout(renderTimer);renderTask?.cancel();destroyPdf();
    if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=null;blob=null;
    window.removeEventListener('popstate',onPop);window.removeEventListener('resize',onResize);
    dialog.close();host.remove();document.documentElement.style.overflow=priorOverflow;document.body.style.overflow=priorBodyOverflow;
    if(historyAdded&&history.state?.lrfPdfReader===marker&&!fromHistory)returnFromReader(marker,priorHistory);
    if(trigger?.isConnected)trigger.focus({preventScroll:true});trigger=null;if(activeClose===close)activeClose=null;
  }
  function onPop(){if(history.state?.lrfPdfReader!==marker)close({fromHistory:true});}
  function onResize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(closed)return;layout(anchorAt());requestRender();},160);}
  activeClose=close;window.addEventListener('popstate',onPop);window.addEventListener('resize',onResize);
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(!tools.hidden)toggleTools(true);else close();});
  // A tariff can be above another native dialog (collection details).
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
  $('[data-close]').addEventListener('click',()=>close());

  function covers(record,v){
    const t=record.tile;if(!t||record.renderedWidth!==record.width)return false;
    const x0=Math.max(0,v.left-record.left),x1=Math.min(record.width,v.left+v.width-record.left),y0=Math.max(0,v.top-record.top),y1=Math.min(record.height,v.top+v.height-record.top);
    return t.left<=x0&&t.top<=y0&&t.left+t.width>=x1&&t.top+t.height>=y1;
  }
  async function renderVisible(sequence){
    if(closed||!pdf||sequence!==renderSequence||gesture)return;
    const documentPdf=pdf,v=view();let metadataChanged=false;
    const targets=records.filter(p=>p.top<v.top+v.height+60&&p.top+p.height>v.top-60);
    const budget=Math.min(4000000,12000000/Math.max(1,targets.length));
    for(const p of records){
      if(p.canvas&&!targets.includes(p)){p.canvas.width=p.canvas.height=0;p.canvas.remove();p.canvas=null;p.tile=null;p.element.classList.remove('has-render');p.text.textContent='';}
    }
    for(const p of targets){
      if(closed||pdf!==documentPdf||sequence!==renderSequence)return;
      if(covers(p,view())&&p.canvas.width*p.canvas.height<=budget)continue;
      let page,nextCanvas;
      try{
        page=await documentPdf.getPage(p.number);
        if(closed||sequence!==renderSequence)return;
        const natural=page.getViewport({scale:1});
        if(Math.abs(natural.width-p.naturalWidth)>.1||Math.abs(natural.height-p.naturalHeight)>.1){
          const anchor=anchorAt();p.naturalWidth=natural.width;p.naturalHeight=natural.height;layout(anchor);metadataChanged=true;
        }
        const tile=pdfTileGeometry(p,view(),window.devicePixelRatio||1,budget);if(!tile)continue;
        nextCanvas=document.createElement('canvas');nextCanvas.width=tile.pixelWidth;nextCanvas.height=tile.pixelHeight;
        nextCanvas.setAttribute('aria-label','Page '+p.number+' sur '+documentPdf.numPages+' — '+String(title));
        const viewport=page.getViewport({scale:p.width/natural.width});
        renderTask=page.render({canvasContext:nextCanvas.getContext('2d',{alpha:false}),viewport,transform:[tile.scale,0,0,tile.scale,-tile.left*tile.scale,-tile.top*tile.scale],background:'#ffffff'});
        await renderTask.promise;
        if(closed||sequence!==renderSequence){nextCanvas.width=nextCanvas.height=0;return;}
        const old=p.canvas;p.canvas=nextCanvas;p.tile=tile;p.renderedWidth=p.width;placeCanvas(p);p.element.append(nextCanvas);p.element.classList.add('has-render');
        if(old){old.remove();old.width=old.height=0;}message.hidden=true;
        try{const content=await page.getTextContent();if(!closed&&sequence===renderSequence)p.text.textContent=content.items.map(item=>item.str||'').join(' ');}catch{}
      }catch(error){
        if(nextCanvas&&nextCanvas!==p.canvas)nextCanvas.width=nextCanvas.height=0;
        if(closed||sequence!==renderSequence||error?.name==='RenderingCancelledException')return;
        announce('Cette page ne peut pas être affichée. Réessayez.',true);
      }finally{
        if(sequence===renderSequence)renderTask=null;
        try{page?.cleanup();}catch{}
      }
    }
    updatePage();
    if(metadataChanged&&sequence===renderSequence)requestRender(1);
  }
  function requestRender(delay=0){
    const sequence=++renderSequence;clearTimeout(renderTimer);renderTask?.cancel();
    const run=()=>{renderChain=renderChain.catch(()=>{}).then(()=>renderVisible(sequence));return renderChain;};
    if(delay){renderTimer=setTimeout(run,delay);return renderChain;}return run();
  }
  stage.addEventListener('scroll',()=>{if(closed||gesture)return;updatePage();requestRender(Math.max(45,ignoreScrollUntil-performance.now()));},{passive:true});
  stage.addEventListener('click',()=>{if(!tools.hidden)toggleTools(true);});

  function setZoom(next,anchor=anchorAt()){
    if(!pdf||closed)return;zoom=clamp(next,.75,8);layout(anchor);controls();return requestRender();
  }
  function localPoint(clientX,clientY){const rect=stage.getBoundingClientRect();return {x:clientX-rect.left,y:clientY-rect.top};}
  function toggleZoom(clientX,clientY){const p=localPoint(clientX,clientY);setZoom(zoom>1.1?1:2.5,anchorAt(p.x,p.y));}
  stage.addEventListener('dblclick',e=>{if(!pdf)return;e.preventDefault();toggleZoom(e.clientX,e.clientY);});
  const touchPair=touches=>{const a=touches[0],b=touches[1],point=localPoint((a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2);return {...point,distance:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY))};};
  stage.addEventListener('touchstart',e=>{
    if(!pdf||!records.length)return;
    if(e.touches.length===2){
      e.preventDefault();clearTimeout(renderTimer);++renderSequence;renderTask?.cancel();const p=touchPair(e.touches);
      pinchTapSuppressed=true;gesture={distance:p.distance,zoom,nextZoom:zoom,anchor:anchorAt(p.x,p.y),x:p.x,y:p.y,scrollLeft:stage.scrollLeft,scrollTop:stage.scrollTop};lastTap=null;
    }
  },{passive:false});
  stage.addEventListener('touchmove',e=>{
    if(!gesture||e.touches.length!==2)return;e.preventDefault();
    const p=touchPair(e.touches),g=gesture;g.nextZoom=clamp(g.zoom*p.distance/g.distance,.75,8);const factor=g.nextZoom/g.zoom;
    const tx=p.x+g.scrollLeft-factor*(g.anchor.screenX+g.scrollLeft),ty=p.y+g.scrollTop-factor*(g.anchor.screenY+g.scrollTop);
    g.x=p.x;g.y=p.y;stack.style.transform=`translate(${tx}px,${ty}px) scale(${factor})`;
  },{passive:false});
  function endPinch(e){
    if(!gesture||e.touches.length>=2)return false;
    const g=gesture;gesture=null;stack.style.transform='';lastTap=null;pinchTapSuppressed=e.touches.length>0;
    setZoom(g.nextZoom,{...g.anchor,screenX:g.x,screenY:g.y});return true;
  }
  stage.addEventListener('touchend',e=>{
    if(endPinch(e))return;
    if(pinchTapSuppressed){if(!e.touches.length)pinchTapSuppressed=false;lastTap=null;return;}
    if(e.touches.length||!pdf)return;
    const t=e.changedTouches[0];if(!t)return;const now=performance.now();
    if(lastTap&&now-lastTap.time<320&&Math.hypot(t.clientX-lastTap.x,t.clientY-lastTap.y)<24&&Math.abs(stage.scrollTop-lastTap.scrollTop)<8){e.preventDefault();toggleZoom(t.clientX,t.clientY);lastTap=null;}
    else lastTap={time:now,x:t.clientX,y:t.clientY,scrollTop:stage.scrollTop};
  },{passive:false});
  stage.addEventListener('touchcancel',e=>{endPinch({touches:[]});lastTap=null;pinchTapSuppressed=false;},{passive:true});
  stage.addEventListener('wheel',e=>{
    if(!pdf||(!e.ctrlKey&&!e.metaKey))return;e.preventDefault();const p=localPoint(e.clientX,e.clientY);
    setZoom(zoom*Math.exp(-e.deltaY*.003),anchorAt(p.x,p.y));
  },{passive:false});
  stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0||zoom<=1.05)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop};stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');});
  stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;stage.scrollLeft=drag.left+drag.x-e.clientX;stage.scrollTop=drag.top+drag.y-e.clientY;});
  const endDrag=()=>{drag=null;stage.classList.remove('dragging');};stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);

  function go(number){if(!pdf||closed)return Promise.resolve();pageNumber=clamp(Math.round(Number(number)||1),1,pdf.numPages);const p=records[pageNumber-1];ignoreScrollUntil=performance.now()+70;stage.scrollTop=Math.max(0,p.top-6);stage.scrollLeft=0;controls();return requestRender();}
  $('[data-page]').addEventListener('change',e=>go(e.target.value));
  $('[data-page]').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go(e.target.value);toggleTools(true);stage.focus();}});
  $('[data-in]').addEventListener('click',()=>setZoom(zoom+.25));$('[data-out]').addEventListener('click',()=>setZoom(zoom-.25));$('[data-fit]').addEventListener('click',()=>setZoom(1));
  dialog.addEventListener('keydown',e=>{
    if(/INPUT|TEXTAREA/.test(e.target.tagName)||!pdf)return;
    if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(zoom+.25);}else if(e.key==='-'){e.preventDefault();setZoom(zoom-.25);}
    else if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();stage.scrollTop+=(e.key==='PageDown'?1:-1)*stage.clientHeight*.9;}
  });
  retry.addEventListener('click',()=>pdf?requestRender():load());
  $('[data-download]').addEventListener('click',()=>{if(closed||!blob)return;if(!downloadURL)downloadURL=URL.createObjectURL(blob);const link=document.createElement('a');link.href=downloadURL;link.download=String(filename).replace(/[\\/\u0000-\u001f]/g,'_');shadow.append(link);link.click();link.remove();});
  const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
  $('.search').addEventListener('submit',async e=>{
    e.preventDefault();const query=normalize($('[data-query]').value.trim());if(!query||!pdf||closed)return;
    const sequence=++searchSequence,documentPdf=pdf,start=query===lastQuery&&pageNumber===lastMatch?pageNumber%documentPdf.numPages+1:pageNumber;lastQuery=query;$('[data-search]').disabled=true;
    try{
      for(let offset=0;offset<documentPdf.numPages;offset++){
        if(closed||sequence!==searchSequence||pdf!==documentPdf)return;const number=(start-1+offset)%documentPdf.numPages+1;
        status.textContent='Recherche… '+(offset+1)+' / '+documentPdf.numPages;let text=textCache.get(number);
        if(text===undefined){const page=await documentPdf.getPage(number),content=await page.getTextContent();text=normalize(content.items.map(i=>i.str||'').join(' '));if(closed||sequence!==searchSequence)return;textCache.set(number,text);if(textCache.size>12)textCache.delete(textCache.keys().next().value);}
        if(text.includes(query)){lastMatch=number;await go(number);if(!closed)status.textContent='Texte trouvé à la page '+number+'. Rechercher à nouveau pour continuer.';return;}
      }
      if(!closed)status.textContent='Aucun résultat pour « '+$('[data-query]').value.trim()+' ».';
    }catch{if(!closed)status.textContent='La recherche a été interrompue. Réessayez.';}
    finally{if(!closed&&sequence===searchSequence)$('[data-search]').disabled=!pdf;}
  });
  $('[data-query]').addEventListener('input',()=>{++searchSequence;if(!closed)$('[data-search]').disabled=!pdf;});
  async function load(){
    const sequence=++loadSequence;++renderSequence;++searchSequence;renderTask?.cancel();clearTimeout(renderTimer);destroyPdf();controls();announce('Chargement du tarif…');
    try{
      const {library,workerBlob}=await runtime();if(closed||sequence!==loadSequence)return;
      workerURL=URL.createObjectURL(workerBlob);nativeWorker=new Worker(workerURL,{type:'module'});pdfWorker=new library.PDFWorker({port:nativeWorker});
      const data=new Uint8Array(await blob.arrayBuffer());if(closed||sequence!==loadSequence)return;
      loadingTask=library.getDocument({data,worker:pdfWorker,isEvalSupported:false,useSystemFonts:true,isImageDecoderSupported:false});
      const loaded=await loadingTask.promise;if(closed||sequence!==loadSequence){await loaded.destroy();return;}
      pdf=loaded;const first=await pdf.getPage(1),natural=first.getViewport({scale:1});if(closed||sequence!==loadSequence)return;
      records=Array.from({length:pdf.numPages},(_,i)=>{
        const element=document.createElement('section');element.className='pdf-page';element.dataset.number=i+1;element.setAttribute('aria-label','Page '+(i+1));
        const placeholder=document.createElement('span');placeholder.className='page-placeholder';placeholder.textContent='Page '+(i+1);placeholder.setAttribute('aria-hidden','true');
        const text=document.createElement('div');text.className='page-text';element.append(placeholder,text);stack.append(element);
        return {number:i+1,element,text,naturalWidth:natural.width,naturalHeight:natural.height,canvas:null,tile:null};
      });
      pageNumber=1;stage.scrollTop=stage.scrollLeft=0;layout();controls();await requestRender();
    }catch(error){
      if(closed||sequence!==loadSequence)return;destroyPdf();controls();
      announce(error?.name==='PasswordException'?'Ce PDF est protégé par un mot de passe. Contactez votre agent.':error?.message?.startsWith('Ce navigateur')?error.message:'Le tarif n’a pas pu être affiché. Réessayez.',true);
    }
  }
  controls();await load();return Object.freeze({close});
}
