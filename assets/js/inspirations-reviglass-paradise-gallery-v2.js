(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_PARADISE_V2__) return;
  window.__LRF_REVIGLASS_PARADISE_V2__ = true;

  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clean=v=>String(v||'').trim();
  const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const ITEMS=[
    {code:'PA-01',name:'AGUAMARINA',slug:'aguamarina'},
    {code:'PA-02',name:'JADE',slug:'jade'},
    {code:'PA-03',name:'ZAFIRO',slug:'zafiro'},
    {code:'PA-04',name:'SANDY BALI',slug:'sandy-bali'},
    {code:'PA-05',name:'BLUE BALI',slug:'blue-bali'},
    {code:'PA-06',name:'GREEN BALI',slug:'green-bali'},
    {code:'PA-07',name:'DEEP RIVER',slug:'deep-river'},
    {code:'PA-10',name:'TURQUESE LAGOON',slug:'turquese-lagoon'},
    {code:'PA-11',name:'OK STONE',slug:'ok-stone'},
    {code:'PA-12',name:'APATITE',slug:'apatite'}
  ];
  const byKey=new Map();
  ITEMS.forEach(x=>[x.code,x.name,`${x.code} ${x.name}`].forEach(k=>byKey.set(norm(k),x)));
  const cache=new Map();
  let activeItem=null,activeImages=[],activeIndex=0,touchX=0,touchY=0;

  function style(){if($('#rev-paradise-v2-style'))return;const s=document.createElement('style');s.id='rev-paradise-v2-style';s.textContent=`
    .rev-paradise-v2{margin:14px 0 0;border:1px solid #ddd5c8;border-radius:14px;background:#fff;padding:12px}
    .rev-paradise-v2 h3{margin:0 0 6px;font-size:1.05rem}.rev-paradise-v2 small{display:block;color:#746d63;margin-bottom:10px}
    .rev-paradise-loading{padding:24px 14px;text-align:center;border:1px dashed #d4af37;border-radius:12px;background:#fffaf0;color:#6b5717;font-weight:900}
    .rev-paradise-main{position:relative;overflow:hidden;border-radius:12px;background:#eee;aspect-ratio:4/3;cursor:zoom-in;touch-action:pan-y}
    .rev-paradise-main img{width:100%;height:100%;object-fit:cover;display:block}.rev-paradise-ref{position:absolute;left:10px;top:10px;background:#fff7da;color:#4e3f13;border:1px solid #d4af37;border-radius:999px;padding:7px 11px;font-weight:950;z-index:2}.rev-paradise-zoom{position:absolute;right:9px;bottom:9px;background:#fff;color:#4d421f;border:1px solid #d4af37;border-radius:999px;padding:7px 10px;font-weight:850}
    .rev-paradise-thumbs{display:flex;gap:8px;overflow:auto;margin-top:8px;padding-bottom:2px}.rev-paradise-thumb{flex:0 0 86px;width:86px;height:66px;border:2px solid transparent;border-radius:9px;overflow:hidden;padding:0;background:#eee}.rev-paradise-thumb.active{border-color:#d4af37}.rev-paradise-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .rev-paradise-empty{padding:16px;border:1px dashed #d8c991;border-radius:12px;background:#fffaf0}.rev-paradise-empty a{color:#5d4a12;font-weight:900}
    .rev-paradise-lb{position:fixed;inset:0;z-index:1000290;display:none;align-items:center;justify-content:center;background:rgba(18,17,14,.95);padding:18px;touch-action:pan-y}.rev-paradise-lb.open{display:flex}.rev-paradise-lb img{max-width:96vw;max-height:88vh;object-fit:contain;border-radius:12px;user-select:none;-webkit-user-drag:none}
    .rev-paradise-close,.rev-paradise-prev,.rev-paradise-next{position:fixed;z-index:5;width:50px;height:50px;border-radius:50%;border:1px solid #d4af37;background:#fff7da;color:#5d4a12;font-size:1.9rem}.rev-paradise-close{top:14px;right:14px}.rev-paradise-prev{left:14px;top:50%;transform:translateY(-50%)}.rev-paradise-next{right:14px;top:50%;transform:translateY(-50%)}.rev-paradise-count{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);background:#fff7da;border:1px solid #d4af37;border-radius:999px;padding:7px 11px;font-weight:900;color:#5d4a12}
    @media(max-width:700px){.rev-paradise-main{aspect-ratio:1/1}.rev-paradise-thumb{flex-basis:72px;width:72px;height:56px}.rev-paradise-prev,.rev-paradise-next{display:none}.rev-paradise-lb img{max-height:82vh}.rev-ref-choice{margin-top:10px!important}}
  `;document.head.appendChild(s)}

  function candidates(item){
    const years=['2018/07','2018/11','2019/06','2020/02','2021/06','2022/04','2022/06','2023/01','2024/05','2024/10'];
    const c=item.code, cn=c.replace('-',''), n=item.name, nd=n.replace(/\s+/g,'-'), ns=n.replace(/\s+/g,''), low=n.toLowerCase().replace(/\s+/g,'-');
    const stems=[c,cn,n,nd,ns,`${c}-${nd}`,`${c}_${ns}`,item.slug,item.slug.toUpperCase()];
    const suffixes=['web1.jpg','web2.jpg','-web1.jpg','-web2.jpg','_web1.jpg','_web2.jpg','_01.jpg','_02.jpg','-01.jpg','-02.jpg','.jpg','-700x700.jpg','-700x933.jpg'];
    const out=[];
    for(const y of years) for(const st of stems) for(const sf of suffixes) out.push(`https://reviglass.es/wp-content/uploads/${y}/${st}${sf}`);
    // common WordPress resized variants and descriptive names
    for(const y of years){out.push(`https://reviglass.es/wp-content/uploads/${y}/${low}_01.jpg`,`https://reviglass.es/wp-content/uploads/${y}/${low}_02.jpg`,`https://reviglass.es/wp-content/uploads/${y}/${low}-01.jpg`,`https://reviglass.es/wp-content/uploads/${y}/${low}-02.jpg`)}
    return [...new Set(out)];
  }
  function probe(url){return new Promise(resolve=>{const im=new Image();let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(t);im.onload=im.onerror=null;resolve(v)};const t=setTimeout(()=>finish(false),2200);im.onload=()=>finish(im.naturalWidth>120&&im.naturalHeight>120);im.onerror=()=>finish(false);im.decoding='async';im.src=url})}
  async function discover(item){if(cache.has(item.code))return cache.get(item.code);const urls=candidates(item),found=[];for(let i=0;i<urls.length&&found.length<4;i+=24){const batch=urls.slice(i,i+24),ok=await Promise.all(batch.map(probe));ok.forEach((v,j)=>{if(v&&found.length<4)found.push(batch[j])});if(found.length>=2)break}cache.set(item.code,found);return found}

  function lb(){let x=$('#rev-paradise-lb');if(x)return x;x=document.createElement('div');x.id='rev-paradise-lb';x.className='rev-paradise-lb';x.innerHTML='<button class="rev-paradise-close" type="button">×</button><button class="rev-paradise-prev" type="button">‹</button><img alt="Reviglass Paradise Stones HD"><button class="rev-paradise-next" type="button">›</button><div class="rev-paradise-count"></div>';document.body.appendChild(x);$('.rev-paradise-close',x).onclick=closeLb;$('.rev-paradise-prev',x).onclick=()=>showLb(activeIndex-1);$('.rev-paradise-next',x).onclick=()=>showLb(activeIndex+1);x.onclick=e=>{if(e.target===x)closeLb()};x.addEventListener('touchstart',e=>{if(e.touches.length===1){touchX=e.touches[0].clientX;touchY=e.touches[0].clientY}},{passive:true});x.addEventListener('touchend',e=>{const t=e.changedTouches?.[0];if(!t)return;const dx=t.clientX-touchX,dy=t.clientY-touchY;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.15)showLb(activeIndex+(dx<0?1:-1))},{passive:true});return x}
  function showLb(i){if(!activeImages.length)return;activeIndex=(i+activeImages.length)%activeImages.length;const x=lb();$('img',x).src=activeImages[activeIndex];$('.rev-paradise-count',x).textContent=`${activeItem.code} ${activeItem.name} · ${activeIndex+1} / ${activeImages.length}`;x.classList.add('open');document.body.style.overflow='hidden'}
  function closeLb(){$('#rev-paradise-lb')?.classList.remove('open');document.body.style.overflow=$('#reviglass-pool-modal')?.classList.contains('open')?'hidden':''}
  function moveRef(dir){const i=ITEMS.findIndex(x=>x.code===activeItem?.code);if(i<0)return;const next=ITEMS[(i+dir+ITEMS.length)%ITEMS.length];const modal=$('#reviglass-pool-modal');const target=$$('.reviglass-ref-list span',modal).find(x=>norm(x.textContent)===norm(next.name)||norm(x.textContent)===norm(`${next.code} ${next.name}`));target?.click()}

  async function render(item){
    const modal=$('#reviglass-pool-modal');if(!modal)return;
    activeItem=item;activeImages=[];activeIndex=0;
    $('.rev-all-gallery',modal)?.remove();$('.rev-paradise-v2',modal)?.remove();
    let box=document.createElement('section');box.className='rev-paradise-v2';
    const action=$('.rev-ref-choice',modal);(action?.parentNode||$('#reviglass-modal-body',modal))?.insertBefore(box,action||null);
    box.innerHTML=`<div class="rev-paradise-loading">Chargement du visuel officiel ${item.code} ${item.name}…</div>`;
    const imgs=await discover(item);
    if(activeItem?.code!==item.code)return;
    activeImages=imgs;
    if(!imgs.length){box.innerHTML=`<h3>${item.code} ${item.name}</h3><div class="rev-paradise-empty">Le visuel officiel n’a pas été trouvé automatiquement. <a href="https://reviglass.es/en/producto/${item.slug}/" target="_blank" rel="noopener">Ouvrir la fiche officielle Reviglass</a></div>`;return}
    box.innerHTML=`<h3>Photos HD — ${item.code} ${item.name}</h3><small>Visuels officiels Reviglass · glissez à gauche ou à droite sur smartphone.</small><div class="rev-paradise-main" data-p-open="0"><span class="rev-paradise-ref">${item.code} ${item.name}</span><img src="${imgs[0]}" alt="${item.code} ${item.name}" loading="eager"><span class="rev-paradise-zoom">🔍 Agrandir</span></div><div class="rev-paradise-thumbs">${imgs.map((u,i)=>`<button class="rev-paradise-thumb${i===0?' active':''}" data-p-thumb="${i}" type="button"><img src="${u}" alt="" loading="lazy"></button>`).join('')}</div>`;
    const main=$('.rev-paradise-main',box);main.onclick=()=>showLb(Number(main.dataset.pOpen||0));let sx=0,sy=0;main.addEventListener('touchstart',e=>{if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}},{passive:true});main.addEventListener('touchend',e=>{const t=e.changedTouches?.[0];if(!t)return;const dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.15)return;if(activeImages.length>1){activeIndex=(activeIndex+(dx<0?1:-1)+activeImages.length)%activeImages.length;$('.rev-paradise-main img',box).src=activeImages[activeIndex];main.dataset.pOpen=String(activeIndex);$$('.rev-paradise-thumb',box).forEach((b,j)=>b.classList.toggle('active',j===activeIndex))}else moveRef(dx<0?1:-1)},{passive:true});
    $$('.rev-paradise-thumb',box).forEach(b=>b.onclick=()=>{activeIndex=Number(b.dataset.pThumb||0);$('.rev-paradise-main img',box).src=activeImages[activeIndex];main.dataset.pOpen=String(activeIndex);$$('.rev-paradise-thumb',box).forEach((x,j)=>x.classList.toggle('active',j===activeIndex))});
    // Keep action buttons immediately visible after the gallery.
    const choice=$('.rev-ref-choice',modal);if(choice&&box.nextElementSibling!==choice)box.after(choice);
  }

  document.addEventListener('click',e=>{const el=e.target.closest?.('.reviglass-ref-list span');if(!el)return;const item=byKey.get(norm(el.textContent));if(!item)return;e.stopImmediatePropagation();setTimeout(()=>render(item),0)},true);
  document.addEventListener('keydown',e=>{if(!$('#rev-paradise-lb')?.classList.contains('open'))return;if(e.key==='Escape')closeLb();if(e.key==='ArrowLeft')showLb(activeIndex-1);if(e.key==='ArrowRight')showLb(activeIndex+1)});
  style();
})();