(()=>{
  'use strict';
  const D=window.ELIOS_POSE_V1;
  const root=document.getElementById('elios-pose-app');
  if(!D||!root)return;
  const $=(s,ctx=document)=>ctx.querySelector(s);
  const $$=(s,ctx=document)=>[...ctx.querySelectorAll(s)];
  const fr=(n,d=2)=>Number(n||0).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let selectedPattern='1';
  let lastSummary='';

  const groups=[
    ['modular','Modulaires','Schémas 1 à 22'],
    ['small','Petits formats','Schémas 23 à 28'],
    ['sedimenti','Sedimenti','Schémas 29 à 32'],
    ['segmento','Segmento','Patterns 01 à 12']
  ];

  root.innerHTML=`
    <div class="ep-toolbar" role="tablist">${groups.map(([id,name,sub],i)=>`<button type="button" class="ep-tab${i===0?' active':''}" data-group="${id}"><b>${name}</b><span>${sub}</span></button>`).join('')}</div>
    <div class="ep-shell">
      <section class="ep-left">
        <div class="ep-step"><span>1</span><div><b>Choisissez un schéma</b><small>Les proportions officielles sont intégrées au calcul.</small></div></div>
        <div id="ep-pattern-grid" class="ep-pattern-grid"></div>
      </section>
      <section class="ep-right">
        <div class="ep-preview-card">
          <div class="ep-preview-top"><div><span class="ep-kicker">APERÇU DU SCHÉMA</span><h3 id="ep-preview-title">Schéma 1</h3></div><div id="ep-preview-badge" class="ep-badge">ELIOS 2026</div></div>
          <div id="ep-preview" class="ep-preview"></div>
          <div id="ep-ratios" class="ep-ratios"></div>
        </div>
        <div class="ep-config-card">
          <div class="ep-step compact"><span>2</span><div><b>Choisissez le carreau</b><small>Seules les séries compatibles avec le schéma sont proposées.</small></div></div>
          <div id="ep-product-controls" class="ep-controls"></div>
          <div class="ep-step compact"><span>3</span><div><b>Surface et marge chantier</b><small>Le calcul est ensuite arrondi à la boîte complète.</small></div></div>
          <div class="ep-surface-grid">
            <label><span>Surface à couvrir (m²)</span><input id="ep-surface" type="number" min="0.1" step="0.1" value="30"></label>
            <label><span>Marge chantier</span><select id="ep-waste"><option value="0">0 %</option><option value="5">5 %</option><option value="10" selected>10 %</option><option value="15">15 %</option></select></label>
          </div>
        </div>
      </section>
    </div>
    <section class="ep-results" id="ep-results" aria-live="polite">
      <div class="ep-results-head"><div><span class="ep-kicker">FICHE QUANTITATIVE</span><h3>Quantités à commander</h3></div><div class="ep-result-actions"><button id="ep-copy" type="button">Copier le récapitulatif</button><button id="ep-print" type="button">Imprimer</button></div></div>
      <div class="ep-total-cards"><div><span>Surface chantier</span><strong id="ep-r-surface">—</strong></div><div><span>Surface avec marge</span><strong id="ep-r-target">—</strong></div><div class="accent"><span>Total boîtes</span><strong id="ep-r-boxes">—</strong></div><div><span>Total commandé</span><strong id="ep-r-ordered">—</strong></div></div>
      <div class="ep-table-wrap"><table class="ep-table"><thead><tr><th>Produit</th><th>Format</th><th>Part</th><th>Besoin</th><th>Boîtage</th><th>Boîtes</th><th>Commandé</th><th>Surplus</th></tr></thead><tbody id="ep-result-body"></tbody></table></div>
      <p class="ep-disclaimer">Calcul basé sur les proportions du schéma et les conditionnements du Catalogue Général Elios Ceramica 2026. Les boîtes sont toujours arrondies à l'unité supérieure. Pour une pose complexe, adaptez la marge aux coupes, à la géométrie réelle du chantier et aux prescriptions du fabricant.</p>
    </section>`;

  function currentPattern(){return D.patterns.find(p=>p.id===selectedPattern)||D.patterns[0]}
  function groupPatterns(group){return D.patterns.filter(p=>p.group===group)}
  function currentGroup(){return currentPattern().group}

  function seeded(seed){let n=seed*9301+49297;return()=>{n=(n*233280+12345)%233280;return n/233280}}
  function svgWrap(body){return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="300" height="300" rx="8" fill="#fbfaf6"/>${body}<rect x="4" y="4" width="292" height="292" rx="7" fill="none" stroke="#302b23" stroke-width="2"/></svg>`}

  function modularSvg(p){
    const seed=Number(p.id)||1, rnd=seeded(seed), N=6, cell=48, off=6;
    const occ=Array.from({length:N},()=>Array(N).fill(false));
    const colors=['#e9e4d9','#d8cfbe','#f4f0e8','#cfc3af','#eee7db'];
    const dims={'61x61':[3,3],'40.6x60.9':[3,2],'40.6x40.6':[2,2],'20.3x40.6':[2,1],'20.3x20.3':[1,1]};
    const weighted=[];p.parts.forEach(([k,w])=>{for(let i=0;i<Math.max(1,Math.round(w/6));i++)weighted.push(k)});
    const out=[];
    const fits=(x,y,w,h)=>x+w<=N&&y+h<=N&&Array.from({length:h},(_,dy)=>Array.from({length:w},(_,dx)=>!occ[y+dy][x+dx])).flat().every(Boolean);
    const mark=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)occ[yy][xx]=true};
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      if(occ[y][x])continue;
      let placed=false;
      const start=Math.floor(rnd()*weighted.length);
      for(let a=0;a<weighted.length&&!placed;a++){
        const k=weighted[(start+a)%weighted.length];let [w,h]=dims[k]||[1,1];if(rnd()>.5)[w,h]=[h,w];
        if(fits(x,y,w,h)){mark(x,y,w,h);const idx=p.parts.findIndex(z=>z[0]===k);out.push(`<rect x="${off+x*cell}" y="${off+y*cell}" width="${w*cell}" height="${h*cell}" fill="${colors[idx%colors.length]}" stroke="#817b72" stroke-width="1.2"/>`);placed=true}
      }
      if(!placed){mark(x,y,1,1);out.push(`<rect x="${off+x*cell}" y="${off+y*cell}" width="${cell}" height="${cell}" fill="#f4f0e8" stroke="#817b72" stroke-width="1.2"/>`)}
    }
    return svgWrap(out.join(''));
  }
  function brickSvg(herring=false,short=false){
    let out='';
    if(!herring){
      const h=short?24:18,w=short?70:78;for(let y=8,row=0;y<292;y+=h,row++){for(let x=8-(row%2?w/2:0);x<294;x+=w)out+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${row%3===0?'#e2d8c5':'#f4efe5'}" stroke="#777168" stroke-width="1"/>`}
    }else{
      const w=76,h=20;for(let y=-10;y<310;y+=38){for(let x=-35;x<310;x+=76){out+=`<g transform="translate(${x} ${y}) rotate(45 ${w/2} ${h/2})"><rect width="${w}" height="${h}" fill="#f3eee4" stroke="#716b63" stroke-width="1"/></g><g transform="translate(${x+38} ${y+38}) rotate(-45 ${w/2} ${h/2})"><rect width="${w}" height="${h}" fill="#ded4c2" stroke="#716b63" stroke-width="1"/></g>`}}
    }
    return svgWrap(out);
  }
  function sedimentiSvg(id){
    let out='';
    if(id==='29'){
      for(let y=10;y<290;y+=70)for(let x=10;x<290;x+=70){out+=`<rect x="${x}" y="${y}" width="58" height="58" fill="#e3ddd2" stroke="#746f67"/><rect x="${x+58}" y="${y}" width="12" height="58" fill="#c8b9a1" stroke="#746f67"/><rect x="${x+58}" y="${y+58}" width="12" height="12" fill="#a48f70" stroke="#746f67"/>`}
    } else if(id==='30'){
      for(let x=10,i=0;x<290;x+=26,i++)out+=`<rect x="${x}" y="10" width="13" height="280" fill="${i%2?'#d2c6b4':'#f0ece5'}" stroke="#777168"/>`;
    } else if(id==='31') return brickSvg(true,true);
    else {
      for(let y=10,r=0;y<290;y+=56,r++)for(let x=10,c=0;x<290;x+=56,c++){const v=(r+c)%2;out+=`<rect x="${x}" y="${y}" width="56" height="28" fill="${v?'#d1c4b2':'#f0ebe3'}" stroke="#766f66"/><rect x="${x}" y="${y+28}" width="28" height="28" fill="${v?'#f0ebe3':'#d1c4b2'}" stroke="#766f66"/><rect x="${x+28}" y="${y+28}" width="28" height="28" fill="${v?'#d1c4b2':'#f0ebe3'}" stroke="#766f66"/>`}
    }
    return svgWrap(out);
  }
  function segmentoSvg(id){
    const seed=Number(id.slice(1))||1,N=6,c=48,o=6;let out='';
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const flip=((x*y+x+y+seed+(seed%3)*x)%4)<2;
      out+=`<rect x="${o+x*c}" y="${o+y*c}" width="${c}" height="${c}" fill="#f5f2eb" stroke="#8a857e" stroke-width="1"/><line x1="${o+x*c+(flip?0:c)}" y1="${o+y*c}" x2="${o+x*c+(flip?c:0)}" y2="${o+(y+1)*c}" stroke="#5f5951" stroke-width="1.6"/>`;
    }
    return svgWrap(out);
  }
  function previewSvg(p){
    if(p.group==='modular')return modularSvg(p);
    if(p.group==='segmento')return segmentoSvg(p.id);
    if(p.group==='sedimenti')return sedimentiSvg(p.id);
    if(['24','26','28'].includes(p.id))return brickSvg(true,p.id==='28');
    return brickSvg(false,p.id==='27');
  }

  function renderPatterns(group=currentGroup()){
    const grid=$('#ep-pattern-grid');
    grid.innerHTML=groupPatterns(group).map(p=>`<button type="button" class="ep-pattern${p.id===selectedPattern?' active':''}" data-pattern="${p.id}"><div>${previewSvg(p)}</div><b>${esc(p.label)}</b><small>${p.parts.map(([k,w])=>`${k.replaceAll('.',',')} · ${w}%`).join(' · ')}</small></button>`).join('');
    $$('.ep-pattern',grid).forEach(btn=>btn.addEventListener('click',()=>{selectedPattern=btn.dataset.pattern;renderAll()}));
  }

  function compatibleModular(p){const req=[...new Set(p.parts.map(x=>x[0]))];return D.modularOptions.filter(o=>req.every(k=>o.formats[k]))}
  function selectHtml(id,label,items,selected=''){
    return `<label><span>${esc(label)}</span><select id="${id}">${items.map(it=>{const value=typeof it==='string'?it:it.value;const text=typeof it==='string'?it:it.text;return `<option value="${esc(value)}"${String(value)===String(selected)?' selected':''}>${esc(text)}</option>`}).join('')}</select></label>`
  }
  function renderProductControls(){
    const p=currentPattern(), box=$('#ep-product-controls');
    if(p.group==='modular'){
      const opts=compatibleModular(p);box.innerHTML=selectHtml('ep-modular-product','Série / couleur',opts.map(o=>({value:o.id,text:`${o.series} — ${o.color}`})),opts[0]?.id||'');
    } else if(p.group==='small'){
      let families=[];
      if(['23','24'].includes(p.id))families=[D.tropical];
      if(['25','26'].includes(p.id))families=[D.domus,D.glow];
      if(['27','28'].includes(p.id))families=[D.golden];
      box.innerHTML=selectHtml('ep-small-series','Série',families.map(f=>({value:f.series,text:f.series})),families[0].series)+`<div id="ep-small-color-wrap"></div>`;
      const renderColor=()=>{const f=families.find(x=>x.series===$('#ep-small-series').value)||families[0];$('#ep-small-color-wrap').innerHTML=selectHtml('ep-small-color','Couleur / référence',f.colors.map(c=>({value:c.color,text:`${c.color} — ${c.ref}`})),f.colors[0].color);$('#ep-small-color').addEventListener('change',calculate)};
      $('#ep-small-series').addEventListener('change',()=>{renderColor();calculate()});renderColor();
    } else if(p.group==='segmento'){
      box.innerHTML=selectHtml('ep-segmento-color','Couleur / référence',D.segmento.colors.map(c=>({value:c.color,text:`${c.color} — ${c.ref}`})),D.segmento.colors[0].color);
    } else {
      box.innerHTML=p.parts.map((part,i)=>{const slot=part[2]||String.fromCharCode(65+i);return selectHtml(`ep-sed-color-${i}`,`Couleur ${slot} — ${part[0].replaceAll('.',',')}`,D.sedimentiSelected.colors, D.sedimentiSelected.colors[Math.min(i,D.sedimentiSelected.colors.length-1)])}).join('');
    }
    $$('select',box).forEach(el=>el.addEventListener('change',calculate));
  }

  function productRows(p){
    if(p.group==='modular'){
      const o=D.modularOptions.find(x=>x.id===$('#ep-modular-product')?.value)||compatibleModular(p)[0];
      return p.parts.map(([key,share],i)=>({slot:String.fromCharCode(65+i),share,series:o.series,color:o.color,...o.formats[key]}));
    }
    if(p.group==='small'){
      let families=['23','24'].includes(p.id)?[D.tropical]:['25','26'].includes(p.id)?[D.domus,D.glow]:[D.golden];
      const f=families.find(x=>x.series===$('#ep-small-series')?.value)||families[0];const c=f.colors.find(x=>x.color===$('#ep-small-color')?.value)||f.colors[0];
      return [{slot:'A',share:100,series:f.series,color:c.color,key:f.format,label:f.formatLabel,pcs:f.pcs,boxM2:f.boxM2,ref:c.ref}];
    }
    if(p.group==='segmento'){
      const c=D.segmento.colors.find(x=>x.color===$('#ep-segmento-color')?.value)||D.segmento.colors[0];
      return [{slot:'A',share:100,series:D.segmento.series,color:c.color,key:D.segmento.format,label:D.segmento.formatLabel,pcs:D.segmento.pcs,boxM2:D.segmento.boxM2,ref:c.ref}];
    }
    return p.parts.map(([key,share,slot],i)=>{const color=$(`#ep-sed-color-${i}`)?.value||D.sedimentiSelected.colors[i]||D.sedimentiSelected.colors[0];const f=D.sedimentiSelected.data[color][key];return {slot:slot||String.fromCharCode(65+i),share,series:D.sedimentiSelected.series,color,...f}});
  }

  function renderPreview(){
    const p=currentPattern();$('#ep-preview').innerHTML=previewSvg(p);$('#ep-preview-title').textContent=p.label;
    const shares=p.parts.reduce((a,x)=>a+Number(x[1]),0);
    $('#ep-ratios').innerHTML=p.parts.map(([k,w,slot],i)=>`<span><i style="--i:${i}"></i>${slot?`Couleur ${slot} · `:''}${k.replaceAll('.',',')} cm <b>${fr(w/shares*100,0)}%</b></span>`).join('');
  }

  function calculate(){
    const p=currentPattern(), surface=Math.max(0,Number($('#ep-surface').value)||0), waste=Math.max(0,Number($('#ep-waste').value)||0), target=surface*(1+waste/100);
    const raw=productRows(p), sum=raw.reduce((a,r)=>a+Number(r.share||0),0)||100;
    const calculated=raw.map(r=>{const normalized=r.share/sum,need=target*normalized,boxes=Math.ceil((need-1e-9)/r.boxM2),ordered=boxes*r.boxM2;return {...r,normalized,need,boxes,ordered,surplus:ordered-need,pieces:boxes*r.pcs}});
    const grouped=[];
    calculated.forEach(r=>{const key=`${r.ref}|${r.key}`;const g=grouped.find(x=>x._key===key);if(g){g.share+=r.share;g.normalized+=r.normalized;g.need+=r.need;g.boxes=Math.ceil((g.need-1e-9)/g.boxM2);g.ordered=g.boxes*g.boxM2;g.surplus=g.ordered-g.need;g.pieces=g.boxes*g.pcs}else grouped.push({...r,_key:key})});
    const totalBoxes=grouped.reduce((a,r)=>a+r.boxes,0),totalOrdered=grouped.reduce((a,r)=>a+r.ordered,0);
    $('#ep-r-surface').textContent=`${fr(surface)} m²`;$('#ep-r-target').textContent=`${fr(target)} m²`;$('#ep-r-boxes').textContent=totalBoxes.toLocaleString('fr-FR');$('#ep-r-ordered').textContent=`${fr(totalOrdered)} m²`;
    $('#ep-result-body').innerHTML=grouped.map(r=>`<tr><td><b>${esc(r.series)} — ${esc(r.color)}</b><small>Réf. ${esc(r.ref)}</small></td><td>${esc(r.label)}</td><td>${fr(r.normalized*100,1)}%</td><td><b>${fr(r.need)} m²</b></td><td>${fr(r.boxM2)} m² / boîte<br><small>${r.pcs} pcs / boîte</small></td><td class="gold"><b>${r.boxes}</b><small>${r.pieces} pcs</small></td><td>${fr(r.ordered)} m²</td><td>+ ${fr(r.surplus)} m²</td></tr>`).join('');
    lastSummary=[`LE ROY FACTORY — Configurateur de pose ELIOS`,`Schéma : ${p.label}`,`Surface : ${fr(surface)} m² — marge ${waste}% — base de calcul ${fr(target)} m²`,'',...grouped.map(r=>`${r.series} / ${r.color} — ${r.label} — réf. ${r.ref} : besoin ${fr(r.need)} m² → ${r.boxes} boîte(s) (${fr(r.ordered)} m², ${r.pieces} pièces)`),'',`TOTAL : ${totalBoxes} boîte(s) — ${fr(totalOrdered)} m² commandés`].join('\n');
  }

  function renderAll(){
    const p=currentPattern();$$('.ep-tab').forEach(t=>t.classList.toggle('active',t.dataset.group===p.group));renderPatterns(p.group);renderPreview();renderProductControls();calculate();
  }
  $$('.ep-tab').forEach(tab=>tab.addEventListener('click',()=>{const first=groupPatterns(tab.dataset.group)[0];if(first){selectedPattern=first.id;renderAll()}}));
  $('#ep-surface').addEventListener('input',calculate);$('#ep-waste').addEventListener('change',calculate);
  $('#ep-print').addEventListener('click',()=>window.print());
  $('#ep-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(lastSummary);const b=$('#ep-copy'),old=b.textContent;b.textContent='✓ Copié';setTimeout(()=>b.textContent=old,1500)}catch(_){window.prompt('Copiez le récapitulatif :',lastSummary)}});
  renderAll();
})();
