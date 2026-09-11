(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_ALL_SERIES_GALLERY_20260911__) return;
  window.__LRF_REVIGLASS_ALL_SERIES_GALLERY_20260911__ = true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clean=v=>String(v||'').trim();
  const key=v=>clean(v).toUpperCase();

  const CODES={
    'AGUAMARINA':'PA-01','JADE':'PA-02','ZAFIRO':'PA-03','SANDY BALI':'PA-04','BLUE BALI':'PA-05','GREEN BALI':'PA-06','DEEP RIVER':'PA-07','TURQUESE LAGOON':'PA-10','OK STONE':'PA-11','APATITE':'PA-12',
    'CALACATTA':'KA-01','TRAVERTINE':'KA-02','SMOKY':'KA-03','BLACK MARBLE':'KA-04','URA':'KA-05','MOANA':'KA-06','BALI STONE':'KA-07','ALOHA':'KA-08','BLUE MOON':'KA-09','WALLIS':'KA-10','AQUARELA':'KA-12','MEGHAN':'KA-14',
    'SWAN':'LM-01','DOVE':'LM-02','ALBATROS':'LM-03','KIWI':'LM-04','FLAMINGO':'LM-05','FALCON':'LM-06',
    'TANGANIKA':'MIX25-PS-TANGANIKA','VICTORIA':'MIX25-PS-VICTORIA','NESS':'MIX25-PS-NESS','MIX AQUA':'MIX25-PS-AQUA'
  };
  const SPECIAL={
    'TANGANIKA':['TANGANICA','TANGANIKA'],
    'MIX AQUA':['AQUA','MIX25-PS-AQUA'],
    'UROLA':['UROLA','MIX-IRIS-UROLA'], 'ORIA':['ORIA','MIX-IRIS-ORIA'], 'URUMEA':['URUMEA','MIX-IRIS-URUMEA'], 'BIDASOA':['BIDASOA','MIX-IRIS-BIDASOA'],
    'ERNIO':['ERNIO','MIX-IRIS-ERNIO'], 'DEBA':['DEBA','MIX-IRIS-DEBA'], 'CHAVON':['CHAVON','MIX-IRIS-CHAVON'], 'ADUR':['ADUR','MIX-IRIS-ADUR']
  };
  const cache=new Map();
  let activeRef='',activeImages=[],activeIndex=0,touchX=0,touchY=0;

  function installStyle(){
    if($('#rev-all-gallery-style')) return;
    const st=document.createElement('style');st.id='rev-all-gallery-style';st.textContent=`
      .rev-all-gallery{margin:14px 0 0;border:1px solid #ddd5c8;border-radius:14px;background:#fff;padding:12px}
      .rev-all-gallery h3{margin:0 0 8px;font-size:1rem}.rev-all-gallery small{display:block;color:#746d63;margin-bottom:10px}
      .rev-all-loading{padding:22px;text-align:center;border:1px dashed #d4af37;border-radius:12px;background:#fffaf0;font-weight:800;color:#6b5717}
      .rev-all-main{position:relative;overflow:hidden;border-radius:12px;background:#eee;aspect-ratio:4/3;cursor:zoom-in}.rev-all-main img{width:100%;height:100%;object-fit:cover;display:block}
      .rev-all-ref{position:absolute;left:10px;top:10px;background:rgba(255,247,218,.96);color:#4e3f13;border:1px solid #d4af37;border-radius:999px;padding:7px 11px;font-size:.8rem;font-weight:950;z-index:2}
      .rev-all-zoom{position:absolute;right:9px;bottom:9px;background:rgba(255,255,255,.94);color:#4d421f;border:1px solid #d4af37;border-radius:999px;padding:6px 9px;font-size:.72rem;font-weight:800}
      .rev-all-thumbs{display:flex;gap:8px;overflow:auto;margin-top:8px;padding-bottom:2px}.rev-all-thumb{flex:0 0 86px;width:86px;height:66px;border:2px solid transparent;border-radius:9px;overflow:hidden;padding:0;background:#eee}.rev-all-thumb.active{border-color:#d4af37}.rev-all-thumb img{width:100%;height:100%;object-fit:cover;display:block}
      .rev-all-lightbox{position:fixed;inset:0;z-index:1000210;display:none;background:rgba(18,17,14,.94);align-items:center;justify-content:center;overflow:hidden;touch-action:pan-y;padding:18px}.rev-all-lightbox.open{display:flex}
      .rev-all-lightbox img{max-width:96vw;max-height:88vh;user-select:none;-webkit-user-drag:none;border-radius:12px;box-shadow:0 12px 42px rgba(0,0,0,.4)}
      .rev-all-close{position:fixed;top:14px;right:14px;z-index:4;width:48px;height:48px;border-radius:50%;border:1px solid #d4af37;background:#fff7da;color:#5d4a12;font-size:1.8rem}
      .rev-all-nav{position:fixed;top:50%;transform:translateY(-50%);z-index:4;width:48px;height:48px;border-radius:50%;border:1px solid #d4af37;background:#fff7da;color:#5d4a12;font-size:2rem}.rev-all-nav.prev{left:14px}.rev-all-nav.next{right:14px}
      .rev-all-counter{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:4;color:#5d4a12;background:#fff7da;border:1px solid #d4af37;padding:7px 11px;border-radius:999px;font-size:.8rem;font-weight:900}
      .rev-all-lightbox .rev-all-photo-ref{position:fixed;left:18px;top:18px;z-index:4;background:#fff7da;color:#4e3f13;border:1px solid #d4af37;border-radius:999px;padding:9px 14px;font-size:1rem;font-weight:950}
      @media(max-width:700px){.rev-all-main{aspect-ratio:1/1}.rev-all-thumb{flex-basis:72px;width:72px;height:56px}.rev-all-nav{display:none}.rev-all-lightbox img{max-width:96vw;max-height:82vh}.rev-all-lightbox .rev-all-photo-ref{left:12px;top:12px;font-size:.9rem;padding:8px 11px}}
    `;document.head.appendChild(st);
  }

  function basesFor(ref){
    const r=key(ref),out=[];
    const code=CODES[r]; if(code) out.push(code);
    if(/^LU-\d+/i.test(r)) out.push((r.match(/^LU-\d+/i)||[])[0]);
    if(/^AB\s*-?\s*\d+/i.test(r)) out.push(r.replace(/\s+/g,''));
    if(/^DK\s*-?\s*\d+/i.test(r)) out.push(r.replace(/\s+/g,''));
    (SPECIAL[r]||[]).forEach(x=>out.push(x));
    out.push(r,r.replace(/\s+/g,'-'),r.replace(/[\s-]+/g,''));
    if(code){out.push(`${code}-${r}`,`${code.replace(/-/g,'')}-${r}`,code.replace(/-/g,''));}
    return [...new Set(out.filter(Boolean))];
  }

  function candidates(ref){
    const years=['2018/11','2019/06','2020/02','2021/06'];
    const files=[];
    for(const b0 of basesFor(ref)){
      const b=b0.replace(/\s+/g,'-');
      const simple=b.replace(/-/g,'');
      const low=b.toLowerCase();
      const names=[`${b}web1.jpg`,`${b}web2.jpg`,`${b}-web1.jpg`,`${b}-web2.jpg`,`${b}_01.jpg`,`${b}_02.jpg`,`${low}_01.jpg`,`${low}_02.jpg`,`${simple}web1.jpg`,`${simple}web2.jpg`];
      for(const y of years) for(const n of names) files.push(`https://reviglass.es/wp-content/uploads/${y}/${n}`);
    }
    return [...new Set(files)];
  }

  function probe(url){return new Promise(resolve=>{const im=new Image();let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(t);im.onload=im.onerror=null;resolve(v)};const t=setTimeout(()=>finish(false),2200);im.onload=()=>finish(im.naturalWidth>180&&im.naturalHeight>120);im.onerror=()=>finish(false);im.src=url})}
  async function discover(ref){
    const k=key(ref);if(cache.has(k)) return cache.get(k);
    const urls=candidates(ref),found=[];
    for(let i=0;i<urls.length&&found.length<3;i+=8){
      const batch=urls.slice(i,i+8),ok=await Promise.all(batch.map(probe));
      ok.forEach((v,j)=>{if(v&&found.length<3)found.push(batch[j])});
    }
    cache.set(k,found);return found;
  }

  function ensureLightbox(){
    let lb=$('#rev-all-lightbox');if(lb)return lb;
    lb=document.createElement('div');lb.id='rev-all-lightbox';lb.className='rev-all-lightbox';lb.innerHTML=`<button type="button" class="rev-all-close">×</button><button type="button" class="rev-all-nav prev">‹</button><img alt="Reviglass HD"><button type="button" class="rev-all-nav next">›</button><div class="rev-all-photo-ref"></div><div class="rev-all-counter"></div>`;document.body.appendChild(lb);
    $('.rev-all-close',lb).onclick=closeLightbox;$('.prev',lb).onclick=()=>showPhoto(activeIndex-1);$('.next',lb).onclick=()=>showPhoto(activeIndex+1);lb.addEventListener('click',e=>{if(e.target===lb)closeLightbox()});
    lb.addEventListener('touchstart',e=>{if(e.touches.length===1){touchX=e.touches[0].clientX;touchY=e.touches[0].clientY}},{passive:true});
    lb.addEventListener('touchend',e=>{if(!e.changedTouches?.length)return;const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.15)showPhoto(activeIndex+(dx<0?1:-1))},{passive:true});
    return lb;
  }
  function setPhoto(){const lb=ensureLightbox(),img=$('img',lb);img.src=activeImages[activeIndex];lb.dataset.revRef=activeRef;$('.rev-all-photo-ref',lb).textContent=activeRef;$('.rev-all-counter',lb).textContent=`${activeRef} · ${activeIndex+1} / ${activeImages.length}`}
  function showPhoto(i){if(!activeImages.length)return;activeIndex=(i+activeImages.length)%activeImages.length;setPhoto();ensureLightbox().classList.add('open');document.body.style.overflow='hidden'}
  function closeLightbox(){$('#rev-all-lightbox')?.classList.remove('open');document.body.style.overflow=$('#reviglass-pool-modal')?.classList.contains('open')?'hidden':''}

  async function render(ref){
    const modal=$('#reviglass-pool-modal');if(!modal)return;
    let box=$('.rev-all-gallery',modal);if(!box){box=document.createElement('section');box.className='rev-all-gallery';const action=$('.rev-ref-choice',modal);(action?.parentNode||$('#reviglass-modal-body',modal))?.insertBefore(box,action||null)}
    box.innerHTML=`<div class="rev-all-loading">Recherche des photos HD officielles Reviglass pour ${ref}…</div>`;
    const imgs=await discover(ref);if(key($('.reviglass-ref-list .rev-selected-ref',modal)?.textContent||ref)!==key(ref))return;
    if(!imgs.length){box.innerHTML=`<h3>${ref}</h3><small>Photo HD officielle non trouvée automatiquement. La référence reste sélectionnée pour disponibilité ou commande.</small>`;return}
    activeRef=ref;activeImages=imgs;activeIndex=0;
    box.innerHTML=`<h3>Photos HD — ${ref}</h3><small>Photos officielles Reviglass · appuyez sur l’image pour l’agrandir.</small><div class="rev-all-main" data-rev-all-open="0"><span class="rev-all-ref">${ref}</span><img src="${imgs[0]}" alt="${ref} Reviglass" loading="eager"><span class="rev-all-zoom">🔍 Agrandir</span></div><div class="rev-all-thumbs">${imgs.map((u,i)=>`<button type="button" class="rev-all-thumb${i===0?' active':''}" data-rev-all-thumb="${i}"><img src="${u}" alt="" loading="lazy"></button>`).join('')}</div>`;
    setTimeout(()=>showPhoto(0),0);
  }

  document.addEventListener('click',e=>{
    const ref=e.target.closest?.('.reviglass-ref-list span');
    if(ref){const label=clean(ref.textContent);if(!/^PS\d+$/i.test(label))setTimeout(()=>render(label),0);return}
    const main=e.target.closest?.('[data-rev-all-open]');if(main){showPhoto(Number(main.dataset.revAllOpen||0));return}
    const th=e.target.closest?.('[data-rev-all-thumb]');if(th){const i=Number(th.dataset.revAllThumb||0),box=th.closest('.rev-all-gallery'),img=$('.rev-all-main img',box);if(img)img.src=activeImages[i];$$('.rev-all-thumb',box).forEach((b,j)=>b.classList.toggle('active',j===i));$('.rev-all-main',box).dataset.revAllOpen=String(i)}
  },true);
  document.addEventListener('keydown',e=>{if(!$('#rev-all-lightbox')?.classList.contains('open'))return;if(e.key==='Escape')closeLightbox();if(e.key==='ArrowLeft')showPhoto(activeIndex-1);if(e.key==='ArrowRight')showPhoto(activeIndex+1)});
  installStyle();
})();