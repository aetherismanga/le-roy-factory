const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),root=path.resolve(__dirname,'..');
const context={window:{dispatchEvent(){}},document:{readyState:'loading',addEventListener(){}},CustomEvent:class{},Date};vm.createContext(context);
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
for(const file of ['inspirations-view-data.js','inspirations-view-data-lot2.js','inspirations-view-data-lot3.js','inspirations-view-tariff-2026-10-15.js','inspirations-elios-data.js','elios-roma-data.js','fenice-lexicon-data.js'])vm.runInContext(read('assets/js/'+file),context,{timeout:3000});
// Purchase prices are intentionally outside this public catalogue generator.
const official=require('../functions/elios-catalog.js'),source=JSON.parse(read('shared/lrf-3d/manufacturer-surfaces.json'));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''),dimensions=s=>{const m=String(s).replaceAll(',','.').match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/i);return m?m.slice(1).map(Number):null;},num=v=>Number.isFinite(v)&&v>=0?v:null;
const products=[],plinths=[];
const {eliosHDFields}=require('./elios-hd-fields.cjs');

for(const slug of official.allCollectionKeys()){
 const c=slug==='roma'?context.window.ELIOS_ROMA_STOCK_DATA:official.publicCollection(slug);if(!c)continue;
 const visual=source.find(v=>v.brand==='ELIOS'&&(norm(v.name)===norm(c.collection)||norm(v.name)===norm(slug))),description=context.window.ELIOS_CATALOGUE.find(v=>norm(v.slug)===norm(slug))||{slug,finishes:[]};
 for(const r of c.rows||[]){const wh=dimensions(r.format);if(!wh||!r.ref)continue;const [w,h]=wh,color=visual?.colors.find(v=>norm(v.name)===norm(r.color)),nativeFormat=visual?.formats.find(f=>Math.abs(Math.max(w,h)-Math.max(f.width,f.height)*100)<.02&&Math.abs(Math.min(w,h)-Math.min(f.width,f.height)*100)<.02);
 const common={brand:'ELIOS',collection:visual?.name||c.collection,color:r.color,colorId:color?.id||norm(r.color),reference:r.ref,finish:r.finish,source:visual?.source||`https://eliosceramica.com/collezione/${slug}/`,catalogueSource:c.source,priceSource:'ELIOS TARIF NET 2026 V01',priceNote:'',priceUnit:'m²',priceTTC:null,preview:color?.file||color?.faces?.[0]||color?.preview||'',native:Boolean(nativeFormat&&color),available3d:color?.available3d===true,surfaces:visual?.surfaces||['floor','wall'],...eliosHDFields(color,r.ref,nativeFormat?.id)};
 if(/plinthe/i.test(r.kind)){plinths.push({...common,key:'ELIOS|plinth|'+r.ref,length:Math.max(w,h),height:Math.min(w,h),packPieces:r.pcsBox,packMetres:r.orderPerBox,priceUnit:'pièce'});continue;}
 if(!/^carreau|^dalle/i.test(r.kind)||/hexagon|hexagonal/i.test(r.format+' '+r.finish)||Math.min(w,h)<2.5||Math.max(w,h)>300)continue;
 const packArea=r.sqmBox||(r.sqmPiece&&r.pcsBox?r.sqmPiece*r.pcsBox:null),packPieces=r.pcsBox;products.push({...common,key:'ELIOS|'+r.ref,shape:nativeFormat?.shape||'rectangle',format:nativeFormat?.id||`${Math.min(w,h)}x${Math.max(w,h)}`,width:nativeFormat?nativeFormat.width*100:Math.max(w,h),height:nativeFormat?nativeFormat.height*100:Math.min(w,h),packArea,packPieces,packVerified:Boolean(packArea&&packPieces),packSource:c.source,boxesPallet:r.boxesPal||null});
 }
}
for(const p of context.window.VIEW_CATALOGUE||[]){const visual=source.find(c=>c.brand==='VIEW'&&(norm(c.name)===norm(p.name)||norm(c.name)===norm(p.collection)));for(const v of p.variants||[]){const wh=dimensions(v.format);if(!wh)continue;const [w,h]=wh;for(const colorName of v.colors||p.colors||[]){const color=visual?.colors.find(c=>norm(c.name)===norm(colorName)),f=visual?.formats.find(f=>Math.abs(Math.max(w,h)-Math.max(f.width,f.height)*100)<.02&&Math.abs(Math.min(w,h)-Math.min(f.width,f.height)*100)<.02),reference=v.refs?.[colorName]||'';products.push({key:['VIEW',p.name,colorName,v.key].join('|'),brand:'VIEW',collection:visual?.name||p.name,color:colorName,colorId:color?.id||norm(colorName),format:f?.id||`${Math.min(w,h)}x${Math.max(w,h)}`,width:f?f.width*100:Math.max(w,h),height:f?f.height*100:Math.min(w,h),reference,finish:v.finish+(v.thickness?' · '+v.thickness:''),priceUnit:v.unit||'m²',priceTTC:null,priceSource:p.sourceLabel,packArea:v.pack?.m2Box||null,packPieces:v.pack?.pcsBox||null,packVerified:Boolean(v.pack?.m2Box&&v.pack?.pcsBox),packSource:p.sourceLabel,boxesPallet:v.pack?.boxesPallet||null,source:p.sourceUrl||visual?.source||'',preview:color?.file||color?.faces?.[0]||p.images?.[0]?.url||'',surfaces:visual?.surfaces||['floor','wall'],available3d:color?.available3d===true,native:Boolean(f&&color)});}}}
// Recent manufacturer tables are reviewed once in the canonical manufacturer
// collection. Consume those records before the visual fallback, so regenerating
// PLAN & POSE cannot erase a new SKU or invent a reference/finish from its colour.
function upsertReviewedRows(target,rows,collection,kind){
 for(const row of rows||[]){
  const color=collection.colors.find(color=>color.id===row.colorId),format=kind==='plinth'?null:collection.formats.find(format=>format.id===row.format);
  if(row.brand!==collection.brand||row.collection!==collection.name||!color||!row.reference||!row.key||kind!=='plinth'&&(!format||color.formats?.length&&!color.formats.includes(format.id)))throw Error('Invalid reviewed manufacturer row: '+collection.name+' / '+String(row.key));
  const expected=collection.brand+'|'+(kind==='plinth'?'plinth|':'')+row.reference;
  if(row.key!==expected&&!(kind==='plinth'&&row.key===collection.brand+'|plinth|'+collection.name+'|'+row.reference))throw Error('Reviewed manufacturer key/reference mismatch: '+row.key);
  const found=target.findIndex(item=>item.key===row.key);
  if(found>=0&&(target[found].reference!==row.reference||target[found].collection!==row.collection))throw Error('Reviewed manufacturer SKU conflicts with an existing product: '+row.key);
  const reviewed={...row,preview:row.preview||color.file||color.faces?.[0]||'',source:row.source||collection.source,native:false,nativeFaces:false,available3d:color.available3d===true};
  if(kind!=='plinth')Object.assign(reviewed,{format:format.id,width:format.width*100,height:format.height*100,shape:format.shape||'rectangle'});
  if(found>=0)target[found]={...target[found],...reviewed};else target.push(reviewed);
 }
}
for(const collection of source){
 upsertReviewedRows(products,collection.catalogueProducts,collection,'product');
 upsertReviewedRows(plinths,collection.cataloguePlinths,collection,'plinth');
}
// Keep a visual catalogue choice if the detailed commercial dataset has no row;
// unknown references/prices/boxes remain explicitly unknown, never fabricated.
for(const c of source){for(const color of c.colors){for(const f of c.formats){if(f.shape&&f.shape!=='rectangle'||color.formats?.length&&!color.formats.includes(f.id))continue;if(products.some(p=>p.brand===c.brand&&p.collection===c.name&&p.colorId===color.id&&p.format===f.id))continue;const pack=f.packByColor?.[color.id]||f;products.push({key:[c.brand,c.name,color.id,f.id].join('|'),brand:c.brand,collection:c.name,color:color.name,colorId:color.id,format:f.id,width:f.width*100,height:f.height*100,reference:'',finish:'',priceUnit:'m²',priceTTC:null,priceSource:'',packArea:pack.m2Box||null,packPieces:pack.pcsBox||null,packVerified:Boolean(pack.m2Box&&pack.pcsBox),packSource:pack.source||c.source,source:c.source,preview:color.file||color.faces?.[0]||'',surfaces:c.surfaces||['floor','wall'],available3d:color.available3d===true,native:true});}}}
for(const p of products)if(['Marechiaro|amalfi'].includes(p.collection+'|'+p.colorId)){p.preview='';p.available3d=false;p.native=false;}
const fenice=context.window.LRF_FENICE_LEXICON.catalogues.find(c=>c.id==='general-2026-2027').entries.map(e=>({brand:'LA FENICE',name:e.name,source:e.pdf+'#page='+e.page,page:e.printedPage}));
// Retain existing reviewed SKUs and commercial edits. Generation may add
// missing references and illustrations; it cannot silently erase a prior SKU.
const previous=JSON.parse(read('assets/js/lrf-plan-pose/catalogue.json'));
function preserveReviewed(generated,existing=[]){const byKey=new Map(generated.map(item=>[item.key,item])),known=new Set(existing.map(item=>item.key));return [...existing.map(item=>byKey.has(item.key)?{...byKey.get(item.key),...item}:item),...generated.filter(item=>!known.has(item.key))];}
products.splice(0,products.length,...preserveReviewed(products,previous.products));
plinths.splice(0,plinths.length,...preserveReviewed(plinths,previous.plinths));
// Explicit newly reviewed source records take precedence for their own SKU;
// every unrelated prior product and its reviewed fields remain untouched.
for(const collection of source){
 upsertReviewedRows(products,collection.catalogueProducts,collection,'product');
 upsertReviewedRows(plinths,collection.cataloguePlinths,collection,'plinth');
}

// A reference can be shared by two manufacturer collections. Keep the old
// Quercia key and the new explicitly scoped Yosemite key, while removing only
// the superseded duplicate Yosemite context for that same physical plinth.
for(const collection of source)for(const row of collection.cataloguePlinths||[]){
 if(!row.supersedesContextKey||row.supersedesContextKey===row.key)continue;
 for(let i=plinths.length-1;i>=0;i--){const old=plinths[i];if(old.key===row.supersedesContextKey&&old.collection===row.collection&&old.reference===row.reference&&old.length===row.length&&old.height===row.height)plinths.splice(i,1);}
}
function publicOnly(value){if(Array.isArray(value))return value.map(publicOnly);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!/^purchase/.test(key)&&!['publicPriceHT','unitPriceHT','totalPurchaseHT','proHT'].includes(key)).map(([key,item])=>[key,publicOnly(item)]));return value;}
const data={version:2,sourceCommit:'f5282df25c8ccae3de36232f9382a3b4f6ae94f0',tariffs:{ELIOS:'ELIOS TARIF NET 2026 V01',VIEW:'VIEW Tarif net FR CL 0126 · applicable au 15/10/2026'},products,plinths,fenice};
// Legacy PLAN & POSE consumers distinguish an explicitly unknown price from a
// missing field. Preserve only these compatibility slots, always forced null;
// real purchase values and every other private field are still stripped.
const publicCatalogue=publicOnly(data);
for(const row of [...publicCatalogue.products,...publicCatalogue.plinths])Object.assign(row,{purchaseHT:null,purchasePaletteHT:null,publicPriceHT:null});
fs.writeFileSync(path.join(root,'assets/js/lrf-plan-pose/catalogue.json'),JSON.stringify(publicCatalogue));

const commercialFields=['key','brand','collection','color','colorId','format','reference','finish','preview','priceTTC','packVerified','packArea','packPieces','packSource','priceSource','priceNote'];
const commercialOptionalFields=['kind','thicknessMm','rectified','nativeFaces','definitionLimited','previewReviewed','textureProvenance','geometrySchema','visualNote','continuousDecor','decorRepeat','nativePerTileResolution','manufacturerRecommendedJointMm','graphicAlignmentToleranceMm','dimensionNote','technicalTableFormat'];
fs.writeFileSync(path.join(root,'shared/lrf-3d/commercial-surfaces.json'),JSON.stringify(publicOnly({products:products.map(p=>({...Object.fromEntries(commercialFields.map(k=>[k,p[k]??null])),...Object.fromEntries(commercialOptionalFields.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]))})),plinths})));
require('node:child_process').execFileSync(process.execPath,[path.join(root,'scripts/sync-lrf-surface-catalogue.mjs')],{stdio:'inherit'});
console.log(JSON.stringify({products:products.length,publicPriced:products.filter(p=>Number.isFinite(p.priceTTC)).length,references:products.filter(p=>p.reference).length,packaged:products.filter(p=>p.packVerified).length,plinths:plinths.length,fenice:fenice.length}));
