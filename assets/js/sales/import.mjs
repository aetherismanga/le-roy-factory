import {cents,QUALITIES} from './core.mjs';
const alias={kind:['type','kind'],supplierCode:['code client','code fournisseur','codice cliente','supplierCode'],name:['client','nom client','raison sociale','name'],start:['debut','date debut','start'],end:['fin','date fin','end'],amount:['montant','ca','importo','amount'],productCode:['reference','code article','codice','productCode'],description:['designation','descrizione','description'],series:['serie','series'],format:['format'],quality:['qualite','quality'],quantity:['quantite','quantity'],unit:['unite','unit'],tax:['base','ht ttc','tax'],family:['famille','family']};
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');const line=text.split(/\r?\n/)[0],sep=line.includes(';')?';':line.includes('\t')?'\t':',';
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===sep&&!quoted){row.push(cell);cell='';}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('Guillemet CSV non fermé');row.push(cell.replace(/\r$/,''));if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export const csvCell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
export function matrixToRows(matrix,options={}){
 if(matrix.length<2)throw Error('Le tableau doit contenir les colonnes et au moins une ligne.');
 const headers=matrix[0].map(clean),map={};for(const [k,names] of Object.entries(alias))map[k]=headers.findIndex(h=>names.some(n=>clean(n)===h));
 return matrix.slice(1).filter(row=>row.some(v=>String(v??'').trim())).map((row,i)=>{
  const get=k=>map[k]>=0?String(row[map[k]]??'').trim():'';
  const quality=get('quality')||'Non renseigné';
  if(!QUALITIES.includes(quality))throw Error(`Ligne ${i+2} : validez la qualité « ${quality} » (MS et 2e choix sont distincts).`);
  const quantity=get('quantity');
  return {partner:options.partner||'VIEW',kind:['synthese','summary'].includes(clean(get('kind')))?'summary':'detail',supplierCode:get('supplierCode'),name:get('name'),start:get('start')||options.start||'',end:get('end')||options.end||'',amount:cents(get('amount')),tax:get('tax')||options.tax||'Non précisé',quality,productCode:get('productCode'),description:get('description'),series:get('series'),format:get('format'),family:get('family'),quantity:quantity?Number(quantity.replace(',','.')):null,unit:get('unit')||null,source:`${options.source||'Tableau'} — ligne ${i+2}`};
 });
}
export const columns=['type','code client','client','debut','fin','montant','reference','designation','serie','format','qualite','quantite','unite','base','famille'];
export function rowsCSV(rows){return [columns,...rows.map(r=>[r.kind==='summary'?'synthese':'detail',r.supplierCode,r.name,r.start,r.end,(r.amount/100).toFixed(2).replace('.',','),r.productCode,r.description,r.series,r.format,r.quality,r.quantity,r.unit,r.tax,r.family])].map(r=>r.map(csvCell).join(';')).join('\n');}
export function script(src,name){if(window[name])return Promise.resolve(window[name]);return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=()=>resolve(window[name]);el.onerror=()=>{el.remove();reject(Error('Impossible de charger le lecteur de fichier. Vérifiez la connexion.'));};document.head.append(el);});}
export async function extract(file,progress){
 if(file.size>25*1024*1024)throw Error('Fichier limité à 25 Mo.');
 const ext=file.name.split('.').pop().toLowerCase();
 if(ext==='json'){const data=JSON.parse(await file.text());return {batch:data};}
 if(['csv','tsv','txt'].includes(ext))return {matrix:parseCSV(await file.text())};
 if(['xlsx','xls'].includes(ext)){
  const XLSX=await script('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js','XLSX');
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  return {sheets:wb.SheetNames.map(name=>({name,matrix:XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:false,defval:''})}))};
 }
 if(ext==='pdf'){
  const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;if(pdf.numPages>30)throw Error('Maximum 30 pages par fichier.');
  const out=[];for(let i=1;i<=pdf.numPages;i++){progress(`Lecture PDF ${i}/${pdf.numPages}`);const page=await pdf.getPage(i);const content=await page.getTextContent();
   const lines=new Map();for(const item of content.items){const y=Math.round(item.transform[5]/3)*3;if(!lines.has(y))lines.set(y,[]);lines.get(y).push(item);}
   let text=[...lines].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.transform[4]-b.transform[4]).map(x=>x.str).join(' ; ')).join('\n');
   if(text.trim().length<30){const viewport=page.getViewport({scale:1.5}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;text=await ocr(canvas,progress);canvas.width=canvas.height=0;}
   out.push(`PAGE ${i}\n${text}`);page.cleanup();
  }await pdf.destroy();return {text:out.join('\n\n')};
 }
 if(file.type.startsWith('image/'))return {text:await ocr(file,progress)};
 throw Error('Format accepté : CSV, Excel, PDF, image ou JSON de reprise.');
}
async function ocr(file,progress){
 const T=await script('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js','Tesseract');
 const worker=await T.createWorker('fra+ita',1,{logger:m=>{if(m.status==='recognizing text')progress(`Reconnaissance ${Math.round(m.progress*100)} %`);}});
 try{return (await worker.recognize(file,{rotateAuto:true})).data.text;}finally{await worker.terminate();}
}
