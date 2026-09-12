(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_PARADISE_GALLERY__) return;
  window.__LRF_REVIGLASS_PARADISE_GALLERY__ = true;

  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const norm=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const base='https://reviglass.es/wp-content/uploads/2023/05/';
  const refs={
    'PA01':{label:'PA-01 AGUAMARINA',slug:'PA_01-AGUAMARINA'},
    'AGUAMARINA':{label:'PA-01 AGUAMARINA',slug:'PA_01-AGUAMARINA'},
    'PA02':{label:'PA-02 JADE',slug:'PA_02-JADE'},
    'JADE':{label:'PA-02 JADE',slug:'PA_02-JADE'},
    'PA03':{label:'PA-03 ZAFIRO',slug:'PA_03-ZAFIRO'},
    'ZAFIRO':{label:'PA-03 ZAFIRO',slug:'PA_03-ZAFIRO'},
    'PA04':{label:'PA-04 SANDY BALI',slug:'PA_04-SANDY-BALI'},
    'SANDYBALI':{label:'PA-04 SANDY BALI',slug:'PA_04-SANDY-BALI'},
    'PA05':{label:'PA-05 BLUE BALI',slug:'PA_05-BLUE-BALI'},
    'BLUEBALI':{label:'PA-05 BLUE BALI',slug:'PA_05-BLUE-BALI'},
    'PA06':{label:'PA-06 GREEN BALI',slug:'PA_06-GREEN-BALI'},
    'GREENBALI':{label:'PA-06 GREEN BALI',slug:'PA_06-GREEN-BALI'},
    'PA07':{label:'PA-07 DEEP RIVER',slug:'PA_07-DEEP-RIVER'},
    'DEEPRIVER':{label:'PA-07 DEEP RIVER',slug:'PA_07-DEEP-RIVER'},
    'PA10':{label:'PA-10 TURQUESE LAGOON',slug:'PA_10-TURQUESE-LAGOON'},
    'TURQUESELAGOON':{label:'PA-10 TURQUESE LAGOON',slug:'PA_10-TURQUESE-LAGOON'},
    'PA11':{label:'PA-11 OK STONE',slug:'PA_11-OK-STONE'},
    'OKSTONE':{label:'PA-11 OK STONE',slug:'PA_11-OK-STONE'},
    'PA12':{label:'PA-12 APATITE',slug:'PA_12-APATITE'},
    'APATITE':{label:'PA-12 APATITE',slug:'PA_12-APATITE'}
  };
  let active=[],index=0,current='';

  function style(){if($('#rev-paradise-style'))return;const s=document.createElement('style');s.id='rev-paradise-style';s.textContent=`
    .rev-paradise-gallery{margin:14px 0 0;border:1px solid #ddd5c8;border-radius:14px;background:#fff;padding:12px}
    .rev-paradise-main{position:relative;overflow:hidden;border-radius:12px;background:#eee;aspect-ratio:4/3;cursor:zoom-in}.rev-paradise-main img{width:100%;height:100%;object-fit:cover;display:block}
    .rev-paradise-ref{position:absolute;left:10px;top:10px;background:#fff7da;border:1px solid #d4af37;border-radius:999px;padding:7px 11px;font-weight:900;color:#4e3f13;z-index:2}.rev-paradise-zoom{position:absolute;right:10px;bottom:10px;background:#fff;border:1px solid #d4af37;border-radius:999px;padding:6px 9px;font-weight:800;color:#4e3f13}
    .rev-paradise-thumbs{display:flex;gap:8px;overflow:auto;margin-top:8px}.rev-paradise-thumb{flex:0 0 86px;width:86px;height:66px;border:2px solid transparent;border-radius:9px;overflow:hidden;padding:0;background:#eee}.rev-paradise-thumb.active{border-color:#d4af37}.rev-paradise-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .rev-paradise-lb{position:fixed;inset:0;z-index:1000300;display:none;align-items:center;justify-content:center;background:rgba(18,17,14,.95);padding:18px;touch-action:none}.rev-paradise-lb.open{display:flex}.rev-paradise-lb img{max-width:96vw;max-height:88vh;object-fit:contain;border-radius:12px;user-select:none;-webkit-user-drag:none}
    .rev-paradise-close,.rev-paradise-prev,.rev-paradise-next{position:fixed;z-index:5;width:48px;height:48px;border-radius:50%;border:1px solid #d4af37;background:#fff7da;color:#5d4a12;font-size:1.8rem}.rev-paradise-close{top:14px;right:14px}.rev-paradise-prev{left:14px;top:50%}.rev-paradise-next{right:14px;top:50%}.rev-paradise-count{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);background:#fff7da;border:1px solid #d4af37;border-radius:999px;padding:7px 11px;font-weight:900;color:#5d4a12}
    @media(max-width:700px){.rev-paradise-main{aspect-ratio:1/1}.rev-paradise-thumb{flex-basis:72px;width:72px;height:56px}.rev-paradise-prev,.rev-paradise-next{display:none}.rev-paradise-lb img{max-height:82vh}}
  `;document.head.appendChild(s)}
  function images(d){return [base+d.slug+'web1.jpg',base+d.slug+'web2.jpg',base+d.slug+'web3.jpg'];}
  function lb(){let x=$('#rev-paradise-lb');if(x)return x;x=document.createElement('div');x.id='rev-paradise-lb';x.className='rev-paradise-lb';x.innerHTML='<button class="rev-paradise-close">×</button><button class="rev-paradise-prev">‹</button><img alt="Reviglass Paradise Stones HD"><button class="rev-paradise-next">›</button><div class="rev-paradise-count"></div>';document.body.appendChild(x);$('.rev-paradise-close',x).onclick=close;$('.rev-paradise-prev',x).onclick=()=>show(index-1);$('.rev-paradise-next',x).onclick=()=>show(index+1);x.addEventListener('click',e=>{if(e.target===x)close()});let sx=0,sy=0;x.addEventListener('touchstart',e=>{if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}},{passive:true});x.addEventListener('touchend',e=>{const t=e.changedTouches?.[0];if(!t)return;const dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.15)show(index+(dx<0?1:-1))},{passive:true});return x}
  function show(i){if(!active.length)return;index=(i+active.length)%active.length;const x=lb();$('img',x).src=active[index];$('.rev-paradise-count',x).textContent=`${current} · ${index+1} / ${active.length}`;x.classList.add('open');document.body.style.overflow='hidden'}
  function close(){$('#rev-paradise-lb')?.classList.remove('open');document.body.style.overflow=$('#reviglass-pool-modal')?.classList.contains('open')?'hidden':''}
  function render(text){const k=norm(text),d=refs[k];if(!d)return;const modal=$('#reviglass-pool-modal');if(!modal)return;current=d.label;active=images(d);index=0;$('.rev-all-gallery',modal)?.remove();$('.rev-ps-gallery',modal)?.remove();$('.rev-ab-gallery',modal)?.remove();$('.rev-mixiris-gallery',modal)?.remove();let box=$('.rev-paradise-gallery',modal);if(!box){box=document.createElement('section');box.className='rev-paradise-gallery';const action=$('.rev-ref-choice',modal);(action?.parentNode||$('#reviglass-modal-body',modal))?.insertBefore(box,action||null)}box.innerHTML=`<h3>Photos HD — ${d.label}</h3><small>Visuels officiels Reviglass · Paradise Stones.</small><div class="rev-paradise-main"><span class="rev-paradise-ref">${d.label}</span><img src="${active[0]}" alt="${d.label}" loading="eager"><span class="rev-paradise-zoom">🔍 Agrandir</span></div><div class="rev-paradise-thumbs">${active.map((u,i)=>`<button class="rev-paradise-thumb${i===0?' active':''}" data-i="${i}"><img src="${u}" alt="" loading="lazy" onerror="this.closest('button').style.display='none'"></button>`).join('')}</div>`;$('.rev-paradise-main',box).onclick=()=>show(index);$$('.rev-paradise-thumb',box).forEach(b=>b.onclick=()=>{index=Number(b.dataset.i);$('.rev-paradise-main img',box).src=active[index];$$('.rev-paradise-thumb',box).forEach((x,j)=>x.classList.toggle('active',j===index))})}
  document.addEventListener('click',e=>{const el=e.target.closest?.('.reviglass-ref-list span');if(!el)return;const k=norm(el.textContent),d=refs[k];if(!d)return;e.stopImmediatePropagation();setTimeout(()=>render(el.textContent),0)},true);
  document.addEventListener('keydown',e=>{if(!$('#rev-paradise-lb')?.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(index-1);if(e.key==='ArrowRight')show(index+1)});
  style();
})();