(()=>{
'use strict';
const S=window.LRF_ELIOS_POSE_V2;if(!S)return;
const {D,$,state}=S;
function rows(){
 const p=S.pattern();
 if(state.group==='modular'){
  const o=S.modular();
  if(state.packaging==='module'){const m=S.modules[o.id];return [{share:100,series:o.series,color:o.color,key:'module',label:m.label,pcs:m.pcs,boxM2:m.boxM2,ref:m.ref,finish:m.finish}];}
  return p.parts.map(([key,share])=>({share,series:o.series,color:o.color,...o.formats[key],finish:o.finishLabel||o.finish||''}));
 }
 if(state.group==='small'){
  const palette=S.smallRows?.();if(palette!==undefined)return palette;
  const f=S.small(),c=S.smallChoice();
  return [{share:100,series:f.series,color:c.color,key:f.format,label:f.formatLabel,pcs:f.pcs,boxM2:f.boxM2,ref:c.ref,finish:''}];
 }
 if(state.group==='segmento')return S.segmentoRows();
 if(!state.colorsSedimenti||Array.isArray(state.colorsSedimenti))state.colorsSedimenti={...state.colorsSedimenti};
 return p.parts.map(([key,share,letter],i)=>{
  const slot=letter||String.fromCharCode(65+i),color=$(`#ep-sed-color-${i}`)?.value||state.colorsSedimenti[slot]||state.colorsSedimenti[i]||D.sedimentiSelected.colors[i]||D.sedimentiSelected.colors[0];
  const format=D.sedimentiSelected.data[color]?.[key];if(!format)throw Error('Choisissez un coloris Sedimenti disponible pour ce format.');
  state.colorsSedimenti[slot]=color;
  return {share,series:D.sedimentiSelected.series,color,...format,finish:'Selected · R10 · 8,5 mm'};
 });
}
function tariff(r){const api=window.LRF_INSPIRATIONS_PRICING;if(!api?.getPrice)return {unavailable:true};const p=api.getPrice('elios-ceramica',{slug:S.productSlugs[r.series]||S.slug(r.series),finishes:[r.finish||'']},r.key||r.label);return !p||p.locked||p.unavailable||!Number.isFinite(Number(p.amount))?{unavailable:true,locked:!!p?.locked}:{amount:Number(p.amount),unit:p.unit||'net/m²',label:p.label||''};}
function lineTotal(r,p){if(!p||p.unavailable)return null;const u=String(p.unit||'').toLowerCase();if(u.includes('m²')||u.includes('m2')||u.includes('/mq'))return r.ordered*p.amount;if(u.includes('pièce')||u.includes('piece'))return r.pieces*p.amount;return null;}
function unavailable(message){
 state.last=null;const order=$('#ep-order');if(order){order.disabled=true;order.title=message;}
 for(const selector of ['#ep-r-surface','#ep-r-target','#ep-r-boxes','#ep-r-ordered'])$(selector).textContent='—';
 $('#ep-result-body').innerHTML=`<tr><td colspan="8" role="status">${S.esc(message)}</td></tr>`;
 return null;
}
S.calculate=()=>{
 const surface=Number($('#ep-surface').value),waste=Number($('#ep-waste').value),target=surface*(1+waste/100);
 if(!Number.isFinite(surface)||surface<=0)return unavailable('Saisissez une surface à couvrir supérieure à zéro.');
 if(!Number.isFinite(waste)||waste<0||!Number.isFinite(target))return unavailable('Choisissez une marge chantier valide.');
 if(state.group==='segmento'&&(S.segmentoReady===false||typeof S.segmentoRows!=='function'))return unavailable('Les compositions Segmento sont indisponibles. Actualisez la page pour réessayer.');
 try{
  const p=S.pattern(),raw=rows();
  if(!Array.isArray(raw)||!raw.length)throw Error('Choisissez une composition avec des références disponibles.');
  if(raw.some(r=>!r||!Number.isFinite(Number(r.share))||Number(r.share)<0))throw Error('Les proportions de cette composition sont invalides.');
  const active=raw.filter(r=>Number(r.share)>0),sum=active.reduce((total,r)=>total+Number(r.share),0);
  if(!Number.isFinite(sum)||sum<=0)throw Error('Les proportions de cette composition sont invalides.');
  const grouped=[];
  for(const r of active){
   if(!String(r.ref||'').trim()||!String(r.key||'').trim()||!Number.isFinite(Number(r.boxM2))||Number(r.boxM2)<=0||!Number.isInteger(Number(r.pcs))||Number(r.pcs)<=0)throw Error('La référence ou son conditionnement reste à confirmer.');
   const normalized=Number(r.share)/sum,need=target*normalized,k=`${r.ref}|${r.key}`,g=grouped.find(item=>item._key===k);
   if(g){
    if(g.boxM2!==Number(r.boxM2)||g.pcs!==Number(r.pcs))throw Error('Les conditionnements de cette référence ne correspondent pas.');
    g.share+=Number(r.share);g.normalized+=normalized;g.need+=need;
   }else grouped.push({...r,share:Number(r.share),boxM2:Number(r.boxM2),pcs:Number(r.pcs),normalized,need,_key:k});
  }
  // Merge every colour/slot using the same SKU before rounding whole boxes.
  for(const r of grouped){
   r.boxes=Math.max(1,Math.ceil((r.need-1e-9)/r.boxM2));r.ordered=r.boxes*r.boxM2;r.surplus=r.ordered-r.need;r.pieces=r.boxes*r.pcs;
   if(!Number.isSafeInteger(r.boxes)||!Number.isSafeInteger(r.pieces)||!Number.isFinite(r.ordered))throw Error('La quantité demandée est trop élevée.');
   r.price=tariff(r);r.lineTotal=lineTotal(r,r.price);
  }
  const totalBoxes=grouped.reduce((total,r)=>total+r.boxes,0),totalOrdered=grouped.reduce((total,r)=>total+r.ordered,0),complete=grouped.every(r=>Number.isFinite(r.lineTotal)),totalHT=complete?grouped.reduce((total,r)=>total+r.lineTotal,0):null;
  $('#ep-r-surface').textContent=`${S.fr(surface)} m²`;$('#ep-r-target').textContent=`${S.fr(target)} m²`;$('#ep-r-boxes').textContent=totalBoxes.toLocaleString('fr-FR');$('#ep-r-ordered').textContent=`${S.fr(totalOrdered)} m²`;
  $('#ep-result-body').innerHTML=grouped.map(r=>`<tr><td><b>${S.esc(r.series)} — ${S.esc(r.color)}</b><small>${S.esc(r.finish||'')}</small><small>Réf. ${S.esc(r.ref)}</small></td><td>${S.esc(r.label)}</td><td>${S.fr(r.normalized*100,1)}%</td><td><b>${S.fr(r.need)} m²</b></td><td>${S.fr(r.boxM2)} m² / boîte<br><small>${r.pcs} pcs / boîte</small></td><td class="gold"><b>${r.boxes}</b><small>${r.pieces} pcs</small></td><td>${S.fr(r.ordered)} m²</td><td>+ ${S.fr(r.surplus)} m²</td></tr>`).join('');
  const order=$('#ep-order');if(order){order.disabled=false;order.title='';}
  return state.last={pattern:p,surface,waste,target,rows:grouped,totalBoxes,totalOrdered,totalHT,collectionKey:S.collectionKey()};
 }catch(error){return unavailable(error.message||'Le calcul de cette composition est indisponible.');}
};
})();
