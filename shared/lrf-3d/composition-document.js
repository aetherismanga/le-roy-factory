// The box recap and the two RANDAL documents share the same calm A4 language:
// white paper, dark green headings, fine rules, quantities before totals.
import {translateText as t,localeTag} from './i18n/index.js';
export const documentMoney=value=>Number.isFinite(value)?Number(value).toLocaleString(localeTag(),{style:'currency',currency:'EUR'}):t('À confirmer');
export const documentNumber=value=>Number(value||0).toLocaleString(localeTag(),{maximumFractionDigits:2});
export const escapeDocument=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=value=>String(value??'').replace(/[\u202f\u00a0]/g,' ').replace(/[−–—]/g,'-').replace(/×/g,'x');
const points=(values,fx,fy)=>values.map(([x,y])=>`${fx(x)},${fy(y)}`).join(' ');
let planSerial=0;
export function tilePlanSVG(surface,{width=900,height=600}={}){
 const outline=surface.polygon||surface.outline||[[0,0],[surface.length||1,0],[surface.length||1,surface.height||1],[0,surface.height||1]],xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]);
 const minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys),w=maxX-minX||1,h=maxY-minY||1,margin=42,scale=Math.min((width-margin*2)/w,(height-margin*2)/h),left=(width-w*scale)/2,top=(height-h*scale)/2;
 const fx=x=>left+(x-minX)*scale,fy=y=>top+(maxY-y)*scale;
 const holes=[...new Map([...(surface.holes||[]),...(surface.openings||[]).map(o=>Array.isArray(o)?o:[[o.left,o.bottom],[o.right,o.bottom],[o.right,o.top],[o.left,o.top]])].map(hole=>[JSON.stringify(hole),hole])).values()],clipId='lrf-tile-plan-'+(++planSerial);
 const cells=surface.cells||[],grid=cells.map(cell=>`<polygon points="${points(cell.bounds||cell.polygon||[],fx,fy)}" fill="none" stroke="#9b998e" stroke-width="1"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/><defs><mask id="${clipId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" style="mask-type:luminance"><rect width="${width}" height="${height}" fill="black"/><polygon points="${points(outline,fx,fy)}" fill="white"/>${holes.map(h=>`<polygon points="${points(h,fx,fy)}" fill="black"/>`).join('')}</mask></defs><polygon points="${points(outline,fx,fy)}" fill="#f7f4ec"/><g mask="url(#${clipId})">${grid}</g>${holes.map(h=>`<polygon points="${points(h,fx,fy)}" fill="white" stroke="#47574c" stroke-width="2"/>`).join('')}<polygon points="${points(outline,fx,fy)}" fill="none" stroke="#28372e" stroke-width="2"/><g font-family="Arial,sans-serif" font-size="17" fill="#28372e"><text x="${width/2}" y="${Math.min(height-8,top+h*scale+30)}" text-anchor="middle">${documentNumber(w*100)} cm</text><text x="${Math.max(16,left-16)}" y="${height/2}" text-anchor="middle" transform="rotate(-90 ${Math.max(16,left-16)} ${height/2})">${documentNumber(h*100)} cm</text></g></svg>`;
}
async function rasterPlan(surface){
 const svg=tilePlanSVG(surface),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),image=new Image();
 try{image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1200;const context=canvas.getContext('2d');context.drawImage(image,0,0,1800,1200);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
}
export async function createCompositionPDF({kind='furniture',title='Ma salle de bains',siteReference='',brand='RANDAL',customer={},rows=[],total=null,subtotal=null,energy=null,privateCode='',plans=[],snapshot='',notes=[]},{PDF=null,planImage=rasterPlan}={}){
 if(!PDF){const library=await import('../../assets/vendor/studio-one/jspdf.umd.min.js');PDF=library.jsPDF||library.default?.jsPDF||globalThis.jspdf?.jsPDF;}
 if(!PDF)throw Error(t('La préparation du PDF est indisponible. Utilisez Imprimer / PDF.'));
 const pdf=new PDF({unit:'mm',format:'a4',compress:true}),W=210,M=16,right=W-M,body=W-M*2;let y=0;
 const txt=(value,x,yy,size=10,style='normal',options={})=>{pdf.setFont('helvetica',style);pdf.setFontSize(size);pdf.setTextColor(35,48,41);pdf.text(Array.isArray(value)?value.map(line=>clean(t(line))):clean(t(value)),x,yy,options);};
 const rule=yy=>{pdf.setDrawColor(213,214,206);pdf.setLineWidth(.2);pdf.line(M,yy,right,yy);};
 const split=(value,width,size=9,style='normal')=>{pdf.setFont('helvetica',style);pdf.setFontSize(size);return pdf.splitTextToSize(clean(t(value)),width);};
 const header=()=>{txt('LE ROY FACTORY  /  '+brand,M,18,9,'bold');txt(kind==='tiles'?'Carrelage et calepinage':'Composition du mobilier',M,31,22);rule(37);y=46;};
 const next=()=>{pdf.addPage();header();};
 const room=(height=10)=>{if(y+height>274)next();};
 const paragraph=(text,size=9)=>{const lines=split(text,body,size),lineHeight=size*.4+1;room(lines.length*lineHeight+5);txt(lines,M,y,size);y+=lines.length*lineHeight+5;};
 header();const titleLines=split(title,body,14,'bold');room(titleLines.length*6+5);txt(titleLines,M,y,14,'bold');y+=titleLines.length*6+5;if(siteReference)paragraph('Chantier : '+siteReference,10);
 const contact=[customer.societe||customer.name||customer.contact,customer.codeClient,customer.adresse,[customer.codePostal,customer.ville].filter(Boolean).join(' '),customer.email,customer.telephone].filter(Boolean);if(contact.length)paragraph(contact.join('  ·  '));
 if(snapshot&&kind==='furniture'){try{const image=pdf.getImageProperties(snapshot),h=Math.min(65,body*image.height/image.width),w=h*image.width/image.height;room(h+8);pdf.addImage(snapshot,'PNG',M+(body-w)/2,y,w,h);y+=h+8;}catch{/* The furniture references remain exportable if the optional image fails. */}}
 txt('DÉSIGNATION',M,y,8,'bold');txt('MONTANT',right,y,8,'bold',{align:'right'});y+=4;rule(y);y+=7;
 for(const row of rows){
  const details=[row.detail,row.reference?'Réf. '+row.reference:'',row.privateCode?'Code LRF : '+row.privateCode:''].filter(Boolean),lines=details.flatMap(line=>split(line,body-38,8.5)),nameLines=split(row.name||row.collection||'Article',body-38,10,'bold'),height=nameLines.length*4.4+lines.length*3.8+9;
  room(height);txt(nameLines,M,y,10,'bold');txt(documentMoney(row.total),right,y,10,'bold',{align:'right'});y+=nameLines.length*4.4;for(const line of lines){txt(line,M,y,8.5);y+=3.8;}y+=3;rule(y);y+=6;
 }
 room(42);if(energy){txt('Taxe énergétique',M,y,10);txt(documentMoney(energy.amount),right,y,10,'normal',{align:'right'});y+=5;txt(documentNumber(energy.area)+' m² x '+documentMoney(energy.rate)+'/m²',M,y,8);y+=7;rule(y);y+=8;}
 txt(total===null?'Sous-total renseigné':'Total '+(kind==='tiles'?'carrelage':'mobilier'),M,y,12,'bold');txt(documentMoney(total??subtotal),right,y,19,'bold',{align:'right'});y+=10;
 if(privateCode)paragraph('Code composition : '+privateCode,9);
 for(const note of notes)paragraph(note,8);
 if(kind==='tiles')paragraph('Quantités regroupées par référence, pertes et arrondi aux boîtes complètes inclus. Fourniture seule. Pose, transport et profilés à confirmer séparément. Vérifier les cotes sur chantier avant commande.',8);
 else paragraph('Mobilier chiffré séparément du carrelage. Équipements sans tarif intégré, pose et transport exclus. Références, compatibilités et disponibilités à confirmer.',8);
 for(const surface of plans){
  next();const heading=split(surface.label||'Plan de pose',body,16,'bold');txt(heading,M,y,16,'bold');y+=heading.length*7+2;
  paragraph(surface.description||surface.layoutText||'Calepinage du projet');
  if(surface.finishLabel)paragraph(surface.finishLabel,10);
  const picture=await planImage(surface);if(picture){room(body*2/3+43);pdf.addImage(picture,'PNG',M,y,body,body*2/3);y+=body*2/3+7;}
  const matching=surface.quantity||surface;paragraph('Surface nette : '+documentNumber(matching.area)+' m²'+(Number.isFinite(matching.tileCount)?'  ·  '+matching.tileCount+' carreaux positionnés':''));
  if(Number.isFinite(matching.full)||Number.isFinite(matching.cut))paragraph((matching.full||0)+' carreaux entiers  ·  '+(matching.cut||0)+' carreaux à découper.');
  paragraph('Cotes en centimètres. Dessin de calepinage du projet ; vérifier le support, les ouvertures et les coupes avant la pose.',8);
 }
 const footerLines=split('LE ROY FACTORY  ·  '+clean(siteReference||title),body-25,7),footer=footerLines[0]+(footerLines.length>1?'…':'');
 const pages=pdf.getNumberOfPages();for(let page=1;page<=pages;page++){pdf.setPage(page);pdf.setDrawColor(213,214,206);pdf.line(M,282,right,282);txt(footer,M,288,7);txt(page+' / '+pages,right,288,7,'normal',{align:'right'});}
 return pdf;
}
export async function downloadCompositionPDF(data){const pdf=await createCompositionPDF(data);const name=String(data.siteReference||data.title||'projet').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,65);pdf.save('LRF-'+(data.kind==='tiles'?'carrelage-':'mobilier-')+name+'.pdf');return pdf;}
