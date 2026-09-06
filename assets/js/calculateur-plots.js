(()=>{
  'use strict';
  if(window.__LRF_PLOT_CALCULATOR__)return;
  window.__LRF_PLOT_CALCULATOR__=true;

  const anchor=document.getElementById('bilt-calculateur');
  if(!anchor)return;

  const style=document.createElement('style');
  style.id='lrf-plot-calculator-style';
  style.textContent=`
    .plots-box{margin-top:30px;background:linear-gradient(145deg,#111,#1b1b1b);border:1px solid #d4af37;border-radius:24px;padding:30px;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.18)}
    .plots-head{display:grid;grid-template-columns:180px 1fr;gap:24px;align-items:center;margin-bottom:24px}.plots-head-logo{width:160px;height:108px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 38%,#242018,#070707 72%);border:1px solid #d4af37;border-radius:14px;padding:10px;box-sizing:border-box}.plots-head-logo img{width:92px;height:92px;object-fit:contain}.plots-head h2{font:700 2rem Georgia,serif;color:#f0c85c;margin:0 0 8px}.plots-head p{margin:0;color:#ddd;line-height:1.55}.plots-lrf-tag{display:inline-flex;margin-top:9px;padding:5px 9px;border-radius:999px;border:1px solid rgba(212,175,55,.55);color:#e7c664;font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
    .plots-mode{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:18px}.plots-mode button{border:1px solid #5a5a5a;background:#0b0b0b;color:#ddd;border-radius:999px;padding:9px 14px;font-weight:850;cursor:pointer}.plots-mode button.active{border-color:#d4af37;background:#e8c155;color:#111;box-shadow:0 0 0 3px rgba(212,175,55,.10)}
    .plots-form{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.plots-field label{display:block;font-size:.8rem;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#e3c36a;margin-bottom:7px}.plots-field input,.plots-field select{width:100%;box-sizing:border-box;padding:13px 12px;border-radius:11px;border:1px solid #555;background:#0d0d0d;color:#fff;font-size:1rem;outline:none}.plots-field input:focus,.plots-field select:focus{border-color:#d4af37;box-shadow:0 0 0 3px rgba(212,175,55,.12)}.plots-field.is-hidden{display:none}
    .plots-presets{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.plots-presets span{font-size:.72rem;color:#9f9f9f;align-self:center;margin-right:2px}.plots-presets button{border:1px solid #444;background:#101010;color:#ddd;border-radius:999px;padding:7px 10px;font-size:.73rem;font-weight:800;cursor:pointer}.plots-presets button:hover{border-color:#d4af37;color:#f0c85c}.plots-swap{border:0;background:transparent;color:#d9b84d;font-weight:900;text-decoration:underline;cursor:pointer;padding:7px 0 0}
    .plots-actions{display:flex;gap:12px;margin-top:18px}.plots-calc{border:0;border-radius:999px;padding:13px 25px;background:#f1ca57;color:#111;font-weight:900;text-transform:uppercase;cursor:pointer}.plots-reset{border:1px solid #777;border-radius:999px;padding:13px 22px;background:#151515;color:#fff;font-weight:800;cursor:pointer}
    .plots-results{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:24px}.plots-result{background:#080808;border:1px solid #363636;border-radius:15px;padding:18px 10px;text-align:center;min-width:0}.plots-result strong{display:block;color:#f2ca58;font-size:1.65rem;margin-bottom:4px;white-space:nowrap}.plots-result span{display:block;font-size:.72rem;color:#bbb;text-transform:uppercase;letter-spacing:.45px;line-height:1.25}.plots-result.highlight{border-color:#d4af37;background:linear-gradient(145deg,#201a0b,#090909);box-shadow:inset 0 0 22px rgba(212,175,55,.06)}.plots-result.highlight strong{font-size:1.92rem}
    .plots-summary{margin-top:14px;padding:12px 14px;border-radius:12px;background:#0b0b0b;border:1px solid #2d2d2d;color:#d6d6d6;font-size:.82rem;line-height:1.55}.plots-summary b{color:#f0c85c}.plots-alert{margin-top:14px;padding:12px 14px;border:1px solid rgba(212,175,55,.45);border-radius:12px;background:rgba(212,175,55,.07);font-size:.78rem;color:#c9c9c9;line-height:1.55}.plots-alert strong{color:#eee}.plots-method{margin:14px 0 0;color:#aaa;font-size:.76rem;line-height:1.55}.plots-method b{color:#ddd}
    @media(max-width:1000px){.plots-form{grid-template-columns:1fr 1fr}.plots-results{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:900px){.plots-head{grid-template-columns:1fr;text-align:center}.plots-head-logo{margin:auto}.plots-actions{flex-direction:column}.plots-calc,.plots-reset{width:100%}}
    @media(max-width:560px){.plots-box{padding:20px 15px}.plots-form,.plots-results{grid-template-columns:1fr}.plots-head h2{font-size:1.7rem}.plots-result strong{font-size:1.75rem}.plots-mode{display:grid;grid-template-columns:1fr 1fr}.plots-mode button{padding:10px 8px;font-size:.78rem}}
  `;
  document.head.appendChild(style);

  const section=document.createElement('section');
  section.className='plots-box';
  section.id='plots-calculateur';
  section.innerHTML=`
    <div class="plots-head">
      <div class="plots-head-logo"><img src="assets/brand-v2/logoLRF.png?v=20260901-lrf1" alt="LE ROY FACTORY"></div>
      <div><h2>Calculateur de plots pour dalles</h2><p>Calculez le nombre de plots nécessaires pour une terrasse sur dalles. Le mode précis tient compte de la longueur, de la largeur, du format de dalle, de la périphérie et des renforts éventuels.</p><span class="plots-lrf-tag">Outil informatif LE ROY FACTORY</span></div>
    </div>

    <div class="plots-mode" role="group" aria-label="Mode de calcul">
      <button type="button" class="active" data-plot-mode="exact">Calcul précis · dimensions terrasse</button>
      <button type="button" data-plot-mode="quick">Calcul rapide · surface seule</button>
    </div>

    <div class="plots-form">
      <div class="plots-field exact-field"><label for="plotTerraceL">Longueur terrasse (m)</label><input id="plotTerraceL" type="number" min="0.1" step="0.01" value="6"></div>
      <div class="plots-field exact-field"><label for="plotTerraceW">Largeur terrasse (m)</label><input id="plotTerraceW" type="number" min="0.1" step="0.01" value="4"></div>
      <div class="plots-field quick-field is-hidden"><label for="plotSurface">Surface terrasse (m²)</label><input id="plotSurface" type="number" min="0.1" step="0.1" value="24"></div>
      <div class="plots-field"><label for="plotTileL">Longueur dalle (cm)</label><input id="plotTileL" type="number" min="20" step="0.1" value="60"><button class="plots-swap" id="plotSwap" type="button">↔ Inverser L / l</button></div>
      <div class="plots-field"><label for="plotTileW">Largeur dalle (cm)</label><input id="plotTileW" type="number" min="20" step="0.1" value="60"></div>
      <div class="plots-field"><label for="plotReinforcement">Appuis / renfort</label><select id="plotReinforcement"><option value="corners" selected>4 coins · standard</option><option value="center">+ 1 plot central par dalle</option><option value="sides">+ 2 appuis aux grands côtés</option><option value="full">Centre + grands côtés</option></select></div>
      <div class="plots-field"><label for="plotReserve">Réserve chantier</label><select id="plotReserve"><option value="0">0 %</option><option value="3">3 %</option><option value="5" selected>5 %</option><option value="10">10 %</option></select></div>
    </div>

    <div class="plots-presets"><span>Formats rapides :</span><button type="button" data-format="40x40">40×40</button><button type="button" data-format="50x50">50×50</button><button type="button" data-format="60x60">60×60</button><button type="button" data-format="80x80">80×80</button><button type="button" data-format="90x90">90×90</button><button type="button" data-format="120x60">120×60</button><button type="button" data-format="120x120">120×120</button></div>

    <div class="plots-actions"><button type="button" class="plots-calc" id="calcPlots">Calculer</button><button type="button" class="plots-reset" id="resetPlots">Réinitialiser</button></div>

    <div class="plots-results" aria-live="polite">
      <div class="plots-result"><strong id="rpTiles">—</strong><span>emplacements de dalles</span></div>
      <div class="plots-result"><strong id="rpBase">—</strong><span>plots de trame</span></div>
      <div class="plots-result"><strong id="rpExtra">—</strong><span>plots de renfort</span></div>
      <div class="plots-result"><strong id="rpTotal">—</strong><span>total calculé</span></div>
      <div class="plots-result highlight"><strong id="rpOrder">—</strong><span>plots à prévoir</span></div>
    </div>
    <div class="plots-summary" id="plotSummary">—</div>
    <div class="plots-alert"><strong>Important :</strong> le nombre d'appuis supplémentaires dépend du format, de l'épaisseur et des caractéristiques de la dalle, de la charge, du support, de l'exposition et des prescriptions du fabricant. Le calculateur ne remplace pas la notice technique du fabricant de dalles ou de plots.</div>
    <p class="plots-method"><b>Méthode :</b> pose droite avec joints alignés. Un plot situé à une intersection est partagé par les dalles voisines. En calcul précis, la périphérie est comptée réellement avec la trame <em>(nombre de dalles en longueur + 1) × (nombre de dalles en largeur + 1)</em>. Le mode rapide suppose une terrasse approximativement carrée : il convient à l'avant-chiffrage mais le mode précis reste recommandé pour commander.</p>
  `;
  anchor.insertAdjacentElement('afterend',section);

  const $=id=>document.getElementById(id);
  let mode='exact';
  const fmt=n=>Math.round(n).toLocaleString('fr-FR');
  const fmt1=n=>Number(n).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const safeCeil=v=>Math.ceil(v-1e-10);

  function setMode(next){
    mode=next;
    section.querySelectorAll('[data-plot-mode]').forEach(b=>b.classList.toggle('active',b.dataset.plotMode===mode));
    section.querySelectorAll('.exact-field').forEach(el=>el.classList.toggle('is-hidden',mode!=='exact'));
    section.querySelectorAll('.quick-field').forEach(el=>el.classList.toggle('is-hidden',mode!=='quick'));
    calculate();
  }

  function reinforcementCounts(cols,rows,tileL,tileW,type){
    const placements=cols*rows;
    let center=0,sides=0;
    if(type==='center'||type==='full')center=placements;
    if(type==='sides'||type==='full'){
      // Deux appuis au milieu des deux grands côtés opposés. Les appuis de joint sont partagés entre deux dalles.
      sides=tileL>=tileW ? cols*(rows+1) : (cols+1)*rows;
    }
    return {center,sides,total:center+sides};
  }

  function calculate(){
    const tileLcm=Number($('plotTileL').value);
    const tileWcm=Number($('plotTileW').value);
    const reserve=Number($('plotReserve').value)||0;
    const reinforcement=$('plotReinforcement').value;
    if(!(tileLcm>0&&tileWcm>0))return;
    const tileL=tileLcm/100,tileW=tileWcm/100;

    let terraceL,terraceW,surface,assumption='';
    if(mode==='exact'){
      terraceL=Number($('plotTerraceL').value);terraceW=Number($('plotTerraceW').value);
      if(!(terraceL>0&&terraceW>0))return;
      surface=terraceL*terraceW;
    }else{
      surface=Number($('plotSurface').value);
      if(!(surface>0))return;
      terraceL=terraceW=Math.sqrt(surface);
      assumption=' · estimation sur une forme carrée';
    }

    const cols=Math.max(1,safeCeil(terraceL/tileL));
    const rows=Math.max(1,safeCeil(terraceW/tileW));
    const placements=cols*rows;
    const base=(cols+1)*(rows+1);
    const extras=reinforcementCounts(cols,rows,tileLcm,tileWcm,reinforcement);
    const total=base+extras.total;
    const order=Math.ceil(total*(1+reserve/100));
    const density=total/surface;
    const extraLabel=reinforcement==='corners'?'sans renfort':reinforcement==='center'?'1 centre/dalle':reinforcement==='sides'?'2 grands côtés/dalle':'centre + grands côtés';

    $('rpTiles').textContent=fmt(placements);
    $('rpBase').textContent=fmt(base);
    $('rpExtra').textContent=fmt(extras.total);
    $('rpTotal').textContent=fmt(total);
    $('rpOrder').textContent=fmt(order);
    $('plotSummary').innerHTML=`Trame : <b>${cols} × ${rows} dalles</b> · Surface de calcul : <b>${fmt1(surface)} m²</b> · Densité : <b>${density.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} plots/m²</b> · Renfort : <b>${extraLabel}</b> · Réserve : <b>${reserve} %</b>${assumption}.`;
  }

  section.querySelectorAll('[data-plot-mode]').forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.plotMode)));
  section.querySelectorAll('[data-format]').forEach(btn=>btn.addEventListener('click',()=>{const [l,w]=btn.dataset.format.split('x');$('plotTileL').value=l;$('plotTileW').value=w;calculate()}));
  $('plotSwap').addEventListener('click',()=>{const a=$('plotTileL').value;$('plotTileL').value=$('plotTileW').value;$('plotTileW').value=a;calculate()});
  $('calcPlots').addEventListener('click',calculate);
  $('resetPlots').addEventListener('click',()=>{
    $('plotTerraceL').value='6';$('plotTerraceW').value='4';$('plotSurface').value='24';$('plotTileL').value='60';$('plotTileW').value='60';$('plotReinforcement').value='corners';$('plotReserve').value='5';setMode('exact');
  });
  ['plotTerraceL','plotTerraceW','plotSurface','plotTileL','plotTileW','plotReinforcement','plotReserve'].forEach(id=>$(id).addEventListener('input',calculate));
  calculate();
})();