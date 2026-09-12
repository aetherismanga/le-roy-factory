(() => {
  'use strict';
  if (window.__LRF_REVIGLASS_MIXIRIS_FAST__) return;
  window.__LRF_REVIGLASS_MIXIRIS_FAST__ = true;

  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const key=v=>String(v||'').trim().toUpperCase();
  const G={
    UROLA:['https://reviglass.es/wp-content/uploads/2018/11/UROLAweb1.jpg','https://reviglass.es/wp-content/uploads/2018/11/UROLAweb2.jpg'],
    ORIA:['https://reviglass.es/wp-content/uploads/2018/11/ORIAweb1.jpg','https://reviglass.es/wp-content/uploads/2018/11/ORIAweb2.jpg'],
    URUMEA:['https://reviglass.es/wp-content/uploads/2018/11/URUMEAweb1.jpg','https://reviglass.es/wp-content/uploads/2018/11/URUMEAweb2.jpg'],
    BIDASOA:['https://reviglass.es/wp-content/uploads/2018/11/BIDASOAweb1.jpg','https://reviglass.es/wp-content/uploads/2018/11/BIDASOAweb2.jpg'],
    ERNIO:['https://reviglass.es/wp-content/uploads/2018/11/ERNIOweb1.jpg','https://reviglass.es/wp-content/uploads/2018/11/ERNIOweb2.jpg'],
    DEBA:['https://reviglass.es/wp-content/uploads/2018/11/DEBAweb1.jpg','https://reviglass.es/wp-content/uploads/2018/11/DEBAweb2.jpg'],
    CHAVON:['https://reviglass.es/wp-content/uploads/2018/11/CHAVONweb1.jpg','https://reviglass.es/wp-content/uploads/2018/11/CHAVONweb2.jpg'],
    ADUR:['https://reviglass.es/wp-content/uploads/2018/11/ADURweb1.jpg','https://reviglass.es/wp-content/uploads/2018/11/ADURweb2.jpg']
  };
  let active=[], idx=0, ref='';

  function style(){if($('#rev-mixfast-style'))return;const s=document.createElement('style');s.id='rev-mixfast-style';s.textContent=`
    .rev-mixfast{margin:14px 0 0;border:1px solid #ddd5c8;border-radius:14px;background:#fff;padding:12px}
    .rev-mixfast-main{position:relative;overflow:hidden;border-radius:12px;background:#eee;aspect-ratio:4/3;cursor:zoom-in}.rev-mixfast-main img{width:100%;height:100%;object-fit:cover;display:block}
    .rev-mixfast-ref{position:absolute;left:10px;top:10px;background:#fff7da;color:#4e3f13;border:1px solid #d4af37;border-radius:999px;padding:7px 11px;font-weight:900}
    .rev-mixfast-thumbs{display:flex;gap:8px;overflow:auto;margin-top:8px}.rev-mixfast-thumb{flex:0 0 86px;width:86px;height:66px;border:2px solid transparent;border-radius:9px;overflow:hidden;padding:0;background:#eee}.rev-mixfast-thumb.active{border-color:#d4af37}.rev-mixfast-thumb img{width:100%;height:100%;object-fit:cover}
    .rev-mixfast-lb{position:fixed;inset:0;z-index:1000260;display:none;align-items:center;justify-content:center;background:rgba(18,17,14,.95);padding:18px}.rev-mixfast-lb.open{display:flex}.rev-mixfast-lb img{max-width:96vw;max-height:88vh;object-fit:contain;border-radius:12px}
    .rev-mixfast-close,.rev-mixfast-prev,.rev-mixfast-next{position:fixed;z-index:5;width:48px;height:48px;border-radius:50%;border:1px solid #d4af37;background:#fff7da;color:#5d4a12;font-size:1.8rem}.rev-mixfast-close{top:14px;right:14px}.rev-mixfast-prev{left:14px;top:50%}.rev-mixfast-next{right:14px;top:50%}
    .rev-mixfast-count{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);background:#fff7da;border:1px solid #d4af37;border-radius:999px;padding:7px 11px;font-weight:900;color:#5d4a12}
    @media(max-width:700px){.rev-mixfast-main{aspect-ratio:1/1}.rev-mixfast-thumb{flex-basis:72px;width:72px;height:56px}.rev-mixfast-prev,.rev-mixfast-next{display:none}.rev-mixfast-lb img{max-height:82vh}}
  `;document.head.appendChild(s)}
  function lb(){let x=$('#rev-mixfast-lb');if(x)return x;x=document.createElement('div');x.id='rev-mixfast-lb';x.className='rev-mixfast-lb';x.innerHTML='<button class="rev-mixfast-close">×</button><button class="rev-mixfast-prev">‹</button><img alt="Reviglass HD"><button class="rev-mixfast-next">›</button><div class="rev-mixfast-count"></div>';document.body.appendChild(x);$('.rev-mixfast-close',x).onclick=close;$('.rev-mixfast-prev',x).onclick=()=>show(idx-1);$('.rev-mixfast-next',x).onclick=()=>show(idx+1);x.onclick=e=>{if(e.target===x)close()};let sx=0,sy=0;x.addEventListener('touchstart',e=>{if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}},{passive:true});x.addEventListener('touchend',e=>{const t=e.changedTouches?.[0];if(!t)return;const dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.15)show(idx+(dx<0?1:-1))},{passive:true});return x}
  function show(i){if(!active.length)return;idx=(i+active.length)%active.length;const x=lb();$('img',x).src=active[idx];$('.rev-mixfast-count',x).textContent=`${ref} · ${idx+1} / ${active.length}`;x.classList.add('open');document.body.style.overflow='hidden'}
  function close(){$('#rev-mixfast-lb')?.classList.remove('open');document.body.style.overflow=$('#reviglass-pool-modal')?.classList.contains('open')?'hidden':''}
  function render(label){const k=key(label).replace(/[^A-Z0-9]/g,''),imgs=G[k],modal=$('#reviglass-pool-modal');if(!imgs||!modal)return;ref=label;active=imgs;idx=0;$('.rev-all-gallery',modal)?.remove();$('.rev-ps-gallery',modal)?.remove();$('.rev-mixfast',modal)?.remove();let box=document.createElement('section');box.className='rev-mixfast';const action=$('.rev-ref-choice',modal);(action?.parentNode||$('#reviglass-modal-body',modal))?.insertBefore(box,action||null);box.innerHTML=`<h3>Photos HD — ${label}</h3><small>Photos officielles Reviglass · chargement direct.</small><div class="rev-mixfast-main"><span class="rev-mixfast-ref">${label}</span><img src="${imgs[0]}" alt="${label} Reviglass" loading="eager"></div><div class="rev-mixfast-thumbs">${imgs.map((u,i)=>`<button class="rev-mixfast-thumb${i===0?' active':''}" data-i="${i}"><img src="${u}" alt="" loading="lazy"></button>`).join('')}</div>`;$('.rev-mixfast-main',box).onclick=()=>show(idx);$$('.rev-mixfast-thumb',box).forEach(b=>b.onclick=()=>{idx=Number(b.dataset.i);$('.rev-mixfast-main img',box).src=active[idx];$$('.rev-mixfast-thumb',box).forEach((x,j)=>x.classList.toggle('active',j===idx))})}
  document.addEventListener('click',e=>{const el=e.target.closest?.('.reviglass-ref-list span');if(!el)return;const k=key(el.textContent).replace(/[^A-Z0-9]/g,'');if(!G[k])return;e.stopImmediatePropagation();setTimeout(()=>render(el.textContent.trim()),0)},true);
  document.addEventListener('keydown',e=>{if(!$('#rev-mixfast-lb')?.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(idx-1);if(e.key==='ArrowRight')show(idx+1)});
  style();
})();