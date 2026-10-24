import reportFont from '../../vendor/lrf-plan-pose/report-font.mjs?v=20261024-1';
import {orderLines,plinthOrderLines,purchaseSummary} from './core.mjs?v=20261024-1';
import {publicQuote} from './workflow.mjs?v=20261024-1';
const fmt=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
const pdfText=v=>String(v??'').replace(/[\u00a0\u202f]/g,' ').replace(/[’‘]/g,"'").replace(/[–—‑]/g,'-').replace(/œ/g,'oe').replace(/…/g,'...');
const money=v=>Number.isFinite(v)?v.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'Prix sur demande';
export function buildPDFReport(jsPDF,project,rows,image,{includePurchase=false,roomImages=[]}={}){
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});let page=1,y=18;pdf.addFileToVFS('LRFReport.ttf',reportFont);pdf.addFont('LRFReport.ttf','LRFReport','normal');pdf.setFont('LRFReport','normal');
 const footer=()=>{pdf.setFontSize(8);pdf.setTextColor(110);pdf.text('LE ROY FACTORY · PLAN & POSE · '+new Date().toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'}),14,286);pdf.text(String(page),196,286,{align:'right'});};
 const newPage=title=>{pdf.addPage('a4','portrait');page++;y=20;pdf.setTextColor(43,48,39);pdf.setFontSize(17);pdf.text(pdfText(title),14,y);y+=12;footer();};
 const line=(text,{size=10,gap=3}={})=>{const wrapped=pdf.splitTextToSize(pdfText(text),182),height=wrapped.length*size*.43+gap;if(y+height>274)newPage('Suite du dossier');pdf.setFontSize(size);pdf.setTextColor(55,60,50);pdf.text(wrapped,14,y);y+=height;};
 line('LRF PLAN & POSE',{size:21,gap:6});line(project.title,{size:14});const c=project.client||{};
 if(c.name)line('Client : '+c.name);if(c.address||c.city)line([c.address,[c.postcode,c.city].filter(Boolean).join(' ')].filter(Boolean).join(' · '));if(c.phone||c.email)line([c.phone,c.email].filter(Boolean).join(' · '),{size:9});if(project.reference)line('Référence : '+project.reference,{size:9});
 line(rows.length&&rows.every(x=>x.r.confirmed&&!x.error)?'COTES VALIDÉES PAR L’UTILISATEUR':'PROVISOIRE · COTES À VÉRIFIER',{size:9});
 if(image){const available=274-y-5,factor=Math.min(182/image.width,available/image.height),w=image.width*factor,h=image.height*factor;pdf.addImage(image.jpeg,'JPEG',(210-w)/2,y+3,w,h);}footer();
 const quote=publicQuote(rows,project);newPage('Métrés et chiffrage');line('Marge carrelage : '+project.loss+' % · portes et ouvertures au sol déduites des plinthes.',{size:9});line('Les cartons sont arrondis après regroupement des références ; leur quantité est répartie entre les pièces selon leurs besoins.',{size:9});
 for(const row of rows){if(y>220)newPage('Métrés et chiffrage');line(row.r.name,{size:14});if(row.error){line('À corriger : '+row.error);continue;}const t=row.r.tile,p=row.plinths,sale=quote.lines.find(x=>x.roomId===row.r.id);
  line(t.brand+' · '+t.collection+' '+t.color+' · '+t.format+' cm');line('Référence : '+(t.reference||'à confirmer')+' · '+(t.finish||''),{size:9});
  line('Sol net : '+fmt(row.area)+' m² · commande affectée : '+fmt(sale?.floorQuantity)+' m²');line('Boîtage : '+(t.packVerified?t.packPieces+' pièces / '+fmt(t.packArea)+' m²':'à confirmer')+' · chutes de pose : '+fmt(row.cutWaste)+' m²',{size:9});
  if(p){line('Plinthes : '+fmt(p.net)+' ml nets · débit '+fmt(p.debit)+' ml · '+(sale?.plinthIncluded?'matière incluse dans le carrelage':'commande affectée '+fmt(sale?.plinthQuantity)+' ml'));line(p.type==='factory'?'Fabricant · réf. '+(p.product?.reference||'à confirmer')+' · '+p.boxes+' boîte(s)':p.type==='wood'?p.units+' barre(s) bois blanc de 2,20 m':p.tiles+' carreau(x) réservés aux plinthes, inclus dans le carrelage',{size:9});}
  line('Vente carrelage / m² : '+money(sale?.floor)+(sale?.plinthIncluded?' · plinthes découpées incluses':' · vente plinthes / ml : '+money(sale?.plinth)),{size:9});line('Montant de la pièce : '+money(sale?.total),{size:12});y+=4;
 }
 line('Total de vente du projet : '+money(quote.total),{size:15,gap:6});
 if(project.comment){line('Commentaire',{size:13});line(project.comment);}
 newPage('Liste à commander');for(const g of orderLines(rows)){line(g.tile.brand+' · '+g.tile.collection+' '+g.tile.color+' · '+g.tile.format+' cm',{size:12});line('Réf. '+(g.tile.reference||'à confirmer')+' · '+(g.boxes??'à confirmer')+' carton(s) · '+fmt(g.orderArea)+' m²');line('Pertes, marge et arrondi des cartons : '+fmt(g.surplus)+' m²',{size:9});if(includePurchase)line('Achat HT/m² : '+money(g.tile.purchaseHT)+' · montant HT : '+money(g.totalHT));y+=4;}
 for(const g of plinthOrderLines(rows)){line('Plinthes '+(g.type==='wood'?'bois blanc':g.product.reference)+' · '+(g.boxes??g.units)+' '+(g.type==='factory'?'boîte(s)':'barre(s)')+' · '+fmt(g.order)+' ml');if(includePurchase)line('Achat HT : '+money(g.purchase.totalHT));}
 if(includePurchase)line('Total achat HT : '+money(purchaseSummary(rows).totalHT),{size:13});
 for(const entry of roomImages){newPage(entry.name);const factor=Math.min(182/entry.image.width,240/entry.image.height),w=entry.image.width*factor,h=entry.image.height*factor;pdf.addImage(entry.image.jpeg,'JPEG',(210-w)/2,y,w,h);}
 line('Quantités issues du plan et des cotes validées. Contrôlez les coupes et les dimensions sur chantier avant commande.',{size:8});return pdf.output('blob');
}
