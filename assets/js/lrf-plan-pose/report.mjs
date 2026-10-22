import reportFont from '../../vendor/lrf-plan-pose/report-font.mjs?v=20261022-6';
import {orderLines,plinthOrderLines} from './core.mjs?v=20261022-6';
const fmt=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
const pdfText=value=>String(value).replace(/[\u00a0\u202f]/g,' ').replace(/[’‘]/g,"'").replace(/[–—‑]/g,'-').replace(/œ/g,'oe').replace(/…/g,'...');
const money=v=>Number.isFinite(v)?v.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}):'À confirmer';
export function buildPDFReport(jsPDF,project,rows,image,{includePurchase=false}={}){
 const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),confirmed=rows.length>0&&rows.every(x=>x.r.confirmed&&!x.error);let page=1,y=18;pdf.addFileToVFS('LRFReport.ttf',reportFont);pdf.addFont('LRFReport.ttf','LRFReport','normal');pdf.setFont('LRFReport','normal');
 const footer=()=>{pdf.setFontSize(8);pdf.setTextColor(110);pdf.text('LE ROY FACTORY · PLAN & POSE · '+new Date().toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'}),14,201);pdf.text(String(page),283,201,{align:'right'});};
 const newPage=title=>{pdf.addPage();page++;y=18;pdf.setTextColor(43,48,39);pdf.setFontSize(17);pdf.text(pdfText(title),14,y);y+=12;footer();};
 const line=(text,{size=10,color=[65,69,58],gap=2}={})=>{const wrapped=pdf.splitTextToSize(pdfText(text),262),height=wrapped.length*size*.43+gap;if(y+height>190)newPage('Suite du récapitulatif');pdf.setFontSize(size);pdf.setTextColor(...color);pdf.text(wrapped,14,y);y+=height;};
 pdf.setTextColor(43,48,39);pdf.setFontSize(22);pdf.text('LRF PLAN & POSE',14,19);pdf.setFontSize(12);pdf.text(pdf.splitTextToSize(pdfText(project.title),260)[0],14,29);pdf.setFontSize(9);pdf.setTextColor(130,98,44);pdf.text(pdfText(confirmed?'COTES VALIDÉES PAR L’UTILISATEUR':'PROVISOIRE · COTES À VÉRIFIER'),14,37);
 if(project.reference){pdf.setTextColor(100);pdf.text(pdfText('Chantier : '+project.reference.slice(0,100)),14,44);}const factor=Math.min(265/image.width,140/image.height),w=image.width*factor,h=image.height*factor;pdf.addImage(image.jpeg,'JPEG',(297-w)/2,48,w,h);footer();
 newPage('Mon projet, pièce par pièce');line('Marge carrelage : '+project.loss+' % · les portes et passages au sol sont déduits des plinthes.',{size:9});
 for(const row of rows){if(y>140)newPage('Mes pièces');line(row.r.name+' · '+(row.r.confirmed?'cotes validées':'cotes à vérifier'),{size:13});if(row.error){line('À corriger : '+row.error);continue;}const t=row.r.tile,p=row.plinths;
  line(t.brand+' · '+t.collection+' · '+(t.color||'Coloris à confirmer')+' · '+t.format+' cm · Réf. '+(t.reference||'à confirmer'));
  line('Sol net : '+fmt(row.area)+' m² · '+row.full+' carreaux entiers / '+row.cut+' à découper · chutes du calepinage : '+fmt(row.cutWaste)+' m²');
  if(p){line('Plinthes à poser : '+fmt(p.net)+' ml · débit avec chutes : '+fmt(p.debit)+' ml · chutes de débit : '+fmt(p.waste)+' ml');line(p.type==='wood'?p.units+' barre(s) bois blanc de 2,20 m · '+fmt(p.order)+' ml à acheter':p.type==='factory'?p.boxes+' boîte(s) de plinthes · réf. '+(p.product?.reference||'à confirmer')+' · '+p.units+' pièces · '+fmt(p.order)+' ml à acheter':p.tiles+' carreau(x) réservés aux plinthes, inclus dans la liste de carrelage.');if(p.aligned)line('Joints des plinthes alignés sur le calepinage du sol.',{size:9});}
  y+=5;
 }
 const groups=orderLines(rows);newPage('Ma liste de carrelage à commander');
 for(const g of groups){if(y>143)newPage('Ma liste à commander');const t=g.tile;line(t.brand+' · '+t.collection+' '+t.color+' · '+t.format+' cm',{size:12});line('Référence : '+(t.reference||'à confirmer')+' · '+(t.finish||'Finition à confirmer'));
  line(g.packVerified?'Boîtage : '+t.packPieces+' pièces / '+fmt(t.packArea)+' m² par boîte · '+g.boxes+' boîte(s) = '+fmt(g.orderArea)+' m² / '+g.orderPieces+' pièces':'Boîtage à confirmer · besoin : '+fmt(g.needed)+' m²');
  line('Chutes + marge + arrondi des boîtes : '+fmt(g.surplus)+' m² · carreaux de plinthes : '+fmt(g.plinthArea)+' m²');
  if(includePurchase){line('Achat HT/m² (détail) : '+money(t.purchaseHT)+' · total achat HT : '+money(g.totalHT));line('Source tarif : '+(t.priceSource||'à confirmer'),{size:8});}
  line('Source boîtage : '+(t.packSource||'à confirmer'),{size:8});y+=5;
 }
 const plinthLines=plinthOrderLines(rows);if(plinthLines.length){line('Mes plinthes à commander',{size:13});for(const p of plinthLines){line(p.type==='wood'?'Bois blanc : '+p.units+' barre(s) de 2,20 m · '+fmt(p.order)+' ml':'Plinthes fabricant : réf. '+p.product.reference+' · '+p.boxes+' boîte(s) / '+p.units+' pièces · '+fmt(p.order)+' ml');line('À poser : '+fmt(p.net)+' ml · débit : '+fmt(p.debit)+' ml · prix à confirmer',{size:9});}}
 if(includePurchase){const priced=groups.filter(g=>g.totalHT!==null);line((priced.length===groups.length?'Total carrelage achat HT : ':'Sous-total carrelage achat HT renseigné : ')+(priced.length?money(priced.reduce((n,g)=>n+g.totalHT,0)):'À confirmer'),{size:13});line('Plinthes du fabricant, bois, pose et transport en supplément ; leurs prix restent à confirmer.',{size:9});}
 line('Une même référence est regroupée entre les pièces avant l’arrondi des boîtes. Les chutes de sol ne sont pas présumées réutilisables en plinthes. Le débit de plinthes propose le réemploi des chutes compatibles ; il doit être contrôlé sur chantier. Ce dossier ne constitue pas une commande.',{size:8});
 return pdf.output('blob');
}
