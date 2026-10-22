import {bounds,distance,uid,newRoom,roomError,partitionPolygon} from './core.mjs?v=20261022-6';
import {dimensionValue,solveDimensions} from './dimensions.mjs?v=20261022-6';
import {preparePlan,readPlan,measuredPoints} from './plan-reader.mjs?v=20261022-6';
import {cleanPartitionJunctions} from './structure.mjs?v=20261022-6';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n);
const $=s=>document.querySelector(s),unitFactor={mm:.1,cm:1,m:100};

// Positions of interior partitions follow the measured axes of the drawing. Their
// location and thickness remain proposals to verify, not additional OCR dimensions.
export function measuredPartitions(shape,solved,indices=null){
 if(solved.error)return [];
 const c=Math.cos(shape.angle),s=Math.sin(shape.angle),levels=[0,1].map(axis=>shape.levels[axis].map((_,i)=>solved.points[shape.indices.findIndex(p=>p[axis]===i)][axis]));
 const mapAxis=(v,axis)=>{const old=shape.levels[axis],next=levels[axis];let i=old.findIndex((n,j)=>j<old.length-1&&v<=old[j+1]);if(i<0)i=old.length-2;return next[i]+(v-old[i])/(old[i+1]-old[i])*(next[i+1]-next[i]);};
 const local=p=>{const q=[p[0]*c+p[1]*s,-p[0]*s+p[1]*c];return q.map((v,axis)=>mapAxis(v,axis));};
 const ratio=[0,1].map(axis=>(levels[axis].at(-1)-levels[axis][0])/(shape.levels[axis].at(-1)-shape.levels[axis][0]));
 return cleanPartitionJunctions((shape.partitions||[]).flatMap((p,i)=>indices&&!indices.includes(i)?[]:[{id:uid(),a:local(p.a),b:local(p.b),thickness:Math.round(p.thickness*(ratio[0]+ratio[1])/2*10)/10,height:260,sourceIndex:i}]));
}
export function convertedRoom(row,solved,prepared,scale,parts=measuredPartitions(row.shape,solved)){
 const original={shape:{...row.shape,points:row.shape.points.map(p=>p.map(v=>v/prepared.factor))}},points=measuredPoints(original,solved,scale),first=solved.points[0],anchor=points[0],c=Math.cos(row.shape.angle),s=Math.sin(row.shape.angle),world=p=>{const x=(p[0]-first[0])/scale,y=(p[1]-first[1])/scale;return [anchor[0]+x*c-y*s,anchor[1]+x*s+y*c];};
 return {name:solved.name||'Pièce',points,partitions:parts.map(p=>({id:p.id,a:world(p.a),b:world(p.b),thickness:p.thickness,height:p.height}))};
}
function preview(shape,solved,partitions=[]){
 const p=solved.error?shape.local:solved.points,b=bounds(p),pad=Math.max(b.width,b.height)*.15+5;
 return `<svg class="conversion-plan" viewBox="${b.minX-pad} ${b.minY-pad} ${b.width+pad*2} ${b.height+pad*2}" role="img" aria-label="Contour et cloisons reconnus, sans mobilier"><polygon points="${p.map(v=>v.join(',')).join(' ')}"/>${partitions.map(v=>`<polygon class="partition" points="${partitionPolygon(v).map(p=>p.join(',')).join(' ')}"/>`).join('')}${p.map((a,i)=>{const q=p[(i+1)%p.length];return `<text style="font-size:${Math.max(b.width,b.height)*.065}px" x="${(a[0]+q[0])/2}" y="${(a[1]+q[1])/2}">${i+1}</text>`;}).join('')}</svg>`;
}
export async function convertSource(source,{modal,openModal,onAccept}){
 const controller=new AbortController(),cancel=()=>controller.abort();
 openModal(`<p class="eyebrow">LECTURE AUTOMATIQUE</p><h2>Votre dessin devient un plan.</h2><p>Recherche des murs, des cloisons et des cotes en mm, cm ou m. Le plan créé ne contient pas de mobilier.</p><progress class="conversion-progress" aria-label="Conversion du plan"></progress><p id="conversion-progress" role="status">Préparation du plan…</p><div class="dialog-actions"><button id="cancel-conversion">Annuler la conversion</button></div>`,()=>{$('#cancel-conversion').onclick=()=>modal.close();});
 modal.addEventListener('close',cancel,{once:true});
 try{
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const image=new Image();image.src=source.data;await image.decode();if(controller.signal.aborted)return;
  const prepared=preparePlan(image),rows=await readPlan(prepared,{signal:controller.signal,onProgress:s=>{const el=$('#conversion-progress');if(el)el.textContent=s;}});
  if(controller.signal.aborted)return;
  modal.removeEventListener('close',cancel);reviewConversion(rows,prepared,{modal,openModal,onAccept});
 }catch(e){if(controller.signal.aborted)return;openModal(`<h2>Le contour n’a pas pu être reconstruit.</h2><p>${esc(e.message)}</p><p>Votre original reste dans le projet. Vous pouvez reprendre les contours et les cotes dans « Mon plan ».</p><div class="dialog-actions"><button class="primary" data-close>Revenir à mon plan</button></div>`);}
 finally{modal.removeEventListener('close',cancel);}
}
export function reviewConversion(rows,prepared,{modal,openModal,onAccept}){
 const initialUnit=rows.find(r=>!r.error)?.unit||rows[0]?.unit||'cm';
 openModal(`<p class="eyebrow">MURS & CLOISONS · SANS MOBILIER</p><h2>Vérifiez la lecture, puis créez le plan.</h2><p>Contrôlez l’unité et les cotes proposées. Les côtés manquants sont déduits seulement si les autres cotes suffisent à les calculer.</p><label>Unité des nombres sans suffixe<select id="conversion-unit">${[['mm','Millimètres'],['cm','Centimètres'],['m','Mètres']].map(([u,label])=>`<option value="${u}" ${u===initialUnit?'selected':''}>${label} (${u})</option>`).join('')}</select></label><p class="subtle">Unité proposée : ${initialUnit}. Vous pouvez aussi écrire une cote avec son unité, par exemple « 2230 mm », « 223 cm » ou « 2,23 m ».</p><div class="conversion-rooms">${rows.map((r,i)=>`<section class="conversion-room" data-conversion-room="${i}"><label class="check"><input type="checkbox" data-conversion-include="${i}" ${rows.length===1||!r.error||r.shape.kind==='architecture'?'checked':''}><span>Inclure cette pièce</span></label><label>Nom de la pièce<input data-conversion-name="${i}" maxlength="100" value="Pièce ${i+1}"></label><div data-conversion-preview="${i}">${preview(r.shape,r)}</div><div class="conversion-dimensions">${r.shape.points.map((_,j)=>`<label><span>Mur ${j+1}</span><input type="text" inputmode="decimal" autocomplete="off" data-conversion-value="${i}-${j}" aria-label="Pièce ${i+1}, cote du mur ${j+1}" value="${esc(r.readings[j]?.text||'')}" placeholder="À lire / à déduire"><small data-conversion-reading="${i}-${j}"></small></label>`).join('')}</div>${r.shape.partitions?.length?`<fieldset class="conversion-partitions"><legend>${r.shape.partitions.length} cloison(s) proposée(s)</legend><p class="subtle">Leur position et leur épaisseur viennent du dessin. Vérifiez-les sur l’aperçu ; décochez un tracé qui n’est pas une cloison. Les coordonnées seront modifiables dans « Mes pièces ».</p>${r.shape.partitions.map((_,j)=>`<label class="check"><input type="checkbox" data-conversion-partition="${i}-${j}" checked><span>Cloison ${j+1}</span></label>`).join('')}</fieldset>`:''}${r.rejected?.length?`<p class="note error">${r.rejected.map(x=>`Mur ${x.wall+1} : lecture « ${esc(x.text)} » écartée. Cote déduite : ${fmt(x.proposed)} cm, à vérifier.`).join(' ')}</p>`:''}<p class="note" data-conversion-result="${i}" role="status"></p></section>`).join('')}</div><p class="note">L’original sera masqué pour afficher uniquement les murs et cloisons. Vérifiez ensuite les ouvertures et la hauteur dans « Mes pièces ».</p><label class="check conversion-confirm"><input type="checkbox" id="conversion-verified"><span>J’ai vérifié l’unité, les cotes et les cloisons proposées.</span></label><p id="conversion-status" class="modal-status" role="alert"></p><div class="dialog-actions"><button data-close>Conserver l’original</button><button id="create-converted-plan" class="primary">Créer le plan</button></div>`,()=>{
  let solved=[];
  const refresh=()=>{
   const unit=$('#conversion-unit').value;solved=rows.map((r,i)=>{
    const values=r.shape.points.map((_,j)=>{const input=$(`[data-conversion-value="${i}-${j}"]`),text=input.dataset.derived==='true'?'':input.value.trim();return text?(dimensionValue(text,unit)??NaN):null;}),result=solveDimensions(r.shape,values),indices=(r.shape.partitions||[]).flatMap((_,j)=>$(`[data-conversion-partition="${i}-${j}"]`).checked?[j]:[]),partitions=measuredPartitions(r.shape,result,indices),el=$(`[data-conversion-result="${i}"]`);
    if(!result.error){const test=newRoom(result.points);test.partitions=partitions;result.error=roomError(test,1);}
    el.textContent=result.error||`Contour : ${fmt(result.area)} m² avant déduction des cloisons · ${partitions.length} cloison(s).`;el.classList.toggle('error',Boolean(result.error));el.classList.toggle('success',!result.error);$(`[data-conversion-preview="${i}"]`).innerHTML=preview(r.shape,result,partitions);
    r.shape.points.forEach((_,j)=>{
     const input=$(`[data-conversion-value="${i}-${j}"]`),label=$(`[data-conversion-reading="${i}-${j}"]`),deduction=result.deductions?.find(d=>d.wall===j),value=result.partialLengths?.[j];
     if(!input.value||input.dataset.derived==='true'){
      if(Number.isFinite(value)){
       input.value=String(Math.round(value/unitFactor[unit]*1000)/1000).replace('.',',');input.dataset.derived='true';input.classList.add('is-derived');
       const terms=deduction?.terms.map((t,k)=>(k?(t.sign>0?' + ':' − '):(t.sign<0?'− ':''))+fmt(t.value/unitFactor[unit])).join('');
       label.textContent='Calculé : '+(terms?terms+' = ':'')+fmt(value/unitFactor[unit])+' '+unit;
      }else{input.value='';delete input.dataset.derived;input.classList.remove('is-derived');label.textContent='Cote à lire ou à saisir';}
     }else{input.classList.remove('is-derived');label.textContent='Cote à vérifier';}
     input.placeholder='À renseigner';
    });
    return {...result,values,partitions,included:$(`[data-conversion-include="${i}"]`).checked,name:$(`[data-conversion-name="${i}"]`).value.trim()||'Pièce '+(i+1)};
   });
   const selected=solved.filter(r=>r.included);$('#create-converted-plan').disabled=!$('#conversion-verified').checked||!selected.length||selected.some(r=>r.error);
  };
  document.querySelectorAll('[data-conversion-value],[data-conversion-include],[data-conversion-name],[data-conversion-partition],#conversion-unit,#conversion-verified').forEach(el=>el.addEventListener('input',()=>{if(el.matches('[data-conversion-value]'))delete el.dataset.derived;refresh();}));
  $('#create-converted-plan').onclick=async()=>{
   refresh();if(!$('#conversion-verified').checked)return;const selected=solved.map((r,i)=>({...r,index:i})).filter(r=>r.included);if(!selected.length||selected.some(r=>r.error))return;
   const scales=selected.flatMap(r=>r.values.flatMap((v,j)=>v?[v/(distance(rows[r.index].shape.points[j],rows[r.index].shape.points[(j+1)%r.values.length])/prepared.factor)]:[])).sort((a,b)=>a-b),scale=scales[Math.floor(scales.length/2)];if(!Number.isFinite(scale)||scale<=0)return;
   const rooms=selected.map(r=>convertedRoom(rows[r.index],r,prepared,scale,r.partitions));
   try{$('#create-converted-plan').disabled=true;await onAccept({rooms,scale});modal.close();}catch(e){$('#conversion-status').textContent=e.message;$('#create-converted-plan').disabled=false;}
  };
  refresh();
 });
}
