import {bounds,distance} from './core.mjs';
import {dimensionValue,solveDimensions} from './dimensions.mjs';
import {preparePlan,readPlan,measuredPoints} from './plan-reader.mjs';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n);
const $=s=>document.querySelector(s);

function preview(shape,solved){
 const p=solved.error?shape.local:solved.points,b=bounds(p),pad=Math.max(b.width,b.height)*.15+5;
 return `<svg class="conversion-plan" viewBox="${b.minX-pad} ${b.minY-pad} ${b.width+pad*2} ${b.height+pad*2}" role="img" aria-label="Contour reconnu et numéros des murs"><polygon points="${p.map(v=>v.join(',')).join(' ')}"/>${p.map((a,i)=>{const q=p[(i+1)%p.length];return `<text style="font-size:${Math.max(b.width,b.height)*.065}px" x="${(a[0]+q[0])/2}" y="${(a[1]+q[1])/2}">${i+1}</text>`;}).join('')}</svg>`;
}

export async function convertSource(source,{modal,openModal,onAccept}){
 const controller=new AbortController(),cancel=()=>controller.abort();
 openModal(`<p class="eyebrow">LECTURE AUTOMATIQUE</p><h2>Votre dessin devient un plan.</h2><p>Lecture des cotes et reconstruction des murs. Les nombres sans unité sont lus en centimètres.</p><progress class="conversion-progress" aria-label="Conversion du plan"></progress><p id="conversion-progress" role="status">Préparation de la photo…</p><div class="dialog-actions"><button id="cancel-conversion">Annuler la conversion</button></div>`,()=>{$('#cancel-conversion').onclick=()=>modal.close();});
 modal.addEventListener('close',cancel,{once:true});
 try{
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const image=new Image();image.src=source.data;await image.decode();if(controller.signal.aborted)return;
  const prepared=preparePlan(image),rows=await readPlan(prepared,{signal:controller.signal,onProgress:s=>{const el=$('#conversion-progress');if(el)el.textContent=s;}});
  if(controller.signal.aborted)return;
  modal.removeEventListener('close',cancel);
  reviewConversion(rows,prepared,{modal,openModal,onAccept});
 }catch(e){if(controller.signal.aborted)return;openModal(`<h2>La lecture doit être améliorée.</h2><p>${esc(e.message)}</p><p>Votre photo reste dans le projet. Pour une nouvelle photo, cadrez la feuille de face et assurez-vous que les chiffres et les murs sont bien visibles.</p><div class="dialog-actions"><button class="primary" data-close>Revenir à mon plan</button></div>`);}
 finally{modal.removeEventListener('close',cancel);}
}

export function reviewConversion(rows,prepared,{modal,openModal,onAccept}){
  openModal(`<p class="eyebrow">COTES RECONNUES · PLAN MODIFIABLE</p><h2>Vérifiez la lecture, puis créez le plan.</h2><p>Le contour est tracé. Contrôlez les nombres ci-dessous ; une cote manquante n’est déduite que si les autres permettent de la calculer.</p><label>Unité des nombres saisis<select id="conversion-unit"><option value="cm">Centimètres (cm)</option><option value="m">Mètres (m)</option><option value="mm">Millimètres (mm)</option></select></label><div class="conversion-rooms">${rows.map((r,i)=>`<section class="conversion-room" data-conversion-room="${i}"><label class="check"><input type="checkbox" data-conversion-include="${i}" checked><span>Inclure cette pièce</span></label><label>Nom de la pièce<input data-conversion-name="${i}" maxlength="100" value="Pièce ${i+1}"></label><div data-conversion-preview="${i}">${preview(r.shape,r)}</div><div class="conversion-dimensions">${r.shape.points.map((_,j)=>`<label><span>Mur ${j+1}</span><input type="text" inputmode="decimal" autocomplete="off" data-conversion-value="${i}-${j}" aria-label="Pièce ${i+1}, cote du mur ${j+1}" value="${esc(r.readings[j]?dimensionValue(r.readings[j].text):'')}" placeholder="À lire / à déduire"><small data-conversion-reading="${i}-${j}">${r.readings[j]?'Lecture à vérifier':'Non lu'}</small></label>`).join('')}</div>${r.rejected?.length?`<p class="note error">${r.rejected.map(x=>`Mur ${x.wall+1} : lecture « ${esc(x.text)} » incohérente. La fermeture donne ${fmt(x.proposed)} cm. Vérifiez cette cote sur votre dessin.`).join(' ')}</p>`:''}<p class="note" data-conversion-result="${i}" role="status"></p></section>`).join('')}</div><p class="note">Vérifiez ensuite les portes, fenêtres et la hauteur sous plafond dans « Mes pièces ». Une photo en perspective peut déformer le fond ; le plan reconstruit utilise les cotes écrites.</p><label class="check conversion-confirm"><input type="checkbox" id="conversion-verified"><span>J’ai vérifié les cotes et le contour proposés.</span></label><p id="conversion-status" class="modal-status" role="alert"></p><div class="dialog-actions"><button data-close>Conserver la photo</button><button id="create-converted-plan" class="primary">Créer le plan</button></div>`,()=>{
   let solved=[];
   const refresh=()=>{
    const unit=$('#conversion-unit').value;solved=rows.map((r,i)=>{const values=r.shape.points.map((_,j)=>{const text=$(`[data-conversion-value="${i}-${j}"]`).value.trim();return text?(dimensionValue(text,unit)??NaN):null;}),result=solveDimensions(r.shape,values),el=$(`[data-conversion-result="${i}"]`);
     el.textContent=result.error||`Pièce reconstruite · ${fmt(result.area)} m² · cotes en cm.`;el.classList.toggle('error',Boolean(result.error));el.classList.toggle('success',!result.error);$(`[data-conversion-preview="${i}"]`).innerHTML=preview(r.shape,result);
     r.shape.points.forEach((_,j)=>{const input=$(`[data-conversion-value="${i}-${j}"]`),label=$(`[data-conversion-reading="${i}-${j}"]`);if(!input.value&&!result.error){input.placeholder=fmt(result.lengths[j])+' cm';label.textContent='Déduit des autres cotes';}else{input.placeholder='À renseigner';label.textContent=input.value?'Cote à vérifier':'Non lu';}});
     return {...result,values,included:$(`[data-conversion-include="${i}"]`).checked,name:$(`[data-conversion-name="${i}"]`).value.trim()||'Pièce '+(i+1)};
    });
    const selected=solved.filter(r=>r.included);$('#create-converted-plan').disabled=!$('#conversion-verified').checked||!selected.length||selected.some(r=>r.error);
   };
   document.querySelectorAll('[data-conversion-value],[data-conversion-include],[data-conversion-name],#conversion-unit,#conversion-verified').forEach(el=>el.addEventListener('input',refresh));
   $('#create-converted-plan').onclick=async()=>{
    refresh();if(!$('#conversion-verified').checked)return;const selected=solved.map((r,i)=>({...r,index:i})).filter(r=>r.included);if(!selected.length||selected.some(r=>r.error))return;
    const scales=selected.flatMap(r=>r.values.flatMap((v,j)=>v?[v/(distance(rows[r.index].shape.points[j],rows[r.index].shape.points[(j+1)%r.values.length])/prepared.factor)]:[])).sort((a,b)=>a-b),scale=scales[Math.floor(scales.length/2)];
    if(!Number.isFinite(scale)||scale<=0)return;
    const rooms=selected.map(r=>{const original=rows[r.index],row={shape:{...original.shape,points:original.shape.points.map(p=>p.map(v=>v/prepared.factor))}};return {name:r.name,points:measuredPoints(row,r,scale)};});
    try{$('#create-converted-plan').disabled=true;await onAccept({rooms,scale});modal.close();}catch(e){$('#conversion-status').textContent=e.message;$('#create-converted-plan').disabled=false;}
   };
   refresh();
  });
}
