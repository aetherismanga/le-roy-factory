import {quoteProject,money} from './pricing.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validThumbnail=value=>typeof value==='string'&&value.length<=120000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:null;
export const projectStatus=record=>record.status==='validated'?'Commande validée':record.status==='sending'?'Commande en cours d’envoi':'Devis en cours';
export function projectAmount(record){
 if(record.kind==='house')return {amount:null,label:'Chiffrage par pièce',partial:false};
 try{const q=quoteProject(record.data),amount=Number.isInteger(q.publicTTC)?q.publicTTC:q.subtotal;return {amount,label:Number.isInteger(amount)?money(amount)+(q.missing.length?' · sous-total':''):'À chiffrer',partial:!!(q.missing.length||q.excluded.length)};}catch{return {amount:null,label:'À chiffrer',partial:false};}
}
// Older dossiers also have a real visual: draw their saved outline and furniture
// placements, instead of reusing an unrelated catalogue photograph.
export function projectPlan(record){
 const data=record.data||{},house=record.kind==='house';
 const points=house?[[0,0],[Number(data.layout?.width)||10,0],[Number(data.layout?.width)||10,Number(data.layout?.depth)||8],[0,Number(data.layout?.depth)||8]]:data.room?.points;
 if(!Array.isArray(points)||points.length<3||points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n))))return '';
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,pad=Math.max(w,h)*.12||1,stroke=Math.max(w,h)*.014;
 let elements='';
 if(!house)for(const item of data.items||[]){const index=Number(item.placement?.wall),a=points[index],b=points[(index+1)%points.length];if(!a||!b)continue;const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!length)continue;const dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length,u=Number(item.placement?.u)||0,s=item.settings||{},width=Number(s.width)||(['column'].includes(item.type)?38:80),depth=Number(s.depth)||({cabinet:46,column:27,mirror:4,door:4,window:4}[item.type]||40),angle=Math.atan2(dy,dx)*180/Math.PI;
  if([u,width,depth].some(n=>!Number.isFinite(n)||Math.abs(n)>3000))continue;
  const colour=['door','window'].includes(item.type)?'#91b5bd':item.type==='mirror'?'#d3ddd9':'#b49b78';elements+='<rect x="'+(-width/2)+'" y="0" width="'+width+'" height="'+depth+'" rx="2" transform="translate('+(a[0]+dx*u)+' '+(a[1]+dy*u)+') rotate('+angle+')" fill="'+colour+'" stroke="#796e5c" stroke-width="'+stroke*.4+'"/>';
 }
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[x-pad,y-pad,w+pad*2,h+pad*2].join(' ')+'"><rect x="'+(x-pad)+'" y="'+(y-pad)+'" width="'+(w+pad*2)+'" height="'+(h+pad*2)+'" fill="#eee9dd"/><polygon points="'+points.map(p=>p.join(',')).join(' ')+'" fill="#fffdf5" stroke="#526256" stroke-width="'+stroke+'" stroke-linejoin="round"/>'+elements+'</svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
export function projectCardMarkup(record){const amount=projectAmount(record),thumbnail=validThumbnail(record.thumbnail)||projectPlan(record),status=projectStatus(record);return '<div class="lrf-project-visual">'+(thumbnail?'<img alt="Aperçu du projet '+esc(record.title)+'" src="'+esc(thumbnail)+'" loading="lazy">':'<span>Plan du projet</span>')+'</div><div class="lrf-project-information"><span class="lrf-project-status '+(record.status==='validated'?'is-validated':'')+'">'+esc(status)+'</span><strong translate="no">'+esc(record.title)+'</strong><small>'+esc(record.number||'Projet existant')+' · '+(record.customer?.name?'<span translate="no">'+esc(record.customer.name)+'</span>':'Client à renseigner')+'</small><span class="lrf-project-amount">'+esc(amount.label)+'</span>'+(amount.partial?'<small>Éléments sans tarif exclus du montant renseigné.</small>':'')+'<small>'+esc(record.kind==='house'?'Plan maison':'Salle de bains')+' · '+esc(record.date?new Date(record.date).toLocaleDateString('fr-FR'):'')+(record.conflict?' · Version différente sur un autre poste':'')+'</small></div><div class="lrf-project-actions"></div>';}
