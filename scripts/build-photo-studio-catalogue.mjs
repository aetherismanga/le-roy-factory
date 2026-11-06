import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const SOURCES=['shared/lrf-3d/manufacturer-surfaces.json','shared/lrf-3d/commercial-surfaces.json','assets/data/fenice-catalogue.json','assets/data/fenice-packaging.json','assets/data/biopietra-catalogue.json','assets/data/bulbo-catalogue.json','assets/data/pecchioli-catalogue.json','assets/data/petracer-catalogue.json','assets/data/reviglass-nouveautes-2026.json','assets/js/inspirations-reviglass-reset.js','data/fabricants.json','shared/lrf-3d/surface-contract.json','assets/js/lrf-photo-studio/texture-cache.json','tools/configurator-materials/elios-faces.json'];
export const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const stamp=data=>createHash('sha256').update(data).digest('hex');
const slug=v=>normalize(v)||'unknown';
const cleanURL=v=>{if(!v||typeof v!=='string')return '';try{const u=new URL(v,'https://leroyfactory.fr/');if(!['https:','http:'].includes(u.protocol))return '';if(u.origin==='https://leroyfactory.fr')return u.pathname+u.search;return u.href;}catch{return ''}};
const rejectedProvenance=/ai-reconstruction|color-preview|catalogue-preview|manufacturer-swatch-crop|manufacturer-catalogue-sample|product-platform-image/;
const reasons={identity:'Identité commerciale ou coloris non rapproché de la source canonique.',dimensions:'Dimensions ou usage sol non validés pour cette variante.',pattern:'Décor, module composé, chevron, mosaïque ou opus : pose non prise en charge.',texture:'Texture fabricant complète et exploitable non vérifiée pour ce format.',provenance:'Visuel indicatif, reconstitué ou simple échantillon ; pas un tampon fabricant complet.',reference:'Source au niveau collection/coloris : association référence-format-finition non vérifiée.',other:'Source fournisseur présente, sans variantes de carrelage exploitables.'};
export function parseFormat(format){const m=String(format??'').replace(/,/g,'.').match(/^\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*cm)?\s*$/i);return m?{widthMm:Number(m[1])*10,heightMm:Number(m[2])*10}:null;}
function unsafePattern(p,c,f){return Boolean(p.continuousDecor||p.module||p.patternType&&p.patternType!=='tiles'||f&& !['rectangle','square',undefined].includes(f.shape)||/mosa[iï]c|chevron|opus|deco[r]?|original|geometr|hexagon|spina|modulo|module|panel|panneau/i.test([p.color,p.finish,p.format,c?.pattern].join(' ')));}
function nativeTexture(p,c,f,faceManifest={}){
 // Only the six audited Slate colours at their full 60x120 format. These are
 // complete catalogue tile faces, not a generic colour swatch. Keep the native
 // limited resolution explicit and require the pinned PDF/xref/integrity chain.
 const slate=faceManifest.collections?.slate?.[c?.id],pdf=faceManifest.pdfs?.slate;
 if(p.brand==='ELIOS'&&p.collection==='Slate'&&p.format==='60x120'&&c?.nativeFaces===true&&c.definition==='Faces du catalogue fabricant · définition limitée'&&slate?.length===5&&c.faces?.length===5&&c.faceIntegrity?.length===5&&c.faceResolutions?.length===5&&pdf?.sha256&&slate.every((entry,i)=>entry.pdf==='slate'&&[29,30].includes(entry.page)&&entry.xref>0&&Math.abs(entry.width-c.faceResolutions[i][0])<=1&&Math.abs(entry.height-c.faceResolutions[i][1])<=3&&/^[a-f0-9]{64}$/.test(c.faceIntegrity[i].sha256)&&c.faceIntegrity[i].bytes>0)){
  const faces=c.faces.map(cleanURL).filter(Boolean);
  if(faces.length===5)return {faces,workingFaces:faces,rotation:90,resolution:c.resolution,limited:true,provenance:{kind:'manufacturer-catalogue-full-face',manufacturer:'Elios Ceramica',source:pdf.url,sourceSha256:pdf.sha256,pages:[...new Set(slate.map(e=>e.page))],pdfXrefs:slate.map(e=>e.xref),nativeResolution:c.resolution,definitionLimited:true,verified:true,expectedFaces:faces.map((url,i)=>({url,...c.faceIntegrity[i]}))}};
 }

 const exact=c?.textureVariantsByReference?.[p.reference];
 if(exact&&exact.verified===true&&exact.format===p.format&&(!exact.colorId||normalize(exact.colorId)===normalize(p.colorId||p.color))){
  const provenance=exact.textureProvenance||c.textureProvenance;
  const trulyNative=exact.nativeFaces===true||exact.nativeFaces!==false&&c.nativeFaces===true&&Number(exact.nativeFaceCount)>0;
  if(trulyNative&&!provenance?.generated&&!rejectedProvenance.test(provenance?.kind||'')){
   const profiles=exact.textureVariants||{},faces=profiles.max||profiles.balanced||profiles.fluid;
   if(faces?.length)return {faces:faces.map(cleanURL).filter(Boolean),workingFaces:(profiles.balanced||profiles.fluid||faces).map(cleanURL).filter(Boolean),rotation:exact.textureRotation||0,provenance:{kind:'reference-verified-manufacturer-face',source:cleanURL(c.source),reference:p.reference,nativeFaceCount:exact.nativeFaceCount,verified:true},resolution:exact.resolution||null};
  }
 }
 if(!f||!/^https:\/\/(?:www\.)?(?:viewceramiche\.com|eliosceramica\.com|leroyfactory\.fr)\//.test(c?.source||'')||c?.nativeFaces!==true||c.definition!=='Faces fabricant'||!c.faces?.length||c.textureProvenance?.generated||rejectedProvenance.test(c.textureProvenance?.kind||''))return null;
 const [iw,ih]=c.resolution||[];if(!(iw>=200&&ih>=200))return null;
 const ratio=Math.max(f.width,f.height)/Math.min(f.width,f.height),imageRatio=Math.max(iw,ih)/Math.min(iw,ih);
 if(Math.abs(Math.log(ratio/imageRatio))>.06)return null;
 return {faces:c.faces.map(cleanURL).filter(Boolean),workingFaces:c.faces.map(cleanURL).filter(Boolean),rotation:(iw>ih)===(f.width>f.height)?0:90,provenance:{kind:'manufacturer-face',source:cleanURL(c.source),definition:c.definition,resolution:c.resolution,verified:true},resolution:c.resolution};
}
export function adaptCommercial(products,manufacturers,sourceVersion,contract={collections:[]},faceManifest={}){
 const byCollection=new Map(manufacturers.map(c=>[[normalize(c.brand),normalize(c.name)].join('|'),c]));
 return products.map(p=>{
  const collection=byCollection.get([normalize(p.brand),normalize(p.collection)].join('|'));
  const aliases=contract.collections?.find(c=>normalize(c.name)===normalize(p.collection))?.aliases||{},alias=aliases[p.colorId]||aliases[normalize(p.colorId)]||p.colorId;
  const color=collection?.colors.find(c=>normalize(c.id)===normalize(alias)||normalize(c.name)===normalize(p.color));
  const format=collection?.formats.find(f=>f.id===p.format),dimensions=format&&Number.isFinite(format.width)&&Number.isFinite(format.height)?{widthMm:Math.round(format.width*1e6)/1000,heightMm:Math.round(format.height*1e6)/1000}:null;
  const texture=nativeTexture(p,color,format,faceManifest),usage=collection?.surfaces||[];
  let reason='';if(!collection||!color||!p.reference)reason='identity';else if(!dimensions||!usage.includes('floor')||!color.formats?.includes(p.format))reason='dimensions';else if(unsafePattern(p,collection,format))reason='pattern';else if(rejectedProvenance.test(color.textureProvenance?.kind||''))reason='provenance';else if(!texture)reason='texture';
  // Strict allowlist: purchase/public prices, pack tariff sources and secrets cannot enter this contract.
  return {id:p.key,sourceId:p.key,manufacturer:p.brand,collection:p.collection,color:p.color,reference:p.reference||'',format:p.format,formatLabel:String(p.format).replace(/x/g,' × ')+' cm',widthMm:dimensions?.widthMm??null,heightMm:dimensions?.heightMm??null,finish:p.finish||'',usage,previewUrl:texture?.workingFaces[0]||'',textureFaces:reason?[]:texture?.faces||[],workingTextureFaces:reason?[]:texture?.workingFaces||[],textureRotation:texture?.rotation||0,textureResolution:texture?.resolution||null,limitedTextureDefinition:texture?.limited||false,textureNote:texture?.limited?'Faces complètes du catalogue fabricant, définition native limitée (~300 × 600 px).':'',textureProvenance:texture?.provenance||{kind:color?.textureProvenance?.kind||'unverified',source:cleanURL(color?.source||collection?.source)},patternType:unsafePattern(p,collection,format)?'unsupported':'tiles',supportedLayouts:reason?[]:['straight','third','rotate90'],photoStudioEligible:!reason,ineligibleCode:reason,ineligibleReason:reason?reasons[reason]:'',sourceVersion};
 });
}
function collectionRecords(data,manufacturer,path,sourceVersion){
 const collections=data.collections||data.products||[];
 return collections.filter(c=>!['furniture','meuble','sanitary','accessory'].some(t=>normalize(c.productType).includes(t))).flatMap(c=>{
  const listed=[...(c.colors||[]).map(s=>typeof s==='string'?{name:s,id:s}:{name:s.name||s.label||s.id||s.code,id:s.id||s.code||s.name||s.label}),...(c.swatches||[]).map(s=>({name:s.name||s.label||s.id||s.code,id:s.id||s.name||s.code||s.label}))];
  const colors=listed.length?[...new Map(listed.map(c=>[normalize(c.name),c])).values()]:[{name:'',id:'collection'}];
  return colors.map(color=>({id:`${manufacturer}|${c.id||slug(c.name)}|${slug(color.id)}`,sourceId:c.id||c.slug||slug(c.name),manufacturer,collection:c.name||c.id,color:color.name,reference:'',format:'',formatLabel:'Format à confirmer',widthMm:null,heightMm:null,finish:'',usage:[],previewUrl:'',textureFaces:[],workingTextureFaces:[],textureRotation:0,textureProvenance:{kind:'unverified',source:cleanURL(c.sourceUrl||c.source||data.source)},patternType:'unknown',supportedLayouts:[],photoStudioEligible:false,ineligibleCode:'reference',ineligibleReason:reasons.reference,sourceVersion,sourcePath:path,granularity:'collection-color',listedFormats:(c.formats||[]).filter(v=>typeof v==='string')}));
 });
}
export function buildCatalogue(input){
 const version=stamp(SOURCES.map(path=>path+':'+stamp(input[path]||'')).join('\n'));
 const manufacturer=JSON.parse(input[SOURCES[0]]),commercial=JSON.parse(input[SOURCES[1]]).products;
 const records=adaptCommercial(commercial,manufacturer,version,JSON.parse(input['shared/lrf-3d/surface-contract.json']),JSON.parse(input['tools/configurator-materials/elios-faces.json']));
 for(const [path,brand] of [['assets/data/fenice-catalogue.json','LA FENICE'],['assets/data/biopietra-catalogue.json','BIOPIETRA'],['assets/data/bulbo-catalogue.json','BULBO'],['assets/data/pecchioli-catalogue.json','PECCHIOLI'],['assets/data/petracer-catalogue.json','PETRACER']])records.push(...collectionRecords(JSON.parse(input[path]),brand,path,version));
 // Existing Reviglass source is JavaScript. Read the literal metadata only; never execute it.
 const rev=(input['assets/js/inspirations-reviglass-reset.js']||'').split('\n').flatMap(line=>{const m=line.match(/^\s*\{id:'([^']+)',name:'((?:\\.|[^'])*)',format:'([^']*)'/);return m?[{id:m[1],name:m[2].replace(/\\'/g,"'"),format:m[3]}]:[]});
 const newer=JSON.parse(input['assets/data/reviglass-nouveautes-2026.json']).collections||[];
 const revCollections=new Map([...rev,...newer].map(c=>[c.id,c]));
 records.push(...[...revCollections.values()].map(c=>({id:'REVIGLASS|'+c.id,sourceId:c.id,manufacturer:'REVIGLASS',collection:c.name,color:'',reference:'',format:c.format||'',formatLabel:c.format||'',widthMm:parseFormat(c.format)?.widthMm??null,heightMm:parseFormat(c.format)?.heightMm??null,finish:'',usage:[],previewUrl:'',textureFaces:[],workingTextureFaces:[],textureProvenance:{kind:'unverified',source:'https://www.reviglass.es/'},patternType:'mosaic',supportedLayouts:[],photoStudioEligible:false,ineligibleCode:'pattern',ineligibleReason:reasons.pattern,sourceVersion:version,granularity:'collection'})));
 const unique=new Map();for(const r of records){const existing=unique.get(r.id);if(existing){if(JSON.stringify(existing)!==JSON.stringify(r))throw Error('Collision d’identité: '+r.id);continue;}unique.set(r.id,r);}
 const allProducts=[...unique.values()],coverage={schema:'lrf-photo-studio-coverage',version:1,sourceVersion:version,refresh:'build',sources:SOURCES.map(path=>({path,sha256:stamp(input[path]||'')})),manufacturers:[],notes:['Recensées = enregistrements disponibles, à distinguer des SKU : détails par fabricant.','La Fenice et les autres catalogues collection/coloris restent recensés sans croisement arbitraire des formats et couleurs.','Les variantes exclues sont conservées au rapport interne. Aucun remplacement de couleur, texture générée ou prix dans le manifeste.','Droits: réutilisation des actifs fabricant déjà présents dans LRF; l’autorisation juridique globale des fabricants n’est pas revalidée par ce script.']};
 const configured=JSON.parse(input['data/fabricants.json']).filter(f=>/carrelage|mosaique/.test(f.categorie)).map(f=>f.nom);
 for(const brand of [...new Set(allProducts.map(p=>p.manufacturer))]){const rows=allProducts.filter(p=>p.manufacturer===brand),blocked=rows.filter(p=>!p.photoStudioEligible);coverage.manufacturers.push({manufacturer:brand,records:rows.length,collections:new Set(rows.map(p=>p.collection)).size,granularity:['ELIOS','VIEW'].includes(brand)?'exact-commercial-SKU':'collection-color-or-collection',eligible:rows.length-blocked.length,withoutTexture:blocked.filter(p=>['texture','provenance'].includes(p.ineligibleCode)).length,withoutDimensionsOrUsage:blocked.filter(p=>['dimensions','reference'].includes(p.ineligibleCode)).length,unsupportedLayout:blocked.filter(p=>p.ineligibleCode==='pattern').length,other:blocked.filter(p=>!['texture','provenance','dimensions','reference','pattern'].includes(p.ineligibleCode)).length});}
 coverage.unconnectedManufacturers=configured.filter(name=>/life/i.test(name)).map(name=>({manufacturer:name,records:0,reason:'Fiche fabricant présente ; aucune source produit structurée trouvée dans le dépôt au commit audité.'}));
 const cache=JSON.parse(input['assets/js/lrf-photo-studio/texture-cache.json']||'{"assets":{}}').assets||{};
 const mapTexture=url=>cache[url]?.path||url;
 for(const product of allProducts)if(product.photoStudioEligible){
  for(const expected of product.textureProvenance.expectedFaces||[]){if(cache[expected.url]&&cache[expected.url].sha256!==expected.sha256)throw Error('Texture manufacturer integrity mismatch: '+product.id);}
  product.textureFaces=product.textureFaces.map(mapTexture);product.workingTextureFaces=product.workingTextureFaces.map(mapTexture);product.previewUrl=mapTexture(product.previewUrl);
  product.sameOriginTextures=product.textureFaces.every(url=>url.startsWith('/assets/'))&&product.workingTextureFaces.every(url=>url.startsWith('/assets/'));
 }
 coverage.mirroredAssets=Object.keys(cache).length;
 coverage.sameOriginReady=allProducts.filter(p=>p.photoStudioEligible).every(p=>p.sameOriginTextures);
 return {schema:'lrf-photo-studio-catalogue',version:1,sourceVersion:version,products:allProducts.filter(p=>p.photoStudioEligible),allProducts,coverage};
}
export function generate({root=ROOT}={}){const input=Object.fromEntries(SOURCES.map(p=>[p,readFileSync(resolve(root,p),'utf8')]));const result=buildCatalogue(input);for(const [path,data]of [['assets/js/lrf-photo-studio/catalogue.json',{schema:result.schema,version:1,sourceVersion:result.sourceVersion,products:result.products,coverage:result.coverage}],['reports/photo-studio/coverage.json',{...result.coverage,products:result.allProducts}]]){mkdirSync(dirname(resolve(root,path)),{recursive:true});writeFileSync(resolve(root,path),JSON.stringify(data)+'\n');}console.log(JSON.stringify({eligible:result.products.length,coverage:result.coverage.manufacturers,sourceVersion:result.sourceVersion}));return result;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))generate();
