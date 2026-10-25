import fs from 'node:fs';
import path from 'node:path';
import {parse,version as parserVersion} from 'acorn';
import {chromium} from 'playwright';
import {translateText as translateExplicit} from '../i18n/index.js';

// Build finite, inert examples from JavaScript syntax. Expressions are never
// executed. Names/references become neutral markers; numbers use test values.
const product='LRFPRODUCT';
const marker='LRFDYNAMIC';
const limit=16;
const unique=values=>[...new Set(values)].slice(0,limit);
const pair=(left,right)=>unique(left.flatMap(a=>right.map(b=>a+b)));
const exprName=node=>node?.type==='Identifier'?node.name:node?.type==='MemberExpression'&&!node.computed?node.property.name:'';
function examples(node){
 if(!node)return [marker];
 switch(node.type){
  case 'Literal':return typeof node.value==='string'||typeof node.value==='number'?[String(node.value)]:[marker];
  case 'TemplateLiteral':{let values=[node.quasis[0]?.value.cooked??node.quasis[0]?.value.raw??''];for(let i=0;i<node.expressions.length;i++)values=pair(pair(values,examples(node.expressions[i])),[node.quasis[i+1]?.value.cooked??node.quasis[i+1]?.value.raw??'']);return values;}
  case 'BinaryExpression':return node.operator==='+'?pair(examples(node.left),examples(node.right)):['2'];
  case 'ConditionalExpression':return unique([...examples(node.consequent),...examples(node.alternate)]);
  case 'LogicalExpression':return unique([...examples(node.left),...examples(node.right)]);
  case 'CallExpression':{
   const name=exprName(node.callee);
   if(['t','translateText'].includes(name))return examples(node.arguments[0]).map(value=>translateExplicit(value,'es'));
   if(['esc','String','safeText','labelES','atelierLabel'].includes(name))return examples(node.arguments[0]);
   if(name==='join')return node.arguments[0]?.value===' + '?['40 + 60']:['2'];
   if(['money','publicMoney','price'].includes(name))return ['765 €'];
   if(['fmt','toFixed','toLocaleString'].includes(name))return ['15,25'];
   if(['round','floor','ceil','abs','min','max'].includes(name))return ['2'];
   if(name==='replace'&&node.callee?.object?.type==='CallExpression'&&exprName(node.callee.object.callee)==='String')return ['80'];
   return [marker];
  }
  case 'ChainExpression':return examples(node.expression);
  case 'MemberExpression':{
   const name=exprName(node);
   if(['width','height','depth','length','count','n','i','index','area','orderArea','withLoss','full','cut','boxes','pcsBox','m2Box','orderPieces','units','tileCount','total','cutWaste','number','page','pdfPage','levels','tiles','packPieces','wall'].includes(name))return [name==='height'?'54':name==='width'?'80':name==='depth'?'46':'2'];
   if(name==='message')return [''];
   if(['name','label','collection','collectionName','title','color','finish','reference','id','format'].includes(name))return [product];
   return [marker];
  }
  case 'Identifier':if(node.name==='detail')return ['',' · détail'];return /^(?:n|i|j|index|step|cm|width|height|depth|length|total|number|page|level|count|left|right|bottom|top)$/.test(node.name)?['2']:['name','label','title','reference','collection','color','finish'].includes(node.name)?[product]:[marker];
  default:return [marker];
 }
}

export async function auditSourceUI({root,translateText,preserved,isFrench,numericOrSymbol}){
 const sourceFiles=[];
 for(const base of ['studio-one/src','randal-general/src','shared/lrf-3d']){
  const visit=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory()){if(!['i18n','qa','media','node_modules'].includes(entry.name))visit(full);}else if(/\.(?:js|mjs)$/.test(entry.name)&&!entry.name.startsWith('polygon-clipping'))sourceFiles.push(full);}};visit(path.join(root,base));
 }
 const snippets=[],parseErrors=[];let astNodes=0;
 const explicitTranslation=node=>{if(!node||typeof node!=='object')return false;if(node.type==='CallExpression'&&['t','translateText'].includes(exprName(node.callee)))return true;return Object.entries(node).some(([key,value])=>!['loc','start','end'].includes(key)&&(Array.isArray(value)?value.some(explicitTranslation):value&&typeof value==='object'&&explicitTranslation(value)));};
 for(const full of sourceFiles){
  // Catalogue records contain verified manufacturer data/provenance; the UI
  // that presents those records is inspected in its rendering modules.
  if(full.endsWith(path.join('commerce','catalog.js')))continue;
  let ast;try{ast=parse(fs.readFileSync(full,'utf8'),{ecmaVersion:'latest',sourceType:'module',locations:true});}catch(error){parseErrors.push({file:path.relative(root,full),error:error.message});continue;}
  const walk=(node,covered=false)=>{
   if(!node||typeof node!=='object')return;astNodes++;
   const isConcat=node.type==='BinaryExpression'&&node.operator==='+';
   const string=node.type==='Literal'&&typeof node.value==='string';
   const template=node.type==='TemplateLiteral';
   if(!covered&&(string||template||isConcat))for(const text of examples(node)){
    const html=/<\/?[A-Za-z][\w:-]*(?:\s|>|\/)/.test(text);
    if(html||isFrench(text))snippets.push({file:path.relative(root,full),line:node.loc.start.line,kind:node.type,html,text,localized:explicitTranslation(node)});
   }
   for(const [key,value]of Object.entries(node)){
    if(['loc','start','end'].includes(key))continue;
    // A containing concat/template already describes its immediate string
    // leaves. Function/call arguments still need their own independent audit.
    const nextCovered=(isConcat||template||covered)&&['BinaryExpression','TemplateLiteral','ConditionalExpression','LogicalExpression'].includes(node.type);
    if(Array.isArray(value))for(const child of value)walk(child,nextCovered);
    else if(value&&typeof value==='object')walk(value,nextCovered);
   }
  };walk(ast);
 }
 const deduped=[...new Map(snippets.map(row=>[row.file+'|'+row.line+'|'+row.text,row])).values()];
 const html=deduped.filter(row=>row.html),plain=deduped.filter(row=>!row.html);let parsed=[];
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  // DOMParser creates inert documents. They are never inserted into the page,
  // so URL attributes in snippets cannot load resources or contact services.
  parsed=await page.evaluate(rows=>rows.flatMap(row=>{
   const doc=new DOMParser().parseFromString(row.text,'text/html');doc.querySelectorAll('script,style').forEach(node=>node.remove());
   const result=[],walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
   let node;while((node=walker.nextNode())){
    if(node.nodeType===Node.TEXT_NODE&&node.data.trim())result.push({...row,kind:'html-text',text:node.data});
    if(node.nodeType===Node.ELEMENT_NODE)for(const name of ['aria-label','title','alt','placeholder'])if(node.hasAttribute(name))result.push({...row,kind:'html-'+name,text:node.getAttribute(name)});
   }
   return result;
  }),html);
 }finally{await browser.close();}
 const ignored=new Set(['Créole_argent','Butée_porte','Gorge_BRUNEI_reculée','Época','Aruba rainuré','Vert céladon · or vieilli','Vert céladon · argent vieilli']);
 const review=[];let candidates=0;
 for(const row of [...plain,...parsed]){
  const value=row.text.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  if(!value||preserved.has(value)||ignored.has(value)||numericOrSymbol(value)||numericOrSymbol(value.replace(/LRFPRODUCT|LRFDYNAMIC/g,'')))continue;
  if(/[_{}<>]|\bMath\.|https?:|^#|\.(?:js|json|svg|webp|png|jpg|hdr|css|csv|pdf|app|com)$/.test(value)||/^[a-z0-9]+(?:[-/][a-z0-9]+)+(?:[ ]+[a-z0-9-]+)*$/.test(value)||value==='projet')continue;
  if(!row.html&&!isFrench(value))continue;
  if(/^(?:COLUMNA|BAÑERA|CONJUNTO)\b/.test(value))continue;
  candidates++;const es=translateText(value,'es');
  // Unlike a changed/not-changed test, this also catches partially translated
  // generated sentences. Manufacturer markers and known brand names are inert.
  const residue=es.replace(/LRFPRODUCT|LRFDYNAMIC/g,'').replace(/STUDIO ONE|RANDAL|LE ROY FACTORY|AQUA HOME|AQUAHOME/g,'');
  const untranslated=es===value&&!row.localized&&(row.html||isFrench(value));
  const frenchResidue=/\b(?:votre|vos|choisissez|choisir|déverrouillez|verrouillez|meuble|vasque|tiroirs?|cloisons?|carrelage|calepinage|façade|fenêtre|robinetterie|enregistrer|sèche-serviettes|référence|revêtement|surélevé|ouvrez|réessayez)\b/i.test(residue);
  if(untranslated||frenchResidue)review.push({file:row.file,line:row.line,kind:row.kind,text:value,spanish:es});
 }
 return {parser:'acorn '+parserVersion,sourceFiles:sourceFiles.length,astNodes,snippets:deduped.length,htmlSnippets:html.length,htmlFragments:parsed.length,sourceCandidates:candidates,parseErrors,sourceFragmentsToReview:[...new Map(review.map(row=>[row.file+'|'+row.text,row])).values()]};
}
